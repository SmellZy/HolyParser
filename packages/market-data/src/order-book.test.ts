import { readFileSync } from "node:fs";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { price, quantity } from "./decimal.js";
import {
  parseRecordedBookFixture,
  type RawBookFixture,
  type RecordedBookFixture,
} from "./fixtures.js";
import {
  canonicalAssetId,
  instrumentId,
  officialInstrumentId,
  productGroup,
  settlementAsset,
  venue,
} from "./identifiers.js";
import {
  DeterministicOrderBook,
  updateId,
  type BookDelta,
  type BookSnapshot,
  type BookUpdate,
  type OrderBookMachineConfig,
  type ReplacementSnapshot,
} from "./order-book.js";
import { RecordingEventSink } from "./observability.js";
import { sourceId, timestamp } from "./quality.js";

const fixtureNames = [
  "okx-sequence-chain.json",
  "binance-u-u-pu.json",
  "bybit-snapshot-restart.json",
  "hyperliquid-snapshot-replacement.json",
] as const;

function loadFixture(name: (typeof fixtureNames)[number]): RecordedBookFixture {
  const raw = JSON.parse(
    readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"),
  ) as RawBookFixture;
  return parseRecordedBookFixture(raw);
}

function machineFor(
  fixture: RecordedBookFixture,
  eventSink?: RecordingEventSink,
): DeterministicOrderBook {
  return new DeterministicOrderBook({
    instrumentId: fixture.instrumentId,
    venue: fixture.identity.venue,
    productGroup: fixture.identity.productGroup,
    channel: fixture.fixtureId,
    strategy: fixture.strategy,
    sequencePolicy: fixture.sequencePolicy,
    ...(fixture.restartUpdateId === undefined
      ? {}
      : { restartUpdateId: fixture.restartUpdateId }),
    ...(eventSink === undefined ? {} : { eventSink }),
  });
}

function replay(fixture: RecordedBookFixture): DeterministicOrderBook {
  const machine = machineFor(fixture);
  for (const event of fixture.events) {
    machine.apply(event);
  }
  return machine;
}

function serializeExecutable(machine: DeterministicOrderBook): unknown {
  const view = machine.executableView();
  if (view === undefined) {
    return undefined;
  }
  return {
    bids: view.bids.map((level) => [
      level.price.toString(),
      level.quantity.toString(),
    ]),
    asks: view.asks.map((level) => [
      level.price.toString(),
      level.quantity.toString(),
    ]),
    bestBid: view.bestBid.toString(),
    bestAsk: view.bestAsk.toString(),
    midpoint: view.midpoint.toString(),
    lastUpdateId: view.lastUpdateId?.toString(),
  };
}

const testVenue = venue("test-venue");
const testProduct = productGroup("test-product");
const testInstrument = instrumentId({
  venue: testVenue,
  productGroup: testProduct,
  officialInstrumentId: officialInstrumentId("TEST-INSTRUMENT"),
  marketType: "PERPETUAL",
  settlementAsset: settlementAsset(canonicalAssetId("asset:usdt")),
});
const testTime = timestamp("2026-07-26T12:00:00Z");
const testContext = {
  exchangeTimestamp: testTime,
  receiveTimestamp: testTime,
  processingTimestamp: testTime,
  source: sourceId("TEST-01"),
  quality: "HEALTHY" as const,
};

function testMachine(
  overrides: Partial<OrderBookMachineConfig> = {},
): DeterministicOrderBook {
  return new DeterministicOrderBook({
    instrumentId: testInstrument,
    venue: testVenue,
    productGroup: testProduct,
    channel: "test-books",
    strategy: "SEQUENCE_CHAINED_DELTA",
    sequencePolicy: "PREVIOUS_ID_CHAIN",
    ...overrides,
  });
}

function snapshot(bid: string, ask: string, sequence = "10"): BookSnapshot {
  return {
    kind: "SNAPSHOT",
    instrumentId: testInstrument,
    updateId: updateId(sequence),
    bids: [{ price: price(bid), quantity: quantity("1") }],
    asks: [{ price: price(ask), quantity: quantity("1") }],
    context: testContext,
  };
}

