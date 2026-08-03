import {
  validateAdapterCapabilities,
  type BookDelta,
  type BookSnapshot,
  type FundingObservation,
  type InstrumentMetadataObservation,
  type MarketPriceObservation,
  type PublicCapabilityName,
  type PublicCapabilityPort,
  type PublicMarketDataAdapter,
  type Timestamp,
} from "@arbitrage/market-data";
import { BybitOrderBookSession } from "./book-session.js";
import { BYBIT_LINEAR_CAPABILITIES } from "./capabilities.js";
import { BYBIT_LINEAR_PRODUCT_GROUP, BYBIT_LINEAR_VENUE } from "./constants.js";
import { BybitLinearSchemaError } from "./errors.js";
import type { BybitFreshnessPolicy } from "./freshness.js";
import {
  mapFundingHistory,
  mapInstrument,
  mapRestBook,
  mapTicker,
  type BybitAssetResolver,
  type BybitInstrumentBinding,
  type BybitObservationTimes,
} from "./mapping.js";
import { BybitLinearPublicRestClient } from "./rest.js";

export interface BybitLinearPublicAdapterOptions {
  readonly restClient: BybitLinearPublicRestClient;
  readonly assetResolver: BybitAssetResolver;
  readonly binding: BybitInstrumentBinding;
  readonly bookSession: BybitOrderBookSession;
  readonly timestampNow: () => Timestamp;
  readonly freshness: {
    readonly ticker: BybitFreshnessPolicy;
    readonly restBook: BybitFreshnessPolicy;
  };
}
function one<T>(rows: readonly T[], description: string): T {
  if (rows.length !== 1 || rows[0] === undefined)
    throw new BybitLinearSchemaError(
      `${description} must contain exactly one row.`,
    );
  return rows[0];
}

export class BybitLinearPublicAdapter implements PublicMarketDataAdapter {
  readonly venue = BYBIT_LINEAR_VENUE;
  readonly productGroup = BYBIT_LINEAR_PRODUCT_GROUP;
  readonly capabilities = BYBIT_LINEAR_CAPABILITIES;
  readonly ports: Readonly<
    Partial<Record<PublicCapabilityName, PublicCapabilityPort>>
  >;
  constructor(private readonly options: BybitLinearPublicAdapterOptions) {
    this.ports = Object.freeze({
      INSTRUMENT_METADATA: {
        capability: "INSTRUMENT_METADATA",
        listInstruments: () => this.listInstruments(),
      },
      TICKER: { capability: "TICKER", readPrices: () => this.readPrices() },
      MARK_PRICE: {
        capability: "MARK_PRICE",
        readPrices: async () =>
          (await this.readPrices()).filter(
            (value) => value.kind === "MARK_PRICE",
          ),
      },
      INDEX_OR_ORACLE_PRICE: {
        capability: "INDEX_OR_ORACLE_PRICE",
        readPrices: async () =>
          (await this.readPrices()).filter(
            (value) => value.kind === "INDEX_PRICE",
          ),
      },
      CURRENT_FUNDING: {
        capability: "CURRENT_FUNDING",
        readFunding: () => this.readCurrentFunding(),
      },
      FUNDING_HISTORY: {
        capability: "FUNDING_HISTORY",
        readFunding: () => this.readFundingHistory(),
      },
      FUNDING_INTERVAL: {
        capability: "FUNDING_INTERVAL",
        readFunding: () => this.readCurrentFunding(),
      },
      NEXT_FUNDING_TIME: {
        capability: "NEXT_FUNDING_TIME",
        readFunding: () => this.readCurrentFunding(),
      },
      REST_ORDER_BOOK_SNAPSHOT: {
        capability: "REST_ORDER_BOOK_SNAPSHOT",
        readSnapshot: () => this.readRestBook(),
      },
      WEBSOCKET_ORDER_BOOK_SNAPSHOT: {
        capability: "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
        readSnapshot: async () => this.options.bookSession.readLatestSnapshot(),
      },
      WEBSOCKET_ORDER_BOOK_DELTA: {
        capability: "WEBSOCKET_ORDER_BOOK_DELTA",
        readDeltas: async () => this.options.bookSession.drainAcceptedDeltas(),
      },
    });
    validateAdapterCapabilities(this);
  }
  async listInstruments(): Promise<readonly InstrumentMetadataObservation[]> {
    const result: InstrumentMetadataObservation[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      if (++pages > 10)
        throw new BybitLinearSchemaError(
          "Instrument pagination exceeded the configured page bound.",
          "BYBIT-02",
        );
      const page = await this.options.restClient.instruments(cursor);
      const times = this.times();
      result.push(
        ...page.instruments.map(
          (row) =>
            mapInstrument(row, this.options.assetResolver, times).metadata,
        ),
      );
      cursor = page.nextPageCursor === "" ? undefined : page.nextPageCursor;
    } while (cursor !== undefined);
    return Object.freeze(result);
  }
  async readPrices(): Promise<readonly MarketPriceObservation[]> {
    const row = one(
      await this.options.restClient.tickers(this.options.binding.wire.symbol),
      "Bound Bybit ticker",
    );
    return mapTicker(
      row,
      this.options.binding,
      this.times(),
      this.options.freshness.ticker,
    ).prices;
  }
  async readCurrentFunding(): Promise<readonly FundingObservation[]> {
    this.assertFunding();
    const row = one(
      await this.options.restClient.tickers(this.options.binding.wire.symbol),
      "Bound Bybit ticker",
    );
    const result = mapTicker(
      row,
      this.options.binding,
      this.times(),
      this.options.freshness.ticker,
    ).funding;
    if (result === undefined) return Object.freeze([]);
    return Object.freeze([result]);
  }
  async readFundingHistory(): Promise<readonly FundingObservation[]> {
    this.assertFunding();
    const times = this.times();
    return Object.freeze(
      (
        await this.options.restClient.fundingHistory(
          this.options.binding.wire.symbol,
        )
      ).map((row) => mapFundingHistory(row, this.options.binding, times)),
    );
  }
  async readRestBook(): Promise<BookSnapshot> {
    return mapRestBook(
      await this.options.restClient.orderbook(
        this.options.binding.wire.symbol,
        50,
      ),
      this.options.binding,
      this.times(),
      this.options.freshness.restBook,
    );
  }
  readAcceptedDeltas(): readonly BookDelta[] {
    return this.options.bookSession.drainAcceptedDeltas();
  }
  private assertFunding(): void {
    if (!this.options.binding.supportsFunding)
      throw new BybitLinearSchemaError(
        "Funding is unsupported for Bybit linear delivery Futures.",
        "BYBIT-04",
      );
  }
  private times(): BybitObservationTimes {
    return Object.freeze({
      receiveTimestamp: this.options.timestampNow(),
      processingTimestamp: this.options.timestampNow(),
    });
  }
}
