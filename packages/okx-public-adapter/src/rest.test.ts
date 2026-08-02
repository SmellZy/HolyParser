import { timestamp } from "@arbitrage/market-data";
import { describe, expect, it, vi } from "vitest";
import { OkxAdapterError, OkxRateLimitError } from "./errors.js";
import {
  RecordingOkxEventSink,
  RecordingOkxMetricSink,
  okxMetricLabels,
} from "./observability.js";
import { OkxPublicRestClient } from "./rest.js";
import { fixture } from "./test-helpers.js";

describe("OKX public REST transport", () => {
  it("uses only allowlisted GET endpoints and validates the response envelope", async () => {
    const restFixture = fixture<Record<string, unknown>>("public-rest.json");
    const calls: Array<{ readonly url: string; readonly init?: RequestInit }> =
      [];
    const request = vi.fn<typeof fetch>(async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(restFixture.instruments), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = new OkxPublicRestClient({ fetch: request });
    const rows = await client.instruments("SWAP");

    expect(rows).toHaveLength(2);
    expect(calls[0]?.url).toBe(
      "https://openapi.okx.com/api/v5/public/instruments?instType=SWAP",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.init?.headers).toEqual({
      accept: "application/json",
    });
  });

  it("does not retry HTTP 429 responses", async () => {
    const request = vi.fn<typeof fetch>(async () => {
      return new Response("{}", {
        status: 429,
        headers: { "retry-after": "2" },
      });
    });
    const client = new OkxPublicRestClient({ fetch: request });
    await expect(client.serverTime()).rejects.toMatchObject({
      name: "OkxRateLimitError",
      retryAfterMs: 2_000,
    } satisfies Partial<OkxRateLimitError>);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized declared responses before reading the body", async () => {
    const request = vi.fn<typeof fetch>(async () => {
      return new Response("{}", {
        status: 200,
        headers: { "content-length": "1001" },
      });
    });
    const client = new OkxPublicRestClient({
      fetch: request,
      maximumResponseBytes: 1_000,
    });
    await expect(client.serverTime()).rejects.toThrow(/byte limit/);
  });

  it("stops reading an oversized chunked response without content-length", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(1_001)));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = vi.fn<typeof fetch>(async () => {
      return new Response(body, { status: 200 });
    });
    const client = new OkxPublicRestClient({
      fetch: request,
      maximumResponseBytes: 1_000,
    });
    await expect(client.serverTime()).rejects.toThrow(/byte limit/);
    expect(cancelled).toBe(true);
  });

  it("rejects arbitrary REST origins", () => {
    expect(
      () =>
        new OkxPublicRestClient({
          origin: "https://example.invalid" as never,
        }),
    ).toThrow(OkxAdapterError);
  });

  it("aborts a bounded request without retry when the timeout expires", async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>(
      async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const client = new OkxPublicRestClient({
      fetch: request,
      timeoutMs: 100,
    });
    const result = client.serverTime();
    const assertion = expect(result).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(request).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("validates server time and measures bounded clock evidence", async () => {
    const request = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ts: "1785024000000" }],
        }),
        { status: 200 },
      );
    });
    const clock = [1_785_024_000_100, 1_785_024_000_140];
    const client = new OkxPublicRestClient({
      fetch: request,
      now: () => clock.shift()!,
    });
    await expect(client.serverTime()).resolves.toMatchObject({
      epochMilliseconds: "1785024000000",
      roundTripMilliseconds: 40n,
      clockOffsetMilliseconds: -120n,
      quality: "HEALTHY",
    });
    expect(client.serverTimeState().quality).toBe("HEALTHY");
  });

  it("fails closed and degrades state for invalid server time", async () => {
    const eventSink = new RecordingOkxEventSink();
    const metricSink = new RecordingOkxMetricSink();
    const request = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ts: "not-an-epoch" }],
        }),
        { status: 200 },
      );
    });
    const client = new OkxPublicRestClient({
      fetch: request,
      eventSink,
      metricSink,
      timestampNow: () => timestamp("2026-07-27T00:00:00.000Z"),
    });
    await expect(client.serverTime()).rejects.toThrow();
    expect(client.serverTimeState().quality).toBe("DEGRADED");
    expect(eventSink.events.at(-1)?.type).toBe("OKX_SERVER_TIME_DEGRADED");
    expect(
      eventSink.events.some((event) => event.type === "OKX_PARSE_FAILED"),
    ).toBe(true);
    expect(
      metricSink.value(
        "market_data_parse_failures_total",
        okxMetricLabels("INSTRUMENT_METADATA", "DEGRADED"),
      ),
    ).toBe(1n);
  });

  it("distinguishes HTTP rate limits from OKX business errors without retry", async () => {
    const metricSink = new RecordingOkxMetricSink();
    const rateLimited = vi.fn<typeof fetch>(async () => {
      return new Response("{}", {
        status: 429,
        headers: { "retry-after": "9".repeat(100) },
      });
    });
    const limitedClient = new OkxPublicRestClient({
      fetch: rateLimited,
      metricSink,
    });
    await expect(limitedClient.serverTime()).rejects.toMatchObject({
      name: "OkxRateLimitError",
      retryAfterMs: undefined,
    });
    expect(
      metricSink.value(
        "market_data_rate_limits_total",
        okxMetricLabels("INSTRUMENT_METADATA", "DEGRADED"),
      ),
    ).toBe(1n);

    const businessError = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({ code: "51000", msg: "Parameter error", data: [] }),
        { status: 200 },
      );
    });
    const businessClient = new OkxPublicRestClient({ fetch: businessError });
    await expect(businessClient.serverTime()).rejects.toMatchObject({
      name: "OkxAdapterError",
      category: "REMOTE",
    });
    expect(businessError).toHaveBeenCalledTimes(1);
  });
});
