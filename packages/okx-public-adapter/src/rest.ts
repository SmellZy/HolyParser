import {
  OKX_GLOBAL_REST_ORIGIN,
  OKX_LIMITS,
  OKX_PUBLIC_PATHS,
  OKX_REST_RATE_LIMITS,
  type OkxInstrumentType,
  type OkxPublicPath,
} from "./constants.js";
import {
  OkxAdapterError,
  OkxRateLimitError,
  OkxSchemaError,
} from "./errors.js";
import { SlidingWindowRateLimiter } from "./rate-limit.js";
import { parseJsonPreservingSequenceIds } from "./runtime-schema.js";
import {
  parseFundingHistory,
  parseFundingRates,
  parseIndexTickers,
  parseInstruments,
  parseMarkPrices,
  parseRestBooks,
  parseTickers,
  parseTime,
  type OkxFundingHistoryWire,
  type OkxFundingRateWire,
  type OkxIndexTickerWire,
  type OkxInstrumentWire,
  type OkxMarkPriceWire,
  type OkxRestBookWire,
  type OkxTickerWire,
} from "./wire.js";
import { epochMilliseconds } from "./time.js";
import {
  okxMetricLabels,
  type OkxEventSink,
  type OkxMetricSink,
} from "./observability.js";
import {
  timestamp,
  type QualityState,
  type Timestamp,
} from "@arbitrage/market-data";

export const OKX_ALLOWED_REST_ORIGINS = [
  "https://openapi.okx.com",
  "https://us.okx.com",
  "https://eea.okx.com",
  "https://tr.okx.com",
] as const;

export type OkxRestOrigin = (typeof OKX_ALLOWED_REST_ORIGINS)[number];

export interface OkxRestClientOptions {
  readonly origin?: OkxRestOrigin;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maximumResponseBytes?: number;
  readonly rateLimiter?: SlidingWindowRateLimiter;
  readonly now?: () => number;
  readonly timestampNow?: () => Timestamp;
  readonly eventSink?: OkxEventSink;
  readonly metricSink?: OkxMetricSink;
}

export interface OkxServerTime {
  readonly epochMilliseconds: string;
  readonly observedAt: Timestamp;
  readonly roundTripMilliseconds: bigint;
  readonly clockOffsetMilliseconds: bigint;
  readonly quality: "HEALTHY";
}

function assertAllowedOrigin(origin: string): asserts origin is OkxRestOrigin {
  if (!OKX_ALLOWED_REST_ORIGINS.includes(origin as OkxRestOrigin)) {
    throw new OkxAdapterError(
      "OKX REST origin is not in the official regional allowlist.",
      "CONFIGURATION",
      "OKX-01",
    );
  }
}

function query(
  path: OkxPublicPath,
  parameters: Readonly<Record<string, string | undefined>>,
): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(parameters)) {
    if (value !== undefined) {
      search.set(name, value);
    }
  }
  const suffix = search.toString();
  return suffix.length === 0 ? path : `${path}?${suffix}`;
}

