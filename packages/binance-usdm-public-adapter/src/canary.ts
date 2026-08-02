import { pathToFileURL } from "node:url";
import {
  BINANCE_USDM_LIMITS,
  type BinanceUsdmDepthCadence,
} from "./constants.js";
import { BinanceUsdmAdapterError } from "./errors.js";
import {
  binanceUsdmMetricLabels,
  type BinanceUsdmEventSink,
  type BinanceUsdmMetricSink,
} from "./observability.js";
import { BinanceUsdmPublicRestClient } from "./rest.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import {
  buildBinanceUsdmDiffDepthUrl,
  type BinanceUsdmWebSocketFactory,
  type BinanceUsdmWebSocketLike,
} from "./websocket.js";
import { parseDiffDepth } from "./wire.js";
import { timestamp } from "@arbitrage/market-data";

export class BinanceUsdmCanaryExternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BinanceUsdmCanaryExternalError";
  }
}

export interface BinanceUsdmCanaryEvidence {
  readonly observedAt: string;
  readonly serverTime: string;
  readonly instrumentCount: number;
  readonly quarantinedInstrumentRows: number;
  readonly sampledInstrumentId: string;
  readonly lastPriceRows: number;
  readonly bookTickerRows: number;
  readonly premiumIndexRows: number;
  readonly adjustedFundingRows: number;
  readonly restDepthUpdateId: string;
  readonly websocketFinalUpdateId: string;
}

export interface BinanceUsdmCanaryOptions {
  readonly fetch?: typeof fetch;
  readonly webSocketFactory?: BinanceUsdmWebSocketFactory;
  readonly signal?: AbortSignal;
  readonly eventSink?: BinanceUsdmEventSink;
  readonly metricSink?: BinanceUsdmMetricSink;
}

function liveFactory(url: string): BinanceUsdmWebSocketLike {
  return new WebSocket(url) as unknown as BinanceUsdmWebSocketLike;
}

export function receiveOneDiffDepth(
  symbol: string,
  factory: BinanceUsdmWebSocketFactory = liveFactory,
  cadence: BinanceUsdmDepthCadence = "100ms",
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = factory(buildBinanceUsdmDiffDepthUrl(symbol, cadence));
    let messages = 0;
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (value?: string, error?: Error) => {
      if (finished) return;
      finished = true;
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      socket.close(1_000, "Canary complete");
      if (error !== undefined) reject(error);
      else if (value !== undefined) resolve(value);
    };
    const abort = () =>
      finish(
        undefined,
        new BinanceUsdmCanaryExternalError("Canary was cancelled."),
      );
    timer = setTimeout(() => {
      finish(
        undefined,
        new BinanceUsdmCanaryExternalError(
          "Bounded WebSocket canary timed out.",
        ),
      );
    }, BINANCE_USDM_LIMITS.canaryDurationMs);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted === true) {
      abort();
      return;
    }

    socket.addEventListener("message", (event) => {
      messages += 1;
      if (messages > BINANCE_USDM_LIMITS.canaryMessages) {
        finish(
          undefined,
          new BinanceUsdmCanaryExternalError(
            "Canary exceeded its immutable message bound.",
          ),
        );
        return;
      }
      const data = (event as MessageEvent).data;
      if (typeof data !== "string") {
        finish(
          undefined,
          new BinanceUsdmCanaryExternalError(
            "Canary received a non-text frame.",
          ),
        );
        return;
      }
      try {
        const row = parseDiffDepth(
          parseJsonPreservingIntegers(
            data,
            BINANCE_USDM_LIMITS.websocketMessageBytes,
          ),
        );
        if (row.symbol !== symbol) {
          throw new BinanceUsdmCanaryExternalError(
            "Canary stream returned a different symbol.",
          );
        }
        finish(row.finalUpdateId);
      } catch (error) {
        finish(
          undefined,
          error instanceof Error
            ? error
            : new BinanceUsdmCanaryExternalError(
                "Unknown canary schema failure.",
              ),
        );
      }
    });
    socket.addEventListener("error", () => {
      finish(
        undefined,
        new BinanceUsdmCanaryExternalError(
          "Public WebSocket transport failed.",
        ),
      );
    });
    socket.addEventListener("close", () => {
      if (!finished) {
        finish(
          undefined,
          new BinanceUsdmCanaryExternalError(
            "Public WebSocket closed before data.",
          ),
        );
      }
    });
  });
}

