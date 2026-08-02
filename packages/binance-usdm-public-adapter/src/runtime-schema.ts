import { ExactDecimal } from "@arbitrage/market-data";
import { BINANCE_USDM_LIMITS } from "./constants.js";
import { BinanceUsdmSchemaError } from "./errors.js";

interface JsonReviverContext {
  readonly source: string;
}

type JsonParserWithContext = (
  text: string,
  reviver: (
    this: unknown,
    key: string,
    value: unknown,
    context: JsonReviverContext,
  ) => unknown,
) => unknown;

const exactIntegerKeys = new Set([
  "U",
  "u",
  "pu",
  "lastUpdateId",
  "E",
  "T",
  "time",
  "serverTime",
  "fundingTime",
  "nextFundingTime",
  "deliveryDate",
  "onboardDate",
]);

export function parseJsonPreservingIntegers(
  text: string,
  maximumBytes: number,
): unknown {
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new BinanceUsdmSchemaError(
      "JSON payload exceeds the configured byte limit.",
    );
  }
  try {
    const parseWithContext = JSON.parse as JsonParserWithContext;
    const parsed = parseWithContext(text, (key, value, context) => {
      if (exactIntegerKeys.has(key) && typeof value === "number") {
        return context.source;
      }
      return value;
    });
    validateJsonStructure(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof BinanceUsdmSchemaError) throw error;
    throw new BinanceUsdmSchemaError("Payload is not valid bounded JSON.");
  }
}

function validateJsonStructure(root: unknown): void {
  const stack: Array<{ readonly value: unknown; readonly depth: number }> = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    nodes += 1;
    if (nodes > BINANCE_USDM_LIMITS.jsonMaximumNodes) {
      throw new BinanceUsdmSchemaError(
        "JSON payload contains too many values.",
      );
    }
    if (current.depth > BINANCE_USDM_LIMITS.jsonMaximumDepth) {
      throw new BinanceUsdmSchemaError("JSON payload exceeds nesting limit.");
    }
    if (typeof current.value === "string") {
      if (current.value.length > BINANCE_USDM_LIMITS.stringLength) {
        throw new BinanceUsdmSchemaError("JSON string exceeds length limit.");
      }
      if (/\u0000/.test(current.value)) {
        throw new BinanceUsdmSchemaError(
          "JSON string contains a NUL character.",
        );
      }
      continue;
    }
    if (Array.isArray(current.value)) {
      if (current.value.length > BINANCE_USDM_LIMITS.jsonMaximumArrayLength) {
        throw new BinanceUsdmSchemaError("JSON array exceeds length limit.");
      }
      for (const value of current.value) {
        stack.push({ value, depth: current.depth + 1 });
      }
      continue;
    }
    if (typeof current.value === "object" && current.value !== null) {
      const values = Object.values(current.value);
      if (values.length > BINANCE_USDM_LIMITS.jsonMaximumObjectKeys) {
        throw new BinanceUsdmSchemaError("JSON object has too many keys.");
      }
      for (const value of values) {
        stack.push({ value, depth: current.depth + 1 });
      }
    }
  }
}

export function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BinanceUsdmSchemaError(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function array(value: unknown, path: string): ReadonlyArray<unknown> {
  if (!Array.isArray(value)) {
    throw new BinanceUsdmSchemaError(`${path} must be an array.`);
  }
  return value;
}

export function string(
  value: unknown,
  path: string,
  options: { readonly allowEmpty?: boolean; readonly maximum?: number } = {},
): string {
  const maximum = options.maximum ?? BINANCE_USDM_LIMITS.stringLength;
  if (
    typeof value !== "string" ||
    (!options.allowEmpty && value.length === 0) ||
    value.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new BinanceUsdmSchemaError(`${path} is not a valid bounded string.`);
  }
  return value;
}

export function optionalString(
  value: unknown,
  path: string,
): string | undefined {
  return value === undefined ? undefined : string(value, path);
}

export function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new BinanceUsdmSchemaError(`${path} must be a boolean.`);
  }
  return value;
}

export function safeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new BinanceUsdmSchemaError(`${path} must be a safe integer.`);
  }
  return value;
}

export function unsignedIntegerWire(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > BINANCE_USDM_LIMITS.updateIdLength ||
    !/^(?:0|[1-9]\d*)$/.test(value)
  ) {
    throw new BinanceUsdmSchemaError(
      `${path} must be an unsigned integer wire value.`,
    );
  }
  return value;
}

export function decimalWire(
  value: unknown,
  path: string,
  options: { readonly negative?: boolean; readonly zero?: boolean } = {},
): string {
  const parsed = string(value, path, {
    maximum: BINANCE_USDM_LIMITS.decimalWireLength,
  });
  try {
    ExactDecimal.parse(parsed, {
      name: `binance-usdm:${path}`,
      maxPrecision: 78,
      maxScale: 36,
      notation: "PLAIN_ONLY",
      allowNegative: options.negative ?? false,
      allowZero: options.zero ?? false,
    });
  } catch {
    throw new BinanceUsdmSchemaError(
      `${path} is not a valid exact decimal wire value.`,
    );
  }
  return parsed;
}

export function oneOf<const Values extends readonly string[]>(
  value: unknown,
  path: string,
  values: Values,
): Values[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new BinanceUsdmSchemaError(`${path} is not a supported enum value.`);
  }
  return value as Values[number];
}
