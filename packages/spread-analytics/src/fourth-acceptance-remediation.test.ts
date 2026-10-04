import { readFileSync, readdirSync } from "node:fs";
import { canonicalAssetId } from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import {
  admitMaterializedMapping,
  admitMaterializedMappingWithBudget,
  candidateProvenanceDigest,
  candidateProvenanceDigestWithBudget,
} from "./admission.js";
import {
  WORK_UNITS_PER_STEP,
  WorkBudget,
  assertAtomicId,
  assertCompositeId,
  assertEvidenceRecord,
  assertReasonText,
} from "./bounds.js";
import {
  generateCandidates,
  generateCandidatesWithBudget,
  makeCandidate,
  resolveExposureIdentity,
} from "./candidates.js";
import { MappingLedger, approveCommand } from "./commands.js";
import { immutableCandidate } from "./immutable.js";
import type { EvidenceRecord, VenueInstrumentEvidence } from "./model.js";
import { MATCHING_LIMITS } from "./policy.js";
import { CuratedAssetRegistry, registryWithBudget } from "./registry.js";
import { replayMapping } from "./replay.js";
import {
  canonicalExposureKey,
  canonicalExposureKeyWithBudget,
  canonicalSerialize,
  deterministicId,
  sha256,
} from "./serialization.js";
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
import { createTransitionRecord } from "./transitions.js";
import { validateVenueInstrumentEvidence } from "./validation.js";

const asset = (length: number) =>
  canonicalAssetId(`asset:${"A".repeat(length - 6)}`);

function legs(length: number, options: { unknownEconomics?: boolean } = {}) {
  const multiplier = options.unknownEconomics ? "UNKNOWN" : undefined;
  const left = instrument({
    name: "CANDIDATE_LEFT",
    base: asset(length),
    multiplier,
  });
  const right = instrument({
    name: "CANDIDATE_RIGHT",
    venue: "CANDIDATE_RIGHT_VENUE",
    base: asset(length),
    multiplier,
  });
  const curated = registry([left, right]);
  return {
    left: resolveExposureIdentity(left, curated, T30, T30, new WorkBudget()),
    right: resolveExposureIdentity(right, curated, T30, T30, new WorkBudget()),
    curated,
    instruments: [left, right] as const,
  };
}

/** Steps charged to one budget by `operation`, including the final remainder. */
function cost(operation: (work: WorkBudget) => unknown): number {
  const work = new WorkBudget();
  operation(work);
  work.beforePublication();
  return work.steps;
}

function materialization(length: number) {
  const { left, right, curated } = legs(length);
  const work = new WorkBudget();
  const candidate = makeCandidate(left, right, curated, T30, T30, work);
  work.beforePublication();
  return { steps: work.steps, candidate };
}

/** A budget that aborts at its first check at or after `abortAtStep`. */
function cancellingBudget(abortAtStep: number) {
  let checkedAt = -1;
  const work = new WorkBudget(
    {
      get aborted() {
        return checkedAt >= abortAtStep;
      },
    },
    {
      checked(_gap, total) {
        checkedAt = total;
      },
    },
  );
  return work;
}

function expectCancelledInside(operation: () => unknown, frame: string): void {
  let published: unknown;
  let failure: unknown;
  try {
    published = operation();
  } catch (error) {
    failure = error;
  }
  expect(published).toBeUndefined();
  expect(failure).toMatchObject({ code: "EVALUATION_CANCELLED" });
  // The check fired while the named repeated work was in progress, not after.
  expect((failure as Error).stack).toContain(frame);
}

function grouped(sizes: readonly number[]): VenueInstrumentEvidence[] {
  return sizes.flatMap((size, group) =>
    Array.from({ length: size }, (_, member) =>
      instrument({
        name: `H03_${group}_${member}`,
        venue: `H03_VENUE_${group}_${member}`,
        base: canonicalAssetId(`asset:H03_GROUP_${group}`),
      }),
    ),
  );
}

