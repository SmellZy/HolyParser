import { describe, expect, it } from "vitest";
import { receiveSnapshot } from "./canary.js";
import type { OkxWebSocketLike } from "./websocket.js";

class CanarySocket implements OkxWebSocketLike {
  readyState = WebSocket.OPEN;
  readonly sent: string[] = [];
  readonly closes: number[] = [];
  private readonly listeners = new Map<
    string,
    Array<(event: Event | MessageEvent) => void>
  >();

  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: Event | MessageEvent) => void,
  ): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number): void {
    if (code !== undefined) {
      this.closes.push(code);
    }
  }

  open(): void {
    for (const listener of this.listeners.get("open") ?? []) {
      listener(new Event("open"));
    }
  }

  message(data: string): void {
    for (const listener of this.listeners.get("message") ?? []) {
      listener({ data } as MessageEvent);
    }
  }
}

describe("bounded OKX public canary", () => {
  it("returns only a validated bound-instrument snapshot sequence", async () => {
    const socket = new CanarySocket();
    const result = receiveSnapshot("ALPHA-USDT-SWAP", 1_000, 2, () => socket);
    socket.open();
    socket.message(
      JSON.stringify({
        arg: { channel: "books", instId: "ALPHA-USDT-SWAP" },
        action: "snapshot",
        data: [
          {
            asks: [["10.26", "1", "0", "1"]],
            bids: [["10.24", "1", "0", "1"]],
            ts: "1785024000000",
            checksum: 0,
            prevSeqId: -1,
            seqId: 900719925474099312345n.toString(),
          },
        ],
      }),
    );

    await expect(result).resolves.toBe("900719925474099312345");
    expect(socket.closes).toEqual([1_000]);
  });

  it("fails closed when the message-count bound is exceeded", async () => {
    const socket = new CanarySocket();
    const result = receiveSnapshot("ALPHA-USDT-SWAP", 1_000, 2, () => socket);
    socket.open();
    const acknowledgement = JSON.stringify({
      event: "subscribe",
      arg: { channel: "books", instId: "ALPHA-USDT-SWAP" },
    });
    socket.message(acknowledgement);
    socket.message(acknowledgement);
    socket.message(acknowledgement);

    await expect(result).rejects.toThrow(/message-count bound/);
    expect(socket.closes).toEqual([1_000]);
  });

  it("rejects disabled or expanded canary bounds", async () => {
    await expect(
      receiveSnapshot("ALPHA-USDT-SWAP", 0, 2, () => new CanarySocket()),
    ).rejects.toThrow(/bounds/);
    await expect(
      receiveSnapshot("ALPHA-USDT-SWAP", 1_000, 33, () => new CanarySocket()),
    ).rejects.toThrow(/bounds/);
  });
});
