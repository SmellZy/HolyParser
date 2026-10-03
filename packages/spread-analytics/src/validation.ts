import type { InstrumentMetadataObservation } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertAtomicId,
  assertCompositeId,
  assertCount,
  assertReasonText,
  inVocabulary,
} from "./bounds.js";
import { MATCHING_LIMITS } from "./policy.js";
import type {
  NativeEconomicsEvidence,
  VenueInstrumentEvidence,
} from "./model.js";
import { MATCH_REASON_CODES, MatchingFailure } from "./reasons.js";

const matchReasonCodes = new Set<string>(MATCH_REASON_CODES);

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new MatchingFailure("INPUT_INVALID", `${label} must be an object.`);
  return value as Record<string, unknown>;
}

export function assertClosedKeys(
  value: unknown,
  allowed: readonly string[],
  label: string,
  work?: WorkBudget,
): void {
  const input = record(value, label);
  const allowedSet = new Set(allowed);
  // Own-key enumeration cannot be bounded before it returns; charge it
  // immediately and reject an oversized object before further work.
  const keys = Object.keys(input);
  work?.units(keys.length + 1);
  assertCount(keys.length, MATCHING_LIMITS.objectKeys, "Object key");
  for (let index = 0; index < keys.length; index += 1) {
    if (index % 16 === 0) work?.step();
    const key = keys[index]!;
    if (!inVocabulary(allowedSet, key, work))
      throw new MatchingFailure(
        "INPUT_INVALID",
        `${label} has an unknown field.`,
      );
  }
  for (let index = 0; index < allowed.length; index += 1) {
    if (index % 16 === 0) work?.step();
    const key = allowed[index]!;
    if (!(key in input))
      throw new MatchingFailure(
        "INPUT_INVALID",
        `${label} is missing a field.`,
      );
  }
}

function validateKnowledge(
  value: unknown,
  knownValues?: ReadonlySet<string>,
  work?: WorkBudget,
): void {
  const input = record(value, "Knowledge");
  if (input.state === "KNOWN") {
    assertClosedKeys(input, ["state", "value"], "Known value", work);
    if (knownValues && !inVocabulary(knownValues, input.value, work))
      throw new MatchingFailure("INPUT_INVALID", "Known enum is invalid.");
    return;
  }
  if (
    !["UNKNOWN", "UNSUPPORTED", "UNVERIFIED", "RESEARCH_REQUIRED"].includes(
      String(input.state),
    )
  )
    throw new MatchingFailure("INPUT_INVALID", "Knowledge state is invalid.");
  assertClosedKeys(input, ["state", "reason"], "Unavailable value", work);
  if (typeof input.reason !== "string")
    throw new MatchingFailure("INPUT_INVALID", "Knowledge reason is invalid.");
  assertReasonText(input.reason, work);
}

function validateMetadata(
  value: InstrumentMetadataObservation,
  work?: WorkBudget,
): void {
  assertClosedKeys(
    value,
    [
      "kind",
      "instrumentId",
      "venue",
      "productGroup",
      "officialInstrumentId",
      "displaySymbol",
      "baseAsset",
      "quoteAsset",
      "settlementAsset",
      "marketType",
      "contractType",
      "contractMultiplier",
      "contractValueConvention",
      "tickSize",
      "quantityStep",
      "minimumQuantity",
      "minimumNotional",
      "fundingCapabilities",
      "lifecycle",
      "metadataObservedAt",
      "provenance",
      "context",
    ],
    "Instrument metadata",
    work,
  );
  if (value.kind !== "INSTRUMENT_METADATA")
    throw new MatchingFailure("INPUT_INVALID", "Metadata kind is invalid.");
  for (const item of [
    value.venue,
    value.productGroup,
    value.officialInstrumentId,
    value.displaySymbol,
    value.baseAsset,
    value.quoteAsset,
    value.settlementAsset,
  ]) {
    work?.step();
    assertAtomicId(item, "ID", work);
  }
  if (!["SPOT", "PERPETUAL", "FUTURE", "OPTION"].includes(value.marketType))
    throw new MatchingFailure("INPUT_INVALID", "Market type is invalid.");
  if (
    ![
      "PRE_LAUNCH",
      "ACTIVE",
      "SUSPENDED",
      "SETTLING",
      "EXPIRED",
      "DELISTED",
      "UNKNOWN",
    ].includes(value.lifecycle)
  )
    throw new MatchingFailure("INPUT_INVALID", "Lifecycle is invalid.");
  validateKnowledge(
    value.contractType,
    new Set(["SPOT", "PERPETUAL", "DATED_FUTURE", "OPTION", "OTHER"]),
    work,
  );
  validateKnowledge(value.contractMultiplier, undefined, work);
  validateKnowledge(
    value.contractValueConvention,
    new Set(["LINEAR", "INVERSE", "QUANTO", "NOT_APPLICABLE"]),
    work,
  );
  for (const item of [
    value.tickSize,
    value.quantityStep,
    value.minimumQuantity,
    value.minimumNotional,
    value.fundingCapabilities,
  ]) {
    work?.step();
    validateKnowledge(item, undefined, work);
  }
  assertClosedKeys(
    value.provenance,
    ["sourceId", "retrievalDate"],
    "Provenance",
    work,
  );
  const contextKeys =
    value.context.exchangeTimestamp === undefined
      ? ["receiveTimestamp", "processingTimestamp", "source", "quality"]
      : [
          "exchangeTimestamp",
          "receiveTimestamp",
          "processingTimestamp",
          "source",
          "quality",
        ];
  assertClosedKeys(value.context, contextKeys, "Observation context", work);
}

