import { describe, expect, it } from "vitest";
import {
  admitMaterializedMapping,
  type MappingAdmissionInput,
} from "./admission.js";
import {
  WorkBudget,
  assertAtomicId,
  assertCompositeId,
  assertReasonText,
} from "./bounds.js";
import { evaluateMatch } from "./evaluator.js";
import { invalidateCommand, MappingLedger } from "./commands.js";
import type { MappingTransitionRecord } from "./model.js";
import { replayMapping } from "./replay.js";
import { canonicalSerialize } from "./serialization.js";
import {
  T0,
  T1D,
  T30,
  approvedMapping,
  admittedHistory,
  instrument,
  mappingAdmission,
  registry,
} from "./test-fixtures.js";
import { createTransitionRecord } from "./transitions.js";
import { validateVenueInstrumentEvidence } from "./validation.js";

function versionTwo() {
  const left = instrument({ name: "THIRD_LEFT" });
  const right = instrument({ name: "THIRD_RIGHT" });
  const assets = registry([left, right]);
  const input = mappingAdmission(
    left,
    right,
    assets,
    approvedMapping(left, right, "APPROVED", { version: 2, priorVersion: 1 }),
  );
  return { left, right, assets, input };
}

function mutable(input: MappingAdmissionInput): MappingAdmissionInput {
  return structuredClone(input) as MappingAdmissionInput;
}

function outcome(input: MappingAdmissionInput) {
  const fixture = versionTwo();
  return evaluateMatch({
    left: fixture.left,
    right: fixture.right,
    registry: fixture.assets,
    evaluationAt: T30,
    knowledgeCutoff: T30,
    mapping: input,
  });
}

