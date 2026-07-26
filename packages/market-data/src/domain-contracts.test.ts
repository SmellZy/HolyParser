import { describe, expect, it } from "vitest";

import {
  capabilityDeclaration,
  defineCapabilities,
  MockPublicMarketDataAdapter,
} from "./mock-adapter.js";
import {
  canonicalAssetId,
  instrumentId,
  officialInstrumentId,
  productGroup,
  settlementAsset,
  venue,
} from "./identifiers.js";
import {
  durationSeconds,
  deriveNormalizedFundingRate8hV1,
  NORMALIZED_FUNDING_8H_VERSION,
  type FundingObservation,
} from "./observations.js";
import { fundingRate } from "./decimal.js";
import {
  defineFreshnessPolicy,
  evaluateFreshness,
  sourceId,
  timestamp,
} from "./quality.js";
import { known, unknown } from "./availability.js";
import { marketDataMetricContracts, metricNames } from "./observability.js";

const testVenue = venue("okx-exchange");
const testProduct = productGroup("v5-swap-futures");
const testSource = sourceId("OKX-01");
const observedAt = timestamp("2026-07-26T12:00:00Z");
const testInstrument = instrumentId({
  venue: testVenue,
  productGroup: testProduct,
  officialInstrumentId: officialInstrumentId("BTC-USDT-SWAP"),
  marketType: "PERPETUAL",
  settlementAsset: settlementAsset(canonicalAssetId("asset:usdt")),
});

function funding(
  rate: FundingObservation["venueNativeRate"],
  interval: FundingObservation["interval"],
): FundingObservation {
  return {
    kind: "FUNDING",
    instrumentId: testInstrument,
    venueNativeRate: rate,
    semantic: "CURRENT",
    interval,
    observedAt,
    nextSettlementTime: unknown("Not present in this fixture."),
    provenance: {
      sourceId: testSource,
      retrievalDate: "2026-07-26",
    },
    context: {
      exchangeTimestamp: observedAt,
      receiveTimestamp: observedAt,
      processingTimestamp: observedAt,
      source: testSource,
      quality: "HEALTHY",
    },
  };
}

describe("funding observations", () => {
  it("derives a separately named, versioned eight-hour comparison", () => {
    const observation = funding(
      known(fundingRate("0.0001")),
      known(durationSeconds("14400")),
    );
    const derived = deriveNormalizedFundingRate8hV1(observation, 8, "EXACT");

    expect(derived.state).toBe("KNOWN");
    if (derived.state === "KNOWN") {
      expect(derived.value.version).toBe(NORMALIZED_FUNDING_8H_VERSION);
      expect(derived.value.rate.toString()).toBe("0.0002");
      expect(derived.value.sourceNativeRate.toString()).toBe("0.0001");
      expect(derived.value.sourceSemantic).toBe("CURRENT");
    }
  });

  it("keeps normalized funding unknown when native input is unknown", () => {
    expect(
      deriveNormalizedFundingRate8hV1(
        funding(
          unknown("Venue value absent."),
          known(durationSeconds("28800")),
        ),
        8,
        "HALF_EVEN",
      ).state,
    ).toBe("UNKNOWN");
  });
});

describe("capability declarations", () => {
  const fallback = capabilityDeclaration(
    "UNVERIFIED",
    "Official evidence has not been attached.",
  );

  it("rejects a fake port for an unsupported capability", () => {
    const capabilities = defineCapabilities(
      {
        INSTRUMENT_METADATA: capabilityDeclaration(
          "UNSUPPORTED",
          "Official source confirms this is unavailable.",
          [testSource],
        ),
      },
      fallback,
    );

    expect(
      () =>
        new MockPublicMarketDataAdapter(testVenue, testProduct, capabilities, {
          INSTRUMENT_METADATA: {
            capability: "INSTRUMENT_METADATA",
            listInstruments: async () => [],
          },
        }),
    ).toThrow(/must not provide a fake port/);
  });

  it("rejects a supported capability without a concrete port", () => {
    const capabilities = defineCapabilities(
      {
        INSTRUMENT_METADATA: capabilityDeclaration(
          "SUPPORTED",
          "Fixture-backed mock support.",
          [testSource],
        ),
      },
      fallback,
    );

    expect(
      () =>
        new MockPublicMarketDataAdapter(
          testVenue,
          testProduct,
          capabilities,
          {},
        ),
    ).toThrow(/must provide a port/);
  });

  it("rejects a supported capability without source evidence", () => {
    const capabilities = defineCapabilities(
      {
        INSTRUMENT_METADATA: capabilityDeclaration(
          "SUPPORTED",
          "Fixture-backed mock support.",
        ),
      },
      fallback,
    );

    expect(
      () =>
        new MockPublicMarketDataAdapter(testVenue, testProduct, capabilities, {
          INSTRUMENT_METADATA: {
            capability: "INSTRUMENT_METADATA",
            listInstruments: async () => [],
          },
        }),
    ).toThrow(/must cite at least one source ID/);
  });

  it("keeps unsupported, unverified, and research-required distinct", () => {
    const capabilities = defineCapabilities(
      {
        TICKER: capabilityDeclaration("UNSUPPORTED", "Unavailable."),
        MARK_PRICE: capabilityDeclaration("UNVERIFIED", "Not confirmed."),
        CHECKSUM_VALIDATION: capabilityDeclaration(
          "RESEARCH_REQUIRED",
          "Official pages conflict.",
        ),
      },
      fallback,
    );

    expect(capabilities.TICKER.state).toBe("UNSUPPORTED");
    expect(capabilities.MARK_PRICE.state).toBe("UNVERIFIED");
    expect(capabilities.CHECKSUM_VALIDATION.state).toBe("RESEARCH_REQUIRED");
  });
});

describe("freshness policies", () => {
  const policy = defineFreshnessPolicy({
    id: "okx-books/v1",
    venue: testVenue,
    productGroup: testProduct,
    channel: "books",
    healthyWithinMs: 500n,
    staleAfterMs: 2_000n,
  });

  it("uses channel-specific configured thresholds", () => {
    expect(evaluateFreshness(500n, policy, "HEALTHY")).toBe("HEALTHY");
    expect(evaluateFreshness(501n, policy, "HEALTHY")).toBe("DEGRADED");
    expect(evaluateFreshness(2_001n, policy, "HEALTHY")).toBe("STALE");
  });

  it("does not make a gapped stream healthy due to freshness alone", () => {
    expect(evaluateFreshness(0n, policy, "GAPPED")).toBe("GAPPED");
  });

  it("rejects calendar-invalid observation timestamps", () => {
    expect(() => timestamp("2026-02-30T12:00:00Z")).toThrow(/valid RFC 3339/);
    expect(() => timestamp("2024-02-29T12:00:00+02:00")).not.toThrow();
  });
});

describe("observability contracts", () => {
  it("defines each required metric once without instrument labels", () => {
    expect(
      marketDataMetricContracts.map((metric) => metric.name).sort(),
    ).toEqual([...metricNames].sort());
    expect(new Set(metricNames).size).toBe(metricNames.length);
    for (const metric of marketDataMetricContracts) {
      expect(metric.allowedDimensions).not.toContain("instrument_id");
      expect(metric.allowedDimensions).not.toContain("reason");
      expect(metric.allowedDimensions).not.toContain("channel");
    }
  });
});
