import type { Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertCount,
  assertOutputBound,
  type CancellationSignal,
} from "./bounds.js";
import {
  admitMaterializedMapping,
  type MappingAdmissionInput,
  type MappingAdmissionResult,
} from "./admission.js";
import { classifyProductScope, resolveExposureIdentity } from "./candidates.js";
import { compareEconomics, economicsAvailability } from "./economics.js";
import type {
  InstrumentMatchCandidate,
  MappingVersion,
  MatchEvaluation,
  MatchOutcome,
  VenueInstrumentEvidence,
} from "./model.js";
import { MATCHING_LIMITS, MATCHING_POLICY_VERSION } from "./policy.js";
import { CuratedAssetRegistry, epoch, isEffective } from "./registry.js";
import { MatchingFailure, type MatchReasonCode } from "./reasons.js";
import {
  canonicalExposureKey,
  canonicalSerialize,
  compareUtf8WithBudget,
  deterministicId,
} from "./serialization.js";
import { validateVenueInstrumentEvidence } from "./validation.js";

function freshness(
  item: VenueInstrumentEvidence,
  at: Timestamp,
  work: WorkBudget,
): MatchReasonCode | undefined {
  const age = epoch(at, work) - epoch(item.metadata.metadataObservedAt, work);
  if (age < 0n) return "EVIDENCE_TIME_INVALID";
  if (age > MATCHING_LIMITS.metadataAgeMs) return "EVIDENCE_STALE";
  if (item.metadata.context.quality !== "HEALTHY")
    return "CAPABILITY_UNAVAILABLE";
  if (item.metadata.lifecycle === "UNKNOWN") return "LIFECYCLE_UNKNOWN";
  return item.metadata.lifecycle === "ACTIVE"
    ? undefined
    : "LIFECYCLE_NOT_ACTIVE";
}
function mappingGate(
  admission: MappingAdmissionResult | undefined,
): { outcome: MatchOutcome; reason: MatchReasonCode } | undefined {
  if (!admission)
    return { outcome: "UNAVAILABLE", reason: "MAPPING_UNAPPROVED" };
  if (admission.state === "VALID") return undefined;
  if (admission.state === "CONFLICTING" || admission.state === "QUARANTINED")
    return { outcome: "QUARANTINED", reason: "MAPPING_QUARANTINED" };
  if (admission.state === "REVIEWER_SEPARATION_FAILURE")
    return { outcome: "QUARANTINED", reason: "REVIEWER_SEPARATION_REQUIRED" };
  return { outcome: "UNAVAILABLE", reason: admission.reason };
}
function result(
  outcome: MatchOutcome,
  reasons: readonly MatchReasonCode[],
  left: VenueInstrumentEvidence,
  right: VenueInstrumentEvidence,
  registry: CuratedAssetRegistry,
  at: Timestamp,
  cutoff: Timestamp,
  candidate?: InstrumentMatchCandidate,
  mapping?: MappingVersion,
  work?: WorkBudget,
): MatchEvaluation {
  const ordered = [...new Set(reasons)].sort(compareUtf8WithBudget(work));
  const legs = [left, right].sort((a, b) => {
    return compareUtf8WithBudget(work)(
      a.metadata.instrumentId,
      b.metadata.instrumentId,
    );
  });
  return Object.freeze({
    resultId: deterministicId(
      "instrument-match-result/v1",
      {
        at,
        cutoff,
        legs: legs.map(
          (leg) => (
            work?.step(),
            {
              id: leg.metadata.instrumentId,
              metadata: leg.metadataRevision,
              economics: leg.economics.evidenceRevision,
            }
          ),
        ),
        mapping: mapping ? `${mapping.mappingId}:${mapping.version}` : null,
        outcome,
        reasons: ordered,
        registry: registry.revision.revision,
      },
      work,
    ),
    outcome,
    reasons: Object.freeze(ordered),
    candidate,
    mappingVersion: mapping,
    registryRevision: registry.revision.revision,
    evidenceRevisions: [
      legs[0]!.economics.evidenceRevision,
      legs[1]!.economics.evidenceRevision,
    ] as const,
    policyRevision: MATCHING_POLICY_VERSION,
    evaluationAt: at,
    knowledgeCutoff: cutoff,
  });
}
export interface MatchEvaluationInput {
  readonly left: VenueInstrumentEvidence;
  readonly right: VenueInstrumentEvidence;
  readonly registry: CuratedAssetRegistry;
  readonly evaluationAt: Timestamp;
  readonly knowledgeCutoff: Timestamp;
  readonly candidate?: InstrumentMatchCandidate;
  readonly mapping?: MappingAdmissionInput;
  readonly signal?: CancellationSignal;
}

