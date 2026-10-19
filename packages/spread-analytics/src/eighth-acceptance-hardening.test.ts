// Eighth-acceptance hardening regressions: L-07 (numeric-index prototype
// pollution), the final closure of L-05, the static numeric-index audit, and
// the public-output prototype contract. Every probe reproduces an
// ACCEPTANCE_8 counterexample against the public modules.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ExactDecimal, contractMultiplier } from "@arbitrage/market-data";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { admitMaterializedMapping } from "./admission.js";
import { generateCandidates } from "./candidates.js";
import {
  MappingLedger,
  admitMappingCommand,
  approveCommand,
  invalidateCommand,
  type ApproveCommandInput,
} from "./commands.js";
import { normalizeBaseExposure } from "./economics.js";
import { evaluateBatch, evaluateMatch } from "./evaluator.js";
import { validateEvidenceBundle } from "./evidence.js";
import { ownElement } from "./immutable.js";
import type {
  EvidenceRecord,
  MatchEvaluation,
  VenueInstrumentEvidence,
} from "./model.js";
import { admitRegistryRevision } from "./registry.js";
import { replayMapping } from "./replay.js";
import { WorkBudget } from "./bounds.js";
import { snapshotInput } from "./snapshot.js";
import { epoch } from "./time.js";
import {
  A,
  B,
  T0,
  T1D,
  T30,
  T30D,
  USDC,
  USDT,
  instrument,
  mappingAdmission,
  registry,
} from "./test-fixtures.js";

const code = (error: unknown) => (error as { code?: string } | undefined)?.code;
const capture = (operation: () => unknown) => {
  try {
    return { result: operation() as unknown, error: undefined as unknown };
  } catch (error) {
    return { result: undefined as unknown, error };
  }
};
function clone<T>(value: T): T {
  if (value instanceof ExactDecimal)
    return ExactDecimal.fromParts(value.coefficient, value.scale) as T;
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = clone(item);
    return out as T;
  }
  return value;
}
/** Own-property-only rendering; shared references are repeated, not cut. */
function render(value: unknown, ancestors: object[] = []): unknown {
  if (typeof value === "bigint") return `${value}n`;
  if (value === null || typeof value !== "object") return value;
  if (ancestors.includes(value)) return "[cycle]";
  const path = [...ancestors, value];
  if (Array.isArray(value)) {
    const items: unknown[] = [];
    for (let index = 0; index < value.length; index += 1)
      items.push(
        Object.hasOwn(value, index) ? render(value[index], path) : "[hole]",
      );
    return items;
  }
  const out: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value).sort((a, b) =>
    String(a).localeCompare(String(b)),
  ))
    if (typeof key === "string")
      out[key] = render((value as Record<string, unknown>)[key], path);
  return out;
}
/** Pollutes numeric (or other) names on a prototype; always restored. */
function polluted<T>(
  target: object,
  values: Record<string, unknown>,
  operation: () => T,
): T {
  const prototype = target as Record<string, unknown>;
  const previous = Object.keys(values).map(
    (key) => [key, Object.getOwnPropertyDescriptor(prototype, key)] as const,
  );
  try {
    for (const [key, value] of Object.entries(values))
      Object.defineProperty(prototype, key, {
        value,
        configurable: true,
        writable: true,
        enumerable: false,
      });
    return operation();
  } finally {
    for (const [key, descriptor] of previous)
      if (descriptor === undefined) delete prototype[key];
      else Object.defineProperty(prototype, key, descriptor);
  }
}

