import { timestamp, type Timestamp } from "@arbitrage/market-data";
import {
  evaluateFreshness,
  type FreshnessPolicy,
} from "@arbitrage/market-data";
import {
  OKX_BOOK_CHANNEL,
  OKX_GLOBAL_PUBLIC_WS_URL,
  OKX_LIMITS,
} from "./constants.js";
import {
  OkxAdapterError,
  OkxQueueOverflowError,
  OkxRateLimitError,
} from "./errors.js";
import { OkxBookSession } from "./book-session.js";
import {
  okxMetricLabels,
  type OkxEventSink,
  type OkxMetricSink,
} from "./observability.js";
import { BoundedMessageQueue } from "./queue.js";
import { SlidingWindowRateLimiter } from "./rate-limit.js";

export interface OkxWebSocketLike {
  readonly readyState: number;
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: Event | MessageEvent) => void,
  ): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type OkxWebSocketFactory = (url: string) => OkxWebSocketLike;

export interface OkxWebSocketControllerOptions {
  readonly session: OkxBookSession;
  readonly officialInstrumentId: string;
  readonly webSocketFactory?: OkxWebSocketFactory;
  readonly eventSink?: OkxEventSink;
  readonly metricSink?: OkxMetricSink;
  readonly now?: () => number;
  readonly timestampNow?: () => Timestamp;
  readonly freshnessPolicy: FreshnessPolicy;
  readonly maximumMessageBytes?: number;
  readonly maximumQueuedMessages?: number;
  readonly maximumQueuedBytes?: number;
  readonly reconnectMaximumAttempts?: number;
  readonly connectTimeoutMs?: number;
  readonly connectionRateLimiter?: SlidingWindowRateLimiter;
}

interface QueuedWebSocketMessage {
  readonly text: string;
  readonly receiveTimestamp: Timestamp;
}

const sharedConnectionRateLimiter = new SlidingWindowRateLimiter();

function defaultWebSocketFactory(url: string): OkxWebSocketLike {
  return new WebSocket(url) as unknown as OkxWebSocketLike;
}

function defaultTimestampNow(): Timestamp {
  return timestamp(new Date().toISOString());
}

export class OkxPublicWebSocketController {
  private readonly queue: BoundedMessageQueue<QueuedWebSocketMessage>;
  private readonly webSocketFactory: OkxWebSocketFactory;
  private readonly now: () => number;
  private readonly timestampNow: () => Timestamp;
  private readonly maximumMessageBytes: number;
  private readonly reconnectMaximumAttempts: number;
  private readonly connectTimeoutMs: number;
  private readonly connectionRateLimiter: SlidingWindowRateLimiter;
  private socket?: OkxWebSocketLike;
  private stopped = true;
  private drainScheduled = false;
  private reconnectAttempt = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private pongTimer?: ReturnType<typeof setTimeout>;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private lastMessageAt = 0;
  private lastBookMessageAt = 0;
  private awaitingPong = false;
  private readonly operationTimes: number[] = [];

