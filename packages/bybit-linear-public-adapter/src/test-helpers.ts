import {
  canonicalAssetId,
  timestamp,
  type Timestamp,
} from "@arbitrage/market-data";
import {
  mapInstrument,
  type BybitAssetResolver,
  type BybitInstrumentBinding,
  type BybitObservationTimes,
} from "./mapping.js";
import type { BybitInstrumentWire } from "./wire.js";

export const times: BybitObservationTimes = Object.freeze({
  receiveTimestamp: timestamp("2023-11-14T22:13:20.100Z"),
  processingTimestamp: timestamp("2023-11-14T22:13:20.101Z"),
});
export const freshness = Object.freeze({
  healthyAgeMs: 1_000,
  staleAgeMs: 5_000,
  maximumFutureSkewMs: 500,
});
export const resolver: BybitAssetResolver = {
  resolve(reference) {
    return canonicalAssetId(`asset:${reference}`);
  },
};
export const usdtPerpetual: BybitInstrumentWire = Object.freeze({
  symbol: "BTCUSDT",
  contractType: "LinearPerpetual",
  status: "Trading",
  baseCoin: "BTC",
  quoteCoin: "USDT",
  settleCoin: "USDT",
  launchTime: "1700000000000",
  deliveryTime: "0",
  priceScale: "1",
  tickSize: "0.1",
  qtyStep: "0.001",
  minOrderQty: "0.001",
  minNotionalValue: "5",
  fundingIntervalMinutes: 480,
});
export const usdcPerpetual: BybitInstrumentWire = Object.freeze({
  ...usdtPerpetual,
  symbol: "BTCPERP",
  quoteCoin: "USDC",
  settleCoin: "USDC",
  fundingIntervalMinutes: 60,
});
export const deliveryFuture: BybitInstrumentWire = Object.freeze({
  ...usdtPerpetual,
  symbol: "BTC-30DEC26",
  contractType: "LinearFutures",
  deliveryTime: "1798588800000",
});
export function binding(
  row: BybitInstrumentWire = usdtPerpetual,
): BybitInstrumentBinding {
  return mapInstrument(row, resolver, times);
}
export function at(value: string): Timestamp {
  return timestamp(value);
}
export function envelope(result: unknown, time = "1700000000000"): unknown {
  return { retCode: 0, retMsg: "OK", result, retExtInfo: {}, time };
}
