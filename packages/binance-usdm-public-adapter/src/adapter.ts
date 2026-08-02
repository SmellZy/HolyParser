import {
  validateAdapterCapabilities,
  type BookDelta,
  type BookSnapshot,
  type FundingObservation,
  type InstrumentMetadataObservation,
  type MarketPriceObservation,
  type ObservationContext,
  type PublicCapabilityName,
  type PublicCapabilityPort,
  type PublicMarketDataAdapter,
  type Timestamp,
} from "@arbitrage/market-data";
import { BinanceUsdmBookSession } from "./book-session.js";
import { binanceUsdmPublicCapabilities } from "./capabilities.js";
import { BINANCE_USDM_PRODUCT_GROUP, BINANCE_USDM_VENUE } from "./constants.js";
import { BinanceUsdmSchemaError } from "./errors.js";
import {
  assertFreshnessConfiguration,
  type BinanceUsdmFreshnessConfiguration,
} from "./freshness.js";
import {
  mapBookTicker,
  mapDepthSnapshot,
  mapFundingHistory,
  mapInstrument,
  mapLastPrice,
  mapLatestFunding,
  mapPremiumPrices,
  type BinanceUsdmAssetResolver,
  type BinanceUsdmInstrumentBinding,
  type BinanceUsdmObservationTimes,
} from "./mapping.js";
import {
  binanceUsdmMetricLabels,
  type BinanceUsdmMetricSink,
} from "./observability.js";
import { BinanceUsdmPublicRestClient } from "./rest.js";
import { timestampToEpochMilliseconds } from "./time.js";

export interface BinanceUsdmPublicAdapterOptions {
  readonly restClient: BinanceUsdmPublicRestClient;
  readonly assetResolver: BinanceUsdmAssetResolver;
  readonly binding: BinanceUsdmInstrumentBinding;
  readonly bookSession: BinanceUsdmBookSession;
  readonly timestampNow: () => Timestamp;
  readonly metricSink?: BinanceUsdmMetricSink;
  readonly freshness: {
    readonly ticker: BinanceUsdmFreshnessConfiguration;
    readonly premiumIndex: BinanceUsdmFreshnessConfiguration;
    readonly funding: BinanceUsdmFreshnessConfiguration;
    readonly restDepth: BinanceUsdmFreshnessConfiguration;
  };
}

function one<T>(rows: ReadonlyArray<T>, description: string): T {
  if (rows.length !== 1 || rows[0] === undefined) {
    throw new BinanceUsdmSchemaError(
      `${description} must contain exactly one row.`,
    );
  }
  return rows[0];
}

export class BinanceUsdmPublicAdapter implements PublicMarketDataAdapter {
  readonly venue = BINANCE_USDM_VENUE;
  readonly productGroup = BINANCE_USDM_PRODUCT_GROUP;
  readonly capabilities = binanceUsdmPublicCapabilities;
  readonly ports: Readonly<
    Partial<Record<PublicCapabilityName, PublicCapabilityPort>>
  >;

  constructor(private readonly options: BinanceUsdmPublicAdapterOptions) {
    assertFreshnessConfiguration(options.freshness.ticker, "rest:ticker");
    assertFreshnessConfiguration(
      options.freshness.premiumIndex,
      "rest:premium-index",
    );
    assertFreshnessConfiguration(options.freshness.funding, "rest:funding");
    assertFreshnessConfiguration(options.freshness.restDepth, "rest:depth");
    this.ports = Object.freeze({
      INSTRUMENT_METADATA: {
        capability: "INSTRUMENT_METADATA",
        listInstruments: () => this.listInstruments(),
      },
      TICKER: {
        capability: "TICKER",
        readPrices: () => this.readTicker(),
      },
      MARK_PRICE: {
        capability: "MARK_PRICE",
        readPrices: async () =>
          (await this.readPremiumPrices()).filter(
            (observation) => observation.kind === "MARK_PRICE",
          ),
      },
      INDEX_OR_ORACLE_PRICE: {
        capability: "INDEX_OR_ORACLE_PRICE",
        readPrices: async () =>
          (await this.readPremiumPrices()).filter(
            (observation) => observation.kind === "INDEX_PRICE",
          ),
      },
      CURRENT_FUNDING: {
        capability: "CURRENT_FUNDING",
        readFunding: () => this.readLatestFunding(),
      },
      FUNDING_HISTORY: {
        capability: "FUNDING_HISTORY",
        readFunding: () => this.readFundingHistory(),
      },
      FUNDING_INTERVAL: {
        capability: "FUNDING_INTERVAL",
        readFunding: () => this.readLatestFunding(),
      },
      NEXT_FUNDING_TIME: {
        capability: "NEXT_FUNDING_TIME",
        readFunding: () => this.readLatestFunding(),
      },
      REST_ORDER_BOOK_SNAPSHOT: {
        capability: "REST_ORDER_BOOK_SNAPSHOT",
        readSnapshot: () => this.readRestDepth(),
      },
      WEBSOCKET_ORDER_BOOK_DELTA: {
        capability: "WEBSOCKET_ORDER_BOOK_DELTA",
        readDeltas: async () => this.options.bookSession.drainAcceptedDeltas(),
      },
      SEQUENCE_VALIDATION: {
        capability: "SEQUENCE_VALIDATION",
        strategyId: "binance-usdm-rest-bridge-u-u-pu/v1",
      },
    });
    validateAdapterCapabilities(this);
  }

