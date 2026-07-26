const MAX_WIRE_LENGTH = 256;

export const DOMAIN_DECIMAL_LIMITS = {
  maxPrecision: 78,
  maxScale: 78,
  canonicalWireMaxScale: 36,
} as const;

export type DecimalNotation = "PLAIN_ONLY" | "PLAIN_OR_SCIENTIFIC";

export interface DecimalWirePolicy {
  readonly name: string;
  readonly maxPrecision: number;
  readonly maxScale: number;
  readonly notation: DecimalNotation;
  readonly allowNegative: boolean;
  readonly allowZero: boolean;
}

export const canonicalDecimalWirePolicy: DecimalWirePolicy = {
  name: "canonical-financial-decimal/v1",
  maxPrecision: DOMAIN_DECIMAL_LIMITS.maxPrecision,
  maxScale: DOMAIN_DECIMAL_LIMITS.canonicalWireMaxScale,
  notation: "PLAIN_ONLY",
  allowNegative: true,
  allowZero: true,
};

export type RoundingPolicy =
  "EXACT" | "TOWARD_ZERO" | "AWAY_FROM_ZERO" | "HALF_UP" | "HALF_EVEN";

export class DecimalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecimalValidationError";
  }
}

export class DecimalRoundingRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecimalRoundingRequiredError";
  }
}

export class DecimalOverflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecimalOverflowError";
  }
}

function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function digitCount(value: bigint): number {
  return (value < 0n ? -value : value).toString().length;
}

function assertDomainBounds(coefficient: bigint, scale: number): void {
  if (
    scale < 0 ||
    scale > DOMAIN_DECIMAL_LIMITS.maxScale ||
    digitCount(coefficient) > DOMAIN_DECIMAL_LIMITS.maxPrecision
  ) {
    throw new DecimalOverflowError(
      `Decimal exceeds domain bounds (${DOMAIN_DECIMAL_LIMITS.maxPrecision} digits, ${DOMAIN_DECIMAL_LIMITS.maxScale} scale).`,
    );
  }
}

function normalize(
  coefficient: bigint,
  scale: number,
): readonly [bigint, number] {
  if (coefficient === 0n) {
    return [0n, 0];
  }

  let normalizedCoefficient = coefficient;
  let normalizedScale = scale;

  while (normalizedScale > 0 && normalizedCoefficient % 10n === 0n) {
    normalizedCoefficient /= 10n;
    normalizedScale -= 1;
  }

  return [normalizedCoefficient, normalizedScale];
}

function expandScientific(
  integer: string,
  fraction: string,
  exponentText: string,
): readonly [string, string] {
  if (exponentText.length > 6) {
    throw new DecimalValidationError("Scientific exponent is too large.");
  }

  const exponent = Number.parseInt(exponentText, 10);
  const exponentBound =
    DOMAIN_DECIMAL_LIMITS.maxPrecision + DOMAIN_DECIMAL_LIMITS.maxScale;

  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > exponentBound) {
    throw new DecimalValidationError("Scientific exponent exceeds policy.");
  }

  const digits = integer + fraction;
  const decimalIndex = integer.length + exponent;

  if (decimalIndex <= 0) {
    return ["0", `${"0".repeat(-decimalIndex)}${digits}`];
  }

  if (decimalIndex >= digits.length) {
    return [`${digits}${"0".repeat(decimalIndex - digits.length)}`, ""];
  }

  return [digits.slice(0, decimalIndex), digits.slice(decimalIndex)];
}

export class ExactDecimal {
  private constructor(
    readonly coefficient: bigint,
    readonly scale: number,
  ) {}

  static fromParts(coefficient: bigint, scale: number): ExactDecimal {
    if (!Number.isSafeInteger(scale)) {
      throw new DecimalValidationError("Decimal scale must be a safe integer.");
    }

    const [normalizedCoefficient, normalizedScale] = normalize(
      coefficient,
      scale,
    );
    assertDomainBounds(normalizedCoefficient, normalizedScale);
    return new ExactDecimal(normalizedCoefficient, normalizedScale);
  }

