import { validateAdapterCapabilities } from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import { BYBIT_LINEAR_CAPABILITIES } from "./capabilities.js";
import { BYBIT_LINEAR_PRODUCT_GROUP, BYBIT_LINEAR_VENUE } from "./constants.js";

describe("Bybit capability declarations", () => {
  it("keeps sequence validation research-required and checksum unverified", () => {
    expect(BYBIT_LINEAR_CAPABILITIES.SEQUENCE_VALIDATION.state).toBe(
      "RESEARCH_REQUIRED",
    );
    expect(BYBIT_LINEAR_CAPABILITIES.CHECKSUM_VALIDATION.state).toBe(
      "UNVERIFIED",
    );
    expect(BYBIT_LINEAR_CAPABILITIES.PREDICTED_FUNDING.state).toBe(
      "UNVERIFIED",
    );
  });
  it("rejects fake ports for research-required capabilities", () =>
    expect(() =>
      validateAdapterCapabilities({
        venue: BYBIT_LINEAR_VENUE,
        productGroup: BYBIT_LINEAR_PRODUCT_GROUP,
        capabilities: BYBIT_LINEAR_CAPABILITIES,
        ports: {
          SEQUENCE_VALIDATION: {
            capability: "SEQUENCE_VALIDATION",
            strategyId: "invented",
          },
        },
      }),
    ).toThrow());
});
