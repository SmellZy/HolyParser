import { canonicalAssetId } from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import { admitMaterializedMapping } from "./admission.js";
import { WORK_UNITS_PER_STEP, WorkBudget, parseBoundedJson } from "./bounds.js";
import {
  generateCandidates,
  generateCandidatesWithBudget,
  resolveExposureIdentity,
} from "./candidates.js";
import {
  MappingLedger,
  admitMappingCommand,
  approveCommand,
} from "./commands.js";
import { evaluateBatch, evaluateMatch } from "./evaluator.js";
import { validateEvidenceBundle } from "./evidence.js";
import { immutableCandidate } from "./immutable.js";
import type { EvidenceRecord } from "./model.js";
import { MATCHING_LIMITS } from "./policy.js";
import { admitRegistryRevision } from "./registry.js";
import { replayMapping } from "./replay.js";
import {
  canonicalExposureKey,
  canonicalSerialize,
  deterministicId,
  sha256,
} from "./serialization.js";
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
import {
  maximumInterruptibleGap,
  publicationTail,
  traceOperation,
  type OracleTrace,
} from "./work-oracle.js";

// The implementation work model: at most 128 logical steps between
// cancellation checks, each step at most 128 fine-grained units of actual
// native work (K = 1), plus at most one fully precharged atomic native call.
const INTERRUPTIBLE_GAP_CEILING =
  MATCHING_LIMITS.cancellationInterval * WORK_UNITS_PER_STEP;

type Signal = { readonly aborted: boolean };

function expectBoundedTrace(trace: OracleTrace<unknown>, ceiling: number) {
  expect(trace.error).toBeUndefined();
  // A check happens before any authoritative work.
  expect(trace.checks[0]).toBe(0);
  expect(maximumInterruptibleGap(trace)).toBeLessThanOrEqual(ceiling);
  // Nothing is prepared between the final check and publication.
  expect(publicationTail(trace)).toBe(0);
}

function fixtures() {
  const left = instrument({ name: "ORACLE_LEFT" });
  const right = instrument({ name: "ORACLE_RIGHT" });
  const assets = registry([left, right]);
  const input = mappingAdmission(
    left,
    right,
    assets,
    approvedMapping(left, right, "APPROVED", { version: 64, priorVersion: 63 }),
  );
  const history = admittedHistory(input);
  const universe = Array.from({ length: 24 }, (_, index) =>
    instrument({
      name: `ORACLE_${index}`,
      base: canonicalAssetId(`asset:${"LONG".repeat(38)}`),
    }),
  );
  const universeRegistry = registry(universe);
  const forged = {
    ...input,
    review: { ...input.review, reviewId: "forged-review" },
  };
  const batch = Array.from({ length: 200 }, (_, index) => ({
    left: universe[index % 24]!,
    right: universe[(index + 1) % 24]!,
    registry: universeRegistry,
    evaluationAt: T30,
    knowledgeCutoff: T30,
  }));
  const evidence = Array.from({ length: 300 }, (_, index): EvidenceRecord => ({
    evidenceId: `evidence-${index}-${"i".repeat(140)}`,
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
    description: `reviewed ${"<b".repeat(8)} ${"d".repeat(460)}`,
  }));
  const command = (index: number) =>
    approveCommand({
      commandId: `oracle-command-${index}`,
      candidateId: "candidate",
      candidateDigest: "candidate-digest",
      expectedRevision: 0,
      proposedBy: "product-proposer",
      mappingId: `oracle-mapping-${index}`,
      leftInstrumentId: `L${index}:${"l".repeat(4_000)}`,
      rightInstrumentId: `R${index}:${"r".repeat(4_000)}`,
      exposureKey: "k".repeat(4_000),
      effectiveFrom: T0,
      effectiveTo: T30D,
      recordedKnowledgeAt: T0,
      registryRevision: "registry-v1",
      evidenceRevision: "evidence-v1",
      reasonText: "reviewed".padEnd(500, "."),
      approvals: [
        { actorId: "quant", role: "QUANT_REVIEWER", recordedAt: T0 },
        { actorId: "market", role: "MARKET_DATA_REVIEWER", recordedAt: T0 },
      ],
    });
  let ledger = new MappingLedger();
  for (let index = 0; index < 100; index += 1)
    ledger = ledger.apply(command(index)).ledger;
  const next = command(100);
  return {
    left,
    right,
    assets,
    input,
    history,
    universe,
    universeRegistry,
    forged,
    batch,
    evidence,
    ledger,
    next,
  };
}