/** A leg whose base reference has no registry binding (ASSET_IDENTITY_UNKNOWN). */
function unbound(leg: VenueInstrumentEvidence): VenueInstrumentEvidence {
  return Object.freeze({
    ...leg,
    nativeBaseAssetReference: `${leg.metadata.venue}:UNBOUND`,
  });
}
function fixture() {
  const left = instrument({ name: "S8_LEFT" });
  const right = instrument({ name: "S8_RIGHT" });
  const other = instrument({ name: "S8_OTHER" });
  const usdc = instrument({ name: "S8_USDC", quote: USDC, settle: USDC });
  const baseB = instrument({ name: "S8_BASEB", base: B });
  const sameVenue = instrument({ name: "S8_SAME", venue: "S8_LEFT" });
  const assets = registry([left, right, other, usdc, baseB, sameVenue]);
  const input = mappingAdmission(left, right, assets);
  return {
    left,
    right,
    other,
    usdc,
    baseB,
    sameVenue,
    unboundRight: unbound(right),
    assets,
    input,
  };
}
type Fixture = ReturnType<typeof fixture>;
function evaluate(
  f: Fixture,
  overrides: Record<string, unknown> = {},
): MatchEvaluation {
  const input: Record<string, unknown> = {
    left: f.left,
    right: f.right,
    registry: f.assets,
    evaluationAt: T30,
    knowledgeCutoff: T30,
    mapping: f.input,
    ...overrides,
  };
  for (const [key, value] of Object.entries(overrides))
    if (value === undefined) delete input[key];
  return evaluateMatch(input as never);
}
function approveInput(
  overrides: Partial<ApproveCommandInput> = {},
): ApproveCommandInput {
  return {
    commandId: "s8-command-1",
    candidateId: "s8-candidate-1",
    candidateDigest: "s8-candidate-digest-1",
    expectedRevision: 0,
    proposedBy: "s8-product-proposer",
    mappingId: "s8-mapping-1",
    leftInstrumentId: "s8-left",
    rightInstrumentId: "s8-right",
    exposureKey: "s8-key",
    effectiveFrom: T0,
    effectiveTo: T30D,
    recordedKnowledgeAt: T0,
    registryRevision: "registry-v1",
    evidenceRevision: "s8-evidence-v1",
    reasonText: "independently reviewed",
    approvals: [
      { actorId: "s8-quant", role: "QUANT_REVIEWER", recordedAt: T0 },
      { actorId: "s8-market", role: "MARKET_DATA_REVIEWER", recordedAt: T0 },
    ],
    ...overrides,
  };
}
function invalidateInput(
  provenanceDigest: string,
  registryRevision = "registry-v1",
  evidenceRevision = "s8-evidence-v1",
) {
  return {
    commandId: "s8-invalidate-1",
    expectedRevision: 1,
    mappingId: "s8-mapping-1",
    affectedVersion: 1,
    effectiveAt: T1D,
    recordedKnowledgeAt: T1D,
    reasonText: "reviewed correction",
    invalidationReference: "s8-correction-1",
    proposedBy: "s8-transition-proposer",
    registryRevision,
    evidenceRevision,
    provenanceDigest,
    approvals: [
      { actorId: "s8-tq", role: "QUANT_REVIEWER" as const, recordedAt: T1D },
      {
        actorId: "s8-tm",
        role: "MARKET_DATA_REVIEWER" as const,
        recordedAt: T1D,
      },
    ],
  };
}
const evidence = {
  evidenceId: "s8-evidence-1",
  evidenceClass: "FROZEN_METADATA",
  sourceId: "SOURCE",
  sourceRevision: "source-v1",
  sourceDigest: "digest",
  productScope: "ORDINARY_LINEAR_PERPETUAL",
  retrievalDate: "2026-09-15",
  recordedAt: T0,
  validFrom: T0,
  validTo: T30D,
  quality: "VERIFIED",
  policyRevision: "instrument-matching-pilot/v1",
} as unknown as EvidenceRecord;

