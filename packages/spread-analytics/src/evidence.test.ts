import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "./model.js";
import { validateEvidenceBundle } from "./evidence.js";
import { T0, T30D } from "./test-fixtures.js";

const record = (index: number): EvidenceRecord => ({
  evidenceId: `evidence-${index}`,
  evidenceClass: "FROZEN_METADATA",
  sourceId: "FROZEN_SOURCE",
  sourceRevision: "source-v1",
  sourceDigest: `digest-${index}`,
  productScope: "ORDINARY_LINEAR_PERPETUAL",
  retrievalDate: "2026-09-15",
  recordedAt: T0,
  validFrom: T0,
  validTo: T30D,
  quality: "VERIFIED",
  policyRevision: "instrument-matching-pilot/v1",
});

describe("bounded immutable evidence bundles", () => {
  it("accepts 32 references per subject and returns stable ordering", () => {
    const records = Array.from({ length: 32 }, (_, index) => record(index));
    const shuffled = [...records].reverse();
    expect(
      validateEvidenceBundle(shuffled, [
        {
          subjectId: "instrument-1",
          evidenceIds: records.map((item) => item.evidenceId),
        },
      ]).map((item) => item.evidenceId),
    ).toEqual(
      validateEvidenceBundle(records, [
        {
          subjectId: "instrument-1",
          evidenceIds: records.map((item) => item.evidenceId),
        },
      ]).map((item) => item.evidenceId),
    );
  });

  it("rejects a 33rd subject reference and unknown references", () => {
    const records = Array.from({ length: 33 }, (_, index) => record(index));
    expect(() =>
      validateEvidenceBundle(records, [
        {
          subjectId: "instrument-1",
          evidenceIds: records.map((item) => item.evidenceId),
        },
      ]),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    expect(() =>
      validateEvidenceBundle(
        [record(1)],
        [{ subjectId: "instrument-1", evidenceIds: ["missing"] }],
      ),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("rejects unknown evidence fields, classes, and hostile descriptions", () => {
    expect(() =>
      validateEvidenceBundle([{ ...record(1), surprise: true } as never], []),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(() =>
      validateEvidenceBundle(
        [{ ...record(1), evidenceClass: "PRICE_SIMILARITY" } as never],
        [],
      ),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(() =>
      validateEvidenceBundle(
        [{ ...record(1), description: "javascript:alert(1)" }],
        [],
      ),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("requires complete review provenance and the accepted policy revision", () => {
    expect(() =>
      validateEvidenceBundle([{ ...record(1), reviewerId: "reviewer" }], []),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(() =>
      validateEvidenceBundle(
        [
          {
            ...record(1),
            policyRevision: "instrument-matching-pilot/v2",
          } as never,
        ],
        [],
      ),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });
});