describe("independent oracle: actual work between cancellation checks", () => {
  const f = fixtures();
  const operations: readonly [string, (signal: Signal) => unknown][] = [
    [
      "candidate generation (24 long-asset instruments)",
      (signal) =>
        generateCandidates(f.universe, f.universeRegistry, T30, T30, signal),
    ],
    [
      "standalone admission (64-version history, VALID)",
      (signal) => admitMaterializedMapping(f.input, T30, signal),
    ],
    [
      "standalone admission (typed REVISION_MISMATCH)",
      (signal) => admitMaterializedMapping(f.forged, T30, signal),
    ],
    [
      "match evaluation with admitted mapping",
      (signal) =>
        evaluateMatch({
          left: f.left,
          right: f.right,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          mapping: f.input,
          signal,
        }),
    ],
    ["batch evaluation (200)", (signal) => evaluateBatch(f.batch, signal)],
    [
      "replay (64 versions)",
      (signal) =>
        replayMapping({
          mode: "CORRECTED",
          history: f.history,
          mappingId: f.history.mappingId,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          replayRevision: "oracle-replay",
          signal,
        }),
    ],
    [
      "evidence bundle (300 near-limit records)",
      (signal) =>
        validateEvidenceBundle(
          f.evidence,
          [{ subjectId: "subject", evidenceIds: [f.evidence[0]!.evidenceId] }],
          signal,
        ),
    ],
    [
      "registry admission",
      (signal) => admitRegistryRevision(f.universeRegistry.revision, signal),
    ],
    [
      "mapping command admission (4,096-byte composite IDs)",
      (signal) => admitMappingCommand(f.ledger, f.next, signal),
    ],
  ];

  for (const [name, operation] of operations)
    it(`bounds interruptible actual work for ${name}`, () => {
      const trace = traceOperation(operation);
      expect(trace.checks.length).toBeGreaterThan(1);
      expectBoundedTrace(trace, INTERRUPTIBLE_GAP_CEILING);
    });

  it("bounds the standalone input parser at its approved bulk rates", () => {
    // parseBoundedJson (no matching operation calls it) keeps the approved
    // 16 MiB-compatible rates: 4,096 bytes/step for native decode/parse and
    // 256 JSON-string code units/step, i.e. at most 2x the fine-grained rate
    // plus per-node bookkeeping.
    const bytes = new TextEncoder().encode(
      JSON.stringify(
        Array.from(
          { length: 2_000 },
          (_, index) => `${"v".repeat(500)}${index}`,
        ),
      ),
    );
    const trace = traceOperation((signal) => parseBoundedJson(bytes, signal));
    expectBoundedTrace(trace, 3 * INTERRUPTIBLE_GAP_CEILING);
  });
});

describe("independent oracle: actual work never exceeds charged work", () => {
  const f = fixtures();
  it("keeps total actual work within charged units across operations", () => {
    const measured: [string, (work: WorkBudget) => unknown][] = [
      [
        "candidates",
        (work) =>
          generateCandidatesWithBudget(
            f.universe,
            f.universeRegistry,
            T30,
            T30,
            work,
          ),
      ],
      [
        "admission",
        (work) => admitMaterializedMapping(f.input, T30, undefined, work),
      ],
      ["ledger", (work) => f.ledger.apply(f.next, work)],
    ];
    for (const [name, operation] of measured) {
      let charged = 0;
      const trace = traceOperation((signal) => {
        const work = new WorkBudget(signal);
        const result = operation(work);
        work.beforePublication();
        charged = work.steps * WORK_UNITS_PER_STEP;
        return result;
      });
      expect(trace.error, name).toBeUndefined();
      expect(trace.end, name).toBeLessThanOrEqual(charged);
    }
  });

  it("scales charged work with actual work for longer valid identifiers", () => {
    const run = (length: number) => {
      const base = canonicalAssetId(`asset:${"A".repeat(length - 6)}`);
      const instruments = Array.from({ length: 8 }, (_, index) =>
        instrument({ name: `SCALE_${index}`, base }),
      );
      const curated = registry(instruments);
      let steps = 0;
      const trace = traceOperation((signal) => {
        const work = new WorkBudget(signal);
        const result = generateCandidatesWithBudget(
          instruments,
          curated,
          T30,
          T30,
          work,
        );
        work.beforePublication();
        steps = work.steps;
        return result;
      });
      return { steps, actual: trace.end, trace };
    };
    const short = run(10);
    const long = run(155);
    expect(long.actual).toBeGreaterThan(short.actual);
    expect(long.steps).toBeGreaterThan(short.steps);
    // Extra actual work caused by the longer IDs is itself fully charged.
    expect(long.actual - short.actual).toBeLessThanOrEqual(
      (long.steps - short.steps + 1) * WORK_UNITS_PER_STEP,
    );
    expectBoundedTrace(long.trace, INTERRUPTIBLE_GAP_CEILING);
  });
});