/** Every public operation and outcome class touched by indexed reads. */
function workflow(f: Fixture) {
  const run = (operation: () => unknown) => {
    const { result, error } = capture(operation);
    return error === undefined
      ? result
      : Object.freeze({ thrown: code(error) ?? "raw" });
  };
  const admission = admitMaterializedMapping(f.input, T30);
  const applied = admitMappingCommand(
    new MappingLedger(),
    approveCommand(approveInput()),
  );
  const ledger = (applied as { ledger: MappingLedger }).ledger;
  const approved = ledger.versions[0]!;
  const emptyApprovals = new MappingLedger([
    { ...clone(approved), approvals: [] } as never,
  ]);
  const replay = (mode: string) =>
    run(() =>
      replayMapping({
        mode,
        history: admission.history,
        mappingId: admission.history?.mappingId,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        replayRevision: "s8-replay",
      } as never),
    );
  return {
    matched: run(() => evaluate(f)),
    unmapped: run(() => evaluate(f, { mapping: undefined })),
    unboundMapped: run(() => evaluate(f, { right: f.unboundRight })),
    unboundUnmapped: run(() =>
      evaluate(f, { right: f.unboundRight, mapping: undefined }),
    ),
    usdc: run(() => evaluate(f, { right: f.usdc, mapping: undefined })),
    usdcMapped: run(() => evaluate(f, { right: f.usdc })),
    baseB: run(() => evaluate(f, { right: f.baseB, mapping: undefined })),
    sameVenue: run(() => evaluate(f, { right: f.sameVenue })),
    candidatesMismatched: run(() =>
      generateCandidates(
        [f.left, f.baseB, f.usdc, unbound(f.other)],
        f.assets,
        T30,
        T30,
      ),
    ),
    candidates: run(() =>
      generateCandidates([f.left, f.right, f.other], f.assets, T30, T30),
    ),
    batch: run(() =>
      evaluateBatch([
        {
          left: f.left,
          right: f.unboundRight,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          mapping: f.input,
        },
        {
          left: f.left,
          right: f.usdc,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
        },
      ] as never),
    ),
    admission,
    asKnown: replay("AS_KNOWN"),
    corrected: replay("CORRECTED"),
    applied,
    repeated: run(() =>
      admitMappingCommand(ledger, approveCommand(approveInput())),
    ),
    invalidated: run(() =>
      admitMappingCommand(
        ledger,
        invalidateCommand(
          invalidateInput(approved.approvals[0]!.approvedDigest),
        ),
      ),
    ),
    invalidateEmptyApprovals: run(() =>
      admitMappingCommand(
        emptyApprovals,
        invalidateCommand(invalidateInput("s8-forged-provenance")),
      ),
    ),
    registry: run(() => admitRegistryRevision(clone(f.assets.revision))),
    resolveUnbound: run(() =>
      f.assets.resolve(
        f.right.metadata.venue,
        f.right.metadata.productGroup,
        `${f.right.metadata.venue}:UNBOUND`,
        "BASE",
        T30,
        T30,
      ),
    ),
    evidence: run(() => validateEvidenceBundle([evidence], [])),
    timeMonth00: run(() => epoch("2026-00-15T00:00:00.000Z")),
    timeMonth13: run(() => epoch("2026-13-15T00:00:00.000Z")),
    decimal: run(() =>
      normalizeBaseExposure(
        contractMultiplier("3"),
        contractMultiplier("0.001"),
      ).toString(),
    ),
  };
}

