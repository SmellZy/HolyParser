// Seventh-acceptance hardening regressions: N-02 (authority-object
// immutability), N-03 (decimal pre-validation before reconstruction), L-05
// (prototype pollution) and L-06 (frozen reason catalogue), plus the closing
// class sweep for N-01 and L-03. Every probe below reproduces an ACCEPTANCE_7
// counterexample against the public modules.
import { ExactDecimal, contractMultiplier } from "@arbitrage/market-data";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  admitMaterializedMapping,
  candidateProvenanceDigest,
} from "./admission.js";
import { WorkBudget } from "./bounds.js";
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
import * as api from "./index.js";
import type {
  EvidenceRecord,
  InstrumentMatchCandidate,
  MatchEvaluation,
  VenueInstrumentEvidence,
} from "./model.js";
import { MATCH_REASON_CODES } from "./reasons.js";
import { CuratedAssetRegistry, admitRegistryRevision } from "./registry.js";
import { replayMapping } from "./replay.js";
import { canonicalExposureKey } from "./serialization.js";
import { DECIMAL_REBUILD_UNITS, snapshotInput } from "./snapshot.js";
import {
  A,
  T0,
  T1D,
  T30,
  T30D,
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
/** Deep, mutable, plain clone (decimals are re-created genuinely). */
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
/** Own-property-only canonical rendering (independent of any prototype). */
function render(value: unknown, ancestors: object[] = []): unknown {
  if (typeof value === "bigint") return `${value}n`;
  if (value === null || typeof value !== "object") return value;
  if (ancestors.includes(value)) return "[cycle]";
  const path = [...ancestors, value];
  if (Array.isArray(value)) return value.map((item) => render(item, path));
  const out: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value).sort((a, b) =>
    String(a).localeCompare(String(b)),
  ))
    if (typeof key === "string")
      out[key] = render((value as Record<string, unknown>)[key], path);
  return out;
}

function pairFixture() {
  const left = instrument({ name: "S7_LEFT" });
  const right = instrument({ name: "S7_RIGHT" });
  const other = instrument({ name: "S7_OTHER" });
  const sameVenue = instrument({ name: "S7_SAME", venue: "S7_LEFT" });
  const assets = registry([left, right, other, sameVenue]);
  const input = mappingAdmission(left, right, assets);
  return { left, right, other, sameVenue, assets, input };
}
type Fixture = ReturnType<typeof pairFixture>;
/** An `undefined` override removes the key (it is absent, not own-undefined). */
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
    commandId: "s7-command-1",
    candidateId: "s7-candidate-1",
    candidateDigest: "s7-candidate-digest-1",
    expectedRevision: 0,
    proposedBy: "s7-product-proposer",
    mappingId: "s7-mapping-1",
    leftInstrumentId: "s7-left",
    rightInstrumentId: "s7-right",
    exposureKey: "s7-key",
    effectiveFrom: T0,
    effectiveTo: T30D,
    recordedKnowledgeAt: T0,
    registryRevision: "registry-v1",
    evidenceRevision: "s7-evidence-v1",
    reasonText: "independently reviewed",
    approvals: [
      { actorId: "s7-quant", role: "QUANT_REVIEWER", recordedAt: T0 },
      { actorId: "s7-market", role: "MARKET_DATA_REVIEWER", recordedAt: T0 },
    ],
    ...overrides,
  };
}

const FORGED = "registry-FORGED";
const OVERSIZED = "X".repeat(100_000);

