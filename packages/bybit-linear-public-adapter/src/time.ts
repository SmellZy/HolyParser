import { timestamp, type Timestamp } from "@arbitrage/market-data";
import { BybitLinearSchemaError } from "./errors.js";

export function epochMilliseconds(value: string, path: string): Timestamp {
  if (!/^(?:0|[1-9]\d{0,16})$/.test(value))
    throw new BybitLinearSchemaError(
      `${path} is not a valid epoch-millisecond value.`,
    );
  const milliseconds = BigInt(value);
  if (milliseconds > BigInt(8_640_000_000_000_000))
    throw new BybitLinearSchemaError(`${path} exceeds the calendar range.`);
  const date = new Date(Number(milliseconds));
  if (!Number.isFinite(date.getTime()))
    throw new BybitLinearSchemaError(
      `${path} is not a valid calendar timestamp.`,
    );
  return timestamp(date.toISOString());
}
