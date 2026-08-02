import { timestamp, type Timestamp } from "@arbitrage/market-data";
import { BinanceUsdmSchemaError } from "./errors.js";

export function epochMilliseconds(value: string, path: string): Timestamp {
  if (!/^(?:0|[1-9]\d{0,16})$/.test(value)) {
    throw new BinanceUsdmSchemaError(
      `${path} is not a bounded millisecond timestamp.`,
    );
  }
  const milliseconds = BigInt(value);
  if (milliseconds > 8_640_000_000_000_000n) {
    throw new BinanceUsdmSchemaError(
      `${path} is outside the supported calendar range.`,
    );
  }
  const asNumber = Number(milliseconds);
  if (!Number.isSafeInteger(asNumber)) {
    throw new BinanceUsdmSchemaError(
      `${path} cannot be represented as a calendar timestamp.`,
    );
  }
  const date = new Date(asNumber);
  if (Number.isNaN(date.getTime())) {
    throw new BinanceUsdmSchemaError(
      `${path} is not a valid calendar timestamp.`,
    );
  }
  return timestamp(date.toISOString());
}

export function timestampToEpochMilliseconds(value: Timestamp): bigint {
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new BinanceUsdmSchemaError(
      "RFC3339 timestamp is outside the supported range.",
    );
  }
  return BigInt(parsed);
}
