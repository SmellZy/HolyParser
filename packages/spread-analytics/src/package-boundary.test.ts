import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("workspace boundary", () => {
  it("has one public root export and only the approved internal dependency", () => {
    const manifest = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../package.json", import.meta.url)),
        "utf8",
      ),
    ) as {
      dependencies: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(Object.keys(manifest.exports)).toEqual(["."]);
    expect(manifest.dependencies).toEqual({
      "@arbitrage/market-data": "0.1.0",
    });
  });
});