describe("L-07 the exact ACCEPTANCE_8 exploits are closed", () => {
  it("polluted index 0 cannot turn AMBIGUOUS into MATCHED", () => {
    const f = fixture();
    const clean = evaluate(f, { right: f.unboundRight });
    expect(clean.outcome).toBe("AMBIGUOUS");
    expect(clean.reasons).toEqual(["ASSET_IDENTITY_UNKNOWN"]);
    expect(admitMaterializedMapping(f.input, T30).state).toBe("VALID");
    for (const target of [Object.prototype, Array.prototype])
      for (const value of [{ canonicalAssetId: A }, { targetAssetId: A }]) {
        const result = polluted(target, { "0": value }, () =>
          evaluate(f, { right: f.unboundRight }),
        );
        expect(result.outcome).toBe("AMBIGUOUS");
        expect(result.reasons).toEqual(["ASSET_IDENTITY_UNKNOWN"]);
        expect(result.resultId).toBe(clean.resultId);
      }
  });

  it("polluted aliases cannot collapse USDT and USDC or different bases", () => {
    const f = fixture();
    const cases = [
      [{ right: f.usdc, mapping: undefined }, "SETTLEMENT_ASSET_MISMATCH"],
      [{ right: f.usdc }, "SETTLEMENT_ASSET_MISMATCH"],
      [{ right: f.baseB, mapping: undefined }, "BASE_ASSET_MISMATCH"],
    ] as const;
    for (const [overrides, reason] of cases) {
      const clean = evaluate(f, overrides);
      expect(clean.outcome).toBe("NOT_MATCHED");
      expect(clean.reasons).toEqual([reason]);
      for (const target of [Object.prototype, Array.prototype])
        for (const key of ["0", "1"]) {
          const result = polluted(
            target,
            { [key]: { targetAssetId: A, canonicalAssetId: A } },
            () => evaluate(f, overrides),
          );
          expect(result.resultId).toBe(clean.resultId);
          expect(result.reasons).toEqual([reason]);
        }
    }
  });

  it("polluted index 0 cannot create candidates for mismatched pairs", () => {
    const f = fixture();
    const legs = [f.left, f.baseB, f.usdc, unbound(f.other)];
    expect(generateCandidates(legs, f.assets, T30, T30)).toHaveLength(0);
    for (const target of [Object.prototype, Array.prototype])
      for (const value of [{ canonicalAssetId: A }, { targetAssetId: A }])
        expect(
          polluted(target, { "0": value }, () =>
            generateCandidates(legs, f.assets, T30, T30),
          ),
        ).toHaveLength(0);
  });

  it("an empty approval list cannot inherit invalidation provenance", () => {
    const f = fixture();
    void f;
    const applied = admitMappingCommand(
      new MappingLedger(),
      approveCommand(approveInput()),
    );
    const approved = (applied as { ledger: MappingLedger }).ledger.versions[0]!;
    const ledger = new MappingLedger([
      { ...clone(approved), approvals: [] } as never,
    ]);
    const command = invalidateCommand(invalidateInput("s8-forged-provenance"));
    const clean = admitMappingCommand(ledger, command);
    expect(clean.status).toBe("REJECTED");
    for (const target of [Object.prototype, Array.prototype]) {
      const result = polluted(
        target,
        { "0": { approvedDigest: "s8-forged-provenance" } },
        () => admitMappingCommand(ledger, command),
      );
      expect(render(result)).toEqual(render(clean));
    }
  });

  it("an out-of-range month or index -1 cannot read an inherited value", () => {
    for (const month of ["00", "13", "99"])
      for (const target of [Object.prototype, Array.prototype])
        expect(() =>
          polluted(target, { "-1": 31, "12": 31, "98": 31 }, () =>
            epoch(`2026-${month}-15T00:00:00.000Z`),
          ),
        ).toThrowError(
          expect.objectContaining({ code: "EVIDENCE_TIME_INVALID" }),
        );
    // History continuity: index 0 has no predecessor, never index -1.
    const f = fixture();
    const clean = admitMaterializedMapping(f.input, T30);
    for (const target of [Object.prototype, Array.prototype]) {
      const result = polluted(
        target,
        { "-1": { mapping: { version: 0 } } },
        () => admitMaterializedMapping(f.input, T30),
      );
      expect(render(result)).toEqual(render(clean));
    }
  });
});

describe("L-05 / L-07 numeric prototype pollution sweep", () => {
  it("Object.prototype and Array.prototype indices 0 and 1 leave the full workflow byte-identical", () => {
    const f = fixture();
    const clean = JSON.stringify(render(workflow(f)));
    const admission = f.input;
    const values: [string, unknown][] = [
      ["canonical asset", { canonicalAssetId: A }],
      ["alias target", { targetAssetId: A, aliasAssetId: A }],
      ["mapping", admission.mapping],
      ["admission record", admission],
      ["candidate", admission.candidate],
      [
        "approval",
        {
          actorId: "x",
          role: "QUANT_REVIEWER",
          approvedDigest: "s8-forged-provenance",
          recordedAt: T0,
        },
      ],
      ["transition", admission.transitions[0] ?? { transitionType: "X" }],
      ["string", "POLLUTED"],
      ["number", 31],
    ];
    let runs = 0;
    for (const target of [Object.prototype, Array.prototype])
      for (const key of ["0", "1"])
        for (const [name, value] of values) {
          const run = JSON.stringify(
            render(polluted(target, { [key]: value }, () => workflow(f))),
          );
          expect(run, `${key} ${name}`).toBe(clean);
          runs += 1;
        }
    expect(runs).toBe(36);
    for (const target of [Object.prototype, Array.prototype])
      for (const key of ["0", "1", "-1", "12", "98"])
        expect(Object.hasOwn(target, key)).toBe(false);
  });
});

