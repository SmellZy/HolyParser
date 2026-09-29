import { describe, expect, it } from "vitest";
import {
  admitMaterializedMapping,
  candidateProvenanceDigest,
  type MappingAdmissionInput,
} from "./admission.js";
import { WorkBudget } from "./bounds.js";
import {
  generateCandidates,
  generateCandidatesWithBudget,
} from "./candidates.js";
import { approveCommand, MappingLedger } from "./commands.js";
import { evaluateMatch } from "./evaluator.js";
import { validateEvidenceBundle } from "./evidence.js";
import type {
  EvidenceRecord,
  InstrumentMatchCandidate,
  MappingVersion,
  ReviewRecord,
} from "./model.js";
import { MATCHING_POLICY_VERSION } from "./policy.js";
import { CuratedAssetRegistry } from "./registry.js";
import { replayMapping } from "./replay.js";
import {
  T0,
  T30,
  T30D,
  approvedMapping,
  admittedHistory,
  instrument,
  mappingAdmission,
  registry,
} from "./test-fixtures.js";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function fixture() {
  const left = instrument({ name: "OKX" });
  const right = instrument({ name: "BINANCE" });
  const assets = registry([left, right]);
  const admission = mappingAdmission(left, right, assets);
  return { left, right, assets, admission };
}

function rebind(
  original: MappingAdmissionInput,
  values: {
    candidate?: InstrumentMatchCandidate;
    mapping?: MappingVersion;
    proposerId?: string;
    quantId?: string;
    marketDataId?: string;
  } = {},
): MappingAdmissionInput {
  const candidate = values.candidate ?? original.candidate;
  const mapping = values.mapping ?? original.mapping;
  const proposerId = values.proposerId ?? original.review.proposerId;
  const command = approveCommand({
    commandId: original.command.commandId,
    candidateId: candidate.candidateId,
    candidateDigest: candidateProvenanceDigest(candidate),
    expectedRevision: mapping.version - 1,
    proposedBy: proposerId,
    mappingId: mapping.mappingId,
    leftInstrumentId: mapping.leftInstrumentId,
    rightInstrumentId: mapping.rightInstrumentId,
    exposureKey: mapping.exposureKey,
    effectiveFrom: mapping.effectiveFrom,
    effectiveTo: mapping.effectiveTo,
    recordedKnowledgeAt: mapping.recordedKnowledgeAt,
    registryRevision: mapping.registryRevision,
    evidenceRevision: mapping.evidenceRevision,
    reasonText: original.command.reasonText,
    approvals: [
      {
        actorId: values.quantId ?? "fixture-quant-reviewer",
        role: "QUANT_REVIEWER",
        recordedAt: T0,
      },
      {
        actorId: values.marketDataId ?? "fixture-market-data-reviewer",
        role: "MARKET_DATA_REVIEWER",
        recordedAt: T0,
      },
    ],
  });
  const reboundMapping = Object.freeze({
    ...mapping,
    approvals: command.approvals,
  });
  const review: ReviewRecord = Object.freeze({
    ...original.review,
    candidateId: candidate.candidateId,
    proposerId,
    commandDigest: command.commandDigest,
    expectedRevision: command.expectedRevision,
    approvals: command.approvals,
  });
  return Object.freeze({
    mapping: reboundMapping,
    candidate,
    review,
    command,
    history: Object.freeze(
      original.history.map((record) =>
        record.mapping.version === reboundMapping.version
          ? Object.freeze({
              mapping: reboundMapping,
              candidate,
              review,
              command,
            })
          : record,
      ),
    ),
    transitions: original.transitions,
  });
}

function outcome(admission: MappingAdmissionInput) {
  const { left, right, assets } = fixture();
  return evaluateMatch({
    left,
    right,
    registry: assets,
    evaluationAt: T30,
    knowledgeCutoff: T30,
    mapping: admission,
  });
}

