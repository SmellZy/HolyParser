// Test-only independent work oracle. It is excluded from the package build
// (see tsconfig.json) and never imported by runtime modules.
//
// It measures *actual* native work performed by an operation, independently
// of WorkBudget's charged counter, by instrumenting the JavaScript/Node
// primitives that perform repeated work proportional to data size: string
// encoding/scanning/joining, JSON, Buffer, Date/RegExp parsing, hash input,
// array traversal/copy/sort, Map/Set iteration and object key enumeration,
// freezing and copying. One oracle unit is one elementary element/code-unit
// visited by such a primitive. Declared bulk primitives used only by the
// standalone 16 MiB input parser (TextDecoder, JSON.parse) are weighted by
// their approved rate of 4,096 bytes per logical step (1/32 unit per byte).
import { createHash } from "node:crypto";
import { WORK_UNITS_PER_STEP, WorkBudget } from "./bounds.js";

export interface WorkOracle {
  readonly units: () => number;
  /** Largest single primitive call since the previous `resetLargest`. */
  readonly largest: () => number;
  readonly resetLargest: () => void;
  readonly breakdown: () => ReadonlyMap<string, number>;
  readonly restore: () => void;
}

type AnyFunction = (...args: never[]) => unknown;

export function installWorkOracle(): WorkOracle {
  let total = 0;
  let largest = 0;
  const tally = new Map<string, number>();
  // The oracle's own bookkeeping must not use (or count) patched primitives.
  const mapGet = Map.prototype.get;
  const mapSet = Map.prototype.set;
  const add = (name: string, cost: number): void => {
    total += cost;
    largest = Math.max(largest, cost);
    Reflect.apply(mapSet, tally, [
      name,
      ((Reflect.apply(mapGet, tally, [name]) as number | undefined) ?? 0) +
        cost,
    ]);
  };
  const restores: (() => void)[] = [];
  const ownKeys = Reflect.ownKeys;
  const lengthOf = (value: unknown): number =>
    typeof value === "string"
      ? value.length
      : value instanceof Uint8Array
        ? value.byteLength
        : typeof value === "object" && value !== null
          ? ownKeys(value).length
          : 1;
  function patch<T extends object>(
    target: T,
    key: PropertyKey,
    cost: (self: unknown, args: unknown[], result: unknown) => number,
  ): void {
    const descriptor = Object.getOwnPropertyDescriptor(target, key)!;
    const original = descriptor.value as AnyFunction;
    const name = `${String((target as { name?: string }).name ?? target.constructor?.name ?? "")}.${String(key)}`;
    const wrapped = function (this: unknown, ...args: unknown[]) {
      const result = Reflect.apply(original, this, args);
      add(name, cost(this, args, result));
      return result;
    };
    Object.defineProperty(target, key, { ...descriptor, value: wrapped });
    restores.push(() => Object.defineProperty(target, key, descriptor));
  }
  const selfLength = (self: unknown) =>
    Array.isArray(self) || ArrayBuffer.isView(self)
      ? (self as { length: number }).length + 1
      : 1;

  patch(JSON, "stringify", (_self, args, result) =>
    typeof result === "string" ? result.length + 1 : 1,
  );
  patch(JSON, "parse", (_self, args) => Math.ceil(lengthOf(args[0]) / 32));
  patch(TextDecoder.prototype, "decode", (_self, args) =>
    Math.ceil(lengthOf(args[0]) / 32),
  );
  patch(Buffer, "byteLength", (_self, args) => lengthOf(args[0]) + 1);
  patch(Buffer, "from", (_self, args) => lengthOf(args[0]) + 1);
  patch(
    Buffer,
    "compare",
    (_self, args) => Math.min(lengthOf(args[0]), lengthOf(args[1])) + 1,
  );
  patch(Date, "parse", (_self, args) => String(args[0]).length + 1);
  patch(RegExp.prototype, "test", (_self, args) => String(args[0]).length + 1);
  patch(RegExp.prototype, "exec", (_self, args) => String(args[0]).length + 1);
  patch(String.prototype, "charCodeAt", () => 1);
  patch(
    Array.prototype,
    "join",
    (self, _args, result) =>
      selfLength(self) + (typeof result === "string" ? result.length : 0),
  );
  for (const method of [
    "map",
    "filter",
    "some",
    "every",
    "find",
    "findIndex",
    "forEach",
    "reduce",
    "includes",
    "indexOf",
    "slice",
    "flatMap",
    "reverse",
    "sort",
  ] as const)
    patch(Array.prototype, method, (self) => selfLength(self));
  patch(Array.prototype, "concat", (self, args) =>
    args.reduce<number>(
      (sum, item) => sum + (Array.isArray(item) ? item.length : 1),
      selfLength(self),
    ),
  );
  // Array iteration drives for..of, spread, Array.from and Set/Map
  // construction from arrays.
  const arrayIterator = Array.prototype[Symbol.iterator];
  const iterate = function (this: unknown[]) {
    add("Array.iterator", this.length + 1);
    return Reflect.apply(arrayIterator, this, []) as IterableIterator<unknown>;
  };
  Object.defineProperty(Array.prototype, Symbol.iterator, {
    value: iterate,
    writable: true,
    configurable: true,
  });
  restores.push(() =>
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      value: arrayIterator,
      writable: true,
      configurable: true,
    }),
  );
  for (const prototype of [Map.prototype, Set.prototype])
    for (const method of ["keys", "values", "entries", "forEach"] as const)
      if (Object.getOwnPropertyDescriptor(prototype, method))
        patch(
          prototype,
          method,
          (self) => (self as Map<unknown, unknown>).size + 1,
        );
  // Fifth remediation: hashing a key reads it (string keys are hashed over
  // every code unit unless already internalized; counted conservatively).
  const keyCost = (_self: unknown, args: unknown[]) =>
    (typeof args[0] === "string" ? args[0].length : 1) + 1;
  for (const method of ["get", "has", "set", "delete"] as const)
    patch(Map.prototype, method, keyCost);
  for (const method of ["has", "add", "delete"] as const)
    patch(Set.prototype, method, keyCost);
  // String methods that traverse their receiver (or build a result).
  for (const method of [
    "concat",
    "slice",
    "substring",
    "includes",
    "indexOf",
    "lastIndexOf",
    "startsWith",
    "endsWith",
    "split",
    "replace",
    "replaceAll",
    "toLowerCase",
    "toUpperCase",
    "trim",
    "normalize",
    "localeCompare",
    "match",
    "search",
  ] as const)
    patch(String.prototype, method, (self) => String(self).length + 1);
  for (const method of ["padStart", "padEnd", "repeat"] as const)
    patch(String.prototype, method, (_self, _args, result) =>
      typeof result === "string" ? result.length + 1 : 1,
    );
  patch(Object, "assign", (_self, args) => {
    let sum = 1;
    for (let index = 1; index < args.length; index += 1) {
      const item = args[index];
      if (typeof item === "object" && item !== null)
        sum += ownKeys(item).length;
    }
    return sum;
  });
  for (const [prototype, key] of [
    [Map.prototype, Symbol.iterator],
    [Set.prototype, Symbol.iterator],
  ] as const)
    patch(prototype, key, (self) => (self as Set<unknown>).size + 1);
  patch(
    Object,
    "keys",
    (_self, _args, result) => (result as unknown[]).length + 1,
  );
  patch(
    Object,
    "values",
    (_self, _args, result) => (result as unknown[]).length + 1,
  );
  patch(
    Object,
    "entries",
    (_self, _args, result) => (result as unknown[]).length + 1,
  );
  patch(
    Reflect,
    "ownKeys",
    (_self, _args, result) => (result as unknown[]).length + 1,
  );
  patch(Object, "freeze", (_self, args) => lengthOf(args[0]) + 1);
  const hashPrototype = Object.getPrototypeOf(createHash("sha256")) as object;
  patch(hashPrototype, "update", (_self, args) => lengthOf(args[0]) + 1);
  // Installation itself iterates patched arrays; start measuring from zero.
  total = 0;
  largest = 0;
  tally.clear();
  return {
    units: () => total,
    largest: () => largest,
    resetLargest: () => {
      largest = 0;
    },
    breakdown: () => tally,
    restore: () => {
      for (const restore of restores.reverse()) restore();
    },
  };
}

