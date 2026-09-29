import { describe, expect, it } from "vitest";
import { canonicalAssetId } from "@arbitrage/market-data";
import {
  canonicalExposureKey,
  canonicalSerialize,
  deterministicId,
} from "./serialization.js";
describe("canonical serialization", () => {
  it("sorts keys and ends in one LF", () => {
    expect(canonicalSerialize({ z: "x", a: ["b", true] })).toBe(
      '{"a":["b",true],"z":"x"}\n',
    );
  });
  it("encodes the approved exposure key", () => {
    expect(
      canonicalExposureKey({
        productClass: "DERIVATIVE",
        baseAssetId: canonicalAssetId("asset:A"),
        quoteAssetId: canonicalAssetId("asset:USDT"),
        settlementAssetId: canonicalAssetId("asset:USDT"),
        contractType: "PERPETUAL",
        valueConvention: "LINEAR",
        exposureUnit: "BASE_UNIT",
      }),
    ).toBe(
      "instrument-exposure-pilot/v1|10:DERIVATIVE7:asset:A10:asset:USDT10:asset:USDT9:PERPETUAL6:LINEAR9:BASE_UNIT",
    );
  });
  it("has a stable SHA-256 vector", () => {
    expect(deterministicId("test/v1", { a: "b" })).toBe(
      "786dc0d4cb92c23193e62d6f6ef1b0ad5c15d8c47eae0745c7b352fc2e1407ef",
    );
  });
});
