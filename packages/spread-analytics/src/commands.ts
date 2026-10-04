import type { Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertAtomicId,
  assertCompositeId,
  assertCount,
  assertReasonText,
  chargeKey,
  sameText,
  type CancellationSignal,
} from "./bounds.js";
import type {
  MappingTransitionRecord,
  MappingVersion,
  ReviewApproval,
} from "./model.js";
import { chargeCopy, immutableMapping } from "./immutable.js";
import { MATCHING_LIMITS, MATCHING_POLICY_VERSION } from "./policy.js";
import { isEffective } from "./registry.js";
import { epoch } from "./time.js";
import { inputBoundary, snapshotInput } from "./snapshot.js";
import { MatchingFailure, type MatchReasonCode } from "./reasons.js";
import { compareUtf8WithBudget, deterministicId } from "./serialization.js";
import {
  createTransitionRecord,
  validateTransitionRecord,
} from "./transitions.js";

export interface ApprovalInput {
  readonly actorId: string;
  readonly role: ReviewApproval["role"];
  readonly recordedAt: Timestamp;
}
export interface ApproveCommandInput {
  readonly commandId: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly expectedRevision: number;
  readonly proposedBy: string;
  readonly mappingId: string;
  readonly leftInstrumentId: string;
  readonly rightInstrumentId: string;
  readonly exposureKey: string;
  readonly effectiveFrom: Timestamp;
  readonly effectiveTo: Timestamp;
  readonly recordedKnowledgeAt: Timestamp;
  readonly registryRevision: string;
  readonly evidenceRevision: string;
  readonly reasonText: string;
  readonly approvals: readonly ApprovalInput[];
}
export interface ApproveMappingCommand extends ApproveCommandInput {
  readonly kind: "APPROVE_MAPPING";
  readonly approvals: readonly ReviewApproval[];
  readonly commandDigest: string;
}
export interface InvalidateCommandInput {
  readonly commandId: string;
  readonly expectedRevision: number;
  readonly mappingId: string;
  readonly affectedVersion: number;
  readonly effectiveAt: Timestamp;
  readonly recordedKnowledgeAt: Timestamp;
  readonly reasonText: string;
  readonly invalidationReference: string;
  readonly proposedBy: string;
  readonly registryRevision: string;
  readonly evidenceRevision: string;
  readonly provenanceDigest: string;
  readonly approvals: readonly ApprovalInput[];
}
export interface InvalidateMappingCommand extends InvalidateCommandInput {
  readonly kind: "INVALIDATE_MAPPING";
  readonly transition: MappingTransitionRecord;
  readonly commandDigest: string;
}
export type MappingCommand = ApproveMappingCommand | InvalidateMappingCommand;
function payload(input: ApproveCommandInput, work?: WorkBudget): string {
  return deterministicId(
    "mapping-command/v1",
    {
      commandId: input.commandId,
      candidateDigest: input.candidateDigest,
      candidateId: input.candidateId,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      evidenceRevision: input.evidenceRevision,
      expectedRevision: String(input.expectedRevision),
      exposureKey: input.exposureKey,
      left: input.leftInstrumentId,
      mappingId: input.mappingId,
      proposedBy: input.proposedBy,
      reasonText: input.reasonText,
      recordedKnowledgeAt: input.recordedKnowledgeAt,
      registryRevision: input.registryRevision,
      right: input.rightInstrumentId,
    },
    work,
  );
}

function assertRevision(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new MatchingFailure("INPUT_INVALID", `${label} is invalid.`);
}

const REVIEWER_ROLES = [
  "MARKET_DATA_REVIEWER",
  "PRODUCT_REVIEWER",
  "QUANT_REVIEWER",
] as const;
const APPROVAL_LIMIT = 3;

function validateApprovalInputs(
  approvals: readonly ApprovalInput[],
  work: WorkBudget,
): void {
  if (!Array.isArray(approvals))
    throw new MatchingFailure("INPUT_INVALID", "Approvals are invalid.");
  // Count before any traversal; every field is bounded before comparison.
  assertCount(approvals.length, APPROVAL_LIMIT, "Approval");
  for (const approval of approvals) {
    work.step();
    if (approval === null || typeof approval !== "object")
      throw new MatchingFailure("INPUT_INVALID", "Approval is invalid.");
    assertAtomicId(approval.actorId, "Reviewer ID", work);
    if (!REVIEWER_ROLES.includes(approval.role))
      throw new MatchingFailure("INPUT_INVALID", "Reviewer role is invalid.");
    epoch(approval.recordedAt, work);
  }
}