describe("official-semantics fixture replay", () => {
  it("anchors every fixture to the Phase 0 source register", () => {
    const sourceRegister = readFileSync(
      new URL("../../../docs/PHASE_0_SOURCE_REGISTER.md", import.meta.url),
      "utf8",
    );

    for (const fixtureName of fixtureNames) {
      const fixture = loadFixture(fixtureName);
      expect(sourceRegister).toMatch(
        new RegExp(`\\|\\s*${fixture.provenance.sourceId}\\s*\\|`),
      );
      expect(fixture.provenance.retrievalDate).toBe("2026-07-26");
      expect(fixture.provenance.productGroup.length).toBeGreaterThan(0);
      expect(fixture.provenance.transformations.length).toBeGreaterThan(0);
      expect(["COPIED", "MINIMALLY_TRANSFORMED", "SYNTHETIC"]).toContain(
        fixture.provenance.origin,
      );
    }

    const adversarial = JSON.parse(
      readFileSync(
        new URL("../fixtures/adversarial-inputs.json", import.meta.url),
        "utf8",
      ),
    ) as { provenance: RawBookFixture["provenance"] };
    expect(sourceRegister).toMatch(
      new RegExp(`\\|\\s*${adversarial.provenance.sourceId}\\s*\\|`),
    );
    expect(adversarial.provenance.retrievalDate).toBe("2026-07-26");
    expect(adversarial.provenance.transformations.length).toBeGreaterThan(0);
  });

  it.each(fixtureNames)("replays %s deterministically", (fixtureName) => {
    const fixture = loadFixture(fixtureName);
    const first = serializeExecutable(replay(fixture));
    const second = serializeExecutable(replay(fixture));

    expect(first).toEqual(second);
    expect(first).toBeDefined();
  });

  it("applies OKX previous-sequence chaining and zero deletion", () => {
    const machine = replay(loadFixture("okx-sequence-chain.json"));
    const view = machine.executableView();

    expect(view?.bids.map((level) => level.price.toString())).toEqual([
      "99.85",
      "99.8",
    ]);
    expect(view?.asks.map((level) => level.price.toString())).toEqual([
      "100.1",
      "100.15",
    ]);
    expect(view?.lastUpdateId?.toString()).toBe("102");
  });

  it("bridges Binance U/u/pu update ranges", () => {
    const fixture = loadFixture("binance-u-u-pu.json");
    const snapshotUpdate = fixture.events[0] as BookSnapshot;
    const firstDelta = fixture.events[1] as BookDelta;
    const machine = replay(fixture);

    expect(firstDelta.firstUpdateId).toBeLessThanOrEqual(
      snapshotUpdate.updateId!,
    );
    expect(firstDelta.updateId).toBeGreaterThanOrEqual(
      snapshotUpdate.updateId!,
    );
    expect(firstDelta.previousUpdateId).not.toBe(snapshotUpdate.updateId);
    expect(machine.state()).toMatchObject({
      integrityState: "READY",
      quality: "HEALTHY",
      lastUpdateId: 203n,
    });
  });

  it("treats Bybit u=1 restart as replacement snapshot data", () => {
    const fixture = loadFixture("bybit-snapshot-restart.json");
    const machine = machineFor(fixture);
    const outcomes = fixture.events.map(
      (event) => machine.apply(event).outcome,
    );

    expect(outcomes).toEqual(["INITIALIZED", "APPLIED", "REPLACED"]);
    expect(machine.executableView()?.lastUpdateId?.toString()).toBe("1");
    expect(machine.executableView()?.bestBid.toString()).toBe("30009.9");
  });

  it("replaces the entire Hyperliquid-style snapshot book without inventing sequence", () => {
    const machine = replay(
      loadFixture("hyperliquid-snapshot-replacement.json"),
    );

    expect(machine.executableView()?.bestBid.toString()).toBe("100.1");
    expect(machine.executableView()?.lastUpdateId).toBeUndefined();
  });
});