export async function runBinanceUsdmPublicCanary(
  options: BinanceUsdmCanaryOptions = {},
): Promise<BinanceUsdmCanaryEvidence> {
  const deadline = AbortSignal.timeout(BINANCE_USDM_LIMITS.canaryDurationMs);
  const signal =
    options.signal === undefined
      ? deadline
      : AbortSignal.any([deadline, options.signal]);
  const rest = new BinanceUsdmPublicRestClient({
    fetch: options.fetch,
    timeoutMs: BINANCE_USDM_LIMITS.requestTimeoutMs,
    maximumResponseBytes: BINANCE_USDM_LIMITS.responseBytes,
    eventSink: options.eventSink,
    metricSink: options.metricSink,
  });
  try {
    const server = await rest.serverTime(signal);
    const exchange = await rest.exchangeInfo(signal);
    const sample = exchange.symbols.find(
      (row) => row.status === "TRADING" && row.contractType === "PERPETUAL",
    );
    if (sample === undefined) {
      throw new BinanceUsdmCanaryExternalError(
        "No active USD-M perpetual instrument was returned at this point in time.",
      );
    }
    const [last, bookTicker, premium, fundingInfo, depth, websocketUpdateId] =
      await Promise.all([
        rest.lastPrice(sample.symbol, signal),
        rest.bookTicker(sample.symbol, signal),
        rest.premiumIndex(sample.symbol, signal),
        rest.fundingInfo(signal),
        rest.depth(sample.symbol, 5, signal),
        receiveOneDiffDepth(
          sample.symbol,
          options.webSocketFactory,
          "100ms",
          signal,
        ),
      ]);
    options.metricSink?.increment(
      "market_data_canary_outcomes_total",
      binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "HEALTHY"),
    );
    options.eventSink?.emit({
      type: "BINANCE_USDM_CANARY_RESULT",
      occurredAt: timestamp(new Date().toISOString()),
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "HEALTHY",
    });
    return Object.freeze({
      observedAt: new Date().toISOString(),
      serverTime: server.serverEpochMilliseconds,
      instrumentCount: exchange.symbols.length,
      quarantinedInstrumentRows: exchange.rejectedInstrumentCount,
      sampledInstrumentId: sample.symbol,
      lastPriceRows: last.length,
      bookTickerRows: bookTicker.length,
      premiumIndexRows: premium.length,
      adjustedFundingRows: fundingInfo.length,
      restDepthUpdateId: depth.lastUpdateId,
      websocketFinalUpdateId: websocketUpdateId,
    });
  } catch (error) {
    options.metricSink?.increment(
      "market_data_canary_outcomes_total",
      binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "DEGRADED"),
    );
    options.eventSink?.emit({
      type: "BINANCE_USDM_CANARY_RESULT",
      occurredAt: timestamp(new Date().toISOString()),
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "DEGRADED",
      reasonCode: "EXTERNAL",
    });
    if (
      error instanceof BinanceUsdmAdapterError ||
      error instanceof BinanceUsdmCanaryExternalError
    ) {
      throw error;
    }
    throw new BinanceUsdmCanaryExternalError(
      "Public Binance USD-M canary failed because external access was unavailable.",
    );
  }
}

async function main(): Promise<void> {
  if (process.env.BINANCE_USDM_LIVE_CANARY !== "1") {
    throw new Error(
      "Live canary is disabled. Set BINANCE_USDM_LIVE_CANARY=1 explicitly.",
    );
  }
  const result = await runBinanceUsdmPublicCanary();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown canary failure.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
