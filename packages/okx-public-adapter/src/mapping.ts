import {
  canonicalAssetId,
  contractMultiplier,
  durationSeconds,
  fundingRate,
  instrumentId,
  known,
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
  type CanonicalAssetId,
  type FundingObservation,
  type FundingCapability,
  type DurationSeconds,
  type InstrumentId,
  type InstrumentMetadataObservation,
  type MarketPriceObservation,
  type Notional,
  type ObservationContext,
  type OfficialAssetReference,
  type QualityState,
  type Timestamp,
} from "@arbitrage/market-data";
import {
  OKX_API_SOURCE,
  OKX_PRODUCT_GROUP,
  OKX_RETRIEVAL_DATE,
  OKX_VENUE,
} from "./constants.js";
import { OkxSchemaError } from "./errors.js";
import {
  qualityForExchangeTimestamp,
  type OkxFreshnessConfiguration,
} from "./freshness.js";
import { durationBetweenEpochMilliseconds, epochMilliseconds } from "./time.js";
import type {
  OkxBookLevelWire,
  OkxFundingHistoryWire,
  OkxFundingRateWire,
  OkxIndexTickerWire,
  OkxInstrumentWire,
  OkxMarkPriceWire,
  OkxRestBookWire,
  OkxTickerWire,
} from "./wire.js";
import {
  updateId,
  type BookLevel,
  type BookSnapshot,
  type BookUpdate,
} from "@arbitrage/market-data";

export type OkxAssetRole = "BASE" | "QUOTE" | "SETTLEMENT";

export interface OkxAssetResolver {
  resolve(
    officialReference: OfficialAssetReference,
    role: OkxAssetRole,
  ): CanonicalAssetId;
}

export interface OkxObservationTimes {
  readonly receiveTimestamp: Timestamp;
  readonly processingTimestamp: Timestamp;
}

export interface OkxInstrumentBinding {
  readonly wire: OkxInstrumentWire;
  readonly metadata: InstrumentMetadataObservation;
  readonly instrumentId: InstrumentId;
  readonly indexInstrumentId: string;
}

function context(
  exchangeTimestamp: Timestamp | undefined,
  times: OkxObservationTimes,
  quality: QualityState = "HEALTHY",
): ObservationContext {
  return Object.freeze({
    ...(exchangeTimestamp === undefined ? {} : { exchangeTimestamp }),
    receiveTimestamp: times.receiveTimestamp,
    processingTimestamp: times.processingTimestamp,
    source: OKX_API_SOURCE,
    quality,
  });
}

function resolveAssets(
  row: OkxInstrumentWire,
  resolver: OkxAssetResolver,
): Readonly<{
  base: CanonicalAssetId;
  quote: CanonicalAssetId;
  settlement: CanonicalAssetId;
}> {
  const settlementReference = officialAssetReference(row.settleCcy);
  const valueReference = officialAssetReference(row.ctValCcy);

  if (row.baseCcy !== "" || row.quoteCcy !== "") {
    throw new OkxSchemaError(
      "OKX derivatives baseCcy/quoteCcy must not be used as canonical identity fields.",
    );
  }

  if (row.ctType === "linear") {
    return Object.freeze({
      base: resolver.resolve(valueReference, "BASE"),
      quote: resolver.resolve(settlementReference, "QUOTE"),
      settlement: resolver.resolve(settlementReference, "SETTLEMENT"),
    });
  }

  return Object.freeze({
    base: resolver.resolve(settlementReference, "BASE"),
    quote: resolver.resolve(valueReference, "QUOTE"),
    settlement: resolver.resolve(settlementReference, "SETTLEMENT"),
  });
}

function lifecycle(
  state: OkxInstrumentWire["state"],
): InstrumentMetadataObservation["lifecycle"] {
  switch (state) {
    case "live":
      return "ACTIVE";
    case "preopen":
      return "PRE_LAUNCH";
    case "settling":
      return "SETTLING";
    case "suspend":
    case "rebase":
    case "post_only":
    case "test":
      return "SUSPENDED";
  }
}

