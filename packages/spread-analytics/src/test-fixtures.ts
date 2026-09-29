import {
  canonicalAssetId,
  contractMultiplier,
  instrumentId,
  known,
  officialInstrumentId,
  productGroup,
  quoteAsset,
  settlementAsset,
  sourceId,
  timestamp,
  unverified,
  venue,
  type InstrumentMetadataObservation,
  type Timestamp,
} from "@arbitrage/market-data";
import type {
  AssetAlias,
  AssetBinding,
  CanonicalAssetRecord,
  MappingStatus,
  MappingTransitionRecord,
  MappingVersion,
  ReviewRecord,
  VenueInstrumentEvidence,
} from "./model.js";
import {
  admitMaterializedMapping,
  type AdmittedMappingHistory,
  type MappingAdmissionInput,
} from "./admission.js";
import { candidateProvenanceDigest } from "./admission.js";
import { approveCommand } from "./commands.js";
import {
  canonicalExposureKey,
  canonicalSerialize,
  deterministicId,
  sha256,
} from "./serialization.js";
import { MATCHING_POLICY_VERSION } from "./policy.js";
import { CuratedAssetRegistry } from "./registry.js";
import { createTransitionRecord } from "./transitions.js";

export const T0 = timestamp("2026-09-15T00:00:00.000Z");
export const T30 = timestamp("2026-09-15T00:00:30.000Z");
export const T60 = timestamp("2026-09-15T00:01:00.000Z");
export const T60P1 = timestamp("2026-09-15T00:01:00.001Z");
export const T1D = timestamp("2026-09-16T00:00:00.000Z");
export const T30D = timestamp("2026-10-15T00:00:00.000Z");
export const T31D = timestamp("2026-10-16T00:00:00.000Z");
export const A = canonicalAssetId("asset:A");
export const B = canonicalAssetId("asset:B");
export const USDT = canonicalAssetId("asset:USDT");
export const USDC = canonicalAssetId("asset:USDC");