export interface OracleTrace<T> {
  readonly result?: T;
  readonly error?: unknown;
  /** Oracle totals observed at each cancellation check, in order. */
  readonly checks: readonly number[];
  /** Largest single native primitive call inside each gap ending at a check. */
  readonly largestCalls: readonly number[];
  /** Oracle total when the operation returned or threw. */
  readonly end: number;
  readonly breakdown: ReadonlyMap<string, number>;
}

/**
 * Runs `operation` under the oracle. The supplied signal's `aborted` getter is
 * read exactly once by every WorkBudget cancellation check, so it records the
 * actual work performed at each check without trusting the charged counter.
 */
export function traceOperation<T>(
  operation: (signal: { readonly aborted: boolean }) => T,
  abortAfterChecks = Number.POSITIVE_INFINITY,
): OracleTrace<T> {
  const checks: number[] = [];
  const largestCalls: number[] = [];
  const oracle = installWorkOracle();
  const probe = {
    get aborted() {
      checks.push(oracle.units());
      largestCalls.push(oracle.largest());
      oracle.resetLargest();
      return checks.length > abortAfterChecks;
    },
  };
  let result: T | undefined;
  let error: unknown;
  let end = 0;
  try {
    result = operation(probe);
  } catch (caught) {
    error = caught;
  } finally {
    end = oracle.units();
    oracle.restore();
  }
  return {
    result,
    error,
    checks,
    largestCalls,
    end,
    breakdown: new Map(oracle.breakdown()),
  };
}