describe("order-book integrity state machine", () => {
  it("rejects deltas before initialization", () => {
    const machine = testMachine();
    const delta: BookDelta = {
      kind: "DELTA",
      instrumentId: testInstrument,
      previousUpdateId: updateId("10"),
      updateId: updateId("11"),
      bidChanges: [],
      askChanges: [],
      context: testContext,
    };

    expect(machine.apply(delta).outcome).toBe("REJECTED_UNINITIALIZED");
    expect(machine.executableView()).toBeUndefined();
  });

  it("rejects duplicates explicitly without mutating the valid book", () => {
    const fixture = loadFixture("okx-sequence-chain.json");
    const machine = machineFor(fixture);
    const sink = new RecordingEventSink();
    const observed = machineFor(fixture, sink);
    const [initial, firstDelta] = fixture.events;

    expect(initial).toBeDefined();
    expect(firstDelta).toBeDefined();
    machine.apply(initial!);
    machine.apply(firstDelta!);
    observed.apply(initial!);
    observed.apply(firstDelta!);
    const before = serializeExecutable(observed);

    expect(observed.apply(firstDelta!).outcome).toBe("DUPLICATE_REJECTED");
    expect(serializeExecutable(observed)).toEqual(before);
    expect(
      sink.events.some((event) => event.type === "DUPLICATE_UPDATE_REJECTED"),
    ).toBe(true);
  });

  it("marks a sequence gap stale and blocks output until replacement recovery", () => {
    const fixture = loadFixture("okx-sequence-chain.json");
    const sink = new RecordingEventSink();
    const machine = machineFor(fixture, sink);
    const initial = fixture.events[0] as BookSnapshot;
    const sourceDelta = fixture.events[1] as BookDelta;
    machine.apply(initial);

    const gap: BookDelta = {
      ...sourceDelta,
      previousUpdateId: updateId("999"),
    };
    expect(machine.apply(gap)).toMatchObject({
      outcome: "GAP_DETECTED",
      integrityState: "GAPPED",
      quality: "STALE",
    });
    expect(machine.executableView()).toBeUndefined();
    expect(machine.apply(sourceDelta).outcome).toBe("REJECTED_STALE");
    expect(
      machine.apply({
        ...initial,
        updateId: updateId("500"),
      }).outcome,
    ).toBe("REJECTED_STALE");

    const recovery: ReplacementSnapshot = {
      ...initial,
      kind: "REPLACEMENT_SNAPSHOT",
      updateId: updateId("500"),
    };
    expect(machine.apply(recovery).outcome).toBe("RECOVERED");
    expect(machine.executableView()).toBeDefined();
    expect(sink.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "SEQUENCE_GAP_DETECTED",
        "STALE_TRANSITION",
        "BOOK_RECOVERED",
      ]),
    );
  });

  it("fails closed when an upstream observation is explicitly gapped", () => {
    const machine = testMachine();
    machine.apply(snapshot("99", "100"));
    const gappedUpdate: BookDelta = {
      kind: "DELTA",
      instrumentId: testInstrument,
      previousUpdateId: updateId("10"),
      updateId: updateId("11"),
      bidChanges: [],
      askChanges: [],
      context: {
        ...testContext,
        quality: "GAPPED",
      },
    };

    expect(machine.apply(gappedUpdate)).toMatchObject({
      outcome: "GAP_DETECTED",
      integrityState: "GAPPED",
      quality: "STALE",
    });
    expect(machine.executableView()).toBeUndefined();
  });

  it("marks a restart delta stale before duplicate classification", () => {
    const machine = testMachine({
      strategy: "SNAPSHOT_PLUS_DELTA",
      sequencePolicy: "CONTIGUOUS",
      restartUpdateId: updateId("1"),
    });
    machine.apply(snapshot("99", "100", "40"));

    const restartDelta: BookDelta = {
      kind: "DELTA",
      instrumentId: testInstrument,
      updateId: updateId("1"),
      bidChanges: [],
      askChanges: [],
      context: testContext,
    };
    expect(machine.apply(restartDelta)).toMatchObject({
      outcome: "GAP_DETECTED",
      integrityState: "GAPPED",
      quality: "STALE",
    });
    expect(machine.executableView()).toBeUndefined();

    const recovery: ReplacementSnapshot = {
      ...snapshot("99.5", "100.5", "1"),
      kind: "REPLACEMENT_SNAPSHOT",
    };
    expect(machine.apply(recovery).outcome).toBe("RECOVERED");
    expect(machine.executableView()).toBeDefined();
  });

  it("never exposes crossed snapshots or crossed delta output as healthy", () => {
    const machine = testMachine();
    expect(machine.apply(snapshot("101", "100")).outcome).toBe("INVALID_BOOK");
    expect(machine.executableView()).toBeUndefined();

    const second = testMachine();
    second.apply(snapshot("99", "100"));
    const crossingDelta: BookDelta = {
      kind: "DELTA",
      instrumentId: testInstrument,
      previousUpdateId: updateId("10"),
      updateId: updateId("11"),
      bidChanges: [{ price: price("101"), quantity: quantity("1") }],
      askChanges: [],
      context: testContext,
    };
    expect(second.apply(crossingDelta).outcome).toBe("INVALID_BOOK");
    expect(second.state().quality).toBe("STALE");
    expect(second.executableView()).toBeUndefined();
  });

  it("keeps no-trusted-book strategy non-executable", () => {
    const machine = testMachine({
      strategy: "NO_TRUSTED_EXECUTABLE_BOOK",
      sequencePolicy: "NONE",
    });

    expect(machine.apply(snapshot("99", "100")).outcome).toBe(
      "REJECTED_UNSUPPORTED",
    );
    expect(machine.state()).toMatchObject({
      integrityState: "DISABLED",
      quality: "UNSUPPORTED",
    });
    expect(machine.executableView()).toBeUndefined();
  });

  it("rejects deltas for snapshot-replacement strategy", () => {
    const machine = testMachine({
      strategy: "SNAPSHOT_REPLACEMENT",
      sequencePolicy: "NONE",
    });
    machine.apply(snapshot("99", "100"));
    const delta: BookDelta = {
      kind: "DELTA",
      instrumentId: testInstrument,
      bidChanges: [],
      askChanges: [],
      context: testContext,
    };

    expect(machine.apply(delta).outcome).toBe("REJECTED_UNSUPPORTED");
  });
});

