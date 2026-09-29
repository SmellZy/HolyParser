import { createHash } from "node:crypto";
import type { CanonicalAssetId } from "@arbitrage/market-data";
import type { WorkBudget } from "./bounds.js";
import { EXPOSURE_KEY_VERSION } from "./policy.js";

export type CanonicalValue =
  | boolean
  | null
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };
export const compareUtf8 = (a: string, b: string): number =>
  Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
const SERIALIZATION_UNITS_PER_STEP = 128;
class SerializationMeter {
  #units = 0;
  constructor(private readonly work?: WorkBudget) {}
  charge(units = 1): void {
    this.#units += units;
    while (this.#units >= SERIALIZATION_UNITS_PER_STEP) {
      this.work?.step();
      this.#units -= SERIALIZATION_UNITS_PER_STEP;
    }
  }
  finish(): void {
    if (this.#units > 0) this.work?.step();
    this.#units = 0;
  }
}
const chargeText = (value: string, meter: SerializationMeter): void => {
  // Charge a conservative UTF-8 upper bound before the native byte scan.
  meter.charge(Math.max(1, Math.ceil((value.length * 4) / 128)) * 128);
};
export const compareUtf8WithBudget =
  (work?: WorkBudget) =>
  (a: string, b: string): number => {
    work?.step(Math.max(1, Math.ceil((a.length + b.length) / 128)));
    return compareUtf8(a, b);
  };
function encode(value: CanonicalValue, meter: SerializationMeter): string {
  meter.charge();
  if (value === null || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "string") {
    chargeText(value, meter);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const encoded: string[] = [];
    let joinedLength = 0;
    for (const item of value) {
      meter.charge();
      const part = encode(item, meter);
      encoded.push(part);
      joinedLength += part.length + 1;
    }
    meter.charge(Math.max(1, joinedLength));
    return `[${encoded.join(",")}]`;
  }
  const record = value as Readonly<Record<string, CanonicalValue>>;
  // Authoritative canonical objects are closed to at most 64 keys. Charge
  // their upper-bound enumeration before Object.keys performs native work.
  meter.charge(64);
  const keys = Object.keys(record).sort((a, b) => {
    meter.charge();
    return compareUtf8(a, b);
  });
  const encoded: string[] = [];
  let joinedLength = 0;
  for (const key of keys) {
    meter.charge();
    chargeText(key, meter);
    const part = `${JSON.stringify(key)}:${encode(record[key]!, meter)}`;
    encoded.push(part);
    joinedLength += part.length + 1;
  }
  meter.charge(Math.max(1, joinedLength));
  return `{${encoded.join(",")}}`;
}
export const canonicalSerialize = (
  value: CanonicalValue,
  work?: WorkBudget,
): string => {
  const meter = new SerializationMeter(work);
  const result = `${encode(value, meter)}\n`;
  meter.finish();
  return result;
};
export const sha256 = (
  value: string | Uint8Array,
  work?: WorkBudget,
): string => {
  // The native hash rounds are outside the logical model; input preparation is not.
  work?.step(Math.max(1, Math.ceil(value.length / 4096)));
  work?.step(
    Math.max(
      1,
      Math.ceil(
        (typeof value === "string"
          ? Buffer.byteLength(value, "utf8")
          : value.byteLength) / 4096,
      ),
    ),
  );
  return createHash("sha256").update(value).digest("hex");
};
export const deterministicId = (
  domain: string,
  value: CanonicalValue,
  work?: WorkBudget,
): string => {
  work?.step();
  const canonical = canonicalSerialize(value, work);
  work?.step(Math.max(1, Math.ceil((domain.length + canonical.length) / 4096)));
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
  `${Buffer.byteLength(value, "utf8")}:${value}`;
export function canonicalExposureKey(
  value: CanonicalExposureIdentity,
  work?: WorkBudget,
): string {
  const fields = [
    value.productClass,
    value.baseAssetId,
    value.quoteAssetId,
    value.settlementAssetId,
    value.contractType,
    value.valueConvention,
    value.exposureUnit,
  ];
  let upperBoundBytes = 0;
  for (const field of fields) {
    work?.step();
    upperBoundBytes += field.length * 4;
  }
  work?.step(Math.max(1, Math.ceil(upperBoundBytes / 128)));
  const encoded: string[] = [];
  let joinedLength = 0;
  for (const field of fields) {
    work?.step();
    const part = lp(field);
    encoded.push(part);
    joinedLength += part.length;
  }
  work?.step(Math.max(1, Math.ceil(joinedLength / 128)));
  return `${EXPOSURE_KEY_VERSION}|${encoded.join("")}`;
}
