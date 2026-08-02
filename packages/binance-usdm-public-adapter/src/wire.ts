import { BINANCE_USDM_LIMITS } from "./constants.js";
import { BinanceUsdmAdapterError, BinanceUsdmSchemaError } from "./errors.js";
import {
  array,
  boolean,
  decimalWire,
  oneOf,
  optionalString,
  record,
  safeInteger,
  string,
  unsignedIntegerWire,
} from "./runtime-schema.js";

export const binanceContractTypes = [
  "PERPETUAL",
  "CURRENT_MONTH",
  "NEXT_MONTH",
  "CURRENT_QUARTER",
  "NEXT_QUARTER",
] as const;

export const binanceInstrumentStatuses = [
  "PENDING_TRADING",
  "TRADING",
  "PRE_DELIVERING",
  "DELIVERING",
  "DELIVERED",
  "PRE_SETTLE",
  "SETTLING",
  "CLOSE",
  "TRADING_HALT",
  "TRADING_CANCEL_ONLY",
] as const;

export interface BinancePriceFilterWire {
  readonly filterType: "PRICE_FILTER";
  readonly tickSize: string;
}

export interface BinanceLotSizeFilterWire {
  readonly filterType: "LOT_SIZE";
  readonly minQty: string;
  readonly stepSize: string;
}

export interface BinanceMinimumNotionalFilterWire {
  readonly filterType: "MIN_NOTIONAL";
  readonly notional: string;
}

export interface BinanceUnknownFilterWire {
  readonly filterType: string;
}

export type BinanceSymbolFilterWire =
  | BinancePriceFilterWire
  | BinanceLotSizeFilterWire
  | BinanceMinimumNotionalFilterWire
  | BinanceUnknownFilterWire;

export interface BinanceInstrumentWire {
  readonly symbol: string;
  readonly pair: string;
  readonly contractType: (typeof binanceContractTypes)[number];
  readonly deliveryDate: string;
  readonly onboardDate: string;
  readonly status: (typeof binanceInstrumentStatuses)[number];
  readonly baseAsset: string;
  readonly quoteAsset: string;
  readonly marginAsset: string;
  readonly pricePrecision: number;
  readonly quantityPrecision: number;
  readonly filters: ReadonlyArray<BinanceSymbolFilterWire>;
}

export interface BinanceRateLimitWire {
  readonly rateLimitType: string;
  readonly interval: string;
  readonly intervalNum: number;
  readonly limit: number;
}

export interface BinanceExchangeInfoWire {
  readonly rateLimits: ReadonlyArray<BinanceRateLimitWire>;
  readonly symbols: ReadonlyArray<BinanceInstrumentWire>;
  readonly rejectedInstrumentCount: number;
  readonly rejectionReasons: Readonly<{
    unsupportedContractType: number;
  }>;
}

function asset(value: unknown, path: string): string {
  return string(value, path, { maximum: 64 });
}

function officialSymbol(value: unknown, path: string): string {
  return string(value, path, { maximum: 64 });
}

function timestampWire(value: unknown, path: string): string {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return value.toString();
  }
  return unsignedIntegerWire(value, path);
}

function parseFilter(value: unknown, path: string): BinanceSymbolFilterWire {
  const row = record(value, path);
  const filterType = string(row.filterType, `${path}.filterType`, {
    maximum: 64,
  });
  switch (filterType) {
    case "PRICE_FILTER":
      return Object.freeze({
        filterType,
        tickSize: decimalWire(row.tickSize, `${path}.tickSize`),
      });
    case "LOT_SIZE":
      return Object.freeze({
        filterType,
        minQty: decimalWire(row.minQty, `${path}.minQty`),
        stepSize: decimalWire(row.stepSize, `${path}.stepSize`),
      });
    case "MIN_NOTIONAL":
      return Object.freeze({
        filterType,
        notional: decimalWire(row.notional, `${path}.notional`),
      });
    default:
      return Object.freeze({ filterType });
  }
}

