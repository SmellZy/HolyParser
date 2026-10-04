import { ExactDecimal } from "@arbitrage/market-data";
import { type WorkBudget, assertCount } from "./bounds.js";
import { MATCHING_LIMITS } from "./policy.js";
import { MatchingFailure } from "./reasons.js";

// Caller-input boundary (sixth-acceptance N-01). Every public operation takes
// exactly one passive snapshot of its caller input before any validation and
// then uses only that snapshot:
//
// - each own property is read once, through its property descriptor; accessor
//   (getter/setter) descriptors, non-enumerable or symbol keys are rejected,
//   so no caller getter runs and no value is read twice;
// - only plain objects (Object.prototype or null), genuine arrays (exactly
//   their indices plus "length", no own iterator or extra keys, no holes) and
//   genuine ExactDecimal values are accepted; class instances, functions,
//   symbols, bigints, Map/Set/Date and every other active object are rejected;
// - arrays are copied by index, never through a caller iterator;
// - an ExactDecimal must have the exact ExactDecimal prototype and exactly its
//   two data fields; it is rebuilt with ExactDecimal.fromParts (which
//   re-validates the frozen domain bounds) and frozen, so a duck-typed or
//   mutated decimal cannot cross the boundary;
// - the copy is deep and frozen; it shares no mutable reference with the
//   caller input.
//
// A JavaScript Proxy cannot be detected reliably. Correctness does not depend
// on detecting one: its traps are consulted once per property and the
// snapshot alone is used afterwards.

const invalid = (message: string): never => {
  throw new MatchingFailure("INPUT_INVALID", message);
};

function descriptor(value: object, key: PropertyKey): PropertyDescriptor {
  const found = Object.getOwnPropertyDescriptor(value, key);
  if (found === undefined || !("value" in found) || found.enumerable !== true)
    invalid("Input must be passive enumerable data.");
  return found!;
}

function snapshotDecimal(value: object): ExactDecimal {
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== 2 ||
    !keys.includes("coefficient") ||
    !keys.includes("scale")
  )
    invalid("Decimal is not authentic.");
  const coefficient = descriptor(value, "coefficient").value as unknown;
  const scale = descriptor(value, "scale").value as unknown;
  if (typeof coefficient !== "bigint" || !Number.isSafeInteger(scale))
    invalid("Decimal is not authentic.");
  let rebuilt: ExactDecimal;
  try {
    rebuilt = ExactDecimal.fromParts(coefficient as bigint, scale as number);
  } catch {
    throw new MatchingFailure("INPUT_INVALID", "Decimal is not authentic.");
  }
  // Genuine decimals are always normalized; a non-normalized pair is forged.
  if (rebuilt.coefficient !== coefficient || rebuilt.scale !== scale)
    invalid("Decimal is not authentic.");
  return Object.freeze(rebuilt);
}