function isPerpetual(row: OkxInstrumentWire): boolean {
  return (
    row.instType === "SWAP" ||
    (row.instType === "FUTURES" &&
      (row.ruleType === "xperp" || row.ruleType === "pre_market"))
  );
}

export function mapInstrument(
  row: OkxInstrumentWire,
  resolver: OkxAssetResolver,
  times: OkxObservationTimes,
): OkxInstrumentBinding {
  if (
    row.ctMult !== "" &&
    !contractMultiplier(row.ctMult).equals(contractMultiplier("1"))
  ) {
    throw new OkxSchemaError(
      "OKX ctMult is not 1; the canonical contract-value mapping requires renewed official research.",
    );
  }
  const assets = resolveAssets(row, resolver);
  const identity = {
    venue: OKX_VENUE,
    productGroup: OKX_PRODUCT_GROUP,
    officialInstrumentId: officialInstrumentId(row.instId),
    marketType: isPerpetual(row) ? ("PERPETUAL" as const) : ("FUTURE" as const),
    settlementAsset: settlementAsset(assets.settlement),
  };
  const canonicalInstrumentId = instrumentId(identity);
  const fundingSupported = isPerpetual(row);

  const metadata: InstrumentMetadataObservation = Object.freeze({
    kind: "INSTRUMENT_METADATA",
    instrumentId: canonicalInstrumentId,
    venue: OKX_VENUE,
    productGroup: OKX_PRODUCT_GROUP,
    officialInstrumentId: identity.officialInstrumentId,
    displaySymbol: row.instId,
    baseAsset: assets.base,
    quoteAsset: quoteAsset(assets.quote),
    settlementAsset: identity.settlementAsset,
    marketType: identity.marketType,
    contractType: known(
      isPerpetual(row) ? ("PERPETUAL" as const) : ("DATED_FUTURE" as const),
    ),
    contractMultiplier: known(contractMultiplier(row.ctVal)),
    contractValueConvention: known(
      row.ctType === "linear" ? ("LINEAR" as const) : ("INVERSE" as const),
    ),
    tickSize: known(tickSize(row.tickSz)),
    quantityStep: known(quantityStep(row.lotSz)),
    minimumQuantity: known(quantity(row.minSz)),
    minimumNotional: unverified<Notional>(
      "OKX V5 public instruments does not document a derivative minimum-notional field.",
    ),
    fundingCapabilities: fundingSupported
      ? known<ReadonlyArray<FundingCapability>>([
          "PREDICTED",
          "CURRENT",
          "LAST",
          "HISTORICAL",
        ])
      : unsupported<ReadonlyArray<FundingCapability>>(
          "Traditional expiry FUTURES are not supported by the documented funding endpoints.",
        ),
    lifecycle: lifecycle(row.state),
    metadataObservedAt: times.processingTimestamp,
    provenance: {
      sourceId: OKX_API_SOURCE,
      retrievalDate: OKX_RETRIEVAL_DATE,
    },
    context: context(undefined, times),
  });

  if (row.uly === "") {
    throw new OkxSchemaError(
      "OKX derivative instrument is missing the documented underlying/index identifier.",
    );
  }

  return Object.freeze({
    wire: row,
    metadata,
    instrumentId: canonicalInstrumentId,
    indexInstrumentId: row.uly,
  });
}

function priceObservation(
  kind: MarketPriceObservation["kind"],
  value: string,
  observedAt: Timestamp,
  binding: OkxInstrumentBinding,
  times: OkxObservationTimes,
  quality: QualityState,
): MarketPriceObservation {
  return {
    kind,
    instrumentId: binding.instrumentId,
    value: price(value),
    observedAt,
    provenance: {
      sourceId: OKX_API_SOURCE,
      retrievalDate: OKX_RETRIEVAL_DATE,
    },
    context: context(observedAt, times, quality),
  } as MarketPriceObservation;
}

