import { BYBIT_LIMITS } from "./constants.js";
import { BybitLinearAdapterError, BybitLinearSchemaError } from "./errors.js";
import {
  array,
  decimalWire,
  integer,
  oneOf,
  record,
  string,
  unsignedIntegerWire,
} from "./runtime-schema.js";

export const bybitContractTypes = ["LinearPerpetual", "LinearFutures"] as const;
export const bybitStatuses = [
  "PreLaunch",
  "Trading",
  "Delivering",
  "Closed",
] as const;

export interface BybitInstrumentWire {
  readonly symbol: string;
  readonly contractType: (typeof bybitContractTypes)[number];
  readonly status: (typeof bybitStatuses)[number];
  readonly baseCoin: string;
  readonly quoteCoin: string;
  readonly settleCoin: string;
  readonly launchTime: string;
  readonly deliveryTime: string;
  readonly priceScale: string;
  readonly tickSize: string;
  readonly qtyStep: string;
  readonly minOrderQty: string;
  readonly minNotionalValue: string;
  readonly fundingIntervalMinutes: number;
}

export interface BybitInstrumentsWire {
  readonly category: "linear";
  readonly nextPageCursor: string;
  readonly instruments: readonly BybitInstrumentWire[];
  readonly rejectedCount: number;
}

interface Envelope {
  readonly result: Record<string, unknown>;
  readonly responseTime: string;
}

function responseTimestamp(value: unknown, path: string): string {
  const wire =
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0
      ? value.toString()
      : unsignedIntegerWire(value, path);
  return calendarTimestampWire(wire, path);
}

function calendarTimestampWire(
  value: unknown,
  path: string,
  allowZero = false,
): string {
  const wire = unsignedIntegerWire(value, path);
  const parsed = BigInt(wire);
  if ((!allowZero && parsed === 0n) || parsed > 8_640_000_000_000_000n) {
    throw new BybitLinearSchemaError(
      `${path} is outside the valid calendar range.`,
    );
  }
  if (parsed !== 0n && !Number.isFinite(new Date(Number(parsed)).getTime())) {
    throw new BybitLinearSchemaError(`${path} is not a valid timestamp.`);
  }
  return wire;
}

function envelope(value: unknown, sourceId: string): Envelope {
  const root = record(value, "$");
  if (typeof root.retCode !== "number" || !Number.isSafeInteger(root.retCode)) {
    throw new BybitLinearSchemaError(
      "$.retCode must be a safe integer.",
      sourceId,
    );
  }
  const retCode = root.retCode;
  const retMsg = string(root.retMsg, "$.retMsg", {
    allowEmpty: true,
    maximum: 128,
  });
  if (retCode !== 0)
    throw new BybitLinearAdapterError(
      `Bybit public API rejected the request with retCode ${retCode}.`,
      retCode === 10006 ? "RATE_LIMIT" : "BUSINESS",
      sourceId,
    );
  if (retMsg !== "OK" && retMsg !== "")
    throw new BybitLinearSchemaError(
      "Successful response has an undocumented retMsg.",
      sourceId,
    );
  return {
    result: record(root.result, "$.result"),
    responseTime: responseTimestamp(root.time, "$.time"),
  };
}

function boundedName(value: unknown, path: string): string {
  return string(value, path, { maximum: 64 });
}

