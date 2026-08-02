import { pathToFileURL } from "node:url";
import {
  OKX_BOOK_CHANNEL,
  OKX_GLOBAL_PUBLIC_WS_URL,
  OKX_LIMITS,
} from "./constants.js";
import { OkxAdapterError } from "./errors.js";
import { OkxPublicRestClient } from "./rest.js";
import { parseJsonPreservingSequenceIds } from "./runtime-schema.js";
import { parseWebSocketMessage } from "./wire.js";
import {
  okxMetricLabels,
  type OkxEventSink,
  type OkxMetricSink,
} from "./observability.js";
import type { OkxWebSocketFactory, OkxWebSocketLike } from "./websocket.js";
import { price, quantity, timestamp } from "@arbitrage/market-data";
import { epochMilliseconds } from "./time.js";

export interface OkxCanaryEvidence {
  readonly serverTime: string;
  readonly swapInstrumentCount: number;
  readonly futuresInstrumentCount: number;
  readonly sampledInstrumentId: string;
  readonly tickerRows: number;
  readonly markRows: number;
  readonly restBookSequenceId: string;
  readonly websocketSnapshotSequenceId: string;
}

export interface OkxCanaryOptions {
  readonly webSocketFactory?: OkxWebSocketFactory;
  readonly websocketTimeoutMs?: number;
  readonly maximumWebSocketMessages?: number;
  readonly eventSink?: OkxEventSink;
  readonly metricSink?: OkxMetricSink;
}

function liveWebSocketFactory(url: string): OkxWebSocketLike {
  return new WebSocket(url) as unknown as OkxWebSocketLike;
}

export function receiveSnapshot(
  officialInstrumentId: string,
  timeoutMs: number,
  maximumMessages: number,
  webSocketFactory: OkxWebSocketFactory = liveWebSocketFactory,
): Promise<string> {
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 10_000 ||
    !Number.isSafeInteger(maximumMessages) ||
    maximumMessages <= 0 ||
    maximumMessages > OKX_LIMITS.canaryMaximumMessages
  ) {
    return Promise.reject(
      new OkxAdapterError(
        "OKX canary bounds exceed the approved local maximum.",
        "CONFIGURATION",
        "OKX-01",
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const socket = webSocketFactory(OKX_GLOBAL_PUBLIC_WS_URL);
    let finished = false;
    let receivedMessages = 0;
    const timeout = setTimeout(() => {
      finish({
        error: new OkxAdapterError(
          "Bounded OKX WebSocket canary timed out.",
          "TRANSPORT",
          "OKX-01",
        ),
      });
    }, timeoutMs);

    const finish = (result: {
      readonly value?: string;
      readonly error?: Error;
    }) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeout);
      socket.close(1_000, "Canary complete");
      if (result.error !== undefined) {
        reject(result.error);
      } else if (result.value !== undefined) {
        resolve(result.value);
      }
    };

    socket.addEventListener("open", () => {
      const request = JSON.stringify({
        id: "phase2a2canary",
        op: "subscribe",
        args: [{ channel: OKX_BOOK_CHANNEL, instId: officialInstrumentId }],
      });
      if (
        new TextEncoder().encode(request).byteLength >
        OKX_LIMITS.subscriptionBytes
      ) {
        finish({
          error: new OkxAdapterError(
            "Canary subscription exceeds the official byte limit.",
            "CONFIGURATION",
            "OKX-01",
          ),
        });
        return;
      }
      socket.send(request);
    });
    socket.addEventListener("message", (event) => {
      const messageEvent = event as MessageEvent;
      receivedMessages += 1;
      if (receivedMessages > maximumMessages) {
        finish({
          error: new OkxAdapterError(
            "OKX WebSocket canary exceeded its message-count bound.",
            "DATA_QUALITY",
            "OKX-01",
          ),
        });
        return;
      }
      if (typeof messageEvent.data !== "string") {
        finish({
          error: new OkxAdapterError(
            "Canary received a non-text JSON frame.",
            "SCHEMA",
            "OKX-01",
          ),
        });
        return;
      }
      try {
        const parsed = parseWebSocketMessage(
          parseJsonPreservingSequenceIds(
            messageEvent.data,
            OKX_LIMITS.websocketMessageBytes,
          ),
        );
        if (
          parsed.kind === "BOOK" &&
          parsed.action === "snapshot" &&
          parsed.instId === officialInstrumentId
        ) {
          const row = parsed.data[0];
          if (row === undefined) {
            throw new OkxAdapterError(
              "Canary snapshot contains no book row.",
              "SCHEMA",
              "OKX-01",
            );
          }
          if (row.prevSeqId !== "-1" || row.checksum !== "0") {
            throw new OkxAdapterError(
              "Canary snapshot failed initial-sequence or checksum validation.",
              "DATA_QUALITY",
              "OKX-01",
            );
          }
          epochMilliseconds(row.ts, "canary.books.ts");
          for (const [rawPrice, rawQuantity] of [...row.bids, ...row.asks]) {
            price(rawPrice);
            quantity(rawQuantity);
          }
          finish({ value: row.seqId });
        } else if (parsed.kind === "ERROR") {
          finish({
            error: new OkxAdapterError(
              `OKX WebSocket canary error ${parsed.code}: ${parsed.msg}`,
              "REMOTE",
              "OKX-01",
            ),
          });
        }
      } catch (error) {
        finish({
          error:
            error instanceof Error
              ? error
              : new Error("Unknown OKX canary error."),
        });
      }
    });
    socket.addEventListener("error", () => {
      finish({
        error: new OkxAdapterError(
          "OKX WebSocket canary transport failed.",
          "TRANSPORT",
          "OKX-01",
        ),
      });
    });
  });
}

