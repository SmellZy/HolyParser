import { describe, expect, it } from "vitest";
import { BinanceUsdmAdapterError, BinanceUsdmSchemaError } from "./errors.js";
import { fixture } from "./test-helpers.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import {
  parseBookTickers,
  parseDepthSnapshot,
  parseDiffDepth,
  parseExchangeInfo,
  parseFundingHistory,
  parseFundingInfo,
  parseLastPrices,
  parsePremiumIndexes,
  parseServerTime,
} from "./wire.js";

describe("Binance USD-M runtime schemas", () => {
  const rest = fixture<Record<string, unknown>>("public-rest.json");
  const sequences = fixture<Record<string, unknown>>("depth-sequence.json");

  it("parses source-backed public REST fixture shapes", () => {
    expect(parseServerTime(rest.serverTime).serverTime).toBe("1785628800000");
    expect(parseLastPrices(rest.lastPrice)[0]?.price).toBe("60000.10");
    expect(parseBookTickers(rest.bookTicker)[0]?.askPrice).toBe("60000.20");
    expect(parsePremiumIndexes(rest.premiumIndex)[0]?.lastFundingRate).toBe(
      "0.00010000",
    );
    expect(parseFundingHistory(rest.fundingHistory)[0]?.rateType).toBe(
      "Regular",
    );
    expect(parseFundingInfo(rest.fundingInfo)[0]?.fundingIntervalHours).toBe(4);
    const depth = parseJsonPreservingIntegers(
      JSON.stringify(rest.depth),
      100_000,
    );
    expect(parseDepthSnapshot(depth).lastUpdateId).toBe("100");
  });

  it("preserves update IDs above JavaScript safe integer", () => {
    const parsed = parseJsonPreservingIntegers(
      '{"lastUpdateId":900719925474099312345,"E":1785628800100,"T":1785628800099,"bids":[["1","1"]],"asks":[["2","1"]]}',
      10_000,
    );
    expect(parseDepthSnapshot(parsed).lastUpdateId).toBe(
      "900719925474099312345",
    );
  });

  it("requires the migrated USD-M discriminator", () => {
    expect(
      parseDiffDepth(
        parseJsonPreservingIntegers(
          JSON.stringify(sequences.initialOverlap),
          10_000,
        ),
      ).symbolType,
    ).toBe(1);
    expect(() =>
      parseDiffDepth(
        parseJsonPreservingIntegers(
          JSON.stringify(sequences.wrongProductFamily),
          10_000,
        ),
      ),
    ).toThrowError(BinanceUsdmAdapterError);
  });

  it.each([
    ["scientific notation", '{"symbol":"BTCUSDT","price":"1e-8","time":1}'],
    ["numeric financial value", '{"symbol":"BTCUSDT","price":1,"time":1}'],
    ["null financial value", '{"symbol":"BTCUSDT","price":null,"time":1}'],
    ["empty financial value", '{"symbol":"BTCUSDT","price":"","time":1}'],
  ])("rejects %s", (_name, text) => {
    expect(() =>
      parseLastPrices(parseJsonPreservingIntegers(text, 10_000)),
    ).toThrowError(BinanceUsdmSchemaError);
  });

  it("rejects malformed JSON, excessive input, nesting and huge decimals", () => {
    expect(() => parseJsonPreservingIntegers('{"u":', 100)).toThrowError(
      BinanceUsdmSchemaError,
    );
    expect(() =>
      parseJsonPreservingIntegers(`"${"x".repeat(101)}"`, 100),
    ).toThrowError(BinanceUsdmSchemaError);
    const nested = `${"[".repeat(40)}0${"]".repeat(40)}`;
    expect(() => parseJsonPreservingIntegers(nested, 1_000)).toThrowError(
      BinanceUsdmSchemaError,
    );
    const huge = "9".repeat(79);
    expect(() =>
      parseLastPrices({ symbol: "BTCUSDT", price: huge, time: "1" }),
    ).toThrowError(BinanceUsdmSchemaError);
  });

  it("rejects undocumented nulls, missing fields, control characters and bad timestamps", () => {
    expect(() => parseBookTickers({ symbol: "BTCUSDT" })).toThrowError(
      BinanceUsdmSchemaError,
    );
    expect(() =>
      parseLastPrices({ symbol: "BTC\u0000USDT", price: "1", time: "1" }),
    ).toThrowError(BinanceUsdmSchemaError);
    expect(() => parseServerTime({ serverTime: -1 })).toThrowError(
      BinanceUsdmSchemaError,
    );
  });

  it("parses exchangeInfo filters but never substitutes precision fields", () => {
    const raw = fixture<unknown>("exchange-info.json");
    const exchange = parseExchangeInfo(
      parseJsonPreservingIntegers(JSON.stringify(raw), 1_000_000),
    );
    expect(exchange.symbols).toHaveLength(3);
    expect(
      exchange.symbols[0]?.filters.map((filter) => filter.filterType),
    ).toEqual(["PRICE_FILTER", "LOT_SIZE", "MIN_NOTIONAL"]);
  });

  it("preserves non-ASCII official identifiers as opaque strings", () => {
    const raw = fixture<Record<string, unknown>>("exchange-info.json");
    const first = (raw.symbols as ReadonlyArray<Record<string, unknown>>)[0]!;
    const exchange = parseExchangeInfo({
      rateLimits: raw.rateLimits,
      symbols: [
        {
          ...first,
          symbol: "資產USDT",
          pair: "資產USDT",
          baseAsset: "資產",
        },
      ],
    });
    expect(exchange.symbols[0]?.symbol).toBe("資產USDT");
    expect(exchange.symbols[0]?.baseAsset).toBe("資產");
  });

  it.each(["TRADIFI_PERPETUAL", "PERPETUAL_DELIVERING"])(
    "quarantines %s without canonical mapping",
    (contractType) => {
      const raw = fixture<Record<string, unknown>>("exchange-info.json");
      const first = (raw.symbols as ReadonlyArray<Record<string, unknown>>)[0]!;
      const exchange = parseExchangeInfo({
        rateLimits: raw.rateLimits,
        symbols: [first, { ...first, contractType }],
      });
      expect(exchange.symbols).toHaveLength(1);
      expect(exchange.rejectedInstrumentCount).toBe(1);
      expect(exchange.rejectionReasons.unsupportedContractType).toBe(1);
    },
  );
});
