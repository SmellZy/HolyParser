import type { Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertAtomicId,
  assertCompositeId,
  assertCount,
  chargeKey,
  inVocabulary,
  sameText,
  type CancellationSignal,
} from "./bounds.js";
import {
  approveCommandWithBudget,
  type ApproveMappingCommand,
} from "./commands.js";
import {
  chargeCopy,
  immutableCandidate,
  immutableMapping,
  immutableReview,
} from "./immutable.js";
import type {
  InstrumentMatchCandidate,
  MappingVersion,
  MappingTransitionRecord,
  ReviewApproval,
  ReviewRecord,
} from "./model.js";
import { MATCHING_LIMITS, MATCHING_POLICY_VERSION } from "./policy.js";
import { epoch, isEffective } from "./registry.js";
import {
  MATCH_REASON_CODES,
  MatchingFailure,
  type MatchReasonCode,
} from "./reasons.js";
import {
  canonicalSerialize,
  compareUtf8WithBudget,
  deterministicId,
  sha256,
} from "./serialization.js";
import { transitionDigest, validateTransitionRecord } from "./transitions.js";
import { inputBoundary, snapshotInput } from "./snapshot.js";

export interface MappingAdmissionRecord {
  readonly mapping: MappingVersion;
  readonly candidate: InstrumentMatchCandidate;
  readonly review: ReviewRecord;
  readonly command: ApproveMappingCommand;
}
export interface MappingAdmissionInput extends MappingAdmissionRecord {
  readonly history: readonly MappingAdmissionRecord[];
  readonly transitions: readonly MappingTransitionRecord[];
}
declare const admittedHistoryBrand: unique symbol;
export interface AdmittedMappingHistory {
  readonly mappingId: string;
  readonly digest: string;
  readonly versions: readonly MappingVersion[];
  readonly transitions: readonly MappingTransitionRecord[];
  readonly current: MappingVersion;
  readonly [admittedHistoryBrand]: true;
}
interface MaterializedHistory extends AdmittedMappingHistory {
  readonly records: readonly MappingAdmissionRecord[];
}
export type MappingAdmissionState =
  | "VALID"
  | "INCOMPLETE"
  | "INVALID_PROVENANCE"
  | "REVISION_MISMATCH"
  | "DIGEST_MISMATCH"
  | "REVIEWER_SEPARATION_FAILURE"
  | "INVALID_INTERVAL"
  | "SUPERSEDED"
  | "INVALIDATED"
  | "QUARANTINED"
  | "CONFLICTING";
type ValidatedAdmission = {
  readonly reason: MatchReasonCode;
  readonly mapping: MappingVersion;
  readonly candidate: InstrumentMatchCandidate;
  readonly review: ReviewRecord;
  readonly history: AdmittedMappingHistory;
};
export type MappingAdmissionResult =
  | (ValidatedAdmission & {
      readonly state: "VALID";
      readonly reason: "COMPATIBLE_APPROVED";
    })
  | (Partial<ValidatedAdmission> & {
      readonly state: Exclude<MappingAdmissionState, "VALID">;
      readonly reason: MatchReasonCode;
    });

const admittedHistories = new WeakSet<object>();
export function isAdmittedMappingHistory(
  value: unknown,
): value is AdmittedMappingHistory {
  return (
    value !== null &&
    typeof value === "object" &&
    admittedHistories.has(value as object)
  );
}
export function materializedHistoryRecords(
  history: AdmittedMappingHistory,
): readonly MappingAdmissionRecord[] {
  if (!isAdmittedMappingHistory(history))
    throw new MatchingFailure("INPUT_INVALID", "History is not admitted.");
  return (history as MaterializedHistory).records;
}
export function materializedHistoryTransitions(
  history: AdmittedMappingHistory,
): readonly MappingTransitionRecord[] {
  if (!isAdmittedMappingHistory(history))
    throw new MatchingFailure("INPUT_INVALID", "History is not admitted.");
  return history.transitions;
}
const failure = (
  state: Exclude<MappingAdmissionState, "VALID">,
  reason: MatchReasonCode,
): MappingAdmissionResult => Object.freeze({ state, reason });