export function mapTicker(
  row: OkxTickerWire,
  binding: OkxInstrumentBinding,
  times: OkxObservationTimes,
  freshness: OkxFreshnessConfiguration,
): ReadonlyArray<MarketPriceObservation> {
  assertInstrumentMatch(row.instId, row.instType, binding);
  const observedAt = epochMilliseconds(row.ts, "ticker.ts");
  let quality = qualityForExchangeTimestamp(
    observedAt,
    times.receiveTimestamp,
    freshness,
  );
  if (
    row.bidPx !== "" &&
    row.askPx !== "" &&
    price(row.bidPx).compare(price(row.askPx)) >= 0
  ) {
    quality = "STALE";
  }
  const observations: MarketPriceObservation[] = [];
  if (row.last !== "") {
    observations.push(
      priceObservation(
        "LAST_PRICE",
        row.last,
        observedAt,
        binding,
        times,
        quality,
      ),
    );
  }
  if (row.bidPx !== "") {
    observations.push(
      priceObservation(
        "BID_PRICE",
        row.bidPx,
        observedAt,
        binding,
        times,
        quality,
      ),
    );
  }
  if (row.askPx !== "") {
    observations.push(
      priceObservation(
        "ASK_PRICE",
        row.askPx,
        observedAt,
        binding,
        times,
        quality,
      ),
    );
  }
  return observations;
}

export function mapMarkPrice(
  row: OkxMarkPriceWire,
  binding: OkxInstrumentBinding,
  times: OkxObservationTimes,
  freshness: OkxFreshnessConfiguration,
): MarketPriceObservation {
  assertInstrumentMatch(row.instId, row.instType, binding);
  const observedAt = epochMilliseconds(row.ts, "mark-price.ts");
  return priceObservation(
    "MARK_PRICE",
    row.markPx,
    observedAt,
    binding,
    times,
    qualityForExchangeTimestamp(observedAt, times.receiveTimestamp, freshness),
  );
}

export function mapIndexPrice(
  row: OkxIndexTickerWire,
  binding: OkxInstrumentBinding,
  times: OkxObservationTimes,
  freshness: OkxFreshnessConfiguration,
): MarketPriceObservation {
  if (row.instId !== binding.indexInstrumentId) {
    throw new OkxSchemaError(
      "Index response does not match the instrument's official OKX underlying identifier.",
    );
  }
  const observedAt = epochMilliseconds(row.ts, "index-ticker.ts");
  return priceObservation(
    "INDEX_PRICE",
    row.idxPx,
    observedAt,
    binding,
    times,
    qualityForExchangeTimestamp(observedAt, times.receiveTimestamp, freshness),
  );
}

export function mapFundingRate(
  row: OkxFundingRateWire,
  binding: OkxInstrumentBinding,
  times: OkxObservationTimes,
  freshness: OkxFreshnessConfiguration,
): ReadonlyArray<FundingObservation> {
  assertInstrumentMatch(row.instId, row.instType, binding);
  if (!isPerpetual(binding.wire)) {
    throw new OkxSchemaError(
      "Funding payload cannot be mapped to a traditional expiry future.",
    );
  }
  const observedAt = epochMilliseconds(row.ts, "funding.ts");
  const quality = qualityForExchangeTimestamp(
    observedAt,
    times.receiveTimestamp,
    freshness,
  );
  if (row.nextFundingRate !== "") {
    throw new OkxSchemaError(
      "OKX current_period nextFundingRate must remain empty under the verified contract.",
    );
  }
  const interval = known(
    durationSeconds(
      durationBetweenEpochMilliseconds(
        row.fundingTime,
        row.nextFundingTime,
        "funding interval",
      ),
    ),
  );
  const provenance = {
    sourceId: OKX_API_SOURCE,
    retrievalDate: OKX_RETRIEVAL_DATE,
  };
  const observations: FundingObservation[] = [
    {
      kind: "FUNDING",
      instrumentId: binding.instrumentId,
      venueNativeRate: known(fundingRate(row.fundingRate)),
      semantic: "PREDICTED",
      interval,
      observedAt,
      nextSettlementTime: known(
        epochMilliseconds(row.fundingTime, "funding.fundingTime"),
      ),
      provenance,
      context: context(observedAt, times, quality),
    },
  ];

  if (row.settFundingRate !== "") {
    observations.push({
      kind: "FUNDING",
      instrumentId: binding.instrumentId,
      venueNativeRate: known(fundingRate(row.settFundingRate)),
      semantic: row.settState === "processing" ? "CURRENT" : "LAST",
      interval,
      observedAt,
      nextSettlementTime:
        row.settState === "processing"
          ? known(epochMilliseconds(row.fundingTime, "funding.fundingTime"))
          : unknown("A last-settled observation has no future settlement."),
      provenance,
      context: context(observedAt, times, quality),
    });
  }

  return observations;
}

