import { describe, expect, it, vi } from "vitest";
import {
  BinanceUsdmAdapterError,
  BinanceUsdmRateLimitError,
  BinanceUsdmSchemaError,
} from "./errors.js";
import { WeightedSlidingWindowRateLimiter } from "./rate-limit.js";
import { RecordingBinanceUsdmEventSink } from "./observability.js";
import { BinanceUsdmPublicRestClient } from "./rest.js";
import { fixture } from "./test-helpers.js";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Binance USD-M bounded REST client", () => {
  const restFixture = fixture<Record<string, unknown>>("public-rest.json");

  it("uses only the fixed HTTPS origin and allowlisted endpoint paths", async () => {
    const request = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(input.toString());
      expect(url.origin).toBe("https://fapi.binance.com");
      expect(url.pathname).toBe("/fapi/v1/depth");
      expect(url.searchParams.get("symbol")).toBe("BTCUSDT");
      expect(url.searchParams.get("limit")).toBe("5");
      expect(init?.redirect).toBe("error");
      return jsonResponse(restFixture.depth);
    });
    const client = new BinanceUsdmPublicRestClient({ fetch: request });
    expect((await client.depth("BTCUSDT", 5)).lastUpdateId).toBe("100");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects user-controlled symbols and unsupported depth limits before networking", async () => {
    const request = vi.fn<typeof fetch>();
    const client = new BinanceUsdmPublicRestClient({ fetch: request });
    expect(() =>
      client.depth("BTCUSDT?redirect=https://evil.invalid", 5),
    ).toThrowError(BinanceUsdmSchemaError);
    expect(() => client.depth("BTCUSDT", 7 as never)).toThrowError(
      BinanceUsdmSchemaError,
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects redirects even when an injected transport returns one", async () => {
    const redirected = jsonResponse(restFixture.serverTime);
    Object.defineProperty(redirected, "redirected", { value: true });
    const client = new BinanceUsdmPublicRestClient({
      fetch: vi.fn<typeof fetch>(async () => redirected),
    });
    await expect(client.serverTime()).rejects.toThrowError(
      BinanceUsdmAdapterError,
    );
  });

  it("bounds chunked response bodies while streaming", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("12345"));
        controller.enqueue(new TextEncoder().encode("67890"));
        controller.close();
      },
    });
    const client = new BinanceUsdmPublicRestClient({
      maximumResponseBytes: 8,
      fetch: vi.fn<typeof fetch>(async () => new Response(stream)),
    });
    await expect(client.exchangeInfo()).rejects.toThrowError(
      BinanceUsdmSchemaError,
    );
  });

  it("emits a finite degraded event when undocumented instrument types are quarantined", async () => {
    const exchange = fixture<Record<string, unknown>>("exchange-info.json");
    const first = (
      exchange.symbols as ReadonlyArray<Record<string, unknown>>
    )[0]!;
    const eventSink = new RecordingBinanceUsdmEventSink();
    const client = new BinanceUsdmPublicRestClient({
      eventSink,
      fetch: vi.fn<typeof fetch>(async () =>
        jsonResponse({
          ...exchange,
          symbols: [first, { ...first, contractType: "UNVERIFIED_PRODUCT" }],
        }),
      ),
    });
    expect((await client.exchangeInfo()).rejectedInstrumentCount).toBe(1);
    expect(eventSink.events).toContainEqual(
      expect.objectContaining({
        type: "BINANCE_USDM_PRODUCT_REJECTED",
        capability: "INSTRUMENT_METADATA",
        state: "DEGRADED",
        reasonCode: "PRODUCT_FAMILY",
      }),
    );
  });

  it.each([429, 418] as const)(
    "handles HTTP %s distinctly without retry",
    async (status) => {
      const request = vi.fn<typeof fetch>(async () =>
        jsonResponse({ code: -1003, msg: "rate limited" }, status),
      );
      const client = new BinanceUsdmPublicRestClient({ fetch: request });
      await expect(client.serverTime()).rejects.toMatchObject({
        status,
        name: "BinanceUsdmRateLimitError",
      });
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it("does not automatically retry business or 5xx errors", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      jsonResponse({ code: -1000, msg: "Internal error" }, 500),
    );
    const client = new BinanceUsdmPublicRestClient({ fetch: request });
    await expect(client.exchangeInfo()).rejects.toThrowError(
      BinanceUsdmAdapterError,
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("measures server clock RTT/offset without changing financial timestamps", async () => {
    const values = [1_785_628_800_000, 1_785_628_800_100];
    const client = new BinanceUsdmPublicRestClient({
      fetch: vi.fn<typeof fetch>(async () =>
        jsonResponse(restFixture.serverTime),
      ),
      now: () => values.shift()!,
      maximumHealthyRttMs: 200,
    });
    const observation = await client.serverTime();
    expect(observation.roundTripMilliseconds).toBe(100n);
    expect(observation.clockOffsetMilliseconds).toBe(-50n);
    expect(observation.quality).toBe("HEALTHY");
    expect(observation.serverEpochMilliseconds).toBe("1785628800000");
  });

  it("degrades server-time quality when RTT is unreliable", async () => {
    const values = [1_785_628_800_000, 1_785_628_803_000];
    const client = new BinanceUsdmPublicRestClient({
      fetch: vi.fn<typeof fetch>(async () =>
        jsonResponse(restFixture.serverTime),
      ),
      now: () => values.shift()!,
      maximumHealthyRttMs: 1_000,
    });
    expect((await client.serverTime()).quality).toBe("DEGRADED");
    expect(client.serverTimeQuality()).toBe("DEGRADED");
  });

  it("supports external cancellation and deterministic cleanup", async () => {
    const request = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            {
              once: true,
            },
          );
        }),
    );
    const controller = new AbortController();
    const client = new BinanceUsdmPublicRestClient({ fetch: request });
    const pending = client.exchangeInfo(controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrowError(BinanceUsdmAdapterError);
  });

  it("enforces weighted local request budgets without underflow", async () => {
    const limiter = new WeightedSlidingWindowRateLimiter(() => 1_000);
    limiter.acquire("test", 20, { weight: 20, windowMs: 60_000 });
    expect(() =>
      limiter.acquire("test", 1, { weight: 20, windowMs: 60_000 }),
    ).toThrowError(BinanceUsdmRateLimitError);
    expect(() =>
      limiter.acquire("test", Number.MAX_SAFE_INTEGER, {
        weight: 1,
        windowMs: 60_000,
      }),
    ).toThrowError(BinanceUsdmRateLimitError);
  });

  it("uses only the documented shared budget for funding history", async () => {
    const rateLimiter = new WeightedSlidingWindowRateLimiter();
    const acquire = vi.spyOn(rateLimiter, "acquire");
    const client = new BinanceUsdmPublicRestClient({
      rateLimiter,
      fetch: vi.fn<typeof fetch>(async () =>
        jsonResponse(restFixture.fundingHistory),
      ),
    });
    await client.fundingHistory("BTCUSDT");
    expect(acquire).not.toHaveBeenCalled();
  });

  it("parses all approved public endpoint responses", async () => {
    const responses = new Map<string, unknown>([
      ["/fapi/v2/ticker/price", restFixture.lastPrice],
      ["/fapi/v1/ticker/bookTicker", restFixture.bookTicker],
      ["/fapi/v1/premiumIndex", restFixture.premiumIndex],
      ["/fapi/v1/fundingRate", restFixture.fundingHistory],
      ["/fapi/v1/fundingInfo", restFixture.fundingInfo],
    ]);
    const client = new BinanceUsdmPublicRestClient({
      fetch: vi.fn<typeof fetch>(async (input) => {
        const url = new URL(input.toString());
        return jsonResponse(responses.get(url.pathname));
      }),
    });
    expect(await client.lastPrice("BTCUSDT")).toHaveLength(1);
    expect(await client.bookTicker("BTCUSDT")).toHaveLength(1);
    expect(await client.premiumIndex("BTCUSDT")).toHaveLength(1);
    expect(await client.fundingHistory("BTCUSDT")).toHaveLength(1);
    expect(await client.fundingInfo()).toHaveLength(1);
  });
});
