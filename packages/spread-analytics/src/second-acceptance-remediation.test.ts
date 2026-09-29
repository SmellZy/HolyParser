import { describe, expect, it } from "vitest";
import {
  admitMaterializedMapping,
  type AdmittedMappingHistory,
  type MappingAdmissionInput,
  type MappingAdmissionRecord,
} from "./admission.js";
import { WorkBudget } from "./bounds.js";
import {
  generateCandidates,
  generateCandidatesWithBudget,
} from "./candidates.js";
import { evaluateMatch } from "./evaluator.js";
import { replayMapping } from "./replay.js";
import { canonicalSerialize } from "./serialization.js";
import {
  T0,
  T30,
  admittedHistory,
  approvedMapping,
  instrument,
  mappingAdmission,
  registry,
} from "./test-fixtures.js";
import { validateVenueInstrumentEvidence } from "./validation.js";

function versionTwoFixture() {
  const left = instrument({ name: "OKX" });
  const right = instrument({ name: "BINANCE" });
  const assets = registry([left, right]);
  const mapping = approvedMapping(left, right, "APPROVED", {
    version: 2,
    priorVersion: 1,
  });
  return {
    left,
    right,
    assets,
    input: mappingAdmission(left, right, assets, mapping),
  };
}

function replaceHistoryRecord(
  input: MappingAdmissionInput,
  index: number,
  mutate: (record: MappingAdmissionRecord) => MappingAdmissionRecord,
): MappingAdmissionInput {
  return {
    ...input,
    history: input.history.map((record, current) =>
      current === index ? mutate(record) : record,
    ),
  };
}

function replay(history: AdmittedMappingHistory) {
  return replayMapping({
    mode: "AS_KNOWN",
    history,
    mappingId: history.mappingId,
    evaluationAt: T30,
    knowledgeCutoff: T30,
    replayRevision: "second-remediation-replay",
  });
}

describe("second remediation B-01 full-history provenance admission", () => {
  it("accepts a fully proven two-version history and still permits MATCHED", () => {
    const { left, right, assets, input } = versionTwoFixture();
    expect(admitMaterializedMapping(input, T30)).toMatchObject({
      state: "VALID",
      history: { versions: [{ version: 1 }, { version: 2 }] },
    });
    expect(
      evaluateMatch({
        left,
        right,
        registry: assets,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        mapping: input,
      }),
    ).toMatchObject({ outcome: "MATCHED", reasons: ["COMPATIBLE_APPROVED"] });
  });

  it.each([
    [
      "forged historical policy revision",
      (record: MappingAdmissionRecord) => ({
        ...record,
        mapping: { ...record.mapping, policyRevision: "forged-policy/v999" },
      }),
    ],
    [
      "forged historical evidence revision",
      (record: MappingAdmissionRecord) => ({
        ...record,
        mapping: { ...record.mapping, evidenceRevision: "forged-evidence" },
      }),
    ],
    [
      "forged historical registry revision",
      (record: MappingAdmissionRecord) => ({
        ...record,
        mapping: { ...record.mapping, registryRevision: "forged-registry" },
      }),
    ],
    [
      "missing historical approvals",
      (record: MappingAdmissionRecord) => ({
        ...record,
        mapping: { ...record.mapping, approvals: [] },
      }),
    ],
    [
      "malformed historical digest",
      (record: MappingAdmissionRecord) => ({
        ...record,
        command: { ...record.command, commandDigest: "forged-digest" },
      }),
    ],
    [
      "historical reviewer separation failure",
      (record: MappingAdmissionRecord) => ({
        ...record,
        review: {
          ...record.review,
          proposerId: record.review.approvals[0]!.actorId,
        },
      }),
    ],
    [
      "invalid supersededBy=999",
      (record: MappingAdmissionRecord) => ({
        ...record,
        mapping: { ...record.mapping, supersededBy: 999 },
      }),
    ],
    [
      "structurally forged JS record",
      (record: MappingAdmissionRecord) =>
        ({ ...record, injectedAuthority: true }) as MappingAdmissionRecord,
    ],
  ] as const)(
    "rejects %s before current mapping can match",
    (_name, mutate) => {
      const { left, right, assets, input } = versionTwoFixture();
      const forged = replaceHistoryRecord(input, 0, mutate);
      expect(admitMaterializedMapping(forged, T30).state).not.toBe("VALID");
      expect(
        evaluateMatch({
          left,
          right,
          registry: assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          mapping: forged,
        }).outcome,
      ).not.toBe("MATCHED");
    },
  );
});

