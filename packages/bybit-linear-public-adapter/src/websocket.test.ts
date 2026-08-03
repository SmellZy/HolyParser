import { describe, expect, it, vi } from "vitest";
import { BybitOrderBookSession } from "./book-session.js";
import { binding, freshness, at } from "./test-helpers.js";
import {
  assertBybitLinearWebSocketUrl,
  BybitOrderBookWebSocketController,
  type BybitWebSocketLike,
} from "./websocket.js";

class FakeSocket implements BybitWebSocketLike {
  readyState = 0;
  readonly sent: string[] = [];
  readonly closed: Array<{ code?: number; reason?: string }> = [];
  private listeners = new Map<
    string,
    Array<(event: Event | MessageEvent) => void>
  >();
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: Event | MessageEvent) => void,
  ): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
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
  emit(type: "open" | "message" | "close" | "error", data?: string): void {
    for (const listener of this.listeners.get(type) ?? [])
      listener(
        type === "message"
          ? new MessageEvent("message", { data })
          : new Event(type),
      );
  }
}

describe("Bybit linear WebSocket lifecycle", () => {
  it("uses exactly the official public linear TLS URL", () =>
    expect(assertBybitLinearWebSocketUrl()).toBe(
      "wss://stream.bybit.com/v5/public/linear",
    ));
  it("sends a bounded source-backed subscription", () => {
    const socket = new FakeSocket();
    const controller = new BybitOrderBookWebSocketController({
      session: new BybitOrderBookSession(
        binding(),
        "orderbook.50.BTCUSDT",
        freshness,
      ),
      officialInstrumentId: "BTCUSDT",
      depth: 50,
      factory: () => socket,
    });
    controller.start();
    socket.emit("open");
    expect(JSON.parse(socket.sent[0] ?? "{}")).toEqual({
      req_id: "bybit-linear-orderbook-v1",
      op: "subscribe",
      args: ["orderbook.50.BTCUSDT"],
    });
    controller.stop();
  });
  it("prevents duplicate concurrent connection loops", () => {
    let calls = 0;
    const socket = new FakeSocket();
    const controller = new BybitOrderBookWebSocketController({
      session: new BybitOrderBookSession(
        binding(),
        "orderbook.50.BTCUSDT",
        freshness,
      ),
      officialInstrumentId: "BTCUSDT",
      depth: 50,
      factory: () => {
        calls += 1;
        return socket;
      },
    });
    controller.start();
    controller.start();
    expect(calls).toBe(1);
    controller.stop();
  });
  it("initializes a session from a schema-valid snapshot", async () => {
    const socket = new FakeSocket();
    const session = new BybitOrderBookSession(
      binding(),
      "orderbook.50.BTCUSDT",
      freshness,
    );
    const controller = new BybitOrderBookWebSocketController({
      session,
      officialInstrumentId: "BTCUSDT",
      depth: 50,
      factory: () => socket,
      timestampNow: () => at("2023-11-14T22:13:20.100Z"),
    });
    controller.start();
    socket.emit("open");
    socket.emit(
      "message",
      JSON.stringify({
        topic: "orderbook.50.BTCUSDT",
        type: "snapshot",
        ts: 1700000000000,
        cts: 1700000000000,
        data: {
          s: "BTCUSDT",
          b: [["100", "1"]],
          a: [["101", "1"]],
          u: 100,
          seq: 1000,
        },
      }),
    );
    await Promise.resolve();
    expect(session.state().state).toBe("READY");
    controller.stop();
  });
  it("fails closed on a message-size overflow", () => {
    const socket = new FakeSocket();
    const session = new BybitOrderBookSession(
      binding(),
      "orderbook.50.BTCUSDT",
      freshness,
    );
    const controller = new BybitOrderBookWebSocketController({
      session,
      officialInstrumentId: "BTCUSDT",
      depth: 50,
      factory: () => socket,
      maximumMessageBytes: 8,
      reconnectMaximumAttempts: 0,
    });
    controller.start();
    socket.emit("message", "0123456789");
    expect(session.state().state).toBe("GAPPED");
    expect(socket.closed[0]?.code).toBe(1008);
    controller.stop();
  });
  it("fails closed on queue overflow", () => {
    const socket = new FakeSocket();
    const session = new BybitOrderBookSession(
      binding(),
      "orderbook.50.BTCUSDT",
      freshness,
    );
    const controller = new BybitOrderBookWebSocketController({
      session,
      officialInstrumentId: "BTCUSDT",
      depth: 50,
      factory: () => socket,
      maximumQueuedMessages: 1,
      maximumQueuedBytes: 10,
      reconnectMaximumAttempts: 0,
    });
    controller.start();
    socket.emit("message", "12345678901");
    expect(session.state().state).toBe("GAPPED");
    controller.stop();
  });
  it("disconnect revokes output and schedules only bounded reconnect", () => {
    vi.useFakeTimers();
    const first = new FakeSocket();
    const sockets = [first, new FakeSocket()];
    const session = new BybitOrderBookSession(
      binding(),
      "orderbook.50.BTCUSDT",
      freshness,
    );
    const controller = new BybitOrderBookWebSocketController({
      session,
      officialInstrumentId: "BTCUSDT",
      depth: 50,
      factory: () => sockets.shift() ?? new FakeSocket(),
      reconnectMaximumAttempts: 1,
      reconnectDelayMs: 10,
    });
    controller.start();
    first.emit("close");
    vi.advanceTimersByTime(10);
    expect(controller.state().reconnectAttempt).toBe(1);
    controller.stop();
    vi.useRealTimers();
  });
  it("shutdown clears timers, queue and socket state", () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    const controller = new BybitOrderBookWebSocketController({
      session: new BybitOrderBookSession(
        binding(),
        "orderbook.50.BTCUSDT",
        freshness,
      ),
      officialInstrumentId: "BTCUSDT",
      depth: 50,
      factory: () => socket,
    });
    controller.start();
    socket.emit("open");
    controller.stop();
    expect(controller.state()).toMatchObject({
      stopped: true,
      queuedMessages: 0,
      hasSocket: false,
    });
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
