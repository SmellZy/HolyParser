import {
  evaluateFreshness,
  type FreshnessPolicy,
  type QualityState,
  type Timestamp,
} from "@arbitrage/market-data";
import { BINANCE_USDM_PRODUCT_GROUP, BINANCE_USDM_VENUE } from "./constants.js";
import { BinanceUsdmAdapterError } from "./errors.js";
import { timestampToEpochMilliseconds } from "./time.js";

export interface BinanceUsdmFreshnessConfiguration {
  readonly policy: FreshnessPolicy;
  readonly maximumFutureSkewMs: bigint;
}

export function assertFreshnessConfiguration(
  configuration: BinanceUsdmFreshnessConfiguration,
  channel: string,
): void {
  if (
    configuration.policy.venue !== BINANCE_USDM_VENUE ||
    configuration.policy.productGroup !== BINANCE_USDM_PRODUCT_GROUP ||
    configuration.policy.channel !== channel ||
    configuration.maximumFutureSkewMs < 0n
  ) {
    throw new BinanceUsdmAdapterError(
      `Freshness policy must target Binance USD-M ${channel}.`,
      "CONFIGURATION",
      "BNFUT-01",
    );
  }
}

export function qualityForTimestamp(
  exchangeTimestamp: Timestamp,
  receiveTimestamp: Timestamp,
  configuration: BinanceUsdmFreshnessConfiguration,
): QualityState {
  const exchange = timestampToEpochMilliseconds(exchangeTimestamp);
  const receive = timestampToEpochMilliseconds(receiveTimestamp);
  if (exchange - receive > configuration.maximumFutureSkewMs) return "STALE";
  const age = exchange > receive ? 0n : receive - exchange;
  return evaluateFreshness(age, configuration.policy, "HEALTHY");
}