function assertShape(
  value: object,
  required: readonly string[],
  optional: readonly string[],
  work: WorkBudget,
): void {
  // Own-key enumeration cannot be bounded before it returns; charge it
  // immediately and reject an oversized object before further work.
  const keys = Object.keys(value);
  work.step();
  work.units(keys.length + 1);
  assertCount(keys.length, MATCHING_LIMITS.objectKeys, "Object key");
  const allowed = new Set([...required, ...optional]);
  for (const key of keys) {
    work.step();
    if (!inVocabulary(allowed, key, work))
      throw new MatchingFailure(
        "INPUT_INVALID",
        "Record has an unknown field.",
      );
  }
  for (const key of required) {
    work.step();
    if (!(key in value))
      throw new MatchingFailure("INPUT_INVALID", "Record is incomplete.");
  }
}
function immutableCommand(
  value: ApproveMappingCommand,
  work: WorkBudget,
): ApproveMappingCommand {
  chargeCopy(value, work);
  return Object.freeze({
    ...value,
    approvals: Object.freeze(
      value.approvals.map((item) => {
        work.step();
        chargeCopy(item, work);
        return Object.freeze({ ...item });
      }),
    ),
  });
}
const sameApproval = (
  left: ReviewApproval,
  right: ReviewApproval,
  work: WorkBudget,
): boolean =>
  sameText(left.actorId, right.actorId, work) &&
  sameText(left.role, right.role, work) &&
  sameText(left.approvedDigest, right.approvedDigest, work) &&
  sameText(left.recordedAt, right.recordedAt, work);
function approvalsEqual(
  left: readonly ReviewApproval[],
  right: readonly ReviewApproval[],
  work: WorkBudget,
): boolean {
  if (left.length !== right.length) return false;
  const compare = compareUtf8WithBudget(work);
  const sorted = (values: readonly ReviewApproval[]) =>
    (work.units(values.length + 1), [...values]).sort((a, b) =>
      // work: ropes flattened by the charged UTF-8 comparator.
      compare(`${a.role}:${a.actorId}`, `${b.role}:${b.actorId}`),
    );
  const a = sorted(left),
    b = sorted(right);
  for (let index = 0; index < a.length; index += 1) {
    work.step();
    if (!sameApproval(a[index]!, b[index]!, work)) return false;
  }
  return true;
}
function expectedCommand(
  command: ApproveMappingCommand,
  work: WorkBudget,
): ApproveMappingCommand {
  work.step();
  return approveCommandWithBudget(
    {
      commandId: command.commandId,
      candidateId: command.candidateId,
      candidateDigest: command.candidateDigest,
      expectedRevision: command.expectedRevision,
      proposedBy: command.proposedBy,
      mappingId: command.mappingId,
      leftInstrumentId: command.leftInstrumentId,
      rightInstrumentId: command.rightInstrumentId,
      exposureKey: command.exposureKey,
      effectiveFrom: command.effectiveFrom,
      effectiveTo: command.effectiveTo,
      recordedKnowledgeAt: command.recordedKnowledgeAt,
      registryRevision: command.registryRevision,
      evidenceRevision: command.evidenceRevision,
      reasonText: command.reasonText,
      approvals: command.approvals.map(
        (approval) => (
          work.step(),
          {
            actorId: approval.actorId,
            role: approval.role,
            recordedAt: approval.recordedAt,
          }
        ),
      ),
    },
    work,
  );
}
function evidenceValue(candidate: InstrumentMatchCandidate) {
  return {
    economicsRevisions: [
      candidate.leftEconomicsRevision,
      candidate.rightEconomicsRevision,
    ],
    metadataDigests: [
      candidate.leftMetadataDigest,
      candidate.rightMetadataDigest,
    ],
    metadataRevisions: [
      candidate.leftMetadataRevision,
      candidate.rightMetadataRevision,
    ],
    registryRevision: candidate.registryRevision,
  };
}
function expectedCandidateId(
  candidate: InstrumentMatchCandidate,
  work: WorkBudget,
): string {
  return deterministicId(
    "instrument-match-candidate/v1",
    {
      evidence: evidenceValue(candidate),
      exposureKey: candidate.exposureKey ?? null,
      instruments: [candidate.leftInstrumentId, candidate.rightInstrumentId],
      policy: candidate.policyRevision,
    },
    work,
  );
}
function candidateEvidenceDigest(
  candidate: InstrumentMatchCandidate,
  work: WorkBudget,
): string {
  return sha256(canonicalSerialize(evidenceValue(candidate), work), work);
}
/** Public digest helper: its own operation budget and final check. */
export function candidateProvenanceDigest(
  candidate: InstrumentMatchCandidate,
): string {
  const work = new WorkBudget();
  const result = inputBoundary(() =>
    candidateProvenanceDigestWithBudget(snapshotInput(candidate, work), work),
  );
  work.beforePublication();
  return result;
}
export function candidateProvenanceDigestWithBudget(
  candidate: InstrumentMatchCandidate,
  work: WorkBudget,
): string {
  if (!Array.isArray(candidate.reasons))
    throw new MatchingFailure("INPUT_INVALID", "Candidate reasons invalid.");
  assertCount(candidate.reasons.length, MATCH_REASON_CODES.length, "Reason");
  work.units(candidate.reasons.length + 1);
  return deterministicId(
    "materialized-match-candidate/v1",
    {
      candidateId: candidate.candidateId,
      completeness: candidate.completeness,
      confidence: candidate.confidence,
      createdAt: candidate.createdAt,
      effectiveAt: candidate.effectiveAt,
      evaluationAt: candidate.evaluationAt,
      evidenceSetDigest: candidate.evidenceSetDigest,
      exposureKey: candidate.exposureKey ?? null,
      knowledgeCutoff: candidate.knowledgeCutoff,
      leftEconomicsRevision: candidate.leftEconomicsRevision,
      leftInstrumentId: candidate.leftInstrumentId,
      leftMetadataDigest: candidate.leftMetadataDigest,
      leftMetadataRevision: candidate.leftMetadataRevision,
      policyRevision: candidate.policyRevision,
      proposerId: candidate.proposerId,
      reasons: [...candidate.reasons].sort(compareUtf8WithBudget(work)),
      registryRevision: candidate.registryRevision,
      rightEconomicsRevision: candidate.rightEconomicsRevision,
      rightInstrumentId: candidate.rightInstrumentId,
      rightMetadataDigest: candidate.rightMetadataDigest,
      rightMetadataRevision: candidate.rightMetadataRevision,
    },
    work,
  );
}
function validateApprovals(
  approvals: readonly ReviewApproval[],
  work: WorkBudget,
): void {
  assertCount(approvals.length, 3, "Approval");
  for (const approval of approvals) {
    work.step();
    if (approval === null || typeof approval !== "object")
      throw new MatchingFailure("INPUT_INVALID", "Approval is invalid.");
    assertShape(
      approval,
      ["actorId", "role", "approvedDigest", "recordedAt"],
      [],
      work,
    );
    assertAtomicId(approval.actorId, "Reviewer ID", work);
    assertAtomicId(approval.approvedDigest, "Approval digest", work);
    epoch(approval.recordedAt, work);
  }
}
const CANDIDATE_REQUIRED = [
  "candidateId",
  "leftInstrumentId",
  "rightInstrumentId",
  "leftMetadataRevision",
  "rightMetadataRevision",
  "leftMetadataDigest",
  "rightMetadataDigest",
  "leftEconomicsRevision",
  "rightEconomicsRevision",
  "registryRevision",
  "evidenceSetDigest",
  "proposerId",
  "createdAt",
  "effectiveAt",
  "evaluationAt",
  "knowledgeCutoff",
  "policyRevision",
  "completeness",
  "confidence",
  "reasons",
] as const;
const CANDIDATE_OPTIONAL = ["provisionalIdentity", "exposureKey"] as const;
/**
 * L-03: a caller-supplied candidate snapshot is validated (closed shape,
 * bounded identifiers, closed reason codes, current policy) before it can be
 * compared or echoed in an evaluation result.
 */
