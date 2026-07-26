import type { SourceId, Timestamp } from "./quality.js";

declare const identifierBrand: unique symbol;

type Identifier<Kind extends string> = string & {
  readonly [identifierBrand]: Kind;
};

export type Venue = Identifier<"Venue">;
export type ProductGroup = Identifier<"ProductGroup">;
export type OfficialInstrumentId = Identifier<"OfficialInstrumentId">;
export type CanonicalAssetId = Identifier<"CanonicalAssetId">;
export type InstrumentId = Identifier<"InstrumentId">;
export type QuoteAsset = Identifier<"QuoteAsset">;
export type SettlementAsset = Identifier<"SettlementAsset">;
export type OfficialAssetReference = Identifier<"OfficialAssetReference">;
export type MappingActorId = Identifier<"MappingActorId">;

export const marketTypes = [
  "SPOT",
  "PERPETUAL",
  "FUTURE",
  "OPTION",
  "DEX",
  "OTHER",
] as const;

export type MarketType = (typeof marketTypes)[number];

export interface InstrumentIdentity {
  readonly venue: Venue;
  readonly productGroup: ProductGroup;
  readonly officialInstrumentId: OfficialInstrumentId;
  readonly marketType: MarketType;
  readonly settlementAsset: SettlementAsset;
}

function opaqueIdentifier<Kind extends string>(
  value: string,
  kind: Kind,
): Identifier<Kind> {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 160 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new TypeError(`${kind} is not a valid opaque identifier.`);
  }
  return value as Identifier<Kind>;
}

export const venue = (value: string): Venue => opaqueIdentifier(value, "Venue");

export const productGroup = (value: string): ProductGroup =>
  opaqueIdentifier(value, "ProductGroup");

export const officialInstrumentId = (value: string): OfficialInstrumentId =>
  opaqueIdentifier(value, "OfficialInstrumentId");

export const officialAssetReference = (value: string): OfficialAssetReference =>
  opaqueIdentifier(value, "OfficialAssetReference");

export const canonicalAssetId = (value: string): CanonicalAssetId =>
  opaqueIdentifier(value, "CanonicalAssetId");

export const quoteAsset = (value: CanonicalAssetId): QuoteAsset =>
  opaqueIdentifier(value, "QuoteAsset");

export const settlementAsset = (value: CanonicalAssetId): SettlementAsset =>
  opaqueIdentifier(value, "SettlementAsset");

export const mappingActorId = (value: string): MappingActorId =>
  opaqueIdentifier(value, "MappingActorId");

function lengthPrefixed(value: string): string {
  return `${value.length}:${value}`;
}

export function instrumentId(identity: InstrumentIdentity): InstrumentId {
  const encoded = [
    "cex-instrument/v1",
    lengthPrefixed(identity.venue),
    lengthPrefixed(identity.productGroup),
    lengthPrefixed(identity.officialInstrumentId),
    lengthPrefixed(identity.marketType),
    lengthPrefixed(identity.settlementAsset),
  ].join("|");
  return encoded as InstrumentId;
}

export function sameInstrument(
  left: InstrumentIdentity,
  right: InstrumentIdentity,
): boolean {
  return instrumentId(left) === instrumentId(right);
}

export type ManualMappingState =
  "PENDING_REVIEW" | "APPROVED" | "CONFLICT_QUARANTINED";

export interface ManualAssetMapping {
  readonly venue: Venue;
  readonly productGroup: ProductGroup;
  readonly officialAssetReference: OfficialAssetReference;
  readonly canonicalAssetId: CanonicalAssetId;
  readonly source: SourceId;
  readonly effectiveAt: Timestamp;
  readonly proposedBy: MappingActorId;
  readonly reviewedBy?: MappingActorId;
  readonly state: ManualMappingState;
  readonly conflictReason?: string;
}

export function validateManualAssetMapping(mapping: ManualAssetMapping): void {
  if (mapping.state === "PENDING_REVIEW" && mapping.reviewedBy !== undefined) {
    throw new TypeError("A pending mapping cannot already have a reviewer.");
  }
  if (mapping.state === "APPROVED") {
    if (mapping.reviewedBy === undefined) {
      throw new TypeError("An approved mapping requires a reviewer.");
    }
    if (mapping.reviewedBy === mapping.proposedBy) {
      throw new TypeError(
        "An approved mapping requires a distinct four-eyes reviewer.",
      );
    }
  }
  if (
    mapping.state === "CONFLICT_QUARANTINED" &&
    (mapping.conflictReason === undefined ||
      mapping.conflictReason.trim().length === 0)
  ) {
    throw new TypeError("A quarantined mapping requires a conflict reason.");
  }
}