describe("fourth acceptance H-03 exact counterexample", () => {
  it("charges a long valid canonical asset ID deterministically more than a short one", () => {
    // Acceptance-4 observed exactly one charged step for both inputs.
    const short = materialization(10);
    const long = materialization(155);
    expect(materialization(10).steps).toBe(short.steps);
    expect(materialization(155).steps).toBe(long.steps);
    expect(short.steps).toBeGreaterThan(1);
    // The 145 extra code units are traversed by at least twelve charged
    // passes (two exposure keys, their comparison, two provisional encodings,
    // their comparison and the candidate-ID encoding, concatenation and hash).
    expect(long.steps - short.steps).toBeGreaterThanOrEqual(
      Math.floor((145 * 12) / WORK_UNITS_PER_STEP),
    );
    expect(long.candidate.exposureKey).toBe(
      canonicalExposureKey(legs(155).left.identity!),
    );
    expect(long.candidate.exposureKey!.length).toBeGreaterThan(
      short.candidate.exposureKey!.length + 100,
    );
  });

  it("charges provisional-only materialization proportionally as well", () => {
    const short = cost((work) => {
      const { left, right, curated } = legs(10, { unknownEconomics: true });
      makeCandidate(left, right, curated, T30, T30, work);
    });
    const long = cost((work) => {
      const { left, right, curated } = legs(155, { unknownEconomics: true });
      makeCandidate(left, right, curated, T30, T30, work);
    });
    expect(long).toBeGreaterThan(short);
  });

  it("keeps canonical bytes and digests identical with and without budget plumbing", () => {
    const values = [
      { asset: asset(155), roles: ["BASE", "QUOTE"], nothing: null },
      { escaped: '"quoted"\\slash', astral: "\u{1F600}x", bmp: "é中" },
      [true, false, null, "", ["nested", { z: "1", a: "2" }]],
    ] as const;
    for (const value of values) {
      const work = new WorkBudget();
      expect(canonicalSerialize(value, work)).toBe(canonicalSerialize(value));
      expect(deterministicId("h03/v1", value, work)).toBe(
        deterministicId("h03/v1", value),
      );
      expect(sha256(canonicalSerialize(value), work)).toBe(
        sha256(canonicalSerialize(value)),
      );
      expect(work.steps).toBeGreaterThanOrEqual(0);
    }
    const identity = legs(155).left.identity!;
    expect(canonicalExposureKeyWithBudget(identity, new WorkBudget())).toBe(
      canonicalExposureKey(identity),
    );
    // Golden pilot vector from the D-055 serialization suite is unchanged.
    expect(
      sha256(
        canonicalExposureKey({
          productClass: "DERIVATIVE",
          baseAssetId: canonicalAssetId("asset:A"),
          quoteAssetId: USDT,
          settlementAssetId: USDT,
          contractType: "PERPETUAL",
          valueConvention: "LINEAR",
          exposureUnit: "BASE_UNIT",
        }),
        new WorkBudget(),
      ),
    ).toBe(
      sha256(
        canonicalExposureKey({
          productClass: "DERIVATIVE",
          baseAssetId: canonicalAssetId("asset:A"),
          quoteAssetId: USDT,
          settlementAssetId: USDT,
          contractType: "PERPETUAL",
          valueConvention: "LINEAR",
          exposureUnit: "BASE_UNIT",
        }),
      ),
    );
  });

  it("produces identical candidates through budgeted and public generation", () => {
    const { instruments, curated } = legs(155);
    const work = new WorkBudget();
    const budgeted = generateCandidatesWithBudget(
      instruments,
      curated,
      T30,
      T30,
      work,
    );
    expect(generateCandidates(instruments, curated, T30, T30)).toEqual(
      budgeted,
    );
  });
});

