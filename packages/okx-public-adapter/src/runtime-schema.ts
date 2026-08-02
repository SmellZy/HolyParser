import { OkxSchemaError } from "./errors.js";
import { OKX_LIMITS } from "./constants.js";

export type JsonRecord = Record<string, unknown>;

export function record(value: unknown, path: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new OkxSchemaError(`${path} must be an object.`);
  }
  if (Object.keys(value).length > OKX_LIMITS.jsonMaximumObjectKeys) {
    throw new OkxSchemaError(`${path} has too many object fields.`);
  }
  return value as JsonRecord;
}

export function array(
  value: unknown,
  path: string,
  maximum: number = OKX_LIMITS.jsonMaximumArrayLength,
): ReadonlyArray<unknown> {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new OkxSchemaError(`${path} must be a bounded array.`);
  }
  return value;
}

export function string(
  value: unknown,
  path: string,
  options: { readonly allowEmpty?: boolean; readonly maximum?: number } = {},
): string {
  const maximum = options.maximum ?? 256;
  if (
    typeof value !== "string" ||
    (!options.allowEmpty && value.length === 0) ||
    value.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new OkxSchemaError(`${path} must be a bounded string.`);
  }
  return value;
}

export function optionalString(
  value: unknown,
  path: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return string(value, path, { allowEmpty: true });
}

export function integer(
  value: unknown,
  path: string,
  options: { readonly allowNegativeOne?: boolean } = {},
): string {
  if (typeof value === "string") {
    const pattern = options.allowNegativeOne
      ? /^(?:-1|0|[1-9]\d*)$/
      : /^(?:0|[1-9]\d*)$/;
    const unsignedLength = value === "-1" ? 1 : value.length;
    if (
      unsignedLength > OKX_LIMITS.integerMaximumDigits ||
      !pattern.test(value)
    ) {
      throw new OkxSchemaError(`${path} must be an integer.`);
    }
    return value;
  }
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    (options.allowNegativeOne ? value < -1 : value < 0)
  ) {
    throw new OkxSchemaError(`${path} must be a safe integer.`);
  }
  return value.toString();
}

export function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new OkxSchemaError(`${path} must be a boolean.`);
  }
  return value;
}

export function oneOf<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
  path: string,
): Values[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new OkxSchemaError(
      `${path} must be one of ${values.map((item) => JSON.stringify(item)).join(", ")}.`,
    );
  }
  return value as Values[number];
}

export interface OkxEnvelope<T> {
  readonly code: string;
  readonly msg: string;
  readonly data: ReadonlyArray<T>;
}

export function envelope<T>(
  value: unknown,
  parseItem: (item: unknown, path: string) => T,
): OkxEnvelope<T> {
  const root = record(value, "$");
  const code = string(root.code, "$.code");
  const msg = string(root.msg, "$.msg", {
    allowEmpty: true,
    maximum: 1_024,
  });
  const data = array(root.data, "$.data").map((item, index) =>
    parseItem(item, `$.data[${index}]`),
  );
  return Object.freeze({ code, msg, data });
}

export function parseJson(text: string, maximumBytes: number): unknown {
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new OkxSchemaError("JSON message exceeds the configured byte limit.");
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    validateJsonStructure(parsed);
    return parsed;
  } catch {
    throw new OkxSchemaError("Payload is not valid JSON.");
  }
}

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

export function parseJsonPreservingSequenceIds(
  text: string,
  maximumBytes: number,
): unknown {
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new OkxSchemaError("JSON message exceeds the configured byte limit.");
  }
  try {
    const parseWithContext = JSON.parse as JsonParserWithContext;
    const parsed = parseWithContext(text, (key, value, context) => {
      if (
        (key === "seqId" || key === "prevSeqId" || key === "checksum") &&
        typeof value === "number"
      ) {
        return context.source;
      }
      return value;
    });
    validateJsonStructure(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof OkxSchemaError) {
      throw error;
    }
    throw new OkxSchemaError("Payload is not valid JSON.");
  }
}

function validateJsonStructure(root: unknown): void {
  const stack: Array<{ readonly value: unknown; readonly depth: number }> = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      break;
    }
    nodes += 1;
    if (nodes > OKX_LIMITS.jsonMaximumNodes) {
      throw new OkxSchemaError("JSON payload contains too many values.");
    }
    if (current.depth > OKX_LIMITS.jsonMaximumDepth) {
      throw new OkxSchemaError("JSON payload exceeds the nesting limit.");
    }
    if (Array.isArray(current.value)) {
      if (current.value.length > OKX_LIMITS.jsonMaximumArrayLength) {
        throw new OkxSchemaError("JSON payload contains an oversized array.");
      }
      for (const value of current.value) {
        stack.push({ value, depth: current.depth + 1 });
      }
      continue;
    }
    if (typeof current.value === "object" && current.value !== null) {
      const values = Object.values(current.value);
      if (values.length > OKX_LIMITS.jsonMaximumObjectKeys) {
        throw new OkxSchemaError(
          "JSON payload contains an object with too many fields.",
        );
      }
      for (const value of values) {
        stack.push({ value, depth: current.depth + 1 });
      }
    }
  }
}
