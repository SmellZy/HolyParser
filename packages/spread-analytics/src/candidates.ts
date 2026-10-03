import type { CanonicalAssetId, Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertCount,
  chargeKey,
  sameText,
  type CancellationSignal,
} from "./bounds.js";
import type {
  InstrumentMatchCandidate,
  ProvisionalExposureIdentity,
  ResolvedInstrument,
  VenueInstrumentEvidence,
  BindingRole,
} from "./model.js";
import { immutableCandidate } from "./immutable.js";
import {
  MATCHING_LIMITS,
  MATCHING_POLICY_VERSION,
  isSpecialNativeFamily,
} from "./policy.js";
import { CuratedAssetRegistry, resolveWithBudget } from "./registry.js";
import { MatchingFailure, type MatchReasonCode } from "./reasons.js";
import {
  canonicalExposureKeyWithBudget,
  canonicalSerialize,
  compareUtf8WithBudget,
  deterministicId,
  sha256,
} from "./serialization.js";
import { validateVenueInstrumentEvidence } from "./validation.js";
import { epoch } from "./time.js";

export function classifyProductScope(
  item: VenueInstrumentEvidence,
): MatchReasonCode | undefined {
  if (isSpecialNativeFamily(item.economics.nativeFamily))
    return "SPECIAL_PRODUCT_EXCLUDED";
  if (item.metadata.marketType === "SPOT") return "SPOT_DERIVATIVE_MISMATCH";
  if (item.metadata.contractType.state !== "KNOWN")
    return "PRODUCT_ENUM_UNVERIFIED";
  if (item.metadata.contractType.value === "DATED_FUTURE")
    return "DATED_PRODUCT_EXCLUDED";
  if (
    item.metadata.marketType !== "PERPETUAL" ||
    item.metadata.contractType.value !== "PERPETUAL"
  )
    return "PRODUCT_UNSUPPORTED";
  return undefined;
}

