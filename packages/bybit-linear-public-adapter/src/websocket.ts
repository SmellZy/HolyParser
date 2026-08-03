import { timestamp, type Timestamp } from "@arbitrage/market-data";
import {
  BYBIT_LIMITS,
  BYBIT_WS_URL,
  bybitOrderbookTopic,
  type BybitWsDepth,
} from "./constants.js";
import { BybitLinearAdapterError } from "./errors.js";
import { BybitOrderBookSession } from "./book-session.js";
import {
  metricLabels,
  type BybitEventSink,
  type BybitMetricSink,
} from "./observability.js";
import { BoundedMessageQueue } from "./queue.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import { parseWsMessage } from "./wire.js";

export interface BybitWebSocketLike {
  readonly readyState: number;
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: Event | MessageEvent) => void,
  ): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}
export type BybitWebSocketFactory = (url: string) => BybitWebSocketLike;
export interface BybitWebSocketOptions {
  readonly session: BybitOrderBookSession;
  readonly officialInstrumentId: string;
  readonly depth: BybitWsDepth;
  readonly factory?: BybitWebSocketFactory;
  readonly timestampNow?: () => Timestamp;
  readonly maximumMessageBytes?: number;
  readonly maximumQueuedMessages?: number;
  readonly maximumQueuedBytes?: number;
  readonly connectTimeoutMs?: number;
  readonly reconnectMaximumAttempts?: number;
  readonly reconnectDelayMs?: number;
  readonly heartbeatMs?: number;
  readonly metricSink?: BybitMetricSink;
  readonly eventSink?: BybitEventSink;
}
interface Queued {
  readonly text: string;
  readonly received: Timestamp;
}

function defaultFactory(url: string): BybitWebSocketLike {
  return new WebSocket(url) as unknown as BybitWebSocketLike;
}
export function assertBybitLinearWebSocketUrl(): string {
  const url = new URL(BYBIT_WS_URL);
  if (
    url.protocol !== "wss:" ||
    url.hostname !== "stream.bybit.com" ||
    url.port !== "" ||
    url.pathname !== "/v5/public/linear" ||
    url.search !== ""
  )
    throw new BybitLinearAdapterError(
      "WebSocket URL escaped the official linear allowlist.",
      "CONFIGURATION",
      "BYBIT-08",
    );
  return url.toString();
}