export function mapFundingHistoryRow(
  row: OkxFundingHistoryWire,
  binding: OkxInstrumentBinding,
  times: OkxObservationTimes,
): ReadonlyArray<FundingObservation> {
  assertInstrumentMatch(row.instId, row.instType, binding);
  const observedAt = epochMilliseconds(
    row.fundingTime,
    "funding-history.fundingTime",
  );
  const common = {
    kind: "FUNDING" as const,
    instrumentId: binding.instrumentId,
    interval: researchRequired<DurationSeconds>(
      "The history row does not contain a documented interval; adjacent rows are not silently treated as a per-observation contract.",
    ),
    observedAt,
    nextSettlementTime: unknown<Timestamp>(
      "Historical rows do not document a next settlement timestamp.",
    ),
    provenance: {
      sourceId: OKX_API_SOURCE,
      retrievalDate: OKX_RETRIEVAL_DATE,
    },
    context: context(observedAt, times),
  };
  const result: FundingObservation[] = [
    {
      ...common,
      venueNativeRate: known(fundingRate(row.fundingRate)),
      semantic: "PREDICTED",
    },
  ];
  if (row.realizedRate !== "") {
    result.push({
      ...common,
      venueNativeRate: known(fundingRate(row.realizedRate)),
      semantic: "LAST",
    });
  }
  return result;
}

function mapBookLevels(
  rows: ReadonlyArray<OkxBookLevelWire>,
): ReadonlyArray<BookLevel> {
  return rows.map(([rawPrice, rawQuantity, deprecated, orderCount]) => {
    if (deprecated !== "0" || !/^(?:0|[1-9]\d*)$/.test(orderCount)) {
      throw new OkxSchemaError(
        "OKX book level has invalid deprecated or order-count metadata.",
      );
    }
    return Object.freeze({
      price: price(rawPrice),
      quantity: quantity(rawQuantity),
    });
  });
}

function normalizedSnapshotLevels(
  rows: ReadonlyArray<OkxBookLevelWire>,
  side: "BID" | "ASK",
): ReadonlyArray<BookLevel> {
  const levels = mapBookLevels(rows);
  const seen = new Set<string>();
  for (const level of levels) {
    if (level.quantity.isZero()) {
      throw new OkxSchemaError(
        `OKX REST snapshot contains a zero-quantity ${side.toLowerCase()} level.`,
      );
    }
    const key = level.price.toString();
    if (seen.has(key)) {
      throw new OkxSchemaError(
        `OKX REST snapshot contains a duplicate ${side.toLowerCase()} price.`,
      );
    }
    seen.add(key);
  }
  return [...levels].sort((left, right) =>
    side === "BID"
      ? right.price.compare(left.price)
      : left.price.compare(right.price),
  );
}

