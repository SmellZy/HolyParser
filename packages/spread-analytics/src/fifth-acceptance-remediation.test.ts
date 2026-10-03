import { canonicalAssetId } from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import {
  admitMaterializedMapping,
  admitMaterializedMappingWithBudget,
  candidateProvenanceDigest,
} from "./admission.js";
import {
  MAXIMUM_SCHEMA_TOKEN,
  WorkBudget,
  assertEvidenceRecord,
} from "./bounds.js";
import {
  generateCandidates,
  generateCandidatesWithBudget,
} from "./candidates.js";
import {
  MappingLedger,
  admitMappingCommand,
  applyWithBudget,
  approveCommand,
  invalidateCommand,
} from "./commands.js";
import { evaluateBatch, evaluateMatch } from "./evaluator.js";
import { validateEvidenceBundle } from "./evidence.js";
import type { EvidenceRecord, VenueInstrumentEvidence } from "./model.js";
import { MATCHING_LIMITS } from "./policy.js";
import {
  CuratedAssetRegistry,
  admitRegistryRevision,
  registryWithBudget,
} from "./registry.js";
import { replayMapping } from "./replay.js";
import { canonicalExposureKey } from "./serialization.js";
import { TIMESTAMP_LENGTH, epoch } from "./time.js";
import {
  T0,
  T30,
  T30D,
  USDT,
  approvedMapping,
  admittedHistory,
  instrument,
  mappingAdmission,
  registry,
} from "./test-fixtures.js";
import {
  maximumDeficit,
  maximumInterruptibleGap,
  publicationTail,
  traceBudgeted,
  traceOperation,
} from "./work-oracle.js";

type Signal = { readonly aborted: boolean };
const code = (error: unknown) => (error as { code?: string } | undefined)?.code;
const capture = (operation: () => unknown) => {
  try {
    return { result: operation(), error: undefined };
  } catch (error) {
    return { result: undefined, error };
  }
};
/** Signal that is not aborted at the first poll, and aborted at every later one. */
const abortAfterFirstPoll = () => {
  let polls = 0;
  return {
    signal: {
      get aborted() {
        polls += 1;
        return polls > 1;
      },
    },
    polls: () => polls,
  };
};
/** An object whose every property access is recorded (and refused). */
const tripwire = () => {
  const touched: PropertyKey[] = [];
  const proxy = new Proxy(
    {},
    {
      get(_target, key) {
        touched.push(key);
        throw new Error("budget tripwire touched");
      },
      has(_target, key) {
        touched.push(key);
        return false;
      },
    },
  );
  return { proxy, touched };
};

function fixtures() {
  const left = instrument({ name: "FIFTH_LEFT" });
  const right = instrument({ name: "FIFTH_RIGHT" });
  const assets = registry([left, right]);
  const input = mappingAdmission(
    left,
    right,
    assets,
    approvedMapping(left, right, "APPROVED", { version: 8, priorVersion: 7 }),
  );
  return { left, right, assets, input, history: admittedHistory(input) };
}

function forgedInvalidate(size: number, validTimes = false) {
  const big = (tag: string) => `${tag}${"z".repeat(size)}`;
  const fields = {
    effectiveAt: validTimes ? `${T0}` : big("e"),
    recordedKnowledgeAt: validTimes ? `${T0}` : big("r"),
    proposedBy: big("p"),
    registryRevision: big("g"),
    evidenceRevision: big("v"),
    provenanceDigest: big("d"),
    invalidationReference: big("i"),
  };
  // Every transition field is a distinct equal-content copy; any access to
  // the transition is recorded, so a comparison would be observable.
  const reads: string[] = [];
  const copy = (value: string) => value.split("").join("");
  const values: Record<string, unknown> = {
    transitionId: "cmd-1",
    commandDigest: "digest-1",
    mappingId: "missing-mapping",
    affectedVersion: 1,
    expectedRevision: 0,
    effectiveAt: copy(fields.effectiveAt),
    recordedKnowledgeAt: copy(fields.recordedKnowledgeAt),
    reference: copy(fields.invalidationReference),
    reasonText: "short",
    proposerId: copy(fields.proposedBy),
    registryRevision: copy(fields.registryRevision),
    evidenceRevision: copy(fields.evidenceRevision),
    provenanceDigest: copy(fields.provenanceDigest),
    transitionType: "INVALIDATE",
    approvals: [],
  };
  const transition = new Proxy(values, {
    get(target, key) {
      if (typeof key === "string" && key !== "approvals") reads.push(key);
      return target[key as string];
    },
  });
  const command = {
    kind: "INVALIDATE_MAPPING",
    commandId: "cmd-1",
    commandDigest: "digest-1",
    mappingId: "missing-mapping",
    affectedVersion: 1,
    expectedRevision: 0,
    reasonText: "short",
    approvals: [],
    transition,
    ...fields,
  };
  return { command, reads };
}

