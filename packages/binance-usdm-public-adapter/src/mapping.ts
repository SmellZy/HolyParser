import {
  durationSeconds,
  fundingRate,
  instrumentId,
  known,
  notional,
  officialAssetReference,
  officialInstrumentId,
  price,
  quantity,
  quantityStep,
  quoteAsset,
  researchRequired,
  settlementAsset,
  tickSize,
  unknown,
  unsupported,
  unverified,
  updateId,
  type BookDelta,
  type BookLevel,
  type BookUpdate,
  type BookSnapshot,
  type CanonicalAssetId,
  type ContractMultiplier,
  type ContractValueConvention,
  type DurationSeconds,
  type FundingCapability,
  type FundingObservation,
  type InstrumentId,
  type InstrumentMetadataObservation,
  type MarketPriceObservation,
  type Notional,
  type ObservationContext,
  type OfficialAssetReference,
  type QualityState,
  type Quantity,
  type QuantityStep,
  type TickSize,
  type Timestamp,
} from "@arbitrage/market-data";
import {
  BINANCE_USDM_PRODUCT_GROUP,
  BINANCE_USDM_REST_SOURCE,
  BINANCE_USDM_RETRIEVAL_DATE,
  BINANCE_USDM_VENUE,
  BINANCE_USDM_WS_SOURCE,
} from "./constants.js";
import { BinanceUsdmSchemaError } from "./errors.js";
import {
  qualityForTimestamp,
  type BinanceUsdmFreshnessConfiguration,
} from "./freshness.js";
import { epochMilliseconds } from "./time.js";
import type {
  BinanceBookLevelWire,
  BinanceBookTickerWire,
  BinanceDepthSnapshotWire,
  BinanceDiffDepthWire,
  BinanceFundingHistoryWire,
  BinanceFundingInfoWire,
  BinanceInstrumentWire,
  BinanceLastPriceWire,
  BinancePremiumIndexWire,
  BinanceSymbolFilterWire,
} from "./wire.js";

export type BinanceUsdmAssetRole = "BASE" | "QUOTE" | "SETTLEMENT";

export interface BinanceUsdmAssetResolver {
  resolve(
    officialReference: OfficialAssetReference,
    role: BinanceUsdmAssetRole,
  ): CanonicalAssetId;
}

export interface BinanceUsdmObservationTimes {
  readonly receiveTimestamp: Timestamp;
  readonly processingTimestamp: Timestamp;
}

export interface BinanceUsdmInstrumentBinding {
  readonly wire: BinanceInstrumentWire;
  readonly metadata: InstrumentMetadataObservation;
  readonly instrumentId: InstrumentId;
  readonly displayPair: string;
  readonly supportsFunding: boolean;
}

function context(
  source: typeof BINANCE_USDM_REST_SOURCE | typeof BINANCE_USDM_WS_SOURCE,
  exchangeTimestamp: Timestamp | undefined,
  times: BinanceUsdmObservationTimes,
  quality: QualityState,
): ObservationContext {
  return Object.freeze({
    ...(exchangeTimestamp === undefined ? {} : { exchangeTimestamp }),
    receiveTimestamp: times.receiveTimestamp,
    processingTimestamp: times.processingTimestamp,
    source,
    quality,
  });
}

function lifecycle(
  status: BinanceInstrumentWire["status"],
): InstrumentMetadataObservation["lifecycle"] {
  switch (status) {
    case "PENDING_TRADING":
      return "PRE_LAUNCH";
    case "TRADING":
      return "ACTIVE";
    case "PRE_DELIVERING":
    case "DELIVERING":
    case "PRE_SETTLE":
    case "SETTLING":
      return "SETTLING";
    case "DELIVERED":
      return "EXPIRED";
    case "CLOSE":
      return "DELISTED";
    case "TRADING_HALT":
    case "TRADING_CANCEL_ONLY":
      return "SUSPENDED";
  }
}

function findFilter<T extends BinanceSymbolFilterWire["filterType"]>(
  filters: ReadonlyArray<BinanceSymbolFilterWire>,
  filterType: T,
): Extract<BinanceSymbolFilterWire, { readonly filterType: T }> | undefined {
  const matches = filters.filter((filter) => filter.filterType === filterType);
  if (matches.length > 1) {
    throw new BinanceUsdmSchemaError(
      `Duplicate ${filterType} filters are ambiguous.`,
    );
  }
  return matches[0] as
    Extract<BinanceSymbolFilterWire, { readonly filterType: T }> | undefined;
}

function resolveAsset(
  value: string,
  role: BinanceUsdmAssetRole,
  resolver: BinanceUsdmAssetResolver,
): CanonicalAssetId {
  const resolved = resolver.resolve(officialAssetReference(value), role);
  if (resolved.length === 0) {
    throw new BinanceUsdmSchemaError(
      "Asset resolver returned an empty canonical identity.",
    );
  }
  return resolved;
}