export interface InstrumentOptions {
  readonly name: string;
  readonly venue?: string;
  readonly base?: typeof A;
  readonly quote?: typeof USDT;
  readonly settle?: typeof USDT;
  readonly multiplier?: string;
  readonly metadataMultiplier?: "UNKNOWN" | string;
  readonly convention?: "INVERSE" | "LINEAR" | "QUANTO" | "UNKNOWN";
  readonly contract?:
    "DATED_FUTURE" | "PERPETUAL" | "OTHER" | "OPTION" | "UNKNOWN";
  readonly marketType?: "FUTURE" | "OPTION" | "PERPETUAL" | "SPOT";
  readonly lifecycle?: InstrumentMetadataObservation["lifecycle"];
  readonly observedAt?: Timestamp;
  readonly quality?: InstrumentMetadataObservation["context"]["quality"];
  readonly family?: string;
  readonly unit?: string;
  readonly collateralVerified?: boolean;
}
export function instrument(
  options: InstrumentOptions,
): VenueInstrumentEvidence {
  const venueId = venue(options.venue ?? options.name);
  const group = productGroup(`${options.name}_GROUP`);
  const base = options.base ?? A;
  const quote = options.quote ?? USDT;
  const settle = options.settle ?? USDT;
  const identity = {
    venue: venueId,
    productGroup: group,
    officialInstrumentId: officialInstrumentId(`${options.name}-PERP`),
    marketType: options.marketType ?? "PERPETUAL",
    settlementAsset: settlementAsset(settle),
  } as const;
  const metadataMultiplier =
    options.metadataMultiplier ?? options.multiplier ?? "1";
  const convention = options.convention ?? "LINEAR";
  const metadata: InstrumentMetadataObservation = Object.freeze({
    kind: "INSTRUMENT_METADATA",
    instrumentId: instrumentId(identity),
    venue: venueId,
    productGroup: group,
    officialInstrumentId: identity.officialInstrumentId,
    displaySymbol: "SAME-TICKER",
    baseAsset: base,
    quoteAsset: quoteAsset(quote),
    settlementAsset: settlementAsset(settle),
    marketType: identity.marketType,
    contractType:
      options.contract === "UNKNOWN"
        ? unverified("fixture unknown product type")
        : known(options.contract ?? "PERPETUAL"),
    contractMultiplier:
      metadataMultiplier === "UNKNOWN"
        ? unverified("fixture unknown")
        : known(contractMultiplier(metadataMultiplier)),
    contractValueConvention:
      convention === "UNKNOWN"
        ? unverified("fixture unknown")
        : known(convention),
    tickSize: unverified("not used"),
    quantityStep: unverified("not used"),
    minimumQuantity: unverified("not used"),
    minimumNotional: unverified("not used"),
    fundingCapabilities: known([]),
    lifecycle: options.lifecycle ?? "ACTIVE",
    metadataObservedAt: options.observedAt ?? T0,
    provenance: {
      sourceId: sourceId("FIXTURE.SOURCE"),
      retrievalDate: "2026-09-15",
    },
    context: {
      receiveTimestamp: options.observedAt ?? T0,
      processingTimestamp: options.observedAt ?? T0,
      source: sourceId("FIXTURE.SOURCE"),
      quality: options.quality ?? "HEALTHY",
    },
  });
  const factor = options.multiplier ?? "1";
  return Object.freeze({
    metadata,
    metadataRevision: `${options.name}-metadata-v1`,
    metadataDigest: `${options.name}-digest`,
    nativeBaseAssetReference: `${options.name}:BASE`,
    nativeQuoteAssetReference: `${options.name}:QUOTE`,
    nativeSettlementAssetReference: `${options.name}:SETTLE`,
    economics: {
      evidenceRevision: `${options.name}-economics-v1`,
      nativeFamily: options.family ?? "ORDINARY_LINEAR_PERPETUAL",
      nativeQuantityUnit: { state: "KNOWN", value: options.unit ?? "CONTRACT" },
      canonicalBaseUnit: { state: "KNOWN", value: `${base}:BASE_UNIT` },
      baseUnitsPerNativeQuantity:
        options.multiplier === "UNKNOWN"
          ? { state: "UNVERIFIED", reasonCode: "MULTIPLIER_UNKNOWN" }
          : { state: "KNOWN", value: contractMultiplier(factor) },
      payoff:
        convention === "UNKNOWN"
          ? { state: "UNVERIFIED", reasonCode: "VALUE_CONVENTION_UNVERIFIED" }
          : { state: "KNOWN", value: convention },
      collateralVerified: options.collateralVerified ?? true,
    },
  });
}
export function registry(
  items: readonly VenueInstrumentEvidence[],
  overrides: Readonly<
    Record<
      string,
      { base?: typeof A; quote?: typeof USDT; settle?: typeof USDT }
    >
  > = {},
  aliases: readonly AssetAlias[] = [],
): CuratedAssetRegistry {
  const bindings: AssetBinding[] = [];
  for (const item of items) {
    const override = overrides[item.metadata.venue] ?? {};
    for (const [role, ref, asset] of [
      [
        "BASE",
        item.nativeBaseAssetReference,
        override.base ?? item.metadata.baseAsset,
      ],
      [
        "QUOTE",
        item.nativeQuoteAssetReference,
        override.quote ?? item.metadata.quoteAsset,
      ],
      [
        "SETTLEMENT",
        item.nativeSettlementAssetReference,
        override.settle ?? item.metadata.settlementAsset,
      ],
    ] as const) {
      bindings.push({
        bindingId: `${item.metadata.venue}:${role}:${item.metadata.productGroup}`,
        registryRevision: "registry-v1",
        venue: item.metadata.venue,
        productGroup: item.metadata.productGroup,
        nativeAssetReference: ref,
        role,
        canonicalAssetId: asset,
        effectiveFrom: T0,
        effectiveTo: T30D,
        recordedKnowledgeAt: T0,
        evidenceRevision: "registry-evidence-v1",
        reviewedBy: "product-reviewer",
      });
    }
  }
  const assetIds = [
    ...new Set(
      bindings
        .map((binding) => binding.canonicalAssetId)
        .concat(aliases.map((alias) => alias.targetAssetId)),
    ),
  ];
  const assets: CanonicalAssetRecord[] = assetIds.map((assetId) => ({
    assetId,
    canonicalSymbol: String(assetId).replace(/^asset:/, ""),
    displayName: String(assetId),
    registryRevision: "registry-v1",
    effectiveFrom: T0,
    effectiveTo: T30D,
    recordedKnowledgeAt: T0,
    evidenceRevision: "asset-evidence-v1",
    reviewedBy: "asset-reviewer",
  }));
  return new CuratedAssetRegistry({
    revision: "registry-v1",
    recordedAt: T0,
    assets,
    bindings,
    aliases,
  });
}
export function approvedMapping(
  left: VenueInstrumentEvidence,
  right: VenueInstrumentEvidence,
  status: MappingStatus = "APPROVED",
  overrides: Partial<MappingVersion> = {},
): MappingVersion {
  const key = canonicalExposureKey({
    productClass: "DERIVATIVE",
    baseAssetId: A,
    quoteAssetId: USDT,
    settlementAssetId: USDT,
    contractType: "PERPETUAL",
    valueConvention: "LINEAR",
    exposureUnit: "BASE_UNIT",
  });
  return Object.freeze({
    mappingId: "mapping-1",
    version: 1,
    status,
    leftInstrumentId: left.metadata.instrumentId,
    rightInstrumentId: right.metadata.instrumentId,
    exposureKey: key,
    effectiveFrom: T0,
    effectiveTo: T30D,
    recordedKnowledgeAt: T0,
    registryRevision: "registry-v1",
    evidenceRevision: "evidence-v1",
    policyRevision: MATCHING_POLICY_VERSION,
    reasonCode:
      status === "APPROVED"
        ? "COMPATIBLE_APPROVED"
        : status === "INVALIDATED"
          ? "MAPPING_INVALIDATED"
          : status === "SUPERSEDED"
            ? "MAPPING_SUPERSEDED"
            : "MAPPING_QUARANTINED",
    invalidationReference:
      status === "INVALIDATED" ? "fixture-invalidation" : undefined,
    approvals: [
      {
        actorId: "fixture-quant-reviewer",
        role: "QUANT_REVIEWER",
        approvedDigest: "fixture-command-digest",
        recordedAt: T0,
      },
      {
        actorId: "fixture-market-data-reviewer",
        role: "MARKET_DATA_REVIEWER",
        approvedDigest: "fixture-command-digest",
        recordedAt: T0,
      },
    ],
    ...overrides,
  });
}