export function validateCandidateSnapshot(
  candidate: InstrumentMatchCandidate,
  work: WorkBudget,
): void {
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    !Array.isArray(candidate.reasons)
  )
    throw new MatchingFailure("INPUT_INVALID", "Candidate is malformed.");
  assertShape(candidate, CANDIDATE_REQUIRED, CANDIDATE_OPTIONAL, work);
  assertAtomicId(candidate.candidateId, "Candidate ID", work);
  assertAtomicId(candidate.registryRevision, "Candidate registry", work);
  assertAtomicId(candidate.evidenceSetDigest, "Candidate evidence", work);
  for (const value of [
    candidate.leftMetadataRevision,
    candidate.rightMetadataRevision,
    candidate.leftMetadataDigest,
    candidate.rightMetadataDigest,
    candidate.leftEconomicsRevision,
    candidate.rightEconomicsRevision,
  ]) {
    work.step();
    assertAtomicId(value, "Candidate revision", work);
  }
  assertCompositeId(candidate.leftInstrumentId, work);
  assertCompositeId(candidate.rightInstrumentId, work);
  if (candidate.exposureKey !== undefined)
    assertCompositeId(candidate.exposureKey, work);
  for (const time of [
    candidate.createdAt,
    candidate.effectiveAt,
    candidate.evaluationAt,
    candidate.knowledgeCutoff,
  ])
    epoch(time, work);
  if (candidate.policyRevision !== MATCHING_POLICY_VERSION)
    throw new MatchingFailure("INPUT_INVALID", "Candidate policy invalid.");
  assertCount(candidate.reasons.length, MATCH_REASON_CODES.length, "Reason");
  for (const reason of candidate.reasons) {
    work.step();
    if (!MATCH_REASON_CODES.includes(reason))
      throw new MatchingFailure("INPUT_INVALID", "Candidate reason invalid.");
  }
}
function validateRecord(
  raw: MappingAdmissionRecord,
  work: WorkBudget,
): MappingAdmissionRecord {
  work.step();
  if (
    raw === null ||
    typeof raw !== "object" ||
    raw.mapping === null ||
    typeof raw.mapping !== "object" ||
    raw.candidate === null ||
    typeof raw.candidate !== "object" ||
    raw.review === null ||
    typeof raw.review !== "object" ||
    raw.command === null ||
    typeof raw.command !== "object" ||
    !Array.isArray(raw.mapping.approvals) ||
    !Array.isArray(raw.candidate.reasons) ||
    !Array.isArray(raw.review.approvals) ||
    !Array.isArray(raw.command.approvals)
  )
    throw new MatchingFailure(
      "INPUT_INVALID",
      "Mapping provenance is malformed.",
    );
  assertShape(raw, ["mapping", "candidate", "review", "command"], [], work);
  const { mapping, candidate, review, command } = raw;
  assertShape(
    mapping,
    [
      "mappingId",
      "version",
      "status",
      "leftInstrumentId",
      "rightInstrumentId",
      "exposureKey",
      "effectiveFrom",
      "effectiveTo",
      "recordedKnowledgeAt",
      "registryRevision",
      "evidenceRevision",
      "policyRevision",
      "reasonCode",
      "approvals",
    ],
    ["priorVersion", "supersededBy", "invalidationReference"],
    work,
  );
  assertShape(
    candidate,
    [
      "candidateId",
      "leftInstrumentId",
      "rightInstrumentId",
      "leftMetadataRevision",
      "rightMetadataRevision",
      "leftMetadataDigest",
      "rightMetadataDigest",
      "leftEconomicsRevision",
      "rightEconomicsRevision",
      "registryRevision",
      "evidenceSetDigest",
      "proposerId",
      "createdAt",
      "effectiveAt",
      "evaluationAt",
      "knowledgeCutoff",
      "policyRevision",
      "completeness",
      "confidence",
      "reasons",
    ],
    ["provisionalIdentity", "exposureKey"],
    work,
  );
  assertShape(
    review,
    [
      "reviewId",
      "candidateId",
      "proposerId",
      "commandDigest",
      "expectedRevision",
      "approvals",
      "recordedAt",
    ],
    [],
    work,
  );
  validateApprovals(mapping.approvals, work);
  validateApprovals(review.approvals, work);
  validateApprovals(command.approvals, work);
  assertAtomicId(mapping.mappingId, "Mapping ID", work);
  assertAtomicId(mapping.registryRevision, "Registry revision", work);
  assertAtomicId(mapping.evidenceRevision, "Evidence revision", work);
  assertAtomicId(candidate.candidateId, "Candidate ID", work);
  assertAtomicId(
    candidate.registryRevision,
    "Candidate registry revision",
    work,
  );
  assertAtomicId(
    candidate.evidenceSetDigest,
    "Candidate evidence digest",
    work,
  );
  assertAtomicId(review.reviewId, "Review ID", work);
  assertAtomicId(review.candidateId, "Review candidate ID", work);
  assertAtomicId(review.proposerId, "Review proposer ID", work);
  assertAtomicId(review.commandDigest, "Review command digest", work);
  assertCompositeId(mapping.leftInstrumentId, work);
  assertCompositeId(mapping.rightInstrumentId, work);
  assertCompositeId(mapping.exposureKey, work);
  if (!Number.isSafeInteger(mapping.version) || mapping.version < 1)
    throw new MatchingFailure(
      "MAPPING_REVISION_CONFLICT",
      "Mapping version is invalid.",
    );
  if (
    mapping.policyRevision !== MATCHING_POLICY_VERSION ||
    candidate.policyRevision !== MATCHING_POLICY_VERSION
  )
    throw new MatchingFailure(
      "MAPPING_REVISION_CONFLICT",
      "Policy revision mismatch.",
    );
  if (!MATCH_REASON_CODES.includes(mapping.reasonCode))
    throw new MatchingFailure("INPUT_INVALID", "Mapping reason is invalid.");
  for (const reason of candidate.reasons) {
    work.step();
    if (!MATCH_REASON_CODES.includes(reason))
      throw new MatchingFailure(
        "INPUT_INVALID",
        "Candidate reason is invalid.",
      );
  }
  const expected = expectedCommand(command, work);
  // Both sides of every comparison below are validated and bounded first;
  // each equality pass is charged before it runs (acceptance-5 H-03).
  const same = (left: unknown, right: unknown) => sameText(left, right, work);
  if (
    !same(expected.commandDigest, command.commandDigest) ||
    !approvalsEqual(expected.approvals, command.approvals, work)
  )
    throw new MatchingFailure(
      "COMMAND_DIGEST_CONFLICT",
      "Command digest mismatch.",
    );
  if (
    !same(
      candidate.evidenceSetDigest,
      candidateEvidenceDigest(candidate, work),
    ) ||
    !same(candidate.candidateId, expectedCandidateId(candidate, work)) ||
    !same(command.candidateId, candidate.candidateId) ||
    !same(
      command.candidateDigest,
      candidateProvenanceDigestWithBudget(candidate, work),
    )
  )
    throw new MatchingFailure(
      "COMMAND_DIGEST_CONFLICT",
      "Candidate provenance mismatch.",
    );
  if (
    !same(command.mappingId, mapping.mappingId) ||
    command.expectedRevision !== mapping.version - 1 ||
    !same(command.leftInstrumentId, mapping.leftInstrumentId) ||
    !same(command.rightInstrumentId, mapping.rightInstrumentId) ||
    !same(command.exposureKey, mapping.exposureKey) ||
    !same(command.effectiveFrom, mapping.effectiveFrom) ||
    !same(command.effectiveTo, mapping.effectiveTo) ||
    !same(command.recordedKnowledgeAt, mapping.recordedKnowledgeAt) ||
    !same(command.registryRevision, mapping.registryRevision) ||
    !same(command.evidenceRevision, mapping.evidenceRevision)
  )
    throw new MatchingFailure(
      "MAPPING_REVISION_CONFLICT",
      "Mapping command mismatch.",
    );
  if (
    !same(review.candidateId, candidate.candidateId) ||
    !same(review.proposerId, command.proposedBy) ||
    !same(review.commandDigest, command.commandDigest) ||
    review.expectedRevision !== command.expectedRevision
  )
    throw new MatchingFailure(
      "MAPPING_UNAPPROVED",
      "Review provenance mismatch.",
    );
  if (
    !approvalsEqual(review.approvals, command.approvals, work) ||
    !approvalsEqual(mapping.approvals, command.approvals, work)
  )
    throw new MatchingFailure(
      "COMMAND_DIGEST_CONFLICT",
      "Approval digest mismatch.",
    );
  const quant = review.approvals.filter(
    (approval) => (work.step(), approval.role === "QUANT_REVIEWER"),
  );
  const marketData = review.approvals.filter(
    (approval) => (work.step(), approval.role === "MARKET_DATA_REVIEWER"),
  );
  if (
    quant.length !== 1 ||
    marketData.length !== 1 ||
    new Set([
      chargeKey(review.proposerId, work),
      chargeKey(quant[0]!.actorId, work),
      chargeKey(marketData[0]!.actorId, work),
    ]).size !== 3
  )
    throw new MatchingFailure(
      "REVIEWER_SEPARATION_REQUIRED",
      "Independent reviewers required.",
    );
  if (
    candidate.completeness !== "COMPLETE_APPROVED" ||
    candidate.exposureKey === undefined ||
    candidate.reasons.length !== 0
  )
    throw new MatchingFailure("MAPPING_UNAPPROVED", "Candidate is incomplete.");
  if (
    !same(candidate.leftInstrumentId, mapping.leftInstrumentId) ||
    !same(candidate.rightInstrumentId, mapping.rightInstrumentId) ||
    !same(candidate.exposureKey, mapping.exposureKey) ||
    !same(candidate.registryRevision, mapping.registryRevision) ||
    !same(candidate.evidenceSetDigest, mapping.evidenceRevision)
  )
    throw new MatchingFailure(
      "DUPLICATE_EXPOSURE_CONFLICT",
      "Candidate identity mismatch.",
    );
  epoch(review.recordedAt, work);
  isEffective(
    mapping.effectiveFrom,
    mapping.effectiveTo,
    mapping.effectiveFrom,
    work,
  );
  if (mapping.status !== "APPROVED")
    throw new MatchingFailure(
      "COMMAND_DIGEST_CONFLICT",
      "Approved mapping records are immutable; transitions are append-only.",
    );
  if (mapping.reasonCode !== "COMPATIBLE_APPROVED")
    throw new MatchingFailure(
      "MAPPING_UNAPPROVED",
      "Approved mapping reason is invalid.",
    );
  if (
    mapping.supersededBy !== undefined ||
    mapping.invalidationReference !== undefined
  )
    throw new MatchingFailure(
      "COMMAND_DIGEST_CONFLICT",
      "Approved mapping record contains mutable transition fields.",
    );
  return Object.freeze({
    mapping: immutableMapping(mapping, work),
    candidate: immutableCandidate(candidate, work),
    review: immutableReview(review, work),
    command: immutableCommand(command, work),
  });
}
function recordDigest(
  record: MappingAdmissionRecord,
  work: WorkBudget,
): string {
  return deterministicId(
    "admitted-mapping-version/v1",
    {
      candidateDigest: candidateProvenanceDigestWithBudget(
        record.candidate,
        work,
      ),
      commandDigest: record.command.commandDigest,
      mapping: {
        approvals: record.mapping.approvals.map(
          (item) => (
            work.step(),
            // work: bounded rope; flattened by the charged canonical encoder.
            `${item.role}:${item.actorId}:${item.approvedDigest}:${item.recordedAt}`
          ),
        ),
        effectiveFrom: record.mapping.effectiveFrom,
        effectiveTo: record.mapping.effectiveTo,
        evidenceRevision: record.mapping.evidenceRevision,
        exposureKey: record.mapping.exposureKey,
        invalidationReference: record.mapping.invalidationReference ?? null,
        mappingId: record.mapping.mappingId,
        policyRevision: record.mapping.policyRevision,
        priorVersion:
          record.mapping.priorVersion === undefined
            ? null
            : String(record.mapping.priorVersion),
        recordedKnowledgeAt: record.mapping.recordedKnowledgeAt,
        registryRevision: record.mapping.registryRevision,
        status: record.mapping.status,
        supersededBy:
          record.mapping.supersededBy === undefined
            ? null
            : String(record.mapping.supersededBy),
        version: String(record.mapping.version),
      },
      reviewDigest: deterministicId(
        "mapping-review/v1",
        {
          approvals: record.review.approvals.map(
            (item) => (
              work.step(),
              // work: bounded rope; flattened by the charged canonical encoder.
              `${item.role}:${item.actorId}:${item.approvedDigest}:${item.recordedAt}`
            ),
          ),
          candidateId: record.review.candidateId,
          commandDigest: record.review.commandDigest,
          expectedRevision: String(record.review.expectedRevision),
          proposerId: record.review.proposerId,
          recordedAt: record.review.recordedAt,
          reviewId: record.review.reviewId,
        },
        work,
      ),
    },
    work,
  );
}
function validateBaseHistory(
  records: readonly MappingAdmissionRecord[],
  work: WorkBudget,
): void {
  const first = records[0]!.mapping;
  const same = (left: unknown, right: unknown) => sameText(left, right, work);
  for (let index = 0; index < records.length; index += 1) {
    work.step();
    const current = records[index]!.mapping,
      previous = records[index - 1]?.mapping;
    if (
      !same(current.mappingId, first.mappingId) ||
      current.version !== index + 1
    )
      throw new MatchingFailure(
        "MAPPING_REVISION_CONFLICT",
        "History version continuity failed.",
      );
    if (
      !same(current.leftInstrumentId, first.leftInstrumentId) ||
      !same(current.rightInstrumentId, first.rightInstrumentId) ||
      !same(current.exposureKey, first.exposureKey)
    )
      throw new MatchingFailure(
        "DUPLICATE_EXPOSURE_CONFLICT",
        "History identity changed.",
      );
    if (
      (previous === undefined && current.priorVersion !== undefined) ||
      (previous !== undefined && current.priorVersion !== previous.version)
    )
      throw new MatchingFailure(
        "MAPPING_REVISION_CONFLICT",
        "History prior-version linkage failed.",
      );
  }
}