function evaluateMatchWithBudget(
  input: MatchEvaluationInput,
  work: WorkBudget,
): MatchEvaluation {
  const {
    left,
    right,
    registry,
    evaluationAt: at,
    knowledgeCutoff: cutoff,
    candidate,
    mapping,
  } = input;
  const emit = (
    outcome: MatchOutcome,
    reasons: readonly MatchReasonCode[],
    emittedCandidate?: InstrumentMatchCandidate,
    emittedMapping?: MappingVersion,
  ) =>
    result(
      outcome,
      reasons,
      left,
      right,
      registry,
      at,
      cutoff,
      emittedCandidate,
      emittedMapping,
      work,
    );
  work.step();
  validateVenueInstrumentEvidence(left, work);
  validateVenueInstrumentEvidence(right, work);
  if (left.metadata.venue === right.metadata.venue)
    return emit("NOT_MATCHED", ["SAME_VENUE_EXCLUDED"], candidate, undefined);
  const scopeReasons = [
    classifyProductScope(left),
    classifyProductScope(right),
  ].filter((v): v is MatchReasonCode => v !== undefined);
  if (scopeReasons.length)
    return emit("NOT_MATCHED", scopeReasons, candidate, undefined);
  const l = resolveExposureIdentity(left, registry, at, cutoff, work),
    r = resolveExposureIdentity(right, registry, at, cutoff, work),
    identityReasons = [...l.reasons, ...r.reasons].filter((reason) =>
      ["ASSET_BINDING_CONFLICT", "ASSET_IDENTITY_UNKNOWN"].includes(reason),
    );
  if (identityReasons.includes("ASSET_BINDING_CONFLICT"))
    return emit("QUARANTINED", identityReasons, candidate, undefined);
  if (identityReasons.length)
    return emit("AMBIGUOUS", identityReasons, candidate, undefined);
  if (l.provisionalIdentity!.baseAssetId !== r.provisionalIdentity!.baseAssetId)
    return emit("NOT_MATCHED", ["BASE_ASSET_MISMATCH"], candidate, undefined);
  if (
    l.provisionalIdentity!.settlementAssetId !==
    r.provisionalIdentity!.settlementAssetId
  )
    return emit(
      "NOT_MATCHED",
      ["SETTLEMENT_ASSET_MISMATCH"],
      candidate,
      undefined,
    );
  if (
    l.provisionalIdentity!.quoteAssetId !== r.provisionalIdentity!.quoteAssetId
  )
    return emit("NOT_MATCHED", ["QUOTE_ASSET_MISMATCH"], candidate, undefined);
  if (
    l.provisionalIdentity!.quoteAssetId !==
      l.provisionalIdentity!.settlementAssetId ||
    r.provisionalIdentity!.quoteAssetId !==
      r.provisionalIdentity!.settlementAssetId
  )
    return emit(
      "NOT_MATCHED",
      ["QUOTE_SETTLEMENT_MISMATCH"],
      candidate,
      undefined,
    );
  const unavailable = [
    ...economicsAvailability(left.metadata, left.economics),
    ...economicsAvailability(right.metadata, right.economics),
  ];
  if (unavailable.length)
    return emit("UNAVAILABLE", unavailable, candidate, undefined);
  try {
    const economic = compareEconomics(
      left.metadata,
      left.economics,
      right.metadata,
      right.economics,
    );
    if (economic !== "COMPATIBLE_APPROVED")
      return emit("NOT_MATCHED", [economic], candidate, undefined);
  } catch (error) {
    if (error instanceof MatchingFailure)
      return emit(
        error.code === "METADATA_EVIDENCE_CONFLICT"
          ? "QUARANTINED"
          : "UNAVAILABLE",
        [error.code],
        candidate,
        undefined,
      );
    throw error;
  }
  const fresh = [freshness(left, at, work), freshness(right, at, work)].filter(
    (v): v is MatchReasonCode => v !== undefined,
  );
  if (fresh.length) return emit("UNAVAILABLE", fresh, candidate, undefined);
  const admission = mapping
    ? admitMaterializedMapping(mapping, at, undefined, work)
    : undefined;
  const admittedMapping =
    admission?.state === "VALID" ? admission.mapping : undefined;
  const admittedCandidate =
    admission?.state === "VALID" ? admission.candidate : undefined;
  if (
    admittedCandidate &&
    candidate &&
    (candidate.candidateId !== admittedCandidate.candidateId ||
      candidate.completeness !== "COMPLETE_APPROVED")
  )
    return emit(
      "UNAVAILABLE",
      ["MAPPING_UNAPPROVED"],
      candidate,
      admittedMapping,
    );
  if (admittedMapping) {
    const expectedLegs = [left, right].sort((a, b) =>
      compareUtf8WithBudget(work)(
        a.metadata.instrumentId,
        b.metadata.instrumentId,
      ),
    );
    const expectedPair = expectedLegs.map((leg) => leg.metadata.instrumentId);
    const mappingPair = [
      admittedMapping.leftInstrumentId,
      admittedMapping.rightInstrumentId,
    ].sort(compareUtf8WithBudget(work));
    if (
      expectedPair[0] !== mappingPair[0] ||
      expectedPair[1] !== mappingPair[1] ||
      admittedMapping.exposureKey !== canonicalExposureKey(l.identity!, work) ||
      admittedMapping.registryRevision !== registry.revision.revision ||
      admittedCandidate === undefined ||
      admittedCandidate.leftMetadataRevision !==
        expectedLegs[0]!.metadataRevision ||
      admittedCandidate.rightMetadataRevision !==
        expectedLegs[1]!.metadataRevision ||
      admittedCandidate.leftMetadataDigest !==
        expectedLegs[0]!.metadataDigest ||
      admittedCandidate.rightMetadataDigest !==
        expectedLegs[1]!.metadataDigest ||
      admittedCandidate.leftEconomicsRevision !==
        expectedLegs[0]!.economics.evidenceRevision ||
      admittedCandidate.rightEconomicsRevision !==
        expectedLegs[1]!.economics.evidenceRevision
    )
      return emit(
        "QUARANTINED",
        ["DUPLICATE_EXPOSURE_CONFLICT"],
        admittedCandidate ?? candidate,
        admittedMapping,
      );
  }
  const gate = mappingGate(admission);
  if (gate)
    return emit(
      gate.outcome,
      [gate.reason],
      admittedCandidate ?? candidate,
      admittedMapping,
    );
  return emit(
    "MATCHED",
    ["COMPATIBLE_APPROVED"],
    admittedCandidate ?? candidate,
    admittedMapping,
  );
}
export function evaluateMatch(input: MatchEvaluationInput): MatchEvaluation {
  const work = new WorkBudget(input.signal);
  const value = evaluateMatchWithBudget(input, work);
  work.beforePublication();
  return value;
}
export function evaluateBatch(
  inputs: readonly MatchEvaluationInput[],
  signal?: CancellationSignal,
): readonly MatchEvaluation[] {
  assertCount(inputs.length, MATCHING_LIMITS.candidatePairs, "Evaluation");
  const work = new WorkBudget(signal);
  const staged: MatchEvaluation[] = [];
  for (const input of inputs) {
    work.step();
    staged.push(evaluateMatchWithBudget(input, work));
  }
  const conflicts = staged.filter((v) => {
    work.step();
    return v.outcome === "QUARANTINED";
  }).length;
  assertCount(conflicts, MATCHING_LIMITS.conflicts, "Conflict");
  const serialized = canonicalSerialize(
    staged.map((v) => {
      work.step();
      return { id: v.resultId, outcome: v.outcome, reasons: v.reasons };
    }),
    work,
  );
  assertOutputBound(serialized, work);
  // Freeze (and charge) the staged batch before the final cancellation check.
  work.units(staged.length + 1);
  const published = Object.freeze(staged);
  work.beforePublication();
  return published;
}