describe("fourth acceptance H-03 long valid near-boundary values", () => {
  it("charges maximal valid atomic, composite and reason values, not zero", () => {
    expect(cost((work) => assertAtomicId("a".repeat(160), "ID", work))).toBe(5);
    expect(
      cost((work) => assertAtomicId("\u{1F600}".repeat(80), "Astral ID", work)),
    ).toBeGreaterThan(cost((work) => assertAtomicId("a", "ID", work)));
    expect(
      cost((work) =>
        assertCompositeId("b".repeat(MATCHING_LIMITS.compositeIdUtf8), work),
      ),
    ).toBeGreaterThan(cost((work) => assertCompositeId("b", work)) + 10);
    const reason = `reviewed ${"c".repeat(MATCHING_LIMITS.reasonTextUtf8 - 9)}`;
    expect(Buffer.byteLength(reason)).toBe(MATCHING_LIMITS.reasonTextUtf8);
    expect(cost((work) => assertReasonText(reason, work))).toBeGreaterThan(
      cost((work) => assertReasonText("reviewed", work)) + 5,
    );
  });

  it("charges the markup-pattern worst case of a bounded reason text", () => {
    const plain = `reviewed ${"c".repeat(500)}`;
    const angled = `reviewed ${"<".repeat(500)}`;
    expect(Buffer.byteLength(angled)).toBeLessThanOrEqual(512);
    expect(() => assertReasonText(angled)).not.toThrow();
    expect(cost((work) => assertReasonText(angled, work))).toBeGreaterThan(
      cost((work) => assertReasonText(plain, work)) + 1_000,
    );
  });

  it("charges JSON escape expansion of hostile unvalidated text", () => {
    const plain = cost((work) =>
      canonicalSerialize({ x: "a".repeat(10_000) }, work),
    );
    const escaped = cost((work) =>
      canonicalSerialize({ x: "\u0001".repeat(10_000) }, work),
    );
    // Each control character expands to six output code units.
    expect(escaped - plain).toBeGreaterThanOrEqual(
      Math.floor((5 * 10_000 * 2) / WORK_UNITS_PER_STEP),
    );
    expect(canonicalSerialize({ x: "\u0001" }, new WorkBudget())).toBe(
      canonicalSerialize({ x: "\u0001" }),
    );
  });

  it("charges long registry, evidence, transition and candidate identifiers", () => {
    const id = (prefix: string, long: boolean) =>
      long ? `${prefix}-${"r".repeat(150)}`.slice(0, 160) : prefix;
    const registryCost = (long: boolean) =>
      cost((work) => {
        const base = registry([instrument({ name: "REG" })]).revision;
        registryWithBudget(
          {
            ...base,
            revision: id("registry", long),
            bindings: base.bindings.map((binding) => ({
              ...binding,
              bindingId: id(binding.bindingId, long),
              evidenceRevision: id("binding-evidence", long),
              reviewedBy: id("reviewer", long),
            })),
          },
          work,
        );
      });
    expect(registryCost(true)).toBeGreaterThan(registryCost(false));

    const evidence = (long: boolean): EvidenceRecord => ({
      evidenceId: id("evidence", long),
      evidenceClass: "FROZEN_METADATA",
      sourceId: id("source", long),
      sourceRevision: id("source-v1", long),
      sourceDigest: id("digest", long),
      productScope: "ORDINARY_LINEAR_PERPETUAL",
      retrievalDate: "2026-09-15",
      recordedAt: T0,
      validFrom: T0,
      validTo: T30D,
      quality: "VERIFIED",
      policyRevision: "instrument-matching-pilot/v1",
      description: long ? "d".repeat(500) : "d",
    });
    expect(
      cost((work) => assertEvidenceRecord(evidence(true), work)),
    ).toBeGreaterThan(
      cost((work) => assertEvidenceRecord(evidence(false), work)),
    );

    const transitionCost = (long: boolean) =>
      cost((work) =>
        createTransitionRecord(
          {
            transitionId: id("transition", long),
            mappingId: id("mapping", long),
            affectedVersion: 1,
            transitionType: "INVALIDATE",
            effectiveAt: T30,
            reasonCode: "MAPPING_INVALIDATED",
            reasonText: long ? "t".repeat(500) : "t",
            reference: id("reference", long),
            policyRevision: "instrument-matching-pilot/v1",
            expectedRevision: 1,
            expectedState: "APPROVED",
            proposerId: id("proposer", long),
            registryRevision: id("registry", long),
            evidenceRevision: id("evidence", long),
            provenanceDigest: id("provenance", long),
            recordedKnowledgeAt: T30,
            approvals: [
              {
                actorId: id("quant", long),
                role: "QUANT_REVIEWER",
                recordedAt: T30,
              },
              {
                actorId: id("market-data", long),
                role: "MARKET_DATA_REVIEWER",
                recordedAt: T30,
              },
            ],
          },
          work,
        ),
      );
    expect(transitionCost(true)).toBeGreaterThan(transitionCost(false) + 10);

    const candidateCost = (long: boolean) =>
      cost((work) => {
        const name = long ? `C${"N".repeat(60)}` : "C";
        const left = instrument({ name: `${name}L` });
        const right = instrument({ name: `${name}R`, venue: `${name}RV` });
        const curated = registry([left, right]);
        generateCandidatesWithBudget([left, right], curated, T30, T30, work);
      });
    expect(candidateCost(true)).toBeGreaterThan(candidateCost(false) + 50);
  });
});

