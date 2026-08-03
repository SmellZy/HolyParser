import {
  timestamp,
  type QualityState,
  type Timestamp,
} from "@arbitrage/market-data";
import {
  BYBIT_LIMITS,
  BYBIT_PATHS,
  BYBIT_PUBLIC_PATHS,
  BYBIT_REST_DEPTH_LIMITS,
  BYBIT_REST_ORIGIN,
  assertBybitOfficialInstrumentId,
  type BybitPath,
  type BybitRestDepthLimit,
} from "./constants.js";
import {
  BybitLinearAdapterError,
  BybitLinearRateLimitError,
  BybitLinearSchemaError,
} from "./errors.js";
import type { BybitEventSink, BybitMetricSink } from "./observability.js";
import { metricLabels } from "./observability.js";
import { BybitPublicRateLimiter } from "./rate-limit.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import { epochMilliseconds } from "./time.js";
import {
  parseFundingHistory,
  parseInstruments,
  parseRestBook,
  parseServerTime,
  parseTickers,
  type BybitFundingHistoryWire,
  type BybitInstrumentsWire,
  type BybitRestBookWire,
  type BybitServerTimeWire,
  type BybitTickerWire,
} from "./wire.js";

export interface BybitRestClientOptions {
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maximumResponseBytes?: number;
  readonly limiter?: BybitPublicRateLimiter;
  readonly now?: () => number;
  readonly timestampNow?: () => Timestamp;
  readonly maximumHealthyRttMs?: number;
  readonly metricSink?: BybitMetricSink;
  readonly eventSink?: BybitEventSink;
}
export interface BybitServerTimeObservation {
  readonly serverTime: Timestamp;
  readonly serverEpochMilliseconds: string;
  readonly roundTripMilliseconds: bigint;
  readonly clockOffsetMilliseconds: bigint;
  readonly quality: "HEALTHY" | "DEGRADED";
}

