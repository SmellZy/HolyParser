import { describe, expect, it } from "vitest";
import {
  RecordingOkxEventSink,
  RecordingOkxMetricSink,
} from "./observability.js";
import { OkxBookSession } from "./book-session.js";
import { replayOkxFrames } from "./replay.js";
import {
  binding,
  fixedTimes,
  fixture,
  freshness,
  session,
} from "./test-helpers.js";

describe("OKX JSON books state machine", () => {
  const frames = fixture<Record<string, unknown>>("books-sequence.json");
  const text = (name: string): string => JSON.stringify(frames[name]);

  it("initializes, applies deltas, deletes zero levels and preserves sorting", () => {
    const book = session();
    expect(book.processText(text("snapshot"), fixedTimes)[0]).toMatchObject({
      kind: "BOOK",
      result: { outcome: "INITIALIZED" },
    });
    expect(book.processText(text("delta"), fixedTimes)[0]).toMatchObject({
      kind: "BOOK",
      result: { outcome: "APPLIED" },
    });
    const view = book.executableView();
    expect(view?.bids.map((level) => level.price.toString())).toEqual([
      "10.25",
      "10.24",
    ]);
    expect(view?.asks.map((level) => level.price.toString())).toEqual([
      "10.27",
    ]);
  });

  it("accepts the documented empty no-update message as a heartbeat", () => {
    const book = session();
    book.processText(text("snapshot"), fixedTimes);
    book.processText(text("delta"), fixedTimes);
    const before = book.executableView();
    expect(book.processText(text("heartbeat"), fixedTimes)).toEqual([
      { kind: "HEARTBEAT" },
    ]);
    expect(book.executableView()).toEqual(before);
  });

  it("does not treat same-ID messages with levels as heartbeats", () => {
    const book = session();
    book.processText(text("snapshot"), fixedTimes);
    const message = structuredClone(frames.heartbeat) as {
      data: Array<{
        bids: string[][];
        prevSeqId: number;
        seqId: number;
      }>;
    };
    message.data[0]!.bids = [["10.25", "99", "0", "1"]];
    message.data[0]!.prevSeqId = 100;
    message.data[0]!.seqId = 100;
    const before = book.executableView();
    expect(
      book.processText(JSON.stringify(message), fixedTimes)[0],
    ).toMatchObject({
      kind: "BOOK",
      result: { outcome: "DUPLICATE_REJECTED" },
    });
    expect(book.executableView()).toEqual(before);
  });

  it("rejects duplicate and older snapshots without mutating a healthy book", () => {
    const book = session();
    book.processText(text("snapshot"), fixedTimes);
    const before = book.executableView();
    expect(book.processText(text("snapshot"), fixedTimes)[0]).toMatchObject({
      kind: "BOOK",
      result: { outcome: "DUPLICATE_REJECTED" },
    });
    expect(book.executableView()).toEqual(before);

    const older = structuredClone(frames.snapshot) as {
      data: Array<{ seqId: number }>;
    };
    older.data[0]!.seqId = 99;
    expect(
      book.processText(JSON.stringify(older), fixedTimes)[0],
    ).toMatchObject({
      kind: "BOOK",
      result: { outcome: "DUPLICATE_REJECTED" },
    });
    expect(book.executableView()).toEqual(before);
  });

  it("validates checksum and source freshness on empty heartbeats", () => {
    const checksumBook = session();
    checksumBook.processText(text("snapshot"), fixedTimes);
    const invalidChecksum = structuredClone(frames.heartbeat) as {
      data: Array<{ checksum: number }>;
    };
    invalidChecksum.data[0]!.checksum = 1;
    expect(() =>
      checksumBook.processText(JSON.stringify(invalidChecksum), fixedTimes),
    ).toThrow(/fixed to zero/);
    expect(checksumBook.executableView()).toBeUndefined();

    const staleBook = new OkxBookSession({
      binding: binding(),
      freshness: freshness("books", 1_000n, 2_000n, 1_000n),
    });
    expect(
      staleBook.processText(text("snapshot"), fixedTimes)[0],
    ).toMatchObject({
      kind: "RECONNECT_REQUIRED",
    });
    expect(staleBook.executableView()).toBeUndefined();
  });

  it("suppresses executable output after a gap until replacement recovery", () => {
    const book = session();
    book.processText(text("snapshot"), fixedTimes);
    book.processText(text("delta"), fixedTimes);
    expect(book.processText(text("gap"), fixedTimes)[0]).toMatchObject({
      result: { outcome: "GAP_DETECTED", quality: "STALE" },
    });
    expect(book.executableView()).toBeUndefined();
    expect(book.processText(text("delta"), fixedTimes)[0]).toMatchObject({
      result: { outcome: "REJECTED_STALE" },
    });
    expect(book.processText(text("recovery"), fixedTimes)[0]).toMatchObject({
      result: { outcome: "RECOVERED", quality: "HEALTHY" },
    });
    expect(book.executableView()?.lastUpdateId).toBe(200n);
  });

  it("fails closed on documented maintenance reset and requires a new snapshot", () => {
    const eventSink = new RecordingOkxEventSink();
    const metricSink = new RecordingOkxMetricSink();
    const book = new OkxBookSession({
      binding: binding(),
      eventSink,
      metricSink,
      freshness: freshness("books"),
    });
    book.processText(text("snapshot"), fixedTimes);
    book.processText(text("delta"), fixedTimes);
    expect(
      book.processText(text("maintenanceReset"), fixedTimes)[0],
    ).toMatchObject({ kind: "RECONNECT_REQUIRED" });
    expect(book.executableView()).toBeUndefined();
    expect(
      eventSink.events.some(
        (event) => event.type === "OKX_MAINTENANCE_SEQUENCE_RESET",
      ),
    ).toBe(true);
    expect(book.processText(text("recovery"), fixedTimes)[0]).toMatchObject({
      result: { outcome: "RECOVERED" },
    });
  });

  it("rejects non-zero checksum and marks transport stale", () => {
    const book = session();
    book.processText(text("snapshot"), fixedTimes);
    const corrupted = structuredClone(frames.delta) as {
      data: Array<{ checksum: number }>;
    };
    corrupted.data[0]!.checksum = 12;
    expect(() =>
      book.processText(JSON.stringify(corrupted), fixedTimes),
    ).toThrow(/fixed to zero/);
    expect(book.executableView()).toBeUndefined();
  });

  it("treats a non-zero subscription acknowledgement as reconnect-required", () => {
    const book = session();
    expect(
      book.processText(
        JSON.stringify({
          event: "subscribe",
          code: "60033",
          msg: "Parameter id error",
          arg: { channel: "books", instId: "ALPHA-USDT-SWAP" },
        }),
        fixedTimes,
      ),
    ).toEqual([
      {
        kind: "RECONNECT_REQUIRED",
        reason: "OKX subscription acknowledgement failed with code 60033.",
      },
    ]);
    expect(book.executableView()).toBeUndefined();
  });

  it("replays valid fixtures deterministically and injects dropped frames", () => {
    const valid = [text("snapshot"), text("delta"), text("heartbeat")];
    const replay = () => replayOkxFrames(session(), valid, () => fixedTimes);
    expect(replay()).toEqual(replay());

    const dropped = replayOkxFrames(
      session(),
      [text("snapshot"), text("delta"), text("gap")],
      () => fixedTimes,
      [{ at: 1, type: "DROP" }],
    );
    expect(dropped.executableBook).toBeUndefined();
  });
});