function validateTransitionShape(
  value: MappingTransitionRecord,
  work: WorkBudget,
): void {
  if (
    value === null ||
    typeof value !== "object" ||
    !Array.isArray(value.approvals)
  )
    throw new MatchingFailure("INPUT_INVALID", "Transition is malformed.");
  assertShape(
    value,
    [
      "transitionId",
      "mappingId",
      "affectedVersion",
      "transitionType",
      "effectiveAt",
      "reasonCode",
      "policyRevision",
      "expectedRevision",
      "expectedState",
      "proposerId",
      "registryRevision",
      "evidenceRevision",
      "provenanceDigest",
      "recordedKnowledgeAt",
      "approvals",
      "commandDigest",
    ],
    ["successorVersion", "reference", "reasonText"],
    work,
  );
  validateApprovals(value.approvals, work);
}

function validateTransitionGraph(
  records: readonly MappingAdmissionRecord[],
  rawTransitions: readonly MappingTransitionRecord[],
  work: WorkBudget,
): readonly MappingTransitionRecord[] {
  assertCount(
    rawTransitions.length,
    MATCHING_LIMITS.mappingEventRecords,
    "Mapping transition",
  );
  const byVersion = new Map<number, MappingAdmissionRecord>();
  for (const record of records) {
    work.step();
    byVersion.set(record.mapping.version, record);
  }
  // Bound every transition ID before it is compared, sorted or hashed.
  for (const raw of rawTransitions) {
    work.step();
    if (raw === null || typeof raw !== "object")
      throw new MatchingFailure("INPUT_INVALID", "Transition is malformed.");
    assertAtomicId(raw.transitionId, "Transition ID", work);
    if (!Number.isSafeInteger(raw.affectedVersion))
      throw new MatchingFailure(
        "MAPPING_REVISION_CONFLICT",
        "Affected version invalid.",
      );
  }
  work.units(rawTransitions.length + 1);
  const ordered = [...rawTransitions].sort((left, right) => {
    work.step();
    return (
      left.affectedVersion - right.affectedVersion ||
      compareUtf8WithBudget(work)(left.transitionId, right.transitionId)
    );
  });
  const transitions: MappingTransitionRecord[] = [];
  const terminal = new Set<number>();
  const successorClaims = new Map<number, number>();
  const transitionIds = new Set<string>();
  for (const raw of ordered) {
    work.step();
    validateTransitionShape(raw, work);
    if (transitionIds.has(chargeKey(raw.transitionId, work)))
      throw new MatchingFailure("TRANSITION_REJECTED", "Duplicate transition.");
    transitionIds.add(chargeKey(raw.transitionId, work));
    const target = byVersion.get(raw.affectedVersion);
    if (!target || !sameText(raw.mappingId, target.mapping.mappingId, work))
      throw new MatchingFailure(
        "TRANSITION_REJECTED",
        "Transition target missing.",
      );
    const transition = validateTransitionRecord(
      raw,
      target.mapping,
      target.command.commandDigest,
      work,
    );
    if (terminal.has(transition.affectedVersion))
      throw new MatchingFailure(
        "TRANSITION_REJECTED",
        "Terminal mapping has another transition.",
      );
    if (transition.transitionType === "INVALIDATE") {
      terminal.add(transition.affectedVersion);
    } else {
      const successor = transition.successorVersion;
      if (
        successor === undefined ||
        successor !== transition.affectedVersion + 1 ||
        !byVersion.has(successor)
      )
        throw new MatchingFailure(
          "MAPPING_REVISION_CONFLICT",
          "Transition successor linkage is invalid.",
        );
      if (successorClaims.has(transition.affectedVersion))
        throw new MatchingFailure(
          "TRANSITION_REJECTED",
          "Mapping has multiple successors.",
        );
      successorClaims.set(transition.affectedVersion, successor);
      terminal.add(transition.affectedVersion);
    }
    transitions.push(transition);
  }
  for (let version = 1; version < records.length; version += 1) {
    work.step();
    if (successorClaims.get(version) !== version + 1)
      throw new MatchingFailure(
        "TRANSITION_REJECTED",
        "Every successor version requires an approved transition.",
      );
  }
  return Object.freeze(transitions);
}

