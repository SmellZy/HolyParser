import { describe, expect, it } from "vitest";
import {
  mapFundingHistory,
  mapInstrument,
  mapRestBook,
  mapTicker,
} from "./mapping.js";
import {
  binding,
  deliveryFuture,
  freshness,
  resolver,
  times,
  usdcPerpetual,
  usdtPerpetual,
} from "./test-helpers.js";

describe("Bybit linear canonical mappings", () => {
  it("keeps USDT and USDC canonical identities distinct", () =>
    expect(mapInstrument(usdtPerpetual, resolver, times).instrumentId).not.toBe(
      mapInstrument(usdcPerpetual, resolver, times).instrumentId,
    ));
  it("uses official asset fields without parsing symbol text", () => {
    const mapped = mapInstrument(
      {
        ...usdtPerpetual,
        symbol: "OPAQUE",
        baseCoin: "BTC",
        quoteCoin: "USDT",
        settleCoin: "USDC",
      },
      resolver,
      times,
    );
    expect(mapped.metadata.settlementAsset).toBe("asset:USDC");
    expect(mapped.metadata.officialInstrumentId).toBe("OPAQUE");
  });
  it("maps tick, step, minimum and notional from explicit fields", () => {
    const metadata = binding().metadata;
    expect(metadata.tickSize.state).toBe("KNOWN");
    expect(metadata.quantityStep.state).toBe("KNOWN");
    expect(metadata.minimumQuantity.state).toBe("KNOWN");
    expect(metadata.minimumNotional.state).toBe("KNOWN");
  });
  it("does not infer a contract multiplier", () =>
    expect(binding().metadata.contractMultiplier.state).toBe("UNVERIFIED"));
  it("does not expose funding on delivery Futures", () => {
    const mapped = binding(deliveryFuture);
    expect(mapped.supportsFunding).toBe(false);
    expect(mapped.metadata.fundingCapabilities.state).toBe("UNSUPPORTED");
  });
  it("maps last/bid/ask/mark/index separately", () => {
    const result = mapTicker(
      {
        symbol: "BTCUSDT",
        lastPrice: "100.1",
        bid1Price: "100",
        ask1Price: "100.2",
        markPrice: "100.05",
        indexPrice: "100.04",
        responseTime: "1700000000000",
      },
      binding(),
      times,
      freshness,
    );
    expect(result.prices.map((value) => value.kind)).toEqual([
      "LAST_PRICE",
      "BID_PRICE",
      "ASK_PRICE",
      "MARK_PRICE",
      "INDEX_PRICE",
    ]);
  });
  it("makes locked ticker observations stale", () => {
    const result = mapTicker(
      {
        symbol: "BTCUSDT",
        lastPrice: "100",
        bid1Price: "100",
        ask1Price: "100",
        markPrice: "100",
        indexPrice: "100",
        responseTime: "1700000000000",
      },
      binding(),
      times,
      freshness,
    );
    expect(
      result.prices.every((value) => value.context.quality === "STALE"),
    ).toBe(true);
  });
  it("preserves current funding and explicit interval independently", () => {
    const result = mapTicker(
      {
        symbol: "BTCUSDT",
        lastPrice: "100",
        bid1Price: "99",
        ask1Price: "101",
        markPrice: "100",
        indexPrice: "100",
        fundingRate: "0",
        nextFundingTime: "1700028800000",
        fundingIntervalHour: "8",
        responseTime: "1700000000000",
      },
      binding(),
      times,
      freshness,
    );
    expect(result.funding?.semantic).toBe("CURRENT");
    expect(result.funding?.venueNativeRate.state).toBe("KNOWN");
    expect(
      result.funding?.interval.state === "KNOWN"
        ? result.funding.interval.value
        : 0n,
    ).toBe(28800n);
  });
  it("preserves an omitted perpetual funding rate as explicit unknown", () => {
    const result = mapTicker(
      {
        symbol: "BTCUSDT",
        lastPrice: "100",
        bid1Price: "99",
        ask1Price: "101",
        markPrice: "100",
        indexPrice: "100",
        responseTime: "1700000000000",
      },
      binding(),
      times,
      freshness,
    );
    expect(result.funding?.semantic).toBe("UNKNOWN");
    expect(result.funding?.venueNativeRate.state).toBe("UNKNOWN");
  });
  it("labels history as last, never predicted", () =>
    expect(
      mapFundingHistory(
        {
          symbol: "BTCUSDT",
          fundingRate: "0.0001",
          fundingRateTimestamp: "1700000000000",
          responseTime: "1700000000000",
        },
        binding(),
        times,
      ).semantic,
    ).toBe("LAST"));
  it("maps exact bigint-safe REST snapshot IDs", () => {
    const book = mapRestBook(
      {
        symbol: "BTCUSDT",
        bids: [["100", "1"]],
        asks: [["101", "1"]],
        timestamp: "1700000000000",
        updateId: "90071992547409931234",
        sequence: "90071992547409931235",
        matchingTimestamp: "1700000000000",
      },
      binding(),
      times,
      freshness,
    );
    expect(book.updateId).toBe(90071992547409931234n);
  });
  it("sorts REST sides and rejects duplicate prices", () => {
    const mapped = mapRestBook(
      {
        symbol: "BTCUSDT",
        bids: [
          ["99", "1"],
          ["100", "1"],
        ],
        asks: [
          ["102", "1"],
          ["101", "1"],
        ],
        timestamp: "1700000000000",
        updateId: "1",
        sequence: "1",
        matchingTimestamp: "1700000000000",
      },
      binding(),
      times,
      freshness,
    );
    expect(mapped.bids.map((level) => level.price.toString())).toEqual([
      "100",
      "99",
    ]);
    expect(mapped.asks.map((level) => level.price.toString())).toEqual([
      "101",
      "102",
    ]);
    expect(() =>
      mapRestBook(
        {
          symbol: "BTCUSDT",
          bids: [
            ["100", "1"],
            ["100", "2"],
          ],
          asks: [["101", "1"]],
          timestamp: "1700000000000",
          updateId: "1",
          sequence: "1",
          matchingTimestamp: "1700000000000",
        },
        binding(),
        times,
        freshness,
      ),
    ).toThrow();
  });
  it("rejects locked or crossed REST books", () => {
    expect(() =>
      mapRestBook(
        {
          symbol: "BTCUSDT",
          bids: [["101", "1"]],
          asks: [["100", "1"]],
          timestamp: "1700000000000",
          updateId: "1",
          sequence: "1",
          matchingTimestamp: "1700000000000",
        },
        binding(),
        times,
        freshness,
      ),
    ).toThrow();
  });
});
