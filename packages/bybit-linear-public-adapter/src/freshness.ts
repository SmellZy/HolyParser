import type { QualityState, Timestamp } from "@arbitrage/market-data";
import { BybitLinearSchemaError } from "./errors.js";

export interface BybitFreshnessPolicy {
  readonly healthyAgeMs: number;
  readonly staleAgeMs: number;
  readonly maximumFutureSkewMs: number;
}

export function qualityForTimestamp(
  observed: Timestamp,
  received: Timestamp,
  policy: BybitFreshnessPolicy,
): QualityState {
  for (const value of [
    policy.healthyAgeMs,
    policy.staleAgeMs,
    policy.maximumFutureSkewMs,
  ]) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new BybitLinearSchemaError(
        "Freshness bounds must be non-negative safe integers.",
      );
  }
  if (policy.staleAgeMs < policy.healthyAgeMs)
    throw new BybitLinearSchemaError(
      "Stale age must not be below healthy age.",
    );
  const age = Date.parse(received) - Date.parse(observed);
  if (!Number.isFinite(age)) return "STALE";
  if (age < -policy.maximumFutureSkewMs || age > policy.staleAgeMs)
    return "STALE";
  return age <= policy.healthyAgeMs ? "HEALTHY" : "DEGRADED";
}