function parseInstrument(value: unknown, path: string): BybitInstrumentWire {
  const row = record(value, path);
  const priceFilter = record(row.priceFilter, `${path}.priceFilter`);
  const lot = record(row.lotSizeFilter, `${path}.lotSizeFilter`);
  const fundingInterval = integer(
    row.fundingInterval,
    `${path}.fundingInterval`,
  );
  return Object.freeze({
    symbol: boundedName(row.symbol, `${path}.symbol`),
    contractType: oneOf(
      row.contractType,
      `${path}.contractType`,
      bybitContractTypes,
    ),
    status: oneOf(row.status, `${path}.status`, bybitStatuses),
    baseCoin: boundedName(row.baseCoin, `${path}.baseCoin`),
    quoteCoin: boundedName(row.quoteCoin, `${path}.quoteCoin`),
    settleCoin: boundedName(row.settleCoin, `${path}.settleCoin`),
    launchTime: calendarTimestampWire(row.launchTime, `${path}.launchTime`),
    deliveryTime: calendarTimestampWire(
      row.deliveryTime,
      `${path}.deliveryTime`,
      true,
    ),
    priceScale: (() => {
      const scale = unsignedIntegerWire(row.priceScale, `${path}.priceScale`);
      if (BigInt(scale) > 78n) {
        throw new BybitLinearSchemaError(
          `${path}.priceScale exceeds the exact-decimal domain bound.`,
        );
      }
      return scale;
    })(),
    tickSize: decimalWire(priceFilter.tickSize, `${path}.priceFilter.tickSize`),
    qtyStep: decimalWire(lot.qtyStep, `${path}.lotSizeFilter.qtyStep`),
    minOrderQty: decimalWire(
      lot.minOrderQty,
      `${path}.lotSizeFilter.minOrderQty`,
    ),
    minNotionalValue: decimalWire(
      lot.minNotionalValue,
      `${path}.lotSizeFilter.minNotionalValue`,
    ),
    fundingIntervalMinutes: fundingInterval,
  });
}

export function parseInstruments(value: unknown): BybitInstrumentsWire {
  const { result } = envelope(value, "BYBIT-02");
  if (string(result.category, "$.result.category") !== "linear")
    throw new BybitLinearAdapterError(
      "Non-linear instrument response rejected.",
      "PRODUCT_REJECTED",
      "BYBIT-02",
    );
  const rows = array(result.list, "$.result.list");
  if (rows.length > BYBIT_LIMITS.instrumentCount)
    throw new BybitLinearSchemaError(
      "Instrument page exceeds the configured bound.",
      "BYBIT-02",
    );
  const instruments: BybitInstrumentWire[] = [];
  let rejectedCount = 0;
  for (const [index, value] of rows.entries()) {
    const row = record(value, `$.result.list[${index}]`);
    if (
      !(bybitContractTypes as readonly string[]).includes(
        String(row.contractType),
      ) ||
      !(bybitStatuses as readonly string[]).includes(String(row.status))
    ) {
      rejectedCount += 1;
      continue;
    }
    instruments.push(parseInstrument(value, `$.result.list[${index}]`));
  }
  return Object.freeze({
    category: "linear",
    nextPageCursor: string(result.nextPageCursor, "$.result.nextPageCursor", {
      allowEmpty: true,
    }),
    instruments: Object.freeze(instruments),
    rejectedCount,
  });
}

export interface BybitTickerWire {
  readonly symbol: string;
  readonly lastPrice: string;
  readonly bid1Price: string;
  readonly ask1Price: string;
  readonly markPrice: string;
  readonly indexPrice: string;
  readonly fundingRate?: string;
  readonly nextFundingTime?: string;
  readonly fundingIntervalHour?: string;
  readonly responseTime: string;
}

function optionalDecimal(
  value: unknown,
  path: string,
  negative = false,
): string | undefined {
  if (value === undefined || value === "") return undefined;
  return decimalWire(value, path, { negative, zero: true });
}
function optionalUnsigned(value: unknown, path: string): string | undefined {
  if (value === undefined || value === "" || value === "0") return undefined;
  return calendarTimestampWire(value, path);
}