describe("B-01 authoritative mapping admission", () => {
  it("accepts one fully bound synthetic mapping", () => {
    const { left, right, assets, admission } = fixture();
    expect(admitMaterializedMapping(admission, T30)).toMatchObject({
      state: "VALID",
      reason: "COMPATIBLE_APPROVED",
    });
    expect(
      evaluateMatch({
        left,
        right,
        registry: assets,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        mapping: admission,
      }),
    ).toMatchObject({ outcome: "MATCHED", reasons: ["COMPATIBLE_APPROVED"] });
  });

  it.each([
    [
      "wrong policy revision",
      (a: MappingAdmissionInput) => ({
        ...a,
        mapping: { ...a.mapping, policyRevision: "unapproved-policy/v999" },
      }),
    ],
    [
      "arbitrary evidence revision",
      (a: MappingAdmissionInput) => ({
        ...a,
        mapping: { ...a.mapping, evidenceRevision: "arbitrary-evidence" },
      }),
    ],
    [
      "missing evidence revision",
      (a: MappingAdmissionInput) => ({
        ...a,
        mapping: { ...a.mapping, evidenceRevision: undefined },
      }),
    ],
    [
      "missing approval digest",
      (a: MappingAdmissionInput) => ({
        ...a,
        mapping: {
          ...a.mapping,
          approvals: a.mapping.approvals.map((approval) => ({
            ...approval,
            approvedDigest: undefined,
          })),
        },
      }),
    ],
    [
      "incorrect approval digest",
      (a: MappingAdmissionInput) => ({
        ...a,
        mapping: {
          ...a.mapping,
          approvals: a.mapping.approvals.map((approval) => ({
            ...approval,
            approvedDigest: "incorrect",
          })),
        },
      }),
    ],
    [
      "malformed review",
      (a: MappingAdmissionInput) => ({
        ...a,
        review: { ...a.review, candidateId: "wrong-candidate" },
      }),
    ],
  ] as const)("fails closed for %s", (_name, mutate) => {
    const { admission } = fixture();
    expect(
      outcome(mutate(admission) as MappingAdmissionInput).outcome,
    ).not.toBe("MATCHED");
  });

  it("rejects a command whose candidate policy/digest binding is wrong", () => {
    const { admission } = fixture();
    const wrongCommand = Object.freeze({
      ...admission.command,
      candidateDigest: "wrong-candidate-digest",
    });
    expect(outcome({ ...admission, command: wrongCommand }).reasons).toContain(
      "COMMAND_DIGEST_CONFLICT",
    );
  });

  it("rejects reviewer-role overlap", () => {
    const { admission } = fixture();
    const overlapping = rebind(admission, {
      quantId: "same-reviewer",
      marketDataId: "same-reviewer",
    });
    expect(outcome(overlapping)).toMatchObject({
      outcome: "QUARANTINED",
      reasons: ["REVIEWER_SEPARATION_REQUIRED"],
    });
  });

  it.each([
    ["incomplete candidate", "INCOMPLETE"],
    ["incomplete evidence", "RESEARCH_REQUIRED"],
  ] as const)("rejects %s", (_name, completeness) => {
    const { admission } = fixture();
    const candidate = Object.freeze({ ...admission.candidate, completeness });
    expect(outcome(rebind(admission, { candidate })).outcome).not.toBe(
      "MATCHED",
    );
  });

  it("rejects a COMPLETE_APPROVED claim that still carries fail-closed evidence", () => {
    const { admission } = fixture();
    const candidate = Object.freeze({
      ...admission.candidate,
      completeness: "COMPLETE_APPROVED" as const,
      reasons: Object.freeze(["MULTIPLIER_UNKNOWN" as const]),
    });
    expect(outcome(rebind(admission, { candidate }))).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["MAPPING_UNAPPROVED"],
    });
  });

  it("rejects candidate/mapping exposure mismatch", () => {
    const { admission } = fixture();
    const mapping = {
      ...admission.mapping,
      exposureKey: `${admission.mapping.exposureKey}:other`,
    };
    expect(outcome(rebind(admission, { mapping })).outcome).not.toBe("MATCHED");
  });

  it.each([
    ["expired", { effectiveTo: T30 }],
    ["superseded", { status: "SUPERSEDED", supersededBy: 2 }],
    [
      "invalidated",
      { status: "INVALIDATED", invalidationReference: "invalid-1" },
    ],
    ["quarantined", { status: "QUARANTINED" }],
    ["conflicting", { status: "CONFLICT" }],
  ] as const)("rejects %s mappings", (_name, patch) => {
    const { admission } = fixture();
    const mapping = { ...admission.mapping, ...patch } as MappingVersion;
    expect(outcome(rebind(admission, { mapping })).outcome).not.toBe("MATCHED");
  });

  it("rejects a raw externally fabricated APPROVED record", () => {
    const { left, right, assets } = fixture();
    expect(
      evaluateMatch({
        left,
        right,
        registry: assets,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        mapping: approvedMapping(
          left,
          right,
        ) as unknown as MappingAdmissionInput,
      }).outcome,
    ).not.toBe("MATCHED");
  });
});

