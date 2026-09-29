import { describe, expect, it } from "vitest";
import {
  WorkBudget,
  assertAtomicId,
  assertCompositeId,
  assertEvidenceRecord,
  assertOperationResourceCounts,
  assertOutputBound,
  assertReasonText,
  parseBoundedJson,
} from "./bounds.js";
import { boundedDiagnostics } from "./diagnostics.js";
import { MATCHING_LIMITS } from "./policy.js";

describe("D-064 resource boundaries", () => {
  it.each([
    ["instruments", MATCHING_LIMITS.instruments],
    ["bindings", MATCHING_LIMITS.bindings],
    ["aliases", MATCHING_LIMITS.bindings],
    ["partnersPerInstrument", MATCHING_LIMITS.partnersPerInstrument],
    ["candidatePairs", MATCHING_LIMITS.candidatePairs],
    ["mappingVersionsPerMapping", MATCHING_LIMITS.mappingVersionsPerMapping],
    ["mappingEvents", MATCHING_LIMITS.mappingEventRecords],
    ["evidencePerSubject", MATCHING_LIMITS.evidencePerSubject],
    ["evidenceReferences", MATCHING_LIMITS.evidenceReferences],
    ["conflicts", MATCHING_LIMITS.conflicts],
    ["diagnostics", MATCHING_LIMITS.diagnostics],
  ] as const)("accepts %s at bound and rejects one-over", (name, maximum) => {
    assertOperationResourceCounts({ [name]: maximum });
    expect(() =>
      assertOperationResourceCounts({ [name]: maximum + 1 }),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("enforces atomic and composite ID byte/code-unit bounds", () => {
    assertAtomicId("a".repeat(MATCHING_LIMITS.atomicIdUtf16));
    assertAtomicId("😀".repeat(80));
    expect(() =>
      assertAtomicId("a".repeat(MATCHING_LIMITS.atomicIdUtf16 + 1)),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    assertCompositeId("a".repeat(MATCHING_LIMITS.compositeIdUtf8));
    expect(() =>
      assertCompositeId("a".repeat(MATCHING_LIMITS.compositeIdUtf8 + 1)),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("enforces evidence, reason, input and output byte bounds", () => {
    assertEvidenceRecord("a".repeat(MATCHING_LIMITS.evidenceRecordBytes - 2));
    expect(() =>
      assertEvidenceRecord("a".repeat(MATCHING_LIMITS.evidenceRecordBytes)),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    assertReasonText("a".repeat(MATCHING_LIMITS.reasonTextUtf8));
    expect(() =>
      assertReasonText("a".repeat(MATCHING_LIMITS.reasonTextUtf8 + 1)),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    assertOutputBound("a".repeat(MATCHING_LIMITS.outputBytes));
    expect(() =>
      assertOutputBound("a".repeat(MATCHING_LIMITS.outputBytes + 1)),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    expect(() =>
      parseBoundedJson(new Uint8Array(MATCHING_LIMITS.inputBytes + 1)),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("bounds diagnostics and reserves the final truncation record", () => {
    const many = Array.from(
      { length: MATCHING_LIMITS.diagnostics + 1 },
      () => ({ code: "INPUT_INVALID" as const, subject: "PAIR" as const }),
    );
    const result = boundedDiagnostics(many);
    expect(result).toHaveLength(MATCHING_LIMITS.diagnostics);
    expect(result.at(-1)).toEqual({
      code: "DIAGNOSTICS_TRUNCATED",
      subject: "BATCH",
    });
  });

  it("enforces work and cancellation before work, every 128 steps and before publication", () => {
    expect(() => new WorkBudget({ aborted: true })).toThrowError(
      expect.objectContaining({ code: "EVALUATION_CANCELLED" }),
    );
    let aborted = false;
    const signal = {
      get aborted() {
        return aborted;
      },
    };
    const work = new WorkBudget(signal);
    for (let index = 0; index < 127; index += 1) work.step();
    aborted = true;
    expect(() => work.step()).toThrowError(
      expect.objectContaining({ code: "EVALUATION_CANCELLED" }),
    );
    const exhausted = new WorkBudget();
    exhausted.step(MATCHING_LIMITS.logicalSteps);
    expect(() => exhausted.step()).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    aborted = false;
    const beforePublish = new WorkBudget(signal);
    aborted = true;
    expect(() => beforePublish.beforePublication()).toThrowError(
      expect.objectContaining({ code: "EVALUATION_CANCELLED" }),
    );
  });
});

describe("hostile bounded JSON", () => {
  const bytes = (value: string) => new TextEncoder().encode(value);

  it.each([
    ["malformed JSON", bytes("{")],
    ["malformed UTF-8", Uint8Array.from([0xc3, 0x28])],
    ["financial JSON number", bytes('{"price":1}')],
    ["control text", bytes(JSON.stringify({ value: "bad\u0000text" }))],
    [
      "generic array one-over",
      bytes(
        JSON.stringify(
          Array.from({ length: MATCHING_LIMITS.genericArray + 1 }, () => null),
        ),
      ),
    ],
    [
      "object keys one-over",
      bytes(
        JSON.stringify(
          Object.fromEntries(
            Array.from(
              { length: MATCHING_LIMITS.objectKeys + 1 },
              (_, index) => [`k${index}`, null],
            ),
          ),
        ),
      ),
    ],
  ])("rejects %s", (_name, input) => {
    expect(() => parseBoundedJson(input)).toThrowError();
  });

  it("rejects depth and node overflow", () => {
    let nested: unknown = null;
    for (let index = 0; index < MATCHING_LIMITS.jsonDepth - 1; index += 1)
      nested = [nested];
    expect(() => parseBoundedJson(bytes(JSON.stringify(nested)))).not.toThrow();
    nested = [nested];
    expect(() => parseBoundedJson(bytes(JSON.stringify(nested)))).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    const atNodes = [24_999, 24_999, 24_999, 24_998].map((size) =>
      Array.from({ length: size }, () => null),
    );
    expect(() =>
      parseBoundedJson(bytes(JSON.stringify(atNodes))),
    ).not.toThrow();
    atNodes[3]!.push(null);
    expect(() => parseBoundedJson(bytes(JSON.stringify(atNodes)))).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("accepts generic array and input byte boundaries and rejects one-over", () => {
    const atArray = Array.from(
      { length: MATCHING_LIMITS.genericArray },
      () => null,
    );
    expect(() =>
      parseBoundedJson(bytes(JSON.stringify(atArray))),
    ).not.toThrow();
    atArray.push(null);
    expect(() => parseBoundedJson(bytes(JSON.stringify(atArray)))).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    const atInput = `"${"a".repeat(MATCHING_LIMITS.inputBytes - 2)}"`;
    expect(Buffer.byteLength(atInput)).toBe(MATCHING_LIMITS.inputBytes);
    expect(() => parseBoundedJson(bytes(atInput))).not.toThrow();
    expect(() => parseBoundedJson(bytes(`${atInput} `))).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("rejects executable reason text", () => {
    expect(() => assertReasonText("https://host.invalid/secret")).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
    expect(() => assertReasonText("<script>alert(1)</script>")).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
  });
});
