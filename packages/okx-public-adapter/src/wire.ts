import {
  array,
  boolean,
  envelope,
  integer,
  oneOf,
  optionalString,
  record,
  string,
  type OkxEnvelope,
} from "./runtime-schema.js";
import { OkxSchemaError } from "./errors.js";

export interface OkxInstrumentWire {
  readonly instType: "SWAP" | "FUTURES";
  readonly instId: string;
  readonly instFamily: string;
  readonly uly: string;
  readonly baseCcy: string;
  readonly quoteCcy: string;
  readonly settleCcy: string;
  readonly ctVal: string;
  readonly ctMult: string;
  readonly ctValCcy: string;
  readonly ctType: "linear" | "inverse";
  readonly tickSz: string;
  readonly lotSz: string;
  readonly minSz: string;
  readonly listTime: string;
  readonly expTime: string;
  readonly state:
    | "live"
    | "suspend"
    | "rebase"
    | "post_only"
    | "preopen"
    | "test"
    | "settling";
  readonly ruleType: "normal" | "pre_market" | "rebase_contract" | "xperp";
  readonly futureSettlement: boolean;
}

export function parseInstruments(
  value: unknown,
): OkxEnvelope<OkxInstrumentWire> {
  return envelope(value, (item, path) => {
    const row = record(item, path);
    return Object.freeze({
      instType: oneOf(
        row.instType,
        ["SWAP", "FUTURES"] as const,
        `${path}.instType`,
      ),
      instId: string(row.instId, `${path}.instId`),
      instFamily: string(row.instFamily, `${path}.instFamily`, {
        allowEmpty: true,
      }),
      uly: string(row.uly, `${path}.uly`, { allowEmpty: true }),
      baseCcy: string(row.baseCcy, `${path}.baseCcy`, { allowEmpty: true }),
      quoteCcy: string(row.quoteCcy, `${path}.quoteCcy`, {
        allowEmpty: true,
      }),
      settleCcy: string(row.settleCcy, `${path}.settleCcy`),
      ctVal: string(row.ctVal, `${path}.ctVal`),
      ctMult: string(row.ctMult, `${path}.ctMult`, { allowEmpty: true }),
      ctValCcy: string(row.ctValCcy, `${path}.ctValCcy`),
      ctType: oneOf(
        row.ctType,
        ["linear", "inverse"] as const,
        `${path}.ctType`,
      ),
      tickSz: string(row.tickSz, `${path}.tickSz`),
      lotSz: string(row.lotSz, `${path}.lotSz`),
      minSz: string(row.minSz, `${path}.minSz`),
      listTime: string(row.listTime, `${path}.listTime`, {
        allowEmpty: true,
      }),
      expTime: string(row.expTime, `${path}.expTime`, { allowEmpty: true }),
      state: oneOf(
        row.state,
        [
          "live",
          "suspend",
          "rebase",
          "post_only",
          "preopen",
          "test",
          "settling",
        ] as const,
        `${path}.state`,
      ),
      ruleType: oneOf(
        row.ruleType,
        ["normal", "pre_market", "rebase_contract", "xperp"] as const,
        `${path}.ruleType`,
      ),
      futureSettlement: boolean(
        row.futureSettlement,
        `${path}.futureSettlement`,
      ),
    });
  });
}

export interface OkxTickerWire {
  readonly instType: "SWAP" | "FUTURES";
  readonly instId: string;
  readonly last: string;
  readonly bidPx: string;
  readonly askPx: string;
  readonly ts: string;
}

export function parseTickers(value: unknown): OkxEnvelope<OkxTickerWire> {
  return envelope(value, (item, path) => {
    const row = record(item, path);
    return Object.freeze({
      instType: oneOf(
        row.instType,
        ["SWAP", "FUTURES"] as const,
        `${path}.instType`,
      ),
      instId: string(row.instId, `${path}.instId`),
      last: string(row.last, `${path}.last`, { allowEmpty: true }),
      bidPx: string(row.bidPx, `${path}.bidPx`, { allowEmpty: true }),
      askPx: string(row.askPx, `${path}.askPx`, { allowEmpty: true }),
      ts: string(row.ts, `${path}.ts`),
    });
  });
}

export interface OkxMarkPriceWire {
  readonly instType: "SWAP" | "FUTURES";
  readonly instId: string;
  readonly markPx: string;
  readonly ts: string;
}