async function readBoundedResponseText(
  response: Response,
  maximumResponseBytes: number,
): Promise<string> {
  if (response.body === null) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      totalBytes += result.value.byteLength;
      if (totalBytes > maximumResponseBytes) {
        await reader.cancel();
        throw new OkxSchemaError(
          "OKX response exceeds the configured byte limit.",
        );
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export class OkxPublicRestClient {
  private readonly origin: OkxRestOrigin;
  private readonly request: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maximumResponseBytes: number;
  private readonly rateLimiter: SlidingWindowRateLimiter;
  private readonly now: () => number;
  private readonly timestampNow: () => Timestamp;
  private readonly eventSink?: OkxEventSink;
  private readonly metricSink?: OkxMetricSink;
  private serverTimeQuality: Extract<
    QualityState,
    "UNVERIFIED" | "HEALTHY" | "DEGRADED"
  > = "UNVERIFIED";

  constructor(options: OkxRestClientOptions = {}) {
    const origin = options.origin ?? OKX_GLOBAL_REST_ORIGIN;
    assertAllowedOrigin(origin);
    this.origin = origin;
    this.request = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? OKX_LIMITS.requestTimeoutMs;
    this.maximumResponseBytes =
      options.maximumResponseBytes ?? OKX_LIMITS.responseBytes;
    this.rateLimiter = options.rateLimiter ?? new SlidingWindowRateLimiter();
    this.now = options.now ?? Date.now;
    this.timestampNow =
      options.timestampNow ?? (() => timestamp(new Date().toISOString()));
    this.eventSink = options.eventSink;
    this.metricSink = options.metricSink;

    if (
      !Number.isSafeInteger(this.timeoutMs) ||
      !Number.isSafeInteger(this.maximumResponseBytes) ||
      this.timeoutMs <= 0 ||
      this.maximumResponseBytes <= 0
    ) {
      throw new OkxAdapterError(
        "REST bounds must be positive safe integers.",
        "CONFIGURATION",
        "OKX-01",
      );
    }
  }

  instruments(
    instType: OkxInstrumentType,
  ): Promise<ReadonlyArray<OkxInstrumentWire>> {
    return this.get(
      OKX_PUBLIC_PATHS.instruments,
      { instType },
      parseInstruments,
    );
  }

  tickers(instType: OkxInstrumentType): Promise<ReadonlyArray<OkxTickerWire>> {
    return this.get(OKX_PUBLIC_PATHS.tickers, { instType }, parseTickers);
  }

  markPrices(
    instType: OkxInstrumentType,
    instId?: string,
  ): Promise<ReadonlyArray<OkxMarkPriceWire>> {
    return this.get(
      OKX_PUBLIC_PATHS.markPrice,
      { instType, instId },
      parseMarkPrices,
    );
  }

  indexTickers(instId: string): Promise<ReadonlyArray<OkxIndexTickerWire>> {
    return this.get(
      OKX_PUBLIC_PATHS.indexTickers,
      { instId },
      parseIndexTickers,
    );
  }

  fundingRate(instId: string): Promise<ReadonlyArray<OkxFundingRateWire>> {
    return this.get(
      OKX_PUBLIC_PATHS.fundingRate,
      { instId },
      parseFundingRates,
    );
  }

  fundingHistory(
    instId: string,
    limit = "100",
  ): Promise<ReadonlyArray<OkxFundingHistoryWire>> {
    if (!/^(?:[1-9]\d?|[1-3]\d{2}|400)$/.test(limit)) {
      throw new OkxSchemaError("Funding-history limit must be from 1 to 400.");
    }
    return this.get(
      OKX_PUBLIC_PATHS.fundingHistory,
      { instId, limit },
      parseFundingHistory,
    );
  }

  orderBook(
    instId: string,
    size = "400",
  ): Promise<ReadonlyArray<OkxRestBookWire>> {
    if (!/^(?:[1-9]\d?|[1-3]\d{2}|400)$/.test(size)) {
      throw new OkxSchemaError("Order-book size must be from 1 to 400.");
    }
    return this.get(
      OKX_PUBLIC_PATHS.books,
      { instId, sz: size },
      parseRestBooks,
    );
  }

  async serverTime(): Promise<OkxServerTime> {
    const startedAt = this.now();
    try {
      const rows = await this.get(OKX_PUBLIC_PATHS.time, {}, parseTime);
      const completedAt = this.now();
      if (
        !Number.isSafeInteger(startedAt) ||
        !Number.isSafeInteger(completedAt) ||
        completedAt < startedAt
      ) {
        throw new OkxSchemaError(
          "Local clock must provide monotonic safe millisecond values.",
        );
      }
      const row = rows[0];
      if (row === undefined || rows.length !== 1) {
        throw new OkxSchemaError("OKX time response must contain one row.");
      }
      const observedAt = epochMilliseconds(row.ts, "time.ts");
      const midpoint =
        BigInt(startedAt) + (BigInt(completedAt) - BigInt(startedAt)) / 2n;
      this.serverTimeQuality = "HEALTHY";
      return Object.freeze({
        epochMilliseconds: row.ts,
        observedAt,
        roundTripMilliseconds: BigInt(completedAt) - BigInt(startedAt),
        clockOffsetMilliseconds: BigInt(row.ts) - midpoint,
        quality: "HEALTHY",
      });
    } catch (error) {
      this.serverTimeQuality = "DEGRADED";
      this.eventSink?.emit({
        type: "OKX_SERVER_TIME_DEGRADED",
        occurredAt: this.timestampNow(),
        capability: "INSTRUMENT_METADATA",
        state: "DEGRADED",
        reason: "OKX public server-time observation failed.",
      });
      throw error;
    }
  }

  serverTimeState(): Readonly<{
    quality: "UNVERIFIED" | "HEALTHY" | "DEGRADED";
  }> {
    return Object.freeze({ quality: this.serverTimeQuality });
  }

  private async get<T>(
    path: OkxPublicPath,
    parameters: Readonly<Record<string, string | undefined>>,
    parser: (value: unknown) => {
      readonly code: string;
      readonly msg: string;
      readonly data: ReadonlyArray<T>;
    },
  ): Promise<ReadonlyArray<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.rateLimiter.acquire(path, OKX_REST_RATE_LIMITS[path]);
      const response = await this.request(
        `${this.origin}${query(path, parameters)}`,
        {
          method: "GET",
          headers: { accept: "application/json" },
          redirect: "error",
          signal: controller.signal,
        },
      );

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        let retryAfterMs: number | undefined;
        if (retryAfter !== null && /^\d+$/.test(retryAfter)) {
          const milliseconds = BigInt(retryAfter) * 1_000n;
          if (milliseconds <= BigInt(Number.MAX_SAFE_INTEGER)) {
            retryAfterMs = Number(milliseconds);
          }
        }
        this.recordRateLimit(path);
        throw new OkxRateLimitError(
          "OKX returned HTTP 429; the adapter does not auto-retry.",
          retryAfterMs,
        );
      }
      if (!response.ok) {
        throw new OkxAdapterError(
          `OKX public REST returned HTTP ${response.status}.`,
          "REMOTE",
          "OKX-01",
        );
      }

      const declaredLength = response.headers.get("content-length");
      if (
        declaredLength !== null &&
        /^\d+$/.test(declaredLength) &&
        BigInt(declaredLength) > BigInt(this.maximumResponseBytes)
      ) {
        throw new OkxSchemaError(
          "OKX response exceeds the configured byte limit.",
        );
      }
      const text = await readBoundedResponseText(
        response,
        this.maximumResponseBytes,
      );
      const decoded = parseJsonPreservingSequenceIds(
        text,
        this.maximumResponseBytes,
      );
      const envelope = parser(decoded);
      if (envelope.code !== "0") {
        throw new OkxAdapterError(
          `OKX public API error ${envelope.code}: ${envelope.msg}`,
          "REMOTE",
          "OKX-01",
        );
      }
      return envelope.data;
    } catch (error) {
      if (error instanceof OkxRateLimitError) {
        if (error.message.startsWith("Local OKX")) {
          this.recordRateLimit(path);
        }
        throw error;
      }
      if (error instanceof OkxSchemaError) {
        const capability = this.capabilityForPath(path);
        this.metricSink?.increment(
          "market_data_parse_failures_total",
          okxMetricLabels(capability, "DEGRADED"),
        );
        this.eventSink?.emit({
          type: "OKX_PARSE_FAILED",
          occurredAt: this.timestampNow(),
          capability,
          state: "DEGRADED",
          reason: "OKX public REST payload failed bounded schema validation.",
        });
        throw error;
      }
      if (error instanceof OkxAdapterError) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new OkxAdapterError(
          "OKX public REST request timed out.",
          "TRANSPORT",
          "OKX-01",
        );
      }
      throw new OkxAdapterError(
        "OKX public REST request failed.",
        "TRANSPORT",
        "OKX-01",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private recordRateLimit(path: OkxPublicPath): void {
    this.metricSink?.increment(
      "market_data_rate_limits_total",
      okxMetricLabels(this.capabilityForPath(path), "DEGRADED"),
    );
    this.eventSink?.emit({
      type: "OKX_RATE_LIMITED",
      occurredAt: this.timestampNow(),
      capability: this.capabilityForPath(path),
      state: "DEGRADED",
      reason: "OKX public REST rate limit reached.",
    });
  }

  private capabilityForPath(path: OkxPublicPath) {
    switch (path) {
      case OKX_PUBLIC_PATHS.instruments:
      case OKX_PUBLIC_PATHS.time:
        return "INSTRUMENT_METADATA" as const;
      case OKX_PUBLIC_PATHS.tickers:
        return "TICKER" as const;
      case OKX_PUBLIC_PATHS.markPrice:
        return "MARK_PRICE" as const;
      case OKX_PUBLIC_PATHS.indexTickers:
        return "INDEX_OR_ORACLE_PRICE" as const;
      case OKX_PUBLIC_PATHS.fundingRate:
        return "CURRENT_FUNDING" as const;
      case OKX_PUBLIC_PATHS.fundingHistory:
        return "FUNDING_HISTORY" as const;
      case OKX_PUBLIC_PATHS.books:
        return "REST_ORDER_BOOK_SNAPSHOT" as const;
    }
  }
}
