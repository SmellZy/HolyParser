import type { Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertAtomicId,
  assertCount,
  assertReasonText,
  chargeKey,
  sameText,
} from "./bounds.js";
import type {
  MappingTransitionRecord,
  MappingTransitionType,
  MappingVersion,
  ReviewApproval,
} from "./model.js";
import { MATCHING_POLICY_VERSION } from "./policy.js";
import { epoch, isEffective } from "./registry.js";
import { MatchingFailure, type MatchReasonCode } from "./reasons.js";
import { chargeCopy, frozenRecord } from "./immutable.js";
import { deterministicId } from "./serialization.js";

export interface TransitionApprovalInput {
  readonly actorId: string;
  readonly role: ReviewApproval["role"];
  readonly recordedAt: Timestamp;
}

export interface MappingTransitionInput {
  readonly transitionId: string;
  readonly mappingId: string;
  readonly affectedVersion: number;
  readonly transitionType: MappingTransitionType;
  readonly effectiveAt: Timestamp;
  readonly reasonCode: MatchReasonCode;
  readonly reasonText?: string;
  readonly reference?: string;
  readonly successorVersion?: number;
  readonly policyRevision: typeof MATCHING_POLICY_VERSION;
  readonly expectedRevision: number;
  readonly expectedState: "APPROVED";
  readonly proposerId: string;
  readonly registryRevision: string;
  readonly evidenceRevision: string;
  readonly provenanceDigest: string;
  readonly recordedKnowledgeAt: Timestamp;
  readonly approvals: readonly TransitionApprovalInput[];
}

const domain = (type: MappingTransitionType): string =>
  type === "SUPERSEDE"
    ? "mapping-transition-supersede/v1"
    : type === "INVALIDATE"
      ? "mapping-transition-invalidate/v1"
      : "mapping-transition-correct/v1";

function expectedReason(type: MappingTransitionType): MatchReasonCode {
  return type === "SUPERSEDE" ? "MAPPING_SUPERSEDED" : "MAPPING_INVALIDATED";
}

function validateRevision(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new MatchingFailure("MAPPING_REVISION_CONFLICT", `${label} invalid.`);
}

function payload(
  input: Omit<MappingTransitionRecord, "approvals" | "commandDigest">,
  work: WorkBudget,
): string {
  return deterministicId(
    domain(input.transitionType),
    {
      affectedVersion: String(input.affectedVersion),
      effectiveAt: input.effectiveAt,
      evidenceRevision: input.evidenceRevision,
      expectedRevision: String(input.expectedRevision),
      expectedState: input.expectedState,
      mappingId: input.mappingId,
      policyRevision: input.policyRevision,
      proposerId: input.proposerId,
      provenanceDigest: input.provenanceDigest,
      reasonCode: input.reasonCode,
      reasonText: input.reasonText ?? null,
      reference: input.reference ?? null,
      recordedKnowledgeAt: input.recordedKnowledgeAt,
      registryRevision: input.registryRevision,
      successorVersion:
        input.successorVersion === undefined
          ? null
          : String(input.successorVersion),
      transitionId: input.transitionId,
      transitionType: input.transitionType,
    },
    work,
  );
}

function validateApprovalActors(
  proposerId: string,
  approvals: readonly ReviewApproval[],
  digest: string,
  work: WorkBudget,
): void {
  const quant: ReviewApproval[] = [];
  const marketData: ReviewApproval[] = [];
  assertCount(approvals.length, 3, "Approval");
  for (const approval of approvals) {
    work.step();
    assertAtomicId(approval.actorId, "Transition reviewer", work);
    assertAtomicId(approval.approvedDigest, "Transition approval digest", work);
    epoch(approval.recordedAt, work);
    if (!sameText(approval.approvedDigest, digest, work))
      throw new MatchingFailure(
        "COMMAND_DIGEST_CONFLICT",
        "Transition approval digest mismatch.",
      );
    if (approval.role === "QUANT_REVIEWER") quant.push(approval);
    if (approval.role === "MARKET_DATA_REVIEWER") marketData.push(approval);
  }
  if (
    approvals.length !== 2 ||
    quant.length !== 1 ||
    marketData.length !== 1 ||
    new Set([
      chargeKey(proposerId, work),
      chargeKey(quant[0]!.actorId, work),
      chargeKey(marketData[0]!.actorId, work),
    ]).size !== 3
  )
    throw new MatchingFailure(
      "REVIEWER_SEPARATION_REQUIRED",
      "Independent transition reviewers required.",
    );
}