function buildPath(
  path: BybitPath,
  parameters: Readonly<Record<string, string | undefined>>,
): string {
  if (!BYBIT_PUBLIC_PATHS.has(path))
    throw new BybitLinearAdapterError(
      "REST path is outside the fixed public allowlist.",
      "CONFIGURATION",
      "BYBIT-07",
    );
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters))
    if (value !== undefined) search.set(key, value);
  const suffix = search.toString();
  return suffix === "" ? path : `${path}?${suffix}`;
}
async function boundedText(
  response: Response,
  maximum: number,
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
      if (total > maximum) {
        await reader.cancel();
        throw new BybitLinearSchemaError(
          "REST response exceeds the streaming byte limit.",
          "BYBIT-07",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new BybitLinearSchemaError(
      "REST response is not valid UTF-8.",
      "BYBIT-07",
    );
  }
}
function assertSymbol(symbol: string): void {
  try {
    assertBybitOfficialInstrumentId(symbol);
  } catch {
    throw new BybitLinearSchemaError(
      "Symbol is not a bounded opaque Bybit identifier.",
    );
  }
}

export class BybitLinearPublicRestClient {
  private readonly request: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maximumResponseBytes: number;
  private readonly limiter: BybitPublicRateLimiter;
  private readonly now: () => number;
  private readonly timestampNow: () => Timestamp;
  private readonly maximumHealthyRttMs: number;
  private serverTimeQualityValue: Extract<
    QualityState,
    "UNVERIFIED" | "HEALTHY" | "DEGRADED"
  > = "UNVERIFIED";
  constructor(private readonly options: BybitRestClientOptions = {}) {
    this.request = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? BYBIT_LIMITS.requestTimeoutMs;
    this.maximumResponseBytes =
      options.maximumResponseBytes ?? BYBIT_LIMITS.responseBytes;
    this.limiter = options.limiter ?? new BybitPublicRateLimiter();
    this.now = options.now ?? Date.now;
    this.timestampNow =
      options.timestampNow ?? (() => timestamp(new Date().toISOString()));
    this.maximumHealthyRttMs = options.maximumHealthyRttMs ?? 2_000;
    for (const value of [
      this.timeoutMs,
      this.maximumResponseBytes,
      this.maximumHealthyRttMs,
    ])
      if (!Number.isSafeInteger(value) || value <= 0)
        throw new BybitLinearAdapterError(
          "REST bounds must be positive safe integers.",
          "CONFIGURATION",
          "BYBIT-07",
        );
  }
  instruments(
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<BybitInstrumentsWire> {
    if (cursor !== undefined && (cursor.length === 0 || cursor.length > 512))
      throw new BybitLinearSchemaError(
        "Pagination cursor is invalid.",
        "BYBIT-02",
      );
    return this.get(
      BYBIT_PATHS.instruments,
      { category: "linear", limit: "1000", cursor },
      parseInstruments,
      signal,
    );
  }
  tickers(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<readonly BybitTickerWire[]> {
    assertSymbol(symbol);
    return this.get(
      BYBIT_PATHS.tickers,
      { category: "linear", symbol },
      parseTickers,
      signal,
    );
  }
  fundingHistory(
    symbol: string,
    limit = 200,
    signal?: AbortSignal,
  ): Promise<readonly BybitFundingHistoryWire[]> {
    assertSymbol(symbol);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200)
      throw new BybitLinearSchemaError(
        "Funding-history limit must be 1..200.",
        "BYBIT-04",
      );
    return this.get(
      BYBIT_PATHS.fundingHistory,
      { category: "linear", symbol, limit: limit.toString() },
      parseFundingHistory,
      signal,
    );
  }
  orderbook(
    symbol: string,
    limit: BybitRestDepthLimit = 50,
    signal?: AbortSignal,
  ): Promise<BybitRestBookWire> {
    assertSymbol(symbol);
    if (!BYBIT_REST_DEPTH_LIMITS.includes(limit))
      throw new BybitLinearSchemaError(
        "REST depth limit is not documented.",
        "BYBIT-05",
      );
    return this.get(
      BYBIT_PATHS.orderbook,
      { category: "linear", symbol, limit: limit.toString() },
      parseRestBook,
      signal,
    );
  }
  async serverTime(signal?: AbortSignal): Promise<BybitServerTimeObservation> {
    const started = this.now();
    try {
      const wire = await this.get(
        BYBIT_PATHS.time,
        {},
        parseServerTime,
        signal,
      );
      const completed = this.now();
      if (
        !Number.isSafeInteger(started) ||
        !Number.isSafeInteger(completed) ||
        completed < started ||
        started < 0
      )
        throw new BybitLinearSchemaError(
          "Local time source is invalid.",
          "BYBIT-11",
        );
      const rtt = BigInt(completed - started);
      const midpoint = BigInt(started) + rtt / 2n;
      const serverMilliseconds = BigInt(wire.timeNano) / 1_000_000n;
      if (serverMilliseconds / 1_000n !== BigInt(wire.timeSecond))
        throw new BybitLinearSchemaError(
          "Server time second/nanosecond fields contradict.",
          "BYBIT-11",
        );
      const quality =
        rtt <= BigInt(this.maximumHealthyRttMs)
          ? ("HEALTHY" as const)
          : ("DEGRADED" as const);
      this.serverTimeQualityValue = quality;
      this.options.metricSink?.increment(
        "market_data_server_time_quality_total",
        metricLabels("TICKER", quality),
      );
      return Object.freeze({
        serverTime: epochMilliseconds(
          serverMilliseconds.toString(),
          "serverTime",
        ),
        serverEpochMilliseconds: serverMilliseconds.toString(),
        roundTripMilliseconds: rtt,
        clockOffsetMilliseconds: serverMilliseconds - midpoint,
        quality,
      });
    } catch (error) {
      this.serverTimeQualityValue = "DEGRADED";
      throw error;
    }
  }
  serverTimeQuality(): typeof this.serverTimeQualityValue {
    return this.serverTimeQualityValue;
  }
  private async get<T>(
    path: BybitPath,
    parameters: Readonly<Record<string, string | undefined>>,
    parser: (value: unknown) => T,
    callerSignal?: AbortSignal,
  ): Promise<T> {
    if (callerSignal?.aborted)
      throw new BybitLinearAdapterError(
        "Bybit REST request was cancelled before dispatch.",
        "TRANSPORT",
        "BYBIT-07",
      );
    this.limiter.acquire();
    const relative = buildPath(path, parameters);
    const expected = new URL(relative, BYBIT_REST_ORIGIN);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("Bybit REST deadline exceeded.")),
      this.timeoutMs,
    );
    const abort = () => controller.abort(callerSignal?.reason);
    callerSignal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await this.request(expected, {
        method: "GET",
        redirect: "error",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (response.url !== "" && response.url !== expected.toString())
        throw new BybitLinearAdapterError(
          "REST response URL escaped the allowlist.",
          "TRANSPORT",
          "BYBIT-07",
        );
      const text = await boundedText(response, this.maximumResponseBytes);
      if (response.status === 403 || response.status === 429) {
        this.options.metricSink?.increment(
          "market_data_rate_limits_total",
          metricLabels("TICKER", "STALE"),
        );
        throw new BybitLinearRateLimitError(
          response.status === 403
            ? "Bybit returned HTTP 403; public IP limit or region restriction may apply."
            : "Bybit returned HTTP 429 system-level frequency protection.",
        );
      }
      if (!response.ok)
        throw new BybitLinearAdapterError(
          `Bybit REST returned HTTP ${response.status}.`,
          "HTTP",
          "BYBIT-10",
        );
      const parsed = parseJsonPreservingIntegers(
        text,
        this.maximumResponseBytes,
      );
      return parser(parsed);
    } catch (error) {
      if (error instanceof BybitLinearAdapterError) throw error;
      if (controller.signal.aborted)
        throw new BybitLinearAdapterError(
          "Bybit REST request was cancelled or timed out.",
          "TRANSPORT",
          "BYBIT-07",
        );
      throw new BybitLinearAdapterError(
        "Bybit REST transport failed.",
        "TRANSPORT",
        "BYBIT-07",
      );
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abort);
    }
  }
}
