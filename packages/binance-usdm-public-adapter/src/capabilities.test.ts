import { describe, expect, it } from "vitest";
import {
  binanceUsdmCapabilityEvidence,
  binanceUsdmPublicCapabilities,
} from "./capabilities.js";

describe("Binance USD-M capability declarations", () => {
  it("keeps supported, unsupported and unverified states explicit", () => {
    expect(binanceUsdmPublicCapabilities.REST_ORDER_BOOK_SNAPSHOT.state).toBe(
      "SUPPORTED",
    );
    expect(
      binanceUsdmPublicCapabilities.WEBSOCKET_ORDER_BOOK_SNAPSHOT.state,
    ).toBe("UNSUPPORTED");
    expect(binanceUsdmPublicCapabilities.PREDICTED_FUNDING.state).toBe(
      "UNVERIFIED",
    );
    expect(binanceUsdmPublicCapabilities.CHECKSUM_VALIDATION.state).toBe(
      "UNVERIFIED",
    );
  });

  it("requires official source IDs for every supported capability", () => {
    for (const declaration of Object.values(binanceUsdmPublicCapabilities)) {
      if (declaration.state === "SUPPORTED") {
        expect(declaration.sourceIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps undocumented contract types research-required", () => {
    expect(binanceUsdmCapabilityEvidence.undocumentedContractTypes.state).toBe(
      "RESEARCH_REQUIRED",
    );
    expect(binanceUsdmCapabilityEvidence.specialFundingRate.state).toBe(
      "RESEARCH_REQUIRED",
    );
  });
});