export function parseMarkPrices(value: unknown): OkxEnvelope<OkxMarkPriceWire> {
  return envelope(value, (item, path) => {
    const row = record(item, path);
    return Object.freeze({
      instType: oneOf(
        row.instType,
        ["SWAP", "FUTURES"] as const,
        `${path}.instType`,
      ),
      instId: string(row.instId, `${path}.instId`),
      markPx: string(row.markPx, `${path}.markPx`),
      ts: string(row.ts, `${path}.ts`),
    });
  });
}

export interface OkxIndexTickerWire {
  readonly instId: string;
  readonly idxPx: string;
  readonly ts: string;
}

export function parseIndexTickers(
  value: unknown,
): OkxEnvelope<OkxIndexTickerWire> {
  return envelope(value, (item, path) => {
    const row = record(item, path);
    return Object.freeze({
      instId: string(row.instId, `${path}.instId`),
      idxPx: string(row.idxPx, `${path}.idxPx`),
      ts: string(row.ts, `${path}.ts`),
    });
  });
}

export interface OkxFundingRateWire {
  readonly instType: "SWAP" | "FUTURES";
  readonly instId: string;
  readonly method: "current_period";
  readonly fundingRate: string;
  readonly fundingTime: string;
  readonly nextFundingRate: string;
  readonly nextFundingTime: string;
  readonly settFundingRate: string;
  readonly settState: "processing" | "settled";
  readonly ts: string;
}

export function parseFundingRates(
  value: unknown,
): OkxEnvelope<OkxFundingRateWire> {
  return envelope(value, (item, path) => {
    const row = record(item, path);
    return Object.freeze({
      instType: oneOf(
        row.instType,
        ["SWAP", "FUTURES"] as const,
        `${path}.instType`,
      ),
      instId: string(row.instId, `${path}.instId`),
      method: oneOf(row.method, ["current_period"] as const, `${path}.method`),
      fundingRate: string(row.fundingRate, `${path}.fundingRate`),
      fundingTime: string(row.fundingTime, `${path}.fundingTime`),
      nextFundingRate: string(row.nextFundingRate, `${path}.nextFundingRate`, {
        allowEmpty: true,
      }),
      nextFundingTime: string(row.nextFundingTime, `${path}.nextFundingTime`),
      settFundingRate: string(row.settFundingRate, `${path}.settFundingRate`, {
        allowEmpty: true,
      }),
      settState: oneOf(
        row.settState,
        ["processing", "settled"] as const,
        `${path}.settState`,
      ),
      ts: string(row.ts, `${path}.ts`),
    });
  });
}

export interface OkxFundingHistoryWire {
  readonly instType: "SWAP" | "FUTURES";
  readonly instId: string;
  readonly method: string;
  readonly fundingRate: string;
  readonly realizedRate: string;
  readonly fundingTime: string;
}

export function parseFundingHistory(
  value: unknown,
): OkxEnvelope<OkxFundingHistoryWire> {
  return envelope(value, (item, path) => {
    const row = record(item, path);
    return Object.freeze({
      instType: oneOf(
        row.instType,
        ["SWAP", "FUTURES"] as const,
        `${path}.instType`,
      ),
      instId: string(row.instId, `${path}.instId`),
      method: string(row.method, `${path}.method`),
      fundingRate: string(row.fundingRate, `${path}.fundingRate`),
      realizedRate: string(row.realizedRate, `${path}.realizedRate`, {
        allowEmpty: true,
      }),
      fundingTime: string(row.fundingTime, `${path}.fundingTime`),
    });
  });
}

export type OkxBookLevelWire = readonly [
  price: string,
  quantity: string,
  deprecated: string,
  orderCount: string,
];

function parseBookLevels(
  value: unknown,
  path: string,
): ReadonlyArray<OkxBookLevelWire> {
  return array(value, path, 400).map((item, index) => {
    const level = array(item, `${path}[${index}]`);
    if (level.length !== 4) {
      throw new OkxSchemaError(`${path}[${index}] must contain four fields.`);
    }
    return [
      string(level[0], `${path}[${index}][0]`),
      string(level[1], `${path}[${index}][1]`),
      string(level[2], `${path}[${index}][2]`),
      string(level[3], `${path}[${index}][3]`),
    ] as const;
  });
}