function copy(value: unknown, depth: number, work: WorkBudget): unknown {
  work.units(4);
  if (depth > MATCHING_LIMITS.jsonDepth)
    throw new MatchingFailure(
      "MATCHING_BOUND_EXCEEDED",
      "Input depth bound exceeded.",
    );
  if (value === null || value === undefined) return value;
  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) invalid("Input number is not finite.");
      return value;
    case "object":
      break;
    default:
      return invalid("Input must be passive data.");
  }
  const object = value as object;
  const prototype = Object.getPrototypeOf(object) as unknown;
  if (prototype === ExactDecimal.prototype) {
    work.units(8);
    return snapshotDecimal(object);
  }
  if (Array.isArray(object)) {
    if (prototype !== Array.prototype) invalid("Input array is not plain.");
    // A genuine array's "length" is an own, non-enumerable data property.
    const size = Object.getOwnPropertyDescriptor(object, "length")!
      .value as number;
    assertCount(size, MATCHING_LIMITS.genericArray, "Array");
    // Own-key enumeration is the one native pass that cannot be bounded
    // before it returns (accepted limitation A-02); charge it immediately.
    const keys = Reflect.ownKeys(object);
    work.units(keys.length + 1);
    // Exactly the indices plus "length": no own iterator, holes or extras.
    if (keys.length !== size + 1) invalid("Input array is not plain.");
    const result: unknown[] = [];
    for (let index = 0; index < size; index += 1) {
      work.units(3);
      result.push(
        copy(descriptor(object, String(index)).value, depth + 1, work),
      );
    }
    return Object.freeze(result);
  }
  if (prototype !== Object.prototype && prototype !== null)
    invalid("Input object is not plain data.");
  const keys = Reflect.ownKeys(object);
  work.units(keys.length + 1);
  assertCount(keys.length, MATCHING_LIMITS.objectKeys, "Object key");
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    work.units(3);
    if (typeof key !== "string") invalid("Input object has a symbol key.");
    Object.defineProperty(result, key as string, {
      value: copy(descriptor(object, key).value, depth + 1, work),
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(result);
}

/**
 * One deep, passive, frozen snapshot of caller input (see the module notes).
 * All work is charged to the operation budget before or as it happens.
 */
export function snapshotInput<T>(value: T, work: WorkBudget): T {
  return copy(value, 1, work) as T;
}

/**
 * Reads the named own data properties of a caller record once. Keys listed
 * in `opaque` are returned by reference without copying (trusted internal
 * handles such as a registry, an admitted history or a cancellation signal);
 * every other key is snapshotted. Unknown keys are rejected.
 */
export function snapshotRecord(
  value: unknown,
  allowed: readonly string[],
  opaque: readonly string[],
  work: WorkBudget,
): Readonly<Record<string, unknown>> {
  work.units(4);
  if (value === null || typeof value !== "object" || Array.isArray(value))
    invalid("Input must be an object.");
  const object = value as object;
  const prototype = Object.getPrototypeOf(object) as unknown;
  if (prototype !== Object.prototype && prototype !== null)
    invalid("Input object is not plain data.");
  const keys = Reflect.ownKeys(object);
  work.units(keys.length + 1);
  assertCount(keys.length, MATCHING_LIMITS.objectKeys, "Object key");
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    work.units(3);
    if (typeof key !== "string" || !allowed.includes(key))
      invalid("Input has an unknown field.");
    const raw = descriptor(object, key).value as unknown;
    Object.defineProperty(result, key as string, {
      value: opaque.includes(key as string) ? raw : copy(raw, 2, work),
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(result);
}

/**
 * A genuine plain array read by index into a frozen shallow copy (elements are
 * not copied; each is then snapshotted by its own boundary). No caller
 * iterator is consulted.
 */
export function snapshotList(
  value: unknown,
  work: WorkBudget,
): readonly unknown[] {
  work.units(4);
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    invalid("Input list must be a plain array.");
  const array = value as unknown[];
  const size = Object.getOwnPropertyDescriptor(array, "length")!
    .value as number;
  assertCount(size, MATCHING_LIMITS.genericArray, "Array");
  const keys = Reflect.ownKeys(array);
  work.units(keys.length + 1);
  if (keys.length !== size + 1) invalid("Input list must be a plain array.");
  const result: unknown[] = [];
  for (let index = 0; index < size; index += 1) {
    work.units(3);
    result.push(descriptor(array, String(index)).value);
  }
  return Object.freeze(result);
}

/**
 * Reads one named own data property (for example a cancellation signal that
 * is needed before the operation budget exists). Constant work.
 */
export function readOwnData(value: unknown, key: string): unknown {
  if (value === null || typeof value !== "object")
    invalid("Input must be an object.");
  const found = Object.getOwnPropertyDescriptor(value as object, key);
  if (found === undefined) return undefined;
  if (!("value" in found)) invalid("Input must be passive data.");
  return found.value as unknown;
}

/**
 * Typed input boundary (sixth-acceptance L-04). Inputs are passive snapshots,
 * so a TypeError/RangeError raised while an operation consumes them can only
 * come from a malformed caller shape; it becomes the existing typed
 * INPUT_INVALID failure. MatchingFailure (including cancellation and budget
 * exhaustion) and every other error propagate unchanged.
 */
export function inputBoundary<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError)
      throw new MatchingFailure("INPUT_INVALID", "Malformed input.");
    throw error;
  }
}

/** Standalone decimal materialization for budget-free public helpers. */
export function trustedDecimal(value: unknown): ExactDecimal {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== ExactDecimal.prototype
  )
    invalid("Decimal is not authentic.");
  return snapshotDecimal(value as object);
}