describe("fourth acceptance H-03 8,192-pair and cumulative work bounds", () => {
  it("fails 8,192 valid pairs at the 100,000-step cap inside the operation, publishing nothing", () => {
    const sizes = [
      32, 32, 32, 32, 32, 32, 32, 32, 33, 33, 33, 33, 33, 33, 33, 33,
    ];
    expect(
      sizes.map((size) => (size * (size - 1)) / 2).reduce((a, b) => a + b),
    ).toBe(MATCHING_LIMITS.candidatePairs);
    const instruments = grouped(sizes);
    const curated = registry(instruments);
    let maximumGap = 0;
    const work = new WorkBudget(undefined, {
      checked(gap) {
        maximumGap = Math.max(maximumGap, gap);
      },
    });
    let published: unknown;
    let failure: unknown;
    try {
      published = generateCandidatesWithBudget(
        instruments,
        curated,
        T30,
        T30,
        work,
      );
    } catch (error) {
      failure = error;
    }
    expect(published).toBeUndefined();
    expect(failure).toMatchObject({ code: "MATCHING_BOUND_EXCEEDED" });
    // The stricter cumulative work bound, not the pair-count bound, fired
    // inside the same operation (D-064 capacity semantics, Option A: the
    // first bound reached wins; no capacity is guaranteed).
    expect((failure as Error).stack).toContain("generateCandidatesWithBudget");
    expect(work.steps).toBeLessThanOrEqual(MATCHING_LIMITS.logicalSteps);
    expect(work.steps).toBeGreaterThan(MATCHING_LIMITS.logicalSteps - 200);
    expect(maximumGap).toBe(MATCHING_LIMITS.cancellationInterval);
  });

  it("still publishes a legitimate 496-pair batch within the cumulative cap", () => {
    const instruments = Array.from({ length: 32 }, (_, index) =>
      instrument({ name: `CAPACITY_${index}` }),
    );
    const work = new WorkBudget();
    const result = generateCandidatesWithBudget(
      instruments,
      registry(instruments),
      T30,
      T30,
      work,
    );
    expect(result).toHaveLength(496);
    expect(work.steps).toBeLessThan(MATCHING_LIMITS.logicalSteps);
  });

  it("exceeds 100,000 only cumulatively across distributed stages and fails at the 100,001st step", () => {
    const fixture = versionTwoFixture();
    const instruments = Array.from({ length: 20 }, (_, index) =>
      instrument({ name: `DISTRIBUTED_${index}` }),
    );
    const evidence = Array.from({ length: 200 }, (_, index) =>
      evidenceRecord(index),
    );
    const stages: readonly [string, (work: WorkBudget) => unknown][] = [
      [
        "registry",
        (work) => registryWithBudget(registry(instruments).revision, work),
      ],
      [
        "validation",
        (work) => {
          for (const item of instruments)
            validateVenueInstrumentEvidence(item, work);
        },
      ],
      [
        "evidence",
        (work) => {
          for (const record of evidence) assertEvidenceRecord(record, work);
        },
      ],
      [
        "candidates",
        (work) =>
          generateCandidatesWithBudget(
            instruments,
            registry(instruments),
            T30,
            T30,
            work,
          ),
      ],
      [
        "admission",
        (work) => admitMaterializedMappingWithBudget(fixture.input, T30, work),
      ],
      [
        "serialization-hash",
        (work) =>
          deterministicId(
            "distributed/v1",
            Array.from({ length: 512 }, (_, index) => ({
              id: `${index}:${"s".repeat(120)}`,
            })),
            work,
          ),
      ],
    ];
    const individual = stages.map(([, stage]) => cost(stage));
    for (const steps of individual)
      expect(steps).toBeLessThan(MATCHING_LIMITS.logicalSteps / 2);
    const runAll = (work: WorkBudget) => {
      for (const [, stage] of stages) stage(work);
      work.beforePublication();
    };
    const combined = cost(runAll);
    expect(combined).toBeLessThan(MATCHING_LIMITS.logicalSteps);
    // Exactly at the cap: the complete distributed operation succeeds and the
    // next logical step is the 100,001st.
    const exact = new WorkBudget();
    exact.step(MATCHING_LIMITS.logicalSteps - combined);
    runAll(exact);
    expect(exact.steps).toBe(MATCHING_LIMITS.logicalSteps);
    expect(() => exact.step()).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    expect(() => exact.units(WORK_UNITS_PER_STEP)).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    // One step less headroom: the operation itself needs the 100,001st step.
    const over = new WorkBudget();
    over.step(MATCHING_LIMITS.logicalSteps - combined + 1);
    expect(() => runAll(over)).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    // Without any prefill, repeating the stages crosses the cap cumulatively
    // even though every individual stage stays far below it.
    const repeated = new WorkBudget();
    expect(() => {
      for (let round = 0; round < 10; round += 1)
        for (const [, stage] of stages) stage(repeated);
    }).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    expect(repeated.steps).toBeLessThanOrEqual(MATCHING_LIMITS.logicalSteps);
  });

  it("instantiates WorkBudget only at approved operation roots", () => {
    // Static inventory: no helper may create (and so reset) a budget while a
    // parent operation budget is available.
    const roots: string[] = [];
    for (const file of readdirSync(new URL(".", import.meta.url))
      .filter((name) => name.endsWith(".ts"))
      .filter(
        (name) =>
          !name.endsWith(".test.ts") &&
          name !== "test-fixtures.ts" &&
          name !== "work-oracle.ts",
      )
      .sort()) {
      const lines = readFileSync(new URL(file, import.meta.url), "utf8").split(
        "\n",
      );
      lines.forEach((line, index) => {
        if (line.includes("new WorkBudget("))
          roots.push(`${file}: ${line.trim()} @${lines[index - 1]!.trim()}`);
      });
    }
    expect(roots.map((root) => root.replace(/ @.*$/u, ""))).toEqual([
      "admission.ts: const work = new WorkBudget();",
      "admission.ts: const work = new WorkBudget(signal);",
      "bounds.ts: const work = new WorkBudget(signal);",
      "bounds.ts: const authority = work ?? new WorkBudget();",
      "candidates.ts: const work = new WorkBudget(signal);",
      "commands.ts: const work = new WorkBudget();",
      "commands.ts: const work = new WorkBudget();",
      "commands.ts: const work = parent ?? new WorkBudget();",
      "commands.ts: const work = new WorkBudget();",
      "commands.ts: const work = new WorkBudget();",
      "commands.ts: const work = new WorkBudget();",
      "commands.ts: const work = new WorkBudget(signal);",
      "diagnostics.ts: const work = new WorkBudget();",
      "evaluator.ts: const work = new WorkBudget(",
      "evaluator.ts: const work = new WorkBudget(signal);",
      "evidence.ts: const work = new WorkBudget(signal);",
      "registry.ts: const work = parent ?? new WorkBudget();",
      "registry.ts: const work = new WorkBudget();",
      "registry.ts: const work = new WorkBudget();",
      "registry.ts: const work = new WorkBudget(signal);",
      "replay.ts: const work = new WorkBudget(",
      "serialization.ts: const work = new WorkBudget();",
      "transitions.ts: const work = operationBudget ?? new WorkBudget();",
    ]);
  });
});

