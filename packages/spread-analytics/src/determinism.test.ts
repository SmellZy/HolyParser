import { describe, expect, it } from "vitest";
import { generateCandidates } from "./candidates.js";
import { evaluateMatch } from "./evaluator.js";
import { CuratedAssetRegistry } from "./registry.js";
import {
  T30,
  approvedMapping,
  instrument,
  mappingAdmission,
  registry,
} from "./test-fixtures.js";

describe("property and permutation determinism", () => {
  it("is invariant to input, registry-binding, and venue-leg ordering", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const assets = registry([left, right]);
    const reversedAssets = new CuratedAssetRegistry({
      ...assets.revision,
      bindings: [...assets.revision.bindings].reverse(),
      aliases: [...assets.revision.aliases].reverse(),
    });
    expect(generateCandidates([left, right], assets, T30, T30)).toEqual(
      generateCandidates([right, left], reversedAssets, T30, T30),
    );
    const mapping = approvedMapping(left, right);
    const first = evaluateMatch({
      left,
      right,
      registry: assets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      mapping: mappingAdmission(left, right, assets, mapping),
    });
    const reversed = evaluateMatch({
      left: right,
      right: left,
      registry: reversedAssets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      mapping: mappingAdmission(left, right, reversedAssets, mapping),
    });
    expect(reversed).toEqual(first);
  });
});
