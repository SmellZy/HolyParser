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
  settlementAsset,
  tickSize,
  unsupported,
  unknown,
  unverified,
  updateId,
  type BookDelta,
  type BookLevel,
  type BookSnapshot,
  type CanonicalAssetId,
  type ContractMultiplier,
  type FundingCapability,
  type FundingObservation,
  type FundingRate,
  type InstrumentId,
  type InstrumentMetadataObservation,
  type MarketPriceObservation,
  type ObservationContext,
  type OfficialAssetReference,
  type QualityState,
  type ReplacementSnapshot,
  type Timestamp,
} from "@arbitrage/market-data";
import {
  BYBIT_FUNDING_SOURCE,
  BYBIT_INSTRUMENT_SOURCE,
  BYBIT_LINEAR_PRODUCT_GROUP,
  BYBIT_LINEAR_VENUE,
  BYBIT_REST_BOOK_SOURCE,
  BYBIT_RETRIEVAL_DATE,
  BYBIT_TICKER_SOURCE,
  BYBIT_WS_BOOK_SOURCE,
} from "./constants.js";
import { BybitLinearSchemaError } from "./errors.js";
import { qualityForTimestamp, type BybitFreshnessPolicy } from "./freshness.js";
import { epochMilliseconds } from "./time.js";
import type {
  BybitBookLevelWire,
  BybitFundingHistoryWire,
  BybitInstrumentWire,
  BybitRestBookWire,
  BybitTickerWire,
  BybitWsBookWire,
} from "./wire.js";

export type BybitAssetRole = "BASE" | "QUOTE" | "SETTLEMENT";
export interface BybitAssetResolver {
  resolve(
    reference: OfficialAssetReference,
    role: BybitAssetRole,
  ): CanonicalAssetId;
}
export interface BybitObservationTimes {
  readonly receiveTimestamp: Timestamp;
  readonly processingTimestamp: Timestamp;
}
export interface BybitInstrumentBinding {
  readonly wire: BybitInstrumentWire;
  readonly metadata: InstrumentMetadataObservation;
  readonly instrumentId: InstrumentId;
  readonly supportsFunding: boolean;
}