describe("order-book properties", () => {
  it("never marks a crossed generated top of book executable", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        (bid, ask) => {
          const machine = testMachine();
          machine.apply(snapshot(bid.toString(), ask.toString()));
          const view = machine.executableView();

          if (view !== undefined) {
            expect(view.bestBid.compare(view.bestAsk)).toBe(-1);
            expect(machine.state().quality).toBe("HEALTHY");
          } else if (bid >= ask) {
            expect(machine.state().quality).not.toBe("HEALTHY");
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it("increasing quantity never improves VWAP on a static side", () => {
    const machine = testMachine();
    const deepSnapshot: BookSnapshot = {
      kind: "SNAPSHOT",
      instrumentId: testInstrument,
      updateId: updateId("10"),
      bids: [
        { price: price("99"), quantity: quantity("1") },
        { price: price("98"), quantity: quantity("1") },
        { price: price("96"), quantity: quantity("1") },
      ],
      asks: [
        { price: price("100"), quantity: quantity("1") },
        { price: price("101"), quantity: quantity("1") },
        { price: price("103"), quantity: quantity("1") },
      ],
      context: testContext,
    };
    machine.apply(deepSnapshot);

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        (first, second) => {
          const smaller = Math.min(first, second).toString();
          const larger = Math.max(first, second).toString();
          const smallAsk = machine.calculateVwap(
            "ASK",
            quantity(smaller),
            8,
            "HALF_EVEN",
          );
          const largeAsk = machine.calculateVwap(
            "ASK",
            quantity(larger),
            8,
            "HALF_EVEN",
          );
          const smallBid = machine.calculateVwap(
            "BID",
            quantity(smaller),
            8,
            "HALF_EVEN",
          );
          const largeBid = machine.calculateVwap(
            "BID",
            quantity(larger),
            8,
            "HALF_EVEN",
          );

          expect(largeAsk?.compare(smallAsk!)).not.toBe(-1);
          expect(largeBid?.compare(smallBid!)).not.toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
