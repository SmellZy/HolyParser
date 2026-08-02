import { defineFreshnessPolicy } from "@arbitrage/market-data";
import { describe, expect, it, vi } from "vitest";
import { OkxBookSession } from "./book-session.js";
import {
  RecordingOkxEventSink,
  RecordingOkxMetricSink,
} from "./observability.js";
import { binding, fixedTimestamp, fixture, freshness } from "./test-helpers.js";
import {
  OkxPublicWebSocketController,
  type OkxWebSocketLike,
} from "./websocket.js";
import { SlidingWindowRateLimiter } from "./rate-limit.js";

class FakeWebSocket implements OkxWebSocketLike {
  readyState = WebSocket.OPEN;
  readonly sent: string[] = [];
  readonly closed: Array<{ readonly code?: number; readonly reason?: string }> =
    [];
  private readonly listeners = new Map<
    string,
    Array<(event: Event | MessageEvent) => void>
  >();

  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: Event | MessageEvent) => void,
  ): void {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closed.push({
      ...(code === undefined ? {} : { code }),
      ...(reason === undefined ? {} : { reason }),
    });
  }

  emit(type: "open" | "close" | "error", event: Event = new Event(type)): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  message(data: string): void {
    for (const listener of this.listeners.get("message") ?? []) {
      listener({ data } as MessageEvent);
    }
  }
}

