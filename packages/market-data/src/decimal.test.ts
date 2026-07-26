import { readFileSync } from "node:fs";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  DecimalOverflowError,
  DecimalRoundingRequiredError,
  DecimalValidationError,
  ExactDecimal,
  canonicalDecimalWirePolicy,
  price,
  quantity,
} from "./decimal.js";
import { updateId } from "./order-book.js";

const adversarial = JSON.parse(
  readFileSync(
    new URL("../fixtures/adversarial-inputs.json", import.meta.url),
    "utf8",
  ),
) as {
  invalidDecimals: string[];
  malformedSequenceIds: string[];
};

describe("ExactDecimal", () => {
  it("parses plain decimal strings exactly and canonicalizes only exact zeros", () => {
    expect(ExactDecimal.parse("123.4500").toString()).toBe("123.45");
    expect(ExactDecimal.parse("-0.0010").toString()).toBe("-0.001");
    expect(ExactDecimal.parse("-0").toString()).toBe("0");
  });

  it.each(adversarial.invalidDecimals)(
    "rejects adversarial decimal %s",
    (wireValue) => {
      expect(() => ExactDecimal.parse(wireValue)).toThrow(
        DecimalValidationError,
      );
    },
  );

  it("allows scientific notation only under an explicitly named wire policy", () => {
    expect(() => ExactDecimal.parse("1.25e2")).toThrow(DecimalValidationError);
    expect(
      ExactDecimal.parse("1.25e2", {
        ...canonicalDecimalWirePolicy,
        name: "documented-scientific-test/v1",
        notation: "PLAIN_OR_SCIENTIFIC",
      }).toString(),
    ).toBe("125");
  });

  it("rejects excessive scale and precision", () => {
    expect(() => ExactDecimal.parse(`0.${"0".repeat(36)}1`)).toThrow(
      DecimalValidationError,
    );
    expect(() => ExactDecimal.parse("9".repeat(79))).toThrow(
      DecimalValidationError,
    );
    expect(() => ExactDecimal.fromParts(1n, 79)).toThrow(DecimalOverflowError);
    expect(() =>
      ExactDecimal.parse("9".repeat(40)).multiply(
        ExactDecimal.parse("9".repeat(40)),
      ),
    ).toThrow(DecimalOverflowError);
  });

  it("requires an explicit non-exact rounding policy for inexact division", () => {
    const one = ExactDecimal.parse("1");
    const three = ExactDecimal.parse("3");

    expect(() => one.divide(three, 4, "EXACT")).toThrow(
      DecimalRoundingRequiredError,
    );
    expect(one.divide(three, 4, "TOWARD_ZERO").toString()).toBe("0.3333");
    expect(one.divide(three, 4, "AWAY_FROM_ZERO").toString()).toBe("0.3334");
    expect(one.divide(ExactDecimal.parse("8"), 3, "HALF_EVEN").toString()).toBe(
      "0.125",
    );
  });

  it("enforces positive prices and non-negative quantities", () => {
    expect(() => price("0")).toThrow(DecimalValidationError);
    expect(() => price("-1")).toThrow(DecimalValidationError);
    expect(quantity("0").toString()).toBe("0");
    expect(() => quantity("-0.1")).toThrow(DecimalValidationError);
  });

  it.each(adversarial.malformedSequenceIds)(
    "rejects malformed update ID %s",
    (wireValue) => {
      expect(() => updateId(wireValue)).toThrow(TypeError);
    },
  );

  it("preserves update IDs beyond JavaScript safe integer range", () => {
    expect(updateId("90071992547409931234567890").toString()).toBe(
      "90071992547409931234567890",
    );
  });

  it("round-trips generated exact decimal values", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -1_000_000_000_000n, max: 1_000_000_000_000n }),
        fc.integer({ min: 0, max: 12 }),
        (coefficient, scale) => {
          const value = ExactDecimal.fromParts(coefficient, scale);
          const reparsed = ExactDecimal.parse(value.toString());
          expect(reparsed.equals(value)).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });
});