function role(
  registry: CuratedAssetRegistry,
  instrument: VenueInstrumentEvidence,
  kind: BindingRole,
  ref: string,
  at: Timestamp,
  cutoff: Timestamp,
  work: WorkBudget,
): {
  asset?: CanonicalAssetId;
  confidence?: "EXACT_METADATA" | "REVIEWED_MANUAL";
  reason?: MatchReasonCode;
} {
  const value = resolveWithBudget(
    registry,
    instrument.metadata.venue,
    instrument.metadata.productGroup,
    ref,
    kind,
    at,
    cutoff,
    work,
  );
  return value.state === "KNOWN"
    ? { asset: value.assetId, confidence: value.confidence }
    : {
        reason:
          value.state === "CONFLICT"
            ? "ASSET_BINDING_CONFLICT"
            : "ASSET_IDENTITY_UNKNOWN",
      };
}
export function resolveExposureIdentity(
  instrument: VenueInstrumentEvidence,
  registry: CuratedAssetRegistry,
  at: Timestamp,
  cutoff: Timestamp,
  work: WorkBudget,
): ResolvedInstrument {
  work.step();
  const base = role(
    registry,
    instrument,
    "BASE",
    instrument.nativeBaseAssetReference,
    at,
    cutoff,
    work,
  );
  const quote = role(
    registry,
    instrument,
    "QUOTE",
    instrument.nativeQuoteAssetReference,
    at,
    cutoff,
    work,
  );
  const settle = role(
    registry,
    instrument,
    "SETTLEMENT",
    instrument.nativeSettlementAssetReference,
    at,
    cutoff,
    work,
  );
  const reasons = [base.reason, settle.reason, quote.reason].filter(
    (v): v is MatchReasonCode => v !== undefined,
  );
  if (reasons.length) return { instrument, reasons: Object.freeze(reasons) };
  const scopeReason = classifyProductScope(instrument);
  const provisionalIdentity = Object.freeze({
    baseAssetId: base.asset!,
    quoteAssetId: quote.asset!,
    settlementAssetId: settle.asset!,
    ...(scopeReason === undefined
      ? {
          productClass: "DERIVATIVE" as const,
          contractType: "PERPETUAL" as const,
        }
      : {}),
  });
  const economicsReasons: MatchReasonCode[] = scopeReason ? [scopeReason] : [];
  const multiplier = instrument.economics.baseUnitsPerNativeQuantity;
  const metadataMultiplier = instrument.metadata.contractMultiplier;
  if (multiplier.state !== "KNOWN" || metadataMultiplier.state !== "KNOWN")
    economicsReasons.push("MULTIPLIER_UNKNOWN");
  else if (multiplier.value.isZero() || multiplier.value.isNegative())
    economicsReasons.push("MULTIPLIER_INVALID");
  else if (!metadataMultiplier.value.equals(multiplier.value))
    economicsReasons.push("METADATA_EVIDENCE_CONFLICT");
  const payoff = instrument.economics.payoff;
  const convention = instrument.metadata.contractValueConvention;
  if (payoff.state !== "KNOWN" || convention.state !== "KNOWN")
    economicsReasons.push("VALUE_CONVENTION_UNVERIFIED");
  else if (payoff.value !== convention.value)
    economicsReasons.push("METADATA_EVIDENCE_CONFLICT");
  else if (payoff.value !== "LINEAR")
    economicsReasons.push("VALUE_CONVENTION_MISMATCH");
  if (
    instrument.economics.nativeQuantityUnit.state !== "KNOWN" ||
    instrument.economics.canonicalBaseUnit.state !== "KNOWN"
  )
    economicsReasons.push("CONTRACT_UNIT_MISMATCH");
  const complete = economicsReasons.length === 0 && scopeReason === undefined;
  const economicsProven =
    complete &&
    payoff.state === "KNOWN" &&
    payoff.value === "LINEAR" &&
    instrument.economics.nativeQuantityUnit.state === "KNOWN" &&
    instrument.economics.canonicalBaseUnit.state === "KNOWN";
  const provenIdentity = Object.freeze({
    // work: fixed-shape internal identity (at most five keys).
    ...provisionalIdentity,
    ...(economicsProven
      ? {
          valueConvention: "LINEAR" as const,
          exposureUnit: "BASE_UNIT" as const,
        }
      : {}),
  });
  return {
    instrument,
    provisionalIdentity: provenIdentity,
    reasons: Object.freeze(
      [...new Set(economicsReasons)].sort(compareUtf8WithBudget(work)),
    ),
    confidence: [base.confidence, quote.confidence, settle.confidence].includes(
      "REVIEWED_MANUAL",
    )
      ? "REVIEWED_MANUAL"
      : "EXACT_METADATA",
    identity: complete
      ? {
          productClass: "DERIVATIVE",
          baseAssetId: base.asset!,
          quoteAssetId: quote.asset!,
          settlementAssetId: settle.asset!,
          contractType: "PERPETUAL",
          valueConvention: "LINEAR",
          exposureUnit: "BASE_UNIT",
        }
      : undefined,
  };
}
const provisionalValue = (
  value: ProvisionalExposureIdentity,
  work: WorkBudget,
) => {
  work.units(7);
  return {
    baseAssetId: value.baseAssetId,
    productClass: value.productClass ?? null,
    quoteAssetId: value.quoteAssetId,
    settlementAssetId: value.settlementAssetId,
    contractType: value.contractType ?? null,
    valueConvention: value.valueConvention ?? null,
    exposureUnit: value.exposureUnit ?? null,
  };
};
export function makeCandidate(
  left: ResolvedInstrument,
  right: ResolvedInstrument,
  registry: CuratedAssetRegistry,
  at: Timestamp,
  cutoff: Timestamp,
  work: WorkBudget,
): InstrumentMatchCandidate {
  // Every traversal, key, canonical encoding, hash-input preparation and copy
  // below is charged to the caller's single operation budget.
  work.step();
  const legs = [left, right].sort((a, b) =>
    compareUtf8WithBudget(work)(
      a.instrument.metadata.instrumentId,
      b.instrument.metadata.instrumentId,
    ),
  );
  work.units(3 * legs.length);
  const ids = legs.map((value) => value.instrument.metadata.instrumentId);
  const revisions = legs.map((value) => value.instrument.metadataRevision);
  const metadataDigests = legs.map((value) => value.instrument.metadataDigest);
  work.units(3 * (left.reasons.length + right.reasons.length) + 1);
  const reasons = [...new Set([...left.reasons, ...right.reasons])].sort(
    compareUtf8WithBudget(work),
  );
  const leftKey = left.identity
    ? canonicalExposureKeyWithBudget(left.identity, work)
    : undefined;
  const rightKey = right.identity
    ? canonicalExposureKeyWithBudget(right.identity, work)
    : undefined;
  const key =
    sameText(leftKey, rightKey, work) && leftKey !== undefined
      ? leftKey
      : undefined;
  const provisionalIdentity =
    left.provisionalIdentity &&
    right.provisionalIdentity &&
    sameText(
      canonicalSerialize(
        provisionalValue(left.provisionalIdentity, work),
        work,
      ),
      canonicalSerialize(
        provisionalValue(right.provisionalIdentity, work),
        work,
      ),
      work,
    )
      ? left.provisionalIdentity
      : undefined;
  work.units(legs.length + 4);
  const economicsRevisions = legs.map(
    (value) => value.instrument.economics.evidenceRevision,
  );
  const evidence = {
    economicsRevisions,
    metadataDigests,
    metadataRevisions: revisions,
    registryRevision: registry.revision.revision,
  };
  return immutableCandidate(
    {
      candidateId: deterministicId(
        "instrument-match-candidate/v1",
        {
          evidence,
          exposureKey: key ?? null,
          instruments: ids,
          policy: MATCHING_POLICY_VERSION,
        },
        work,
      ),
      leftInstrumentId: ids[0]!,
      rightInstrumentId: ids[1]!,
      leftMetadataRevision: revisions[0]!,
      rightMetadataRevision: revisions[1]!,
      leftMetadataDigest: metadataDigests[0]!,
      rightMetadataDigest: metadataDigests[1]!,
      leftEconomicsRevision: economicsRevisions[0]!,
      rightEconomicsRevision: economicsRevisions[1]!,
      registryRevision: registry.revision.revision,
      provisionalIdentity,
      exposureKey: key,
      evidenceSetDigest: sha256(canonicalSerialize(evidence, work), work),
      proposerId: "DETERMINISTIC_EVALUATOR",
      createdAt: at,
      effectiveAt: at,
      evaluationAt: at,
      knowledgeCutoff: cutoff,
      policyRevision: MATCHING_POLICY_VERSION,
      completeness: "INCOMPLETE",
      confidence:
        left.confidence === "REVIEWED_MANUAL" ||
        right.confidence === "REVIEWED_MANUAL"
          ? "REVIEWED_MANUAL"
          : "EXACT_METADATA",
      reasons,
    },
    work,
  );
}