export function mapInstrument(
  row: BinanceInstrumentWire,
  resolver: BinanceUsdmAssetResolver,
  times: BinanceUsdmObservationTimes,
): BinanceUsdmInstrumentBinding {
  const base = resolveAsset(row.baseAsset, "BASE", resolver);
  const quote = resolveAsset(row.quoteAsset, "QUOTE", resolver);
  const settlement = resolveAsset(row.marginAsset, "SETTLEMENT", resolver);
  const perpetual = row.contractType === "PERPETUAL";
  const marketType = perpetual ? ("PERPETUAL" as const) : ("FUTURE" as const);
  const identity = {
    venue: BINANCE_USDM_VENUE,
    productGroup: BINANCE_USDM_PRODUCT_GROUP,
    officialInstrumentId: officialInstrumentId(row.symbol),
    marketType,
    settlementAsset: settlementAsset(settlement),
  };
  const canonicalInstrumentId = instrumentId(identity);
  const priceFilter = findFilter(row.filters, "PRICE_FILTER");
  const lotSize = findFilter(row.filters, "LOT_SIZE");
  const minimumNotional = findFilter(row.filters, "MIN_NOTIONAL");
  const fundingCapabilities = perpetual
    ? known<ReadonlyArray<FundingCapability>>(["LAST", "HISTORICAL"])
    : unsupported<ReadonlyArray<FundingCapability>>(
        "Official Binance funding endpoints apply to perpetual contracts; delivery Futures must not expose funding.",
      );

  const metadata: InstrumentMetadataObservation = Object.freeze({
    kind: "INSTRUMENT_METADATA",
    instrumentId: canonicalInstrumentId,
    venue: BINANCE_USDM_VENUE,
    productGroup: BINANCE_USDM_PRODUCT_GROUP,
    officialInstrumentId: identity.officialInstrumentId,
    displaySymbol: row.symbol,
    baseAsset: base,
    quoteAsset: quoteAsset(quote),
    settlementAsset: identity.settlementAsset,
    marketType,
    contractType: known(
      perpetual ? ("PERPETUAL" as const) : ("DATED_FUTURE" as const),
    ),
    contractMultiplier: unverified<ContractMultiplier>(
      "The current USD-M exchangeInfo schema does not document a contract multiplier.",
    ),
    contractValueConvention: researchRequired<ContractValueConvention>(
      "USD-M product naming is not a substitute for a per-instrument official linear/inverse field.",
    ),
    tickSize:
      priceFilter === undefined
        ? unverified<TickSize>(
            "PRICE_FILTER.tickSize is absent from this instrument row.",
          )
        : known(tickSize(priceFilter.tickSize)),
    quantityStep:
      lotSize === undefined
        ? unverified<QuantityStep>(
            "LOT_SIZE.stepSize is absent from this instrument row.",
          )
        : known(quantityStep(lotSize.stepSize)),
    minimumQuantity:
      lotSize === undefined
        ? unverified<Quantity>(
            "LOT_SIZE.minQty is absent from this instrument row.",
          )
        : known(quantity(lotSize.minQty)),
    minimumNotional:
      minimumNotional === undefined
        ? unknown<Notional>("MIN_NOTIONAL is absent from this instrument row.")
        : known(notional(minimumNotional.notional)),
    fundingCapabilities,
    lifecycle: lifecycle(row.status),
    metadataObservedAt: times.processingTimestamp,
    provenance: {
      sourceId: BINANCE_USDM_REST_SOURCE,
      retrievalDate: BINANCE_USDM_RETRIEVAL_DATE,
    },
    context: context(BINANCE_USDM_REST_SOURCE, undefined, times, "HEALTHY"),
  });

  return Object.freeze({
    wire: row,
    metadata,
    instrumentId: canonicalInstrumentId,
    displayPair: row.pair,
    supportsFunding: perpetual,
  });
}

function assertSymbol(
  symbol: string,
  binding: BinanceUsdmInstrumentBinding,
): void {
  if (symbol !== binding.wire.symbol) {
    throw new BinanceUsdmSchemaError(
      "Binance response symbol does not match the bound official instrument ID.",
    );
  }
}

function priceObservation(
  kind: MarketPriceObservation["kind"],
  value: string,
  exchangeTimestamp: Timestamp,
  binding: BinanceUsdmInstrumentBinding,
  times: BinanceUsdmObservationTimes,
  quality: QualityState,
): MarketPriceObservation {
  return {
    kind,
    instrumentId: binding.instrumentId,
    value: price(value),
    observedAt: exchangeTimestamp,
    provenance: {
      sourceId: BINANCE_USDM_REST_SOURCE,
      retrievalDate: BINANCE_USDM_RETRIEVAL_DATE,
    },
    context: context(
      BINANCE_USDM_REST_SOURCE,
      exchangeTimestamp,
      times,
      quality,
    ),
  } as MarketPriceObservation;
}