function parseInstrument(value: unknown, path: string): BinanceInstrumentWire {
  const row = record(value, path);
  const filters = array(row.filters, `${path}.filters`).map((filter, index) =>
    parseFilter(filter, `${path}.filters[${index}]`),
  );
  return Object.freeze({
    symbol: officialSymbol(row.symbol, `${path}.symbol`),
    pair: officialSymbol(row.pair, `${path}.pair`),
    contractType: oneOf(
      row.contractType,
      `${path}.contractType`,
      binanceContractTypes,
    ),
    deliveryDate: timestampWire(row.deliveryDate, `${path}.deliveryDate`),
    onboardDate: timestampWire(row.onboardDate, `${path}.onboardDate`),
    status: oneOf(row.status, `${path}.status`, binanceInstrumentStatuses),
    baseAsset: asset(row.baseAsset, `${path}.baseAsset`),
    quoteAsset: asset(row.quoteAsset, `${path}.quoteAsset`),
    marginAsset: asset(row.marginAsset, `${path}.marginAsset`),
    pricePrecision: safeInteger(row.pricePrecision, `${path}.pricePrecision`),
    quantityPrecision: safeInteger(
      row.quantityPrecision,
      `${path}.quantityPrecision`,
    ),
    filters: Object.freeze(filters),
  });
}

export function parseExchangeInfo(value: unknown): BinanceExchangeInfoWire {
  const root = record(value, "$");
  const symbolsRaw = array(root.symbols, "$.symbols");
  if (symbolsRaw.length > BINANCE_USDM_LIMITS.instrumentCount) {
    throw new BinanceUsdmSchemaError(
      "Exchange information contains too many instruments.",
    );
  }
  const rateLimits = array(root.rateLimits, "$.rateLimits").map(
    (value, index) => {
      const row = record(value, `$.rateLimits[${index}]`);
      return Object.freeze({
        rateLimitType: string(
          row.rateLimitType,
          `$.rateLimits[${index}].rateLimitType`,
          {
            maximum: 32,
          },
        ),
        interval: string(row.interval, `$.rateLimits[${index}].interval`, {
          maximum: 16,
        }),
        intervalNum: safeInteger(
          row.intervalNum,
          `$.rateLimits[${index}].intervalNum`,
        ),
        limit: safeInteger(row.limit, `$.rateLimits[${index}].limit`),
      });
    },
  );
  const symbols: BinanceInstrumentWire[] = [];
  let unsupportedContractType = 0;
  for (const [index, value] of symbolsRaw.entries()) {
    const row = record(value, `$.symbols[${index}]`);
    const contractType = string(
      row.contractType,
      `$.symbols[${index}].contractType`,
      { maximum: 64 },
    );
    if (!(binanceContractTypes as readonly string[]).includes(contractType)) {
      unsupportedContractType += 1;
      continue;
    }
    symbols.push(parseInstrument(value, `$.symbols[${index}]`));
  }
  return Object.freeze({
    rateLimits: Object.freeze(rateLimits),
    symbols: Object.freeze(symbols),
    rejectedInstrumentCount: unsupportedContractType,
    rejectionReasons: Object.freeze({ unsupportedContractType }),
  });
}

export interface BinanceLastPriceWire {
  readonly symbol: string;
  readonly price: string;
  readonly time: string;
}

export function parseLastPrices(
  value: unknown,
): ReadonlyArray<BinanceLastPriceWire> {
  const rows = Array.isArray(value) ? value : [value];
  return Object.freeze(
    rows.map((value, index) => {
      const path = `$[${index}]`;
      const row = record(value, path);
      return Object.freeze({
        symbol: officialSymbol(row.symbol, `${path}.symbol`),
        price: decimalWire(row.price, `${path}.price`),
        time: timestampWire(row.time, `${path}.time`),
      });
    }),
  );
}

export interface BinanceBookTickerWire {
  readonly symbol: string;
  readonly bidPrice: string;
  readonly bidQty: string;
  readonly askPrice: string;
  readonly askQty: string;
  readonly time: string;
}

export function parseBookTickers(
  value: unknown,
): ReadonlyArray<BinanceBookTickerWire> {
  const rows = Array.isArray(value) ? value : [value];
  return Object.freeze(
    rows.map((value, index) => {
      const path = `$[${index}]`;
      const row = record(value, path);
      return Object.freeze({
        symbol: officialSymbol(row.symbol, `${path}.symbol`),
        bidPrice: decimalWire(row.bidPrice, `${path}.bidPrice`),
        bidQty: decimalWire(row.bidQty, `${path}.bidQty`, { zero: true }),
        askPrice: decimalWire(row.askPrice, `${path}.askPrice`),
        askQty: decimalWire(row.askQty, `${path}.askQty`, { zero: true }),
        time: timestampWire(row.time, `${path}.time`),
      });
    }),
  );
}