function validateApproveInput(
  input: ApproveCommandInput,
  work: WorkBudget,
): void {
  for (const [value, label] of [
    [input.commandId, "Command ID"],
    [input.candidateId, "Candidate ID"],
    [input.candidateDigest, "Candidate digest"],
    [input.proposedBy, "Proposer ID"],
    [input.mappingId, "Mapping ID"],
    [input.registryRevision, "Registry revision"],
    [input.evidenceRevision, "Evidence revision"],
  ] as const) {
    work.step();
    assertAtomicId(value, label, work);
  }
  assertCompositeId(input.leftInstrumentId, work);
  assertCompositeId(input.rightInstrumentId, work);
  assertCompositeId(input.exposureKey, work);
  assertReasonText(input.reasonText, work);
  assertRevision(input.expectedRevision, "Expected revision");
  epoch(input.recordedKnowledgeAt, work);
  isEffective(
    input.effectiveFrom,
    input.effectiveTo,
    input.effectiveFrom,
    work,
  );
  validateApprovalInputs(input.approvals, work);
}

/** Internal: approve-command construction on the caller's operation budget. */
export function approveCommandWithBudget(
  callerInput: ApproveCommandInput,
  work: WorkBudget,
): ApproveMappingCommand {
  // N-01: validate and publish only one passive frozen snapshot.
  const input = snapshotInput(callerInput, work);
  validateApproveInput(input, work);
  const digest = payload(input, work);
  chargeCopy(input, work);
  return Object.freeze({
    ...input,
    kind: "APPROVE_MAPPING",
    approvals: Object.freeze(
      input.approvals.map(
        (a) => (
          work.step(),
          chargeCopy(a, work),
          Object.freeze({ ...a, approvedDigest: digest })
        ),
      ),
    ),
    commandDigest: digest,
  });
}
export function approveCommand(
  input: ApproveCommandInput,
): ApproveMappingCommand {
  const work = new WorkBudget();
  const result = inputBoundary(() => approveCommandWithBudget(input, work));
  work.beforePublication();
  return result;
}
export function invalidateCommand(
  callerInput: InvalidateCommandInput,
): InvalidateMappingCommand {
  const work = new WorkBudget();
  const result = inputBoundary(() =>
    invalidateWithBudget(snapshotInput(callerInput, work), work),
  );
  work.beforePublication();
  return result;
}
function invalidateWithBudget(
  input: InvalidateCommandInput,
  work: WorkBudget,
): InvalidateMappingCommand {
  assertAtomicId(input.commandId, "Command ID", work);
  assertAtomicId(input.mappingId, "Mapping ID", work);
  assertAtomicId(input.invalidationReference, "Invalidation reference", work);
  assertReasonText(input.reasonText, work);
  assertRevision(input.expectedRevision, "Expected revision");
  if (!Number.isSafeInteger(input.affectedVersion) || input.affectedVersion < 1)
    throw new MatchingFailure("INPUT_INVALID", "Affected version is invalid.");
  epoch(input.recordedKnowledgeAt, work);
  validateApprovalInputs(input.approvals, work);
  const transition = createTransitionRecord(
    {
      transitionId: input.commandId,
      mappingId: input.mappingId,
      affectedVersion: input.affectedVersion,
      transitionType: "INVALIDATE",
      effectiveAt: input.effectiveAt,
      reasonCode: "MAPPING_INVALIDATED",
      reasonText: input.reasonText,
      reference: input.invalidationReference,
      policyRevision: MATCHING_POLICY_VERSION,
      expectedRevision: input.expectedRevision,
      expectedState: "APPROVED",
      proposerId: input.proposedBy,
      registryRevision: input.registryRevision,
      evidenceRevision: input.evidenceRevision,
      provenanceDigest: input.provenanceDigest,
      recordedKnowledgeAt: input.recordedKnowledgeAt,
      approvals: input.approvals,
    },
    work,
  );
  chargeCopy(input, work);
  return Object.freeze({
    ...input,
    kind: "INVALIDATE_MAPPING",
    transition,
    commandDigest: transition.commandDigest,
  });
}

