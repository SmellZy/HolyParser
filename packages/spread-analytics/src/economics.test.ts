import { describe, expect, it } from "vitest";
import { ExactDecimal } from "@arbitrage/market-data";
import { normalizeBaseExposure, normalizeQuoteNotional } from "./economics.js";
import { MatchingFailure } from "./reasons.js";
describe("exact economics", () => {
  it.each([
    ["1", "1"],
    ["1000", "0.001"],
    ["0.01", "100"],
  ])("normalizes %s x %s exactly", (q, m) =>
    expect(
      normalizeBaseExposure(
        ExactDecimal.parse(q),
        ExactDecimal.parse(m),
      ).toString(),
    ).toBe("1"),
  );
  it("computes quote notional exactly", () =>
    expect(
      normalizeQuoteNotional(
        ExactDecimal.parse("0.001"),
        ExactDecimal.parse("12345.67"),
      ).toString(),
    ).toBe("12.34567"));
  it.each(["0", "-1"])("rejects invalid factor %s", (m) =>
    expect(() =>
      normalizeBaseExposure(ExactDecimal.parse("1"), ExactDecimal.parse(m)),
    ).toThrowError(MatchingFailure),
  );
  it("rejects arithmetic overflow", () =>
    expect(() =>
      normalizeBaseExposure(
        ExactDecimal.parse("9".repeat(78)),
        ExactDecimal.parse("9".repeat(78)),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "DECIMAL_BOUND_EXCEEDED" }),
    ));
});