function context(
  source: ObservationContext["source"],
  exchangeTimestamp: Timestamp | undefined,
  times: BybitObservationTimes,
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
function resolveAsset(
  value: string,
  role: BybitAssetRole,
  resolver: BybitAssetResolver,
): CanonicalAssetId {
  const resolved = resolver.resolve(officialAssetReference(value), role);
  if (resolved.length === 0)
    throw new BybitLinearSchemaError(
      "Asset resolver returned an empty identity.",
      "BYBIT-02",
    );
  return resolved;
}
function lifecycle(
  status: BybitInstrumentWire["status"],
): InstrumentMetadataObservation["lifecycle"] {
  switch (status) {
    case "PreLaunch":
      return "PRE_LAUNCH";
    case "Trading":
      return "ACTIVE";
    case "Delivering":
      return "SETTLING";
    case "Closed":
      return "EXPIRED";
  }
}

export function mapInstrument(
  row: BybitInstrumentWire,
  resolver: BybitAssetResolver,
  times: BybitObservationTimes,
): BybitInstrumentBinding {
  const base = resolveAsset(row.baseCoin, "BASE", resolver);
  const quote = resolveAsset(row.quoteCoin, "QUOTE", resolver);
  const settlement = resolveAsset(row.settleCoin, "SETTLEMENT", resolver);
  const perpetual = row.contractType === "LinearPerpetual";
  if (perpetual && row.fundingIntervalMinutes <= 0) {
    throw new BybitLinearSchemaError(
      "Linear perpetual has no positive documented funding interval.",
      "BYBIT-02",
    );
  }
  const marketType = perpetual ? ("PERPETUAL" as const) : ("FUTURE" as const);
  const officialId = officialInstrumentId(row.symbol);
  const settlementId = settlementAsset(settlement);
  const canonicalId = instrumentId({
    venue: BYBIT_LINEAR_VENUE,
    productGroup: BYBIT_LINEAR_PRODUCT_GROUP,
    officialInstrumentId: officialId,
    marketType,
    settlementAsset: settlementId,
  });
  const fundingCapabilities = perpetual
    ? known<readonly FundingCapability[]>(["CURRENT", "HISTORICAL"])
    : unsupported<readonly FundingCapability[]>(
        "Bybit funding history covers perpetual contracts; delivery Futures do not receive fake funding.",
      );
  const metadata: InstrumentMetadataObservation = Object.freeze({
    kind: "INSTRUMENT_METADATA",
    instrumentId: canonicalId,
    venue: BYBIT_LINEAR_VENUE,
    productGroup: BYBIT_LINEAR_PRODUCT_GROUP,
    officialInstrumentId: officialId,
    displaySymbol: row.symbol,
    baseAsset: base,
    quoteAsset: quoteAsset(quote),
    settlementAsset: settlementId,
    marketType,
    contractType: known(
      perpetual ? ("PERPETUAL" as const) : ("DATED_FUTURE" as const),
    ),
    contractMultiplier: unverified<ContractMultiplier>(
      "No unambiguous multiplier field is documented for V5 linear instruments.",
    ),
    contractValueConvention: known("LINEAR" as const),
    tickSize: known(tickSize(row.tickSize)),
    quantityStep: known(quantityStep(row.qtyStep)),
    minimumQuantity: known(quantity(row.minOrderQty)),
    minimumNotional: known(notional(row.minNotionalValue)),
    fundingCapabilities,
    lifecycle: lifecycle(row.status),
    metadataObservedAt: times.processingTimestamp,
    provenance: {
      sourceId: BYBIT_INSTRUMENT_SOURCE,
      retrievalDate: BYBIT_RETRIEVAL_DATE,
    },
    context: context(BYBIT_INSTRUMENT_SOURCE, undefined, times, "HEALTHY"),
  });
  return Object.freeze({
    wire: row,
    metadata,
    instrumentId: canonicalId,
    supportsFunding: perpetual,
  });
}

function assertSymbol(symbol: string, binding: BybitInstrumentBinding): void {
  if (symbol !== binding.wire.symbol)
    throw new BybitLinearSchemaError(
      "Response symbol does not match the bound official instrument ID.",
    );
}
function priceObservation(
  kind: MarketPriceObservation["kind"],
  value: string,
  observedAt: Timestamp,
  binding: BybitInstrumentBinding,
  times: BybitObservationTimes,
  quality: QualityState,
): MarketPriceObservation {
  return {
    kind,
    instrumentId: binding.instrumentId,
    value: price(value),
    observedAt,
    provenance: {
      sourceId: BYBIT_TICKER_SOURCE,
      retrievalDate: BYBIT_RETRIEVAL_DATE,
    },
    context: context(BYBIT_TICKER_SOURCE, observedAt, times, quality),
  } as MarketPriceObservation;
}

export function mapTicker(
  row: BybitTickerWire,
  binding: BybitInstrumentBinding,
  times: BybitObservationTimes,
  freshness: BybitFreshnessPolicy,
): {
  readonly prices: readonly MarketPriceObservation[];
  readonly funding?: FundingObservation;
} {
  assertSymbol(row.symbol, binding);
  const observedAt = epochMilliseconds(row.responseTime, "ticker.time");
  let quality = qualityForTimestamp(
    observedAt,
    times.receiveTimestamp,
    freshness,
  );
  if (price(row.bid1Price).compare(price(row.ask1Price)) >= 0)
    quality = "STALE";
  const prices = Object.freeze([
    priceObservation(
      "LAST_PRICE",
      row.lastPrice,
      observedAt,
      binding,
      times,
      quality,
    ),
    priceObservation(
      "BID_PRICE",
      row.bid1Price,
      observedAt,
      binding,
      times,
      quality,
    ),
    priceObservation(
      "ASK_PRICE",
      row.ask1Price,
      observedAt,
      binding,
      times,
      quality,
    ),
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
  if (!binding.supportsFunding) return { prices };
  const intervalSeconds =
    row.fundingIntervalHour === undefined
      ? BigInt(binding.wire.fundingIntervalMinutes) * 60n
      : BigInt(row.fundingIntervalHour) * 3_600n;
  if (intervalSeconds <= 0n)
    throw new BybitLinearSchemaError(
      "Funding interval must be positive.",
      "BYBIT-02",
    );
  const next =
    row.nextFundingTime === undefined
      ? ({
          state: "UNKNOWN",
          reason: "Ticker omitted nextFundingTime.",
        } as const)
      : known(epochMilliseconds(row.nextFundingTime, "ticker.nextFundingTime"));
  return {
    prices,
    funding: Object.freeze({
      kind: "FUNDING",
      instrumentId: binding.instrumentId,
      venueNativeRate:
        row.fundingRate === undefined
          ? unknown<FundingRate>("Ticker omitted fundingRate.")
          : known(fundingRate(row.fundingRate)),
      semantic: row.fundingRate === undefined ? "UNKNOWN" : "CURRENT",
      interval: known(durationSeconds(intervalSeconds.toString())),
      observedAt,
      nextSettlementTime: next,
      provenance: {
        sourceId: BYBIT_TICKER_SOURCE,
        retrievalDate: BYBIT_RETRIEVAL_DATE,
      },
      context: context(BYBIT_TICKER_SOURCE, observedAt, times, quality),
    }),
  };
}

export function mapFundingHistory(
  row: BybitFundingHistoryWire,
  binding: BybitInstrumentBinding,
  times: BybitObservationTimes,
): FundingObservation {
  assertSymbol(row.symbol, binding);
  if (!binding.supportsFunding)
    throw new BybitLinearSchemaError(
      "Delivery Futures cannot expose perpetual funding history.",
      "BYBIT-04",
    );
  const settledAt = epochMilliseconds(
    row.fundingRateTimestamp,
    "fundingRateTimestamp",
  );
  return Object.freeze({
    kind: "FUNDING",
    instrumentId: binding.instrumentId,
    venueNativeRate: known(fundingRate(row.fundingRate)),
    semantic: "LAST",
    interval: known(
      durationSeconds(
        (BigInt(binding.wire.fundingIntervalMinutes) * 60n).toString(),
      ),
    ),
    observedAt: settledAt,
    nextSettlementTime: unknown<Timestamp>(
      "Historical rows do not identify the next settlement.",
    ),
    provenance: {
      sourceId: BYBIT_FUNDING_SOURCE,
      retrievalDate: BYBIT_RETRIEVAL_DATE,
    },
    context: context(BYBIT_FUNDING_SOURCE, settledAt, times, "HEALTHY"),
  });
}

function levels(rows: readonly BybitBookLevelWire[]): readonly BookLevel[] {
  return Object.freeze(
    rows.map(([p, q]) =>
      Object.freeze({ price: price(p), quantity: quantity(q) }),
    ),
  );
}
function normalizedSnapshotLevels(
  rows: readonly BybitBookLevelWire[],
  side: "BID" | "ASK",
): readonly BookLevel[] {
  const mapped = levels(rows);
  const seen = new Set<string>();
  for (const level of mapped) {
    const key = level.price.toString();
    if (seen.has(key)) {
      throw new BybitLinearSchemaError(
        `REST snapshot contains a duplicate ${side.toLowerCase()} price.`,
        "BYBIT-05",
      );
    }
    seen.add(key);
  }
  return Object.freeze(
    [...mapped].sort((left, right) =>
      side === "BID"
        ? right.price.compare(left.price)
        : left.price.compare(right.price),
    ),
  );
}
export function mapRestBook(
  row: BybitRestBookWire,
  binding: BybitInstrumentBinding,
  times: BybitObservationTimes,
  freshness: BybitFreshnessPolicy,
): BookSnapshot {
  assertSymbol(row.symbol, binding);
  const observedAt = epochMilliseconds(row.timestamp, "orderbook.ts");
  const bids = normalizedSnapshotLevels(row.bids, "BID");
  const asks = normalizedSnapshotLevels(row.asks, "ASK");
  if (
    bids[0] !== undefined &&
    asks[0] !== undefined &&
    bids[0].price.compare(asks[0].price) >= 0
  ) {
    throw new BybitLinearSchemaError(
      "REST snapshot is locked or crossed.",
      "BYBIT-05",
    );
  }
  return Object.freeze({
    kind: "SNAPSHOT",
    instrumentId: binding.instrumentId,
    updateId: updateId(row.updateId),
    bids,
    asks,
    context: context(
      BYBIT_REST_BOOK_SOURCE,
      observedAt,
      times,
      qualityForTimestamp(observedAt, times.receiveTimestamp, freshness),
    ),
  });
}
export function mapWsBook(
  row: BybitWsBookWire,
  binding: BybitInstrumentBinding,
  times: BybitObservationTimes,
  kind: "INITIAL" | "REPLACEMENT" | "DELTA",
  freshness: BybitFreshnessPolicy,
): BookSnapshot | ReplacementSnapshot | BookDelta {
  assertSymbol(row.symbol, binding);
  const exchangeTimestamp = epochMilliseconds(row.timestamp, "ws.ts");
  const bookContext = context(
    BYBIT_WS_BOOK_SOURCE,
    exchangeTimestamp,
    times,
    qualityForTimestamp(exchangeTimestamp, times.receiveTimestamp, freshness),
  );
  if (kind === "DELTA")
    return Object.freeze({
      kind: "DELTA",
      instrumentId: binding.instrumentId,
      updateId: updateId(row.updateId),
      bidChanges: levels(row.bids),
      askChanges: levels(row.asks),
      context: bookContext,
    });
  return Object.freeze({
    kind: kind === "REPLACEMENT" ? "REPLACEMENT_SNAPSHOT" : "SNAPSHOT",
    instrumentId: binding.instrumentId,
    updateId: updateId(row.updateId),
    bids: levels(row.bids),
    asks: levels(row.asks),
    context: bookContext,
  });
}