/**
 * Bounds every caller-controlled command field before any comparison, hash
 * or lookup touches it (acceptance-5 H-03). Unknown kinds are rejected.
 */
function validateCommandFields(
  command: MappingCommand,
  work: WorkBudget,
): void {
  work.step();
  if (command === null || typeof command !== "object")
    throw new MatchingFailure("INPUT_INVALID", "Command is invalid.");
  if (command.kind === "APPROVE_MAPPING") {
    validateApproveInput(command, work);
    assertAtomicId(command.commandDigest, "Command digest", work);
    for (const approval of command.approvals) {
      work.step();
      assertAtomicId(approval.approvedDigest, "Approval digest", work);
    }
    return;
  }
  if (command.kind !== "INVALIDATE_MAPPING")
    throw new MatchingFailure("INPUT_INVALID", "Command kind is invalid.");
  for (const [value, label] of [
    [command.commandId, "Command ID"],
    [command.commandDigest, "Command digest"],
    [command.mappingId, "Mapping ID"],
    [command.invalidationReference, "Invalidation reference"],
    [command.proposedBy, "Proposer ID"],
    [command.registryRevision, "Registry revision"],
    [command.evidenceRevision, "Evidence revision"],
    [command.provenanceDigest, "Provenance digest"],
  ] as const) {
    work.step();
    assertAtomicId(value, label, work);
  }
  assertReasonText(command.reasonText, work);
  assertRevision(command.expectedRevision, "Expected revision");
  if (
    !Number.isSafeInteger(command.affectedVersion) ||
    command.affectedVersion < 1
  )
    throw new MatchingFailure("INPUT_INVALID", "Affected version is invalid.");
  epoch(command.effectiveAt, work);
  epoch(command.recordedKnowledgeAt, work);
  validateApprovalInputs(command.approvals, work);
  const transition = command.transition as unknown;
  if (
    transition === null ||
    typeof transition !== "object" ||
    !Array.isArray((transition as MappingTransitionRecord).approvals)
  )
    throw new MatchingFailure("INPUT_INVALID", "Transition is malformed.");
}

// Internal construction hand-off: a public caller cannot supply a budget.
let pendingLedgerBudget: WorkBudget | undefined;
export function ledgerWithBudget(
  versions: readonly MappingVersion[],
  transitions: readonly MappingTransitionRecord[],
  work: WorkBudget,
): MappingLedger {
  pendingLedgerBudget = work;
  try {
    return new MappingLedger(versions, transitions);
  } finally {
    pendingLedgerBudget = undefined;
  }
}
type LedgerApplication = {
  readonly ledger: MappingLedger;
  readonly mapping: MappingVersion;
  readonly idempotent: boolean;
};
// Internal budgeted application, bound in the class static block below.
// Exported from this module only; the package root does not re-export it.
export let applyWithBudget: (
  ledger: MappingLedger,
  command: MappingCommand,
  work: WorkBudget,
) => LedgerApplication;

