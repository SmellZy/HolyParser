import { describe, expect, it, vi } from "vitest";
import { receiveOneDiffDepth, runBinanceUsdmPublicCanary } from "./canary.js";
import { fixture } from "./test-helpers.js";
import type { BinanceUsdmWebSocketLike } from "./websocket.js";

class CanarySocket implements BinanceUsdmWebSocketLike {
  readyState = 1;
  private readonly listeners = new Map<
    string,
    Array<(event: Event | MessageEvent) => void>
  >();
  closed = false;

  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: Event | MessageEvent) => void,
  ): void {
    const values = this.listeners.get(type) ?? [];
    values.push(listener);
    this.listeners.set(type, values);
  }

  close(): void {
    this.closed = true;
  }

  emitMessage(value: unknown): void {
    for (const listener of this.listeners.get("message") ?? []) {
      listener(new MessageEvent("message", { data: JSON.stringify(value) }));
    }
  }
}

describe("bounded public Binance USD-M canary", () => {
  it("fails immediately and closes for a pre-cancelled signal", async () => {
    const socket = new CanarySocket();
    const controller = new AbortController();
    controller.abort();

    await expect(
      receiveOneDiffDepth("BTCUSDT", () => socket, "100ms", controller.signal),
    ).rejects.toThrow("Canary was cancelled");
    expect(socket.closed).toBe(true);
  });

  it("accepts one schema-valid public diff-depth message and closes", async () => {
    const sequence = fixture<Record<string, unknown>>("depth-sequence.json");
    const socket = new CanarySocket();
    const pending = receiveOneDiffDepth("BTCUSDT", () => socket);
    socket.emitMessage(sequence.initialOverlap);
    await expect(pending).resolves.toBe("102");
    expect(socket.closed).toBe(true);
  });

  it("runs only bounded public REST and WebSocket probes", async () => {
    const exchange = fixture<Record<string, unknown>>("exchange-info.json");
    const rest = fixture<Record<string, unknown>>("public-rest.json");
    const sequence = fixture<Record<string, unknown>>("depth-sequence.json");
    const requested: string[] = [];
    const socket = new CanarySocket();
    const request = vi.fn<typeof fetch>(async (input) => {
      const path = new URL(input.toString()).pathname;
      requested.push(path);
      const values: Record<string, unknown> = {
        "/fapi/v1/time": rest.serverTime,
        "/fapi/v1/exchangeInfo": exchange,
        "/fapi/v2/ticker/price": rest.lastPrice,
        "/fapi/v1/ticker/bookTicker": rest.bookTicker,
        "/fapi/v1/premiumIndex": rest.premiumIndex,
        "/fapi/v1/fundingInfo": rest.fundingInfo,
        "/fapi/v1/depth": rest.depth,
      };
      return new Response(JSON.stringify(values[path]), { status: 200 });
    });
    const pending = runBinanceUsdmPublicCanary({
      fetch: request,
      webSocketFactory: () => {
        queueMicrotask(() => socket.emitMessage(sequence.initialOverlap));
        return socket;
      },
    });
    const evidence = await pending;
    expect(evidence.sampledInstrumentId).toBe("BTCUSDT");
    expect(evidence.quarantinedInstrumentRows).toBe(0);
    expect(evidence.restDepthUpdateId).toBe("100");
    expect(requested).toHaveLength(7);
    expect(requested.every((path) => path.startsWith("/fapi/"))).toBe(true);
  });

  it("enforces one immutable deadline across the complete canary", async () => {
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation(() => realTimeout(1));
    try {
      const pending = runBinanceUsdmPublicCanary({
        fetch: vi.fn<typeof fetch>(
          (_input, init) =>
            new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener(
                "abort",
                () => reject(new Error("deadline")),
                { once: true },
              );
            }),
        ),
      });
      await expect(pending).rejects.toThrow();
      expect(timeout).toHaveBeenCalledWith(15_000);
    } finally {
      timeout.mockRestore();
    }
  });
});
