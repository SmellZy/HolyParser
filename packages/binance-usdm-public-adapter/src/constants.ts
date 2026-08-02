import { productGroup, sourceId, venue } from "@arbitrage/market-data";

export const BINANCE_USDM_VENUE = venue("BINANCE_FUTURES");
export const BINANCE_USDM_PRODUCT_GROUP = productGroup("BINANCE_USDM_FUTURES");
export const BINANCE_USDM_RETRIEVAL_DATE = "2026-08-02";

export const BINANCE_USDM_REST_SOURCE = sourceId("BNFUT-01");
export const BINANCE_USDM_WS_SOURCE = sourceId("BNFUT-02");
export const BINANCE_USDM_LOCAL_BOOK_SOURCE = sourceId("BNFUT-04");
export const BINANCE_USDM_GENERAL_SOURCE = sourceId("BNFUT-05");
export const BINANCE_USDM_CHANGELOG_SOURCE = sourceId("BNFUT-08");
export const BINANCE_USDM_WS_MIGRATION_SOURCE = sourceId("BNFUT-09");
export const BINANCE_USDM_DEFINITIONS_SOURCE = sourceId("BNFUT-10");
export const BINANCE_USDM_WS_CONNECT_SOURCE = sourceId("BNFUT-11");

export const BINANCE_USDM_REST_ORIGIN = "https://fapi.binance.com" as const;
export const BINANCE_USDM_WS_ORIGIN = "wss://fstream.binance.com" as const;

export const BINANCE_USDM_PATHS = {
  exchangeInfo: "/fapi/v1/exchangeInfo",
  lastPrice: "/fapi/v2/ticker/price",
  bookTicker: "/fapi/v1/ticker/bookTicker",
  premiumIndex: "/fapi/v1/premiumIndex",
  fundingHistory: "/fapi/v1/fundingRate",
  fundingInfo: "/fapi/v1/fundingInfo",
  depth: "/fapi/v1/depth",
  time: "/fapi/v1/time",
} as const;

export type BinanceUsdmPath =
  (typeof BINANCE_USDM_PATHS)[keyof typeof BINANCE_USDM_PATHS];

export const BINANCE_USDM_PUBLIC_PATHS = new Set<BinanceUsdmPath>(
  Object.values(BINANCE_USDM_PATHS),
);

export const BINANCE_USDM_LIMITS = {
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
  canaryDurationMs: 15_000,
  canaryRequests: 7,
  canaryMessages: 10,
} as const;

export const BINANCE_USDM_DEPTH_LIMITS = [
  5, 10, 20, 50, 100, 500, 1_000,
] as const;
export type BinanceUsdmDepthLimit = (typeof BINANCE_USDM_DEPTH_LIMITS)[number];

export function depthRequestWeight(limit: BinanceUsdmDepthLimit): number {
  if (limit <= 50) return 2;
  if (limit === 100) return 5;
  if (limit === 500) return 10;
  return 20;
}

export const BINANCE_USDM_REQUEST_WEIGHTS = {
  exchangeInfo: 1,
  lastPriceBySymbol: 1,
  bookTickerBySymbol: 2,
  premiumIndexBySymbol: 1,
  fundingInfo: 0,
  time: 1,
} as const;

export const BINANCE_USDM_REQUEST_WEIGHT_BUDGET = {
  weight: 2_400,
  windowMs: 60_000,
} as const;

export const BINANCE_USDM_FUNDING_SHARED_BUDGET = {
  requests: 500,
  windowMs: 300_000,
} as const;

export const BINANCE_USDM_WS_PATH_PREFIXES = [
  "/public/ws/",
  "/public/stream",
] as const;

export type BinanceUsdmDepthCadence = "NATIVE" | "100ms" | "500ms";

export function assertBinanceUsdmOfficialInstrumentId(
  officialInstrumentId: string,
): void {
  if (
    officialInstrumentId.length === 0 ||
    officialInstrumentId.length > 64 ||
    /[\u0000-\u001f\u007f/\\?#%@]/.test(officialInstrumentId)
  ) {
    throw new TypeError("Binance official instrument ID is invalid.");
  }
}

export function diffDepthStreamName(
  officialInstrumentId: string,
  cadence: BinanceUsdmDepthCadence,
): string {
  assertBinanceUsdmOfficialInstrumentId(officialInstrumentId);
  const encodedOfficialId = encodeURIComponent(
    officialInstrumentId.toLowerCase(),
  );
  const base = `${encodedOfficialId}@depth`;
  return cadence === "NATIVE" ? base : `${base}@${cadence}`;
}