export function mapLastPrice(
  row: BinanceLastPriceWire,
  binding: BinanceUsdmInstrumentBinding,
  times: BinanceUsdmObservationTimes,
  freshness: BinanceUsdmFreshnessConfiguration,
): MarketPriceObservation {
  assertSymbol(row.symbol, binding);
  const observedAt = epochMilliseconds(row.time, "ticker.time");
  return priceObservation(
    "LAST_PRICE",
    row.price,
    observedAt,
    binding,
    times,
    qualityForTimestamp(observedAt, times.receiveTimestamp, freshness),
  );
}

export function mapBookTicker(
  row: BinanceBookTickerWire,
  binding: BinanceUsdmInstrumentBinding,
  times: BinanceUsdmObservationTimes,
  freshness: BinanceUsdmFreshnessConfiguration,
): ReadonlyArray<MarketPriceObservation> {
  assertSymbol(row.symbol, binding);
  const observedAt = epochMilliseconds(row.time, "bookTicker.time");
  let quality = qualityForTimestamp(
    observedAt,
    times.receiveTimestamp,
    freshness,
  );
  if (price(row.bidPrice).compare(price(row.askPrice)) >= 0) quality = "STALE";
  return Object.freeze([
    priceObservation(
      "BID_PRICE",
      row.bidPrice,
      observedAt,
      binding,
      times,
      quality,
    ),
    priceObservation(
      "ASK_PRICE",
      row.askPrice,
      observedAt,
      binding,
      times,
      quality,
    ),
  ]);
}

export function mapPremiumPrices(
  row: BinancePremiumIndexWire,
  binding: BinanceUsdmInstrumentBinding,
  times: BinanceUsdmObservationTimes,
  freshness: BinanceUsdmFreshnessConfiguration,
): ReadonlyArray<MarketPriceObservation> {
  assertSymbol(row.symbol, binding);
  const observedAt = epochMilliseconds(row.time, "premiumIndex.time");
  const quality = qualityForTimestamp(
    observedAt,
    times.receiveTimestamp,
    freshness,
  );
  return Object.freeze([
    priceObservation(
      "MARK_PRICE",
      row.markPrice,
      observedAt,
      binding,
      times,
      quality,
    ),
    priceObservation(
      "INDEX_PRICE",
      row.indexPrice,
      observedAt,
      binding,
      times,
      quality,
    ),
  ]);
}

export function mapLatestFunding(
  row: BinancePremiumIndexWire,
  binding: BinanceUsdmInstrumentBinding,
  interval: BinanceFundingInfoWire | undefined,
  times: BinanceUsdmObservationTimes,
  freshness: BinanceUsdmFreshnessConfiguration,
): FundingObservation {
  assertSymbol(row.symbol, binding);
  if (!binding.supportsFunding) {
    throw new BinanceUsdmSchemaError(
      "Delivery Futures cannot be mapped to funding observations.",
    );
  }
  const observedAt = epochMilliseconds(row.time, "premiumIndex.time");
  const nextSettlement =
    row.nextFundingTime === "0"
      ? unknown<Timestamp>("Binance returned zero for nextFundingTime.")
      : known(
          epochMilliseconds(
            row.nextFundingTime,
            "premiumIndex.nextFundingTime",
          ),
        );
  const nativeRate =
    row.lastFundingRate === ""
      ? unknown<ReturnType<typeof fundingRate>>(
          "Latest funding rate is absent.",
        )
      : known(fundingRate(row.lastFundingRate));
  const documentedInterval =
    interval === undefined
      ? unknown<ReturnType<typeof durationSeconds>>(
          "fundingInfo only lists adjusted symbols; no per-symbol interval was documented for this row.",
        )
      : known(
          durationSeconds(
            (BigInt(interval.fundingIntervalHours) * 3_600n).toString(),
          ),
        );
  return Object.freeze({
    kind: "FUNDING",
    instrumentId: binding.instrumentId,
    venueNativeRate: nativeRate,
    semantic: row.lastFundingRate === "" ? "UNKNOWN" : "LAST",
    interval: documentedInterval,
    observedAt,
    nextSettlementTime: nextSettlement,
    provenance: {
      sourceId: BINANCE_USDM_REST_SOURCE,
      retrievalDate: BINANCE_USDM_RETRIEVAL_DATE,
    },
    context: context(
      BINANCE_USDM_REST_SOURCE,
      observedAt,
      times,
      qualityForTimestamp(observedAt, times.receiveTimestamp, freshness),
    ),
  });
}