export function parseTickers(value: unknown): readonly BybitTickerWire[] {
  const { result, responseTime } = envelope(value, "BYBIT-03");
  if (string(result.category, "$.result.category") !== "linear")
    throw new BybitLinearAdapterError(
      "Non-linear ticker response rejected.",
      "PRODUCT_REJECTED",
      "BYBIT-03",
    );
  const rows = array(result.list, "$.result.list");
  if (rows.length > BYBIT_LIMITS.instrumentCount)
    throw new BybitLinearSchemaError(
      "Ticker response exceeds the instrument bound.",
      "BYBIT-03",
    );
  return Object.freeze(
    rows.map((value, index) => {
      const path = `$.result.list[${index}]`;
      const row = record(value, path);
      const interval =
        row.fundingIntervalHour === undefined || row.fundingIntervalHour === ""
          ? undefined
          : unsignedIntegerWire(
              row.fundingIntervalHour,
              `${path}.fundingIntervalHour`,
            );
      return Object.freeze({
        symbol: boundedName(row.symbol, `${path}.symbol`),
        lastPrice: decimalWire(row.lastPrice, `${path}.lastPrice`),
        bid1Price: decimalWire(row.bid1Price, `${path}.bid1Price`),
        ask1Price: decimalWire(row.ask1Price, `${path}.ask1Price`),
        markPrice: decimalWire(row.markPrice, `${path}.markPrice`),
        indexPrice: decimalWire(row.indexPrice, `${path}.indexPrice`),
        ...(optionalDecimal(row.fundingRate, `${path}.fundingRate`, true) ===
        undefined
          ? {}
          : {
              fundingRate: optionalDecimal(
                row.fundingRate,
                `${path}.fundingRate`,
                true,
              ),
            }),
        ...(optionalUnsigned(row.nextFundingTime, `${path}.nextFundingTime`) ===
        undefined
          ? {}
          : {
              nextFundingTime: optionalUnsigned(
                row.nextFundingTime,
                `${path}.nextFundingTime`,
              ),
            }),
        ...(interval === undefined ? {} : { fundingIntervalHour: interval }),
        responseTime,
      });
    }),
  );
}

export interface BybitFundingHistoryWire {
  readonly symbol: string;
  readonly fundingRate: string;
  readonly fundingRateTimestamp: string;
  readonly responseTime: string;
}
export function parseFundingHistory(
  value: unknown,
): readonly BybitFundingHistoryWire[] {
  const { result, responseTime } = envelope(value, "BYBIT-04");
  if (string(result.category, "$.result.category") !== "linear")
    throw new BybitLinearAdapterError(
      "Non-linear funding response rejected.",
      "PRODUCT_REJECTED",
      "BYBIT-04",
    );
  const rows = array(result.list, "$.result.list");
  if (rows.length > 200)
    throw new BybitLinearSchemaError(
      "Funding history exceeds the documented limit.",
      "BYBIT-04",
    );
  return Object.freeze(
    rows.map((value, index) => {
      const path = `$.result.list[${index}]`;
      const row = record(value, path);
      return Object.freeze({
        symbol: boundedName(row.symbol, `${path}.symbol`),
        fundingRate: decimalWire(row.fundingRate, `${path}.fundingRate`, {
          negative: true,
          zero: true,
        }),
        fundingRateTimestamp: calendarTimestampWire(
          row.fundingRateTimestamp,
          `${path}.fundingRateTimestamp`,
        ),
        responseTime,
      });
    }),
  );
}

export type BybitBookLevelWire = readonly [string, string];
function parseLevels(
  value: unknown,
  path: string,
  snapshot: boolean,
): readonly BybitBookLevelWire[] {
  const rows = array(value, path);
  if (rows.length > BYBIT_LIMITS.bookLevels)
    throw new BybitLinearSchemaError(
      "Order-book level bound exceeded.",
      "BYBIT-05",
    );
  return Object.freeze(
    rows.map((value, index) => {
      const level = array(value, `${path}[${index}]`);
      if (level.length !== 2)
        throw new BybitLinearSchemaError(
          "Order-book level must have price and quantity.",
          "BYBIT-05",
        );
      return Object.freeze([
        decimalWire(level[0], `${path}[${index}][0]`),
        decimalWire(level[1], `${path}[${index}][1]`, { zero: !snapshot }),
      ] as const);
    }),
  );
}

