import {
  productGroup,
  sourceId,
  venue,
  type ProductGroup,
  type SourceId,
  type Venue,
} from "@arbitrage/market-data";

export const OKX_VENUE: Venue = venue("OKX_EXCHANGE");
export const OKX_PRODUCT_GROUP: ProductGroup = productGroup(
  "OKX_V5_SWAP_FUTURES",
);

export const OKX_API_SOURCE: SourceId = sourceId("OKX-01");
export const OKX_CHANGELOG_SOURCE: SourceId = sourceId("OKX-02");
export const OKX_CHECKSUM_SOURCE: SourceId = sourceId("OKX-03");
export const OKX_RETRIEVAL_DATE = "2026-07-27";

export const OKX_GLOBAL_REST_ORIGIN = "https://openapi.okx.com";
export const OKX_GLOBAL_PUBLIC_WS_URL = "wss://ws.okx.com:8443/ws/v5/public";

export const OKX_PUBLIC_PATHS = {
  instruments: "/api/v5/public/instruments",
  tickers: "/api/v5/market/tickers",
  markPrice: "/api/v5/public/mark-price",
  indexTickers: "/api/v5/market/index-tickers",
  fundingRate: "/api/v5/public/funding-rate",
  fundingHistory: "/api/v5/public/funding-rate-history",
  books: "/api/v5/market/books",
  time: "/api/v5/public/time",
} as const;

export type OkxPublicPath =
  (typeof OKX_PUBLIC_PATHS)[keyof typeof OKX_PUBLIC_PATHS];

export type OkxInstrumentType = "SWAP" | "FUTURES";

export const OKX_BOOK_CHANNEL = "books";

export const OKX_LIMITS = {
  responseBytes: 2_000_000,
  websocketMessageBytes: 1_000_000,
  queuedMessages: 2_048,
  queuedBytes: 16_000_000,
  requestTimeoutMs: 8_000,
  websocketConnectTimeoutMs: 10_000,
  websocketIdleBeforePingMs: 20_000,
  websocketPongTimeoutMs: 10_000,
  reconnectBaseDelayMs: 500,
  reconnectMaximumDelayMs: 15_000,
  reconnectMaximumAttempts: 8,
  subscriptionBytes: 64 * 1_024,
  operationsPerConnectionPerHour: 480,
  websocketConnectionsPerSecond: 3,
  jsonMaximumDepth: 64,
  jsonMaximumNodes: 100_000,
  jsonMaximumArrayLength: 10_000,
  jsonMaximumObjectKeys: 256,
  integerMaximumDigits: 78,
  canaryMaximumMessages: 32,
} as const;

export const OKX_REST_RATE_LIMITS = {
  [OKX_PUBLIC_PATHS.instruments]: { requests: 20, windowMs: 2_000 },
  [OKX_PUBLIC_PATHS.tickers]: { requests: 20, windowMs: 2_000 },
  [OKX_PUBLIC_PATHS.markPrice]: { requests: 10, windowMs: 2_000 },
  [OKX_PUBLIC_PATHS.indexTickers]: { requests: 20, windowMs: 2_000 },
  [OKX_PUBLIC_PATHS.fundingRate]: { requests: 10, windowMs: 2_000 },
  [OKX_PUBLIC_PATHS.fundingHistory]: { requests: 10, windowMs: 2_000 },
  [OKX_PUBLIC_PATHS.books]: { requests: 40, windowMs: 2_000 },
  [OKX_PUBLIC_PATHS.time]: { requests: 10, windowMs: 2_000 },
} as const satisfies Record<
  OkxPublicPath,
  { readonly requests: number; readonly windowMs: number }
>;