function optionalDecimal(
  value: unknown,
  path: string,
  options: { readonly negative?: boolean; readonly zero?: boolean } = {},
): string {
  if (value === "") return "";
  return decimalWire(value, path, options);
}

export interface BinancePremiumIndexWire {
  readonly symbol: string;
  readonly markPrice: string;
  readonly indexPrice: string;
  readonly lastFundingRate: string;
  readonly nextFundingTime: string;
  readonly time: string;
}

export function parsePremiumIndexes(
  value: unknown,
): ReadonlyArray<BinancePremiumIndexWire> {
  const rows = Array.isArray(value) ? value : [value];
  return Object.freeze(
    rows.map((value, index) => {
      const path = `$[${index}]`;
      const row = record(value, path);
      return Object.freeze({
        symbol: officialSymbol(row.symbol, `${path}.symbol`),
        markPrice: decimalWire(row.markPrice, `${path}.markPrice`),
        indexPrice: decimalWire(row.indexPrice, `${path}.indexPrice`),
        lastFundingRate: optionalDecimal(
          row.lastFundingRate,
          `${path}.lastFundingRate`,
          {
            negative: true,
            zero: true,
          },
        ),
        nextFundingTime: timestampWire(
          row.nextFundingTime,
          `${path}.nextFundingTime`,
        ),
        time: timestampWire(row.time, `${path}.time`),
      });
    }),
  );
}

export interface BinanceFundingHistoryWire {
  readonly symbol: string;
  readonly fundingRate: string;
  readonly fundingTime: string;
  readonly markPrice?: string;
  readonly rateType?: "Regular" | "Special";
}

export function parseFundingHistory(
  value: unknown,
): ReadonlyArray<BinanceFundingHistoryWire> {
  return Object.freeze(
    array(value, "$").map((value, index) => {
      const path = `$[${index}]`;
      const row = record(value, path);
      const markPrice = optionalString(row.markPrice, `${path}.markPrice`);
      const rateType =
        row.rateType === undefined
          ? undefined
          : oneOf(row.rateType, `${path}.rateType`, [
              "Regular",
              "Special",
            ] as const);
      return Object.freeze({
        symbol: officialSymbol(row.symbol, `${path}.symbol`),
        fundingRate: decimalWire(row.fundingRate, `${path}.fundingRate`, {
          negative: true,
          zero: true,
        }),
        fundingTime: timestampWire(row.fundingTime, `${path}.fundingTime`),
        ...(markPrice === undefined
          ? {}
          : { markPrice: decimalWire(markPrice, `${path}.markPrice`) }),
        ...(rateType === undefined ? {} : { rateType }),
      });
    }),
  );
}

export interface BinanceFundingInfoWire {
  readonly symbol: string;
  readonly adjustedFundingRateCap: string;
  readonly adjustedFundingRateFloor: string;
  readonly fundingIntervalHours: number;
  readonly disclaimer: boolean;
}

export function parseFundingInfo(
  value: unknown,
): ReadonlyArray<BinanceFundingInfoWire> {
  return Object.freeze(
    array(value, "$").map((value, index) => {
      const path = `$[${index}]`;
      const row = record(value, path);
      const hours = safeInteger(
        row.fundingIntervalHours,
        `${path}.fundingIntervalHours`,
      );
      if (hours <= 0 || hours > 168) {
        throw new BinanceUsdmSchemaError(
          `${path}.fundingIntervalHours is out of bounds.`,
        );
      }
      return Object.freeze({
        symbol: officialSymbol(row.symbol, `${path}.symbol`),
        adjustedFundingRateCap: decimalWire(
          row.adjustedFundingRateCap,
          `${path}.adjustedFundingRateCap`,
          { negative: true, zero: true },
        ),
        adjustedFundingRateFloor: decimalWire(
          row.adjustedFundingRateFloor,
          `${path}.adjustedFundingRateFloor`,
          { negative: true, zero: true },
        ),
        fundingIntervalHours: hours,
        disclaimer: boolean(row.disclaimer, `${path}.disclaimer`),
      });
    }),
  );
}

export interface BinanceBookLevelWire {
  readonly price: string;
  readonly quantity: string;
}

