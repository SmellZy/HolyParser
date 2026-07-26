import type { Knowledge } from "./availability.js";
import {
  ExactDecimal,
  type ContractMultiplier,
  type FundingRate,
  type Notional,
  type Price,
  type Quantity,
  type QuantityStep,
  type RoundingPolicy,
  type TickSize,
} from "./decimal.js";
import type {
  CanonicalAssetId,
  InstrumentId,
  MarketType,
  OfficialInstrumentId,
  ProductGroup,
  QuoteAsset,
  SettlementAsset,
  Venue,
} from "./identifiers.js";
import type { ObservationContext, SourceId, Timestamp } from "./quality.js";

declare const durationBrand: unique symbol;

export type DurationSeconds = bigint & {
  readonly [durationBrand]: "DurationSeconds";
};

export function durationSeconds(value: string): DurationSeconds {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new TypeError("Duration seconds must be an unsigned integer string.");
  }
  const parsed = BigInt(value);
  if (parsed <= 0n) {
    throw new TypeError("Duration seconds must be positive.");
  }
  return parsed as DurationSeconds;
}

export interface Provenance {
  readonly sourceId: SourceId;
  readonly retrievalDate: string;
}

export type ContractType =
  "SPOT" | "PERPETUAL" | "DATED_FUTURE" | "OPTION" | "OTHER";

export type ContractValueConvention =
  "LINEAR" | "INVERSE" | "QUANTO" | "NOT_APPLICABLE";

export type InstrumentLifecycle =
  | "PRE_LAUNCH"
  | "ACTIVE"
  | "SUSPENDED"
  | "SETTLING"
  | "EXPIRED"
  | "DELISTED"
  | "UNKNOWN";

export type FundingCapability = "CURRENT" | "LAST" | "PREDICTED" | "HISTORICAL";

export interface InstrumentMetadataObservation {
  readonly kind: "INSTRUMENT_METADATA";
  readonly instrumentId: InstrumentId;
  readonly venue: Venue;
  readonly productGroup: ProductGroup;
  readonly officialInstrumentId: OfficialInstrumentId;
  readonly displaySymbol: string;
  readonly baseAsset: CanonicalAssetId;
  readonly quoteAsset: QuoteAsset;
  readonly settlementAsset: SettlementAsset;
  readonly marketType: MarketType;
  readonly contractType: Knowledge<ContractType>;
  readonly contractMultiplier: Knowledge<ContractMultiplier>;
  readonly contractValueConvention: Knowledge<ContractValueConvention>;
  readonly tickSize: Knowledge<TickSize>;
  readonly quantityStep: Knowledge<QuantityStep>;
  readonly minimumQuantity: Knowledge<Quantity>;
  readonly minimumNotional: Knowledge<Notional>;
  readonly fundingCapabilities: Knowledge<ReadonlyArray<FundingCapability>>;
  readonly lifecycle: InstrumentLifecycle;
  readonly metadataObservedAt: Timestamp;
  readonly provenance: Provenance;
  readonly context: ObservationContext;
}

export type FundingSemantic = "CURRENT" | "LAST" | "PREDICTED" | "UNKNOWN";

export interface FundingObservation {
  readonly kind: "FUNDING";
  readonly instrumentId: InstrumentId;
  readonly venueNativeRate: Knowledge<FundingRate>;
  readonly semantic: FundingSemantic;
  readonly interval: Knowledge<DurationSeconds>;
  readonly observedAt: Timestamp;
  readonly nextSettlementTime: Knowledge<Timestamp>;
  readonly provenance: Provenance;
  readonly context: ObservationContext;
}

export const NORMALIZED_FUNDING_8H_VERSION =
  "normalized-funding-8h/v1" as const;

export interface NormalizedFundingRate8hV1 {
  readonly kind: "NORMALIZED_FUNDING_RATE_8H";
  readonly version: typeof NORMALIZED_FUNDING_8H_VERSION;
  readonly sourceSemantic: FundingSemantic;
  readonly sourceNativeRate: FundingRate;
  readonly sourceInterval: DurationSeconds;
  readonly rate: FundingRate;
  readonly outputScale: number;
  readonly roundingPolicy: RoundingPolicy;
}

export function deriveNormalizedFundingRate8hV1(
  observation: FundingObservation,
  outputScale: number,
  roundingPolicy: RoundingPolicy,
): Knowledge<NormalizedFundingRate8hV1> {
  if (
    observation.venueNativeRate.state !== "KNOWN" ||
    observation.interval.state !== "KNOWN"
  ) {
    return {
      state: "UNKNOWN",
      reason: "Native funding rate and documented interval are both required.",
    };
  }

  const eightHoursInSeconds = ExactDecimal.fromParts(28_800n, 0);
  const nativeInterval = ExactDecimal.fromParts(observation.interval.value, 0);
  const normalized = observation.venueNativeRate.value
    .multiply(eightHoursInSeconds)
    .divide(nativeInterval, outputScale, roundingPolicy) as FundingRate;

  return {
    state: "KNOWN",
    value: {
      kind: "NORMALIZED_FUNDING_RATE_8H",
      version: NORMALIZED_FUNDING_8H_VERSION,
      sourceSemantic: observation.semantic,
      sourceNativeRate: observation.venueNativeRate.value,
      sourceInterval: observation.interval.value,
      rate: normalized,
      outputScale,
      roundingPolicy,
    },
  };
}

interface PriceObservationBase {
  readonly instrumentId: InstrumentId;
  readonly value: Price;
  readonly observedAt: Timestamp;
  readonly provenance: Provenance;
  readonly context: ObservationContext;
}

export interface LastPriceObservation extends PriceObservationBase {
  readonly kind: "LAST_PRICE";
}

export interface BidPriceObservation extends PriceObservationBase {
  readonly kind: "BID_PRICE";
}

export interface AskPriceObservation extends PriceObservationBase {
  readonly kind: "ASK_PRICE";
}

export interface MidPriceObservation extends PriceObservationBase {
  readonly kind: "MID_PRICE";
  readonly derivedFrom: readonly ["BID_PRICE", "ASK_PRICE"];
}

export interface MarkPriceObservation extends PriceObservationBase {
  readonly kind: "MARK_PRICE";
}

export interface IndexPriceObservation extends PriceObservationBase {
  readonly kind: "INDEX_PRICE";
}

export interface OraclePriceObservation extends PriceObservationBase {
  readonly kind: "ORACLE_PRICE";
}

export type MarketPriceObservation =
  | LastPriceObservation
  | BidPriceObservation
  | AskPriceObservation
  | MidPriceObservation
  | MarkPriceObservation
  | IndexPriceObservation
  | OraclePriceObservation;