describe("B-02 runtime authoritative immutability", () => {
  it("defensively copies and deeply freezes registry state", () => {
    const left = instrument({ name: "OKX" });
    const source = registry([left]).revision;
    const mutable = {
      ...source,
      assets: source.assets.map((value) => ({ ...value })),
      bindings: source.bindings.map((value) => ({ ...value })),
      aliases: source.aliases.map((value) => ({ ...value })),
    };
    const admitted = new CuratedAssetRegistry(mutable);
    const before = admitted.resolve(
      left.metadata.venue,
      left.metadata.productGroup,
      left.nativeBaseAssetReference,
      "BASE",
      T30,
      T30,
    );
    (
      mutable.bindings[0] as Mutable<(typeof mutable.bindings)[number]>
    ).canonicalAssetId = "asset:MUTATED" as never;
    expect(
      admitted.resolve(
        left.metadata.venue,
        left.metadata.productGroup,
        left.nativeBaseAssetReference,
        "BASE",
        T30,
        T30,
      ),
    ).toEqual(before);
    expect(() => {
      (
        admitted.revision.bindings[0] as Mutable<
          (typeof admitted.revision.bindings)[number]
        >
      ).canonicalAssetId = "asset:MUTATED" as never;
    }).toThrow();
  });

  it("preserves mapping and approval history after caller mutation", () => {
    const { admission } = fixture();
    const mutableApproval = { ...admission.mapping.approvals[0]! };
    const mutable = {
      ...admission.mapping,
      approvals: [mutableApproval, { ...admission.mapping.approvals[1]! }],
    };
    const ledger = new MappingLedger([mutable]);
    mutable.status = "INVALIDATED";
    mutableApproval.approvedDigest = "mutated";
    expect(ledger.versions[0]?.status).toBe("APPROVED");
    expect(ledger.versions[0]?.approvals[0]?.approvedDigest).toBe(
      admission.mapping.approvals[0]!.approvedDigest,
    );
  });

  it("returns immutable command digest snapshots without exposing its Map", () => {
    const command = fixture().admission.command;
    const applied = new MappingLedger().apply(command);
    const snapshot = applied.ledger.commandDigestSnapshot();
    expect(snapshot).toEqual([
      { commandId: command.commandId, digest: command.commandDigest },
    ]);
    expect(() => {
      (snapshot as Mutable<typeof snapshot>).length = 0;
    }).toThrow();
    expect(applied.ledger.commandDigest(command.commandId)).toBe(
      command.commandDigest,
    );
  });

  it("defensively copies evidence records before publication", () => {
    const source: EvidenceRecord = {
      evidenceId: "evidence-immutable",
      evidenceClass: "FROZEN_METADATA",
      sourceId: "FROZEN_SOURCE",
      sourceRevision: "source-v1",
      sourceDigest: "source-digest",
      productScope: "ORDINARY_LINEAR_PERPETUAL",
      retrievalDate: "2026-09-15",
      recordedAt: T0,
      validFrom: T0,
      validTo: T30D,
      quality: "VERIFIED",
      policyRevision: MATCHING_POLICY_VERSION,
    };
    const admitted = validateEvidenceBundle([source], []);
    (source as Mutable<EvidenceRecord>).sourceRevision = "mutated";
    expect(admitted[0]?.sourceRevision).toBe("source-v1");
    expect(() => {
      (admitted[0] as Mutable<EvidenceRecord>).sourceRevision = "mutated";
    }).toThrow();
  });

  it("deeply freezes a materialized mapping independently of caller state", () => {
    const { admission } = fixture();
    const mutableApproval = { ...admission.mapping.approvals[0]! };
    const mutableInput = {
      ...admission,
      mapping: {
        ...admission.mapping,
        approvals: [mutableApproval, { ...admission.mapping.approvals[1]! }],
      },
    } as MappingAdmissionInput;
    const result = admitMaterializedMapping(mutableInput, T30);
    expect(result.state).toBe("VALID");
    mutableApproval.approvedDigest = "mutated-after-admission";
    if (result.state !== "VALID") throw new Error("Expected valid mapping.");
    expect(result.mapping.approvals[0]?.approvedDigest).toBe(
      admission.mapping.approvals[0]!.approvedDigest,
    );
  });

  it("does not expose mutable special-family policy state", async () => {
    const publicApi = await import("./index.js");
    expect("specialNativeFamilies" in publicApi).toBe(false);
    Reflect.set(publicApi, "specialNativeFamilies", new Set(["BINANCE"]));
    const special = instrument({ name: "OKX_XPERP", family: "OKX_XPERP" });
    const peer = instrument({ name: "BINANCE" });
    const assets = registry([special, peer]);
    expect(
      evaluateMatch({
        left: special,
        right: peer,
        registry: assets,
        evaluationAt: T30,
        knowledgeCutoff: T30,
      }).reasons,
    ).toEqual(["SPECIAL_PRODUCT_EXCLUDED"]);
    const ordinary = instrument({ name: "OKX" });
    expect(
      evaluateMatch({
        left: ordinary,
        right: peer,
        registry: registry([ordinary, peer]),
        evaluationAt: T30,
        knowledgeCutoff: T30,
      }).reasons,
    ).not.toContain("SPECIAL_PRODUCT_EXCLUDED");
    Reflect.deleteProperty(publicApi, "specialNativeFamilies");
    expect("specialNativeFamilies" in publicApi).toBe(false);
  });
});