describe("fourth acceptance H-03 cancellation inside repeated work", () => {
  it("cancels during long ID scanning", () => {
    const work = cancellingBudget(128);
    work.step(127);
    expectCancelledInside(
      () => assertCompositeId("x".repeat(4_000), work),
      "assertCompositeId",
    );
  });

  it("cancels during canonical exposure-key serialization", () => {
    const identity = legs(155).left.identity!;
    const work = cancellingBudget(128);
    work.step(127);
    work.units(WORK_UNITS_PER_STEP - 1);
    expectCancelledInside(
      () => canonicalExposureKeyWithBudget(identity, work),
      "canonicalExposureKey",
    );
  });

  it("can cancel inside every repeated-work phase of candidate materialization", () => {
    // Sweep the abort point across the whole materialization, one prefill
    // offset at a time, and record the phase in which each check fired.
    const phases = (unknownEconomics: boolean) => {
      const { left, right, curated } = legs(155, { unknownEconomics });
      const total = cost((work) =>
        makeCandidate(left, right, curated, T30, T30, work),
      );
      const seen = new Set<string>();
      const limit = 128 * WORK_UNITS_PER_STEP;
      for (
        let prefill = limit - total * WORK_UNITS_PER_STEP;
        prefill < limit;
        prefill += 4
      ) {
        const work = cancellingBudget(128);
        work.units(Math.max(0, prefill));
        try {
          makeCandidate(left, right, curated, T30, T30, work);
        } catch (error) {
          expect(error).toMatchObject({ code: "EVALUATION_CANCELLED" });
          const stack = (error as Error).stack ?? "";
          for (const frame of [
            "canonicalExposureKey",
            "sameText",
            "canonicalSerialize",
            "provisionalValue",
            "deterministicId",
            "sha256",
            "immutableCandidate",
          ])
            if (stack.includes(frame)) seen.add(frame);
        }
      }
      return seen;
    };
    expect([...phases(false)].sort()).toEqual(
      [
        "canonicalExposureKey",
        "canonicalSerialize",
        "deterministicId",
        "immutableCandidate",
        "provisionalValue",
        "sameText",
        "sha256",
      ].sort(),
    );
    // Provisional-only (unknown economics) candidates have no exposure key;
    // their provisional serialization is still interruptible.
    const provisional = phases(true);
    expect(provisional.has("canonicalExposureKey")).toBe(false);
    for (const frame of [
      "canonicalSerialize",
      "provisionalValue",
      "deterministicId",
      "sha256",
      "immutableCandidate",
    ])
      expect(provisional.has(frame)).toBe(true);
  });

  it("cancels during provenance and deterministic-ID preparation", () => {
    const { left, right, curated } = legs(155);
    const candidate = makeCandidate(
      left,
      right,
      curated,
      T30,
      T30,
      new WorkBudget(),
    );
    const provenance = cancellingBudget(128);
    provenance.step(127);
    expectCancelledInside(
      () => candidateProvenanceDigestWithBudget(candidate, provenance),
      "deterministicId",
    );
    const identifier = cancellingBudget(128);
    identifier.step(127);
    expectCancelledInside(
      () =>
        deterministicId(
          "h03-cancel/v1",
          { asset: asset(155), list: [asset(155), asset(155)] },
          identifier,
        ),
      "deterministicId",
    );
  });

  it("cancels during immutable candidate copy/materialization", () => {
    const candidate = materialization(155).candidate;
    const work = cancellingBudget(128);
    work.step(127);
    work.units(WORK_UNITS_PER_STEP - 1);
    expectCancelledInside(
      () => immutableCandidate(candidate, work),
      "immutableCandidate",
    );
  });

  it("cancels deep inside a large candidate batch without partial publication", () => {
    const instruments = Array.from({ length: 32 }, (_, index) =>
      instrument({ name: `BATCH_CANCEL_${index}` }),
    );
    const curated = registry(instruments);
    const work = cancellingBudget(20_000);
    expectCancelledInside(
      () => generateCandidatesWithBudget(instruments, curated, T30, T30, work),
      "makeCandidate",
    );
  });

  it("cancels at the final pre-publication check with nothing published", () => {
    const instruments = Array.from({ length: 8 }, (_, index) =>
      instrument({ name: `FINAL_${index}` }),
    );
    const curated = registry(instruments);
    let reads = 0;
    generateCandidates(instruments, curated, T30, T30, {
      get aborted() {
        reads += 1;
        return false;
      },
    });
    let seen = 0;
    expectCancelledInside(
      () =>
        generateCandidates(instruments, curated, T30, T30, {
          get aborted() {
            seen += 1;
            return seen === reads;
          },
        }),
      "beforePublication",
    );
  });
});

