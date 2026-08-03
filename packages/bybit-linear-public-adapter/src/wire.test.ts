import { describe, expect, it } from "vitest";
import { BYBIT_LIMITS } from "./constants.js";
import { BybitLinearAdapterError, BybitLinearSchemaError } from "./errors.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import { envelope, usdtPerpetual } from "./test-helpers.js";
import {
  parseFundingHistory,
  parseInstruments,
  parseRestBook,
  parseServerTime,
  parseTickers,
  parseWsBook,
} from "./wire.js";

describe("Bybit V5 bounded wire schemas", () => {
  it("parses a linear instrument and explicit constraints", () => {
    const parsed = parseInstruments(
      envelope({
        category: "linear",
        list: [
          {
            ...usdtPerpetual,
            fundingInterval: 480,
            priceFilter: { tickSize: "0.1" },
            lotSizeFilter: {
              qtyStep: "0.001",
              minOrderQty: "0.001",
              minNotionalValue: "5",
            },
          },
        ],
        nextPageCursor: "",
      }),
    );
    expect(parsed.instruments[0]?.settleCoin).toBe("USDT");
    expect(parsed.instruments[0]?.fundingIntervalMinutes).toBe(480);
  });
  it("quarantines unknown contract types and statuses", () => {
    const parsed = parseInstruments(
      envelope({
        category: "linear",
        list: [
          { contractType: "Mystery", status: "Trading" },
          { contractType: "LinearPerpetual", status: "Paused" },
        ],
        nextPageCursor: "",
      }),
    );
    expect(parsed.instruments).toHaveLength(0);
    expect(parsed.rejectedCount).toBe(2);
  });
  it("rejects records outside category linear", () =>
    expect(() =>
      parseInstruments(
        envelope({ category: "inverse", list: [], nextPageCursor: "" }),
      ),
    ).toThrow(BybitLinearAdapterError));
  it("keeps price semantics separate and empty funding unknown", () => {
    const rows = parseTickers(
      envelope({
        category: "linear",
        list: [
          {
            symbol: "BTCUSDT",
            lastPrice: "1",
            bid1Price: "0.9",
            ask1Price: "1.1",
            markPrice: "1.01",
            indexPrice: "1.02",
            fundingRate: "",
            nextFundingTime: "",
            fundingIntervalHour: "",
          },
        ],
      }),
    );
    expect(rows[0]).toMatchObject({
      lastPrice: "1",
      bid1Price: "0.9",
      ask1Price: "1.1",
      markPrice: "1.01",
      indexPrice: "1.02",
    });
    expect(rows[0]?.fundingRate).toBeUndefined();
  });
  it("rejects scientific notation and non-string financial values", () => {
    const base = {
      category: "linear",
      list: [
        {
          symbol: "BTCUSDT",
          lastPrice: "1e2",
          bid1Price: "1",
          ask1Price: "2",
          markPrice: "1",
          indexPrice: "1",
        },
      ],
    };
    expect(() => parseTickers(envelope(base))).toThrow(BybitLinearSchemaError);
    expect(() =>
      parseTickers(
        envelope({ ...base, list: [{ ...base.list[0], lastPrice: 1 }] }),
      ),
    ).toThrow(BybitLinearSchemaError);
  });
  it("preserves update IDs beyond JavaScript safe integer", () => {
    const parsed = parseJsonPreservingIntegers(
      '{"retCode":0,"retMsg":"OK","result":{"s":"BTCUSDT","b":[["1","1"]],"a":[["2","1"]],"ts":1700000000000,"u":90071992547409931234,"seq":90071992547409931235,"cts":1700000000000},"time":1700000000000}',
      BYBIT_LIMITS.responseBytes,
    );
    expect(parseRestBook(parsed).updateId).toBe("90071992547409931234");
  });
  it("rejects zero snapshot quantity and allows zero delta deletion", () => {
    const snapshot = {
      topic: "orderbook.50.BTCUSDT",
      type: "snapshot",
      ts: "1",
      cts: "1",
      data: { s: "BTCUSDT", b: [["1", "0"]], a: [], u: "1", seq: "1" },
    };
    expect(() => parseWsBook(snapshot)).toThrow(BybitLinearSchemaError);
    expect(parseWsBook({ ...snapshot, type: "delta" }).bids[0]?.[1]).toBe("0");
  });
  it("rejects excessive identifier length and hostile nesting", () => {
    expect(() =>
      parseWsBook({
        topic: "orderbook.50.BTCUSDT",
        type: "delta",
        ts: "1",
        cts: "1",
        data: { s: "BTCUSDT", b: [], a: [], u: "1".repeat(31), seq: "1" },
      }),
    ).toThrow(BybitLinearSchemaError);
    let nested: unknown = 1;
    for (let index = 0; index < 40; index += 1) nested = [nested];
    expect(() =>
      parseJsonPreservingIntegers(JSON.stringify(nested), 10_000),
    ).toThrow(BybitLinearSchemaError);
  });
  it("rejects invalid calendar timestamps before domain mapping", () => {
    expect(() =>
      parseWsBook({
        topic: "orderbook.50.BTCUSDT",
        type: "delta",
        ts: "9999999999999999",
        cts: "1700000000000",
        data: { s: "BTCUSDT", b: [], a: [], u: "2", seq: "2" },
      }),
    ).toThrow(BybitLinearSchemaError);
  });
  it("parses funding history and exact server time", () => {
    expect(
      parseFundingHistory(
        envelope({
          category: "linear",
          list: [
            {
              symbol: "BTCUSDT",
              fundingRate: "-0.0001",
              fundingRateTimestamp: "1700000000000",
            },
          ],
        }),
      )[0]?.fundingRate,
    ).toBe("-0.0001");
    expect(
      parseServerTime(
        envelope({ timeSecond: "1700000000", timeNano: "1700000000000000000" }),
      ).timeNano,
    ).toBe("1700000000000000000");
  });
  it("distinguishes retCode errors from schema failures", () => {
    expect(() =>
      parseServerTime({
        retCode: 10006,
        retMsg: "Too many visits!",
        result: {},
        time: "1",
      }),
    ).toThrowError(expect.objectContaining({ kind: "RATE_LIMIT" }));
  });
});
