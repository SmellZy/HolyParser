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
import {
  OKX_PRODUCT_GROUP,
  OKX_VENUE,
  type OkxInstrumentType,
} from "./constants.js";
import { OkxSchemaError } from "./errors.js";
import {
  assertOkxFreshnessConfiguration,
  observationLags,
  timestampToEpochMilliseconds,
  type OkxFreshnessConfiguration,
} from "./freshness.js";
import { OkxBookSession } from "./book-session.js";
import {
  mapFundingHistoryRow,
  mapFundingRate,
  mapIndexPrice,
  mapInstrument,
  mapMarkPrice,
  mapRestBookSnapshot,
  mapTicker,
  type OkxAssetResolver,
  type OkxInstrumentBinding,
  type OkxObservationTimes,
} from "./mapping.js";
import { okxPublicCapabilities } from "./capabilities.js";
import { OkxPublicRestClient } from "./rest.js";
import { okxMetricLabels, type OkxMetricSink } from "./observability.js";

export interface OkxPublicAdapterOptions {
  readonly restClient: OkxPublicRestClient;
  readonly assetResolver: OkxAssetResolver;
  readonly binding: OkxInstrumentBinding;
  readonly bookSession: OkxBookSession;
  readonly timestampNow: () => Timestamp;
  readonly metricSink?: OkxMetricSink;
  readonly freshness: {
    readonly ticker: OkxFreshnessConfiguration;
    readonly markPrice: OkxFreshnessConfiguration;
    readonly indexPrice: OkxFreshnessConfiguration;
    readonly fundingRate: OkxFreshnessConfiguration;
    readonly restOrderBook: OkxFreshnessConfiguration;
  };
}

function one<T>(rows: ReadonlyArray<T>, description: string): T {
  if (rows.length !== 1 || rows[0] === undefined) {
    throw new OkxSchemaError(`${description} must contain exactly one row.`);
  }
  return rows[0];
}

export class OkxPublicAdapter implements PublicMarketDataAdapter {
  readonly venue = OKX_VENUE;
  readonly productGroup = OKX_PRODUCT_GROUP;
  readonly capabilities = okxPublicCapabilities;
  readonly ports: Readonly<
    Partial<Record<PublicCapabilityName, PublicCapabilityPort>>
  >;