describe("fifth acceptance: exact acceptance-5 counterexamples", () => {
  it("1. forged invalidate command with seven ~8M-character strings is rejected before any comparison", () => {
    const steps = (size: number, validTimes = false) => {
      const { command, reads } = forgedInvalidate(size, validTimes);
      const work = new WorkBudget();
      const { error } = capture(() =>
        applyWithBudget(new MappingLedger(), command as never, work),
      );
      return { steps: work.steps, error: code(error), reads: reads.length };
    };
    // Non-vacuous control: a bounded forged command does reach the
    // command/transition binding comparison (transition fields are read).
    const control = steps(10, true);
    expect(control.reads).toBeGreaterThan(0);
    expect(control.error).toBe("TRANSITION_REJECTED");
    const huge = steps(8_000_000);
    // Rejected by the O(1) length gate of the first oversized field.
    expect(huge.error).toBe("INPUT_INVALID");
    // No transition field was read, so no proportional comparison happened.
    expect(huge.reads).toBe(0);
    // Charged work does not grow with the hostile field length.
    expect(huge.steps).toBeLessThanOrEqual(control.steps);
    const { command } = forgedInvalidate(8_000_000);
    const trace = traceOperation((signal) =>
      admitMappingCommand(new MappingLedger(), command as never, signal),
    );
    expect(trace.result).toMatchObject({
      status: "REJECTED",
      reason: "INPUT_INVALID",
    });
    expect(trace.end).toBeLessThan(10_000);
    // Constructor check plus the final pre-publication check.
    expect(trace.checks.length).toBeGreaterThanOrEqual(2);
    expect(publicationTail(trace)).toBe(0);
  });

  it("2. registry admission: cancellation requested after the first check is honoured", () => {
    const base = registry([instrument({ name: "CHAIN" })]).revision;
    const alias = (id: string, from: string, to: string) => ({
      aliasId: id,
      registryRevision: "registry-v1",
      aliasAssetId: canonicalAssetId(from),
      targetAssetId: canonicalAssetId(to),
      effectiveFrom: T0,
      effectiveTo: T30D,
      recordedKnowledgeAt: T0,
      reviewedBy: "reviewer",
    });
    const chained = {
      ...base,
      aliases: [
        alias("a1", "asset:X", "asset:Y"),
        alias("a2", "asset:Y", "asset:Z"),
      ],
    };
    expect(admitRegistryRevision(chained)).toMatchObject({
      status: "QUARANTINED",
      reason: "ALIAS_CHAIN_FORBIDDEN",
    });
    const cancel = abortAfterFirstPoll();
    const { result, error } = capture(() =>
      admitRegistryRevision(chained, cancel.signal),
    );
    expect(result).toBeUndefined();
    expect(code(error)).toBe("EVALUATION_CANCELLED");
    const trace = traceOperation((signal) =>
      admitRegistryRevision(chained, signal),
    );
    expect(publicationTail(trace)).toBe(0);
  });

  it("3. command admission: cancellation requested after the first check is honoured", () => {
    const f = fixtures();
    const ledger = new MappingLedger([f.input.mapping]);
    const stale = { ...f.input.command, expectedRevision: 0 };
    expect(admitMappingCommand(ledger, stale)).toMatchObject({
      status: "REJECTED",
      reason: "MAPPING_REVISION_CONFLICT",
    });
    const cancel = abortAfterFirstPoll();
    const { result, error } = capture(() =>
      admitMappingCommand(ledger, stale, cancel.signal),
    );
    expect(result).toBeUndefined();
    expect(code(error)).toBe("EVALUATION_CANCELLED");
    const trace = traceOperation((signal) =>
      admitMappingCommand(ledger, stale, signal),
    );
    expect(publicationTail(trace)).toBe(0);
  });

  it("4. mid-operation cancellation propagates instead of returning REJECTED/EVALUATION_CANCELLED", () => {
    const f = fixtures();
    const big = new MappingLedger(
      Array.from({ length: 200 }, (_, index) => ({
        ...f.input.mapping,
        mappingId: `m-${index}`,
      })),
    );
    const cancel = abortAfterFirstPoll();
    const { result, error } = capture(() =>
      admitMappingCommand(
        big,
        { ...f.input.command, mappingId: "m-x" },
        cancel.signal,
      ),
    );
    expect(result).toBeUndefined();
    expect(code(error)).toBe("EVALUATION_CANCELLED");
    // Budget exhaustion is likewise an operation failure, not a result.
    const versions = Array.from({ length: 4_000 }, (_, index) => ({
      ...f.input.mapping,
      mappingId: `n-${index}`,
    }));
    const { result: exhausted, error: bound } = capture(() =>
      admitMappingCommand(new MappingLedger(versions), {
        ...f.input.command,
        mappingId: "n-x",
      }),
    );
    if (exhausted !== undefined)
      expect(exhausted).not.toMatchObject({
        reason: "MATCHING_BOUND_EXCEEDED",
      });
    else expect(code(bound)).toBe("MATCHING_BOUND_EXCEEDED");
  });

  it("5. oversized evidence record is rejected before JSON.stringify", () => {
    const record = (sourceDigest: string): EvidenceRecord => ({
      evidenceId: "evidence-1",
      evidenceClass: "FROZEN_METADATA",
      sourceId: "SOURCE",
      sourceRevision: "source-v1",
      sourceDigest,
      productScope: "ORDINARY_LINEAR_PERPETUAL",
      retrievalDate: "2026-09-15",
      recordedAt: T0,
      validFrom: T0,
      validTo: T30D,
      quality: "VERIFIED",
      policyRevision: "instrument-matching-pilot/v1",
      description: "ok",
    });
    const hostile = record("h".repeat(4_000_000));
    const trace = traceOperation((signal) =>
      validateEvidenceBundle([hostile], [], signal),
    );
    expect(code(trace.error)).toBe("MATCHING_BOUND_EXCEEDED");
    // Acceptance 5 measured one 4,000,387-unit native call; now neither the
    // string scan nor the serialization runs.
    expect(Math.max(0, ...trace.largestCalls)).toBeLessThan(1_000);
    expect(trace.end).toBeLessThan(10_000);
    expect(trace.breakdown.get("Object.stringify") ?? 0).toBe(0);
    // A valid record at the boundary is still accepted.
    expect(() =>
      validateEvidenceBundle([record("h".repeat(160))], []),
    ).not.toThrow();
    // Non-data evidence (custom serialization) is refused before stringify.
    const withToJson = { ...record("x"), toJSON: () => "y".repeat(1_000_000) };
    expect(() => assertEvidenceRecord(withToJson)).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
    class Wrapped {
      readonly evidenceId = "evidence-1";
    }
    expect(() => assertEvidenceRecord(new Wrapped())).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
    // The serialization lower bound rejects exactly one byte over 8 KiB.
    expect(() =>
      assertEvidenceRecord("a".repeat(MATCHING_LIMITS.evidenceRecordBytes - 2)),
    ).not.toThrow();
    expect(() =>
      assertEvidenceRecord("a".repeat(MATCHING_LIMITS.evidenceRecordBytes - 1)),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("6/7. timestamps are host-time-zone independent; local and legacy forms are rejected", () => {
    const f = fixtures();
    const run = (at: string) =>
      capture(() =>
        evaluateMatch({
          left: f.left,
          right: f.right,
          registry: f.assets,
          evaluationAt: at as typeof T30,
          knowledgeCutoff: at as typeof T30,
          mapping: f.input,
        }),
      );
    const legacy = `Sep 15 2026 00:00:30 (${"c".repeat(100_000)})`;
    expect(legacy.length).toBe(100_023);
    const original = process.env.TZ;
    const outcomes = new Map<string, string>();
    const offsets = new Set<number>();
    try {
      for (const zone of ["UTC", "America/New_York", "Asia/Tokyo"]) {
        process.env.TZ = zone;
        // Proves the host zone switch is effective in this process.
        offsets.add(new Date(2026, 0, 1).getTimezoneOffset());
        for (const at of [
          "2026-09-15 00:00:30",
          "2026-09-15T00:00:30",
          legacy,
        ]) {
          const local = run(at);
          expect(local.result).toBeUndefined();
          expect(code(local.error)).toBe("EVIDENCE_TIME_INVALID");
        }
        const canonical = run(T30).result as {
          resultId: string;
          outcome: string;
        };
        outcomes.set(zone, `${canonical.outcome}:${canonical.resultId}`);
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
    expect(offsets.size).toBe(3);
    expect(new Set(outcomes.values()).size).toBe(1);
    expect([...outcomes.values()][0]).toMatch(/^MATCHED:/u);
    // The 100,023-character legacy string is rejected by length, in O(1).
    const trace = traceOperation(() => epoch(legacy));
    expect(code(trace.error)).toBe("EVIDENCE_TIME_INVALID");
    expect(trace.end).toBe(0);
  });

  it("8. a caller-supplied fake budget plus an aborted signal cannot publish VALID", () => {
    const f = fixtures();
    const fake = { step() {}, units() {}, beforePublication() {}, steps: 0 };
    const aborted = {
      get aborted() {
        return true;
      },
    };
    const { result, error } = capture(() =>
      (admitMaterializedMapping as (...args: unknown[]) => unknown)(
        f.input,
        T30,
        aborted,
        fake,
      ),
    );
    expect(result).toBeUndefined();
    expect(code(error)).toBe("EVALUATION_CANCELLED");
  });
});

describe("fifth acceptance: strict timestamp grammar (H-04)", () => {
  it("accepts only canonical RFC 3339 UTC millisecond timestamps", () => {
    expect(TIMESTAMP_LENGTH).toBe(24);
    expect(epoch("1970-01-01T00:00:00.000Z")).toBe(0n);
    expect(epoch("2026-09-15T00:00:30.000Z")).toBe(
      BigInt(Date.UTC(2026, 8, 15, 0, 0, 30)),
    );
    expect(epoch("2024-02-29T23:59:59.999Z")).toBe(
      BigInt(Date.UTC(2024, 1, 29, 23, 59, 59, 999)),
    );
    expect(epoch("0001-01-01T00:00:00.000Z")).toBe(-62_135_596_800_000n);
    expect(epoch("9999-12-31T23:59:59.999Z")).toBe(253_402_300_799_999n);
    for (const value of [
      "2026-09-15T00:00:30Z",
      "2026-09-15T00:00:30.0Z",
      "2026-09-15T00:00:30.0000Z",
      "2026-09-15T00:00:30.000+00:00",
      "2026-09-15T00:00:30.000+05:00",
      "2026-09-15T00:00:30.000z",
      "2026-09-15 00:00:30.000Z",
      "2026-09-15T00:00:30.000",
      "2026-09-15",
      "2026-09-15 00:00:30",
      "Sep 15 2026 00:00:30",
      "Tue, 15 Sep 2026 00:00:30 GMT",
      "2026-09-15T00:00:30.000Z ",
      " 2026-09-15T00:00:30.000Z",
      "2026-09-15T00:00:30.000Zjunk",
      "2026-02-29T00:00:00.000Z",
      "2026-13-01T00:00:00.000Z",
      "2026-00-01T00:00:00.000Z",
      "2026-04-31T00:00:00.000Z",
      "2026-09-15T24:00:00.000Z",
      "2026-09-15T00:60:00.000Z",
      "2026-09-15T00:00:60.000Z",
      "+02026-09-15T00:00:30.000Z",
      "2026-09-15T00:00:30.000Z".replace("0", "٠"),
      "",
      `${T30}${" ".repeat(200_000)}`,
    ])
      expect(() => epoch(value), value.slice(0, 40)).toThrowError(
        expect.objectContaining({ code: "EVIDENCE_TIME_INVALID" }),
      );
    for (const value of [undefined, null, 0, 1_789_430_430_000, {}, []])
      expect(() => epoch(value)).toThrowError(
        expect.objectContaining({ code: "EVIDENCE_TIME_INVALID" }),
      );
  });

  it("rejects malformed timestamps at every public time input", () => {
    const f = fixtures();
    const bad = "2026-09-15 00:00:30" as typeof T30;
    const failures = [
      () => generateCandidates([f.left, f.right], f.assets, bad, T30),
      () => generateCandidates([f.left, f.right], f.assets, T30, bad),
      () =>
        evaluateMatch({
          left: f.left,
          right: f.left,
          registry: f.assets,
          evaluationAt: bad,
          knowledgeCutoff: T30,
        }),
      () =>
        replayMapping({
          mode: "AS_KNOWN",
          history: f.history,
          mappingId: f.history.mappingId,
          evaluationAt: bad,
          knowledgeCutoff: T30,
          replayRevision: "r",
        }),
      () => f.assets.describe(USDT, bad, T30),
    ];
    for (const failure of failures)
      expect(failure).toThrowError(
        expect.objectContaining({ code: "EVIDENCE_TIME_INVALID" }),
      );
    expect(admitMaterializedMapping(f.input, bad)).toMatchObject({
      state: "INVALID_INTERVAL",
      reason: "EVIDENCE_TIME_INVALID",
    });
  });
});

describe("fifth acceptance: no caller-supplied budget authority (M-02)", () => {
  it("public entry points neither accept nor touch a budget argument", () => {
    const f = fixtures();
    const command = approveCommand({
      commandId: "approve-tripwire",
      candidateId: "candidate",
      candidateDigest: "candidate-digest",
      expectedRevision: 0,
      proposedBy: "product-proposer",
      mappingId: "tripwire-mapping",
      leftInstrumentId: f.input.mapping.leftInstrumentId,
      rightInstrumentId: f.input.mapping.rightInstrumentId,
      exposureKey: f.input.mapping.exposureKey,
      effectiveFrom: T0,
      effectiveTo: T30D,
      recordedKnowledgeAt: T0,
      registryRevision: "registry-v1",
      evidenceRevision: "evidence-v1",
      reasonText: "reviewed",
      approvals: [
        { actorId: "quant", role: "QUANT_REVIEWER", recordedAt: T0 },
        { actorId: "market", role: "MARKET_DATA_REVIEWER", recordedAt: T0 },
      ],
    });
    const identity = {
      productClass: "DERIVATIVE" as const,
      baseAssetId: canonicalAssetId("asset:A"),
      quoteAssetId: USDT,
      settlementAssetId: USDT,
      contractType: "PERPETUAL" as const,
      valueConvention: "LINEAR" as const,
      exposureUnit: "BASE_UNIT" as const,
    };
    const calls: [string, (extra: unknown) => unknown][] = [
      [
        "admitMaterializedMapping",
        (extra) =>
          (admitMaterializedMapping as (...a: unknown[]) => unknown)(
            f.input,
            T30,
            undefined,
            extra,
          ),
      ],
      [
        "approveCommand",
        (extra) =>
          (approveCommand as (...a: unknown[]) => unknown)(
            { ...command, kind: undefined, commandDigest: undefined },
            extra,
          ),
      ],
      [
        "MappingLedger",
        (extra) =>
          new (MappingLedger as unknown as new (...a: unknown[]) => unknown)(
            [f.input.mapping],
            [],
            extra,
          ),
      ],
      [
        "MappingLedger.apply",
        (extra) =>
          (
            new MappingLedger().apply as unknown as (...a: unknown[]) => unknown
          ).call(new MappingLedger(), command, extra),
      ],
      [
        "CuratedAssetRegistry",
        (extra) =>
          new (
            CuratedAssetRegistry as unknown as new (...a: unknown[]) => unknown
          )(f.assets.revision, extra),
      ],
      [
        "CuratedAssetRegistry.resolve",
        (extra) =>
          (f.assets.resolve as unknown as (...a: unknown[]) => unknown).call(
            f.assets,
            f.left.metadata.venue,
            f.left.metadata.productGroup,
            f.left.nativeBaseAssetReference,
            "BASE",
            T30,
            T30,
            extra,
          ),
      ],
      [
        "CuratedAssetRegistry.describe",
        (extra) =>
          (f.assets.describe as unknown as (...a: unknown[]) => unknown).call(
            f.assets,
            canonicalAssetId("asset:A"),
            T30,
            T30,
            extra,
          ),
      ],
      [
        "candidateProvenanceDigest",
        (extra) =>
          (candidateProvenanceDigest as (...a: unknown[]) => unknown)(
            f.input.candidate,
            extra,
          ),
      ],
      [
        "canonicalExposureKey",
        (extra) =>
          (canonicalExposureKey as (...a: unknown[]) => unknown)(
            identity,
            extra,
          ),
      ],
    ];
    for (const [name, call] of calls) {
      const wire = tripwire();
      const outcome = capture(() => call(wire.proxy));
      expect(wire.touched, name).toEqual([]);
      expect(outcome.error, name).toBeUndefined();
    }
    // Declared arities expose no budget parameter.
    expect(admitMaterializedMapping.length).toBe(3);
    expect(approveCommand.length).toBe(1);
    expect(candidateProvenanceDigest.length).toBe(1);
    expect(canonicalExposureKey.length).toBe(1);
    expect(MappingLedger.prototype.apply.length).toBe(1);
    expect(CuratedAssetRegistry.prototype.resolve.length).toBe(6);
    expect(CuratedAssetRegistry.prototype.describe.length).toBe(3);
  });

  it("public helpers bound caller input on their own budget", () => {
    expect(() =>
      canonicalExposureKey({
        productClass: "DERIVATIVE",
        baseAssetId: canonicalAssetId("asset:A"),
        quoteAssetId: "q".repeat(5_000_000) as typeof USDT,
        settlementAssetId: USDT,
        contractType: "PERPETUAL",
        valueConvention: "LINEAR",
        exposureUnit: "BASE_UNIT",
      }),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(() =>
      canonicalExposureKey({
        productClass: "SPOT",
      } as never),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    const f = fixtures();
    expect(() =>
      f.assets.resolve(
        f.left.metadata.venue,
        f.left.metadata.productGroup,
        "n".repeat(1_000_000),
        "BASE",
        T30,
        T30,
      ),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(() =>
      f.assets.resolve(
        f.left.metadata.venue,
        f.left.metadata.productGroup,
        f.left.nativeBaseAssetReference,
        "OTHER" as never,
        T30,
        T30,
      ),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });
});

describe("fifth acceptance: final check before every public outcome", () => {
  const f = fixtures();
  const outcomes: readonly [string, (signal: Signal) => unknown][] = [
    ["registry READY", (s) => admitRegistryRevision(f.assets.revision, s)],
    [
      "registry QUARANTINED",
      (s) =>
        admitRegistryRevision(
          {
            ...f.assets.revision,
            aliases: [
              {
                aliasId: "x",
                registryRevision: "registry-v1",
                aliasAssetId: canonicalAssetId("asset:X"),
                targetAssetId: canonicalAssetId("asset:X"),
                effectiveFrom: T0,
                effectiveTo: T30D,
                recordedKnowledgeAt: T0,
                reviewedBy: "r",
              },
            ],
          },
          s,
        ),
    ],
    [
      "command APPLIED",
      (s) =>
        admitMappingCommand(
          new MappingLedger(),
          f.input.history[0]!.command,
          s,
        ),
    ],
    [
      "command REJECTED",
      (s) =>
        admitMappingCommand(
          new MappingLedger(),
          { ...f.input.command, expectedRevision: 5 },
          s,
        ),
    ],
    [
      "command QUARANTINED",
      (s) => {
        const first = approvedMapping(f.left, f.right, "APPROVED", {
          exposureKey: "other-key",
        });
        const original = f.input.history[0]!.command;
        const second = approveCommand({
          ...original,
          mappingId: "second-mapping",
          approvals: original.approvals.map(
            ({ actorId, role, recordedAt }) => ({ actorId, role, recordedAt }),
          ),
        });
        return admitMappingCommand(new MappingLedger([first]), second, s);
      },
    ],
    ["admission VALID", (s) => admitMaterializedMapping(f.input, T30, s)],
    [
      "admission REVISION_MISMATCH",
      (s) =>
        admitMaterializedMapping(
          { ...f.input, review: { ...f.input.review, reviewId: "forged" } },
          T30,
          s,
        ),
    ],
    [
      "admission INVALID_INTERVAL",
      (s) =>
        admitMaterializedMapping(
          f.input,
          "2026-11-30T00:00:00.000Z" as typeof T30,
          s,
        ),
    ],
    [
      "admission QUARANTINED",
      (s) =>
        admitMaterializedMapping(
          {
            ...f.input,
            mapping: { ...f.input.mapping, status: "QUARANTINED" },
          },
          T30,
          s,
        ),
    ],
    [
      "evaluation MATCHED",
      (s) =>
        evaluateMatch({
          left: f.left,
          right: f.right,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          mapping: f.input,
          signal: s,
        }),
    ],
    [
      "evaluation NOT_MATCHED",
      (s) =>
        evaluateMatch({
          left: f.left,
          right: f.left,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          signal: s,
        }),
    ],
    [
      "evaluation UNAVAILABLE",
      (s) =>
        evaluateMatch({
          left: f.left,
          right: f.right,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          signal: s,
        }),
    ],
    [
      "evaluation AMBIGUOUS",
      (s) =>
        evaluateMatch({
          left: f.left,
          right: instrument({ name: "UNBOUND" }),
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          signal: s,
        }),
    ],
    [
      "batch",
      (s) =>
        evaluateBatch(
          [
            {
              left: f.left,
              right: f.right,
              registry: f.assets,
              evaluationAt: T30,
              knowledgeCutoff: T30,
            },
          ],
          s,
        ),
    ],
    [
      "replay MATCHED",
      (s) =>
        replayMapping({
          mode: "AS_KNOWN",
          history: f.history,
          mappingId: f.history.mappingId,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          replayRevision: "r",
          signal: s,
        }),
    ],
    [
      "replay UNAVAILABLE",
      (s) =>
        replayMapping({
          mode: "AS_KNOWN",
          history: f.history,
          mappingId: f.history.mappingId,
          evaluationAt: "2026-12-30T00:00:00.000Z" as typeof T30,
          knowledgeCutoff: T30,
          replayRevision: "r",
          signal: s,
        }),
    ],
    [
      "candidates",
      (s) => generateCandidates([f.left, f.right], f.assets, T30, T30, s),
    ],
    ["evidence", (s) => validateEvidenceBundle([], [], s)],
  ];
  for (const [name, operation] of outcomes)
    it(`publishes ${name} only after its final check, and never after cancellation`, () => {
      const trace = traceOperation(operation);
      expect(trace.error, name).toBeUndefined();
      expect(publicationTail(trace), name).toBe(0);
      expect(maximumInterruptibleGap(trace), name).toBeLessThanOrEqual(
        MATCHING_LIMITS.cancellationInterval * 128,
      );
      // Cancellation requested at the final check prevents publication.
      const cancelled = traceOperation(operation, trace.checks.length - 1);
      expect(cancelled.result, name).toBeUndefined();
      expect(code(cancelled.error), name).toBe("EVALUATION_CANCELLED");
    });

  it("covers the expected typed outcomes", () => {
    const states = outcomes.map(([name, operation]) => {
      const value = operation({ aborted: false }) as Record<string, unknown>;
      return `${name}=${String(value.status ?? value.state ?? value.outcome ?? (Array.isArray(value) ? "LIST" : "?"))}`;
    });
    expect(states).toEqual([
      "registry READY=READY",
      "registry QUARANTINED=QUARANTINED",
      "command APPLIED=APPLIED",
      "command REJECTED=REJECTED",
      "command QUARANTINED=QUARANTINED",
      "admission VALID=VALID",
      "admission REVISION_MISMATCH=REVISION_MISMATCH",
      "admission INVALID_INTERVAL=INVALID_INTERVAL",
      "admission QUARANTINED=QUARANTINED",
      "evaluation MATCHED=MATCHED",
      "evaluation NOT_MATCHED=NOT_MATCHED",
      "evaluation UNAVAILABLE=UNAVAILABLE",
      "evaluation AMBIGUOUS=AMBIGUOUS",
      "batch=LIST",
      "replay MATCHED=MATCHED",
      "replay UNAVAILABLE=UNAVAILABLE",
      "candidates=LIST",
      "evidence=LIST",
    ]);
  });
});

describe("fifth acceptance: precharge (actual work never ahead of charges)", () => {
  const f = fixtures();
  const universe = Array.from({ length: 24 }, (_, index) =>
    instrument({
      name: `PRECHARGE_${index}`,
      base: canonicalAssetId(`asset:${"LONG".repeat(38)}`),
    }),
  );
  const universeRegistry = registry(universe);
  const evidence = Array.from({ length: 100 }, (_, index): EvidenceRecord => ({
    evidenceId: `evidence-${index}-${"i".repeat(140)}`,
    evidenceClass: "FROZEN_METADATA",
    sourceId: "s".repeat(160),
    sourceRevision: "source-v1",
    sourceDigest: `digest-${index}`,
    productScope: "ORDINARY_LINEAR_PERPETUAL",
    retrievalDate: "2026-09-15",
    recordedAt: T0,
    validFrom: T0,
    validTo: T30D,
    quality: "VERIFIED",
    policyRevision: "instrument-matching-pilot/v1",
    description: `reviewed ${"<b".repeat(8)} ${"d".repeat(460)}`,
  }));
  const operations: readonly [string, (work: WorkBudget) => unknown][] = [
    [
      "registry construction",
      (work) => registryWithBudget(universeRegistry.revision, work),
    ],
    [
      "candidate generation",
      (work) =>
        generateCandidatesWithBudget(
          universe,
          universeRegistry,
          T30,
          T30,
          work,
        ),
    ],
    [
      "admission",
      (work) => admitMaterializedMappingWithBudget(f.input, T30, work),
    ],
    [
      "command application",
      (work) =>
        applyWithBudget(new MappingLedger(), f.input.history[0]!.command, work),
    ],
    [
      "evidence records",
      (work) => {
        for (const record of evidence) assertEvidenceRecord(record, work);
      },
    ],
  ];
  for (const [name, operation] of operations)
    it(`charges ${name} no later than the next check`, () => {
      const trace = traceBudgeted(operation);
      expect(trace.error, name).toBeUndefined();
      expect(maximumDeficit(trace), name).toBeLessThanOrEqual(0);
    });
});

describe("fifth acceptance: M-01 capacity semantics (Option A)", () => {
  const universe = (groups: number, venues: number, unique: boolean) => {
    const items: VenueInstrumentEvidence[] = [];
    for (let group = 0; group < groups; group += 1)
      for (let venue = 0; venue < venues; venue += 1)
        items.push(
          instrument({
            name: `CAP${group}V${venue}`,
            venue: `CAP_VENUE_${venue}`,
            base: canonicalAssetId(
              `asset:CAP${unique ? `${group}_${venue}` : group}`,
            ),
          }),
        );
    return items;
  };
  const snapshot = (value: unknown) =>
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? `${item}n` : item,
    );
  for (const [name, items] of [
    ["1,024 instruments (256 groups x 4 venues)", universe(256, 4, false)],
    ["1,023 instruments with zero pairs", universe(341, 3, true)],
  ] as const)
    it(`fails closed without publication for ${name}`, () => {
      expect(items.length).toBeLessThanOrEqual(MATCHING_LIMITS.instruments);
      const curated = registry(items);
      const before = snapshot(items) + snapshot(curated.revision);
      const trace = traceOperation((signal) =>
        generateCandidates(items, curated, T30, T30, signal),
      );
      // Option A: the cumulative 100,000-step bound may fire below the
      // structural instrument ceiling; the whole batch fails closed.
      expect(trace.result).toBeUndefined();
      expect(code(trace.error)).toBe("MATCHING_BOUND_EXCEEDED");
      expect(snapshot(items) + snapshot(curated.revision)).toBe(before);
    });

  it("keeps 1,025 instruments a structural one-over rejection", () => {
    const items = universe(205, 5, false);
    expect(items.length).toBe(1_025);
    expect(() =>
      generateCandidates(items, registry(items), T30, T30),
    ).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
  });

  it("does not guess capacity: a small matchable universe still publishes completely", () => {
    const items = universe(20, 3, false);
    const result = generateCandidates(items, registry(items), T30, T30);
    expect(result).toHaveLength(60);
  });

  it("keeps the schema-token bound larger than every fixed vocabulary", () => {
    expect(MAXIMUM_SCHEMA_TOKEN).toBeGreaterThanOrEqual(
      "nativeSettlementAssetReference".length,
    );
    expect(
      invalidateCommand.length + approveCommand.length,
    ).toBeGreaterThanOrEqual(2);
  });
});
