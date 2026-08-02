import { timestamp, type Timestamp } from "@arbitrage/market-data";
import { OkxSchemaError } from "./errors.js";

const MAX_SUPPORTED_EPOCH_MS = 8_640_000_000_000_000n;

export function epochMilliseconds(value: string, path: string): Timestamp {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new OkxSchemaError(`${path} must be an unsigned millisecond epoch.`);
  }
  const parsed = BigInt(value);
  if (parsed > MAX_SUPPORTED_EPOCH_MS) {
    throw new OkxSchemaError(`${path} exceeds the supported timestamp range.`);
  }
  const date = new Date(Number(parsed));
  if (!Number.isFinite(date.getTime())) {
    throw new OkxSchemaError(`${path} is not a valid timestamp.`);
  }
  return timestamp(date.toISOString());
}

export function durationBetweenEpochMilliseconds(
  earlier: string,
  later: string,
  path: string,
): string {
  if (!/^(?:0|[1-9]\d*)$/.test(earlier) || !/^(?:0|[1-9]\d*)$/.test(later)) {
    throw new OkxSchemaError(`${path} requires millisecond epoch strings.`);
  }
  const difference = BigInt(later) - BigInt(earlier);
  if (difference <= 0n || difference % 1_000n !== 0n) {
    throw new OkxSchemaError(
      `${path} must be a positive whole-second interval.`,
    );
  }
  return (difference / 1_000n).toString();
}