describe("fourth acceptance H-03 atomicity", () => {
  it("leaves registry, admitted history, ledger and inputs untouched on cancellation or exhaustion", () => {
    const fixture = versionTwoFixture();
    const history = admittedHistory(fixture.input);
    const historyDigest = history.digest;
    const ledger = new MappingLedger().apply(validCommand()).ledger;
    const ledgerVersions = ledger.versions;
    const instruments = Array.from({ length: 32 }, (_, index) =>
      instrument({ name: `ATOMIC_${index}` }),
    );
    const curated = registry(instruments);
    const revision = curated.revision;
    const snapshot = structuredClone(instruments);
    for (const work of [
      cancellingBudget(10_000),
      (() => {
        const exhausted = new WorkBudget();
        exhausted.step(MATCHING_LIMITS.logicalSteps - 5_000);
        return exhausted;
      })(),
    ]) {
      let published: unknown;
      expect(() => {
        published = generateCandidatesWithBudget(
          instruments,
          curated,
          T30,
          T30,
          work,
        );
      }).toThrowError(
        expect.objectContaining({
          code: expect.stringMatching(
            /^(EVALUATION_CANCELLED|MATCHING_BOUND_EXCEEDED)$/u,
          ),
        }),
      );
      expect(published).toBeUndefined();
    }
    expect(curated.revision).toBe(revision);
    expect(Object.isFrozen(curated.revision.bindings)).toBe(true);
    expect(instruments).toEqual(snapshot);
    expect(history.digest).toBe(historyDigest);
    expect(Object.isFrozen(history.versions)).toBe(true);
    expect(ledger.versions).toBe(ledgerVersions);
    expect(
      replayMapping({
        mode: "AS_KNOWN",
        history,
        mappingId: history.mappingId,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        replayRevision: "atomicity",
      }).outcome,
    ).toBe("MATCHED");
  });

  it("applies the final check to every standalone admission outcome", () => {
    const fixture = versionTwoFixture();
    const forged = {
      ...fixture.input,
      review: { ...fixture.input.review, reviewId: "forged-review" },
    };
    for (const input of [fixture.input, forged]) {
      let reads = 0;
      admitMaterializedMapping(input, T30, {
        get aborted() {
          reads += 1;
          return false;
        },
      });
      let seen = 0;
      expectCancelledInside(
        () =>
          admitMaterializedMapping(input, T30, {
            get aborted() {
              seen += 1;
              return seen === reads;
            },
          }),
        "beforePublication",
      );
    }
    expect(admitMaterializedMapping(forged, T30).state).toBe(
      "REVISION_MISMATCH",
    );
  });
});

