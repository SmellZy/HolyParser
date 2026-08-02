import { describe, expect, it, vi } from "vitest";
import { BinanceUsdmPublicAdapter } from "./adapter.js";
import { BinanceUsdmBookSession } from "./book-session.js";
import { BinanceUsdmSchemaError } from "./errors.js";
import { BinanceUsdmPublicRestClient } from "./rest.js";
import {
  bindings,
  fixture,
  testAssetResolver,
  testFreshness,
  testTimestampSequence,
} from "./test-helpers.js";

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200 });
}

function makeAdapter(symbol = "BTCUSDT") {
  const rest = fixture<Record<string, unknown>>("public-rest.json");
  const exchange = fixture<Record<string, unknown>>("exchange-info.json");
  const binding = bindings().find((row) => row.wire.symbol === symbol)!;
  const client = new BinanceUsdmPublicRestClient({
    fetch: vi.fn<typeof fetch>(async (input) => {
      const path = new URL(input.toString()).pathname;
      const values: Record<string, unknown> = {
        "/fapi/v1/exchangeInfo": exchange,
        "/fapi/v2/ticker/price": rest.lastPrice,
        "/fapi/v1/ticker/bookTicker": rest.bookTicker,
        "/fapi/v1/premiumIndex": rest.premiumIndex,
        "/fapi/v1/fundingRate": rest.fundingHistory,
        "/fapi/v1/fundingInfo": rest.fundingInfo,
        "/fapi/v1/depth": rest.depth,
      };
      return response(values[path]);
    }),
  });
  const session = new BinanceUsdmBookSession({
    binding,
    freshness: testFreshness("depth"),
  });
  const adapter = new BinanceUsdmPublicAdapter({
    restClient: client,
    assetResolver: testAssetResolver,
    binding,
    bookSession: session,
    timestampNow: testTimestampSequence(),
    freshness: {
      ticker: testFreshness("rest:ticker"),
      premiumIndex: testFreshness("rest:premium-index"),
      funding: testFreshness("rest:funding"),
      restDepth: testFreshness("rest:depth"),
    },
  });
  return { adapter, binding, session };
}

describe("Binance USD-M public adapter ports", () => {
  it("exposes concrete ports only for supported capabilities", () => {
    const { adapter } = makeAdapter();
    expect(adapter.ports.INSTRUMENT_METADATA).toBeDefined();
    expect(adapter.ports.WEBSOCKET_ORDER_BOOK_DELTA).toBeDefined();
    expect(adapter.ports.PREDICTED_FUNDING).toBeUndefined();
    expect(adapter.ports.WEBSOCKET_ORDER_BOOK_SNAPSHOT).toBeUndefined();
    expect(adapter.ports.CHECKSUM_VALIDATION).toBeUndefined();
  });

  it("maps metadata, all price semantics, funding and depth through common contracts", async () => {
    const { adapter } = makeAdapter();
    expect(await adapter.listInstruments()).toHaveLength(3);
    expect((await adapter.readTicker()).map((row) => row.kind)).toEqual([
      "LAST_PRICE",
      "BID_PRICE",
      "ASK_PRICE",
    ]);
    expect((await adapter.readPremiumPrices()).map((row) => row.kind)).toEqual([
      "MARK_PRICE",
      "INDEX_PRICE",
    ]);
    expect((await adapter.readLatestFunding())[0]?.semantic).toBe("LAST");
    expect(await adapter.readFundingHistory()).toHaveLength(1);
    expect((await adapter.readRestDepth()).updateId).toBe(100n);
  });

  it("rejects funding reads for delivery Futures", async () => {
    const { adapter } = makeAdapter("BTCUSDT_260925");
    await expect(adapter.readLatestFunding()).rejects.toThrowError(
      BinanceUsdmSchemaError,
    );
    await expect(adapter.readFundingHistory()).rejects.toThrowError(
      BinanceUsdmSchemaError,
    );
  });
});