export function mapFundingHistory(
  row: BinanceFundingHistoryWire,
  binding: BinanceUsdmInstrumentBinding,
  interval: BinanceFundingInfoWire | undefined,
  times: BinanceUsdmObservationTimes,
  freshness: BinanceUsdmFreshnessConfiguration,
): FundingObservation {
  assertSymbol(row.symbol, binding);
  if (!binding.supportsFunding) {
    throw new BinanceUsdmSchemaError(
      "Delivery Futures cannot expose funding history.",
    );
  }
  if (row.rateType === "Special") {
    throw new BinanceUsdmSchemaError(
      "Special funding-history rows require a distinct approved canonical semantic.",
    );
  }
  const observedAt = epochMilliseconds(
    row.fundingTime,
    "fundingHistory.fundingTime",
  );
  return Object.freeze({
    kind: "FUNDING",
    instrumentId: binding.instrumentId,
    venueNativeRate: known(fundingRate(row.fundingRate)),
    semantic: "LAST",
    interval:
      interval === undefined
        ? unknown<DurationSeconds>(
            "No adjusted funding interval row exists for this symbol.",
          )
        : known(
            durationSeconds(
              (BigInt(interval.fundingIntervalHours) * 3_600n).toString(),
            ),
          ),
    observedAt,
    nextSettlementTime: unknown<Timestamp>(
      "Historical funding records do not document a next settlement timestamp.",
    ),
    provenance: {
      sourceId: BINANCE_USDM_REST_SOURCE,
      retrievalDate: BINANCE_USDM_RETRIEVAL_DATE,
    },
    context: context(
      BINANCE_USDM_REST_SOURCE,
      observedAt,
      times,
      qualityForTimestamp(observedAt, times.receiveTimestamp, freshness),
    ),
  });
}

function mapLevel(row: BinanceBookLevelWire): BookLevel {
  return Object.freeze({
    price: price(row.price),
    quantity: quantity(row.quantity),
  });
}

export function mapDepthSnapshot(
  row: BinanceDepthSnapshotWire,
  binding: BinanceUsdmInstrumentBinding,
  times: BinanceUsdmObservationTimes,
  freshness: BinanceUsdmFreshnessConfiguration,
  replacement = false,
): Extract<BookUpdate, { readonly kind: "SNAPSHOT" | "REPLACEMENT_SNAPSHOT" }> {
  const exchangeTimestamp = epochMilliseconds(row.eventTime, "depth.E");
  const common = {
    instrumentId: binding.instrumentId,
    updateId: updateId(row.lastUpdateId),
    bids: Object.freeze(row.bids.map(mapLevel)),
    asks: Object.freeze(row.asks.map(mapLevel)),
    context: context(
      BINANCE_USDM_REST_SOURCE,
      exchangeTimestamp,
      times,
      qualityForTimestamp(exchangeTimestamp, times.receiveTimestamp, freshness),
    ),
  };
  return Object.freeze(
    replacement
      ? { ...common, kind: "REPLACEMENT_SNAPSHOT" as const }
      : { ...common, kind: "SNAPSHOT" as const },
  );
}

export function mapDiffDepth(
  row: BinanceDiffDepthWire,
  binding: BinanceUsdmInstrumentBinding,
  times: BinanceUsdmObservationTimes,
  freshness: BinanceUsdmFreshnessConfiguration,
): BookDelta {
  assertSymbol(row.symbol, binding);
  if (row.pair !== binding.displayPair) {
    throw new BinanceUsdmSchemaError(
      "Diff-depth pair does not match exchangeInfo pair.",
    );
  }
  if (
    row.stream !== undefined &&
    !row.stream.startsWith(`${row.symbol.toLowerCase()}@depth`)
  ) {
    throw new BinanceUsdmSchemaError(
      "Combined-stream name does not match the bound symbol.",
    );
  }
  const exchangeTimestamp = epochMilliseconds(row.eventTime, "depthUpdate.E");
  return Object.freeze({
    kind: "DELTA",
    instrumentId: binding.instrumentId,
    firstUpdateId: updateId(row.firstUpdateId),
    updateId: updateId(row.finalUpdateId),
    previousUpdateId: updateId(row.previousFinalUpdateId),
    bidChanges: Object.freeze(row.bids.map(mapLevel)),
    askChanges: Object.freeze(row.asks.map(mapLevel)),
    context: context(
      BINANCE_USDM_WS_SOURCE,
      exchangeTimestamp,
      times,
      qualityForTimestamp(exchangeTimestamp, times.receiveTimestamp, freshness),
    ),
  });
}
