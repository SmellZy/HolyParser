import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BybitOrderBookSession } from "./book-session.js";
import { binding, freshness, times } from "./test-helpers.js";
import type { BybitWsBookWire } from "./wire.js";

const topic = "orderbook.50.BTCUSDT";
function message(
  type: "snapshot" | "delta",
  u: string,
  seq: string,
  bids: readonly (readonly [string, string])[] = [],
  asks: readonly (readonly [string, string])[] = [],
): BybitWsBookWire {
  return {
    topic,
    type,
    timestamp: "1700000000000",
    matchingTimestamp: "1700000000000",
    symbol: "BTCUSDT",
    bids,
    asks,
    updateId: u,
    sequence: seq,
  };
}
function ready(): BybitOrderBookSession {
  const session = new BybitOrderBookSession(binding(), topic, freshness);
  expect(
    session.apply(
      message("snapshot", "100", "1000", [["100", "2"]], [["101", "2"]]),
      times,
    ).outcome,
  ).toBe("INITIALIZED");
  return session;
}

describe("Bybit snapshot/delta/restart state machine", () => {
  it("rejects deltas before initialization", () =>
    expect(
      new BybitOrderBookSession(binding(), topic, freshness).apply(
        message("delta", "2", "2"),
        times,
      ).outcome,
    ).toBe("REJECTED_UNINITIALIZED"));
  it("initializes from a healthy snapshot", () => {
    const session = ready();
    expect(session.executableView()?.bestBid.toString()).toBe("100");
  });
  it("accepts monotonic non-contiguous IDs without inventing +1 continuity", () =>
    expect(
      ready().apply(message("delta", "105", "1010", [["100", "1"]]), times)
        .outcome,
    ).toBe("APPLIED"));
  it("rejects duplicate updates without refreshing accepted receive time", () => {
    const session = ready();
    const before = session.state().lastAcceptedReceive;
    expect(
      session.apply(message("delta", "100", "1000", [["99", "1"]]), {
        ...times,
        receiveTimestamp: "2023-11-14T22:13:21.000Z" as never,
      }).outcome,
    ).toBe("DUPLICATE_REJECTED");
    expect(session.state().lastAcceptedReceive).toBe(before);
    expect(
      session
        .executableView()
        ?.bids.some((level) => level.price.toString() === "99"),
    ).toBe(false);
  });
  it("rejects older updates without mutation", () => {
    const session = ready();
    expect(
      session.apply(message("delta", "99", "999", [["101", "1"]]), times)
        .outcome,
    ).toBe("DUPLICATE_REJECTED");
    expect(session.executableView()?.bestBid.toString()).toBe("100");
  });
  it("detects contradictory u/seq ordering and suppresses output", () => {
    const session = ready();
    expect(session.apply(message("delta", "101", "999"), times).outcome).toBe(
      "GAP_DETECTED",
    );
    expect(session.state().state).toBe("GAPPED");
    expect(session.executableView()).toBeUndefined();
  });
  it("does not allow ordinary deltas to recover a gap", () => {
    const session = ready();
    session.markTransportGap("QUEUE_OVERFLOW", times.processingTimestamp);
    expect(session.apply(message("delta", "101", "1001"), times).outcome).toBe(
      "REJECTED_STALE",
    );
    expect(session.executableView()).toBeUndefined();
  });
  it("recovers only from a validated replacement snapshot", () => {
    const session = ready();
    session.markTransportGap("DISCONNECT", times.processingTimestamp);
    expect(
      session.apply(
        message("snapshot", "200", "2000", [["99", "1"]], [["102", "1"]]),
        times,
      ).outcome,
    ).toBe("RECOVERED");
    expect(session.executableView()?.bestBid.toString()).toBe("99");
  });
  it("treats u=1 snapshot as documented restart replacement", () => {
    const session = ready();
    expect(
      session.apply(
        message("snapshot", "1", "2000", [["98", "1"]], [["103", "1"]]),
        times,
      ).outcome,
    ).toBe("REPLACED");
    expect(session.executableView()?.bestBid.toString()).toBe("98");
  });
  it("rejects u=1 delta and revokes trust", () => {
    const session = ready();
    expect(session.apply(message("delta", "1", "2000"), times).outcome).toBe(
      "GAP_DETECTED",
    );
    expect(session.executableView()).toBeUndefined();
  });
  it("deletes exactly one level on zero quantity", () => {
    const session = ready();
    expect(
      session.apply(
        message("delta", "101", "1001", [
          ["100", "0"],
          ["99", "1"],
        ]),
        times,
      ).outcome,
    ).toBe("APPLIED");
    expect(
      session.executableView()?.bids.map((level) => level.price.toString()),
    ).toEqual(["99"]);
  });
  it("prevents crossed deltas from becoming executable", () => {
    const session = ready();
    expect(
      session.apply(message("delta", "101", "1001", [["102", "1"]]), times)
        .outcome,
    ).toBe("GAP_DETECTED");
    expect(session.executableView()).toBeUndefined();
  });
  it("rejects a stale snapshot instead of making it executable", () => {
    const session = new BybitOrderBookSession(binding(), topic, freshness);
    expect(
      session.apply(
        message("snapshot", "100", "1000", [["100", "1"]], [["101", "1"]]),
        {
          receiveTimestamp: "2023-11-14T22:13:30.000Z" as never,
          processingTimestamp: "2023-11-14T22:13:30.001Z" as never,
        },
      ).outcome,
    ).toBe("GAP_DETECTED");
    expect(session.executableView()).toBeUndefined();
  });
  it("revokes executable output for a future-skewed delta", () => {
    const session = ready();
    expect(
      session.apply(
        {
          ...message("delta", "101", "1001", [["99", "1"]]),
          timestamp: "1700000001000",
        },
        times,
      ).outcome,
    ).toBe("GAP_DETECTED");
    expect(session.executableView()).toBeUndefined();
  });
  it("disconnect and shutdown revoke executable output", () => {
    const session = ready();
    session.markTransportGap("DISCONNECT", times.processingTimestamp);
    expect(session.executableView()).toBeUndefined();
    session.stop(times.processingTimestamp);
    expect(session.state().state).toBe("STOPPED");
  });
  it("replays the same valid sequence deterministically", () => {
    const replay = () => {
      const session = ready();
      session.apply(
        message("delta", "110", "1010", [["99", "3"]], [["101", "1"]]),
        times,
      );
      return JSON.stringify(session.executableView(), (_, value) =>
        typeof value === "bigint" ? value.toString() : value,
      );
    };
    expect(replay()).toBe(replay());
  });
  it(
    "preserves sorted sides for generated monotonic bid updates",
    () =>
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.integer({ min: 1, max: 99 }), {
            minLength: 1,
            maxLength: 20,
          }),
          (values) => {
            const session = ready();
            let u = 100;
            let seq = 1000;
            for (const value of values) {
              u += 2;
              seq += 3;
              expect(
                session.apply(
                  message("delta", String(u), String(seq), [
                    [String(value), "1"],
                  ]),
                  times,
                ).outcome,
              ).toBe("APPLIED");
            }
            const bids =
              session
                .executableView()
                ?.bids.map((level) => BigInt(level.price.toString())) ?? [];
            expect(bids).toEqual(
              [...bids].sort((left, right) =>
                left === right ? 0 : left > right ? -1 : 1,
              ),
            );
          },
        ),
      ),
    10_000,
  );
});