export interface OkxRestBookWire {
  readonly asks: ReadonlyArray<OkxBookLevelWire>;
  readonly bids: ReadonlyArray<OkxBookLevelWire>;
  readonly ts: string;
  readonly seqId: string;
}

export function parseRestBooks(value: unknown): OkxEnvelope<OkxRestBookWire> {
  return envelope(value, (item, path) => {
    const row = record(item, path);
    return Object.freeze({
      asks: parseBookLevels(row.asks, `${path}.asks`),
      bids: parseBookLevels(row.bids, `${path}.bids`),
      ts: string(row.ts, `${path}.ts`),
      seqId: integer(row.seqId, `${path}.seqId`),
    });
  });
}

export interface OkxTimeWire {
  readonly ts: string;
}

export function parseTime(value: unknown): OkxEnvelope<OkxTimeWire> {
  return envelope(value, (item, path) => {
    const row = record(item, path);
    return Object.freeze({ ts: integer(row.ts, `${path}.ts`) });
  });
}

export interface OkxBookPushWire {
  readonly kind: "BOOK";
  readonly channel: "books";
  readonly instId: string;
  readonly action: "snapshot" | "update";
  readonly data: ReadonlyArray<{
    readonly asks: ReadonlyArray<OkxBookLevelWire>;
    readonly bids: ReadonlyArray<OkxBookLevelWire>;
    readonly ts: string;
    readonly checksum: string;
    readonly prevSeqId: string;
    readonly seqId: string;
  }>;
}

export type OkxWebSocketMessage =
  | OkxBookPushWire
  | {
      readonly kind: "SUBSCRIPTION";
      readonly event: "subscribe" | "unsubscribe";
      readonly channel: "books";
      readonly instId: string;
      readonly code?: string;
      readonly msg?: string;
    }
  | {
      readonly kind: "ERROR";
      readonly code: string;
      readonly msg: string;
    }
  | {
      readonly kind: "NOTICE";
      readonly code: "64008";
      readonly msg: string;
    }
  | {
      readonly kind: "PONG";
    };

export function parseWebSocketMessage(value: unknown): OkxWebSocketMessage {
  if (value === "pong") {
    return { kind: "PONG" };
  }
  const root = record(value, "$");
  if (root.event !== undefined) {
    const event = string(root.event, "$.event");
    if (event === "error") {
      return {
        kind: "ERROR",
        code: string(root.code, "$.code"),
        msg: string(root.msg, "$.msg", { allowEmpty: true, maximum: 1_024 }),
      };
    }
    if (event === "notice") {
      return {
        kind: "NOTICE",
        code: oneOf(root.code, ["64008"] as const, "$.code"),
        msg: string(root.msg, "$.msg", { allowEmpty: true, maximum: 1_024 }),
      };
    }
    const subscribedEvent = oneOf(
      event,
      ["subscribe", "unsubscribe"] as const,
      "$.event",
    );
    const arg = record(root.arg, "$.arg");
    const code = optionalString(root.code, "$.code");
    const msg = optionalString(root.msg, "$.msg");
    return {
      kind: "SUBSCRIPTION",
      event: subscribedEvent,
      channel: oneOf(arg.channel, ["books"] as const, "$.arg.channel"),
      instId: string(arg.instId, "$.arg.instId"),
      ...(code === undefined ? {} : { code }),
      ...(msg === undefined ? {} : { msg }),
    };
  }
  const arg = record(root.arg, "$.arg");
  const action = oneOf(
    root.action,
    ["snapshot", "update"] as const,
    "$.action",
  );
  return {
    kind: "BOOK",
    channel: oneOf(arg.channel, ["books"] as const, "$.arg.channel"),
    instId: string(arg.instId, "$.arg.instId"),
    action,
    data: array(root.data, "$.data", 64).map((item, index) => {
      const path = `$.data[${index}]`;
      const row = record(item, path);
      return Object.freeze({
        asks: parseBookLevels(row.asks, `${path}.asks`),
        bids: parseBookLevels(row.bids, `${path}.bids`),
        ts: string(row.ts, `${path}.ts`),
        checksum: integer(row.checksum, `${path}.checksum`),
        prevSeqId: integer(row.prevSeqId, `${path}.prevSeqId`, {
          allowNegativeOne: true,
        }),
        seqId: integer(row.seqId, `${path}.seqId`),
      });
    }),
  };
}
