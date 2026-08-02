import { timestamp, type Timestamp } from "@arbitrage/market-data";
import {
  BINANCE_USDM_LIMITS,
  BINANCE_USDM_WS_ORIGIN,
  BINANCE_USDM_WS_PATH_PREFIXES,
  diffDepthStreamName,
  type BinanceUsdmDepthCadence,
} from "./constants.js";
import {
  BinanceUsdmAdapterError,
  BinanceUsdmQueueOverflowError,
} from "./errors.js";
import { BinanceUsdmBookSession } from "./book-session.js";
import {
  binanceUsdmMetricLabels,
  type BinanceUsdmEventSink,
  type BinanceUsdmMetricSink,
} from "./observability.js";
import { BoundedMessageQueue } from "./queue.js";

export interface BinanceUsdmWebSocketLike {
  readonly readyState: number;
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: Event | MessageEvent) => void,
  ): void;
  close(code?: number, reason?: string): void;
}

export type BinanceUsdmWebSocketFactory = (
  url: string,
) => BinanceUsdmWebSocketLike;

export interface BinanceUsdmWebSocketControllerOptions {
  readonly session: BinanceUsdmBookSession;
  readonly officialInstrumentId: string;
  readonly cadence: BinanceUsdmDepthCadence;
  readonly webSocketFactory?: BinanceUsdmWebSocketFactory;
  readonly timestampNow?: () => Timestamp;
  readonly maximumMessageBytes?: number;
  readonly maximumQueuedMessages?: number;
  readonly maximumQueuedBytes?: number;
  readonly connectTimeoutMs?: number;
  readonly reconnectMaximumAttempts?: number;
  readonly reconnectDelayMs?: number;
  readonly eventSink?: BinanceUsdmEventSink;
  readonly metricSink?: BinanceUsdmMetricSink;
}

interface QueuedMessage {
  readonly text: string;
  readonly receiveTimestamp: Timestamp;
}

function defaultFactory(url: string): BinanceUsdmWebSocketLike {
  return new WebSocket(url) as unknown as BinanceUsdmWebSocketLike;
}

export function buildBinanceUsdmDiffDepthUrl(
  officialInstrumentId: string,
  cadence: BinanceUsdmDepthCadence,
): string {
  const stream = diffDepthStreamName(officialInstrumentId, cadence);
  const url = new URL(`/public/ws/${stream}`, BINANCE_USDM_WS_ORIGIN);
  if (
    url.protocol !== "wss:" ||
    url.hostname !== "fstream.binance.com" ||
    url.port !== "" ||
    !BINANCE_USDM_WS_PATH_PREFIXES.some((prefix) =>
      url.pathname.startsWith(prefix),
    )
  ) {
    throw new BinanceUsdmAdapterError(
      "WebSocket URL escaped the official routed public allowlist.",
      "CONFIGURATION",
      "BNFUT-09",
    );
  }
  return url.toString();
}