describe("independent oracle: caller-supplied timestamp parsing", () => {
  it("charges a hostile long timestamp before Date.parse and fails typed", () => {
    const base = registry([instrument({ name: "TIME" })]).revision;
    const hostile = `${T0}${" ".repeat(200_000)}`;
    const revision = {
      ...base,
      bindings: base.bindings.map((binding, index) =>
        index === 0 ? { ...binding, recordedKnowledgeAt: hostile } : binding,
      ),
    } as typeof base;
    const trace = traceOperation((signal) =>
      admitRegistryRevision(revision, signal),
    );
    expect(trace.error).toMatchObject({ code: "EVIDENCE_TIME_INVALID" });
    // The parse was charged (hundreds of steps => many checks) before the
    // atomic native Date.parse ran; interruptible work stays bounded.
    expect(trace.checks.length).toBeGreaterThan(
      hostile.length /
        WORK_UNITS_PER_STEP /
        MATCHING_LIMITS.cancellationInterval,
    );
    expect(maximumInterruptibleGap(trace)).toBeLessThanOrEqual(
      INTERRUPTIBLE_GAP_CEILING,
    );
  });

  it("charges replay cutoff parsing per comparison", () => {
    const f = fixtures();
    const run = (knowledgeCutoff: string) => {
      let checks = 0;
      replayMapping({
        mode: "AS_KNOWN",
        history: f.history,
        mappingId: f.history.mappingId,
        evaluationAt: T30,
        knowledgeCutoff: knowledgeCutoff as typeof T30,
        replayRevision: "timestamp-cost",
        signal: {
          get aborted() {
            checks += 1;
            return false;
          },
        },
      });
      return checks;
    };
    expect(run(`${T30}${" ".repeat(20_000)}`)).toBeGreaterThan(run(T30) + 10);
  });
});

describe("independent oracle: negative control", () => {
  it("detects the acceptance-4 pattern of one charged step hiding materialization work", () => {
    // Emulates the pre-remediation defect: one step per candidate while key,
    // provisional/candidate serialization, hashing and copying run unbudgeted.
    const base = canonicalAssetId(`asset:${"A".repeat(149)}`);
    const left = instrument({ name: "CONTROL_LEFT", base });
    const right = instrument({
      name: "CONTROL_RIGHT",
      venue: "CONTROL_VENUE",
      base,
    });
    const curated = registry([left, right]);
    const resolved = resolveExposureIdentity(left, curated, T30, T30);
    const trace = traceOperation((signal) => {
      const work = new WorkBudget(signal);
      for (let index = 0; index < 1_000; index += 1) {
        work.step();
        const key = canonicalExposureKey(resolved.identity!);
        const id = deterministicId("control/v1", {
          key,
          provisional: canonicalSerialize({ base, index: String(index) }),
        });
        immutableCandidate({
          candidateId: id,
          evidenceSetDigest: sha256(key),
          reasons: [],
        } as never);
      }
      work.beforePublication();
    });
    expect(trace.error).toBeUndefined();
    expect(maximumInterruptibleGap(trace)).toBeGreaterThan(
      4 * INTERRUPTIBLE_GAP_CEILING,
    );
  });
});