describe("L-07 array-shape semantics", () => {
  it("ownElement reads only own, in-range elements", () => {
    const sparse = [1, , 3] as number[];
    const withMissing = new Array<number>(3);
    withMissing[2] = 7;
    const cases = polluted(Array.prototype, { "0": 99, "1": 99 }, () =>
      polluted(Object.prototype, { "0": 99, "1": 99 }, () => ({
        empty: ownElement([], 0),
        dense: ownElement([5], 0),
        denseSecond: ownElement([5], 1),
        sparseHole: ownElement(sparse, 1),
        sparseOwn: ownElement(sparse, 2),
        missingInside: ownElement(withMissing, 0),
        localValid: ownElement([8, 9], 1),
        negative: ownElement([8], -1),
        fractional: ownElement([8], 0.5),
        // The engine-level hazard the helper prevents:
        nativeEmpty: ([] as number[])[0],
      })),
    );
    expect(cases).toEqual({
      empty: undefined,
      dense: 5,
      denseSecond: undefined,
      sparseHole: undefined,
      sparseOwn: 3,
      missingInside: undefined,
      localValid: 9,
      negative: undefined,
      fractional: undefined,
      nativeEmpty: 99,
    });
  });

  it("the snapshot boundary admits only dense arrays, polluted or not", () => {
    const sparse = [1, , 3] as unknown[];
    const missing = new Array<unknown>(2);
    missing[1] = "x";
    for (const target of [Object.prototype, Array.prototype])
      polluted(target, { "0": "inherited", "1": "inherited" }, () => {
        for (const value of [sparse, missing])
          expect(() => snapshotInput(value, new WorkBudget())).toThrowError(
            expect.objectContaining({ code: "INPUT_INVALID" }),
          );
        expect(snapshotInput([], new WorkBudget())).toEqual([]);
        expect(snapshotInput(["a"], new WorkBudget())).toEqual(["a"]);
        const dense = snapshotInput(["a", "b"], new WorkBudget());
        expect(Object.hasOwn(dense, 0) && Object.hasOwn(dense, 1)).toBe(true);
      });
  });
});

// ---------------------------------------------------------------------------
// Static numeric-index audit.
type IndexClass =
  | "SAFE_BY_LENGTH"
  | "SAFE_BY_OWN_PROPERTY"
  | "SAFE_BY_DENSE_INTERNAL_INVARIANT"
  | "NON_AUTHORITATIVE_CONSTANT"
  | "FIXED";
/**
 * Every element access, `.at()` call and own-index helper call in the runtime
 * modules, keyed by file and normalized expression text, with its count and
 * the reason the read cannot observe an inherited numeric property.
 */