function transitionForVersion(
  transitions: readonly MappingTransitionRecord[],
  version: number,
  evaluationAt: Timestamp,
  work: WorkBudget,
): MappingTransitionRecord | undefined {
  let selected: MappingTransitionRecord | undefined;
  for (const transition of transitions) {
    work.step();
    if (
      transition.affectedVersion === version &&
      epoch(transition.recordedKnowledgeAt, work) <=
        epoch(evaluationAt, work) &&
      epoch(transition.effectiveAt, work) <= epoch(evaluationAt, work)
    )
      selected = transition;
  }
  return selected;
}
function materializeHistory(
  records: readonly MappingAdmissionRecord[],
  transitions: readonly MappingTransitionRecord[],
  work: WorkBudget,
): MaterializedHistory {
  const digests = records.map(
    (record) => (work.step(), recordDigest(record, work)),
  );
  const versions = Object.freeze(
    records.map((record) => (work.step(), record.mapping)),
  );
  const transitionDigests = transitions.map(
    (transition) => (work.step(), transitionDigest(transition, work)),
  );
  const immutableTransitions = Object.freeze(
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
  const result = Object.freeze({
    mappingId: versions[0]!.mappingId,
    digest: deterministicId(
      "admitted-mapping-history/v1",
      { transitions: transitionDigests, versions: digests },
      work,
    ),
    versions,
    transitions: immutableTransitions,
    current: versions.at(-1)!,
    records: (work.step(records.length), Object.freeze([...records])),
  }) as MaterializedHistory;
  admittedHistories.add(result);
  return result;
}
/**
 * Public standalone admission. The operation budget is always created here;
 * a caller cannot supply budget authority (acceptance-5 M-02). Every typed
 * outcome, VALID or not, passes the final cancellation check.
 */
export function admitMaterializedMapping(
  input: MappingAdmissionInput,
  evaluationAt: Timestamp,
  signal?: CancellationSignal,
): MappingAdmissionResult {
  const work = new WorkBudget(signal);
  const result = admitWithBudget(input, evaluationAt, work);
  work.beforePublication();
  return result;
}
/** Internal: admission on a parent operation's budget (it checks later). */
export function admitMaterializedMappingWithBudget(
  input: MappingAdmissionInput,
  evaluationAt: Timestamp,
  work: WorkBudget,
): MappingAdmissionResult {
  return admitWithBudget(input, evaluationAt, work);
}
function admitWithBudget(
  callerInput: MappingAdmissionInput,
  evaluationAt: Timestamp,
  work: WorkBudget,
): MappingAdmissionResult {
  try {
    work.step();
    // N-01: every later read uses this one passive frozen snapshot.
    const input = snapshotInput(callerInput, work);
    // H-04: a malformed evaluation time is a typed invalid interval.
    epoch(evaluationAt, work);
    if (
      input === null ||
      typeof input !== "object" ||
      !Array.isArray(input.history) ||
      !Array.isArray(input.transitions)
    )
      return failure("INVALID_PROVENANCE", "INPUT_INVALID");
    assertShape(
      input,
      ["mapping", "candidate", "review", "command", "history", "transitions"],
      [],
      work,
    );
    if (input.mapping.status === "QUARANTINED")
      return failure("QUARANTINED", "MAPPING_QUARANTINED");
    if (input.mapping.status === "CONFLICT")
      return failure("CONFLICTING", "MAPPING_QUARANTINED");
    assertCount(
      input.history.length,
      MATCHING_LIMITS.mappingVersionsPerMapping,
      "Mapping history",
    );
    if (input.history.length === 0)
      return failure("INVALID_PROVENANCE", "INPUT_INVALID");
    work.units(input.history.length + 1);
    const orderedRaw = [...input.history].sort(
      (left, right) => (
        work.step(),
        left.mapping.version - right.mapping.version
      ),
    );
    const records: MappingAdmissionRecord[] = [];
    for (const raw of orderedRaw) {
      work.step();
      records.push(validateRecord(raw, work));
    }
    validateBaseHistory(records, work);
    const transitions = validateTransitionGraph(
      records,
      input.transitions,
      work,
    );
    const inputRecord = validateRecord(
        {
          mapping: input.mapping,
          candidate: input.candidate,
          review: input.review,
          command: input.command,
        },
        work,
      ),
      requested = records.find((record) => {
        work.step();
        return record.mapping.version === inputRecord.mapping.version;
      });
    if (
      requested === undefined ||
      !sameText(
        recordDigest(inputRecord, work),
        recordDigest(requested, work),
        work,
      )
    )
      return failure("REVISION_MISMATCH", "MAPPING_REVISION_CONFLICT");
    const history = materializeHistory(
      Object.freeze(records),
      transitions,
      work,
    );
    const { mapping, candidate, review } = requested;
    const common = { mapping, candidate, review, history };
    const transition = transitionForVersion(
      transitions,
      mapping.version,
      evaluationAt,
      work,
    );
    if (
      transition?.transitionType === "SUPERSEDE" ||
      transition?.transitionType === "CORRECT"
    )
      return Object.freeze({
        state: "SUPERSEDED",
        reason: "MAPPING_SUPERSEDED",
        // work: fixed-shape internal record (four admitted references).
        ...common,
      });
    if (transition?.transitionType === "INVALIDATE")
      return Object.freeze({
        state: "INVALIDATED",
        reason: "MAPPING_INVALIDATED",
        // work: fixed-shape internal record (four admitted references).
        ...common,
      });
    if (
      !isEffective(
        mapping.effectiveFrom,
        mapping.effectiveTo,
        evaluationAt,
        work,
      )
    )
      return failure("INVALID_INTERVAL", "MAPPING_EXPIRED");
    return Object.freeze({
      state: "VALID" as const,
      reason: "COMPATIBLE_APPROVED" as const,
      // work: fixed-shape internal record (four admitted references).
      ...common,
    });
  } catch (caught) {
    // L-04: malformed caller shapes become the typed INPUT_INVALID outcome.
    const error =
      caught instanceof TypeError || caught instanceof RangeError
        ? new MatchingFailure("INPUT_INVALID", "Malformed input.")
        : caught;
    if (!(error instanceof MatchingFailure)) throw error;
    if (
      error.code === "EVALUATION_CANCELLED" ||
      error.code === "MATCHING_BOUND_EXCEEDED"
    )
      throw error;
    if (error.code === "COMMAND_DIGEST_CONFLICT")
      return failure("DIGEST_MISMATCH", error.code);
    if (error.code === "MAPPING_REVISION_CONFLICT")
      return failure("REVISION_MISMATCH", error.code);
    if (error.code === "REVIEWER_SEPARATION_REQUIRED")
      return failure("REVIEWER_SEPARATION_FAILURE", error.code);
    if (error.code === "EVIDENCE_TIME_INVALID")
      return failure("INVALID_INTERVAL", error.code);
    if (
      [
        "MAPPING_INTERVAL_CONFLICT",
        "DUPLICATE_EXPOSURE_CONFLICT",
        "TRANSITION_REJECTED",
      ].includes(error.code)
    )
      return failure("CONFLICTING", error.code);
    return failure("INVALID_PROVENANCE", error.code);
  }
}
