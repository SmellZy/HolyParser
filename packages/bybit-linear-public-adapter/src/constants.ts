import { productGroup, sourceId, venue } from "@arbitrage/market-data";

export const BYBIT_LINEAR_VENUE = venue("BYBIT");
export const BYBIT_LINEAR_PRODUCT_GROUP = productGroup("BYBIT_V5_LINEAR");
export const BYBIT_RETRIEVAL_DATE = "2026-08-03";

export const BYBIT_INTRO_SOURCE = sourceId("BYBIT-01");
export const BYBIT_INSTRUMENT_SOURCE = sourceId("BYBIT-02");
export const BYBIT_TICKER_SOURCE = sourceId("BYBIT-03");
export const BYBIT_FUNDING_SOURCE = sourceId("BYBIT-04");
export const BYBIT_REST_BOOK_SOURCE = sourceId("BYBIT-05");
export const BYBIT_WS_BOOK_SOURCE = sourceId("BYBIT-06");
export const BYBIT_GUIDE_SOURCE = sourceId("BYBIT-07");
export const BYBIT_WS_CONNECT_SOURCE = sourceId("BYBIT-08");
export const BYBIT_RATE_LIMIT_SOURCE = sourceId("BYBIT-09");
export const BYBIT_ERROR_SOURCE = sourceId("BYBIT-10");
export const BYBIT_TIME_SOURCE = sourceId("BYBIT-11");
export const BYBIT_ENUM_SOURCE = sourceId("BYBIT-16");
export const BYBIT_CHANGELOG_SOURCE = sourceId("BYBIT-18");

export const BYBIT_REST_ORIGIN = "https://api.bybit.com" as const;
export const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear" as const;

export const BYBIT_PATHS = {
  instruments: "/v5/market/instruments-info",
  tickers: "/v5/market/tickers",
  fundingHistory: "/v5/market/funding/history",
  orderbook: "/v5/market/orderbook",
  time: "/v5/market/time",
} as const;

export type BybitPath = (typeof BYBIT_PATHS)[keyof typeof BYBIT_PATHS];
export const BYBIT_PUBLIC_PATHS = new Set<BybitPath>(
  Object.values(BYBIT_PATHS),
);

export const BYBIT_LIMITS = {
  requestTimeoutMs: 5_000,
  websocketConnectTimeoutMs: 5_000,
  responseBytes: 2_000_000,
  websocketMessageBytes: 1_000_000,
  queuedMessages: 1_024,
  queuedBytes: 8_000_000,
  jsonMaximumDepth: 32,
  jsonMaximumNodes: 100_000,
  jsonMaximumArrayLength: 10_000,
  jsonMaximumObjectKeys: 128,
  stringLength: 512,
  decimalWireLength: 128,
  updateIdLength: 30,
  instrumentCount: 5_000,
  bookLevels: 1_000,
  reconnectMaximumAttempts: 5,
  publicRequests: 500,
  publicWindowMs: 5_000,
  canaryDurationMs: 15_000,
  canaryRequests: 6,
  canaryMessages: 10,
} as const;

export const BYBIT_REST_DEPTH_LIMITS = [
  1, 25, 50, 100, 200, 500, 1_000,
] as const;
export type BybitRestDepthLimit = (typeof BYBIT_REST_DEPTH_LIMITS)[number];
export const BYBIT_WS_DEPTHS = [1, 50, 200, 1_000] as const;
export type BybitWsDepth = (typeof BYBIT_WS_DEPTHS)[number];

export function assertBybitOfficialInstrumentId(value: string): void {
  if (
    value.length === 0 ||
    value.length > 64 ||
    /[\u0000-\u001f\u007f/\\?#%@]/.test(value)
  ) {
    throw new TypeError("Bybit official instrument ID is invalid.");
  }
}

export function bybitOrderbookTopic(
  symbol: string,
  depth: BybitWsDepth,
): string {
  assertBybitOfficialInstrumentId(symbol);
  if (!BYBIT_WS_DEPTHS.includes(depth)) {
    throw new TypeError("Bybit order-book depth is not documented.");
  }
  return `orderbook.${depth}.${symbol}`;
}