  async listInstruments(): Promise<
    ReadonlyArray<InstrumentMetadataObservation>
  > {
    const rows = await this.options.restClient.exchangeInfo();
    const times = this.times();
    const observations = rows.symbols.map(
      (row) => mapInstrument(row, this.options.assetResolver, times).metadata,
    );
    this.recordMetrics(
      observations.map((observation) => observation.context),
      "INSTRUMENT_METADATA",
    );
    return Object.freeze(observations);
  }

  async readTicker(): Promise<ReadonlyArray<MarketPriceObservation>> {
    const times = this.times();
    const [lastRows, bookRows] = await Promise.all([
      this.options.restClient.lastPrice(this.options.binding.wire.symbol),
      this.options.restClient.bookTicker(this.options.binding.wire.symbol),
    ]);
    const observations = [
      mapLastPrice(
        one(lastRows, "Bound Binance USD-M last price"),
        this.options.binding,
        times,
        this.options.freshness.ticker,
      ),
      ...mapBookTicker(
        one(bookRows, "Bound Binance USD-M book ticker"),
        this.options.binding,
        times,
        this.options.freshness.ticker,
      ),
    ];
    this.recordMetrics(
      observations.map((observation) => observation.context),
      "TICKER",
    );
    return Object.freeze(observations);
  }

  async readPremiumPrices(): Promise<ReadonlyArray<MarketPriceObservation>> {
    const rows = await this.options.restClient.premiumIndex(
      this.options.binding.wire.symbol,
    );
    const observations = mapPremiumPrices(
      one(rows, "Bound Binance USD-M premium index"),
      this.options.binding,
      this.times(),
      this.options.freshness.premiumIndex,
    );
    this.recordMetrics(
      observations.map((observation) => observation.context),
      "MARK_PRICE",
    );
    return observations;
  }

  async readLatestFunding(): Promise<ReadonlyArray<FundingObservation>> {
    this.assertFundingSupported();
    const [premiumRows, infoRows] = await Promise.all([
      this.options.restClient.premiumIndex(this.options.binding.wire.symbol),
      this.options.restClient.fundingInfo(),
    ]);
    const observation = mapLatestFunding(
      one(premiumRows, "Bound Binance USD-M funding row"),
      this.options.binding,
      infoRows.find((row) => row.symbol === this.options.binding.wire.symbol),
      this.times(),
      this.options.freshness.funding,
    );
    this.recordMetrics([observation.context], "CURRENT_FUNDING");
    return Object.freeze([observation]);
  }

  async readFundingHistory(): Promise<ReadonlyArray<FundingObservation>> {
    this.assertFundingSupported();
    const [historyRows, infoRows] = await Promise.all([
      this.options.restClient.fundingHistory(this.options.binding.wire.symbol),
      this.options.restClient.fundingInfo(),
    ]);
    const interval = infoRows.find(
      (row) => row.symbol === this.options.binding.wire.symbol,
    );
    const times = this.times();
    const observations = historyRows.map((row) =>
      mapFundingHistory(
        row,
        this.options.binding,
        interval,
        times,
        this.options.freshness.funding,
      ),
    );
    this.recordMetrics(
      observations.map((observation) => observation.context),
      "FUNDING_HISTORY",
    );
    return Object.freeze(observations);
  }

  async readRestDepth(): Promise<BookSnapshot> {
    const row = await this.options.restClient.depth(
      this.options.binding.wire.symbol,
      1_000,
    );
    const snapshot = mapDepthSnapshot(
      row,
      this.options.binding,
      this.times(),
      this.options.freshness.restDepth,
    );
    if (snapshot.kind !== "SNAPSHOT") {
      throw new BinanceUsdmSchemaError(
        "Initial REST depth must map to SNAPSHOT.",
      );
    }
    this.recordMetrics([snapshot.context], "REST_ORDER_BOOK_SNAPSHOT");
    return snapshot;
  }

  readBufferedDeltas(): ReadonlyArray<BookDelta> {
    return this.options.bookSession.drainAcceptedDeltas();
  }

  private assertFundingSupported(): void {
    if (!this.options.binding.supportsFunding) {
      throw new BinanceUsdmSchemaError(
        "Funding is unsupported for this Binance USD-M delivery Future.",
      );
    }
  }

  private times(): BinanceUsdmObservationTimes {
    const receiveTimestamp = this.options.timestampNow();
    const processingTimestamp = this.options.timestampNow();
    return Object.freeze({ receiveTimestamp, processingTimestamp });
  }

  private recordMetrics(
    contexts: ReadonlyArray<ObservationContext>,
    capability: PublicCapabilityName,
  ): void {
    const first = contexts[0];
    if (first === undefined) return;
    const labels = binanceUsdmMetricLabels(capability, first.quality);
    const processing = timestampToEpochMilliseconds(first.processingTimestamp);
    this.options.metricSink?.observe(
      "market_data_last_successful_observation_timestamp",
      processing / 1_000n,
      labels,
    );
    if (first.exchangeTimestamp === undefined) return;
    const exchange = timestampToEpochMilliseconds(first.exchangeTimestamp);
    const receive = timestampToEpochMilliseconds(first.receiveTimestamp);
    this.options.metricSink?.observe(
      "market_data_receive_lag_milliseconds",
      receive > exchange ? receive - exchange : 0n,
      labels,
    );
    this.options.metricSink?.observe(
      "market_data_processing_lag_milliseconds",
      processing >= receive ? processing - receive : 0n,
      labels,
    );
  }
}
