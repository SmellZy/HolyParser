import type { WorkBudget } from "./bounds.js";
import { MatchingFailure } from "./reasons.js";

// Phase 2B.1 accepts exactly one timestamp grammar: canonical RFC 3339 UTC
// with millisecond precision, `YYYY-MM-DDTHH:mm:ss.sssZ` (24 code units), the
// form produced by `Date.prototype.toISOString` for years 0000-9999. No
// offsets, no local or legacy formats and no host time-zone dependence:
// the instant is computed with integer calendar arithmetic, never Date.parse.
export const TIMESTAMP_LENGTH = 24;

const invalid = (): never => {
  throw new MatchingFailure("EVIDENCE_TIME_INVALID", "Invalid timestamp.");
};

function digits(value: string, start: number, count: number): number {
  let result = 0;
  for (let index = start; index < start + count; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x30 || code > 0x39) invalid();
    result = result * 10 + (code - 0x30);
  }
  return result;
}

// Days from 1970-01-01 in the proleptic Gregorian calendar (H. Hinnant).
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146_097 + doe - 719_468;
}

/**
 * Validates a caller timestamp and returns its UTC epoch milliseconds. The
 * length is bounded before any scan; the fixed-size scan is charged first.
 */
export function epoch(value: unknown, work?: WorkBudget): bigint {
  if (typeof value !== "string" || value.length !== TIMESTAMP_LENGTH) invalid();
  const text = value as string;
  work?.units(TIMESTAMP_LENGTH + 1);
  if (
    text.charCodeAt(4) !== 0x2d ||
    text.charCodeAt(7) !== 0x2d ||
    text.charCodeAt(10) !== 0x54 ||
    text.charCodeAt(13) !== 0x3a ||
    text.charCodeAt(16) !== 0x3a ||
    text.charCodeAt(19) !== 0x2e ||
    text.charCodeAt(23) !== 0x5a
  )
    invalid();
  const year = digits(text, 0, 4);
  const month = digits(text, 5, 2);
  const day = digits(text, 8, 2);
  const hour = digits(text, 11, 2);
  const minute = digits(text, 14, 2);
  const second = digits(text, 17, 2);
  const millisecond = digits(text, 20, 3);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
  if (
    days === undefined ||
    day < 1 ||
    day > days ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    invalid();
  return (
    BigInt(daysFromCivil(year, month, day)) * 86_400_000n +
    BigInt(((hour * 60 + minute) * 60 + second) * 1_000 + millisecond)
  );
}
