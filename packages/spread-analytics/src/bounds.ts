import { MatchingFailure } from "./reasons.js";
import { MATCHING_LIMITS } from "./policy.js";

export interface CancellationSignal {
  readonly aborted: boolean;
}
export interface WorkCheckObserver {
  checked(logicalStepGap: number, totalLogicalSteps: number): void;
}
export class WorkBudget {
  #steps = 0;
  #lastCheck = 0;
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
  beforePublication(): void {
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
  const scan = scanText(value, work, 64);
  if (
    Buffer.byteLength(value, "utf8") > MATCHING_LIMITS.reasonTextUtf8 ||
    scan.control ||
    scan.unpairedSurrogate ||
    /<[^>]*>|(?:javascript|data|blob):|https?:\/\//iu.test(value)
  )
    throw new MatchingFailure("INPUT_INVALID", "Reason text is invalid.");
}
function walk(
  value: unknown,
  depth: number,
  state: { nodes: number },
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
  if (
    typeof value === "string" &&
    (() => {
      const scan = scanText(value, work);
      return scan.control || scan.unpairedSurrogate;
    })()
  )
    throw new MatchingFailure("INPUT_INVALID", "Invalid JSON string.");
  if (Array.isArray(value)) {
    assertCount(value.length, MATCHING_LIMITS.genericArray, "Array");
    for (const item of value) walk(item, depth + 1, state, work);
  } else if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    assertCount(keys.length, MATCHING_LIMITS.objectKeys, "Object key");
    for (const key of keys) {
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
  work?.step(
    Math.max(1, Math.ceil(Buffer.byteLength(serialized, "utf8") / 4096)),
  );
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
  // JSON.stringify performs a repeated authoritative traversal. Preflight that
  // traversal on the same operation budget before constructing the byte string.
  const authority = work ?? new WorkBudget();
  walk(value, 1, { nodes: 0 }, authority);
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