function parseBookLevel(
  value: unknown,
  path: string,
  allowZeroQuantity: boolean,
): BinanceBookLevelWire {
  const tuple = array(value, path);
  if (tuple.length !== 2) {
    throw new BinanceUsdmSchemaError(
      `${path} must contain price and quantity.`,
    );
  }
  return Object.freeze({
    price: decimalWire(tuple[0], `${path}[0]`),
    quantity: decimalWire(tuple[1], `${path}[1]`, { zero: allowZeroQuantity }),
  });
}

function parseLevels(
  value: unknown,
  path: string,
  allowZeroQuantity: boolean,
): ReadonlyArray<BinanceBookLevelWire> {
  const rows = array(value, path);
  if (rows.length > BINANCE_USDM_LIMITS.bookLevels) {
    throw new BinanceUsdmSchemaError(`${path} exceeds the book-level limit.`);
  }
  return Object.freeze(
    rows.map((row, index) =>
      parseBookLevel(row, `${path}[${index}]`, allowZeroQuantity),
    ),
  );
}

export interface BinanceDepthSnapshotWire {
  readonly lastUpdateId: string;
  readonly eventTime: string;
  readonly transactionTime: string;
  readonly bids: ReadonlyArray<BinanceBookLevelWire>;
  readonly asks: ReadonlyArray<BinanceBookLevelWire>;
}

export function parseDepthSnapshot(value: unknown): BinanceDepthSnapshotWire {
  const row = record(value, "$");
  return Object.freeze({
    lastUpdateId: unsignedIntegerWire(row.lastUpdateId, "$.lastUpdateId"),
    eventTime: timestampWire(row.E, "$.E"),
    transactionTime: timestampWire(row.T, "$.T"),
    bids: parseLevels(row.bids, "$.bids", false),
    asks: parseLevels(row.asks, "$.asks", false),
  });
}

export interface BinanceDiffDepthWire {
  readonly eventType: "depthUpdate";
  readonly eventTime: string;
  readonly transactionTime: string;
  readonly symbol: string;
  readonly pair: string;
  readonly symbolType: 1;
  readonly firstUpdateId: string;
  readonly finalUpdateId: string;
  readonly previousFinalUpdateId: string;
  readonly bids: ReadonlyArray<BinanceBookLevelWire>;
  readonly asks: ReadonlyArray<BinanceBookLevelWire>;
  readonly stream?: string;
}

export function parseDiffDepth(value: unknown): BinanceDiffDepthWire {
  const outer = record(value, "$");
  const combined = outer.stream !== undefined || outer.data !== undefined;
  const stream = combined
    ? string(outer.stream, "$.stream", { maximum: 128 })
    : undefined;
  const row = combined ? record(outer.data, "$.data") : outer;
  const symbolType = safeInteger(row.st, combined ? "$.data.st" : "$.st");
  if (symbolType !== 1) {
    throw new BinanceUsdmAdapterError(
      "WebSocket payload is not a USD-M product record (st must equal 1).",
      "PRODUCT_FAMILY",
      "BNFUT-02",
    );
  }
  return Object.freeze({
    eventType: oneOf(row.e, "$.e", ["depthUpdate"] as const),
    eventTime: timestampWire(row.E, "$.E"),
    transactionTime: timestampWire(row.T, "$.T"),
    symbol: officialSymbol(row.s, "$.s"),
    pair: officialSymbol(row.ps, "$.ps"),
    symbolType: 1,
    firstUpdateId: unsignedIntegerWire(row.U, "$.U"),
    finalUpdateId: unsignedIntegerWire(row.u, "$.u"),
    previousFinalUpdateId: unsignedIntegerWire(row.pu, "$.pu"),
    bids: parseLevels(row.b, "$.b", true),
    asks: parseLevels(row.a, "$.a", true),
    ...(stream === undefined ? {} : { stream }),
  });
}

export interface BinanceServerTimeWire {
  readonly serverTime: string;
}

export function parseServerTime(value: unknown): BinanceServerTimeWire {
  const row = record(value, "$");
  return Object.freeze({
    serverTime: timestampWire(row.serverTime, "$.serverTime"),
  });
}

export interface BinanceBusinessErrorWire {
  readonly code: number;
  readonly message: string;
}

export function parseBusinessError(value: unknown): BinanceBusinessErrorWire {
  const row = record(value, "$");
  return Object.freeze({
    code: safeInteger(row.code, "$.code"),
    message: string(row.msg, "$.msg", { maximum: 512 }),
  });
}