export function mapRestBookSnapshot(
  row: OkxRestBookWire,
  binding: OkxInstrumentBinding,
  times: OkxObservationTimes,
  freshness: OkxFreshnessConfiguration,
): BookSnapshot {
  const exchangeTimestamp = epochMilliseconds(row.ts, "book.ts");
  const bids = normalizedSnapshotLevels(row.bids, "BID");
  const asks = normalizedSnapshotLevels(row.asks, "ASK");
  let quality = qualityForExchangeTimestamp(
    exchangeTimestamp,
    times.receiveTimestamp,
    freshness,
  );
  if (
    bids[0] !== undefined &&
    asks[0] !== undefined &&
    bids[0].price.compare(asks[0].price) >= 0
  ) {
    quality = "STALE";
  }
  return Object.freeze({
    kind: "SNAPSHOT",
    instrumentId: binding.instrumentId,
    updateId: updateId(row.seqId),
    bids,
    asks,
    context: context(exchangeTimestamp, times, quality),
  });
}

export function mapWebSocketBookEvent(
  action: "snapshot" | "update",
  row: {
    readonly asks: ReadonlyArray<OkxBookLevelWire>;
    readonly bids: ReadonlyArray<OkxBookLevelWire>;
    readonly ts: string;
    readonly checksum: string;
    readonly prevSeqId: string;
    readonly seqId: string;
  },
  binding: OkxInstrumentBinding,
  times: OkxObservationTimes,
  replacement: boolean,
  freshness: OkxFreshnessConfiguration,
): BookUpdate {
  if (row.checksum !== "0") {
    throw new OkxSchemaError(
      "OKX JSON books checksum is deprecated and must be fixed to zero.",
      "OKX-03",
    );
  }
  const exchangeTimestamp = epochMilliseconds(row.ts, "books.ts");
  const eventContext = context(
    exchangeTimestamp,
    times,
    qualityForExchangeTimestamp(
      exchangeTimestamp,
      times.receiveTimestamp,
      freshness,
    ),
  );
  if (action === "snapshot") {
    if (row.prevSeqId !== "-1") {
      throw new OkxSchemaError("OKX books snapshot prevSeqId must be -1.");
    }
    return Object.freeze({
      kind: replacement ? "REPLACEMENT_SNAPSHOT" : "SNAPSHOT",
      instrumentId: binding.instrumentId,
      updateId: updateId(row.seqId),
      bids: mapBookLevels(row.bids),
      asks: mapBookLevels(row.asks),
      context: eventContext,
    });
  }
  if (row.prevSeqId === "-1") {
    throw new OkxSchemaError("OKX books delta prevSeqId cannot be -1.");
  }
  return Object.freeze({
    kind: "DELTA",
    instrumentId: binding.instrumentId,
    updateId: updateId(row.seqId),
    previousUpdateId: updateId(row.prevSeqId),
    bidChanges: mapBookLevels(row.bids),
    askChanges: mapBookLevels(row.asks),
    context: eventContext,
  });
}

function assertInstrumentMatch(
  instId: string,
  instType: "SWAP" | "FUTURES",
  binding: OkxInstrumentBinding,
): void {
  if (instId !== binding.wire.instId || instType !== binding.wire.instType) {
    throw new OkxSchemaError(
      "OKX response instrument identity does not match the bound instrument.",
    );
  }
}

export class ExplicitOkxAssetResolver implements OkxAssetResolver {
  private readonly mappings: ReadonlyMap<string, CanonicalAssetId>;

  constructor(mappings: ReadonlyMap<string, CanonicalAssetId>) {
    this.mappings = new Map(mappings);
  }

  resolve(
    officialReference: OfficialAssetReference,
    _role: OkxAssetRole,
  ): CanonicalAssetId {
    const mapped = this.mappings.get(officialReference);
    if (mapped === undefined) {
      throw new OkxSchemaError(
        `No reviewed canonical asset mapping exists for ${officialReference}.`,
      );
    }
    return canonicalAssetId(mapped);
  }
}