describe("third remediation B-01 append-only transition authority", () => {
  it("rejects unknown transition types at JavaScript runtime", () => {
    const fixture = versionTwo();
    const forged = mutable(fixture.input);
    Object.assign(forged.transitions[0]!, { transitionType: "UNKNOWN" });
    expect(admitMaterializedMapping(forged, T30).state).not.toBe("VALID");
  });

  it("does not apply a transition before its effective time", () => {
    const fixture = versionTwo();
    const raw = mutable(
      mappingAdmission(fixture.left, fixture.right, fixture.assets),
    );
    const target = raw.history[0]!;
    raw.transitions.push(
      createTransitionRecord({
        transitionId: "future-invalidation",
        mappingId: target.mapping.mappingId,
        affectedVersion: 1,
        transitionType: "INVALIDATE",
        effectiveAt: T1D,
        reasonCode: "MAPPING_INVALIDATED",
        reference: "future-reference",
        policyRevision: target.mapping.policyRevision,
        expectedRevision: 1,
        expectedState: "APPROVED",
        proposerId: "fixture-transition-proposer",
        registryRevision: target.mapping.registryRevision,
        evidenceRevision: target.mapping.evidenceRevision,
        provenanceDigest: target.command.commandDigest,
        recordedKnowledgeAt: T1D,
        approvals: [
          { actorId: "future-quant", role: "QUANT_REVIEWER", recordedAt: T1D },
          {
            actorId: "future-market",
            role: "MARKET_DATA_REVIEWER",
            recordedAt: T1D,
          },
        ],
      }),
    );
    const admitted = admitMaterializedMapping(raw, T30);
    expect(admitted.state).toBe("VALID");
    if (!admitted.history) throw new Error(admitted.reason);
    expect(
      replayMapping({
        mode: "CORRECTED",
        history: admitted.history,
        mappingId: admitted.history.mappingId,
        evaluationAt: T30,
        knowledgeCutoff: T1D,
        replayRevision: "future-transition-test",
      }),
    ).toMatchObject({ outcome: "MATCHED" });
  });

  it("binds the whole invalidation command to its transition digest", () => {
    const fixture = versionTwo();
    const target = fixture.input.history[0]!.mapping;
    const command = invalidateCommand({
      commandId: "binding-invalidation",
      expectedRevision: 1,
      mappingId: target.mappingId,
      affectedVersion: 1,
      effectiveAt: T0,
      recordedKnowledgeAt: T1D,
      reasonText: "reviewed invalidation",
      invalidationReference: "binding-reference",
      proposedBy: "binding-proposer",
      registryRevision: target.registryRevision,
      evidenceRevision: target.evidenceRevision,
      provenanceDigest: fixture.input.history[0]!.command.commandDigest,
      approvals: [
        { actorId: "binding-quant", role: "QUANT_REVIEWER", recordedAt: T1D },
        {
          actorId: "binding-market",
          role: "MARKET_DATA_REVIEWER",
          recordedAt: T1D,
        },
      ],
    });
    const ledger = new MappingLedger([target]);
    expect(() =>
      ledger.apply({ ...command, reasonText: "forged reason" }),
    ).toThrowError(
      expect.objectContaining({ code: "COMMAND_DIGEST_CONFLICT" }),
    );
    expect(() =>
      ledger.apply({ ...command, mappingId: "forged-mapping" }),
    ).toThrowError(
      expect.objectContaining({ code: "COMMAND_DIGEST_CONFLICT" }),
    );
    const applied = ledger.apply(command);
    expect(applied.ledger.transitions).toHaveLength(1);
    expect(() =>
      applied.ledger.apply({ ...command, reasonText: "forged reason" }),
    ).toThrowError(
      expect.objectContaining({ code: "COMMAND_DIGEST_CONFLICT" }),
    );
  });
  it.each([
    ["SUPERSEDED", "MAPPING_SUPERSEDED", { supersededBy: 2 }],
    [
      "INVALIDATED",
      "MAPPING_INVALIDATED",
      { invalidationReference: "forged-invalidation" },
    ],
  ] as const)(
    "rejects an approved historical record rewritten to %s",
    (status, reasonCode, extra) => {
      const fixture = versionTwo();
      const forged = mutable(fixture.input);
      Object.assign(forged.history[0]!.mapping, {
        status,
        reasonCode,
        ...extra,
      });
      expect(admitMaterializedMapping(forged, T30).state).not.toBe("VALID");
      expect(outcome(forged).outcome).not.toBe("MATCHED");
    },
  );

  it("reproduces and closes the exact forged SUPERSEDED v1 bypass", () => {
    const fixture = versionTwo();
    const forged = mutable(fixture.input);
    Object.assign(forged.history[0]!.mapping, {
      status: "SUPERSEDED",
      reasonCode: "MAPPING_SUPERSEDED",
      supersededBy: 999,
    });
    expect(admitMaterializedMapping(forged, T30)).toMatchObject({
      state: "DIGEST_MISMATCH",
      reason: "COMMAND_DIGEST_CONFLICT",
    });
    expect(outcome(forged).outcome).not.toBe("MATCHED");
  });

  it.each([
    ["wrong digest", { commandDigest: "wrong-transition-digest" }],
    ["wrong policy", { policyRevision: "forged-policy/v999" }],
    ["wrong evidence", { evidenceRevision: "forged-evidence" }],
    ["wrong registry", { registryRevision: "forged-registry" }],
    ["stale revision", { expectedRevision: 2 }],
    ["missing successor", { successorVersion: 999 }],
  ] as const)("rejects transition with %s", (_name, patch) => {
    const fixture = versionTwo();
    const forged = mutable(fixture.input);
    Object.assign(forged.transitions[0]!, patch);
    expect(admitMaterializedMapping(forged, T30).state).not.toBe("VALID");
    expect(outcome(forged).outcome).not.toBe("MATCHED");
  });

  it("rejects reuse of the original approval digest for supersession", () => {
    const fixture = versionTwo();
    const forged = mutable(fixture.input);
    const approvalDigest = forged.history[0]!.command.commandDigest;
    Object.assign(forged.transitions[0]!, { commandDigest: approvalDigest });
    for (const approval of forged.transitions[0]!.approvals)
      Object.assign(approval, { approvedDigest: approvalDigest });
    expect(admitMaterializedMapping(forged, T30).state).not.toBe("VALID");
  });

  it.each([
    [
      "missing reviewer",
      (value: MappingTransitionRecord) => ({
        ...value,
        approvals: value.approvals.slice(0, 1),
      }),
    ],
    [
      "reviewer collision",
      (value: MappingTransitionRecord) => ({
        ...value,
        proposerId: value.approvals[0]!.actorId,
      }),
    ],
  ] as const)("rejects %s", (_name, change) => {
    const fixture = versionTwo();
    const forged = mutable(fixture.input);
    forged.transitions[0] = change(forged.transitions[0]!) as never;
    expect(admitMaterializedMapping(forged, T30).state).not.toBe("VALID");
  });

  it("rejects conflicting invalidation and supersession transitions", () => {
    const fixture = versionTwo();
    const forged = mutable(fixture.input);
    const target = forged.history[0]!;
    const invalidation = createTransitionRecord({
      transitionId: "conflicting-invalidation",
      mappingId: target.mapping.mappingId,
      affectedVersion: 1,
      transitionType: "INVALIDATE",
      effectiveAt: T0,
      reasonCode: "MAPPING_INVALIDATED",
      reference: "conflicting-reference",
      policyRevision: target.mapping.policyRevision,
      expectedRevision: 1,
      expectedState: "APPROVED",
      proposerId: "conflict-proposer",
      registryRevision: target.mapping.registryRevision,
      evidenceRevision: target.mapping.evidenceRevision,
      provenanceDigest: target.command.commandDigest,
      recordedKnowledgeAt: T1D,
      approvals: [
        { actorId: "conflict-quant", role: "QUANT_REVIEWER", recordedAt: T1D },
        {
          actorId: "conflict-market-data",
          role: "MARKET_DATA_REVIEWER",
          recordedAt: T1D,
        },
      ],
    });
    forged.transitions.push(invalidation);
    expect(admitMaterializedMapping(forged, T30).state).toBe("CONFLICTING");
  });

  it("accepts valid append-only supersession and invalidation controls", () => {
    const fixture = versionTwo();
    expect(admitMaterializedMapping(fixture.input, T30).state).toBe("VALID");
    const invalidated = mappingAdmission(
      fixture.left,
      fixture.right,
      fixture.assets,
      approvedMapping(fixture.left, fixture.right, "INVALIDATED", {
        version: 2,
        priorVersion: 1,
        recordedKnowledgeAt: T1D,
      }),
    );
    expect(admitMaterializedMapping(invalidated, T1D).state).toBe(
      "INVALIDATED",
    );
  });

  it("keeps AS_KNOWN and CORRECTED replay transition-aware", () => {
    const fixture = versionTwo();
    const invalidated = mappingAdmission(
      fixture.left,
      fixture.right,
      fixture.assets,
      approvedMapping(fixture.left, fixture.right, "INVALIDATED", {
        version: 2,
        priorVersion: 1,
        recordedKnowledgeAt: T1D,
      }),
    );
    const history = admittedHistory(invalidated, T1D);
    const common = {
      history,
      mappingId: history.mappingId,
      evaluationAt: T30,
      replayRevision: "third-remediation-replay",
    } as const;
    expect(
      replayMapping({ ...common, mode: "AS_KNOWN", knowledgeCutoff: T30 }),
    ).toMatchObject({ outcome: "MATCHED" });
    expect(
      replayMapping({ ...common, mode: "CORRECTED", knowledgeCutoff: T1D }),
    ).toMatchObject({
      outcome: "UNAVAILABLE",
      reason: "MAPPING_INVALIDATED",
    });
  });

  it("does not let caller mutation alter admitted transition replay", () => {
    const fixture = versionTwo();
    const raw = mutable(fixture.input);
    const admitted = admitMaterializedMapping(raw, T30);
    if (admitted.history === undefined) throw new Error(admitted.reason);
    const before = JSON.stringify(
      replayMapping({
        mode: "CORRECTED",
        history: admitted.history,
        mappingId: admitted.history.mappingId,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        replayRevision: "immutable-transition-replay",
      }),
    );
    Object.assign(raw.transitions[0]!, {
      commandDigest: "mutated",
      transitionType: "INVALIDATE",
      successorVersion: undefined,
    });
    expect(
      JSON.stringify(
        replayMapping({
          mode: "CORRECTED",
          history: admitted.history,
          mappingId: admitted.history.mappingId,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          replayRevision: "immutable-transition-replay",
        }),
      ),
    ).toBe(before);
    expect(Object.isFrozen(admitted.history.transitions)).toBe(true);
    expect(Object.isFrozen(admitted.history.transitions[0]!.approvals)).toBe(
      true,
    );
  });
});