export interface BybitRestBookWire {
  readonly symbol: string;
  readonly bids: readonly BybitBookLevelWire[];
  readonly asks: readonly BybitBookLevelWire[];
  readonly timestamp: string;
  readonly updateId: string;
  readonly sequence: string;
  readonly matchingTimestamp: string;
}
export function parseRestBook(value: unknown): BybitRestBookWire {
  const { result } = envelope(value, "BYBIT-05");
  return Object.freeze({
    symbol: boundedName(result.s, "$.result.s"),
    bids: parseLevels(result.b, "$.result.b", true),
    asks: parseLevels(result.a, "$.result.a", true),
    timestamp: calendarTimestampWire(result.ts, "$.result.ts"),
    updateId: unsignedIntegerWire(result.u, "$.result.u"),
    sequence: unsignedIntegerWire(result.seq, "$.result.seq"),
    matchingTimestamp: calendarTimestampWire(result.cts, "$.result.cts"),
  });
}

export interface BybitWsBookWire {
  readonly topic: string;
  readonly type: "snapshot" | "delta";
  readonly timestamp: string;
  readonly symbol: string;
  readonly bids: readonly BybitBookLevelWire[];
  readonly asks: readonly BybitBookLevelWire[];
  readonly updateId: string;
  readonly sequence: string;
  readonly matchingTimestamp: string;
}
export function parseWsBook(value: unknown): BybitWsBookWire {
  const root = record(value, "$ws");
  const type = oneOf(root.type, "$ws.type", ["snapshot", "delta"] as const);
  const data = record(root.data, "$ws.data");
  return Object.freeze({
    topic: string(root.topic, "$ws.topic", { maximum: 128 }),
    type,
    timestamp: calendarTimestampWire(root.ts, "$ws.ts"),
    symbol: boundedName(data.s, "$ws.data.s"),
    bids: parseLevels(data.b, "$ws.data.b", type === "snapshot"),
    asks: parseLevels(data.a, "$ws.data.a", type === "snapshot"),
    updateId: unsignedIntegerWire(data.u, "$ws.data.u"),
    sequence: unsignedIntegerWire(data.seq, "$ws.data.seq"),
    matchingTimestamp: calendarTimestampWire(root.cts ?? data.cts, "$ws.cts"),
  });
}

export interface BybitServerTimeWire {
  readonly timeSecond: string;
  readonly timeNano: string;
  readonly responseTime: string;
}
export function parseServerTime(value: unknown): BybitServerTimeWire {
  const { result, responseTime } = envelope(value, "BYBIT-11");
  return Object.freeze({
    timeSecond: unsignedIntegerWire(result.timeSecond, "$.result.timeSecond"),
    timeNano: unsignedIntegerWire(result.timeNano, "$.result.timeNano"),
    responseTime,
  });
}

export type BybitWsControlWire =
  | {
      readonly kind: "ACK";
      readonly success: boolean;
      readonly operation: "subscribe" | "ping";
      readonly requestId?: string;
    }
  | { readonly kind: "BOOK"; readonly value: BybitWsBookWire };
export function parseWsMessage(value: unknown): BybitWsControlWire {
  const root = record(value, "$ws");
  if (root.topic !== undefined)
    return { kind: "BOOK", value: parseWsBook(value) };
  const operation = oneOf(root.op, "$ws.op", ["subscribe", "ping"] as const);
  if (typeof root.success !== "boolean")
    throw new BybitLinearSchemaError(
      "WebSocket acknowledgement success must be boolean.",
      "BYBIT-08",
    );
  const requestId =
    root.req_id === undefined || root.req_id === ""
      ? undefined
      : string(root.req_id, "$ws.req_id", { maximum: 64 });
  return Object.freeze({
    kind: "ACK",
    success: root.success,
    operation,
    ...(requestId === undefined ? {} : { requestId }),
  });
}
