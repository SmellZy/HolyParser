import { describe, expect, it } from "vitest";
import { MATCH_REASON_CODES } from "./reasons.js";

describe("closed reason-code catalogue", () => {
  it("contains exactly the accepted 44 unique finite codes", () => {
    expect(MATCH_REASON_CODES).toHaveLength(44);
    expect(new Set(MATCH_REASON_CODES).size).toBe(44);
    expect(MATCH_REASON_CODES).not.toContain(expect.stringContaining(" "));
  });
});