  static parse(
    wireValue: string,
    policy: DecimalWirePolicy = canonicalDecimalWirePolicy,
  ): ExactDecimal {
    if (typeof wireValue !== "string" || wireValue.length > MAX_WIRE_LENGTH) {
      throw new DecimalValidationError(
        "Decimal wire value has invalid length.",
      );
    }

    const match =
      /^(-?)(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?(?:0|[1-9]\d*)))?$/.exec(
        wireValue,
      );

    if (!match) {
      throw new DecimalValidationError(`Malformed decimal for ${policy.name}.`);
    }

    const sign = match[1] ?? "";
    let integer = match[2] ?? "";
    let fraction = match[3] ?? "";
    const exponent = match[4];

    if (exponent !== undefined) {
      if (policy.notation !== "PLAIN_OR_SCIENTIFIC") {
        throw new DecimalValidationError(
          `Scientific notation is not permitted by ${policy.name}.`,
        );
      }
      [integer, fraction] = expandScientific(integer, fraction, exponent);
    }

    const scale = fraction.length;
    const unsignedDigits = `${integer}${fraction}`.replace(/^0+(?=\d)/, "");
    const coefficient = BigInt(`${sign}${unsignedDigits}`);
    const precision = digitCount(coefficient);

    if (scale > policy.maxScale) {
      throw new DecimalValidationError(
        `Decimal scale exceeds ${policy.name} limit.`,
      );
    }
    if (precision > policy.maxPrecision) {
      throw new DecimalValidationError(
        `Decimal precision exceeds ${policy.name} limit.`,
      );
    }
    if (!policy.allowNegative && coefficient < 0n) {
      throw new DecimalValidationError(
        `Negative decimal is not permitted by ${policy.name}.`,
      );
    }
    if (!policy.allowZero && coefficient === 0n) {
      throw new DecimalValidationError(
        `Zero is not permitted by ${policy.name}.`,
      );
    }

    return ExactDecimal.fromParts(coefficient, scale);
  }

  compare(other: ExactDecimal): -1 | 0 | 1 {
    const commonScale = Math.max(this.scale, other.scale);
    const left = this.coefficient * powerOfTen(commonScale - this.scale);
    const right = other.coefficient * powerOfTen(commonScale - other.scale);
    return left < right ? -1 : left > right ? 1 : 0;
  }

  equals(other: ExactDecimal): boolean {
    return this.compare(other) === 0;
  }

  add(other: ExactDecimal): ExactDecimal {
    const commonScale = Math.max(this.scale, other.scale);
    return ExactDecimal.fromParts(
      this.coefficient * powerOfTen(commonScale - this.scale) +
        other.coefficient * powerOfTen(commonScale - other.scale),
      commonScale,
    );
  }

  subtract(other: ExactDecimal): ExactDecimal {
    return this.add(ExactDecimal.fromParts(-other.coefficient, other.scale));
  }

  multiply(other: ExactDecimal): ExactDecimal {
    return ExactDecimal.fromParts(
      this.coefficient * other.coefficient,
      this.scale + other.scale,
    );
  }

  divide(
    divisor: ExactDecimal,
    outputScale: number,
    roundingPolicy: RoundingPolicy,
  ): ExactDecimal {
    if (divisor.coefficient === 0n) {
      throw new DecimalValidationError("Division by zero is not permitted.");
    }
    if (
      !Number.isSafeInteger(outputScale) ||
      outputScale < 0 ||
      outputScale > DOMAIN_DECIMAL_LIMITS.maxScale
    ) {
      throw new DecimalValidationError("Invalid division output scale.");
    }

    const scaleShift = outputScale + divisor.scale - this.scale;
    let numerator = this.coefficient;
    let denominator = divisor.coefficient;

    if (scaleShift >= 0) {
      numerator *= powerOfTen(scaleShift);
    } else {
      denominator *= powerOfTen(-scaleShift);
    }

    let quotient = numerator / denominator;
    const remainder = numerator % denominator;

    if (remainder !== 0n) {
      if (roundingPolicy === "EXACT") {
        throw new DecimalRoundingRequiredError(
          "Division is inexact; an explicit non-EXACT rounding policy is required.",
        );
      }

      const direction = numerator < 0n !== denominator < 0n ? -1n : 1n;
      const absoluteRemainder = remainder < 0n ? -remainder : remainder;
      const absoluteDenominator = denominator < 0n ? -denominator : denominator;

      if (roundingPolicy === "AWAY_FROM_ZERO") {
        quotient += direction;
      } else if (
        roundingPolicy === "HALF_UP" &&
        absoluteRemainder * 2n >= absoluteDenominator
      ) {
        quotient += direction;
      } else if (roundingPolicy === "HALF_EVEN") {
        const doubled = absoluteRemainder * 2n;
        if (
          doubled > absoluteDenominator ||
          (doubled === absoluteDenominator && quotient % 2n !== 0n)
        ) {
          quotient += direction;
        }
      }
    }

    return ExactDecimal.fromParts(quotient, outputScale);
  }

  isNegative(): boolean {
    return this.coefficient < 0n;
  }

  isZero(): boolean {
    return this.coefficient === 0n;
  }

  toString(): string {
    if (this.scale === 0) {
      return this.coefficient.toString();
    }

    const negative = this.coefficient < 0n;
    const digits = (negative ? -this.coefficient : this.coefficient)
      .toString()
      .padStart(this.scale + 1, "0");
    const integer = digits.slice(0, -this.scale);
    const fraction = digits.slice(-this.scale);
    return `${negative ? "-" : ""}${integer}.${fraction}`;
  }
}

