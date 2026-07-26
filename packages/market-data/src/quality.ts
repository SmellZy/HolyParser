import type { ProductGroup, Venue } from "./identifiers.js";

declare const timeBrand: unique symbol;
declare const sourceBrand: unique symbol;

export type Timestamp = string & {
  readonly [timeBrand]: "Timestamp";
};

export type SourceId = string & {
  readonly [sourceBrand]: "SourceId";
};

const rfc3339DateTime =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))$/;

export function timestamp(value: string): Timestamp {
  if (typeof value !== "string" || value.length > 64) {
    throw new TypeError("Timestamp must be a valid RFC 3339 date-time.");
  }

  const match = rfc3339DateTime.exec(value);
  if (match === null) {
    throw new TypeError("Timestamp must be a valid RFC 3339 date-time.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];

  if (
    daysInMonth === undefined ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    throw new TypeError("Timestamp must be a valid RFC 3339 date-time.");
  }

  return value as Timestamp;
}

export function sourceId(value: string): SourceId {
  if (!/^[A-Z0-9][A-Z0-9._-]{1,79}$/.test(value)) {
    throw new TypeError("SourceId must be a stable uppercase source key.");
  }
  return value as SourceId;
}

export const qualityStates = [
  "HEALTHY",
  "DEGRADED",
  "STALE",
  "GAPPED",
  "RECONNECTING",
  "UNSUPPORTED",
  "UNVERIFIED",
  "RESEARCH_REQUIRED",
  "DISABLED",
] as const;

export type QualityState = (typeof qualityStates)[number];

export interface ObservationContext {
  readonly exchangeTimestamp?: Timestamp;
  readonly receiveTimestamp: Timestamp;
  readonly processingTimestamp: Timestamp;
  readonly source: SourceId;
  readonly quality: QualityState;
}

export interface FreshnessPolicy {
  readonly id: string;
  readonly venue: Venue;
  readonly productGroup: ProductGroup;
  readonly channel: string;
  readonly healthyWithinMs: bigint;
  readonly staleAfterMs: bigint;
}

export function defineFreshnessPolicy(
  policy: FreshnessPolicy,
): FreshnessPolicy {
  if (
    policy.id.length === 0 ||
    policy.channel.length === 0 ||
    policy.healthyWithinMs < 0n ||
    policy.staleAfterMs <= policy.healthyWithinMs
  ) {
    throw new TypeError("Freshness policy thresholds are invalid.");
  }
  return Object.freeze({ ...policy });
}

const terminalOrExternalQuality = new Set<QualityState>([
  "GAPPED",
  "RECONNECTING",
  "UNSUPPORTED",
  "UNVERIFIED",
  "RESEARCH_REQUIRED",
  "DISABLED",
]);

export function evaluateFreshness(
  ageMs: bigint,
  policy: FreshnessPolicy,
  currentQuality: QualityState,
): QualityState {
  if (ageMs < 0n) {
    throw new TypeError("Observation age cannot be negative.");
  }
  if (terminalOrExternalQuality.has(currentQuality)) {
    return currentQuality;
  }
  if (ageMs > policy.staleAfterMs) {
    return "STALE";
  }
  if (ageMs > policy.healthyWithinMs || currentQuality === "DEGRADED") {
    return "DEGRADED";
  }
  return "HEALTHY";
}