/** Brand check: only a genuine ledger instance is trusted (L-03). */
export let isMappingLedger: (value: unknown) => value is MappingLedger;
export class MappingLedger {
  static {
    applyWithBudget = (ledger, command, work) => ledger.#apply(command, work);
    isMappingLedger = (value: unknown): value is MappingLedger =>
      typeof value === "object" && value !== null && #commandDigests in value;
  }
  readonly versions: readonly MappingVersion[];
  readonly transitions: readonly MappingTransitionRecord[];
  #commandDigests: Map<string, string>;
  constructor(
    callerVersions: readonly MappingVersion[] = [],
    callerTransitions: readonly MappingTransitionRecord[] = [],
  ) {
    const parent = pendingLedgerBudget;
    pendingLedgerBudget = undefined;
    const work = parent ?? new WorkBudget();
    const state = inputBoundary(() =>
      MappingLedger.#build(
        snapshotInput(callerVersions, work),
        snapshotInput(callerTransitions, work),
        work,
      ),
    );
    this.versions = state.versions;
    this.transitions = state.transitions;
    this.#commandDigests = new Map();
    if (parent === undefined) work.beforePublication();
  }
  static #build(
    versions: readonly MappingVersion[],
    transitions: readonly MappingTransitionRecord[],
    work: WorkBudget,
  ) {
    if (
      !Array.isArray(versions as unknown) ||
      !Array.isArray(transitions as unknown)
    )
      throw new MatchingFailure("INPUT_INVALID", "Ledger input is invalid.");
    assertCount(
      versions.length,
      MATCHING_LIMITS.mappingEventRecords,
      "Mapping record",
    );
    assertCount(
      transitions.length,
      MATCHING_LIMITS.mappingEventRecords,
      "Mapping transition",
    );
    const counts = new Map<string, number>();
    for (const v of versions) {
      work.step();
      // Bound the key before hashing it.
      assertAtomicId(v.mappingId, "Mapping ID", work);
      const n = (counts.get(chargeKey(v.mappingId, work)) ?? 0) + 1;
      assertCount(
        n,
        MATCHING_LIMITS.mappingVersionsPerMapping,
        "Mapping history",
      );
      counts.set(chargeKey(v.mappingId, work), n);
    }
    const frozenVersions = Object.freeze(
      versions.map((value) => (work.step(), immutableMapping(value, work))),
    );
    const frozenTransitions = Object.freeze(
      transitions.map((transition) => {
        work.step();
        chargeCopy(transition, work);
        return Object.freeze({
          ...transition,
          approvals: Object.freeze(
            transition.approvals.map((approval) => {
              work.step();
              chargeCopy(approval, work);
              return Object.freeze({ ...approval });
            }),
          ),
        });
      }),
    );
    return { versions: frozenVersions, transitions: frozenTransitions };
  }
  commandDigest(commandId: string): string | undefined {
    const work = new WorkBudget();
    assertAtomicId(commandId, "Command ID", work);
    const result = this.#commandDigests.get(chargeKey(commandId, work));
    work.beforePublication();
    return result;
  }
  commandDigestSnapshot(): readonly Readonly<{
    readonly commandId: string;
    readonly digest: string;
  }>[] {
    const work = new WorkBudget();
    work.step(this.#commandDigests.size);
    const result = Object.freeze(
      [...this.#commandDigests]
        .sort(([left], [right]) => {
          return compareUtf8WithBudget(work)(left, right);
        })
        .map(([commandId, digest]) => {
          work.step();
          return Object.freeze({ commandId, digest });
        }),
    );
    work.beforePublication();
    return result;
  }
  /** Public application: its own operation budget and final check. */
  apply(command: MappingCommand): LedgerApplication {
    const work = new WorkBudget();
    const result = inputBoundary(() => this.#apply(command, work));
    work.beforePublication();
    return result;
  }
  #apply(callerCommand: MappingCommand, work: WorkBudget): LedgerApplication {
    // N-01: one passive frozen snapshot; nothing below rereads the caller.
    const command = snapshotInput(callerCommand, work);
    validateCommandFields(command, work);
    if (command.kind === "INVALIDATE_MAPPING")
      this.#assertInvalidateCommandBinding(command, work);
    const priorDigest = this.#commandDigests.get(
      chargeKey(command.commandId, work),
    );
    if (priorDigest !== undefined) {
      if (!sameText(priorDigest, command.commandDigest, work))
        throw new MatchingFailure(
          "COMMAND_DIGEST_CONFLICT",
          "Command ID reused.",
        );
      work.units(2 * this.versions.length + 1);
      const mapping = [...this.versions]
        .reverse()
        .find(
          (v) => (work.step(), sameText(v.mappingId, command.mappingId, work)),
        );
      if (!mapping)
        throw new MatchingFailure(
          "TRANSITION_REJECTED",
          "Missing idempotent result.",
        );
      return Object.freeze({ ledger: this, mapping, idempotent: true });
    }
    const revision = this.versions.filter(
      (v) => (work.step(), sameText(v.mappingId, command.mappingId, work)),
    ).length;
    if (command.expectedRevision !== revision)
      throw new MatchingFailure(
        "MAPPING_REVISION_CONFLICT",
        "Stale expected revision.",
      );
    let mapping: MappingVersion;
    let nextVersions = this.versions;
    let nextTransitions = this.transitions;
    if (command.kind === "APPROVE_MAPPING") {
      mapping = this.#approve(command, revision, work);
      work.step(this.versions.length);
      nextVersions = [...this.versions, mapping];
    } else {
      const transition = this.#invalidate(command, revision, work);
      mapping = this.versions.find(
        (value) =>
          (work.step(), true) &&
          sameText(value.mappingId, command.mappingId, work) &&
          value.version === command.affectedVersion,
      )!;
      work.step(this.transitions.length);
      nextTransitions = [...this.transitions, transition];
    }
    const commands = new Map<string, string>();
    for (const [commandId, digest] of this.#commandDigests) {
      work.step();
      commands.set(chargeKey(commandId, work), digest);
    }
    commands.set(chargeKey(command.commandId, work), command.commandDigest);
    const ledger = ledgerWithBudget(nextVersions, nextTransitions, work);
    ledger.#commandDigests = commands;
    return Object.freeze({ ledger, mapping, idempotent: false });
  }
  #approve(
    command: ApproveMappingCommand,
    revision: number,
    work: WorkBudget,
  ): MappingVersion {
    assertReasonText(command.reasonText, work);
    if (!sameText(command.commandDigest, payload(command, work), work))
      throw new MatchingFailure(
        "COMMAND_DIGEST_CONFLICT",
        "Invalid command digest.",
      );
    const quant = command.approvals.filter(
        (a) => (work.step(), a.role === "QUANT_REVIEWER"),
      ),
      md = command.approvals.filter(
        (a) => (work.step(), a.role === "MARKET_DATA_REVIEWER"),
      );
    if (
      quant.length !== 1 ||
      md.length !== 1 ||
      new Set([
        chargeKey(command.proposedBy, work),
        chargeKey(quant[0]!.actorId, work),
        chargeKey(md[0]!.actorId, work),
      ]).size !== 3
    )
      throw new MatchingFailure(
        "REVIEWER_SEPARATION_REQUIRED",
        "Independent reviewers required.",
      );
    if (
      !sameText(quant[0]!.approvedDigest, command.commandDigest, work) ||
      !sameText(md[0]!.approvedDigest, command.commandDigest, work)
    )
      throw new MatchingFailure(
        "COMMAND_DIGEST_CONFLICT",
        "Approval digest mismatch.",
      );
    isEffective(
      command.effectiveFrom,
      command.effectiveTo,
      command.effectiveFrom,
      work,
    );
    const overlap = this.versions.some(
      (v) =>
        (work.step(), true) &&
        v.status === "APPROVED" &&
        [v.leftInstrumentId, v.rightInstrumentId].some(
          (id) =>
            sameText(id, command.leftInstrumentId, work) ||
            sameText(id, command.rightInstrumentId, work),
        ) &&
        epoch(v.effectiveFrom, work) < epoch(command.effectiveTo, work) &&
        epoch(command.effectiveFrom, work) < epoch(v.effectiveTo, work) &&
        !sameText(v.exposureKey, command.exposureKey, work),
    );
    if (overlap)
      throw new MatchingFailure(
        "MAPPING_INTERVAL_CONFLICT",
        "Mapping intervals conflict.",
      );
    return immutableMapping(
      {
        mappingId: command.mappingId,
        version: revision + 1,
        status: "APPROVED",
        leftInstrumentId: command.leftInstrumentId,
        rightInstrumentId: command.rightInstrumentId,
        exposureKey: command.exposureKey,
        effectiveFrom: command.effectiveFrom,
        effectiveTo: command.effectiveTo,
        recordedKnowledgeAt: command.recordedKnowledgeAt,
        registryRevision: command.registryRevision,
        evidenceRevision: command.evidenceRevision,
        policyRevision: MATCHING_POLICY_VERSION,
        reasonCode: "COMPATIBLE_APPROVED",
        priorVersion: revision ? revision : undefined,
        approvals: command.approvals,
      },
      work,
    );
  }
  #invalidate(
    command: InvalidateMappingCommand,
    revision: number,
    work: WorkBudget,
  ): MappingTransitionRecord {
    assertReasonText(command.reasonText, work);
    const target = this.versions.find(
      (v) =>
        (work.step(), true) &&
        sameText(v.mappingId, command.mappingId, work) &&
        v.version === command.affectedVersion &&
        v.status === "APPROVED",
    );
    if (!target)
      throw new MatchingFailure(
        "TRANSITION_REJECTED",
        "Approved target required.",
      );
    if (revision !== command.expectedRevision)
      throw new MatchingFailure(
        "MAPPING_REVISION_CONFLICT",
        "Stale transition revision.",
      );
    if (
      this.transitions.some(
        (transition) => (
          work.step(),
          sameText(transition.mappingId, command.mappingId, work) &&
            transition.affectedVersion === command.affectedVersion
        ),
      )
    )
      throw new MatchingFailure(
        "TRANSITION_REJECTED",
        "Mapping already has a terminal transition.",
      );
    return validateTransitionRecord(
      command.transition,
      target,
      target.approvals[0]?.approvedDigest ?? "missing-provenance",
      work,
    );
  }
  #assertInvalidateCommandBinding(
    command: InvalidateMappingCommand,
    work: WorkBudget,
  ): void {
    work.step();
    const transition = command.transition;
    // Every command-side field is already bounded (validateCommandFields), so
    // each comparison is length-gated and charged before it runs.
    const same = (left: unknown, right: unknown) => sameText(left, right, work);
    if (
      !same(command.commandId, transition.transitionId) ||
      !same(command.commandDigest, transition.commandDigest) ||
      !same(command.mappingId, transition.mappingId) ||
      command.affectedVersion !== transition.affectedVersion ||
      command.expectedRevision !== transition.expectedRevision ||
      !same(command.effectiveAt, transition.effectiveAt) ||
      !same(command.recordedKnowledgeAt, transition.recordedKnowledgeAt) ||
      !same(command.invalidationReference, transition.reference) ||
      !same(command.reasonText, transition.reasonText) ||
      !same(command.proposedBy, transition.proposerId) ||
      !same(command.registryRevision, transition.registryRevision) ||
      !same(command.evidenceRevision, transition.evidenceRevision) ||
      !same(command.provenanceDigest, transition.provenanceDigest) ||
      transition.transitionType !== "INVALIDATE" ||
      command.approvals.length !== transition.approvals.length ||
      command.approvals.some(
        (approval, index) => (
          work.step(),
          !same(approval.actorId, transition.approvals[index]?.actorId) ||
            approval.role !== transition.approvals[index]?.role ||
            !same(approval.recordedAt, transition.approvals[index]?.recordedAt)
        ),
      )
    )
      throw new MatchingFailure(
        "COMMAND_DIGEST_CONFLICT",
        "Invalidation command does not bind its transition.",
      );
  }
}