describe("OKX WebSocket lifecycle", () => {
  it("subscribes, detects a gap, reconnects, resubscribes and recovers", async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    const instrument = binding();
    const eventSink = new RecordingOkxEventSink();
    const metricSink = new RecordingOkxMetricSink();
    const session = new OkxBookSession({
      binding: instrument,
      eventSink,
      metricSink,
      freshness: freshness("books"),
    });
    const controller = new OkxPublicWebSocketController({
      session,
      officialInstrumentId: instrument.wire.instId,
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
      eventSink,
      metricSink,
      now: () => Date.now(),
      timestampNow: () => fixedTimestamp,
      connectionRateLimiter: new SlidingWindowRateLimiter(() => Date.now()),
      freshnessPolicy: defineFreshnessPolicy({
        id: "okx-books-test",
        venue: instrument.metadata.venue,
        productGroup: instrument.metadata.productGroup,
        channel: "books",
        healthyWithinMs: 60_000n,
        staleAfterMs: 120_000n,
      }),
    });
    const books = fixture<Record<string, unknown>>("books-sequence.json");

    controller.start();
    sockets[0]!.emit("open");
    expect(JSON.parse(sockets[0]!.sent[0] ?? "{}")).toMatchObject({
      id: "phase2a2booksv1",
      op: "subscribe",
      args: [{ channel: "books", instId: "ALPHA-USDT-SWAP" }],
    });
    sockets[0]!.message(JSON.stringify(books.snapshot));
    await Promise.resolve();
    expect(session.executableView()).toBeDefined();

    sockets[0]!.message(JSON.stringify(books.gap));
    await Promise.resolve();
    expect(session.executableView()).toBeUndefined();
    expect(sockets[0]!.closed[0]?.code).toBe(1_012);

    await vi.advanceTimersByTimeAsync(500);
    expect(sockets).toHaveLength(2);
    sockets[1]!.emit("open");
    expect(JSON.parse(sockets[1]!.sent[0] ?? "{}")).toMatchObject({
      id: "phase2a2booksv1",
      op: "subscribe",
    });
    sockets[1]!.message(JSON.stringify(books.recovery));
    await Promise.resolve();
    expect(session.executableView()?.lastUpdateId).toBe(200n);
    expect(
      eventSink.events.some(
        (event) => event.type === "OKX_RECONNECT_SCHEDULED",
      ),
    ).toBe(true);

    controller.stop();
    vi.useRealTimers();
  });

  it("fails closed when the bounded inbound queue overflows", async () => {
    const sockets: FakeWebSocket[] = [];
    const instrument = binding();
    const session = new OkxBookSession({
      binding: instrument,
      freshness: freshness("books"),
    });
    const controller = new OkxPublicWebSocketController({
      session,
      officialInstrumentId: instrument.wire.instId,
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
      timestampNow: () => fixedTimestamp,
      connectionRateLimiter: new SlidingWindowRateLimiter(() => Date.now()),
      maximumQueuedMessages: 1,
      maximumQueuedBytes: 1_000_000,
      freshnessPolicy: defineFreshnessPolicy({
        id: "okx-books-test",
        venue: instrument.metadata.venue,
        productGroup: instrument.metadata.productGroup,
        channel: "books",
        healthyWithinMs: 60_000n,
        staleAfterMs: 120_000n,
      }),
    });
    const books = fixture<Record<string, unknown>>("books-sequence.json");
    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.message(JSON.stringify(books.snapshot));
    sockets[0]!.message(JSON.stringify(books.delta));
    await Promise.resolve();
    expect(session.executableView()).toBeUndefined();
    expect(sockets[0]!.closed[0]?.code).toBe(1_012);
    controller.stop();
  });

  it("applies channel-specific degraded and stale freshness thresholds", async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    const instrument = binding();
    const session = new OkxBookSession({
      binding: instrument,
      freshness: freshness("books"),
    });
    const controller = new OkxPublicWebSocketController({
      session,
      officialInstrumentId: instrument.wire.instId,
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
      timestampNow: () => fixedTimestamp,
      connectionRateLimiter: new SlidingWindowRateLimiter(() => Date.now()),
      freshnessPolicy: defineFreshnessPolicy({
        id: "okx-books-fast-test",
        venue: instrument.metadata.venue,
        productGroup: instrument.metadata.productGroup,
        channel: "books",
        healthyWithinMs: 2_000n,
        staleAfterMs: 5_000n,
      }),
    });
    const books = fixture<Record<string, unknown>>("books-sequence.json");
    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.message(JSON.stringify(books.snapshot));
    await Promise.resolve();
    expect(session.executableView()).toBeDefined();

    await vi.advanceTimersByTimeAsync(3_000);
    expect(session.state().freshnessQuality).toBe("DEGRADED");
    expect(session.executableView()).toBeUndefined();

    sockets[0]!.message(
      JSON.stringify({
        ...(books.heartbeat as Record<string, unknown>),
        data: [
          {
            ...((books.heartbeat as { data: Array<Record<string, unknown>> })
              .data[0] ?? {}),
            prevSeqId: 100,
            seqId: 100,
          },
        ],
      }),
    );
    await Promise.resolve();
    expect(session.state().freshnessQuality).toBe("HEALTHY");

    await vi.advanceTimersByTimeAsync(6_000);
    expect(session.state().freshnessQuality).toBe("STALE");
    expect(session.executableView()).toBeUndefined();
    expect(sockets[0]!.closed[0]?.code).toBe(1_012);
    controller.stop();
    vi.useRealTimers();
  });

  it("bounds repeated open-then-error reconnect cycles until a book recovers", async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    const instrument = binding();
    const session = new OkxBookSession({
      binding: instrument,
      freshness: freshness("books"),
    });
    const controller = new OkxPublicWebSocketController({
      session,
      officialInstrumentId: instrument.wire.instId,
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
      timestampNow: () => fixedTimestamp,
      connectionRateLimiter: new SlidingWindowRateLimiter(() => Date.now()),
      reconnectMaximumAttempts: 2,
      freshnessPolicy: defineFreshnessPolicy({
        id: "okx-books-reconnect-test",
        venue: instrument.metadata.venue,
        productGroup: instrument.metadata.productGroup,
        channel: "books",
        healthyWithinMs: 60_000n,
        staleAfterMs: 120_000n,
      }),
    });

    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.emit("error");
    await vi.advanceTimersByTimeAsync(500);
    sockets[1]!.emit("open");
    sockets[1]!.emit("error");
    await vi.advanceTimersByTimeAsync(1_000);
    sockets[2]!.emit("open");
    sockets[2]!.emit("error");

    expect(sockets).toHaveLength(3);
    expect(controller.state()).toMatchObject({
      stopped: true,
      reconnectAttempt: 2,
    });
    vi.useRealTimers();
  });

  it("suppresses executable output immediately on disconnect and shutdown", async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    const instrument = binding();
    const session = new OkxBookSession({
      binding: instrument,
      freshness: freshness("books"),
    });
    const controller = new OkxPublicWebSocketController({
      session,
      officialInstrumentId: instrument.wire.instId,
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
      timestampNow: () => fixedTimestamp,
      connectionRateLimiter: new SlidingWindowRateLimiter(() => Date.now()),
      freshnessPolicy: defineFreshnessPolicy({
        id: "okx-books-disconnect-test",
        venue: instrument.metadata.venue,
        productGroup: instrument.metadata.productGroup,
        channel: "books",
        healthyWithinMs: 60_000n,
        staleAfterMs: 120_000n,
      }),
    });
    const books = fixture<Record<string, unknown>>("books-sequence.json");

    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.message(JSON.stringify(books.snapshot));
    await Promise.resolve();
    expect(session.executableView()).toBeDefined();

    sockets[0]!.emit("close");
    expect(session.executableView()).toBeUndefined();
    expect(session.state().requiresReplacement).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    sockets[1]!.emit("open");
    sockets[1]!.message(JSON.stringify(books.recovery));
    await Promise.resolve();
    expect(session.executableView()).toBeDefined();

    controller.stop();
    expect(session.executableView()).toBeUndefined();
    vi.useRealTimers();
  });

  it("bounds connection establishment time and requires recovery", async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    const instrument = binding();
    const session = new OkxBookSession({
      binding: instrument,
      freshness: freshness("books"),
    });
    const controller = new OkxPublicWebSocketController({
      session,
      officialInstrumentId: instrument.wire.instId,
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
      timestampNow: () => fixedTimestamp,
      connectionRateLimiter: new SlidingWindowRateLimiter(() => Date.now()),
      connectTimeoutMs: 2_000,
      freshnessPolicy: defineFreshnessPolicy({
        id: "okx-books-connect-timeout-test",
        venue: instrument.metadata.venue,
        productGroup: instrument.metadata.productGroup,
        channel: "books",
        healthyWithinMs: 60_000n,
        staleAfterMs: 120_000n,
      }),
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sockets[0]!.closed[0]?.code).toBe(1_012);
    expect(session.state()).toMatchObject({
      trustedTransport: false,
      requiresReplacement: true,
      freshnessQuality: "STALE",
    });
    controller.stop();
    vi.useRealTimers();
  });

  it("does not let duplicate updates refresh channel freshness", async () => {
    vi.useFakeTimers();
    const sockets: FakeWebSocket[] = [];
    const instrument = binding();
    const session = new OkxBookSession({
      binding: instrument,
      freshness: freshness("books"),
    });
    const controller = new OkxPublicWebSocketController({
      session,
      officialInstrumentId: instrument.wire.instId,
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
      timestampNow: () => fixedTimestamp,
      connectionRateLimiter: new SlidingWindowRateLimiter(() => Date.now()),
      freshnessPolicy: defineFreshnessPolicy({
        id: "okx-books-duplicate-freshness-test",
        venue: instrument.metadata.venue,
        productGroup: instrument.metadata.productGroup,
        channel: "books",
        healthyWithinMs: 2_000n,
        staleAfterMs: 5_000n,
      }),
    });
    const books = fixture<Record<string, unknown>>("books-sequence.json");
    const duplicate = {
      ...(books.heartbeat as Record<string, unknown>),
      data: [
        {
          ...((books.heartbeat as { data: Array<Record<string, unknown>> })
            .data[0] ?? {}),
          bids: [["10.25", "99", "0", "1"]],
          prevSeqId: 100,
          seqId: 100,
        },
      ],
    };

    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.message(JSON.stringify(books.snapshot));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(3_000);
    sockets[0]!.message(JSON.stringify(duplicate));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(3_000);

    expect(session.state().freshnessQuality).toBe("STALE");
    expect(session.executableView()).toBeUndefined();
    controller.stop();
    vi.useRealTimers();
  });
});