describe("N-02 registry authority is immutable after construction", () => {
  it("1/2. a getter cannot be installed on a genuine registry revision", () => {
    const f = pairFixture();
    const honest = evaluate(f);
    let reads = 0;
    const getter = {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return reads === 1 ? f.assets.revision : { revision: FORGED };
      },
    };
    expect(Object.isFrozen(f.assets)).toBe(true);
    expect(Object.getOwnPropertyDescriptor(f.assets, "revision")).toMatchObject(
      { writable: false, configurable: false, enumerable: true },
    );
    expect(() => Object.defineProperty(f.assets, "revision", getter)).toThrow(
      TypeError,
    );
    // The prototype is frozen too, so no shadowing getter can be added there.
    expect(() =>
      Object.defineProperty(CuratedAssetRegistry.prototype, "revision", getter),
    ).toThrow(TypeError);
    const after = evaluate(f);
    expect(reads).toBe(0);
    expect(after.outcome).toBe("MATCHED");
    expect(after.registryRevision).toBe("registry-v1");
    expect(after.mappingVersion?.registryRevision).toBe("registry-v1");
    expect(after.resultId).toBe(honest.resultId);
  });

  it("2. a subclass getter that returns different revisions is never read", () => {
    const f = pairFixture();
    const honest = evaluate(f);
    let reads = 0;
    class Shadow extends CuratedAssetRegistry {
      // A prototype getter is shadowed by the own non-configurable field.
      get revisionView() {
        reads += 1;
        return FORGED;
      }
    }
    Object.defineProperty(Shadow.prototype, "revision", {
      configurable: true,
      get() {
        reads += 1;
        return reads === 1 ? f.assets.revision : { revision: FORGED };
      },
    });
    const sub = new Shadow(clone(f.assets.revision));
    expect(() =>
      Object.defineProperty(sub, "revision", {
        get: () => ({ revision: FORGED }),
      }),
    ).toThrow(TypeError);
    for (const result of [
      evaluate(f, { registry: sub }),
      evaluate(f, { registry: sub, right: f.sameVenue }),
    ]) {
      expect(result.registryRevision).toBe("registry-v1");
      expect(result.registryRevision).not.toBe(FORGED);
    }
    expect(evaluate(f, { registry: sub }).resultId).toBe(honest.resultId);
    expect(
      generateCandidates([f.left, f.right], sub, T30, T30).map(
        (candidate) => candidate.registryRevision,
      ),
    ).toEqual(["registry-v1"]);
    expect(reads).toBe(0);
  });

  it("3. a 100,000-character revision cannot be assigned or published", () => {
    const f = pairFixture();
    expect(() => {
      (f.assets as { revision: unknown }).revision = { revision: OVERSIZED };
    }).toThrow(TypeError);
    expect(() => {
      (f.assets.revision as { revision: string }).revision = OVERSIZED;
    }).toThrow(TypeError);
    expect(() => {
      (f.assets.revision.bindings as unknown[]).length = 0;
    }).toThrow(TypeError);
    // A subclass instance is not frozen as a whole, but its revision is.
    class Open extends CuratedAssetRegistry {
      note = "mutable subclass field";
    }
    const sub = new Open(clone(f.assets.revision));
    sub.note = OVERSIZED;
    expect(() => {
      (sub as { revision: unknown }).revision = { revision: OVERSIZED };
    }).toThrow(TypeError);
    for (const registryHandle of [f.assets, sub]) {
      const published = [
        evaluate(f, { registry: registryHandle }),
        evaluate(f, { registry: registryHandle, right: f.sameVenue }),
        evaluate(f, { registry: registryHandle, mapping: undefined }),
        ...generateCandidates(
          [f.left, f.right, f.other],
          registryHandle,
          T30,
          T30,
        ),
      ].map((value) => value.registryRevision);
      for (const revision of published) {
        expect(revision).toBe("registry-v1");
        expect(revision.length).toBeLessThanOrEqual(160);
      }
    }
  });

  it("4. the earliest NOT_MATCHED exit publishes only the trusted revision", () => {
    const f = pairFixture();
    const early = evaluate(f, { right: f.sameVenue });
    expect(early.outcome).toBe("NOT_MATCHED");
    expect(early.reasons).toEqual(["SAME_VENUE_EXCLUDED"]);
    expect(early.registryRevision).toBe("registry-v1");
    // A fake registry carrying the oversized revision never reaches an exit.
    for (const fake of [
      { revision: { revision: OVERSIZED } },
      Object.create(CuratedAssetRegistry.prototype, {
        revision: { value: { revision: OVERSIZED }, enumerable: true },
      }) as unknown,
      new Proxy(f.assets, {}),
    ]) {
      const { result, error } = capture(() =>
        evaluate(f, { registry: fake, right: f.sameVenue }),
      );
      expect(result).toBeUndefined();
      expect(code(error)).toBe("INPUT_INVALID");
    }
  });

  it("5. MATCHED publishes the revision validated against the mapping", () => {
    const f = pairFixture();
    // Mutation from inside the cancellation poll (the ACCEPTANCE_7 mid-op
    // vector) is refused and cannot change the published revision.
    let polls = 0;
    let refused = 0;
    const signal = {
      get aborted() {
        polls += 1;
        try {
          (f.assets as { revision: unknown }).revision = {
            revision: "registry-MIDOP",
          };
        } catch {
          refused += 1;
        }
        return false;
      },
    };
    const result = evaluate(f, { signal });
    expect(result.outcome).toBe("MATCHED");
    expect(result.registryRevision).toBe("registry-v1");
    expect(result.registryRevision).toBe(
      result.mappingVersion?.registryRevision,
    );
    expect(polls).toBeGreaterThan(0);
    expect(refused).toBe(polls);
    expect(result.resultId).toBe(evaluate(f).resultId);
  });

  it("9. the registry cannot be redefined after construction", () => {
    const f = pairFixture();
    const assets = f.assets as unknown as Record<string, unknown>;
    expect(() => Object.setPrototypeOf(f.assets, {})).toThrow(TypeError);
    expect(() => {
      assets.extra = 1;
    }).toThrow(TypeError);
    expect(() => {
      assets.resolve = () => ({ state: "KNOWN" });
    }).toThrow(TypeError);
    expect(() => {
      (CuratedAssetRegistry.prototype as unknown as Record<string, unknown>)[
        "describe"
      ] = () => undefined;
    }).toThrow(TypeError);
    expect(() => {
      (CuratedAssetRegistry as unknown as Record<string, unknown>).forged = 1;
    }).toThrow(TypeError);
    expect(Object.isFrozen(CuratedAssetRegistry.prototype)).toBe(true);
    expect(evaluate(f).outcome).toBe("MATCHED");
  });
});

