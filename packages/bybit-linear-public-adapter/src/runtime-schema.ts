import { ExactDecimal } from "@arbitrage/market-data";
import { BYBIT_LIMITS } from "./constants.js";
import { BybitLinearSchemaError } from "./errors.js";

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
  "u",
  "seq",
  "ts",
  "cts",
  "time",
  "launchTime",
  "deliveryTime",
  "nextFundingTime",
  "fundingRateTimestamp",
]);

export function parseJsonPreservingIntegers(
  text: string,
  maximumBytes: number,
): unknown {
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new BybitLinearSchemaError("JSON payload exceeds the byte limit.");
  }
  try {
    const parser = JSON.parse as JsonParserWithContext;
    const value = parser(text, (key, item, context) =>
      exactIntegerKeys.has(key) && typeof item === "number"
        ? context.source
        : item,
    );
    validateJsonStructure(value);
    return value;
  } catch (error) {
    if (error instanceof BybitLinearSchemaError) throw error;
    throw new BybitLinearSchemaError("Payload is not valid bounded JSON.");
  }
}

function validateJsonStructure(root: unknown): void {
  const stack: Array<{ value: unknown; depth: number }> = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (++nodes > BYBIT_LIMITS.jsonMaximumNodes)
      throw new BybitLinearSchemaError("JSON node limit exceeded.");
    if (current.depth > BYBIT_LIMITS.jsonMaximumDepth)
      throw new BybitLinearSchemaError("JSON depth limit exceeded.");
    if (typeof current.value === "string") {
      if (
        current.value.length > BYBIT_LIMITS.stringLength ||
        /[\u0000-\u001f\u007f]/.test(current.value)
      ) {
        throw new BybitLinearSchemaError(
          "JSON contains an invalid bounded string.",
        );
      }
    } else if (Array.isArray(current.value)) {
      if (current.value.length > BYBIT_LIMITS.jsonMaximumArrayLength)
        throw new BybitLinearSchemaError("JSON array limit exceeded.");
      for (const value of current.value)
        stack.push({ value, depth: current.depth + 1 });
    } else if (typeof current.value === "object" && current.value !== null) {
      const values = Object.values(current.value);
      if (values.length > BYBIT_LIMITS.jsonMaximumObjectKeys)
        throw new BybitLinearSchemaError("JSON object-key limit exceeded.");
      for (const value of values)
        stack.push({ value, depth: current.depth + 1 });
    }
  }
}

export function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new BybitLinearSchemaError(`${path} must be an object.`);
  return value as Record<string, unknown>;
}
export function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value))
    throw new BybitLinearSchemaError(`${path} must be an array.`);
  return value;
}
export function string(
  value: unknown,
  path: string,
  options: { allowEmpty?: boolean; maximum?: number } = {},
): string {
  const maximum = options.maximum ?? BYBIT_LIMITS.stringLength;
  if (
    typeof value !== "string" ||
    (!options.allowEmpty && value.length === 0) ||
    value.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new BybitLinearSchemaError(`${path} is not a valid bounded string.`);
  }
  return value;
}
export function bool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean")
    throw new BybitLinearSchemaError(`${path} must be boolean.`);
  return value;
}
export function integer(value: unknown, path: string, minimum = 0): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  )
    throw new BybitLinearSchemaError(`${path} must be a bounded integer.`);
  return value;
}
export function unsignedIntegerWire(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > BYBIT_LIMITS.updateIdLength ||
    !/^(?:0|[1-9]\d*)$/.test(value)
  ) {
    throw new BybitLinearSchemaError(
      `${path} must be an unsigned integer wire.`,
    );
  }
  return value;
}
export function decimalWire(
  value: unknown,
  path: string,
  options: { negative?: boolean; zero?: boolean } = {},
): string {
  const wire = string(value, path, { maximum: BYBIT_LIMITS.decimalWireLength });
  try {
    ExactDecimal.parse(wire, {
      name: `bybit-linear:${path}`,
      maxPrecision: 78,
      maxScale: 36,
      notation: "PLAIN_ONLY",
      allowNegative: options.negative ?? false,
      allowZero: options.zero ?? false,
    });
  } catch {
    throw new BybitLinearSchemaError(
      `${path} is not a valid exact decimal wire.`,
    );
  }
  return wire;
}
export function oneOf<const T extends readonly string[]>(
  value: unknown,
  path: string,
  values: T,
): T[number] {
  if (typeof value !== "string" || !values.includes(value))
    throw new BybitLinearSchemaError(`${path} is not a supported enum.`);
  return value as T[number];
}
