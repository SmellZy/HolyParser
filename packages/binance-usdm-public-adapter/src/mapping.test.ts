import { describe, expect, it } from "vitest";
import {
  deriveNormalizedFundingRate8hV1,
  type InstrumentMetadataObservation,
} from "@arbitrage/market-data";
import { BinanceUsdmSchemaError } from "./errors.js";
import {
  mapBookTicker,
  mapFundingHistory,
  mapLatestFunding,
  mapPremiumPrices,
} from "./mapping.js";
import { bindings, fixture, testFreshness, testTimes } from "./test-helpers.js";
import {
  parseBookTickers,
  parseFundingHistory,
  parseFundingInfo,
  parsePremiumIndexes,
} from "./wire.js";

describe("Binance USD-M canonical mappings", () => {
  const rest = fixture<Record<string, unknown>>("public-rest.json");
  const allBindings = bindings();
  const btc = allBindings.find((binding) => binding.wire.symbol === "BTCUSDT")!;
  const usdc = allBindings.find(
    (binding) => binding.wire.symbol === "ETHUSDC",
  )!;
  const delivery = allBindings.find(
    (binding) => binding.wire.symbol === "BTCUSDT_260925",
  )!;

  it("keeps opaque official ID, pair and canonical identity separate", () => {
    expect(btc.metadata.officialInstrumentId).toBe("BTCUSDT");
    expect(btc.displayPair).toBe("BTCUSDT");
    expect(btc.instrumentId).toContain("BTCUSDT");
  });

  it("keeps USDT and USDC settlement identities distinct", () => {
    expect(btc.metadata.settlementAsset).not.toBe(
      usdc.metadata.settlementAsset,
    );
    expect(btc.instrumentId).not.toBe(usdc.instrumentId);
  });

  it("maps explicit filters and leaves multiplier/classification unresolved", () => {
    const metadata: InstrumentMetadataObservation = btc.metadata;
    expect(
      metadata.tickSize.state === "KNOWN" && metadata.tickSize.value.toString(),
    ).toBe("0.1");
    expect(
      metadata.quantityStep.state === "KNOWN" &&
        metadata.quantityStep.value.toString(),
    ).toBe("0.001");
    expect(metadata.contractMultiplier.state).toBe("UNVERIFIED");
    expect(metadata.contractValueConvention.state).toBe("RESEARCH_REQUIRED");
    expect(metadata.minimumNotional.state).toBe("KNOWN");
  });

  it("keeps last, bid, ask, mark and index semantically separate", () => {
    const book = mapBookTicker(
      parseBookTickers(rest.bookTicker)[0]!,
      btc,
      testTimes,
      testFreshness("rest:ticker"),
    );
    const premium = mapPremiumPrices(
      parsePremiumIndexes(rest.premiumIndex)[0]!,
      btc,
      testTimes,
      testFreshness("rest:premium-index"),
    );
    expect(book.map((observation) => observation.kind)).toEqual([
      "BID_PRICE",
      "ASK_PRICE",
    ]);
    expect(premium.map((observation) => observation.kind)).toEqual([
      "MARK_PRICE",
      "INDEX_PRICE",
    ]);
  });

  it("marks locked/crossed book-ticker prices stale", () => {
    const rows = parseBookTickers({
      symbol: "BTCUSDT",
      bidPrice: "2",
      bidQty: "1",
      askPrice: "2",
      askQty: "1",
      time: 1785628800100,
    });
    expect(
      mapBookTicker(rows[0]!, btc, testTimes, testFreshness("rest:ticker"))[0]
        ?.context.quality,
    ).toBe("STALE");
  });

  it("preserves Latest funding as LAST and derives only documented adjusted interval", () => {
    const funding = mapLatestFunding(
      parsePremiumIndexes(rest.premiumIndex)[0]!,
      btc,
      parseFundingInfo(rest.fundingInfo)[0],
      testTimes,
      testFreshness("rest:funding"),
    );
    expect(funding.semantic).toBe("LAST");
    expect(funding.interval.state === "KNOWN" && funding.interval.value).toBe(
      14_400n,
    );
    const normalized = deriveNormalizedFundingRate8hV1(funding, 12, "EXACT");
    expect(
      normalized.state === "KNOWN" && normalized.value.rate.toString(),
    ).toBe("0.0002");
  });

  it("keeps an absent fundingInfo row unknown rather than assuming eight hours", () => {
    const funding = mapLatestFunding(
      parsePremiumIndexes(rest.premiumIndex)[0]!,
      btc,
      undefined,
      testTimes,
      testFreshness("rest:funding"),
    );
    expect(funding.interval.state).toBe("UNKNOWN");
  });

  it("maps historical funding independently and rejects delivery-Futures funding", () => {
    const history = mapFundingHistory(
      parseFundingHistory(rest.fundingHistory)[0]!,
      btc,
      parseFundingInfo(rest.fundingInfo)[0],
      testTimes,
      testFreshness("rest:funding"),
    );
    expect(history.semantic).toBe("LAST");
    expect(() =>
      mapLatestFunding(
        parsePremiumIndexes(rest.premiumIndex)[0]!,
        delivery,
        undefined,
        testTimes,
        testFreshness("rest:funding"),
      ),
    ).toThrowError(BinanceUsdmSchemaError);
  });

  it("fails closed rather than conflating Special funding-history rows", () => {
    const [special] = parseFundingHistory([
      {
        ...(rest.fundingHistory as ReadonlyArray<Record<string, unknown>>)[0]!,
        rateType: "Special",
      },
    ]);
    expect(() =>
      mapFundingHistory(
        special!,
        btc,
        parseFundingInfo(rest.fundingInfo)[0],
        testTimes,
        testFreshness("rest:funding"),
      ),
    ).toThrowError(BinanceUsdmSchemaError);
  });
});