describe("third remediation H-03 cumulative operation accounting", () => {
  it("charges long valid IDs proportionally rather than as one untracked scan", () => {
    const short = new WorkBudget();
    const long = new WorkBudget();
    assertAtomicId("a", "Short ID", short);
    assertAtomicId("a".repeat(160), "Long ID", long);
    expect(short.steps).toBe(1);
    expect(long.steps).toBe(5);
  });

  it("charges near-boundary valid IDs and text with gap <=128", () => {
    const gaps: number[] = [];
    const work = new WorkBudget(undefined, {
      checked(gap) {
        gaps.push(gap);
      },
    });
    for (let index = 0; index < 512; index += 1) {
      assertAtomicId(
        `${"a".repeat(155)}${index}`.slice(0, 160),
        "Long ID",
        work,
      );
      assertCompositeId(`${index}:${"b".repeat(4080)}`, work);
      assertReasonText(`reviewed-${index}-${"c".repeat(480)}`, work);
    }
    work.beforePublication();
    expect(work.steps).toBeGreaterThan(1_500);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(128);
  });

  it("uses one budget through validation, admission, serialization and replay", () => {
    const fixture = versionTwo();
    const gaps: number[] = [];
    const work = new WorkBudget(undefined, {
      checked(gap) {
        gaps.push(gap);
      },
    });
    for (let index = 0; index < 64; index += 1)
      validateVenueInstrumentEvidence(fixture.left, work);
    const admitted = admitMaterializedMapping(
      fixture.input,
      T30,
      undefined,
      work,
    );
    expect(admitted.state).toBe("VALID");
    canonicalSerialize(
      Array.from({ length: 8_192 }, (_, index) => ({
        id: `${index}:${"z".repeat(128)}`,
      })),
      work,
    );
    work.beforePublication();
    expect(work.steps).toBeGreaterThan(1_000);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(128);
  });

  it("enforces the cumulative 100,000-step cap across distributed helpers", () => {
    const work = new WorkBudget();
    work.step(98_400);
    for (let index = 0; index < 100; index += 1)
      assertCompositeId(`${index}:${"x".repeat(4090)}`, work);
    expect(work.steps).toBe(100_000);
    expect(() =>
      validateVenueInstrumentEvidence(instrument({ name: "OVER" }), work),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });
});