describe("N-02 ledger authority is immutable after construction", () => {
  it("6/10. genuine ledger fields cannot be mutated or redefined", () => {
    const applied = admitMappingCommand(
      new MappingLedger(),
      approveCommand(approveInput()),
    );
    if (applied.status !== "APPLIED") throw new Error("fixture");
    const ledger = applied.ledger;
    const fake = { ...applied.mapping, mappingId: "s7-mapping-1" };
    let getterReads = 0;
    expect(Object.isFrozen(ledger)).toBe(true);
    expect(Object.isFrozen(MappingLedger.prototype)).toBe(true);
    for (const key of ["versions", "transitions"])
      expect(Object.getOwnPropertyDescriptor(ledger, key)).toMatchObject({
        writable: false,
        configurable: false,
        enumerable: true,
      });
    const attempts: (() => void)[] = [
      () => {
        (ledger as { versions: unknown }).versions = [fake];
      },
      () => {
        (ledger as { transitions: unknown }).transitions = [];
      },
      () =>
        Object.defineProperty(ledger, "versions", {
          get: () => ((getterReads += 1), [fake]),
        }),
      () => {
        (ledger.versions as unknown[]).push(fake);
      },
      () => {
        (ledger.versions as unknown[])[0] = fake;
      },
      () => {
        (ledger.versions[0] as { mappingId: string }).mappingId = "forged";
      },
      () => {
        (ledger.versions[0]!.approvals as unknown[]).length = 0;
      },
      () => Object.setPrototypeOf(ledger, null),
      () => {
        (ledger as unknown as Record<string, unknown>).apply = () => fake;
      },
      () => {
        (MappingLedger.prototype as unknown as Record<string, unknown>)[
          "commandDigest"
        ] = () => "forged";
      },
    ];
    for (const attempt of attempts) expect(attempt).toThrow(TypeError);
    const again = admitMappingCommand(ledger, approveCommand(approveInput()));
    expect(again.status).toBe("APPLIED");
    if (again.status !== "APPLIED") return;
    expect(again.idempotent).toBe(true);
    expect(again.mapping).toBe(ledger.versions[0]);
    expect(again.mapping).not.toBe(fake);
    expect(again.mapping.mappingId).toBe("s7-mapping-1");
    expect(getterReads).toBe(0);
  });

  it("7/8. repeated commands return internal state, never a caller object", () => {
    const callerInput = clone(approveInput());
    const command = approveCommand(callerInput);
    const callerCommand = clone(command) as unknown as Record<string, unknown>;
    const first = admitMappingCommand(
      new MappingLedger(),
      callerCommand as never,
    );
    if (first.status !== "APPLIED") throw new Error("fixture");
    expect(first.mapping).toBe(first.ledger.versions.at(-1));
    const repeated = [
      admitMappingCommand(first.ledger, callerCommand as never),
      admitMappingCommand(first.ledger, command),
      first.ledger.apply(callerCommand as never),
    ];
    for (const result of repeated) {
      const mapping = (result as { mapping: unknown }).mapping;
      expect(mapping).toBe(first.ledger.versions[0]);
      expect(mapping).not.toBe(callerCommand);
      expect(mapping).not.toBe(command);
      expect(Object.isFrozen(mapping)).toBe(true);
      expect(Object.getPrototypeOf(mapping)).toBeNull();
      expect(Object.isFrozen(result)).toBe(true);
    }
    const before = JSON.stringify(render(first.ledger.versions));
    // Post-return caller mutation of everything the caller still owns.
    callerCommand.mappingId = "forged";
    callerCommand.exposureKey = "forged-key";
    (callerCommand.approvals as Record<string, unknown>[])[0]!.actorId = "x";
    callerInput.approvals.length = 0;
    expect(JSON.stringify(render(first.ledger.versions))).toBe(before);
    expect(
      (repeated[0] as { mapping: { mappingId: string } }).mapping.mappingId,
    ).toBe("s7-mapping-1");
    // Ledger construction input mutated after construction has no effect.
    const versions = clone(first.ledger.versions) as unknown as Record<
      string,
      unknown
    >[];
    const built = new MappingLedger(versions as never);
    versions[0]!.mappingId = "forged";
    versions.length = 0;
    expect(built.versions).toHaveLength(1);
    expect(built.versions[0]!.mappingId).toBe("s7-mapping-1");
    // An invalidation returns the ledger's internal approved record.
    const approved = first.ledger.versions[0]!;
    const invalidated = admitMappingCommand(
      first.ledger,
      invalidateCommand({
        commandId: "s7-invalidate-1",
        expectedRevision: 1,
        mappingId: "s7-mapping-1",
        affectedVersion: 1,
        effectiveAt: T1D,
        recordedKnowledgeAt: T1D,
        reasonText: "reviewed correction",
        invalidationReference: "s7-correction-1",
        proposedBy: "s7-transition-proposer",
        registryRevision: approved.registryRevision,
        evidenceRevision: approved.evidenceRevision,
        provenanceDigest: approved.approvals[0]!.approvedDigest,
        approvals: [
          { actorId: "s7-tq", role: "QUANT_REVIEWER", recordedAt: T1D },
          { actorId: "s7-tm", role: "MARKET_DATA_REVIEWER", recordedAt: T1D },
        ],
      }),
    );
    expect(invalidated.status).toBe("APPLIED");
    expect((invalidated as { mapping: unknown }).mapping).toBe(approved);
  });
});