  constructor(private readonly options: OkxWebSocketControllerOptions) {
    this.webSocketFactory = options.webSocketFactory ?? defaultWebSocketFactory;
    this.now = options.now ?? Date.now;
    this.timestampNow = options.timestampNow ?? defaultTimestampNow;
    this.maximumMessageBytes =
      options.maximumMessageBytes ?? OKX_LIMITS.websocketMessageBytes;
    this.reconnectMaximumAttempts =
      options.reconnectMaximumAttempts ?? OKX_LIMITS.reconnectMaximumAttempts;
    this.connectTimeoutMs =
      options.connectTimeoutMs ?? OKX_LIMITS.websocketConnectTimeoutMs;
    this.connectionRateLimiter =
      options.connectionRateLimiter ?? sharedConnectionRateLimiter;
    this.queue = new BoundedMessageQueue({
      maximumMessages:
        options.maximumQueuedMessages ?? OKX_LIMITS.queuedMessages,
      maximumBytes: options.maximumQueuedBytes ?? OKX_LIMITS.queuedBytes,
    });

    if (
      options.officialInstrumentId.length === 0 ||
      options.officialInstrumentId.length > 160
    ) {
      throw new OkxAdapterError(
        "Official instrument ID is invalid.",
        "CONFIGURATION",
        "OKX-01",
      );
    }
    if (
      !Number.isSafeInteger(this.maximumMessageBytes) ||
      !Number.isSafeInteger(this.reconnectMaximumAttempts) ||
      !Number.isSafeInteger(this.connectTimeoutMs) ||
      this.maximumMessageBytes <= 0 ||
      this.reconnectMaximumAttempts < 0 ||
      this.connectTimeoutMs <= 0
    ) {
      throw new OkxAdapterError(
        "WebSocket bounds must be positive safe integers.",
        "CONFIGURATION",
        "OKX-01",
      );
    }
    if (
      options.freshnessPolicy.venue !== "OKX_EXCHANGE" ||
      options.freshnessPolicy.productGroup !== "OKX_V5_SWAP_FUTURES" ||
      options.freshnessPolicy.channel !== "books"
    ) {
      throw new OkxAdapterError(
        "Freshness policy must target the bound OKX books channel.",
        "CONFIGURATION",
        "OKX-01",
      );
    }
  }

  start(): void {
    if (!this.stopped) {
      return;
    }
    this.stopped = false;
    this.reconnectAttempt = 0;
    this.connect();
  }