declare const financialDecimalBrand: unique symbol;

export type FinancialDecimal<Kind extends string> = ExactDecimal & {
  readonly [financialDecimalBrand]: Kind;
};

export type Price = FinancialDecimal<"Price">;
export type Quantity = FinancialDecimal<"Quantity">;
export type Notional = FinancialDecimal<"Notional">;
export type FundingRate = FinancialDecimal<"FundingRate">;
export type Percentage = FinancialDecimal<"Percentage">;
export type ContractMultiplier = FinancialDecimal<"ContractMultiplier">;
export type TickSize = FinancialDecimal<"TickSize">;
export type QuantityStep = FinancialDecimal<"QuantityStep">;

function parseFinancial<Kind extends string>(
  wireValue: string,
  kind: Kind,
  options: {
    readonly allowNegative: boolean;
    readonly allowZero: boolean;
    readonly policy?: DecimalWirePolicy;
  },
): FinancialDecimal<Kind> {
  const basePolicy = options.policy ?? canonicalDecimalWirePolicy;
  const value = ExactDecimal.parse(wireValue, {
    ...basePolicy,
    name: `${basePolicy.name}:${kind}`,
    allowNegative: options.allowNegative,
    allowZero: options.allowZero,
  });
  return value as FinancialDecimal<Kind>;
}

export const price = (value: string, policy?: DecimalWirePolicy): Price =>
  parseFinancial(value, "Price", {
    allowNegative: false,
    allowZero: false,
    policy,
  });

export const quantity = (value: string, policy?: DecimalWirePolicy): Quantity =>
  parseFinancial(value, "Quantity", {
    allowNegative: false,
    allowZero: true,
    policy,
  });

export const notional = (value: string, policy?: DecimalWirePolicy): Notional =>
  parseFinancial(value, "Notional", {
    allowNegative: false,
    allowZero: true,
    policy,
  });

export const fundingRate = (
  value: string,
  policy?: DecimalWirePolicy,
): FundingRate =>
  parseFinancial(value, "FundingRate", {
    allowNegative: true,
    allowZero: true,
    policy,
  });

export const percentage = (
  value: string,
  policy?: DecimalWirePolicy,
): Percentage =>
  parseFinancial(value, "Percentage", {
    allowNegative: true,
    allowZero: true,
    policy,
  });

export const contractMultiplier = (
  value: string,
  policy?: DecimalWirePolicy,
): ContractMultiplier =>
  parseFinancial(value, "ContractMultiplier", {
    allowNegative: false,
    allowZero: false,
    policy,
  });

export const tickSize = (value: string, policy?: DecimalWirePolicy): TickSize =>
  parseFinancial(value, "TickSize", {
    allowNegative: false,
    allowZero: false,
    policy,
  });

export const quantityStep = (
  value: string,
  policy?: DecimalWirePolicy,
): QuantityStep =>
  parseFinancial(value, "QuantityStep", {
    allowNegative: false,
    allowZero: false,
    policy,
  });