function validateEconomics(
  value: NativeEconomicsEvidence,
  work?: WorkBudget,
): void {
  assertClosedKeys(
    value,
    [
      "evidenceRevision",
      "nativeFamily",
      "nativeQuantityUnit",
      "canonicalBaseUnit",
      "baseUnitsPerNativeQuantity",
      "payoff",
      "collateralVerified",
    ],
    "Economics evidence",
    work,
  );
  assertAtomicId(value.evidenceRevision, "Evidence revision", work);
  assertAtomicId(value.nativeFamily, "Native family", work);
  const validateSidecar = (
    input: unknown,
    knownValues?: ReadonlySet<string>,
    bound?: "ATOMIC" | "COMPOSITE",
  ) => {
    const item = record(input, "Sidecar knowledge");
    if (item.state === "KNOWN") {
      assertClosedKeys(item, ["state", "value"], "Known sidecar value", work);
      // Unit labels are later compared; bound them before any comparison.
      if (bound === "ATOMIC")
        assertAtomicId(item.value as string, "Sidecar unit", work);
      if (bound === "COMPOSITE") assertCompositeId(item.value as string, work);
      if (knownValues && !inVocabulary(knownValues, item.value, work))
        throw new MatchingFailure("INPUT_INVALID", "Sidecar enum is invalid.");
    } else {
      if (!["UNKNOWN", "UNVERIFIED"].includes(String(item.state)))
        throw new MatchingFailure("INPUT_INVALID", "Sidecar state is invalid.");
      assertClosedKeys(
        item,
        ["state", "reasonCode"],
        "Unavailable sidecar value",
        work,
      );
      if (!inVocabulary(matchReasonCodes, item.reasonCode, work))
        throw new MatchingFailure(
          "INPUT_INVALID",
          "Sidecar reason code is invalid.",
        );
    }
  };
  validateSidecar(value.nativeQuantityUnit, undefined, "ATOMIC");
  validateSidecar(value.canonicalBaseUnit, undefined, "COMPOSITE");
  validateSidecar(value.baseUnitsPerNativeQuantity);
  validateSidecar(value.payoff, new Set(["LINEAR", "INVERSE", "QUANTO"]));
  if (typeof value.collateralVerified !== "boolean")
    throw new MatchingFailure(
      "INPUT_INVALID",
      "Collateral verification is invalid.",
    );
}

export function validateVenueInstrumentEvidence(
  value: VenueInstrumentEvidence,
  work?: WorkBudget,
): void {
  assertClosedKeys(
    value,
    [
      "metadata",
      "metadataRevision",
      "metadataDigest",
      "nativeBaseAssetReference",
      "nativeQuoteAssetReference",
      "nativeSettlementAssetReference",
      "economics",
    ],
    "Venue instrument evidence",
    work,
  );
  validateMetadata(value.metadata, work);
  assertAtomicId(value.metadataRevision, "Metadata revision", work);
  assertAtomicId(value.metadataDigest, "Metadata digest", work);
  assertAtomicId(value.nativeBaseAssetReference, "Native base reference", work);
  assertAtomicId(
    value.nativeQuoteAssetReference,
    "Native quote reference",
    work,
  );
  assertAtomicId(
    value.nativeSettlementAssetReference,
    "Native settlement reference",
    work,
  );
  assertCompositeId(value.metadata.instrumentId, work);
  validateEconomics(value.economics, work);
}
