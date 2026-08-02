import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { OkxSchemaError } from "./errors.js";
import { parseJson, parseJsonPreservingSequenceIds } from "./runtime-schema.js";
import { fixture } from "./test-helpers.js";
import {
  parseFundingRates,
  parseInstruments,
  parseRestBooks,
  parseTickers,
  parseWebSocketMessage,
} from "./wire.js";

describe("OKX runtime schemas", () => {
  const rest = fixture<Record<string, unknown>>("public-rest.json");
  const books = fixture<Record<string, unknown>>("books-sequence.json");
  const malformed = fixture<Record<string, string>>("malformed.json");

  it("parses only the verified derivative fields", () => {
    const rows = parseInstruments(rest.instruments).data;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.ctType).toBe("linear");
    expect(rows[0]?.baseCcy).toBe("");
  });

  it("preserves sequence integers beyond JavaScript safe integer range", () => {
    const raw = parseJsonPreservingSequenceIds(
      '{"seqId":900719925474099312345,"prevSeqId":900719925474099312344,"checksum":0}',
      1_024,
    ) as Record<string, unknown>;
    expect(raw.seqId).toBe("900719925474099312345");
    expect(raw.prevSeqId).toBe("900719925474099312344");
    expect(raw.checksum).toBe("0");
  });

  it("validates funding semantics and rest book structure", () => {
    expect(parseFundingRates(rest.funding).data[0]?.method).toBe(
      "current_period",
    );
    expect(parseRestBooks(rest.book).data[0]?.seqId).toBe("100");
  });

  it("parses snapshot, update, heartbeat, gap and recovery fixtures", () => {
    for (const name of [
      "snapshot",
      "delta",
      "heartbeat",
      "gap",
      "maintenanceReset",
      "recovery",
    ]) {
      const text = JSON.stringify(books[name]);
      expect(
        parseWebSocketMessage(parseJsonPreservingSequenceIds(text, 100_000))
          .kind,
      ).toBe("BOOK");
    }
  });

  it("rejects malformed payloads and byte-limit violations", () => {
    expect(() => parseJson("{", 100)).toThrow(OkxSchemaError);
    expect(() => parseJson(`"${"x".repeat(101)}"`, 100)).toThrow(/byte limit/);
    expect(() =>
      parseInstruments({
        code: "0",
        msg: "",
        data: [{ instType: "SPOT" }],
      }),
    ).toThrow(OkxSchemaError);
  });

  it("bounds hostile JSON structure, book levels and sequence identifiers", () => {
    let nested: unknown = "leaf";
    for (let index = 0; index < 66; index += 1) {
      nested = [nested];
    }
    expect(() => parseJson(JSON.stringify(nested), 100_000)).toThrow();

    const book = structuredClone(rest.book) as {
      data: Array<{ bids: unknown[] }>;
    };
    book.data[0]!.bids = Array.from({ length: 401 }, () => [
      "1",
      "1",
      "0",
      "1",
    ]);
    expect(() => parseRestBooks(book)).toThrow(/bounded array/);

    const snapshot = structuredClone(books.snapshot) as {
      data: Array<{ seqId: string }>;
    };
    snapshot.data[0]!.seqId = malformed.unsafeSequenceText!.repeat(4);
    expect(() => parseWebSocketMessage(snapshot)).toThrow(/integer/);
  });

  it("rejects missing, null, empty and oversized required price fields", () => {
    const ticker = structuredClone(rest.ticker) as {
      data: Array<Record<string, unknown>>;
    };
    delete ticker.data[0]!.ts;
    expect(() => parseTickers(ticker)).toThrow();

    ticker.data[0]!.ts = "1785024000000";
    ticker.data[0]!.last = null;
    expect(() => parseTickers(ticker)).toThrow();

    ticker.data[0]!.last = "9".repeat(257);
    expect(() => parseTickers(ticker)).toThrow(/bounded string/);
  });

  it("uses an explicit forward-compatible unknown-field policy", () => {
    const envelope = structuredClone(rest.instruments) as {
      futureEnvelopeField?: string;
      data: Array<{ futureRowField?: string }>;
    };
    envelope.futureEnvelopeField = "ignored-within-global-structure-bounds";
    envelope.data[0]!.futureRowField = "ignored-within-row-field-bounds";
    expect(parseInstruments(envelope).data).toHaveLength(2);
  });

  it("preserves arbitrary bounded sequence integers exactly", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 70n }),
        fc.bigInt({ min: 0n, max: 10n ** 70n }),
        (sequence, previous) => {
          const raw = parseJsonPreservingSequenceIds(
            `{"seqId":${sequence},"prevSeqId":${previous},"checksum":0}`,
            1_024,
          ) as Record<string, unknown>;
          expect(raw.seqId).toBe(sequence.toString());
          expect(raw.prevSeqId).toBe(previous.toString());
        },
      ),
    );
  });
});
