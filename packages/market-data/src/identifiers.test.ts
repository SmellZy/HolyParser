import { describe, expect, it } from "vitest";

import {
  canonicalAssetId,
  instrumentId,
  mappingActorId,
  officialAssetReference,
  officialInstrumentId,
  productGroup,
  sameInstrument,
  settlementAsset,
  validateManualAssetMapping,
  venue,
  type InstrumentIdentity,
} from "./identifiers.js";
import { sourceId, timestamp } from "./quality.js";

function identity(officialId: string, settlement: string): InstrumentIdentity {
  return {
    venue: venue("binance-futures"),
    productGroup: productGroup("usds-m-futures"),
    officialInstrumentId: officialInstrumentId(officialId),
    marketType: "PERPETUAL",
    settlementAsset: settlementAsset(canonicalAssetId(settlement)),
  };
}

describe("canonical identifiers", () => {
  it("uses every required CEX identity component", () => {
    const original = identity("BTCUSDT", "asset:usdt");
    const changedVenue = {
      ...original,
      venue: venue("bybit"),
    };
    const changedProduct = {
      ...original,
      productGroup: productGroup("coin-m-futures"),
    };
    const changedOfficialId = identity("BTC-USDT-SWAP", "asset:usdt");
    const changedMarketType = {
      ...original,
      marketType: "FUTURE" as const,
    };
    const changedSettlement = identity("BTCUSDT", "asset:usdc");

    for (const candidate of [
      changedVenue,
      changedProduct,
      changedOfficialId,
      changedMarketType,
      changedSettlement,
    ]) {
      expect(sameInstrument(original, candidate)).toBe(false);
    }
  });

  it("never merges USDT and USDC instruments", () => {
    const usdt = identity("BTC-PERP", "asset:usdt");
    const usdc = identity("BTC-PERP", "asset:usdc");

    expect(instrumentId(usdt)).not.toBe(instrumentId(usdc));
  });

  it("does not depend on a display ticker or concatenated symbol", () => {
    const first = identity("venue-native-4711", "asset:usdt");
    const second = identity("venue-native-4712", "asset:usdt");

    expect(instrumentId(first)).not.toBe(instrumentId(second));
  });

  it("length-prefixes opaque values so delimiters cannot collide", () => {
    const first = identity("A|1:B", "asset:usdt");
    const second = identity("A|1", "asset:b");

    expect(instrumentId(first)).not.toBe(instrumentId(second));
  });

  it("requires four-eyes approval and conflict quarantine evidence", () => {
    const mapping = {
      venue: venue("okx-exchange"),
      productGroup: productGroup("v5-swap-futures"),
      officialAssetReference: officialAssetReference("USDT"),
      canonicalAssetId: canonicalAssetId("asset:usdt"),
      source: sourceId("OKX-01"),
      effectiveAt: timestamp("2026-07-26T12:00:00Z"),
      proposedBy: mappingActorId("market-data-owner"),
    };

    expect(() =>
      validateManualAssetMapping({
        ...mapping,
        state: "APPROVED",
        reviewedBy: mapping.proposedBy,
      }),
    ).toThrow(/distinct four-eyes reviewer/);

    expect(() =>
      validateManualAssetMapping({
        ...mapping,
        state: "CONFLICT_QUARANTINED",
      }),
    ).toThrow(/conflict reason/);

    expect(() =>
      validateManualAssetMapping({
        ...mapping,
        state: "APPROVED",
        reviewedBy: mappingActorId("independent-reviewer"),
      }),
    ).not.toThrow();
  });
});
