import { afterEach, describe, expect, it, vi } from "vitest";
import { timestamp } from "@arbitrage/market-data";
import { BinanceUsdmBookSession } from "./book-session.js";
import { RecordingBinanceUsdmEventSink } from "./observability.js";
import { btcBinding, fixture, testFreshness } from "./test-helpers.js";
import {
  BinanceUsdmDiffDepthController,
  buildBinanceUsdmDiffDepthUrl,
  type BinanceUsdmWebSocketLike,
} from "./websocket.js";

class FakeSocket implements BinanceUsdmWebSocketLike {
  readyState = 0;
  readonly listeners = new Map<
    string,
    Array<(event: Event | MessageEvent) => void>
  >();
  readonly closeCalls: Array<
    readonly [number | undefined, string | undefined]
  > = [];

  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: Event | MessageEvent) => void,
  ): void {
    const values = this.listeners.get(type) ?? [];
    values.push(listener);
    this.listeners.set(type, values);
  }

  close(code?: number, reason?: string): void {
    this.closeCalls.push([code, reason]);
    this.readyState = 3;
  }

  emit(type: "open" | "close" | "error", event = new Event(type)): void {
    if (type === "open") this.readyState = 1;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  message(data: unknown): void {
    for (const listener of this.listeners.get("message") ?? []) {
      listener(new MessageEvent("message", { data }));
    }
  }
}

function controllerFixture(overrides: Record<string, unknown> = {}) {
  const sockets: FakeSocket[] = [];
  const events = new RecordingBinanceUsdmEventSink();
  const session = new BinanceUsdmBookSession({
    binding: btcBinding(),
    freshness: testFreshness("depth"),
  });
  const controller = new BinanceUsdmDiffDepthController({
    session,
    officialInstrumentId: "BTCUSDT",
    cadence: "100ms",
    webSocketFactory: (url) => {
      expect(url).toBe(
        "wss://fstream.binance.com/public/ws/btcusdt@depth@100ms",
      );
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    timestampNow: () => timestamp("2026-08-02T00:00:00.500Z"),
    reconnectDelayMs: 100,
    connectTimeoutMs: 1_000,
    eventSink: events,
    ...overrides,
  });
  return { controller, sockets, events, session };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Binance USD-M WebSocket boundary", () => {
  it("builds only the routed official public TLS URL", () => {
    expect(buildBinanceUsdmDiffDepthUrl("BTCUSDT", "NATIVE")).toBe(
      "wss://fstream.binance.com/public/ws/btcusdt@depth",
    );
    expect(() =>
      buildBinanceUsdmDiffDepthUrl("BTCUSDT/../../private", "100ms"),
    ).toThrow();
  });

  it("encodes an opaque non-ASCII official ID without escaping the allowlist", () => {
    expect(buildBinanceUsdmDiffDepthUrl("資產USDT", "100ms")).toBe(
      "wss://fstream.binance.com/public/ws/%E8%B3%87%E7%94%A2usdt@depth@100ms",
    );
  });

  it("prevents duplicate concurrent connection loops", () => {
    vi.useFakeTimers();
    const { controller, sockets } = controllerFixture();
    controller.start();
    controller.start();
    expect(sockets).toHaveLength(1);
    controller.stop();
  });

  it("treats reconnecting the raw URL as controlled resubscription", () => {
    vi.useFakeTimers();
    const { controller, sockets, events } = controllerFixture();
    controller.start();
    sockets[0]!.emit("open");
    expect(
      events.events.some((event) => event.type === "BINANCE_USDM_RESUBSCRIBED"),
    ).toBe(true);
    sockets[0]!.emit("close");
    expect(controller.state().reconnectAttempt).toBe(1);
    vi.advanceTimersByTime(100);
    expect(sockets).toHaveLength(2);
    controller.stop();
  });

  it("does not reset reconnect backoff before valid book recovery", async () => {
    vi.useFakeTimers();
    const { controller, sockets, session } = controllerFixture();
    const sequence = fixture<Record<string, unknown>>("depth-sequence.json");
    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.emit("close");
    expect(controller.state().reconnectAttempt).toBe(1);
    session.beginRecovery();
    vi.advanceTimersByTime(100);
    sockets[1]!.emit("open");
    sockets[1]!.message(JSON.stringify(sequence.initialOverlap));
    await Promise.resolve();
    expect(session.state().state).toBe("BUFFERING");
    expect(controller.state().reconnectAttempt).toBe(1);
    controller.stop();
  });

  it("bounds message size and fails closed", () => {
    vi.useFakeTimers();
    const { controller, sockets, session } = controllerFixture({
      maximumMessageBytes: 10,
    });
    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.message("x".repeat(11));
    expect(sockets[0]!.closeCalls).toHaveLength(1);
    expect(session.executableView()).toBeUndefined();
    controller.stop();
  });

  it("bounds inbound queue and closes on backpressure overflow", () => {
    vi.useFakeTimers();
    const { controller, sockets } = controllerFixture({
      maximumQueuedMessages: 1,
      maximumQueuedBytes: 10_000,
    });
    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.message("{}");
    sockets[0]!.message("{}");
    expect(sockets[0]!.closeCalls).toHaveLength(1);
    controller.stop();
  });

  it("rejects binary and malformed frames without logging payloads", () => {
    vi.useFakeTimers();
    const { controller, sockets, events } = controllerFixture();
    controller.start();
    sockets[0]!.emit("open");
    sockets[0]!.message(new Uint8Array([1, 2, 3]));
    expect(sockets[0]!.closeCalls).toHaveLength(1);
    expect(JSON.stringify(events.events)).not.toContain("1,2,3");
    controller.stop();
  });

  it("cleans timers and sockets deterministically on stop", () => {
    vi.useFakeTimers();
    const { controller, sockets } = controllerFixture();
    controller.start();
    sockets[0]!.emit("close");
    controller.stop();
    vi.runAllTimers();
    expect(sockets).toHaveLength(1);
    expect(controller.state()).toMatchObject({
      stopped: true,
      hasSocket: false,
      queuedMessages: 0,
    });
  });

  it("fails a connection that never opens and uses a bounded reconnect count", () => {
    vi.useFakeTimers();
    const { controller, sockets } = controllerFixture({
      reconnectMaximumAttempts: 1,
    });
    controller.start();
    vi.advanceTimersByTime(1_000);
    vi.advanceTimersByTime(100);
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(1_000);
    vi.runOnlyPendingTimers();
    expect(controller.state().reconnectAttempt).toBe(1);
    controller.stop();
  });
});