const INDEX_INVENTORY: Record<string, [number, IndexClass, string]> = {
  "admission.ts|a[index]": [
    1,
    "SAFE_BY_LENGTH",
    "equal lengths checked; index < length",
  ],
  "admission.ts|b[index]": [
    1,
    "SAFE_BY_LENGTH",
    "equal lengths checked; index < length",
  ],
  "admission.ts|quant[0]": [
    1,
    "SAFE_BY_LENGTH",
    "short-circuit after quant.length === 1",
  ],
  "admission.ts|marketData[0]": [
    1,
    "SAFE_BY_LENGTH",
    "short-circuit after length === 1",
  ],
  "admission.ts|records[index]": [
    1,
    "SAFE_BY_LENGTH",
    "loop index < records.length",
  ],
  "admission.ts|AT versions.at(-1)": [
    1,
    "SAFE_BY_LENGTH",
    "native at() is length-bounded; history non-empty",
  ],
  "admission.ts|ownElement(records, 0)": [1, "FIXED", "was records[0]"],
  "admission.ts|ownElement(records, index - 1)": [
    1,
    "FIXED",
    "was records[index - 1] (index -1 at 0)",
  ],
  "admission.ts|ownElement(versions, 0)": [1, "FIXED", "was versions[0]"],
  "bounds.ts|(value as Record<string, unknown>)[key]": [
    1,
    "SAFE_BY_OWN_PROPERTY",
    "key from Object.keys",
  ],
  "candidates.ts|ids[0]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "map of the 2-element legs array",
  ],
  "candidates.ts|ids[1]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "map of the 2-element legs array",
  ],
  "candidates.ts|revisions[0]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "map of the 2-element legs array",
  ],
  "candidates.ts|revisions[1]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "map of the 2-element legs array",
  ],
  "candidates.ts|metadataDigests[0]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "map of the 2-element legs array",
  ],
  "candidates.ts|metadataDigests[1]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "map of the 2-element legs array",
  ],
  "candidates.ts|economicsRevisions[0]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "map of the 2-element legs array",
  ],
  "candidates.ts|economicsRevisions[1]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "map of the 2-element legs array",
  ],
  "candidates.ts|ordered[index - 1]": [
    1,
    "SAFE_BY_LENGTH",
    "1 <= index < length",
  ],
  "candidates.ts|ordered[index]": [1, "SAFE_BY_LENGTH", "1 <= index < length"],
  "candidates.ts|group[i]": [1, "SAFE_BY_LENGTH", "i < j < group.length"],
  "candidates.ts|group[j]": [1, "SAFE_BY_LENGTH", "i < j < group.length"],
  "commands.ts|AT ledger.#versions.at(-1)": [
    1,
    "SAFE_BY_LENGTH",
    "native at(); an approval was just appended",
  ],
  "commands.ts|quant[0]": [
    2,
    "SAFE_BY_LENGTH",
    "short-circuit / after the length === 1 throw",
  ],
  "commands.ts|md[0]": [
    2,
    "SAFE_BY_LENGTH",
    "short-circuit / after the length === 1 throw",
  ],
  "commands.ts|transition.approvals[index]": [
    3,
    "SAFE_BY_LENGTH",
    "equal lengths checked first; index < length",
  ],
  "commands.ts|ownElement(target.approvals, 0)": [
    1,
    "FIXED",
    "was target.approvals[0]",
  ],
  "evaluator.ts|legs[0]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "local 2-element sorted array",
  ],
  "evaluator.ts|legs[1]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "local 2-element sorted array",
  ],
  "evaluator.ts|expectedPair[0]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "local 2-element array",
  ],
  "evaluator.ts|expectedPair[1]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "local 2-element array",
  ],
  "evaluator.ts|mappingPair[0]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "local 2-element array",
  ],
  "evaluator.ts|mappingPair[1]": [
    1,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "local 2-element array",
  ],
  "evaluator.ts|expectedLegs[0]": [
    3,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "local 2-element sorted array",
  ],
  "evaluator.ts|expectedLegs[1]": [
    3,
    "SAFE_BY_DENSE_INTERNAL_INVARIANT",
    "local 2-element sorted array",
  ],
  "immutable.ts|list[index]": [
    1,
    "SAFE_BY_OWN_PROPERTY",
    "the ownElement implementation (Object.hasOwn)",
  ],
  "publication.ts|(source as Record<string, unknown>)[key]": [
    1,
    "SAFE_BY_OWN_PROPERTY",
    "key from Object.keys of a frozen data record",
  ],
  "publication.ts|ownElement(list, index)": [
    1,
    "SAFE_BY_OWN_PROPERTY",
    "public copy of an array",
  ],
  "registry.ts|records[0]": [
    1,
    "SAFE_BY_LENGTH",
    "records.length === 1 ? records[0]",
  ],
  "registry.ts|ownElement(found, 0)": [
    1,
    "FIXED",
    "was found[0] (ACCEPTANCE_8 L-07)",
  ],
  "registry.ts|ownElement(aliases, 0)": [
    1,
    "FIXED",
    "was aliases[0] (ACCEPTANCE_8 L-07)",
  ],
  "replay.ts|AT known.filter(…).at(-1)": [
    1,
    "SAFE_BY_LENGTH",
    "native at() is length-bounded",
  ],
  "serialization.ts|record[key]": [
    1,
    "SAFE_BY_OWN_PROPERTY",
    "key from Object.keys",
  ],
  "time.ts|[31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]":
    [1, "FIXED", "month range-checked 1..12 before indexing"],
  "transitions.ts|quant[0]": [
    1,
    "SAFE_BY_LENGTH",
    "short-circuit after length === 1",
  ],
  "transitions.ts|marketData[0]": [
    1,
    "SAFE_BY_LENGTH",
    "short-circuit after length === 1",
  ],
  "validation.ts|keys[index]": [
    1,
    "SAFE_BY_LENGTH",
    "loop index < keys.length",
  ],
  "validation.ts|allowed[index]": [
    1,
    "SAFE_BY_LENGTH",
    "loop index < allowed.length",
  ],
};

