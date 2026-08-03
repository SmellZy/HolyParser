import { describe, expect, it } from "vitest";
import {
  BybitLinearAdapterError,
  BybitLinearRateLimitError,
  BybitLinearSchemaError,
} from "./errors.js";
import { BybitPublicRateLimiter } from "./rate-limit.js";
import { BybitLinearPublicRestClient } from "./rest.js";
import { envelope } from "./test-helpers.js";

function jsonResponse(
  value: unknown,
  init: ResponseInit = {},
  url = "https://api.bybit.com/v5/market/time",
): Response {
  const response = new Response(JSON.stringify(value), {
    status: 200,
    ...init,
  });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

describe("Bybit fixed public REST boundary", () => {
  it("enforces category=linear and fixed path", async () => {
    let observed = "";
    const client = new BybitLinearPublicRestClient({
      fetch: async (input) => {
        observed = String(input);
        return jsonResponse(
          envelope({ category: "linear", list: [], nextPageCursor: "" }),
          {},
          observed,
        );
      },
    });
    await client.instruments();
    expect(observed).toBe(
      "https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000",
    );
  });
  it("encodes opaque symbols as query values", async () => {
    let observed = "";
    const client = new BybitLinearPublicRestClient({
      fetch: async (input) => {
        observed = String(input);
        return jsonResponse(
          envelope({ category: "linear", list: [] }),
          {},
          observed,
        );
      },
    });
    await client.tickers("BTC-USDT");
    expect(observed).toContain("symbol=BTC-USDT");
  });
  it("rejects redirects that escape the allowlist", async () => {
    const client = new BybitLinearPublicRestClient({
      fetch: async () =>
        jsonResponse(envelope({}), {}, "https://evil.example/v5/market/time"),
    });
    await expect(client.serverTime()).rejects.toBeInstanceOf(
      BybitLinearAdapterError,
    );
  });
  it("bounds streaming response bodies without Content-Length", async () => {
    const client = new BybitLinearPublicRestClient({
      maximumResponseBytes: 16,
      fetch: async (input) =>
        jsonResponse({ payload: "x".repeat(100) }, {}, String(input)),
    });
    await expect(client.serverTime()).rejects.toBeInstanceOf(
      BybitLinearSchemaError,
    );
  });
  it("treats HTTP 403 as a distinct public rate/region failure", async () => {
    const client = new BybitLinearPublicRestClient({
      fetch: async (input) => jsonResponse({}, { status: 403 }, String(input)),
    });
    await expect(client.serverTime()).rejects.toBeInstanceOf(
      BybitLinearRateLimitError,
    );
  });
  it("treats HTTP 429 as distinct frequency protection", async () => {
    const client = new BybitLinearPublicRestClient({
      fetch: async (input) => jsonResponse({}, { status: 429 }, String(input)),
    });
    await expect(client.serverTime()).rejects.toBeInstanceOf(
      BybitLinearRateLimitError,
    );
  });
  it("does not retry a failed request", async () => {
    let calls = 0;
    const client = new BybitLinearPublicRestClient({
      fetch: async (input) => {
        calls += 1;
        return jsonResponse({}, { status: 500 }, String(input));
      },
    });
    await expect(client.serverTime()).rejects.toBeInstanceOf(
      BybitLinearAdapterError,
    );
    expect(calls).toBe(1);
  });
  it("does not dispatch when the caller signal is already aborted", async () => {
    let calls = 0;
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    const client = new BybitLinearPublicRestClient({
      fetch: async () => {
        calls += 1;
        return jsonResponse({});
      },
    });
    await expect(client.serverTime(controller.signal)).rejects.toMatchObject({
      kind: "TRANSPORT",
    });
    expect(calls).toBe(0);
  });
  it("enforces process-local request budgets without underflow", () => {
    const limiter = new BybitPublicRateLimiter(() => 1000, 2, 5000);
    limiter.acquire();
    limiter.acquire();
    expect(limiter.remaining()).toBe(0);
    expect(() => limiter.acquire()).toThrow(BybitLinearRateLimitError);
  });
  it("validates consistent server second and nanosecond fields", async () => {
    let clock = 1700000000000;
    const client = new BybitLinearPublicRestClient({
      now: () => clock++,
      fetch: async (input) =>
        jsonResponse(
          envelope({
            timeSecond: "1700000000",
            timeNano: "1700000000000000000",
          }),
          {},
          String(input),
        ),
    });
    const result = await client.serverTime();
    expect(result.serverEpochMilliseconds).toBe("1700000000000");
    expect(result.quality).toBe("HEALTHY");
  });
  it("degrades server-time quality on excessive RTT without rewriting timestamps", async () => {
    const values = [1700000000000, 1700000003000];
    const client = new BybitLinearPublicRestClient({
      maximumHealthyRttMs: 100,
      now: () => values.shift() ?? 1700000003000,
      fetch: async (input) =>
        jsonResponse(
          envelope({
            timeSecond: "1700000000",
            timeNano: "1700000000000000000",
          }),
          {},
          String(input),
        ),
    });
    const result = await client.serverTime();
    expect(result.quality).toBe("DEGRADED");
    expect(result.serverEpochMilliseconds).toBe("1700000000000");
  });
});