function validateSemanticFields(
  input: Omit<MappingTransitionRecord, "approvals" | "commandDigest">,
  work: WorkBudget,
): void {
  if (!["SUPERSEDE", "INVALIDATE", "CORRECT"].includes(input.transitionType))
    throw new MatchingFailure(
      "TRANSITION_REJECTED",
      "Transition type is invalid.",
    );
  if (input.reasonText !== undefined) assertReasonText(input.reasonText, work);
  for (const [value, label] of [
    [input.transitionId, "Transition ID"],
    [input.mappingId, "Transition mapping ID"],
    [input.proposerId, "Transition proposer"],
    [input.registryRevision, "Transition registry revision"],
    [input.evidenceRevision, "Transition evidence revision"],
    [input.provenanceDigest, "Transition provenance digest"],
  ] as const) {
    work.step();
    assertAtomicId(value, label, work);
  }
  validateRevision(input.affectedVersion, "Affected version");
  validateRevision(input.expectedRevision, "Expected revision");
  if (input.successorVersion !== undefined)
    validateRevision(input.successorVersion, "Successor version");
  if (input.policyRevision !== MATCHING_POLICY_VERSION)
    throw new MatchingFailure(
      "MAPPING_REVISION_CONFLICT",
      "Transition policy revision mismatch.",
    );
  if (input.expectedState !== "APPROVED")
    throw new MatchingFailure(
      "TRANSITION_REJECTED",
      "Invalid predecessor state.",
    );
  if (input.reasonCode !== expectedReason(input.transitionType))
    throw new MatchingFailure(
      "TRANSITION_REJECTED",
      "Transition reason mismatch.",
    );
  if (
    input.transitionType === "INVALIDATE" &&
    input.successorVersion !== undefined
  )
    throw new MatchingFailure(
      "TRANSITION_REJECTED",
      "Invalidation has successor.",
    );
  if (
    input.transitionType !== "INVALIDATE" &&
    input.successorVersion === undefined
  )
    throw new MatchingFailure("TRANSITION_REJECTED", "Successor is required.");
  epoch(input.effectiveAt, work);
  epoch(input.recordedKnowledgeAt, work);
  if (input.reference !== undefined)
    assertAtomicId(input.reference, "Transition reference", work);
  if (input.transitionType !== "SUPERSEDE" && input.reference === undefined)
    throw new MatchingFailure(
      "TRANSITION_REJECTED",
      "Transition reference required.",
    );
}

export function createTransitionRecord(
  input: MappingTransitionInput,
  operationBudget?: WorkBudget,
): MappingTransitionRecord {
  const work = operationBudget ?? new WorkBudget();
  if (input === null || typeof input !== "object")
    throw new MatchingFailure("INPUT_INVALID", "Transition is invalid.");
  // L-05: one own-property, null-prototype copy; an absent optional field
  // (reasonText, reference, successorVersion) reads as undefined, never as an
  // inherited polluted value.
  chargeCopy(input, work);
  const source = frozenRecord({ ...input });
  if (!Array.isArray(source.approvals))
    throw new MatchingFailure("INPUT_INVALID", "Approvals are invalid.");
  assertCount(source.approvals.length, 3, "Approval");
  const unsigned = {
    transitionId: source.transitionId,
    mappingId: source.mappingId,
    affectedVersion: source.affectedVersion,
    transitionType: source.transitionType,
    effectiveAt: source.effectiveAt,
    reasonCode: source.reasonCode,
    reasonText: source.reasonText,
    reference: source.reference,
    successorVersion: source.successorVersion,
    policyRevision: source.policyRevision,
    expectedRevision: source.expectedRevision,
    expectedState: source.expectedState,
    proposerId: source.proposerId,
    registryRevision: source.registryRevision,
    evidenceRevision: source.evidenceRevision,
    provenanceDigest: source.provenanceDigest,
    recordedKnowledgeAt: source.recordedKnowledgeAt,
  } as const;
  validateSemanticFields(unsigned, work);
  const commandDigest = payload(unsigned, work);
  const approvals = Object.freeze(
    source.approvals.map((approval) => {
      work.step();
      chargeCopy(approval, work);
      return frozenRecord({ ...approval, approvedDigest: commandDigest });
    }),
  );
  validateApprovalActors(source.proposerId, approvals, commandDigest, work);
  chargeCopy(unsigned, work);
  const result = frozenRecord({ ...unsigned, approvals, commandDigest });
  if (operationBudget === undefined) work.beforePublication();
  return result;
}

export function validateTransitionRecord(
  input: MappingTransitionRecord,
  target: MappingVersion,
  provenanceDigest: string,
  work: WorkBudget,
): MappingTransitionRecord {
  validateSemanticFields(input, work);
  // Transition fields are bounded by validateSemanticFields; every equality
  // pass below is charged before it runs.
  if (
    !sameText(input.mappingId, target.mappingId, work) ||
    input.affectedVersion !== target.version ||
    input.expectedRevision !== target.version ||
    !sameText(input.registryRevision, target.registryRevision, work) ||
    !sameText(input.evidenceRevision, target.evidenceRevision, work) ||
    !sameText(input.provenanceDigest, provenanceDigest, work)
  )
    throw new MatchingFailure(
      "MAPPING_REVISION_CONFLICT",
      "Transition target provenance mismatch.",
    );
  if (
    epoch(input.recordedKnowledgeAt, work) <
      epoch(target.recordedKnowledgeAt, work) ||
    !isEffective(
      target.effectiveFrom,
      target.effectiveTo,
      input.effectiveAt,
      work,
    )
  )
    throw new MatchingFailure(
      "EVIDENCE_TIME_INVALID",
      "Transition time precedes or falls outside its authority.",
    );
  const expectedDigest = payload(input, work);
  if (!sameText(expectedDigest, input.commandDigest, work))
    throw new MatchingFailure(
      "COMMAND_DIGEST_CONFLICT",
      "Transition command digest mismatch.",
    );
  validateApprovalActors(
    input.proposerId,
    input.approvals,
    input.commandDigest,
    work,
  );
  chargeCopy(input, work);
  return frozenRecord({
    ...input,
    approvals: Object.freeze(
      input.approvals.map((approval) => {
        work.step();
        chargeCopy(approval, work);
        return frozenRecord({ ...approval });
      }),
    ),
  });
}

export function transitionDigest(
  transition: MappingTransitionRecord,
  work: WorkBudget,
): string {
  return deterministicId(
    "admitted-mapping-transition/v1",
    {
      commandDigest: transition.commandDigest,
      transitionId: transition.transitionId,
      transitionType: transition.transitionType,
    },
    work,
  );
}
