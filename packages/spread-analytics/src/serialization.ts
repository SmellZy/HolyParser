import { createHash } from "node:crypto";
import type { CanonicalAssetId } from "@arbitrage/market-data";
import { WorkBudget, assertAtomicId } from "./bounds.js";
import { MatchingFailure } from "./reasons.js";
import { inputBoundary, snapshotInput } from "./snapshot.js";
import { EXPOSURE_KEY_VERSION, MATCHING_LIMITS } from "./policy.js";

export type CanonicalValue =
  | boolean
  | null
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };
export const compareUtf8 = (a: string, b: string): number =>
  Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
// Every native pass below is charged to the caller's operation budget in
// units (see WorkBudget.units) before it runs; output bytes are unchanged.
export const compareUtf8WithBudget =
  (work?: WorkBudget) =>
  (a: string, b: string): number => {
    // Two UTF-8 encodings (one pass per code unit) plus one byte comparison
    // over at most three bytes per code unit of the shorter operand.
    work?.units(a.length + b.length + 3 * Math.min(a.length, b.length) + 1);
    return compareUtf8(a, b);
  };
// JSON string quoting scans the input once; escape expansion (at most six
// output code units per input code unit) is charged as soon as it is known,
// before any further work consumes the encoded string.
function quote(value: string, work?: WorkBudget): string {
  work?.units(value.length + 2);
  const encoded = JSON.stringify(value);
  work?.units(encoded.length - value.length - 2);
  return encoded;
}
function encode(value: CanonicalValue, work?: WorkBudget): string {
  work?.units(1);
  if (value === null || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "string") return quote(value, work);
  if (Array.isArray(value)) {
    work?.units(value.length);
    const encoded: string[] = [];
    let joinedLength = 0;
    for (const item of value) {
      const part = encode(item, work);
      encoded.push(part);
      joinedLength += part.length + 1;
    }
    work?.units(joinedLength + 2);
    // work: rope build; the join was charged (joinedLength + 2) above.
    return `[${encoded.join(",")}]`;
  }
  const record = value as Readonly<Record<string, CanonicalValue>>;
  // Authoritative canonical objects are closed to at most 64 keys. Charge
  // their upper-bound enumeration before Object.keys performs native work.
  work?.units(MATCHING_LIMITS.objectKeys);
  const unsorted = Object.keys(record);
  if (unsorted.length > MATCHING_LIMITS.objectKeys)
    work?.units(unsorted.length - MATCHING_LIMITS.objectKeys);
  const keys = unsorted.sort(compareUtf8WithBudget(work));
  const encoded: string[] = [];
  let joinedLength = 0;
  for (const key of keys) {
    work?.units(1);
    // work: rope; flattened by the join charged via joinedLength below.
    const part = `${quote(key, work)}:${encode(record[key]!, work)}`;
    encoded.push(part);
    joinedLength += part.length + 1;
  }
  work?.units(joinedLength + 2);
  // work: rope build; the join was charged (joinedLength + 2) above.
  return `{${encoded.join(",")}}`;
}
export const canonicalSerialize = (
  value: CanonicalValue,
  work?: WorkBudget,
): string => {
  const encoded = encode(value, work);
  // Appending the newline builds a rope; its flattening is charged by the
  // consumer that copies or hashes the result.
  work?.units(1);
  // work: rope; its flattening is charged by the consuming hash/compare.
  return `${encoded}\n`;
};
export const sha256 = (
  value: string | Uint8Array,
  work?: WorkBudget,
): string => {
  // The native hash rounds are outside the logical model; input preparation
  // is not: a string input is flattened and UTF-8 encoded in one pass.
  work?.units(
    (typeof value === "string" ? value.length : value.byteLength) + 1,
  );
  return createHash("sha256").update(value).digest("hex");
};
export const deterministicId = (
  domain: string,
  value: CanonicalValue,
  work?: WorkBudget,
): string => {
  work?.units(1);
  const canonical = canonicalSerialize(value, work);
  // Domain concatenation is flattened (copied) before encoding.
  work?.units(domain.length + canonical.length + 1);
  // work: concatenation charged (domain + canonical + 1) just above.
  return sha256(`${domain}\n${canonical}`, work);
};
export interface CanonicalExposureIdentity {
  readonly productClass: "DERIVATIVE";
  readonly baseAssetId: CanonicalAssetId;
  readonly quoteAssetId: CanonicalAssetId;
  readonly settlementAssetId: CanonicalAssetId;
  readonly contractType: "PERPETUAL";
  readonly valueConvention: "LINEAR";
  readonly exposureUnit: "BASE_UNIT";
}
const lp = (value: string): string =>
  // work: charged by the caller (2 x length + 12 per field).
  `${Buffer.byteLength(value, "utf8")}:${value}`;
/**
 * Public key helper: validates the closed identity and bounds every asset ID
 * before any proportional work, on its own operation budget (M-02).
 */
export function canonicalExposureKey(
  callerValue: CanonicalExposureIdentity,
): string {
  const work = new WorkBudget();
  return inputBoundary(() => {
    const value = snapshotInput(callerValue, work);
    const result = exposureKeyFromSnapshot(value, work);
    work.beforePublication();
    return result;
  });
}
function exposureKeyFromSnapshot(
  value: CanonicalExposureIdentity,
  work: WorkBudget,
): string {
  if (
    value === null ||
    typeof value !== "object" ||
    value.productClass !== "DERIVATIVE" ||
    value.contractType !== "PERPETUAL" ||
    value.valueConvention !== "LINEAR" ||
    value.exposureUnit !== "BASE_UNIT"
  )
    throw new MatchingFailure("INPUT_INVALID", "Exposure identity is invalid.");
  assertAtomicId(value.baseAssetId, "Base asset", work);
  assertAtomicId(value.quoteAssetId, "Quote asset", work);
  assertAtomicId(value.settlementAssetId, "Settlement asset", work);
  return canonicalExposureKeyWithBudget(value, work);
}
export function canonicalExposureKeyWithBudget(
  value: CanonicalExposureIdentity,
  work?: WorkBudget,
): string {
  work?.units(7);
  const fields = [
    value.productClass,
    value.baseAssetId,
    value.quoteAssetId,
    value.settlementAssetId,
    value.contractType,
    value.valueConvention,
    value.exposureUnit,
  ];
  const encoded: string[] = [];
  let joinedLength = 0;
  for (const field of fields) {
    // UTF-8 byte-length pass plus the length-prefixed part construction.
    work?.units(2 * field.length + 12);
    const part = lp(field);
    encoded.push(part);
    joinedLength += part.length;
  }
  work?.units(joinedLength + EXPOSURE_KEY_VERSION.length + 1);
  // work: join charged (joinedLength + version + 1) just above.
  return `${EXPOSURE_KEY_VERSION}|${encoded.join("")}`;
}
