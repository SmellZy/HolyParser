import {
  evaluateFreshness,
  type FreshnessPolicy,
  type QualityState,
  type Timestamp,
} from "@arbitrage/market-data";
import { OKX_PRODUCT_GROUP, OKX_VENUE } from "./constants.js";
import { OkxAdapterError, OkxSchemaError } from "./errors.js";

export interface OkxFreshnessConfiguration {
  readonly policy: FreshnessPolicy;
  readonly maximumFutureSkewMs: bigint;
}

export function assertOkxFreshnessConfiguration(
  configuration: OkxFreshnessConfiguration,
  channel: string,
): void {
  if (
    configuration.policy.venue !== OKX_VENUE ||
    configuration.policy.productGroup !== OKX_PRODUCT_GROUP ||
    configuration.policy.channel !== channel ||
    configuration.maximumFutureSkewMs < 0n
  ) {
    throw new OkxAdapterError(
      `Freshness policy must target OKX ${channel} with a non-negative future-skew bound.`,
      "CONFIGURATION",
      "OKX-01",
    );
  }
}

export function timestampToEpochMilliseconds(
  value: Timestamp,
  path: string,
): bigint {
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new OkxSchemaError(`${path} is outside the supported time range.`);
  }
  return BigInt(parsed);
}

export function qualityForExchangeTimestamp(
  exchangeTimestamp: Timestamp,
  receiveTimestamp: Timestamp,
  configuration: OkxFreshnessConfiguration,
): QualityState {
  const exchangeMs = timestampToEpochMilliseconds(
    exchangeTimestamp,
    "exchange timestamp",
  );
  const receiveMs = timestampToEpochMilliseconds(
    receiveTimestamp,
    "receive timestamp",
  );
  const futureBy = exchangeMs - receiveMs;
  if (futureBy > configuration.maximumFutureSkewMs) {
    return "STALE";
  }
  const age = exchangeMs > receiveMs ? 0n : receiveMs - exchangeMs;
  return evaluateFreshness(age, configuration.policy, "HEALTHY");
}

export function observationLags(
  exchangeTimestamp: Timestamp,
  receiveTimestamp: Timestamp,
  processingTimestamp: Timestamp,
): Readonly<{
  receiveLagMs: bigint;
  processingLagMs: bigint;
  processingEpochSeconds: bigint;
}> {
  const exchangeMs = timestampToEpochMilliseconds(
    exchangeTimestamp,
    "exchange timestamp",
  );
  const receiveMs = timestampToEpochMilliseconds(
    receiveTimestamp,
    "receive timestamp",
  );
  const processingMs = timestampToEpochMilliseconds(
    processingTimestamp,
    "processing timestamp",
  );
  if (processingMs < receiveMs) {
    throw new OkxSchemaError(
      "Processing timestamp cannot precede receive timestamp.",
    );
  }
  return Object.freeze({
    receiveLagMs: receiveMs > exchangeMs ? receiveMs - exchangeMs : 0n,
    processingLagMs: processingMs - receiveMs,
    processingEpochSeconds: processingMs / 1_000n,
  });
}