export function mappingAdmission(
  left: VenueInstrumentEvidence,
  right: VenueInstrumentEvidence,
  assets: CuratedAssetRegistry,
  rawMapping: MappingVersion = approvedMapping(left, right),
): MappingAdmissionInput {
  const legs = [left, right].sort((a, b) =>
    Buffer.compare(
      Buffer.from(a.metadata.instrumentId),
      Buffer.from(b.metadata.instrumentId),
    ),
  );
  const evidenceSetDigest = sha256(
    canonicalSerialize({
      economicsRevisions: legs.map((leg) => leg.economics.evidenceRevision),
      metadataDigests: legs.map((leg) => leg.metadataDigest),
      metadataRevisions: legs.map((leg) => leg.metadataRevision),
      registryRevision: assets.revision.revision,
    }),
  );
  const candidate = Object.freeze({
    candidateId: deterministicId("instrument-match-candidate/v1", {
      evidence: {
        economicsRevisions: legs.map((leg) => leg.economics.evidenceRevision),
        metadataDigests: legs.map((leg) => leg.metadataDigest),
        metadataRevisions: legs.map((leg) => leg.metadataRevision),
        registryRevision: assets.revision.revision,
      },
      exposureKey: rawMapping.exposureKey,
      instruments: legs.map((leg) => leg.metadata.instrumentId),
      policy: MATCHING_POLICY_VERSION,
    }),
    leftInstrumentId: legs[0]!.metadata.instrumentId,
    rightInstrumentId: legs[1]!.metadata.instrumentId,
    leftMetadataRevision: legs[0]!.metadataRevision,
    rightMetadataRevision: legs[1]!.metadataRevision,
    leftMetadataDigest: legs[0]!.metadataDigest,
    rightMetadataDigest: legs[1]!.metadataDigest,
    leftEconomicsRevision: legs[0]!.economics.evidenceRevision,
    rightEconomicsRevision: legs[1]!.economics.evidenceRevision,
    registryRevision: assets.revision.revision,
    provisionalIdentity: Object.freeze({
      productClass: "DERIVATIVE" as const,
      baseAssetId: A,
      quoteAssetId: USDT,
      settlementAssetId: USDT,
    }),
    exposureKey: rawMapping.exposureKey,
    evidenceSetDigest,
    proposerId: "DETERMINISTIC_EVALUATOR" as const,
    createdAt: T0,
    effectiveAt: T0,
    evaluationAt: T30,
    knowledgeCutoff: T30,
    policyRevision: MATCHING_POLICY_VERSION,
    completeness: "COMPLETE_APPROVED" as const,
    confidence: "EXACT_METADATA" as const,
    reasons: Object.freeze([]),
  });
  const record = (version: number) => {
    const base = Object.freeze({
      ...rawMapping,
      version,
      status: "APPROVED" as const,
      reasonCode: "COMPATIBLE_APPROVED" as const,
      recordedKnowledgeAt:
        version === rawMapping.version ? rawMapping.recordedKnowledgeAt : T0,
      priorVersion: version > 1 ? version - 1 : undefined,
      supersededBy: undefined,
      invalidationReference: undefined,
      leftInstrumentId: candidate.leftInstrumentId,
      rightInstrumentId: candidate.rightInstrumentId,
      exposureKey: candidate.exposureKey,
      registryRevision: assets.revision.revision,
      evidenceRevision: candidate.evidenceSetDigest,
      approvals: Object.freeze([]),
    });
    const command = approveCommand({
      commandId: `approve-${base.mappingId}-${version}`,
      candidateId: candidate.candidateId,
      candidateDigest: candidateProvenanceDigest(candidate),
      expectedRevision: version - 1,
      proposedBy: "fixture-product-proposer",
      mappingId: base.mappingId,
      leftInstrumentId: candidate.leftInstrumentId,
      rightInstrumentId: candidate.rightInstrumentId,
      exposureKey: candidate.exposureKey,
      effectiveFrom: base.effectiveFrom,
      effectiveTo: base.effectiveTo,
      recordedKnowledgeAt: base.recordedKnowledgeAt,
      registryRevision: assets.revision.revision,
      evidenceRevision: candidate.evidenceSetDigest,
      reasonText: "independently reviewed",
      approvals: [
        {
          actorId: "fixture-quant-reviewer",
          role: "QUANT_REVIEWER",
          recordedAt: T0,
        },
        {
          actorId: "fixture-market-data-reviewer",
          role: "MARKET_DATA_REVIEWER",
          recordedAt: T0,
        },
      ],
    });
    const mapping = Object.freeze({ ...base, approvals: command.approvals });
    const review: ReviewRecord = Object.freeze({
      reviewId: `review-${base.mappingId}-${version}`,
      candidateId: candidate.candidateId,
      proposerId: command.proposedBy,
      commandDigest: command.commandDigest,
      expectedRevision: command.expectedRevision,
      approvals: command.approvals,
      recordedAt: T0,
    });
    return Object.freeze({ mapping, candidate, review, command });
  };
  const history = Object.freeze(
    Array.from({ length: rawMapping.version }, (_, index) => record(index + 1)),
  );
  const transitions: MappingTransitionRecord[] = [];
  for (let version = 1; version < rawMapping.version; version += 1) {
    const target = history[version - 1]!;
    const successor = history[version]!;
    transitions.push(
      createTransitionRecord({
        transitionId: `supersede-${rawMapping.mappingId}-${version}`,
        mappingId: rawMapping.mappingId,
        affectedVersion: version,
        transitionType: "SUPERSEDE",
        effectiveAt: successor.mapping.effectiveFrom,
        reasonCode: "MAPPING_SUPERSEDED",
        successorVersion: version + 1,
        policyRevision: MATCHING_POLICY_VERSION,
        expectedRevision: version,
        expectedState: "APPROVED",
        proposerId: "fixture-transition-proposer",
        registryRevision: target.mapping.registryRevision,
        evidenceRevision: target.mapping.evidenceRevision,
        provenanceDigest: target.command.commandDigest,
        recordedKnowledgeAt: successor.mapping.recordedKnowledgeAt,
        approvals: [
          {
            actorId: "fixture-transition-quant",
            role: "QUANT_REVIEWER",
            recordedAt: T0,
          },
          {
            actorId: "fixture-transition-market-data",
            role: "MARKET_DATA_REVIEWER",
            recordedAt: T0,
          },
        ],
      }),
    );
  }
  let selectedVersion = rawMapping.version;
  if (rawMapping.status === "SUPERSEDED" && rawMapping.version > 1)
    selectedVersion = rawMapping.version - 1;
  if (rawMapping.status === "INVALIDATED") {
    const target = history[rawMapping.version - 1]!;
    transitions.push(
      createTransitionRecord({
        transitionId: `invalidate-${rawMapping.mappingId}-${rawMapping.version}`,
        mappingId: rawMapping.mappingId,
        affectedVersion: rawMapping.version,
        transitionType: "INVALIDATE",
        effectiveAt: rawMapping.effectiveFrom,
        reasonCode: "MAPPING_INVALIDATED",
        reference: rawMapping.invalidationReference ?? "fixture-invalidation",
        policyRevision: MATCHING_POLICY_VERSION,
        expectedRevision: rawMapping.version,
        expectedState: "APPROVED",
        proposerId: "fixture-transition-proposer",
        registryRevision: target.mapping.registryRevision,
        evidenceRevision: target.mapping.evidenceRevision,
        provenanceDigest: target.command.commandDigest,
        recordedKnowledgeAt: rawMapping.recordedKnowledgeAt,
        approvals: [
          {
            actorId: "fixture-transition-quant",
            role: "QUANT_REVIEWER",
            recordedAt: T0,
          },
          {
            actorId: "fixture-transition-market-data",
            role: "MARKET_DATA_REVIEWER",
            recordedAt: T0,
          },
        ],
      }),
    );
  }
  const selected = history[selectedVersion - 1]!;
  if (rawMapping.status === "QUARANTINED" || rawMapping.status === "CONFLICT") {
    return Object.freeze({
      ...selected,
      mapping: Object.freeze({
        ...selected.mapping,
        status: rawMapping.status,
      }),
      history,
      transitions: Object.freeze(transitions),
    });
  }
  return Object.freeze({
    ...selected,
    history,
    transitions: Object.freeze(transitions),
  });
}

export function admittedHistory(
  input: MappingAdmissionInput,
  evaluationAt: Timestamp = T30,
): AdmittedMappingHistory {
  const result = admitMaterializedMapping(input, evaluationAt);
  if (result.history === undefined)
    throw new Error(`Fixture history admission failed: ${result.reason}`);
  return result.history;
}