  constructor(private readonly options: OkxPublicAdapterOptions) {
    assertOkxFreshnessConfiguration(options.freshness.ticker, "rest:ticker");
    assertOkxFreshnessConfiguration(
      options.freshness.markPrice,
      "rest:mark-price",
    );
    assertOkxFreshnessConfiguration(
      options.freshness.indexPrice,
      "rest:index-price",
    );
    assertOkxFreshnessConfiguration(
      options.freshness.fundingRate,
      "rest:funding-rate",
    );
    assertOkxFreshnessConfiguration(
      options.freshness.restOrderBook,
      "rest:books",
    );
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
        readPrices: () => this.readMarkPrice(),
      },
      INDEX_OR_ORACLE_PRICE: {
        capability: "INDEX_OR_ORACLE_PRICE",
        readPrices: () => this.readIndexPrice(),
      },
      CURRENT_FUNDING: {
        capability: "CURRENT_FUNDING",
        readFunding: async () =>
          (await this.readFunding()).filter(
            (observation) =>
              observation.semantic === "CURRENT" ||
              observation.semantic === "LAST",
          ),
      },
      PREDICTED_FUNDING: {
        capability: "PREDICTED_FUNDING",
        readFunding: async () =>
          (await this.readFunding()).filter(
            (observation) => observation.semantic === "PREDICTED",
          ),
      },
      FUNDING_HISTORY: {
        capability: "FUNDING_HISTORY",
        readFunding: () => this.readFundingHistory(),
      },
      FUNDING_INTERVAL: {
        capability: "FUNDING_INTERVAL",
        readFunding: () => this.readFunding(),
      },
      NEXT_FUNDING_TIME: {
        capability: "NEXT_FUNDING_TIME",
        readFunding: () => this.readFunding(),
      },
      REST_ORDER_BOOK_SNAPSHOT: {
        capability: "REST_ORDER_BOOK_SNAPSHOT",
        readSnapshot: () => this.readRestBookSnapshot(),
      },
      WEBSOCKET_ORDER_BOOK_SNAPSHOT: {
        capability: "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
        readSnapshot: async () => this.options.bookSession.readLatestSnapshot(),
      },
      WEBSOCKET_ORDER_BOOK_DELTA: {
        capability: "WEBSOCKET_ORDER_BOOK_DELTA",
        readDeltas: async () => this.options.bookSession.drainAcceptedDeltas(),
      },
      SEQUENCE_VALIDATION: {
        capability: "SEQUENCE_VALIDATION",
        strategyId: "okx-v5-json-books-prev-seq/v1",
      },
    });
    validateAdapterCapabilities(this);
  }

  async listInstruments(): Promise<
    ReadonlyArray<InstrumentMetadataObservation>
  > {
    const result: InstrumentMetadataObservation[] = [];
    for (const instType of ["SWAP", "FUTURES"] as const) {
      const rows = await this.options.restClient.instruments(instType);
      const times = this.times();
      for (const row of rows) {
        result.push(
          mapInstrument(row, this.options.assetResolver, times).metadata,
        );
      }
    }
    this.recordObservationMetrics(
      result.map((observation) => observation.context),
      "INSTRUMENT_METADATA",
      false,
    );
    return result;
  }

  async readTicker(): Promise<ReadonlyArray<MarketPriceObservation>> {
    const rows = await this.options.restClient.tickers(
      this.options.binding.wire.instType,
    );
    const row = rows.find(
      (candidate) => candidate.instId === this.options.binding.wire.instId,
    );
    if (row === undefined) {
      throw new OkxSchemaError("Bound OKX ticker was not returned.");
    }
    const result = mapTicker(
      row,
      this.options.binding,
      this.times(),
      this.options.freshness.ticker,
    );
    this.recordObservationMetrics(
      result.map((observation) => observation.context),
      "TICKER",
      true,
    );
    return result;
  }

  async readMarkPrice(): Promise<ReadonlyArray<MarketPriceObservation>> {
    const rows = await this.options.restClient.markPrices(
      this.options.binding.wire.instType,
      this.options.binding.wire.instId,
    );
    const result = [
      mapMarkPrice(
        one(rows, "Bound OKX mark price"),
        this.options.binding,
        this.times(),
        this.options.freshness.markPrice,
      ),
    ];
    this.recordObservationMetrics(
      result.map((observation) => observation.context),
      "MARK_PRICE",
      true,
    );
    return result;
  }

  async readIndexPrice(): Promise<ReadonlyArray<MarketPriceObservation>> {
    const rows = await this.options.restClient.indexTickers(
      this.options.binding.indexInstrumentId,
    );
    const result = [
      mapIndexPrice(
        one(rows, "Bound OKX index ticker"),
        this.options.binding,
        this.times(),
        this.options.freshness.indexPrice,
      ),
    ];
    this.recordObservationMetrics(
      result.map((observation) => observation.context),
      "INDEX_OR_ORACLE_PRICE",
      true,
    );
    return result;
  }

  async readFunding(): Promise<ReadonlyArray<FundingObservation>> {
    if (!this.supportsFunding(this.options.binding)) {
      throw new OkxSchemaError(
        "Funding is unsupported for traditional OKX expiry FUTURES.",
      );
    }
    const rows = await this.options.restClient.fundingRate(
      this.options.binding.wire.instId,
    );
    const result = mapFundingRate(
      one(rows, "Bound OKX funding rate"),
      this.options.binding,
      this.times(),
      this.options.freshness.fundingRate,
    );
    this.recordObservationMetrics(
      result.map((observation) => observation.context),
      "CURRENT_FUNDING",
      true,
    );
    return result;
  }

  async readFundingHistory(): Promise<ReadonlyArray<FundingObservation>> {
    if (!this.supportsFunding(this.options.binding)) {
      throw new OkxSchemaError(
        "Funding history is unsupported for traditional OKX expiry FUTURES.",
      );
    }
    const rows = await this.options.restClient.fundingHistory(
      this.options.binding.wire.instId,
    );
    const times = this.times();
    const result = rows.flatMap((row) =>
      mapFundingHistoryRow(row, this.options.binding, times),
    );
    this.recordObservationMetrics(
      result.map((observation) => observation.context),
      "FUNDING_HISTORY",
      false,
    );
    return result;
  }

  async readRestBookSnapshot(): Promise<BookSnapshot> {
    const rows = await this.options.restClient.orderBook(
      this.options.binding.wire.instId,
    );
    const result = mapRestBookSnapshot(
      one(rows, "Bound OKX REST order book"),
      this.options.binding,
      this.times(),
      this.options.freshness.restOrderBook,
    );
    this.recordObservationMetrics(
      [result.context],
      "REST_ORDER_BOOK_SNAPSHOT",
      true,
    );
    return result;
  }

  readBufferedDeltas(): ReadonlyArray<BookDelta> {
    return this.options.bookSession.drainAcceptedDeltas();
  }

  private times(): OkxObservationTimes {
    const receiveTimestamp = this.options.timestampNow();
    const processingTimestamp = this.options.timestampNow();
    return Object.freeze({ receiveTimestamp, processingTimestamp });
  }

  private supportsFunding(binding: OkxInstrumentBinding): boolean {
    return (
      binding.wire.instType === "SWAP" ||
      binding.wire.ruleType === "xperp" ||
      binding.wire.ruleType === "pre_market"
    );
  }

  private recordObservationMetrics(
    contexts: ReadonlyArray<ObservationContext>,
    capability: PublicCapabilityName,
    includeExchangeLag: boolean,
  ): void {
    const first = contexts[0];
    if (first === undefined) {
      return;
    }
    const labels = okxMetricLabels(capability);
    this.options.metricSink?.observe(
      "market_data_last_successful_observation_timestamp",
      timestampToEpochMilliseconds(
        first.processingTimestamp,
        "processing timestamp",
      ) / 1_000n,
      labels,
    );
    if (!includeExchangeLag || first.exchangeTimestamp === undefined) {
      return;
    }
    const lags = observationLags(
      first.exchangeTimestamp,
      first.receiveTimestamp,
      first.processingTimestamp,
    );
    this.options.metricSink?.observe(
      "market_data_receive_lag_milliseconds",
      lags.receiveLagMs,
      labels,
    );
    this.options.metricSink?.observe(
      "market_data_processing_lag_milliseconds",
      lags.processingLagMs,
      labels,
    );
  }
}

export async function discoverOkxInstruments(
  restClient: OkxPublicRestClient,
  resolver: OkxAssetResolver,
  timestampNow: () => Timestamp,
  instType: OkxInstrumentType,
): Promise<ReadonlyArray<OkxInstrumentBinding>> {
  const rows = await restClient.instruments(instType);
  const receiveTimestamp = timestampNow();
  const processingTimestamp = timestampNow();
  return rows.map((row) =>
    mapInstrument(row, resolver, {
      receiveTimestamp,
      processingTimestamp,
    }),
  );
}
