import { describe, expect, it } from "vitest";
import type { AssetRegistryRevision } from "./model.js";
import { CuratedAssetRegistry } from "./registry.js";
import { T0, instrument, registry } from "./test-fixtures.js";

const revision = (): AssetRegistryRevision =>
  registry([instrument({ name: "OKX" })]).revision;

describe("closed curated registry schema", () => {
  it("rejects unknown fields and invalid binding roles", () => {
    expect(
      () =>
        new CuratedAssetRegistry({ ...revision(), surprise: true } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));

    const base = revision();
    expect(
      () =>
        new CuratedAssetRegistry({
          ...base,
          bindings: [
            { ...base.bindings[0]!, role: "COLLATERAL", effectiveFrom: T0 },
          ],
        } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("rejects unknown fields inside asset, binding, and alias records", () => {
    const base = revision();
    expect(
      () =>
        new CuratedAssetRegistry({
          ...base,
          assets: [{ ...base.assets[0]!, surprise: true }],
        } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(
      () =>
        new CuratedAssetRegistry({
          ...base,
          bindings: [{ ...base.bindings[0]!, surprise: true }],
        } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });
});