describe("H-01 provisional diagnostic identity", () => {
  it("does not assert LINEAR/BASE_UNIT for unverified economics", () => {
    const left = instrument({ name: "OKX", convention: "UNKNOWN" });
    const right = instrument({
      name: "BINANCE",
      convention: "UNKNOWN",
      multiplier: "UNKNOWN",
      metadataMultiplier: "UNKNOWN",
    });
    const candidates = generateCandidates(
      [left, right],
      registry([left, right]),
      T30,
      T30,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      exposureKey: undefined,
      completeness: "INCOMPLETE",
      reasons: ["MULTIPLIER_UNKNOWN", "VALUE_CONVENTION_UNVERIFIED"],
    });
    expect(JSON.stringify(candidates[0])).not.toContain("BASE_UNIT");
    expect(JSON.stringify(candidates[0])).not.toContain('"LINEAR"');
  });

  it("materializes a final exposure only for complete synthetic evidence", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    expect(
      generateCandidates([left, right], registry([left, right]), T30, T30)[0]
        ?.exposureKey,
    ).toContain("instrument-exposure-pilot/v1");
  });

  it("does not discover canonical identity from ticker text alone", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const empty = new CuratedAssetRegistry({
      revision: "empty-v1",
      recordedAt: T0,
      assets: [],
      bindings: [],
      aliases: [],
    });
    expect(generateCandidates([left, right], empty, T30, T30)).toEqual([]);
  });
});

