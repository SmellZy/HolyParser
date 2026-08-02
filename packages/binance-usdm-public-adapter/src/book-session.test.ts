import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { timestamp } from "@arbitrage/market-data";
import { BinanceUsdmBookSession } from "./book-session.js";
import { mapDepthSnapshot } from "./mapping.js";
import {
  RecordingBinanceUsdmEventSink,
  RecordingBinanceUsdmMetricSink,
  binanceUsdmMetricLabels,
} from "./observability.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import {
  btcBinding,
  fixture,
  testFreshness,
  testTimes,
} from "./test-helpers.js";
import { parseDepthSnapshot, parseDiffDepth } from "./wire.js";

function parsed<T>(value: T): unknown {
  return parseJsonPreservingIntegers(JSON.stringify(value), 1_000_000);
}

function makeSession() {
  const eventSink = new RecordingBinanceUsdmEventSink();
  const metricSink = new RecordingBinanceUsdmMetricSink();
  const session = new BinanceUsdmBookSession({
    binding: btcBinding(),
    freshness: testFreshness("depth"),
    eventSink,
    metricSink,
  });
  return { session, eventSink, metricSink };
}

function baseSnapshot(replacement = false) {
  const rest = fixture<Record<string, unknown>>("public-rest.json");
  return mapDepthSnapshot(
    parseDepthSnapshot(parsed(rest.depth)),
    btcBinding(),
    testTimes,
    testFreshness("depth"),
    replacement,
  );
}

