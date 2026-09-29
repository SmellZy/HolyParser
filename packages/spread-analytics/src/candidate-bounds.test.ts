import { canonicalAssetId } from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import { generateCandidates } from "./candidates.js";
import { MatchingFailure } from "./reasons.js";
import { T30, instrument, registry } from "./test-fixtures.js";

function grouped(sizes: readonly number[]) {
  return sizes.flatMap((size, groupIndex) =>
    Array.from({ length: size }, (_, memberIndex) =>
      instrument({
        name: `G${groupIndex}_M${memberIndex}`,
        venue: `VENUE_${groupIndex}_${memberIndex}`,
        base: canonicalAssetId(`asset:GROUP_${groupIndex}`),
      }),
    ),
  );
}

describe("bounded deterministic candidate generation", () => {
  it("fails atomically when 8,192 valid pairs exceed cumulative work", () => {
    const instruments = grouped([
      32, 32, 32, 32, 32, 32, 32, 32, 33, 33, 33, 33, 33, 33, 33, 33,
    ]);
    // The pair-count ceiling is not a promise to exceed the independent
    // 100,000-step operation ceiling; no partial top-N result may escape.
    expect(
      [32, 32, 32, 32, 32, 32, 32, 32, 33, 33, 33, 33, 33, 33, 33, 33]
        .map((size) => (size * (size - 1)) / 2)
        .reduce((sum, pairs) => sum + pairs, 0),
    ).toBe(8_192);
    expect(() =>
      generateCandidates(instruments, registry(instruments), T30, T30),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("rejects the 8,193rd pair before publication", () => {
    const instruments = grouped([
      31, 32, 32, 32, 32, 32, 32, 33, 33, 33, 33, 33, 33, 33, 33, 33,
    ]);
    expect(() =>
      generateCandidates(instruments, registry(instruments), T30, T30),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("rejects partner 33 rather than selecting a top-N subset", () => {
    const instruments = grouped([34]);
    expect(() =>
      generateCandidates(instruments, registry(instruments), T30, T30),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("rejects duplicate opaque instrument identities", () => {
    const item = instrument({ name: "DUPLICATE" });
    expect(() =>
      generateCandidates([item, item], registry([item]), T30, T30),
    ).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_EXPOSURE_CONFLICT" }),
    );
  });

  it("publishes nothing when cancelled at preflight", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    expect(() =>
      generateCandidates([left, right], registry([left, right]), T30, T30, {
        aborted: true,
      }),
    ).toThrowError(MatchingFailure);
  });

  it("binds machine-proposal provenance and both leg digests", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const [candidate] = generateCandidates(
      [left, right],
      registry([left, right]),
      T30,
      T30,
    );
    expect(candidate).toMatchObject({
      proposerId: "DETERMINISTIC_EVALUATOR",
      createdAt: T30,
      effectiveAt: T30,
      leftMetadataDigest: "OKX-digest",
      rightMetadataDigest: "BINANCE-digest",
      leftEconomicsRevision: "OKX-economics-v1",
      rightEconomicsRevision: "BINANCE-economics-v1",
      confidence: "EXACT_METADATA",
    });
  });
});