export class BybitOrderBookWebSocketController {
  private readonly factory: BybitWebSocketFactory;
  private readonly timestampNow: () => Timestamp;
  private readonly maximumMessageBytes: number;
  private readonly connectTimeoutMs: number;
  private readonly reconnectMaximumAttempts: number;
  private readonly reconnectDelayMs: number;
  private readonly heartbeatMs: number;
  private readonly queue: BoundedMessageQueue<Queued>;
  private readonly topic: string;
  private socket?: BybitWebSocketLike;
  private stopped = true;
  private draining = false;
  private reconnectAttempt = 0;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  constructor(private readonly options: BybitWebSocketOptions) {
    assertBybitLinearWebSocketUrl();
    this.topic = bybitOrderbookTopic(
      options.officialInstrumentId,
      options.depth,
    );
    this.factory = options.factory ?? defaultFactory;
    this.timestampNow =
      options.timestampNow ?? (() => timestamp(new Date().toISOString()));
    this.maximumMessageBytes =
      options.maximumMessageBytes ?? BYBIT_LIMITS.websocketMessageBytes;
    this.connectTimeoutMs =
      options.connectTimeoutMs ?? BYBIT_LIMITS.websocketConnectTimeoutMs;
    this.reconnectMaximumAttempts =
      options.reconnectMaximumAttempts ?? BYBIT_LIMITS.reconnectMaximumAttempts;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 500;
    this.heartbeatMs = options.heartbeatMs ?? 20_000;
    this.queue = new BoundedMessageQueue({
      maximumMessages:
        options.maximumQueuedMessages ?? BYBIT_LIMITS.queuedMessages,
      maximumBytes: options.maximumQueuedBytes ?? BYBIT_LIMITS.queuedBytes,
    });
    for (const value of [
      this.maximumMessageBytes,
      this.connectTimeoutMs,
      this.reconnectDelayMs,
      this.heartbeatMs,
    ])
      if (!Number.isSafeInteger(value) || value <= 0)
        throw new BybitLinearAdapterError(
          "WebSocket bounds must be positive safe integers.",
          "CONFIGURATION",
          "BYBIT-08",
        );
    if (
      !Number.isSafeInteger(this.reconnectMaximumAttempts) ||
      this.reconnectMaximumAttempts < 0
    )
      throw new BybitLinearAdapterError(
        "Reconnect attempts must be a non-negative safe integer.",
        "CONFIGURATION",
        "BYBIT-09",
      );
  }
  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.reconnectAttempt = 0;
    this.connect();
  }
  stop(): void {
    if (!this.stopped) this.options.session.stop(this.timestampNow());
    this.stopped = true;
    this.clearTimers();
    this.queue.clear();
    this.socket?.close(1000, "Client shutdown");
    this.socket = undefined;
  }
  state(): Readonly<{
    stopped: boolean;
    reconnectAttempt: number;
    queuedMessages: number;
    hasSocket: boolean;
  }> {
    return Object.freeze({
      stopped: this.stopped,
      reconnectAttempt: this.reconnectAttempt,
      queuedMessages: this.queue.size(),
      hasSocket: this.socket !== undefined,
    });
  }
  private connect(): void {
    if (this.stopped || this.socket !== undefined) return;
    let socket: BybitWebSocketLike;
    try {
      socket = this.factory(assertBybitLinearWebSocketUrl());
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
        this.options.session.markTransportGap(
          "DISCONNECT",
          this.timestampNow(),
        );
        socket.close(1001, "Connection timeout");
        this.socket = undefined;
        this.scheduleReconnect();
      }
    }, this.connectTimeoutMs);
  }
  private onOpen(socket: BybitWebSocketLike): void {
    if (this.stopped || this.socket !== socket) return;
    if (this.connectTimer !== undefined) clearTimeout(this.connectTimer);
    this.connectTimer = undefined;
    socket.send(
      JSON.stringify({
        req_id: "bybit-linear-orderbook-v1",
        op: "subscribe",
        args: [this.topic],
      }),
    );
    this.heartbeatTimer = setInterval(() => {
      if (!this.stopped && this.socket === socket)
        socket.send(
          JSON.stringify({ req_id: "bybit-linear-heartbeat-v1", op: "ping" }),
        );
    }, this.heartbeatMs);
    this.options.metricSink?.increment(
      "market_data_resubscriptions_total",
      metricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "RECONNECTING"),
    );
  }
  private onMessage(socket: BybitWebSocketLike, event: MessageEvent): void {
    if (this.stopped || this.socket !== socket) return;
    if (typeof event.data !== "string") {
      this.failClosed(socket, "MESSAGE_OVERFLOW");
      return;
    }
    const bytes = new TextEncoder().encode(event.data).byteLength;
    if (bytes > this.maximumMessageBytes) {
      this.options.metricSink?.increment(
        "market_data_response_overflows_total",
        metricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
      );
      this.failClosed(socket, "MESSAGE_OVERFLOW");
      return;
    }
    try {
      this.queue.push(
        { text: event.data, received: this.timestampNow() },
        bytes,
      );
    } catch {
      this.options.metricSink?.increment(
        "market_data_queue_overflows_total",
        metricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
      );
      this.failClosed(socket, "QUEUE_OVERFLOW");
      return;
    }
    this.scheduleDrain(socket);
  }
  private scheduleDrain(socket: BybitWebSocketLike): void {
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
          const control = parseWsMessage(
            parseJsonPreservingIntegers(message.text, this.maximumMessageBytes),
          );
          if (control.kind === "ACK") {
            if (!control.success)
              throw new BybitLinearAdapterError(
                "WebSocket operation was rejected.",
                "BUSINESS",
                "BYBIT-08",
              );
          } else {
            const processingTimestamp = this.timestampNow();
            this.options.session.apply(control.value, {
              receiveTimestamp: message.received,
              processingTimestamp,
            });
            if (this.options.session.state().state === "READY")
              this.reconnectAttempt = 0;
          }
          message = this.queue.shift();
        }
      } catch {
        this.options.metricSink?.increment(
          "market_data_parse_failures_total",
          metricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
        );
        this.failClosed(socket, "MESSAGE_OVERFLOW");
      } finally {
        this.draining = false;
      }
    });
  }
  private onDisconnect(socket: BybitWebSocketLike): void {
    if (this.socket !== socket) return;
    this.socket = undefined;
    this.queue.clear();
    if (this.heartbeatTimer !== undefined) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    if (this.connectTimer !== undefined) clearTimeout(this.connectTimer);
    this.connectTimer = undefined;
    if (!this.stopped) {
      this.options.session.markTransportGap("DISCONNECT", this.timestampNow());
      this.scheduleReconnect();
    }
  }
  private failClosed(
    socket: BybitWebSocketLike,
    reason: "QUEUE_OVERFLOW" | "MESSAGE_OVERFLOW",
  ): void {
    this.options.session.markTransportGap(reason, this.timestampNow());
    this.queue.clear();
    if (this.socket === socket) {
      socket.close(1008, "Invalid bounded public market-data stream");
      this.socket = undefined;
    }
    if (this.heartbeatTimer !== undefined) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    this.scheduleReconnect();
  }
  private scheduleReconnect(): void {
    if (
      this.stopped ||
      this.reconnectTimer !== undefined ||
      this.reconnectAttempt >= this.reconnectMaximumAttempts
    )
      return;
    this.reconnectAttempt += 1;
    this.options.metricSink?.increment(
      "market_data_reconnects_total",
      metricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "RECONNECTING"),
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, this.reconnectDelayMs);
  }
  private clearTimers(): void {
    if (this.connectTimer !== undefined) clearTimeout(this.connectTimer);
    if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer !== undefined) clearInterval(this.heartbeatTimer);
    this.connectTimer = undefined;
    this.reconnectTimer = undefined;
    this.heartbeatTimer = undefined;
  }
}
