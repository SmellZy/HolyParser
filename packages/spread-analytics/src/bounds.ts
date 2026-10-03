import { MatchingFailure } from "./reasons.js";
import { MATCHING_LIMITS } from "./policy.js";

export interface CancellationSignal {
  readonly aborted: boolean;
}
export interface WorkCheckObserver {
  checked(logicalStepGap: number, totalLogicalSteps: number): void;
}
// Fine-grained repeated work (canonical encoding, comparison, key and hash-input
// preparation, copying, timestamp parsing) is charged in units. One logical
// step is at most 128 units; the sub-step remainder carries across helpers of
// the same operation and is charged before publication, never discarded.
export const WORK_UNITS_PER_STEP = 128;
export class WorkBudget {
  #steps = 0;
  #lastCheck = 0;
  #units = 0;
  constructor(
    private readonly signal?: CancellationSignal,
    private readonly observer?: WorkCheckObserver,
  ) {
    this.check();
  }
  step(count = 1): void {
    if (!Number.isSafeInteger(count) || count < 0)
      throw new MatchingFailure("INPUT_INVALID", "Invalid work count.");
    if (this.#steps + count > MATCHING_LIMITS.logicalSteps)
      throw new MatchingFailure(
        "MATCHING_BOUND_EXCEEDED",
        "Work bound exceeded.",
      );
    let remaining = count;
    while (remaining > 0) {
      const untilCheck =
        MATCHING_LIMITS.cancellationInterval - (this.#steps - this.#lastCheck);
      const chunk = Math.min(remaining, untilCheck);
      this.#steps += chunk;
      remaining -= chunk;
      if (
        this.#steps - this.#lastCheck ===
        MATCHING_LIMITS.cancellationInterval
      )
        this.check();
    }
  }
  units(count: number): void {
    if (!Number.isSafeInteger(count) || count < 0)
      throw new MatchingFailure("INPUT_INVALID", "Invalid work count.");
    this.#units += count;
    const whole = Math.floor(this.#units / WORK_UNITS_PER_STEP);
    if (whole === 0) return;
    this.#units -= whole * WORK_UNITS_PER_STEP;
    this.step(whole);
  }
  beforePublication(): void {
    if (this.#units > 0) {
      this.#units = 0;
      this.step();
    }
    this.check();
  }
  get steps(): number {
    return this.#steps;
  }
  private check(): void {
    const gap = this.#steps - this.#lastCheck;
    this.observer?.checked(gap, this.#steps);
    this.#lastCheck = this.#steps;
    if (this.signal?.aborted === true)
      throw new MatchingFailure(
        "EVALUATION_CANCELLED",
        "Evaluation cancelled.",
      );
  }
}
export function assertCount(count: number, limit: number, label: string): void {
  if (!Number.isSafeInteger(count) || count < 0 || count > limit)
    throw new MatchingFailure(
      "MATCHING_BOUND_EXCEEDED",
      `${label} bound exceeded.`,
    );
}
function scanText(
  value: string,
  work?: WorkBudget,
  codeUnitsPerLogicalStep = 256,
): {
  readonly control: boolean;
  readonly unpairedSurrogate: boolean;
} {
  let control = false;
  let unpairedSurrogate = false;
  for (let index = 0; index < value.length; index += 1) {
    if (index % codeUnitsPerLogicalStep === 0) work?.step();
    const current = value.charCodeAt(index);
    if ((current >= 0 && current <= 0x1f) || current === 0x7f) control = true;
    if (current >= 0xd800 && current <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) unpairedSurrogate = true;
      index += 1;
    } else if (current >= 0xdc00 && current <= 0xdfff) unpairedSurrogate = true;
  }
  return { control, unpairedSurrogate };
}
export function assertAtomicId(
  value: string,
  label = "ID",
  work?: WorkBudget,
): void {
  if (typeof value !== "string")
    throw new MatchingFailure("INPUT_INVALID", `${label} is invalid.`);
  // O(1) length gate before any proportional scan, encode or comparison.
  if (value.length === 0 || value.length > MATCHING_LIMITS.atomicIdUtf16)
    throw new MatchingFailure("INPUT_INVALID", `${label} is invalid.`);
  // The 32-code-unit step (4 units per code unit) already covers the scan
  // and the UTF-8 length pass below.
  const scan = scanText(value, work, 32);
  if (
    value.length === 0 ||
    value.length > MATCHING_LIMITS.atomicIdUtf16 ||
    Buffer.byteLength(value, "utf8") > MATCHING_LIMITS.atomicIdUtf8 ||
    scan.control ||
    scan.unpairedSurrogate
  )
    throw new MatchingFailure("INPUT_INVALID", `${label} is invalid.`);
}
export function assertCompositeId(value: string, work?: WorkBudget): void {
  if (typeof value !== "string")
    throw new MatchingFailure("INPUT_INVALID", "Composite ID is invalid.");
  // Every UTF-16 code unit encodes to at least one UTF-8 byte, so a longer
  // string cannot fit the byte bound; reject it before any proportional work.
  if (value.length === 0 || value.length > MATCHING_LIMITS.compositeIdUtf8)
    throw new MatchingFailure("INPUT_INVALID", "Composite ID is invalid.");
  // The accepted 256-code-unit step rate is kept; the scan and UTF-8 length
  // passes are additionally charged at the fine-grained rate (stricter).
  work?.units(2 * value.length + 1);
  const scan = scanText(value, work, 256);
  if (
    !value ||
    Buffer.byteLength(value, "utf8") > MATCHING_LIMITS.compositeIdUtf8 ||
    scan.control ||
    scan.unpairedSurrogate
  )
    throw new MatchingFailure("INPUT_INVALID", "Composite ID is invalid.");
}
export function assertReasonText(value: string, work?: WorkBudget): void {
  if (typeof value !== "string")
    throw new MatchingFailure("INPUT_INVALID", "Reason text is invalid.");
  if (value.length > MATCHING_LIMITS.reasonTextUtf8)
    throw new MatchingFailure("INPUT_INVALID", "Reason text is invalid.");
  const scan = scanText(value, work, 64);
  work?.units(value.length);
  if (
    Buffer.byteLength(value, "utf8") > MATCHING_LIMITS.reasonTextUtf8 ||
    scan.control ||
    scan.unpairedSurrogate
  )
    throw new MatchingFailure("INPUT_INVALID", "Reason text is invalid.");
  // The bounded (<=512-byte) markup alternative may rescan the suffix once per
  // "<"; charge that worst case before the native pattern scan.
  work?.units(value.length);
  let angles = 0;
  for (let index = 0; index < value.length; index += 1)
    if (value.charCodeAt(index) === 0x3c) angles += 1;
  work?.units(value.length * (angles + 1));
  if (/<[^>]*>|(?:javascript|data|blob):|https?:\/\//iu.test(value))
    throw new MatchingFailure("INPUT_INVALID", "Reason text is invalid.");
}
interface WalkState {
  nodes: number;
  // Evidence mode: a lower bound on the JSON serialization's UTF-8 bytes is
  // accumulated from O(1) lengths *before* each proportional scan, so an
  // oversized record is rejected without scanning or serializing it.
  minimumBytes?: number;
  readonly byteLimit?: number;
}
function addMinimumBytes(state: WalkState, bytes: number): void {
  if (state.byteLimit === undefined) return;
  state.minimumBytes = (state.minimumBytes ?? 0) + bytes;
  if (state.minimumBytes > state.byteLimit)
    throw new MatchingFailure(
      "MATCHING_BOUND_EXCEEDED",
      "Evidence record byte bound exceeded.",
    );
}
function walk(
  value: unknown,
  depth: number,
  state: WalkState,
  work: WorkBudget,
): void {
  ++state.nodes;
  if (state.nodes % MATCHING_LIMITS.cancellationInterval === 1) work.step();
  if (
    state.nodes > MATCHING_LIMITS.jsonNodes ||
    depth > MATCHING_LIMITS.jsonDepth
  )
    throw new MatchingFailure(
      "MATCHING_BOUND_EXCEEDED",
      "JSON structure bound exceeded.",
    );
  if (typeof value === "number")
    throw new MatchingFailure(
      "INPUT_INVALID",
      "Financial JSON numbers are prohibited.",
    );
  if (typeof value === "string") {
    // Quotes plus at least one UTF-8 byte per code unit.
    addMinimumBytes(state, value.length + 2);
    // Evidence mode charges the scan at the fine-grained rate as well; the
    // standalone 16 MiB parser keeps its approved bulk rate.
    if (state.byteLimit !== undefined) work.units(value.length + 1);
    const scan = scanText(value, work);
    if (scan.control || scan.unpairedSurrogate)
      throw new MatchingFailure("INPUT_INVALID", "Invalid JSON string.");
    return;
  }
  if (typeof value === "boolean" || value === null) {
    addMinimumBytes(state, 4);
    return;
  }
  if (Array.isArray(value)) {
    assertCount(value.length, MATCHING_LIMITS.genericArray, "Array");
    if (state.byteLimit !== undefined) {
      if (Object.getPrototypeOf(value) !== Array.prototype)
        throw new MatchingFailure("INPUT_INVALID", "Evidence must be data.");
      // Brackets plus at least one byte per element (values or separators).
      addMinimumBytes(state, value.length + 2);
    }
    for (const item of value) walk(item, depth + 1, state, work);
  } else if (value !== null && typeof value === "object") {
    if (state.byteLimit !== undefined) {
      const prototype = Object.getPrototypeOf(value) as unknown;
      // Plain data only: no custom toJSON or prototype-supplied serialization.
      if (prototype !== Object.prototype && prototype !== null)
        throw new MatchingFailure("INPUT_INVALID", "Evidence must be data.");
      if (Object.hasOwn(value, "toJSON"))
        throw new MatchingFailure("INPUT_INVALID", "Evidence must be data.");
      addMinimumBytes(state, 2);
    }
    // Own-key enumeration is the one native pass whose size is unknown until
    // it returns (no JavaScript primitive can bound it earlier); it is charged
    // immediately and the object is rejected before any further work.
    const keys = Object.keys(value);
    work.units(keys.length + 1);
    assertCount(keys.length, MATCHING_LIMITS.objectKeys, "Object key");
    for (const key of keys) {
      addMinimumBytes(state, key.length + 3);
      if (state.byteLimit !== undefined) work.units(key.length + 1);
      const scan = scanText(key, work);
      if (scan.control || scan.unpairedSurrogate)
        throw new MatchingFailure("INPUT_INVALID", "Invalid JSON key.");
      walk((value as Record<string, unknown>)[key], depth + 1, state, work);
    }
  }
}
export function parseBoundedJson(
  bytes: Uint8Array,
  signal?: CancellationSignal,
): unknown {
  const work = new WorkBudget(signal);
  assertCount(bytes.byteLength, MATCHING_LIMITS.inputBytes, "Input byte");
  work.step(Math.max(1, Math.ceil(bytes.byteLength / 4096)));
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new MatchingFailure("INPUT_INVALID", "Invalid UTF-8.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new MatchingFailure("INPUT_INVALID", "Invalid JSON.");
  }
  walk(value, 1, { nodes: 0 }, work);
  work.beforePublication();
  return value;
}
export function assertOutputBound(serialized: string, work?: WorkBudget): void {
  // One native UTF-8 length pass over the authoritative output string.
  work?.units(serialized.length);
  assertCount(
    Buffer.byteLength(serialized, "utf8"),
    MATCHING_LIMITS.outputBytes,
    "Output byte",
  );
}

export interface OperationResourceCounts {
  readonly instruments?: number;
  readonly bindings?: number;
  readonly aliases?: number;
  readonly partnersPerInstrument?: number;
  readonly candidatePairs?: number;
  readonly mappingVersionsPerMapping?: number;
  readonly mappingEvents?: number;
  readonly evidencePerSubject?: number;
  readonly evidenceReferences?: number;
  readonly conflicts?: number;
  readonly diagnostics?: number;
}

export function assertOperationResourceCounts(
  counts: OperationResourceCounts,
): void {
  const checks: readonly [number | undefined, number, string][] = [
    [counts.instruments, MATCHING_LIMITS.instruments, "Instrument"],
    [counts.bindings, MATCHING_LIMITS.bindings, "Binding"],
    [counts.aliases, MATCHING_LIMITS.bindings, "Alias"],
    [
      counts.partnersPerInstrument,
      MATCHING_LIMITS.partnersPerInstrument,
      "Partner",
    ],
    [counts.candidatePairs, MATCHING_LIMITS.candidatePairs, "Candidate pair"],
    [
      counts.mappingVersionsPerMapping,
      MATCHING_LIMITS.mappingVersionsPerMapping,
      "Mapping history",
    ],
    [
      counts.mappingEvents,
      MATCHING_LIMITS.mappingEventRecords,
      "Mapping event",
    ],
    [
      counts.evidencePerSubject,
      MATCHING_LIMITS.evidencePerSubject,
      "Evidence per subject",
    ],
    [
      counts.evidenceReferences,
      MATCHING_LIMITS.evidenceReferences,
      "Evidence reference",
    ],
    [counts.conflicts, MATCHING_LIMITS.conflicts, "Conflict"],
    [counts.diagnostics, MATCHING_LIMITS.diagnostics, "Diagnostic"],
  ];
  for (const [count, limit, label] of checks)
    if (count !== undefined) assertCount(count, limit, label);
}

export function assertEvidenceRecord(value: unknown, work?: WorkBudget): void {
  // Bound before serializing: the walk accumulates a lower bound on the
  // serialized UTF-8 size from O(1) lengths and rejects an oversized record
  // before scanning its oversized parts or calling JSON.stringify.
  const authority = work ?? new WorkBudget();
  const state: WalkState = {
    nodes: 0,
    minimumBytes: 0,
    byteLimit: MATCHING_LIMITS.evidenceRecordBytes,
  };
  walk(value, 1, state, authority);
  // Precharge the atomic serialization at its worst case: every character of
  // the bounded minimum may expand to a six-character escape.
  authority.units(6 * (state.minimumBytes ?? 0) + 2);
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new MatchingFailure("INPUT_INVALID", "Invalid evidence record.");
  }
  if (typeof serialized !== "string")
    throw new MatchingFailure("INPUT_INVALID", "Invalid evidence record.");
  authority.step(Math.max(1, Math.ceil(serialized.length / 512)));
  const bytes = Buffer.byteLength(serialized, "utf8");
  authority.step(Math.max(1, Math.ceil(bytes / 512)));
  assertCount(
    bytes,
    MATCHING_LIMITS.evidenceRecordBytes,
    "Evidence record byte",
  );
}

/**
 * Native string equality compares every code unit when the lengths match;
 * charge that pass (plus one) before comparing. Different lengths or a
 * non-string operand compare in O(1).
 */
export function sameText(
  left: unknown,
  right: unknown,
  work: WorkBudget,
): boolean {
  work.units(
    (typeof left === "string" &&
    typeof right === "string" &&
    left.length === right.length
      ? left.length
      : 0) + 1,
  );
  return left === right;
}

/** Hashing a string key (Map/Set lookup or insertion) reads every code unit. */
export function chargeKey<T extends string>(key: T, work?: WorkBudget): T {
  work?.units(key.length + 1);
  return key;
}

// No closed-schema field name, enumeration value or reason code is longer;
// a longer caller string is rejected in O(1) before it is hashed.
export const MAXIMUM_SCHEMA_TOKEN = 64;

/**
 * Membership of a caller-supplied value in a fixed vocabulary: non-strings
 * and over-long strings are rejected in O(1); otherwise the hash is charged.
 */
export function inVocabulary(
  vocabulary: ReadonlySet<string>,
  value: unknown,
  work?: WorkBudget,
): boolean {
  return (
    typeof value === "string" &&
    value.length <= MAXIMUM_SCHEMA_TOKEN &&
    vocabulary.has(chargeKey(value, work))
  );
}