export type MappingCommandAdmission =
  | {
      readonly status: "APPLIED";
      readonly ledger: MappingLedger;
      readonly mapping: MappingVersion;
      readonly idempotent: boolean;
    }
  | {
      readonly status: "QUARANTINED" | "REJECTED";
      readonly ledger: MappingLedger;
      readonly reason: MatchReasonCode;
    };

export function admitMappingCommand(
  ledger: MappingLedger,
  command: MappingCommand,
  signal?: CancellationSignal,
): MappingCommandAdmission {
  const work = new WorkBudget(signal);
  if (!isMappingLedger(ledger))
    throw new MatchingFailure("INPUT_INVALID", "Ledger is not authentic.");
  let result: MappingCommandAdmission;
  try {
    result = Object.freeze({
      status: "APPLIED" as const,
      // work: fixed-shape internal result (ledger, mapping, idempotent).
      ...applyWithBudget(ledger, command, work),
    });
  } catch (caught) {
    // L-04: a malformed caller shape is the typed INPUT_INVALID rejection.
    const error =
      caught instanceof TypeError || caught instanceof RangeError
        ? new MatchingFailure("INPUT_INVALID", "Malformed input.")
        : caught;
    if (!(error instanceof MatchingFailure)) throw error;
    // Cancellation and budget exhaustion are operation failures, never
    // ordinary domain outcomes: they propagate and nothing is published.
    if (
      error.code === "EVALUATION_CANCELLED" ||
      error.code === "MATCHING_BOUND_EXCEEDED"
    )
      throw error;
    result = Object.freeze({
      status:
        error.code === "MAPPING_INTERVAL_CONFLICT"
          ? ("QUARANTINED" as const)
          : ("REJECTED" as const),
      ledger,
      reason: error.code,
    });
  }
  // Every typed outcome (APPLIED, REJECTED, QUARANTINED) passes the final
  // cancellation/budget check before it is returned.
  work.beforePublication();
  return result;
}