  stop(): void {
    if (!this.stopped) {
      this.options.session.markTransportStale(
        "OKX WebSocket controller stopped.",
        this.timestampNow(),
      );
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
    awaitingPong: boolean;
  }> {
    return Object.freeze({
      stopped: this.stopped,
      reconnectAttempt: this.reconnectAttempt,
      queuedMessages: this.queue.state().messages,
      queuedBytes: this.queue.state().bytes,
      awaitingPong: this.awaitingPong,
    });
  }

  private connect(): void {
    if (this.stopped) {
      return;
    }
    try {
      this.connectionRateLimiter.acquire("okx-public-websocket-connect", {
        requests: OKX_LIMITS.websocketConnectionsPerSecond,
        windowMs: 1_000,
      });
    } catch (error) {
      if (error instanceof OkxRateLimitError) {
        this.options.metricSink?.increment(
          "market_data_rate_limits_total",
          okxMetricLabels("WEBSOCKET_ORDER_BOOK_SNAPSHOT", "RECONNECTING"),
        );
        this.options.eventSink?.emit({
          type: "OKX_RATE_LIMITED",
          occurredAt: this.timestampNow(),
          capability: "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
          state: "RECONNECTING",
          reason: "Local OKX WebSocket connection budget exhausted.",
        });
        this.deferConnection(error.retryAfterMs ?? 1_000);
        return;
      }
      throw error;
    }
    let socket: OkxWebSocketLike;
    try {
      socket = this.webSocketFactory(OKX_GLOBAL_PUBLIC_WS_URL);
    } catch {
      this.options.session.markTransportStale(
        "OKX WebSocket construction failed.",
        this.timestampNow(),
      );
      this.scheduleReconnect("OKX WebSocket construction failed.");
      return;
    }
    this.operationTimes.length = 0;
    this.socket = socket;
    socket.addEventListener("open", () => this.onOpen(socket));
    socket.addEventListener("message", (event) =>
      this.onMessage(socket, event as MessageEvent),
    );
    socket.addEventListener("close", () => this.onClose(socket));
    socket.addEventListener("error", () => this.onError(socket));
    this.connectTimer = setTimeout(
      () => this.failConnection("OKX WebSocket connection timed out."),
      this.connectTimeoutMs,
    );
  }

  private onOpen(socket: OkxWebSocketLike): void {
    if (this.socket !== socket || this.stopped) {
      return;
    }
    if (this.connectTimer !== undefined) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
    this.lastMessageAt = this.now();
    this.lastBookMessageAt = this.lastMessageAt;
    try {
      this.sendOperation(
        JSON.stringify({
          id: "phase2a2booksv1",
          op: "subscribe",
          args: [
            {
              channel: OKX_BOOK_CHANNEL,
              instId: this.options.officialInstrumentId,
            },
          ],
        }),
      );
    } catch (error) {
      this.failConnection(
        error instanceof Error
          ? error.message
          : "OKX subscription operation failed.",
      );
      return;
    }
    this.options.eventSink?.emit({
      type: "OKX_RESUBSCRIBED",
      occurredAt: this.timestampNow(),
      capability: "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
      state: "RECONNECTING",
    });
    this.startHeartbeat();
  }

  private onMessage(socket: OkxWebSocketLike, event: MessageEvent): void {
    if (this.socket !== socket || this.stopped) {
      return;
    }
    if (typeof event.data !== "string") {
      this.failConnection("Non-text OKX JSON WebSocket frame was rejected.");
      return;
    }
    const bytes = new TextEncoder().encode(event.data).byteLength;
    if (bytes > this.maximumMessageBytes) {
      this.failConnection("OKX WebSocket message exceeded the byte limit.");
      return;
    }
    this.lastMessageAt = this.now();
    if (event.data === "pong") {
      this.awaitingPong = false;
      if (this.pongTimer !== undefined) {
        clearTimeout(this.pongTimer);
        this.pongTimer = undefined;
      }
    }
    try {
      this.queue.push(
        {
          text: event.data,
          receiveTimestamp: this.timestampNow(),
        },
        bytes,
      );
    } catch (error) {
      if (error instanceof OkxQueueOverflowError) {
        this.options.metricSink?.increment(
          "market_data_queue_overflows_total",
          okxMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
        );
        this.options.eventSink?.emit({
          type: "OKX_QUEUE_OVERFLOW",
          occurredAt: this.timestampNow(),
          capability: "WEBSOCKET_ORDER_BOOK_DELTA",
          state: "STALE",
          reason: error.message,
        });
      }
      this.failConnection("Bounded OKX queue overflowed.");
      return;
    }
    this.scheduleDrain();
  }

  private scheduleDrain(): void {
    if (this.drainScheduled) {
      return;
    }
    this.drainScheduled = true;
    queueMicrotask(() => {
      this.drainScheduled = false;
      this.drain();
    });
  }

  private drain(): void {
    while (!this.stopped) {
      const message = this.queue.shift();
      if (message === undefined) {
        return;
      }
      const processingTimestamp = this.timestampNow();
      try {
        const outcomes = this.options.session.processText(message.text, {
          receiveTimestamp: message.receiveTimestamp,
          processingTimestamp,
        });
        if (
          outcomes.some(
            (outcome) =>
              outcome.kind === "HEARTBEAT" ||
              (outcome.kind === "BOOK" &&
                (outcome.result.outcome === "INITIALIZED" ||
                  outcome.result.outcome === "APPLIED" ||
                  outcome.result.outcome === "RECOVERED" ||
                  outcome.result.outcome === "REPLACED")),
          )
        ) {
          this.lastBookMessageAt = this.now();
        }
        if (
          outcomes.some(
            (outcome) =>
              outcome.kind === "BOOK" &&
              (outcome.result.outcome === "INITIALIZED" ||
                outcome.result.outcome === "RECOVERED" ||
                outcome.result.outcome === "REPLACED"),
          )
        ) {
          this.reconnectAttempt = 0;
        }
        if (
          outcomes.some(
            (outcome) =>
              outcome.kind === "RECONNECT_REQUIRED" ||
              (outcome.kind === "BOOK" &&
                (outcome.result.outcome === "GAP_DETECTED" ||
                  outcome.result.outcome === "INVALID_BOOK")),
          )
        ) {
          this.failConnection(
            "OKX book lost executable integrity and requires a replacement snapshot.",
          );
          return;
        }
      } catch {
        this.failConnection("OKX WebSocket payload validation failed.");
        return;
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => {
      const ageMs = this.now() - this.lastBookMessageAt;
      const transportIdleMs = this.now() - this.lastMessageAt;
      const freshness = evaluateFreshness(
        BigInt(Math.max(0, ageMs)),
        this.options.freshnessPolicy,
        "HEALTHY",
      );
      if (freshness === "STALE") {
        this.failConnection(
          "OKX books channel exceeded its configured stale threshold.",
        );
        return;
      }
      if (freshness === "DEGRADED") {
        this.options.session.markTransportDegraded(
          "OKX books channel exceeded its configured healthy threshold.",
          this.timestampNow(),
        );
      }
      if (
        this.stopped ||
        this.socket === undefined ||
        this.socket.readyState !== WebSocket.OPEN ||
        this.awaitingPong ||
        transportIdleMs < OKX_LIMITS.websocketIdleBeforePingMs
      ) {
        return;
      }
      this.socket.send("ping");
      this.awaitingPong = true;
      this.pongTimer = setTimeout(
        () => this.failConnection("OKX WebSocket pong deadline expired."),
        OKX_LIMITS.websocketPongTimeoutMs,
      );
    }, 1_000);
  }

  private sendOperation(payload: string): void {
    const bytes = new TextEncoder().encode(payload).byteLength;
    if (bytes > OKX_LIMITS.subscriptionBytes) {
      throw new OkxAdapterError(
        "OKX subscription exceeds the official 64 KB limit.",
        "CONFIGURATION",
        "OKX-01",
      );
    }
    const now = this.now();
    const cutoff = now - 3_600_000;
    while (
      this.operationTimes[0] !== undefined &&
      this.operationTimes[0] <= cutoff
    ) {
      this.operationTimes.shift();
    }
    if (
      this.operationTimes.length >= OKX_LIMITS.operationsPerConnectionPerHour
    ) {
      throw new OkxAdapterError(
        "OKX per-connection operation budget is exhausted.",
        "RATE_LIMIT",
        "OKX-01",
      );
    }
    this.operationTimes.push(now);
    this.socket?.send(payload);
  }

  private onClose(socket: OkxWebSocketLike): void {
    if (this.socket !== socket || this.stopped) {
      return;
    }
    this.disconnect("OKX WebSocket closed.", false);
  }

  private onError(socket: OkxWebSocketLike): void {
    if (this.socket !== socket || this.stopped) {
      return;
    }
    this.failConnection("OKX WebSocket transport error.");
  }

  private failConnection(reason: string): void {
    if (this.stopped) {
      return;
    }
    this.disconnect(reason, true);
  }

  private disconnect(reason: string, closeSocket: boolean): void {
    this.clearConnectionTimers();
    this.queue.clear();
    this.options.session.markTransportStale(reason, this.timestampNow());
    const socket = this.socket;
    this.socket = undefined;
    if (closeSocket) {
      socket?.close(1_012, "Public market-data recovery");
    }
    this.scheduleReconnect(reason);
  }

  private deferConnection(delayMs: number): void {
    if (this.stopped || this.reconnectTimer !== undefined) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delayMs);
  }

  private scheduleReconnect(reason: string): void {
    if (this.stopped || this.reconnectTimer !== undefined) {
      return;
    }
    if (this.reconnectAttempt >= this.reconnectMaximumAttempts) {
      this.stopped = true;
      this.clearTimers();
      return;
    }
    const attempt = this.reconnectAttempt + 1;
    this.reconnectAttempt = attempt;
    const delay = Math.min(
      OKX_LIMITS.reconnectBaseDelayMs * 2 ** (attempt - 1),
      OKX_LIMITS.reconnectMaximumDelayMs,
    );
    this.options.metricSink?.increment(
      "market_data_reconnects_total",
      okxMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "RECONNECTING"),
    );
    this.options.eventSink?.emit({
      type: "OKX_RECONNECT_SCHEDULED",
      occurredAt: this.timestampNow(),
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "RECONNECTING",
      reason,
      attempt,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.clearConnectionTimers();
  }

  private clearConnectionTimers(): void {
    if (this.connectTimer !== undefined) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
    if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    if (this.pongTimer !== undefined) {
      clearTimeout(this.pongTimer);
      this.pongTimer = undefined;
    }
    this.awaitingPong = false;
  }
}