export async function runOkxPublicCanary(
  options: OkxCanaryOptions = {},
): Promise<OkxCanaryEvidence> {
  const rest = new OkxPublicRestClient({
    timeoutMs: OKX_LIMITS.requestTimeoutMs,
    maximumResponseBytes: OKX_LIMITS.responseBytes,
    eventSink: options.eventSink,
    metricSink: options.metricSink,
  });
  try {
    const [time, swaps, futures] = await Promise.all([
      rest.serverTime(),
      rest.instruments("SWAP"),
      rest.instruments("FUTURES"),
    ]);
    const sample = swaps.find((row) => row.state === "live");
    if (sample === undefined) {
      throw new OkxAdapterError(
        "OKX canary could not find a live SWAP instrument.",
        "DATA_QUALITY",
        "OKX-01",
      );
    }
    const [tickers, marks, books, websocketSequence] = await Promise.all([
      rest.tickers("SWAP"),
      rest.markPrices("SWAP", sample.instId),
      rest.orderBook(sample.instId, "5"),
      receiveSnapshot(
        sample.instId,
        options.websocketTimeoutMs ?? 10_000,
        options.maximumWebSocketMessages ?? OKX_LIMITS.canaryMaximumMessages,
        options.webSocketFactory,
      ),
    ]);
    const book = books[0];
    if (book === undefined) {
      throw new OkxAdapterError(
        "OKX canary REST book is empty.",
        "DATA_QUALITY",
        "OKX-01",
      );
    }
    options.metricSink?.increment(
      "market_data_canary_outcomes_total",
      okxMetricLabels("WEBSOCKET_ORDER_BOOK_SNAPSHOT", "HEALTHY"),
    );
    options.eventSink?.emit({
      type: "OKX_CANARY_SUCCEEDED",
      occurredAt: timestamp(new Date().toISOString()),
      capability: "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
      state: "HEALTHY",
    });
    return Object.freeze({
      serverTime: time.epochMilliseconds,
      swapInstrumentCount: swaps.length,
      futuresInstrumentCount: futures.length,
      sampledInstrumentId: sample.instId,
      tickerRows: tickers.length,
      markRows: marks.length,
      restBookSequenceId: book.seqId,
      websocketSnapshotSequenceId: websocketSequence,
    });
  } catch (error) {
    options.metricSink?.increment(
      "market_data_canary_outcomes_total",
      okxMetricLabels("WEBSOCKET_ORDER_BOOK_SNAPSHOT", "DEGRADED"),
    );
    options.eventSink?.emit({
      type: "OKX_CANARY_FAILED",
      occurredAt: timestamp(new Date().toISOString()),
      capability: "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
      state: "DEGRADED",
      reason: "Bounded OKX public canary failed.",
    });
    throw error;
  }
}

async function main(): Promise<void> {
  if (process.env.OKX_LIVE_CANARY !== "1") {
    process.stdout.write(
      "OKX public canary skipped; set OKX_LIVE_CANARY=1 to opt in.\n",
    );
    return;
  }
  const evidence = await runOkxPublicCanary();
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
}

const entryPoint = process.argv[1];
if (
  entryPoint !== undefined &&
  import.meta.url === pathToFileURL(entryPoint).href
) {
  await main();
}
