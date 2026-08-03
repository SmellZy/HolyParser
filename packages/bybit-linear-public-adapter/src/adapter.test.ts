import { timestamp } from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import { BybitLinearPublicAdapter } from "./adapter.js";
import { BybitOrderBookSession } from "./book-session.js";
import { BybitLinearSchemaError } from "./errors.js";
import { binding, freshness, resolver } from "./test-helpers.js";

describe("Bybit public adapter ports", () => {
  it("exposes ports only for supported capabilities", () => {
    const bound = binding();
    const adapter = new BybitLinearPublicAdapter({
      restClient: {} as never,
      assetResolver: resolver,
      binding: bound,
      bookSession: new BybitOrderBookSession(
        bound,
        "orderbook.50.BTCUSDT",
        freshness,
      ),
      timestampNow: () => timestamp("2023-11-14T22:13:20.100Z"),
      freshness: { ticker: freshness, restBook: freshness },
    });
    expect(adapter.ports.TICKER).toBeDefined();
    expect(adapter.ports.WEBSOCKET_ORDER_BOOK_SNAPSHOT).toBeDefined();
    expect(adapter.ports.SEQUENCE_VALIDATION).toBeUndefined();
    expect(adapter.ports.CHECKSUM_VALIDATION).toBeUndefined();
    expect(adapter.ports.PREDICTED_FUNDING).toBeUndefined();
  });

  it("fails closed when no validated WS snapshot exists", async () => {
    const bound = binding();
    const adapter = new BybitLinearPublicAdapter({
      restClient: {} as never,
      assetResolver: resolver,
      binding: bound,
      bookSession: new BybitOrderBookSession(
        bound,
        "orderbook.50.BTCUSDT",
        freshness,
      ),
      timestampNow: () => timestamp("2023-11-14T22:13:20.100Z"),
      freshness: { ticker: freshness, restBook: freshness },
    });
    const port = adapter.ports.WEBSOCKET_ORDER_BOOK_SNAPSHOT;
    if (port?.capability !== "WEBSOCKET_ORDER_BOOK_SNAPSHOT")
      throw new Error("Missing snapshot port.");
    await expect(port.readSnapshot()).rejects.toBeInstanceOf(
      BybitLinearSchemaError,
    );
  });
});
