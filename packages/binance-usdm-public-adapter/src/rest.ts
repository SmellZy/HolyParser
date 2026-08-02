import {
  timestamp,
  type QualityState,
  type Timestamp,
} from "@arbitrage/market-data";
import {
  BINANCE_USDM_DEPTH_LIMITS,
  BINANCE_USDM_FUNDING_SHARED_BUDGET,
  BINANCE_USDM_LIMITS,
  BINANCE_USDM_PATHS,
  BINANCE_USDM_PUBLIC_PATHS,
  BINANCE_USDM_REQUEST_WEIGHT_BUDGET,
  BINANCE_USDM_REQUEST_WEIGHTS,
  BINANCE_USDM_REST_ORIGIN,
  assertBinanceUsdmOfficialInstrumentId,
  depthRequestWeight,
  type BinanceUsdmDepthLimit,
  type BinanceUsdmPath,
} from "./constants.js";
import {
  BinanceUsdmAdapterError,
  BinanceUsdmRateLimitError,
  BinanceUsdmSchemaError,
} from "./errors.js";
import {
  binanceUsdmMetricLabels,
  type BinanceUsdmEventSink,
  type BinanceUsdmMetricSink,
} from "./observability.js";
import { WeightedSlidingWindowRateLimiter } from "./rate-limit.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import { epochMilliseconds } from "./time.js";
import {
  parseBookTickers,
  parseBusinessError,
  parseDepthSnapshot,
  parseExchangeInfo,
  parseFundingHistory,
  parseFundingInfo,
  parseLastPrices,
  parsePremiumIndexes,
  parseServerTime,
  type BinanceBookTickerWire,
  type BinanceDepthSnapshotWire,
  type BinanceExchangeInfoWire,
  type BinanceFundingHistoryWire,
  type BinanceFundingInfoWire,
  type BinanceLastPriceWire,
  type BinancePremiumIndexWire,
} from "./wire.js";

export interface BinanceUsdmRestClientOptions {
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maximumResponseBytes?: number;
  readonly rateLimiter?: WeightedSlidingWindowRateLimiter;
  readonly fundingRateLimiter?: WeightedSlidingWindowRateLimiter;
  readonly now?: () => number;
  readonly timestampNow?: () => Timestamp;
  readonly maximumHealthyRttMs?: number;
  readonly eventSink?: BinanceUsdmEventSink;
  readonly metricSink?: BinanceUsdmMetricSink;
}

export interface BinanceUsdmServerTimeObservation {
  readonly serverTime: Timestamp;
  readonly serverEpochMilliseconds: string;
  readonly roundTripMilliseconds: bigint;
  readonly clockOffsetMilliseconds: bigint;
  readonly quality: "HEALTHY" | "DEGRADED";
}

function assertSymbol(symbol: string): void {
  try {
    assertBinanceUsdmOfficialInstrumentId(symbol);
  } catch {
    throw new BinanceUsdmSchemaError(
      "Symbol must be a bounded opaque Binance instrument identifier.",
    );
  }
}

function buildPath(
  path: BinanceUsdmPath,
  parameters: Readonly<Record<string, string | undefined>>,
): string {
  if (!BINANCE_USDM_PUBLIC_PATHS.has(path)) {
    throw new BinanceUsdmAdapterError(
      "REST path is outside the fixed public allowlist.",
      "CONFIGURATION",
      "BNFUT-01",
    );
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined) search.set(key, value);
  }
  const suffix = search.toString();
  return suffix.length === 0 ? path : `${path}?${suffix}`;
}