/** Actual work in each gap ending at a check (the first gap starts at 0). */
export function actualGaps(trace: OracleTrace<unknown>): readonly number[] {
  return trace.checks.map((at, index) =>
    index === 0 ? at : at - trace.checks[index - 1]!,
  );
}

/** Largest actual work between adjacent checks. */
export function maximumActualGap(trace: OracleTrace<unknown>): number {
  return Math.max(0, ...actualGaps(trace));
}

/**
 * Largest interruptible work between adjacent checks: each gap minus the one
 * largest atomic native primitive call inside it (a call whose full cost was
 * charged before it started and which a cooperative poll cannot interrupt).
 */
export function maximumInterruptibleGap(trace: OracleTrace<unknown>): number {
  return Math.max(
    0,
    ...actualGaps(trace).map((gap, index) => gap - trace.largestCalls[index]!),
  );
}

/** Actual work after the last check (publication tail). */
export function publicationTail(trace: OracleTrace<unknown>): number {
  return trace.end - (trace.checks.at(-1) ?? 0);
}

export interface BudgetedTrace<T> extends OracleTrace<T> {
  /** Charged logical steps observed at each cancellation check. */
  readonly charged: readonly number[];
  /** Charged steps when the operation returned or threw. */
  readonly chargedEnd: number;
}

/**
 * Runs an internal budgeted operation under the oracle and records, at every
 * cancellation check, both the actual work so far and the charged steps so
 * far. Used to verify precharge: actual work never runs ahead of charges.
 */
export function traceBudgeted<T>(
  operation: (work: WorkBudget) => T,
  abortAfterChecks = Number.POSITIVE_INFINITY,
): BudgetedTrace<T> {
  const charged: number[] = [];
  let work: WorkBudget | undefined;
  const trace = traceOperation((signal) => {
    work = new WorkBudget(signal, {
      checked(_gap, total) {
        charged.push(total);
      },
    });
    const result = operation(work);
    work.beforePublication();
    return result;
  }, abortAfterChecks);
  return { ...trace, charged, chargedEnd: work?.steps ?? 0 };
}

/**
 * Largest excess of actual work over charged work (in oracle units) at any
 * check or at the end. A value <= 0 means every native pass was charged
 * no later than the next cancellation check.
 */
export function maximumDeficit(trace: BudgetedTrace<unknown>): number {
  const at = trace.checks.map(
    (actual, index) => actual - trace.charged[index]! * WORK_UNITS_PER_STEP,
  );
  return Math.max(...at, trace.end - trace.chargedEnd * WORK_UNITS_PER_STEP);
}