export class BinanceUsdmDiffDepthController {
  private readonly factory: BinanceUsdmWebSocketFactory;
  private readonly timestampNow: () => Timestamp;
  private readonly maximumMessageBytes: number;
  private readonly connectTimeoutMs: number;
  private readonly reconnectMaximumAttempts: number;
  private readonly reconnectDelayMs: number;
  private readonly queue: BoundedMessageQueue<QueuedMessage>;
  private socket?: BinanceUsdmWebSocketLike;
  private stopped = true;
  private draining = false;
  private reconnectAttempt = 0;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly options: BinanceUsdmWebSocketControllerOptions) {
    buildBinanceUsdmDiffDepthUrl(options.officialInstrumentId, options.cadence);
    this.factory = options.webSocketFactory ?? defaultFactory;
    this.timestampNow =
      options.timestampNow ?? (() => timestamp(new Date().toISOString()));
    this.maximumMessageBytes =
      options.maximumMessageBytes ?? BINANCE_USDM_LIMITS.websocketMessageBytes;
    this.connectTimeoutMs =
      options.connectTimeoutMs ?? BINANCE_USDM_LIMITS.websocketConnectTimeoutMs;
    this.reconnectMaximumAttempts =
      options.reconnectMaximumAttempts ??
      BINANCE_USDM_LIMITS.reconnectMaximumAttempts;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 500;
    this.queue = new BoundedMessageQueue(
      options.maximumQueuedMessages ?? BINANCE_USDM_LIMITS.queuedMessages,
      options.maximumQueuedBytes ?? BINANCE_USDM_LIMITS.queuedBytes,
    );
    for (const value of [
      this.maximumMessageBytes,
      this.connectTimeoutMs,
      this.reconnectDelayMs,
    ]) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new BinanceUsdmAdapterError(
          "WebSocket bounds must be positive safe integers.",
          "CONFIGURATION",
          "BNFUT-11",
        );
      }
    }
    if (
      !Number.isSafeInteger(this.reconnectMaximumAttempts) ||
      this.reconnectMaximumAttempts < 0
    ) {
      throw new BinanceUsdmAdapterError(
        "Reconnect-attempt bound must be a non-negative safe integer.",
        "CONFIGURATION",
        "BNFUT-11",
      );
    }
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.reconnectAttempt = 0;
    this.connect();
  }

  stop(): void {
    if (!this.stopped) {
      this.options.session.stop(this.timestampNow());
    }
    this.stopped = true;
    this.clearTimers();
    this.queue.clear();
    this.socket?.close(1_000, "Client shutdown");
    this.socket = undefined;
  }

  state(): Readonly<{
    stopped: boolean;
    reconnectAttempt: number;
    queuedMessages: number;
    queuedBytes: number;
    hasSocket: boolean;
  }> {
    const queue = this.queue.state();
    return Object.freeze({
      stopped: this.stopped,
      reconnectAttempt: this.reconnectAttempt,
      queuedMessages: queue.messages,
      queuedBytes: queue.bytes,
      hasSocket: this.socket !== undefined,
    });
  }

  private connect(): void {
    if (this.stopped || this.socket !== undefined) return;
    const url = buildBinanceUsdmDiffDepthUrl(
      this.options.officialInstrumentId,
      this.options.cadence,
    );
    let socket: BinanceUsdmWebSocketLike;
    try {
      socket = this.factory(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.addEventListener("open", () => this.onOpen(socket));
    socket.addEventListener("message", (event) =>
      this.onMessage(socket, event as MessageEvent),
    );
    socket.addEventListener("close", () => this.onDisconnect(socket));
    socket.addEventListener("error", () => this.onDisconnect(socket));
    this.connectTimer = setTimeout(() => {
      if (this.socket === socket) {
        this.options.session.markTransportStale(this.timestampNow());
        socket.close(1_001, "Connection timeout");
        this.socket = undefined;
        this.scheduleReconnect();
      }
    }, this.connectTimeoutMs);
  }

  private onOpen(socket: BinanceUsdmWebSocketLike): void {
    if (this.stopped || this.socket !== socket) return;
    if (this.connectTimer !== undefined) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
    this.options.metricSink?.increment(
      "market_data_resubscriptions_total",
      binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "RECONNECTING"),
    );
    this.options.eventSink?.emit({
      type: "BINANCE_USDM_RESUBSCRIBED",
      occurredAt: this.timestampNow(),
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "RECONNECTING",
      attempt: this.reconnectAttempt,
    });
  }

  private onMessage(
    socket: BinanceUsdmWebSocketLike,
    event: MessageEvent,
  ): void {
    if (this.stopped || this.socket !== socket) return;
    if (typeof event.data !== "string") {
      this.failClosed(socket, "SCHEMA");
      return;
    }
    const bytes = new TextEncoder().encode(event.data).byteLength;
    if (bytes > this.maximumMessageBytes) {
      this.failClosed(socket, "CAPACITY");
      return;
    }
    try {
      this.queue.push(
        { text: event.data, receiveTimestamp: this.timestampNow() },
        bytes,
      );
    } catch (error) {
      if (error instanceof BinanceUsdmQueueOverflowError) {
        this.options.metricSink?.increment(
          "market_data_queue_overflows_total",
          binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
        );
        this.options.eventSink?.emit({
          type: "BINANCE_USDM_QUEUE_OVERFLOW",
          occurredAt: this.timestampNow(),
          capability: "WEBSOCKET_ORDER_BOOK_DELTA",
          state: "STALE",
          reasonCode: "CAPACITY",
        });
      }
      this.failClosed(socket, "CAPACITY");
      return;
    }
    this.scheduleDrain(socket);
  }

  private scheduleDrain(socket: BinanceUsdmWebSocketLike): void {
    if (this.draining) return;
    this.draining = true;
    queueMicrotask(() => {
      try {
        let message = this.queue.shift();
        while (
          message !== undefined &&
          !this.stopped &&
          this.socket === socket
        ) {
          const processingTimestamp = this.timestampNow();
          this.options.session.processText(message.text, {
            receiveTimestamp: message.receiveTimestamp,
            processingTimestamp,
          });
          const sessionState = this.options.session.state();
          if (
            sessionState.state === "READY" &&
            sessionState.bridgeAccepted &&
            !sessionState.recoveryRequired
          ) {
            this.reconnectAttempt = 0;
          }
          message = this.queue.shift();
        }
      } catch {
        this.failClosed(socket, "SCHEMA");
      } finally {
        this.draining = false;
      }
    });
  }

  private onDisconnect(socket: BinanceUsdmWebSocketLike): void {
    if (this.socket !== socket) return;
    if (this.connectTimer !== undefined) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
    this.socket = undefined;
    this.queue.clear();
    if (!this.stopped) {
      this.options.session.markTransportStale(this.timestampNow());
      this.scheduleReconnect();
    }
  }

  private failClosed(
    socket: BinanceUsdmWebSocketLike,
    reasonCode: "SCHEMA" | "CAPACITY",
  ): void {
    this.options.session.markTransportStale(this.timestampNow());
    this.queue.clear();
    if (this.socket === socket) {
      socket.close(1_008, "Invalid public market-data stream");
      this.socket = undefined;
    }
    this.options.eventSink?.emit({
      type: "BINANCE_USDM_STALE",
      occurredAt: this.timestampNow(),
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "STALE",
      reasonCode,
    });
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (
      this.stopped ||
      this.reconnectTimer !== undefined ||
      this.reconnectAttempt >= this.reconnectMaximumAttempts
    ) {
      return;
    }
    this.reconnectAttempt += 1;
    this.options.metricSink?.increment(
      "market_data_reconnects_total",
      binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "RECONNECTING"),
    );
    this.options.eventSink?.emit({
      type: "BINANCE_USDM_RECONNECT",
      occurredAt: this.timestampNow(),
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "RECONNECTING",
      reasonCode: "NETWORK",
      attempt: this.reconnectAttempt,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, this.reconnectDelayMs);
  }

  private clearTimers(): void {
    if (this.connectTimer !== undefined) clearTimeout(this.connectTimer);
    if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
    this.connectTimer = undefined;
    this.reconnectTimer = undefined;
  }
}