async function readBoundedResponseText(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new BinanceUsdmSchemaError(
          "REST response exceeds the streaming byte limit.",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(output);
}

export class BinanceUsdmPublicRestClient {
  private readonly request: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maximumResponseBytes: number;
  private readonly rateLimiter: WeightedSlidingWindowRateLimiter;
  private readonly fundingRateLimiter: WeightedSlidingWindowRateLimiter;
  private readonly now: () => number;
  private readonly timestampNow: () => Timestamp;
  private readonly maximumHealthyRttMs: number;
  private serverTimeQualityValue: Extract<
    QualityState,
    "UNVERIFIED" | "HEALTHY" | "DEGRADED"
  > = "UNVERIFIED";

  constructor(private readonly options: BinanceUsdmRestClientOptions = {}) {
    this.request = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? BINANCE_USDM_LIMITS.requestTimeoutMs;
    this.maximumResponseBytes =
      options.maximumResponseBytes ?? BINANCE_USDM_LIMITS.responseBytes;
    this.rateLimiter =
      options.rateLimiter ?? new WeightedSlidingWindowRateLimiter();
    this.fundingRateLimiter =
      options.fundingRateLimiter ?? new WeightedSlidingWindowRateLimiter();
    this.now = options.now ?? Date.now;
    this.timestampNow =
      options.timestampNow ?? (() => timestamp(new Date().toISOString()));
    this.maximumHealthyRttMs = options.maximumHealthyRttMs ?? 2_000;
    for (const value of [
      this.timeoutMs,
      this.maximumResponseBytes,
      this.maximumHealthyRttMs,
    ]) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new BinanceUsdmAdapterError(
          "REST bounds must be positive safe integers.",
          "CONFIGURATION",
          "BNFUT-05",
        );
      }
    }
  }

  async exchangeInfo(signal?: AbortSignal): Promise<BinanceExchangeInfoWire> {
    const result = await this.get(
      BINANCE_USDM_PATHS.exchangeInfo,
      {},
      BINANCE_USDM_REQUEST_WEIGHTS.exchangeInfo,
      parseExchangeInfo,
      signal,
    );
    if (result.rejectedInstrumentCount > 0) {
      this.options.metricSink?.increment(
        "market_data_product_rejections_total",
        binanceUsdmMetricLabels("INSTRUMENT_METADATA", "DEGRADED"),
      );
      this.options.eventSink?.emit({
        type: "BINANCE_USDM_PRODUCT_REJECTED",
        occurredAt: this.timestampNow(),
        capability: "INSTRUMENT_METADATA",
        state: "DEGRADED",
        reasonCode: "PRODUCT_FAMILY",
      });
    }
    return result;
  }

  lastPrice(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<ReadonlyArray<BinanceLastPriceWire>> {
    assertSymbol(symbol);
    return this.get(
      BINANCE_USDM_PATHS.lastPrice,
      { symbol },
      BINANCE_USDM_REQUEST_WEIGHTS.lastPriceBySymbol,
      parseLastPrices,
      signal,
    );
  }

  bookTicker(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<ReadonlyArray<BinanceBookTickerWire>> {
    assertSymbol(symbol);
    return this.get(
      BINANCE_USDM_PATHS.bookTicker,
      { symbol },
      BINANCE_USDM_REQUEST_WEIGHTS.bookTickerBySymbol,
      parseBookTickers,
      signal,
    );
  }

  premiumIndex(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<ReadonlyArray<BinancePremiumIndexWire>> {
    assertSymbol(symbol);
    return this.get(
      BINANCE_USDM_PATHS.premiumIndex,
      { symbol },
      BINANCE_USDM_REQUEST_WEIGHTS.premiumIndexBySymbol,
      parsePremiumIndexes,
      signal,
    );
  }

  fundingHistory(
    symbol: string,
    limit = 100,
    signal?: AbortSignal,
  ): Promise<ReadonlyArray<BinanceFundingHistoryWire>> {
    assertSymbol(symbol);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
      throw new BinanceUsdmSchemaError(
        "Funding-history limit must be from 1 to 1000.",
      );
    }
    this.fundingRateLimiter.acquire("funding-shared", 1, {
      weight: BINANCE_USDM_FUNDING_SHARED_BUDGET.requests,
      windowMs: BINANCE_USDM_FUNDING_SHARED_BUDGET.windowMs,
    });
    return this.get(
      BINANCE_USDM_PATHS.fundingHistory,
      { symbol, limit: limit.toString() },
      0,
      parseFundingHistory,
      signal,
    );
  }

  fundingInfo(
    signal?: AbortSignal,
  ): Promise<ReadonlyArray<BinanceFundingInfoWire>> {
    this.fundingRateLimiter.acquire("funding-shared", 1, {
      weight: BINANCE_USDM_FUNDING_SHARED_BUDGET.requests,
      windowMs: BINANCE_USDM_FUNDING_SHARED_BUDGET.windowMs,
    });
    return this.get(
      BINANCE_USDM_PATHS.fundingInfo,
      {},
      0,
      parseFundingInfo,
      signal,
    );
  }

  depth(
    symbol: string,
    limit: BinanceUsdmDepthLimit = 1_000,
    signal?: AbortSignal,
  ): Promise<BinanceDepthSnapshotWire> {
    assertSymbol(symbol);
    if (!BINANCE_USDM_DEPTH_LIMITS.includes(limit)) {
      throw new BinanceUsdmSchemaError(
        "Depth limit is not officially supported.",
      );
    }
    return this.get(
      BINANCE_USDM_PATHS.depth,
      { symbol, limit: limit.toString() },
      depthRequestWeight(limit),
      parseDepthSnapshot,
      signal,
    );
  }

  async serverTime(
    signal?: AbortSignal,
  ): Promise<BinanceUsdmServerTimeObservation> {
    const started = this.now();
    try {
      const wire = await this.get(
        BINANCE_USDM_PATHS.time,
        {},
        BINANCE_USDM_REQUEST_WEIGHTS.time,
        parseServerTime,
        signal,
      );
      const completed = this.now();
      if (
        !Number.isSafeInteger(started) ||
        !Number.isSafeInteger(completed) ||
        started < 0 ||
        completed < started
      ) {
        throw new BinanceUsdmSchemaError("Local server-time clock is invalid.");
      }
      const rtt = BigInt(completed - started);
      const midpoint = BigInt(started) + rtt / 2n;
      const quality =
        rtt <= BigInt(this.maximumHealthyRttMs) ? "HEALTHY" : "DEGRADED";
      this.serverTimeQualityValue = quality;
      this.options.metricSink?.increment(
        "market_data_server_time_quality_total",
        binanceUsdmMetricLabels("TICKER", quality),
      );
      this.options.eventSink?.emit({
        type: "BINANCE_USDM_SERVER_TIME_QUALITY",
        occurredAt: this.timestampNow(),
        capability: "TICKER",
        state: quality,
        ...(quality === "DEGRADED" ? { reasonCode: "FRESHNESS" as const } : {}),
      });
      return Object.freeze({
        serverTime: epochMilliseconds(wire.serverTime, "serverTime"),
        serverEpochMilliseconds: wire.serverTime,
        roundTripMilliseconds: rtt,
        clockOffsetMilliseconds: BigInt(wire.serverTime) - midpoint,
        quality,
      });
    } catch (error) {
      this.serverTimeQualityValue = "DEGRADED";
      this.options.metricSink?.increment(
        "market_data_server_time_quality_total",
        binanceUsdmMetricLabels("TICKER", "DEGRADED"),
      );
      throw error;
    }
  }

  serverTimeQuality(): typeof this.serverTimeQualityValue {
    return this.serverTimeQualityValue;
  }

  private async get<T>(
    path: BinanceUsdmPath,
    parameters: Readonly<Record<string, string | undefined>>,
    weight: number,
    parser: (value: unknown) => T,
    externalSignal?: AbortSignal,
  ): Promise<T> {
    if (weight > 0) {
      this.rateLimiter.acquire(
        "public-rest",
        weight,
        BINANCE_USDM_REQUEST_WEIGHT_BUDGET,
      );
    }
    const relative = buildPath(path, parameters);
    const expectedUrl = new URL(relative, BINANCE_USDM_REST_ORIGIN);
    if (
      expectedUrl.protocol !== "https:" ||
      expectedUrl.hostname !== "fapi.binance.com" ||
      expectedUrl.port !== ""
    ) {
      throw new BinanceUsdmAdapterError(
        "Constructed REST URL escaped the official TLS origin.",
        "CONFIGURATION",
        "BNFUT-05",
      );
    }
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal =
      externalSignal === undefined
        ? timeout
        : AbortSignal.any([timeout, externalSignal]);
    let response: Response;
    try {
      response = await this.request(expectedUrl, {
        method: "GET",
        redirect: "error",
        signal,
        headers: { accept: "application/json" },
      });
    } catch (error) {
      if (error instanceof BinanceUsdmAdapterError) throw error;
      throw new BinanceUsdmAdapterError(
        "Binance USD-M public request failed or was cancelled.",
        "NETWORK",
        "BNFUT-05",
      );
    }
    if (response.redirected) {
      throw new BinanceUsdmAdapterError(
        "Redirected REST responses are prohibited.",
        "NETWORK",
        "BNFUT-05",
      );
    }
    if (response.url.length > 0) {
      const actual = new URL(response.url);
      if (
        actual.origin !== BINANCE_USDM_REST_ORIGIN ||
        actual.pathname !== expectedUrl.pathname
      ) {
        throw new BinanceUsdmAdapterError(
          "REST response URL does not match the allowlisted request.",
          "NETWORK",
          "BNFUT-05",
        );
      }
    }
    let text: string;
    try {
      text = await readBoundedResponseText(response, this.maximumResponseBytes);
    } catch (error) {
      this.options.metricSink?.increment(
        "market_data_response_overflows_total",
        binanceUsdmMetricLabels("TICKER", "STALE"),
      );
      this.options.eventSink?.emit({
        type: "BINANCE_USDM_RESPONSE_OVERFLOW",
        occurredAt: this.timestampNow(),
        capability: "TICKER",
        state: "STALE",
        reasonCode: "CAPACITY",
      });
      throw error;
    }
    if (response.status === 429 || response.status === 418) {
      this.options.metricSink?.increment(
        "market_data_rate_limits_total",
        binanceUsdmMetricLabels("TICKER", "DEGRADED"),
      );
      this.options.eventSink?.emit({
        type: "BINANCE_USDM_RATE_LIMITED",
        occurredAt: this.timestampNow(),
        capability: "TICKER",
        state: "DEGRADED",
        reasonCode: "RATE_LIMIT",
      });
      throw new BinanceUsdmRateLimitError(
        response.status === 429
          ? "Binance USD-M public request rate limit was exceeded; caller-controlled backoff is required."
          : "Binance USD-M public IP is temporarily banned; automatic retry is prohibited.",
        response.status,
      );
    }
    const parsed = parseJsonPreservingIntegers(text, this.maximumResponseBytes);
    if (!response.ok) {
      let code = "UNKNOWN";
      try {
        code = parseBusinessError(parsed).code.toString();
      } catch {
        // The bounded payload is intentionally not included in the error.
      }
      throw new BinanceUsdmAdapterError(
        `Binance USD-M public API returned HTTP ${response.status} with business code ${code}.`,
        "NETWORK",
        "BNFUT-05",
      );
    }
    return parser(parsed);
  }
}