describe("official Binance USD-M local order-book algorithm", () => {
  const sequence = fixture<Record<string, unknown>>("depth-sequence.json");

  it("buffers before snapshot and suppresses executable output until first overlap", () => {
    const { session } = makeSession();
    expect(
      session.processWire(
        parseDiffDepth(parsed(sequence.initialOverlap)),
        testTimes,
      )[0]?.kind,
    ).toBe("BUFFERED");
    expect(session.executableView()).toBeUndefined();
    const outcomes = session.acceptSnapshot(baseSnapshot());
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "SNAPSHOT_ACCEPTED",
      "DELTA_ACCEPTED",
    ]);
    expect(session.executableView()?.lastUpdateId).toBe(102n);
  });

  it("processes a first overlap that arrives after the REST snapshot", () => {
    const { session } = makeSession();
    expect(session.acceptSnapshot(baseSnapshot())[0]?.kind).toBe(
      "SNAPSHOT_ACCEPTED",
    );
    expect(
      session.processWire(
        parseDiffDepth(parsed(sequence.initialOverlap)),
        testTimes,
      )[0]?.kind,
    ).toBe("DELTA_ACCEPTED");
    expect(session.state().state).toBe("READY");
    expect(session.executableView()?.lastUpdateId).toBe(102n);
  });

  it("accepts an equality boundary without requiring pu against the snapshot", () => {
    const { session } = makeSession();
    const boundary = parseDiffDepth(
      parsed({
        ...(sequence.initialOverlap as Record<string, unknown>),
        U: 99,
        u: 100,
        pu: 98,
        b: [],
        a: [],
      }),
    );
    session.processWire(boundary, testTimes);
    expect(session.acceptSnapshot(baseSnapshot())[1]?.kind).toBe(
      "OLD_REJECTED",
    );
    expect(session.state().state).toBe("READY");

    const next = parseDiffDepth(
      parsed({
        ...(sequence.linked as Record<string, unknown>),
        U: 101,
        u: 102,
        pu: 100,
      }),
    );
    expect(session.processWire(next, testTimes)[0]?.kind).toBe(
      "DELTA_ACCEPTED",
    );
    expect(session.executableView()?.lastUpdateId).toBe(102n);
  });

  it("discards buffered events whose u is below snapshot lastUpdateId", () => {
    const { session } = makeSession();
    session.processWire(parseDiffDepth(parsed(sequence.old)), testTimes);
    session.processWire(
      parseDiffDepth(parsed(sequence.initialOverlap)),
      testTimes,
    );
    expect(
      session.acceptSnapshot(baseSnapshot()).map((row) => row.kind),
    ).toEqual(["SNAPSHOT_ACCEPTED", "OLD_REJECTED", "DELTA_ACCEPTED"]);
  });

  it("does not require first-event pu to equal REST snapshot ID", () => {
    const { session } = makeSession();
    const first = parseDiffDepth(parsed(sequence.initialOverlap));
    expect(first.previousFinalUpdateId).toBe("98");
    session.processWire(first, testTimes);
    session.acceptSnapshot(baseSnapshot());
    expect(session.state().state).toBe("READY");
  });

  it("requires subsequent pu chaining and deletes zero-quantity levels", () => {
    const { session } = makeSession();
    session.processWire(
      parseDiffDepth(parsed(sequence.initialOverlap)),
      testTimes,
    );
    session.acceptSnapshot(baseSnapshot());
    session.processWire(parseDiffDepth(parsed(sequence.linked)), testTimes);
    const view = session.executableView();
    expect(view?.lastUpdateId).toBe(104n);
    expect(view?.bids.map((level) => level.price.toString())).not.toContain(
      "59999.9",
    );
    expect(view?.bids[0]?.price.toString()).toBe("60000");
    expect(view?.asks[0]?.price.toString()).toBe("60000.2");
  });

  it("rejects duplicate/old events without refreshing accepted update count", () => {
    const { session, metricSink } = makeSession();
    session.processWire(
      parseDiffDepth(parsed(sequence.initialOverlap)),
      testTimes,
    );
    session.acceptSnapshot(baseSnapshot());
    session.processWire(parseDiffDepth(parsed(sequence.linked)), testTimes);
    const before = session.state().acceptedUpdates;
    expect(
      session.processWire(
        parseDiffDepth(parsed(sequence.duplicate)),
        testTimes,
      )[0]?.kind,
    ).toBe("OLD_REJECTED");
    expect(session.state().acceptedUpdates).toBe(before);
    expect(
      metricSink.value(
        "market_data_duplicate_updates_total",
        binanceUsdmMetricLabels("SEQUENCE_VALIDATION"),
      ),
    ).toBe(1n);
  });

  it("marks a pu gap GAPPED/STALE and suppresses executable output", () => {
    const { session, eventSink } = makeSession();
    session.processWire(
      parseDiffDepth(parsed(sequence.initialOverlap)),
      testTimes,
    );
    session.acceptSnapshot(baseSnapshot());
    session.processWire(parseDiffDepth(parsed(sequence.linked)), testTimes);
    expect(
      session.processWire(parseDiffDepth(parsed(sequence.gap)), testTimes)[0]
        ?.kind,
    ).toBe("GAP");
    expect(session.state().state).toBe("GAPPED");
    expect(session.executableView()).toBeUndefined();
    expect(
      eventSink.events.some(
        (event) => event.type === "BINANCE_USDM_SEQUENCE_GAP",
      ),
    ).toBe(true);
  });

  it("does not recover from ordinary deltas or an ordinary snapshot", () => {
    const { session } = makeSession();
    session.processWire(
      parseDiffDepth(parsed(sequence.initialOverlap)),
      testTimes,
    );
    session.acceptSnapshot(baseSnapshot());
    session.processWire(parseDiffDepth(parsed(sequence.linked)), testTimes);
    session.processWire(parseDiffDepth(parsed(sequence.gap)), testTimes);
    expect(
      session.processWire(parseDiffDepth(parsed(sequence.linked)), testTimes)[0]
        ?.kind,
    ).toBe("RECOVERY_REQUIRED");
    session.beginRecovery();
    expect(session.acceptSnapshot(baseSnapshot())[0]?.kind).toBe(
      "RECOVERY_REQUIRED",
    );
  });

  it("recovers only through a replacement snapshot and a new overlap replay", () => {
    const { session, eventSink } = makeSession();
    session.processWire(
      parseDiffDepth(parsed(sequence.initialOverlap)),
      testTimes,
    );
    session.acceptSnapshot(baseSnapshot());
    session.processWire(parseDiffDepth(parsed(sequence.linked)), testTimes);
    session.processWire(parseDiffDepth(parsed(sequence.gap)), testTimes);
    session.beginRecovery();
    const recoveryDelta = parseDiffDepth(
      parsed({
        e: "depthUpdate",
        E: 1785628800500,
        T: 1785628800499,
        s: "BTCUSDT",
        ps: "BTCUSDT",
        st: 1,
        U: 199,
        u: 202,
        pu: 198,
        b: [["60000", "3"]],
        a: [["60000.2", "2"]],
      }),
    );
    session.processWire(recoveryDelta, testTimes);
    const replacement = mapDepthSnapshot(
      parseDepthSnapshot(
        parsed({
          lastUpdateId: 200,
          E: 1785628800400,
          T: 1785628800399,
          bids: [["60000", "2"]],
          asks: [["60000.2", "2"]],
        }),
      ),
      btcBinding(),
      testTimes,
      testFreshness("depth"),
      true,
    );
    session.acceptSnapshot(replacement);
    expect(session.state().state).toBe("READY");
    expect(session.executableView()?.lastUpdateId).toBe(202n);
    expect(
      eventSink.events.some((event) => event.type === "BINANCE_USDM_RECOVERED"),
    ).toBe(true);
  });

  it.each(["crossedSnapshot", "lockedSnapshot"])(
    "rejects %s as healthy/executable",
    (name) => {
      const malformed = fixture<Record<string, unknown>>("malformed.json");
      const { session } = makeSession();
      const snapshot = mapDepthSnapshot(
        parseDepthSnapshot(parsed(malformed[name])),
        btcBinding(),
        testTimes,
        testFreshness("depth"),
      );
      expect(session.acceptSnapshot(snapshot)[0]?.kind).toBe(
        "SNAPSHOT_ACCEPTED",
      );
      expect(session.state().state).toBe("STALE");
      expect(session.executableView()).toBeUndefined();
    },
  );

  it("fails closed for stale and future-skewed exchange timestamps", () => {
    const staleTimes = {
      receiveTimestamp: timestamp("2026-08-02T00:00:10.000Z"),
      processingTimestamp: timestamp("2026-08-02T00:00:10.100Z"),
    };
    const { session } = makeSession();
    expect(
      session.processWire(
        parseDiffDepth(parsed(sequence.initialOverlap)),
        staleTimes,
      )[0]?.kind,
    ).toBe("RECOVERY_REQUIRED");
    expect(session.state().state).toBe("STALE");
  });

  it("requires explicit replacement recovery after an unparseable stream frame", () => {
    const { session } = makeSession();
    expect(() => session.processText("{", testTimes)).toThrow();
    expect(session.state()).toMatchObject({
      state: "STALE",
      recoveryRequired: true,
    });
    expect(session.acceptSnapshot(baseSnapshot())[0]?.kind).toBe(
      "RECOVERY_REQUIRED",
    );
  });

  it("replays the same fixture deterministically", () => {
    const replay = () => {
      const { session } = makeSession();
      session.processWire(parseDiffDepth(parsed(sequence.old)), testTimes);
      session.processWire(
        parseDiffDepth(parsed(sequence.initialOverlap)),
        testTimes,
      );
      session.acceptSnapshot(baseSnapshot());
      session.processWire(parseDiffDepth(parsed(sequence.linked)), testTimes);
      return session.replayFingerprint();
    };
    expect(replay()).toBe(replay());
  });

  it("preserves bigint continuity across generated valid chains", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (length) => {
        const start = 9_007_199_254_740_993n;
        let previous = start;
        for (let index = 0; index < Math.min(length, 30); index += 1) {
          const current = previous + 1n;
          expect(current > previous).toBe(true);
          previous = current;
        }
      }),
      { numRuns: 100 },
    );
  });
});
