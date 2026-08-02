import { describe, expect, it } from "vitest";
import {
  deriveNormalizedFundingRate8hV1,
  timestamp,
} from "@arbitrage/market-data";
import { OkxSchemaError } from "./errors.js";
import {
  mapFundingRate,
  mapIndexPrice,
  mapInstrument,
  mapRestBookSnapshot,
  mapTicker,
} from "./mapping.js";
import {
  binding,
  bindings,
  freshness,
  fixedTimes,
  fixture,
  resolver,
} from "./test-helpers.js";
import {
  parseFundingRates,
  parseIndexTickers,
  parseInstruments,
  parseRestBooks,
  parseTickers,
} from "./wire.js";

describe("OKX canonical mappings", () => {
  const rest = fixture<Record<string, unknown>>("public-rest.json");
  const malformed = fixture<Record<string, string>>("malformed.json");

  it("keeps USDT and USDC instruments distinct", () => {
    const [usdt, usdc] = bindings();
    expect(usdt?.metadata.settlementAsset).not.toBe(
      usdc?.metadata.settlementAsset,
    );
    expect(usdt?.instrumentId).not.toBe(usdc?.instrumentId);
    expect(usdt?.metadata.quoteAsset).not.toBe(usdc?.metadata.quoteAsset);
  });

  it("derives derivative asset roles from ctType, ctValCcy and settleCcy only", () => {
    const mapped = binding();
    expect(mapped.metadata.baseAsset).toBe("asset:alpha");
    expect(mapped.metadata.quoteAsset).toBe("asset:usdt");
    expect(mapped.metadata.settlementAsset).toBe("asset:usdt");

    const wire = parseInstruments(rest.instruments).data[0];
    expect(wire).toBeDefined();
    expect(() =>
      mapInstrument({ ...wire!, baseCcy: "ALPHA" }, resolver(), fixedTimes),
    ).toThrow(/must not be used/);
    expect(() =>
      mapInstrument({ ...wire!, ctMult: "2" }, resolver(), fixedTimes),
    ).toThrow(/ctMult is not 1/);
    expect(() =>
      mapInstrument({ ...wire!, ctMult: "" }, resolver(), fixedTimes),
    ).not.toThrow();
  });

  it("keeps last, bid, ask and index semantics separate", () => {
    const ticker = mapTicker(
      parseTickers(rest.ticker).data[0]!,
      binding(),
      fixedTimes,
      freshness("rest:ticker"),
    );
    expect(ticker.map((item) => item.kind)).toEqual([
      "LAST_PRICE",
      "BID_PRICE",
      "ASK_PRICE",
    ]);
    expect(
      mapIndexPrice(
        parseIndexTickers(rest.index).data[0]!,
        binding(),
        fixedTimes,
        freshness("rest:index-price"),
      ).kind,
    ).toBe("INDEX_PRICE");
  });

  it("stores predicted and last funding separately with a documented 4-hour interval", () => {
    const observations = mapFundingRate(
      parseFundingRates(rest.funding).data[0]!,
      binding(),
      fixedTimes,
      freshness("rest:funding-rate"),
    );
    expect(observations.map((item) => item.semantic)).toEqual([
      "PREDICTED",
      "LAST",
    ]);
    expect(observations[0]?.interval).toMatchObject({
      state: "KNOWN",
      value: 14_400n,
    });
    expect(observations[0]?.nextSettlementTime).toMatchObject({
      state: "KNOWN",
      value: timestamp("2026-07-26T01:00:00.000Z"),
    });
    const normalized = deriveNormalizedFundingRate8hV1(
      observations[0]!,
      8,
      "EXACT",
    );
    expect(normalized.state).toBe("KNOWN");
    if (normalized.state === "KNOWN") {
      expect(normalized.value.rate.toString()).toBe("0.00024");
      expect(normalized.value.sourceSemantic).toBe("PREDICTED");
    }
  });

  it("rejects an index row for a different official underlying", () => {
    const row = parseIndexTickers(rest.index).data[0]!;
    expect(() =>
      mapIndexPrice(
        { ...row, instId: "BETA-USDT" },
        binding(),
        fixedTimes,
        freshness("rest:index-price"),
      ),
    ).toThrow(OkxSchemaError);
  });

  it("marks locked ticker and stale source timestamps non-healthy", () => {
    const ticker = parseTickers(rest.ticker).data[0]!;
    const locked = mapTicker(
      { ...ticker, askPx: ticker.bidPx },
      binding(),
      fixedTimes,
      freshness("rest:ticker"),
    );
    expect(locked.every((item) => item.context.quality === "STALE")).toBe(true);

    const stale = mapTicker(
      ticker,
      binding(),
      fixedTimes,
      freshness("rest:ticker", 1_000n, 2_000n, 1_000n),
    );
    expect(stale.every((item) => item.context.quality === "STALE")).toBe(true);
  });

  it("validates and sorts REST snapshots before exposing book quality", () => {
    const row = parseRestBooks(rest.book).data[0]!;
    const sorted = mapRestBookSnapshot(
      {
        ...row,
        bids: [
          ["10.20", "1", "0", "1"],
          ["10.24", "1", "0", "1"],
        ],
        asks: [
          ["10.30", "1", "0", "1"],
          ["10.26", "1", "0", "1"],
        ],
      },
      binding(),
      fixedTimes,
      freshness("rest:books"),
    );
    expect(sorted.bids.map((level) => level.price.toString())).toEqual([
      "10.24",
      "10.2",
    ]);
    expect(sorted.asks.map((level) => level.price.toString())).toEqual([
      "10.26",
      "10.3",
    ]);

    expect(() =>
      mapRestBookSnapshot(
        {
          ...row,
          bids: [
            ["10.24", "1", "0", "1"],
            ["10.24", "2", "0", "1"],
          ],
        },
        binding(),
        fixedTimes,
        freshness("rest:books"),
      ),
    ).toThrow(/duplicate/);
    expect(() =>
      mapRestBookSnapshot(
        { ...row, bids: [["10.24", "0", "0", "1"]] },
        binding(),
        fixedTimes,
        freshness("rest:books"),
      ),
    ).toThrow(/zero-quantity/);

    const crossed = mapRestBookSnapshot(
      { ...row, bids: [["10.27", "1", "0", "1"]] },
      binding(),
      fixedTimes,
      freshness("rest:books"),
    );
    expect(crossed.context.quality).toBe("STALE");
  });

  it("rejects a claimed next-period funding rate under current_period", () => {
    const row = parseFundingRates(rest.funding).data[0]!;
    expect(() =>
      mapFundingRate(
        { ...row, nextFundingRate: "0.0002" },
        binding(),
        fixedTimes,
        freshness("rest:funding-rate"),
      ),
    ).toThrow(/nextFundingRate/);
  });

  it("rejects malformed, excessive-scale and overflowing decimal wires", () => {
    const ticker = parseTickers(rest.ticker).data[0]!;
    for (const invalid of [
      malformed.scientificPrice!,
      `0.${"1".repeat(37)}`,
      "9".repeat(79),
    ]) {
      expect(() =>
        mapTicker(
          { ...ticker, last: invalid },
          binding(),
          fixedTimes,
          freshness("rest:ticker"),
        ),
      ).toThrow();
    }
  });
});