function versionTwoFixture() {
  const left = instrument({ name: "H03_LEFT" });
  const right = instrument({ name: "H03_RIGHT" });
  const assets = registry([left, right]);
  const input = mappingAdmission(
    left,
    right,
    assets,
    approvedMapping(left, right, "APPROVED", { version: 2, priorVersion: 1 }),
  );
  return { left, right, assets, input };
}

function evidenceRecord(index: number): EvidenceRecord {
  return {
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
    description: `reviewed evidence ${index} ${"e".repeat(400)}`,
  };
}

function validCommand() {
  return approveCommand({
    commandId: "h03-command-1",
    candidateId: "candidate-1",
    candidateDigest: "candidate-digest-1",
    expectedRevision: 0,
    proposedBy: "product-proposer",
    mappingId: "h03-mapping-1",
    leftInstrumentId: "left",
    rightInstrumentId: "right",
    exposureKey: "key",
    effectiveFrom: T0,
    effectiveTo: T30D,
    recordedKnowledgeAt: T0,
    registryRevision: "registry-v1",
    evidenceRevision: "evidence-v1",
    reasonText: "independently reviewed",
    approvals: [
      { actorId: "quant-reviewer", role: "QUANT_REVIEWER", recordedAt: T0 },
      {
        actorId: "market-data-reviewer",
        role: "MARKET_DATA_REVIEWER",
        recordedAt: T0,
      },
    ],
  });
}
