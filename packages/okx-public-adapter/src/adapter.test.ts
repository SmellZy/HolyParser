import { timestamp, validateAdapterCapabilities } from "@arbitrage/market-data";
import { describe, expect, it, vi } from "vitest";
import { OkxPublicAdapter } from "./adapter.js";
import { OkxBookSession } from "./book-session.js";
import { okxPublicCapabilities } from "./capabilities.js";
import { OkxPublicRestClient } from "./rest.js";
import { binding, fixture, freshness, resolver } from "./test-helpers.js";
import { RecordingOkxMetricSink, okxMetricLabels } from "./observability.js";

describe("OKX common adapter boundary", () => {
  function adapter(metricSink?: RecordingOkxMetricSink): OkxPublicAdapter {
    const restFixture = fixture<Record<string, unknown>>("public-rest.json");
    const request = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      const body = url.pathname.endsWith("/tickers")
        ? restFixture.ticker
        : url.pathname.endsWith("/mark-price")
          ? restFixture.mark
          : url.pathname.endsWith("/index-tickers")
            ? restFixture.index
            : url.pathname.endsWith("/funding-rate")
              ? restFixture.funding
              : url.pathname.endsWith("/books")
                ? restFixture.book
                : restFixture.instruments;
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const instrument = binding();
    return new OkxPublicAdapter({
      restClient: new OkxPublicRestClient({ fetch: request }),
      assetResolver: resolver(),
      binding: instrument,
      bookSession: new OkxBookSession({
        binding: instrument,
        freshness: freshness("books"),
      }),
      timestampNow: () => timestamp("2026-07-26T12:00:00.000Z"),
      metricSink,
      freshness: {
        ticker: freshness("rest:ticker"),
        markPrice: freshness("rest:mark-price"),
        indexPrice: freshness("rest:index-price"),
        fundingRate: freshness("rest:funding-rate"),
        restOrderBook: freshness("rest:books"),
      },
    });
  }

  it("declares verified capabilities and no fake checksum port", () => {
    const value = adapter();
    expect(() => validateAdapterCapabilities(value)).not.toThrow();
    expect(okxPublicCapabilities.CHECKSUM_VALIDATION.state).toBe("UNSUPPORTED");
    expect(value.ports.CHECKSUM_VALIDATION).toBeUndefined();
  });

  it("maps live public ticker, mark, index, funding and REST book data", async () => {
    const metricSink = new RecordingOkxMetricSink();
    const value = adapter(metricSink);
    expect((await value.readTicker()).map((item) => item.kind)).toEqual([
      "LAST_PRICE",
      "BID_PRICE",
      "ASK_PRICE",
    ]);
    expect((await value.readMarkPrice())[0]?.kind).toBe("MARK_PRICE");
    expect((await value.readIndexPrice())[0]?.kind).toBe("INDEX_PRICE");
    expect((await value.readFunding()).map((item) => item.semantic)).toEqual([
      "PREDICTED",
      "LAST",
    ]);
    expect((await value.readRestBookSnapshot()).updateId).toBe(100n);
    expect(
      metricSink.observed(
        "market_data_last_successful_observation_timestamp",
        okxMetricLabels("TICKER"),
      ),
    ).toEqual([1_785_067_200n]);
    expect(
      metricSink.observed(
        "market_data_receive_lag_milliseconds",
        okxMetricLabels("REST_ORDER_BOOK_SNAPSHOT"),
      ),
    ).toEqual([43_199_860n]);
  });
});