function indexSites(directory: string, files: readonly string[]) {
  const sites = new Map<string, number>();
  for (const name of files) {
    const source = ts.createSourceFile(
      name,
      readFileSync(`${directory}${name}`, "utf8"),
      ts.ScriptTarget.ES2022,
      true,
    );
    const add = (text: string) =>
      sites.set(`${name}|${text}`, (sites.get(`${name}|${text}`) ?? 0) + 1);
    const visit = (node: ts.Node): void => {
      if (ts.isElementAccessExpression(node))
        add(
          node
            .getText()
            .replace(/\s+/g, " ")
            .replace(/\[ /g, "[")
            .replace(/ \]/g, "]"),
        );
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "at"
      ) {
        const receiver = node.expression.expression.getText();
        add(
          `AT ${receiver.includes("\n") ? `${receiver.split(/\s/)[0]}.filter(…)` : receiver}.at(${node.arguments.map((a) => a.getText()).join(", ")})`,
        );
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText() === "ownElement"
      )
        add(node.getText().replace(/\s+/g, " "));
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return sites;
}

describe("L-07 static numeric-index audit", () => {
  const directory = fileURLToPath(new URL(".", import.meta.url));
  const runtime = readdirSync(directory)
    .filter(
      (name) =>
        name.endsWith(".ts") &&
        !name.endsWith(".test.ts") &&
        name !== "test-fixtures.ts" &&
        name !== "work-oracle.ts",
    )
    .sort();

  it("classifies every numeric-index read site; none is uncovered", () => {
    const sites = indexSites(directory, runtime);
    const found = Object.fromEntries([...sites].sort());
    const expected = Object.fromEntries(
      Object.entries(INDEX_INVENTORY)
        .map(([key, [count]]) => [key, count] as const)
        .sort(),
    );
    expect(found).toEqual(expected);
    const totals: Record<string, number> = {};
    for (const [count, kind] of Object.values(INDEX_INVENTORY))
      totals[kind] = (totals[kind] ?? 0) + count;
    expect(totals).toEqual({
      SAFE_BY_LENGTH: 24,
      SAFE_BY_DENSE_INTERNAL_INVARIANT: 20,
      SAFE_BY_OWN_PROPERTY: 5,
      FIXED: 7,
    });
    expect(Object.values(totals).reduce((a, b) => a + b, 0)).toBe(56);
  });

  it("detects a new unclassified index read (non-vacuous)", () => {
    const sites = indexSites(directory, runtime);
    sites.set("control.ts|found[0]", 1);
    expect(Object.fromEntries(sites)).not.toEqual(
      Object.fromEntries(
        Object.entries(INDEX_INVENTORY).map(([key, [count]]) => [key, count]),
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Public-output prototype contract.
describe("public outputs are ordinary frozen plain objects", () => {
  const plain = (value: unknown, label: string, seen = new Set<object>()) => {
    if (value === null || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    if (value instanceof ExactDecimal || value instanceof MappingLedger) return;
    const prototype = Object.getPrototypeOf(value) as unknown;
    // Trusted class instances (registry, ledger) keep their class; a
    // null-prototype record is a contract violation and is not skipped.
    if (
      prototype !== null &&
      prototype !== Object.prototype &&
      !Array.isArray(value)
    )
      return;
    expect(Object.isFrozen(value), label).toBe(true);
    if (Array.isArray(value)) {
      expect(Object.getPrototypeOf(value), label).toBe(Array.prototype);
      value.forEach((item, index) => plain(item, `${label}[${index}]`, seen));
      return;
    }
    expect(Object.getPrototypeOf(value), label).toBe(Object.prototype);
    expect(String(value), label).toBe("[object Object]");
    for (const key of Object.keys(value)) {
      expect(Object.hasOwn(value, key), label).toBe(true);
      expect(
        (value as { hasOwnProperty(key: string): boolean }).hasOwnProperty(key),
        label,
      ).toBe(true);
      plain((value as Record<string, unknown>)[key], `${label}.${key}`, seen);
    }
    expect(() => JSON.stringify(value), label).not.toThrow();
  };

  it("every public operation publishes ordinary objects with own data", () => {
    const f = fixture();
    const outputs = workflow(f) as Record<string, unknown>;
    const ledger = new MappingLedger();
    const command = approveCommand(approveInput());
    const applied = admitMappingCommand(ledger, command);
    const appliedLedger = (applied as { ledger: MappingLedger }).ledger;
    Object.assign(outputs, {
      command,
      invalidation: invalidateCommand(
        invalidateInput(
          appliedLedger.versions[0]!.approvals[0]!.approvedDigest,
        ),
      ),
      apply: new MappingLedger().apply(command),
      ledgerVersions: appliedLedger.versions,
      ledgerTransitions: appliedLedger.transitions,
      digests: appliedLedger.commandDigestSnapshot(),
      registryRevision: f.assets.revision,
      describe: f.assets.describe(A, T30, T30),
      resolve: f.assets.resolve(
        f.left.metadata.venue,
        f.left.metadata.productGroup,
        f.left.nativeBaseAssetReference,
        "BASE",
        T30,
        T30,
      ),
    });
    for (const [label, value] of Object.entries(outputs)) plain(value, label);
    const matched = outputs.matched as MatchEvaluation;
    expect(Object.keys(matched)).toContain("registryRevision");
    expect(JSON.parse(JSON.stringify(matched)).outcome).toBe("MATCHED");
    // Shared records stay shared: the returned mapping is the listed version.
    expect((applied as { mapping: unknown }).mapping).toBe(
      appliedLedger.versions.at(-1),
    );
  });

  it("published handles still authenticate, copies of them do not", () => {
    const f = fixture();
    const admission = admitMaterializedMapping(f.input, T30);
    const history = admission.history!;
    expect(Object.getPrototypeOf(history)).toBe(Object.prototype);
    const replay = (handle: unknown) =>
      replayMapping({
        mode: "AS_KNOWN",
        history: handle,
        mappingId: history.mappingId,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        replayRevision: "s8-replay",
      } as never);
    const result = replay(history);
    expect(result.outcome).toBe("MATCHED");
    expect(result.mapping).toBe(history.versions.at(-1));
    for (const forged of [{ ...history }, clone(history)])
      expect(code(capture(() => replay(forged)).error)).toBe("INPUT_INVALID");
    // The published copy is frozen and never read by an operation.
    expect(Object.isFrozen(history)).toBe(true);
    expect(() => {
      (history as { digest: string }).digest = "forged";
    }).toThrow(TypeError);
    expect(replay(history).replayRevision).toBe(result.replayRevision);
  });
});
