import {
  BYBIT_LIMITS,
  BYBIT_WS_URL,
  bybitOrderbookTopic,
} from "./constants.js";
import { BybitLinearAdapterError } from "./errors.js";
import { BybitLinearPublicRestClient } from "./rest.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import { parseWsMessage } from "./wire.js";

export interface BybitCanaryResult {
  readonly kind: "POINT_IN_TIME";
  readonly serverEpochMilliseconds: string;
  readonly sampledInstrumentId: string;
  readonly instrumentRows: number;
  readonly tickerRows: number;
  readonly fundingRows: number;
  readonly restBookUpdateId: string;
  readonly websocketSnapshotUpdateId: string;
  readonly websocketDeltaUpdateId: string;
  readonly websocketMessageCount: number;
}

async function probeWebSocket(
  symbol: string,
  signal: AbortSignal,
): Promise<{
  snapshotUpdateId: string;
  deltaUpdateId: string;
  messages: number;
}> {
  if (signal.aborted)
    throw new BybitLinearAdapterError(
      "Bybit canary was cancelled before WebSocket dispatch.",
      "TRANSPORT",
      "BYBIT-08",
    );
  const topic = bybitOrderbookTopic(symbol, 50);
  return await new Promise((resolve, reject) => {
    const socket = new WebSocket(BYBIT_WS_URL);
    let messages = 0;
    let settled = false;
    let snapshotUpdateId: string | undefined;
    const finish = (
      error?: Error,
      value?: {
        snapshotUpdateId: string;
        deltaUpdateId: string;
        messages: number;
      },
    ) => {
      if (settled) return;
      settled = true;
      socket.close(1000, "Canary complete");
      signal.removeEventListener("abort", abort);
      if (error !== undefined) reject(error);
      else if (value !== undefined) resolve(value);
    };
    const abort = () =>
      finish(
        new BybitLinearAdapterError(
          "Bybit canary was cancelled.",
          "TRANSPORT",
          "BYBIT-08",
        ),
      );
    signal.addEventListener("abort", abort, { once: true });
    socket.addEventListener("open", () =>
      socket.send(
        JSON.stringify({
          req_id: "bybit-linear-canary-v1",
          op: "subscribe",
          args: [topic],
        }),
      ),
    );
    socket.addEventListener("message", (event) => {
      try {
        if (typeof event.data !== "string")
          throw new Error("Non-text WebSocket message.");
        messages += 1;
        if (messages > BYBIT_LIMITS.canaryMessages)
          throw new Error("Canary message bound exceeded.");
        const parsed = parseWsMessage(
          parseJsonPreservingIntegers(
            event.data,
            BYBIT_LIMITS.websocketMessageBytes,
          ),
        );
        if (parsed.kind === "BOOK" && parsed.value.topic === topic) {
          if (parsed.value.type === "snapshot") {
            snapshotUpdateId = parsed.value.updateId;
          } else if (snapshotUpdateId !== undefined) {
            finish(undefined, {
              snapshotUpdateId,
              deltaUpdateId: parsed.value.updateId,
              messages,
            });
          }
        }
      } catch {
        finish(
          new BybitLinearAdapterError(
            "Bybit canary WebSocket schema drift or invalid response.",
            "SCHEMA",
            "BYBIT-06",
          ),
        );
      }
    });
    socket.addEventListener("error", () =>
      finish(
        new BybitLinearAdapterError(
          "Bybit canary WebSocket external access failed.",
          "TRANSPORT",
          "BYBIT-08",
        ),
      ),
    );
    socket.addEventListener("close", () => {
      if (!settled)
        finish(
          new BybitLinearAdapterError(
            "Bybit canary WebSocket closed before a snapshot.",
            "TRANSPORT",
            "BYBIT-08",
          ),
        );
    });
  });
}

export async function runBybitLinearCanary(
  signal?: AbortSignal,
): Promise<BybitCanaryResult> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Immutable canary deadline exceeded.")),
    BYBIT_LIMITS.canaryDurationMs,
  );
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort(signal.reason);
  try {
    let requests = 0;
    const client = new BybitLinearPublicRestClient({
      fetch: (input, init) => {
        requests += 1;
        if (requests > BYBIT_LIMITS.canaryRequests) {
          throw new BybitLinearAdapterError(
            "Bybit canary request bound exceeded.",
            "CONFIGURATION",
            "BYBIT-07",
          );
        }
        return fetch(input, init);
      },
    });
    const server = await client.serverTime(controller.signal);
    const instruments = await client.instruments(undefined, controller.signal);
    const sample = instruments.instruments.find(
      (row) =>
        row.status === "Trading" && row.contractType === "LinearPerpetual",
    );
    if (sample === undefined)
      throw new BybitLinearAdapterError(
        "No supported active linear perpetual was observed.",
        "SCHEMA",
        "BYBIT-02",
      );
    const tickers = await client.tickers(sample.symbol, controller.signal);
    const funding = await client.fundingHistory(
      sample.symbol,
      1,
      controller.signal,
    );
    const book = await client.orderbook(sample.symbol, 50, controller.signal);
    const websocket = await probeWebSocket(sample.symbol, controller.signal);
    return Object.freeze({
      kind: "POINT_IN_TIME",
      serverEpochMilliseconds: server.serverEpochMilliseconds,
      sampledInstrumentId: sample.symbol,
      instrumentRows: instruments.instruments.length,
      tickerRows: tickers.length,
      fundingRows: funding.length,
      restBookUpdateId: book.updateId,
      websocketSnapshotUpdateId: websocket.snapshotUpdateId,
      websocketDeltaUpdateId: websocket.deltaUpdateId,
      websocketMessageCount: websocket.messages,
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

if (process.argv[1]?.endsWith("canary.js")) {
  if (process.env.BYBIT_LINEAR_LIVE_CANARY !== "1") {
    console.log(
      "Bybit linear live canary is disabled; set BYBIT_LINEAR_LIVE_CANARY=1 to opt in.",
    );
  } else {
    runBybitLinearCanary()
      .then((result) => console.log(JSON.stringify(result)))
      .catch((error) => {
        console.error(
          error instanceof Error ? error.message : "Bybit canary failed.",
        );
        process.exitCode = 1;
      });
  }
}