describe("second remediation B-02 admitted-history immutability", () => {
  it("replay is byte-stable after mutation of caller-owned nested history", () => {
    const { input } = versionTwoFixture();
    const mutable = structuredClone(input) as MappingAdmissionInput;
    const admitted = admitMaterializedMapping(mutable, T30);
    if (admitted.history === undefined) throw new Error(admitted.reason);
    const before = JSON.stringify(replay(admitted.history));
    const first = mutable.history[0] as {
      mapping: {
        status: string;
        supersededBy?: number;
        evidenceRevision: string;
        registryRevision: string;
        effectiveTo: string;
      };
      review: { approvals: Array<{ actorId: string }> };
    };
    first.mapping.status = "INVALIDATED";
    first.mapping.supersededBy = 999;
    first.mapping.evidenceRevision = "mutated-evidence";
    first.mapping.registryRevision = "mutated-registry";
    first.mapping.effectiveTo = T0;
    first.review.approvals[0]!.actorId = "mutated-reviewer";
    const after = JSON.stringify(replay(admitted.history));
    expect(after).toBe(before);
    expect(Object.isFrozen(admitted.history)).toBe(true);
    expect(Object.isFrozen(admitted.history.versions)).toBe(true);
    expect(Object.isFrozen(admitted.history.versions[0]!.approvals)).toBe(true);
  });

  it("rejects a forged structural history handle at runtime", () => {
    const { input } = versionTwoFixture();
    const genuine = admittedHistory(input);
    const forged = { ...genuine } as AdmittedMappingHistory;
    expect(() => replay(forged)).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
  });
});

describe("second remediation H-01 product scope before identity", () => {
  it.each([
    ["SPOT", { marketType: "SPOT", contract: "PERPETUAL" }],
    ["dated future", { marketType: "FUTURE", contract: "DATED_FUTURE" }],
    ["unsupported family", { marketType: "FUTURE", contract: "OTHER" }],
    ["unknown product", { marketType: "FUTURE", contract: "UNKNOWN" }],
    ["option-like", { marketType: "OPTION", contract: "OPTION" }],
    [
      "inverse",
      { marketType: "PERPETUAL", contract: "PERPETUAL", convention: "INVERSE" },
    ],
  ] as const)("does not assert a final exposure for %s", (_name, options) => {
    const left = instrument({ name: `LEFT_${_name}`, ...options });
    const right = instrument({ name: `RIGHT_${_name}`, ...options });
    const [candidate] = generateCandidates(
      [left, right],
      registry([left, right]),
      T30,
      T30,
    );
    expect(candidate).toBeDefined();
    expect(candidate?.exposureKey).toBeUndefined();
    expect(candidate?.provisionalIdentity?.valueConvention).toBeUndefined();
    expect(candidate?.provisionalIdentity?.exposureUnit).toBeUndefined();
    if (_name !== "inverse") {
      expect(candidate?.provisionalIdentity?.productClass).toBeUndefined();
      expect(candidate?.provisionalIdentity?.contractType).toBeUndefined();
    }
  });

  it("materializes the exact identity only for a supported linear perpetual", () => {
    const left = instrument({ name: "SUPPORTED_LEFT" });
    const right = instrument({ name: "SUPPORTED_RIGHT" });
    const [candidate] = generateCandidates(
      [left, right],
      registry([left, right]),
      T30,
      T30,
    );
    expect(candidate?.exposureKey).toContain("instrument-exposure-pilot/v1");
    expect(candidate?.provisionalIdentity).toMatchObject({
      productClass: "DERIVATIVE",
      contractType: "PERPETUAL",
      valueConvention: "LINEAR",
      exposureUnit: "BASE_UNIT",
    });
  });
});

describe("second remediation H-03 operation-wide work accounting", () => {
  it("accounts nested validation and canonical serialization with gap <=128", () => {
    const gaps: number[] = [];
    const work = new WorkBudget(undefined, {
      checked(gap) {
        gaps.push(gap);
      },
    });
    const item = instrument({ name: "VALIDATION_ACCOUNTING" });
    validateVenueInstrumentEvidence(item, work);
    canonicalSerialize(
      Array.from({ length: 8_000 }, (_, index) => ({
        id: `record-${index}`,
        values: ["a", "b", "c"],
      })),
      work,
    );
    work.beforePublication();
    expect(work.steps).toBeGreaterThan(1_000);
    expect(Math.max(...gaps)).toBe(128);
  });

  it("accounts candidate sorting/traversal under one operation budget", () => {
    const items = Array.from({ length: 20 }, (_, index) =>
      instrument({ name: `BUDGET_${index}` }),
    );
    const gaps: number[] = [];
    const work = new WorkBudget(undefined, {
      checked(gap) {
        gaps.push(gap);
      },
    });
    expect(
      generateCandidatesWithBudget(items, registry(items), T30, T30, work),
    ).toHaveLength(190);
    expect(work.steps).toBeGreaterThan(1_000);
    expect(Math.max(...gaps)).toBe(128);
  });

  it("cancels during serialization without publishing or mutating history", () => {
    const { input } = versionTwoFixture();
    const history = admittedHistory(input);
    const before = JSON.stringify(replay(history));
    let checks = 0;
    const work = new WorkBudget(
      {
        get aborted() {
          checks += 1;
          return checks >= 2;
        },
      },
      { checked() {} },
    );
    expect(() =>
      canonicalSerialize(
        Array.from({ length: 20_000 }, (_, index) => `value-${index}`),
        work,
      ),
    ).toThrowError(expect.objectContaining({ code: "EVALUATION_CANCELLED" }));
    expect(JSON.stringify(replay(history))).toBe(before);
  });
});