function provisionalKey(
  value: ResolvedInstrument,
  work: WorkBudget,
): string | undefined {
  return value.provisionalIdentity
    ? canonicalSerialize(
        provisionalValue(value.provisionalIdentity, work),
        work,
      )
    : undefined;
}
export function generateCandidates(
  instruments: readonly VenueInstrumentEvidence[],
  registry: CuratedAssetRegistry,
  at: Timestamp,
  cutoff: Timestamp,
  signal?: CancellationSignal,
): readonly InstrumentMatchCandidate[] {
  const work = new WorkBudget(signal);
  return generateCandidatesWithBudget(instruments, registry, at, cutoff, work);
}

export function generateCandidatesWithBudget(
  instruments: readonly VenueInstrumentEvidence[],
  registry: CuratedAssetRegistry,
  at: Timestamp,
  cutoff: Timestamp,
  work: WorkBudget,
): readonly InstrumentMatchCandidate[] {
  assertCount(instruments.length, MATCHING_LIMITS.instruments, "Instrument");
  // H-04: strict canonical UTC evaluation/knowledge times before any work.
  epoch(at, work);
  epoch(cutoff, work);
  for (const instrument of instruments) {
    work.step();
    validateVenueInstrumentEvidence(instrument, work);
  }
  work.units(instruments.length + 1);
  const ordered = [...instruments].sort((a, b) => {
    return compareUtf8WithBudget(work)(
      a.metadata.instrumentId,
      b.metadata.instrumentId,
    );
  });
  for (let index = 1; index < ordered.length; index += 1) {
    work.step();
    if (
      sameText(
        ordered[index - 1]!.metadata.instrumentId,
        ordered[index]!.metadata.instrumentId,
        work,
      )
    )
      throw new MatchingFailure(
        "DUPLICATE_EXPOSURE_CONFLICT",
        "Duplicate instrument revision.",
      );
  }
  const resolved = ordered.map((item) => {
    work.step();
    return resolveExposureIdentity(item, registry, at, cutoff, work);
  });
  const groups = new Map<string, ResolvedInstrument[]>();
  for (const item of resolved) {
    work.step();
    const key = provisionalKey(item, work);
    if (key === undefined) continue;
    // Map hashing reads the whole key; charge each lookup and insertion.
    const group = groups.get(chargeKey(key, work)) ?? [];
    group.push(item);
    groups.set(chargeKey(key, work), group);
  }
  const pairs: [ResolvedInstrument, ResolvedInstrument][] = [],
    partner = new Map<string, number>();
  work.units(groups.size + 1);
  for (const key of [...groups.keys()].sort(compareUtf8WithBudget(work))) {
    const group = groups.get(chargeKey(key, work))!;
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        work.step();
        const a = group[i]!,
          b = group[j]!;
        if (
          sameText(
            a.instrument.metadata.venue,
            b.instrument.metadata.venue,
            work,
          )
        )
          continue;
        for (const id of [
          a.instrument.metadata.instrumentId,
          b.instrument.metadata.instrumentId,
        ]) {
          const n = (partner.get(chargeKey(id, work)) ?? 0) + 1;
          if (n > MATCHING_LIMITS.partnersPerInstrument)
            throw new MatchingFailure(
              "MATCHING_BOUND_EXCEEDED",
              "Partner bound exceeded.",
            );
          partner.set(chargeKey(id, work), n);
        }
        pairs.push([a, b]);
        if (pairs.length > MATCHING_LIMITS.candidatePairs)
          throw new MatchingFailure(
            "MATCHING_BOUND_EXCEEDED",
            "Pair bound exceeded.",
          );
      }
  }
  const result = pairs.map(([a, b]) => {
    work.step();
    return makeCandidate(a, b, registry, at, cutoff, work);
  });
  // The final freeze is charged before it runs; nothing but the final
  // cancellation check separates it from publication.
  work.step(result.length);
  const published = Object.freeze(result);
  work.beforePublication();
  return published;
}
