import { describe, expect, it } from "vitest";
import { validateVenueInstrumentEvidence } from "./validation.js";
import { instrument } from "./test-fixtures.js";

describe("closed runtime evidence schema", () => {
  it("accepts a complete public market-data observation plus sidecar evidence", () => {
    expect(() =>
      validateVenueInstrumentEvidence(instrument({ name: "OKX" })),
    ).not.toThrow();
  });

  it.each([
    ["top-level", (value: object) => ({ ...value, surprise: true })],
    [
      "metadata",
      (value: ReturnType<typeof instrument>) => ({
        ...value,
        metadata: { ...value.metadata, surprise: true },
      }),
    ],
    [
      "economics",
      (value: ReturnType<typeof instrument>) => ({
        ...value,
        economics: { ...value.economics, surprise: true },
      }),
    ],
  ])("rejects unknown %s fields", (_name, mutate) => {
    expect(() =>
      validateVenueInstrumentEvidence(
        mutate(instrument({ name: "OKX" })) as never,
      ),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("rejects an unknown lifecycle enum", () => {
    const value = instrument({ name: "OKX" });
    expect(() =>
      validateVenueInstrumentEvidence({
        ...value,
        metadata: { ...value.metadata, lifecycle: "HALTED" },
      } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("rejects unpaired surrogate and control-bearing identifiers", () => {
    const value = instrument({ name: "OKX" });
    expect(() =>
      validateVenueInstrumentEvidence({
        ...value,
        metadataRevision: "bad\ud800",
      } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(() =>
      validateVenueInstrumentEvidence({
        ...value,
        nativeBaseAssetReference: "bad\u0000",
      } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("rejects hostile metadata reason text and unknown sidecar reason codes", () => {
    const value = instrument({ name: "OKX" });
    expect(() =>
      validateVenueInstrumentEvidence({
        ...value,
        metadata: {
          ...value.metadata,
          tickSize: { state: "UNVERIFIED", reason: "https://host.invalid" },
        },
      } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(() =>
      validateVenueInstrumentEvidence({
        ...value,
        economics: {
          ...value.economics,
          baseUnitsPerNativeQuantity: {
            state: "UNVERIFIED",
            reasonCode: "FREE_FORM_REASON",
          },
        },
      } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });
});