describe("H-02 explicit public API allowlist", () => {
  it("exports only the approved Phase 2B.1 runtime surface", async () => {
    const publicApi = await import("./index.js");
    expect(Object.keys(publicApi).sort()).toEqual(
      [
        "EXPOSURE_KEY_VERSION",
        "MATCHING_LIMITS",
        "MATCHING_POLICY_VERSION",
        "MATCHING_RESOURCE_SCOPE",
        "MATCH_REASON_CODES",
        "MappingLedger",
        "MatchingFailure",
        "CuratedAssetRegistry",
        "admitMappingCommand",
        "admitMaterializedMapping",
        "admitRegistryRevision",
        "approveCommand",
        "candidateProvenanceDigest",
        "canonicalExposureKey",
        "evaluateBatch",
        "evaluateMatch",
        "generateCandidates",
        "invalidateCommand",
        "normalizeBaseExposure",
        "normalizeQuoteNotional",
        "replayMapping",
        "validateEvidenceBundle",
      ].sort(),
    );
    for (const internal of [
      "WorkBudget",
      "assertCount",
      "epoch",
      "isEffective",
      "specialNativeFamilies",
      "canonicalSerialize",
      "sha256",
    ])
      expect(internal in publicApi).toBe(false);
  });
});

describe("H-03 bounded cancellation accounting", () => {
  it("chunks a large step and observes no cancellation gap over 128", () => {
    const gaps: number[] = [];
    const work = new WorkBudget(undefined, {
      checked(gap) {
        gaps.push(gap);
      },
    });
    work.step(1_000);
    work.beforePublication();
    expect(Math.max(...gaps)).toBeLessThanOrEqual(128);
    expect(work.steps).toBe(1_000);
  });

  it("observes a maximum gap of 128 through validation and candidate loops", () => {
    const instruments = Array.from({ length: 32 }, (_, index) =>
      instrument({ name: `MEASURED_${index}` }),
    );
    const gaps: number[] = [];
    const work = new WorkBudget(undefined, {
      checked(gap) {
        gaps.push(gap);
      },
    });
    const result = generateCandidatesWithBudget(
      instruments,
      registry(instruments),
      T30,
      T30,
      work,
    );
    expect(result.length).toBe(496);
    expect(Math.max(...gaps)).toBe(128);
    expect(gaps.every((gap) => gap <= 128)).toBe(true);
  });

  it("cancels during instrument validation rather than after it", () => {
    const instruments = Array.from({ length: 32 }, (_, index) =>
      instrument({ name: `VENUE_${index}` }),
    );
    const assets = registry(instruments);
    let checks = 0;
    const signal = {
      get aborted() {
        checks += 1;
        return checks >= 2;
      },
    };
    expect(() =>
      generateCandidates(instruments, assets, T30, T30, signal),
    ).toThrowError(expect.objectContaining({ code: "EVALUATION_CANCELLED" }));
    expect(checks).toBe(2);
  });

  it("cancels atomically immediately before batch publication", () => {
    const { left, right, assets, admission } = fixture();
    let reads = 0;
    const signal = {
      get aborted() {
        reads += 1;
        return reads >= 2;
      },
    };
    expect(() =>
      evaluateMatch({
        left,
        right,
        registry: assets,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        mapping: admission,
        signal,
      }),
    ).toThrowError(expect.objectContaining({ code: "EVALUATION_CANCELLED" }));
  });

  it("checks cancellation while iterating evidence", () => {
    const records: EvidenceRecord[] = Array.from(
      { length: 200 },
      (_, index) => ({
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
        policyRevision: MATCHING_POLICY_VERSION,
      }),
    );
    let checks = 0;
    expect(() =>
      validateEvidenceBundle(records, [], {
        get aborted() {
          checks += 1;
          return checks >= 2;
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "EVALUATION_CANCELLED" }));
  });

  it("checks cancellation while validating replay history", () => {
    const { admission } = fixture();
    let checks = 0;
    expect(() =>
      replayMapping({
        mode: "AS_KNOWN",
        history: admittedHistory(admission),
        mappingId: admission.mapping.mappingId,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        replayRevision: "remediation-replay",
        signal: {
          get aborted() {
            checks += 1;
            return checks >= 2;
          },
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "EVALUATION_CANCELLED" }));
  });
});

describe("remediation invariants", () => {
  it("keeps the accepted policy unchanged", () => {
    expect(MATCHING_POLICY_VERSION).toBe("instrument-matching-pilot/v1");
    expect(T30D).toBe("2026-10-15T00:00:00.000Z");
  });
});