describe("N-03 decimals are pre-validated before reconstruction", () => {
  afterEach(() => vi.restoreAllMocks());
  const spoof = (coefficient: unknown, scale: unknown, extra = {}) =>
    Object.assign(Object.create(ExactDecimal.prototype) as object, {
      coefficient,
      scale,
      ...extra,
    });
  const mutatedGenuine = (coefficient: bigint, scale: number) => {
    const value = ExactDecimal.fromParts(1n, 0) as unknown as Record<
      string,
      unknown
    >;
    value.coefficient = coefficient;
    value.scale = scale;
    return value;
  };
  const withMultiplier = (f: Fixture, value: unknown) => {
    const leg = clone(f.left) as unknown as {
      economics: { baseUnitsPerNativeQuantity: { value: unknown } };
    };
    leg.economics.baseUnitsPerNativeQuantity.value = value;
    return leg;
  };

  it("rejects oversized, invalid, malformed and forged decimals without fromParts", () => {
    const f = pairFixture();
    const big = 10n ** 100_000n;
    const rejected: [string, unknown][] = [
      ["100,000-digit coefficient / scale", spoof(big, 100_000)],
      ["100,000-digit coefficient, scale 0", spoof(big + 1n, 0)],
      ["mutated genuine 100,000 digits", mutatedGenuine(big, 100_000)],
      ["one over the 78-digit bound", spoof(10n ** 78n, 0)],
      ["negative one over the bound", spoof(-(10n ** 78n), 0)],
      ["huge scale", spoof(1n, 1_000_000_000)],
      ["maximum safe scale", spoof(1n, Number.MAX_SAFE_INTEGER)],
      ["scale one over 78", spoof(1n, 79)],
      ["negative scale", spoof(1n, -1)],
      ["fractional scale", spoof(1n, 1.5)],
      ["NaN scale", spoof(1n, Number.NaN)],
      ["string scale", spoof(1n, "0")],
      ["number coefficient", spoof(1, 0)],
      ["extra key", spoof(1n, 0, { equals: () => true })],
      ["non-normalized trailing zero", spoof(10n, 1)],
      ["non-normalized large", spoof(10n ** 77n, 77)],
      ["non-normalized zero", spoof(0n, 3)],
      [
        "fake decimal object",
        { coefficient: 1n, scale: 0, isZero: () => false },
      ],
    ];
    const legs = rejected.map(([, value]) => withMultiplier(f, value));
    const genuine = contractMultiplier("1");
    const fromParts = vi.spyOn(ExactDecimal, "fromParts");
    // Only in-domain, normalized parts ever reach a rebuild.
    const inDomain = ([c, s]: [bigint, number]) =>
      c < 10n ** 78n &&
      c > -(10n ** 78n) &&
      Number.isSafeInteger(s) &&
      s >= 0 &&
      s <= 78 &&
      (c === 0n ? s === 0 : s === 0 || c % 10n !== 0n);
    for (const [index, [name, value]] of rejected.entries()) {
      // Isolated snapshot: the rejected decimal is never rebuilt at all.
      fromParts.mockClear();
      expect(() => snapshotInput(value, new WorkBudget()), name).toThrowError(
        expect.objectContaining({ code: "INPUT_INVALID" }),
      );
      expect(fromParts, name).not.toHaveBeenCalled();
      // Public path: typed refusal, fast, and no out-of-domain rebuild (the
      // other, genuine decimals of the input are rebuilt as usual).
      fromParts.mockClear();
      const started = performance.now();
      const { result, error } = capture(() =>
        evaluate(f, { left: legs[index] }),
      );
      expect(performance.now() - started, name).toBeLessThan(250);
      expect(result, name).toBeUndefined();
      expect(code(error), name).toBe("INPUT_INVALID");
      expect(fromParts.mock.calls.every(inDomain), name).toBe(true);
      fromParts.mockClear();
      // The budget-free helper uses the same gates.
      expect(
        () => normalizeBaseExposure(genuine, value as never),
        name,
      ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
      expect(fromParts.mock.calls.every(inDomain), name).toBe(true);
    }
  });

  it("accepts the largest in-domain decimals and charges the rebuild first", () => {
    const largest = 10n ** 78n - 1n;
    for (const [coefficient, scale] of [
      [largest, 78],
      [-largest, 0],
      [1n, 78],
      [0n, 0],
    ] as const) {
      const work = new WorkBudget();
      const steps: number[] = [];
      const original = ExactDecimal.fromParts.bind(ExactDecimal);
      const fromParts = vi
        .spyOn(ExactDecimal, "fromParts")
        .mockImplementation((c, s) => (steps.push(work.steps), original(c, s)));
      const snapshot = snapshotInput(
        spoof(coefficient, scale),
        work,
      ) as unknown as ExactDecimal;
      expect(fromParts).toHaveBeenCalledTimes(1);
      expect(snapshot).toBeInstanceOf(ExactDecimal);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(snapshot.coefficient).toBe(coefficient);
      expect(snapshot.scale).toBe(scale);
      // 4 (node) + 8 (authenticity) + rebuild units, all charged before the
      // rebuild runs.
      expect(steps[0]).toBe(Math.floor((12 + DECIMAL_REBUILD_UNITS) / 128));
      vi.restoreAllMocks();
    }
    expect(DECIMAL_REBUILD_UNITS).toBe(4 * (78 + 78));
  });

  it("cancellation and budget exhaustion fire before any reconstruction", () => {
    const f = pairFixture();
    const oversized = withMultiplier(f, spoof(10n ** 100_000n, 100_000));
    const fromParts = vi.spyOn(ExactDecimal, "fromParts");
    const signal = { aborted: false };
    const cancelled = new WorkBudget(signal);
    cancelled.step(127);
    signal.aborted = true;
    expect(() => snapshotInput(spoof(1n, 0), cancelled)).toThrowError(
      expect.objectContaining({ code: "EVALUATION_CANCELLED" }),
    );
    const exhausted = new WorkBudget();
    exhausted.step(99_998);
    expect(() => snapshotInput(spoof(1n, 0), exhausted)).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    expect(fromParts).not.toHaveBeenCalled();
    // A cancelled public operation never reaches a decimal rebuild either.
    expect(() =>
      evaluate(f, {
        left: oversized,
        signal: { aborted: true },
      }),
    ).toThrowError(expect.objectContaining({ code: "EVALUATION_CANCELLED" }));
    expect(fromParts).not.toHaveBeenCalled();
  });
});

/** Every name the runtime reads as a presence-sensitive field. */
const POLLUTED_NAMES = [
  "mapping",
  "revision",
  "reasonCode",
  "status",
  "candidate",
  "approval",
  "approvals",
  "transition",
  "transitions",
  "identity",
  "provenance",
  "provisionalIdentity",
  "priorVersion",
  "supersededBy",
  "invalidationReference",
  "exposureKey",
  "successorVersion",
  "reference",
  "reasonText",
  "reason",
  "asset",
  "confidence",
  "productClass",
  "contractType",
  "valueConvention",
  "exposureUnit",
  "description",
  "sourceTimestamp",
  "receiveTimestamp",
  "processingTimestamp",
  "history",
  "registry",
  "signal",
  "state",
  "value",
  "kind",
  "mode",
  "commandDigest",
  "registryRevision",
  "mappingVersion",
] as const;
function polluted<T>(values: Record<string, unknown>, operation: () => T): T {
  const target = Object.prototype as unknown as Record<string, unknown>;
  try {
    for (const [key, value] of Object.entries(values))
      Object.defineProperty(target, key, {
        value,
        configurable: true,
        writable: true,
        enumerable: false,
      });
    return operation();
  } finally {
    for (const key of Object.keys(values)) delete target[key];
  }
}

function workflow(f: Fixture, evidence: EvidenceRecord) {
  const candidates = generateCandidates(
    [f.left, f.right, f.other],
    f.assets,
    T30,
    T30,
  );
  const admission = admitMaterializedMapping(f.input, T30);
  const history = admission.history!;
  const command = approveCommand(approveInput());
  const applied = admitMappingCommand(new MappingLedger(), command);
  const ledger = (applied as { ledger: MappingLedger }).ledger;
  const approved = ledger.versions[0]!;
  const invalidation = invalidateCommand({
    commandId: "s7-invalidate-1",
    expectedRevision: 1,
    mappingId: "s7-mapping-1",
    affectedVersion: 1,
    effectiveAt: T1D,
    recordedKnowledgeAt: T1D,
    reasonText: "reviewed correction",
    invalidationReference: "s7-correction-1",
    proposedBy: "s7-transition-proposer",
    registryRevision: approved.registryRevision,
    evidenceRevision: approved.evidenceRevision,
    provenanceDigest: approved.approvals[0]!.approvedDigest,
    approvals: [
      { actorId: "s7-tq", role: "QUANT_REVIEWER", recordedAt: T1D },
      { actorId: "s7-tm", role: "MARKET_DATA_REVIEWER", recordedAt: T1D },
    ],
  });
  const replay = (mode: string) =>
    replayMapping({
      mode,
      history,
      mappingId: history.mappingId,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      replayRevision: "s7-replay",
    } as never);
  return {
    candidates,
    matched: evaluate(f),
    unmapped: evaluate(f, { mapping: undefined }),
    sameVenue: evaluate(f, { right: f.sameVenue }),
    echoed: evaluate(f, { mapping: undefined, candidate: candidates[0] }),
    batch: evaluateBatch([
      {
        left: f.left,
        right: f.right,
        registry: f.assets,
        evaluationAt: T30,
        knowledgeCutoff: T30,
      },
      {
        left: f.left,
        right: f.other,
        registry: f.assets,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        mapping: f.input,
      },
    ] as never),
    admission,
    asKnown: replay("AS_KNOWN"),
    corrected: replay("CORRECTED"),
    command,
    applied,
    repeated: admitMappingCommand(ledger, command),
    invalidated: admitMappingCommand(ledger, invalidation),
    rejected: admitMappingCommand(
      ledger,
      approveCommand(approveInput({ commandId: "s7-command-2" })),
    ),
    registryAdmission: admitRegistryRevision(clone(f.assets.revision)),
    exposureKey: canonicalExposureKey({
      productClass: "DERIVATIVE",
      baseAssetId: A,
      quoteAssetId: USDT,
      settlementAssetId: USDT,
      contractType: "PERPETUAL",
      valueConvention: "LINEAR",
      exposureUnit: "BASE_UNIT",
    }),
    provenance: candidateProvenanceDigest(f.input.candidate),
    evidence: validateEvidenceBundle([evidence], []),
    decimal: normalizeBaseExposure(
      contractMultiplier("3"),
      contractMultiplier("0.001"),
    ).toString(),
  };
}

describe("L-05 prototype pollution cannot change any outcome", () => {
  const evidence = {
    evidenceId: "s7-evidence-1",
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

  it("Object.prototype.mapping cannot approve an evaluation", () => {
    const f = pairFixture();
    const honest = evaluate(f, { mapping: undefined });
    expect(honest.outcome).toBe("UNAVAILABLE");
    const result = polluted({ mapping: f.input }, () =>
      evaluate(f, { mapping: undefined }),
    );
    expect(result.outcome).toBe("UNAVAILABLE");
    expect(result.reasons).toEqual(["MAPPING_UNAPPROVED"]);
    expect(result.mappingVersion).toBeUndefined();
    expect(result.resultId).toBe(honest.resultId);
    expect(Object.hasOwn(Object.prototype, "mapping")).toBe(false);
  });

  it("Object.prototype.candidate, revision, reasonCode and status are inert", () => {
    const f = pairFixture();
    const forgedCandidate = { ...f.input.candidate, candidateId: "forged" };
    const honest = [
      evaluate(f, { mapping: undefined }),
      evaluate(f),
      evaluate(f, { right: f.sameVenue }),
    ];
    const results = polluted(
      {
        candidate: forgedCandidate,
        revision: { revision: FORGED },
        reasonCode: "SAME_VENUE_EXCLUDED",
        status: "QUARANTINED",
      },
      () => [
        evaluate(f, { mapping: undefined }),
        evaluate(f),
        evaluate(f, { right: f.sameVenue }),
      ],
    );
    for (let index = 0; index < results.length; index += 1) {
      expect(results[index]!.resultId).toBe(honest[index]!.resultId);
      expect(results[index]!.candidate).not.toBe(forgedCandidate);
      expect(results[index]!.registryRevision).toBe("registry-v1");
    }
    expect(results[0]!.candidate).toBeUndefined();
    expect(results[1]!.outcome).toBe("MATCHED");
  });

  it("a polluted inherited key never satisfies a required own field", () => {
    const f = pairFixture();
    const missing = clone(f.input) as unknown as {
      mapping: Record<string, unknown>;
    };
    delete missing.mapping.reasonCode;
    const result = polluted({ reasonCode: "COMPATIBLE_APPROVED" }, () =>
      admitMaterializedMapping(missing as never, T30),
    );
    expect(result).toMatchObject({
      state: "INVALID_PROVENANCE",
      reason: "INPUT_INVALID",
    });
    const revision = clone(f.assets.revision) as unknown as Record<
      string,
      unknown
    >;
    delete revision.revision;
    expect(() =>
      polluted({ revision: "registry-v1" }, () =>
        admitRegistryRevision(revision as never),
      ),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("Object.prototype.value cannot disguise an accessor as data", () => {
    const f = pairFixture();
    const forged = clone(f.input) as unknown as {
      mapping: Record<string, unknown>;
    };
    let reads = 0;
    Object.defineProperty(forged.mapping, "leftInstrumentId", {
      enumerable: true,
      get: () => ((reads += 1), "forged"),
    });
    const outcome = polluted({ value: f.input.mapping.leftInstrumentId }, () =>
      capture(() => evaluate(f, { mapping: forged })),
    );
    expect(outcome.result).toBeUndefined();
    expect(code(outcome.error)).toBe("INPUT_INVALID");
    expect(reads).toBe(0);
  });

  it("pollution of every audited name leaves the full workflow byte-identical", () => {
    const f = pairFixture();
    const honest = JSON.stringify(render(workflow(f, evidence)));
    const sentinel: Record<string, unknown> = {
      revision: { revision: FORGED },
      mapping: f.input,
      candidate: f.input.candidate,
      approvals: [],
      transitions: [],
      history: [],
      registry: f.assets,
      signal: { aborted: true },
      reasonCode: "COMPATIBLE_APPROVED",
      status: "APPROVED",
      state: "KNOWN",
      value: "polluted",
      priorVersion: 7,
      successorVersion: 7,
      supersededBy: 7,
    };
    const values = Object.fromEntries(
      POLLUTED_NAMES.map((name) => [
        name,
        sentinel[name] ?? `polluted-${name}`,
      ]),
    );
    const pollutedRun = JSON.stringify(
      render(polluted(values, () => workflow(f, evidence))),
    );
    expect(pollutedRun).toBe(honest);
    for (const name of POLLUTED_NAMES)
      expect(Object.hasOwn(Object.prototype, name)).toBe(false);
  });
});

describe("L-06 the reason catalogue is frozen", () => {
  it("keeps exactly 44 unique codes in order and refuses every mutation", () => {
    const before = [...MATCH_REASON_CODES];
    expect(Object.isFrozen(MATCH_REASON_CODES)).toBe(true);
    expect(MATCH_REASON_CODES).toHaveLength(44);
    expect(new Set(MATCH_REASON_CODES).size).toBe(44);
    expect([...MATCH_REASON_CODES].sort()).toEqual(before);
    const codes = MATCH_REASON_CODES as unknown as string[];
    for (const attempt of [
      () => codes.push("BOGUS_CODE"),
      () => codes.splice(0, 1),
      () => codes.splice(44, 0, "BOGUS_CODE"),
      () => {
        codes[0] = "BOGUS_CODE";
      },
      () => {
        codes[44] = "BOGUS_CODE";
      },
      () => {
        codes.length = 0;
      },
      () => codes.pop(),
      () => codes.sort().reverse(),
      () => Object.defineProperty(codes, "44", { value: "BOGUS_CODE" }),
    ])
      expect(attempt).toThrow(TypeError);
    expect([...MATCH_REASON_CODES]).toEqual(before);
    expect(api.MATCH_REASON_CODES).toBe(MATCH_REASON_CODES);
  });

  it("a bogus reason never becomes valid and the export count stays 22", () => {
    const f = pairFixture();
    const candidate = {
      ...(generateCandidates(
        [f.left, f.right],
        f.assets,
        T30,
        T30,
      )[0] as InstrumentMatchCandidate),
      reasons: ["BOGUS_CODE"],
    };
    expect(() => {
      (MATCH_REASON_CODES as unknown as string[]).push("BOGUS_CODE");
    }).toThrow(TypeError);
    expect(() => evaluate(f, { mapping: undefined, candidate })).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
    expect(Object.keys(api)).toHaveLength(22);
  });
});

describe("N-01 / L-03 closing class sweep", () => {
  it("no authoritative output derives from caller-owned mutable state", () => {
    const f = pairFixture();
    const honest = evaluate(f);
    // Caller getter on the candidate: refused, never executed.
    let reads = 0;
    const candidate = clone(f.input.candidate) as unknown as Record<
      string,
      unknown
    >;
    Object.defineProperty(candidate, "candidateId", {
      enumerable: true,
      get: () => ((reads += 1), "forged"),
    });
    expect(code(capture(() => evaluate(f, { candidate })).error)).toBe(
      "INPUT_INVALID",
    );
    // Own custom iterator on the instrument list: refused, never iterated.
    let iterations = 0;
    const instruments = [f.left, f.right] as VenueInstrumentEvidence[] & {
      [Symbol.iterator]?: unknown;
    };
    Object.defineProperty(instruments, Symbol.iterator, {
      value: function* () {
        iterations += 1;
        yield f.left;
      },
    });
    expect(
      code(
        capture(() => generateCandidates(instruments, f.assets, T30, T30))
          .error,
      ),
    ).toBe("INPUT_INVALID");
    expect(reads + iterations).toBe(0);
    // Published values are frozen trusted copies, never the caller objects.
    const plain = clone(f.input.candidate);
    const echoed = evaluate(f, { mapping: undefined, candidate: plain });
    expect(echoed.candidate).not.toBe(plain);
    expect(Object.isFrozen(echoed.candidate)).toBe(true);
    (plain as { candidateId: string }).candidateId = "mutated-after-return";
    expect(echoed.candidate?.candidateId).toBe(f.input.candidate.candidateId);
    const mapped = clone(f.input);
    const result = evaluate(f, { mapping: mapped });
    expect(result.mappingVersion).not.toBe(mapped.mapping);
    (mapped.mapping as { mappingId: string }).mappingId = "mutated";
    expect(result.mappingVersion?.mappingId).toBe(f.input.mapping.mappingId);
    expect(result.resultId).toBe(honest.resultId);
    for (const value of [result, result.mappingVersion, result.reasons])
      expect(Object.isFrozen(value)).toBe(true);
    expect(Object.getPrototypeOf(result)).toBeNull();
    // The registry revision of a MATCHED result always equals the mapping's.
    expect(result.registryRevision).toBe(
      result.mappingVersion?.registryRevision,
    );
  });
});
