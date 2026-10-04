import {
  ExactDecimal,
  canonicalAssetId,
  contractMultiplier,
} from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import {
  admitMaterializedMapping,
  candidateProvenanceDigest,
} from "./admission.js";
import { generateCandidates } from "./candidates.js";
import {
  MappingLedger,
  admitMappingCommand,
  approveCommand,
  invalidateCommand,
} from "./commands.js";
import { normalizeBaseExposure, normalizeQuoteNotional } from "./economics.js";
import { evaluateBatch, evaluateMatch } from "./evaluator.js";
import { validateEvidenceBundle } from "./evidence.js";
import type {
  EvidenceRecord,
  MappingVersion,
  VenueInstrumentEvidence,
} from "./model.js";
import { MatchingFailure } from "./reasons.js";
import { CuratedAssetRegistry, admitRegistryRevision } from "./registry.js";
import { replayMapping } from "./replay.js";
import { canonicalExposureKey } from "./serialization.js";
import {
  A,
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
/** Defines a getter that returns `first` on the first `switchAfter` reads. */
function switching<T>(
  target: object,
  key: string,
  first: T,
  later: T,
  switchAfter = 1,
) {
  const state = { reads: 0 };
  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get() {
      state.reads += 1;
      return state.reads <= switchAfter ? first : later;
    },
  });
  return state;
}

function pairFixture() {
  const left = instrument({ name: "N01_LEFT" });
  const right = instrument({ name: "N01_RIGHT" });
  const other = instrument({ name: "N01_OTHER" });
  const assets = registry([left, right, other]);
  const input = mappingAdmission(left, right, assets);
  return { left, right, other, assets, input };
}

/**
 * The ACCEPTANCE_6 material case: accessors on mapping instrument IDs and six
 * candidate revision/digest fields return the approved pair's values to every
 * validation read and another pair's values at the final read.
 */
function forgeMaterialCase(switchAfter: number) {
  const { left, right, other, assets, input } = pairFixture();
  const forged = clone(input) as unknown as {
    mapping: Record<string, unknown>;
    candidate: Record<string, unknown>;
  } & Record<string, unknown>;
  const legs = [right, other].sort((a, b) =>
    Buffer.compare(
      Buffer.from(a.metadata.instrumentId),
      Buffer.from(b.metadata.instrumentId),
    ),
  );
  const states = [
    switching(
      forged.mapping,
      "leftInstrumentId",
      input.mapping.leftInstrumentId,
      legs[0]!.metadata.instrumentId,
      switchAfter,
    ),
    switching(
      forged.mapping,
      "rightInstrumentId",
      input.mapping.rightInstrumentId,
      legs[1]!.metadata.instrumentId,
      switchAfter,
    ),
  ];
  for (const [field, leg, pick] of [
    [
      "leftMetadataRevision",
      0,
      (i: VenueInstrumentEvidence) => i.metadataRevision,
    ],
    [
      "rightMetadataRevision",
      1,
      (i: VenueInstrumentEvidence) => i.metadataRevision,
    ],
    ["leftMetadataDigest", 0, (i: VenueInstrumentEvidence) => i.metadataDigest],
    [
      "rightMetadataDigest",
      1,
      (i: VenueInstrumentEvidence) => i.metadataDigest,
    ],
    [
      "leftEconomicsRevision",
      0,
      (i: VenueInstrumentEvidence) => i.economics.evidenceRevision,
    ],
    [
      "rightEconomicsRevision",
      1,
      (i: VenueInstrumentEvidence) => i.economics.evidenceRevision,
    ],
  ] as const)
    states.push(
      switching(
        forged.candidate,
        field,
        input.candidate[field],
        pick(legs[leg]!),
        switchAfter,
      ),
    );
  return { left, right, other, assets, input, forged, states };
}

describe("sixth acceptance N-01: passive caller-input snapshot", () => {
  it("9. the ACCEPTANCE_6 MATCHED-for-an-unapproved-pair exploit is impossible", () => {
    const f = pairFixture();
    // Honest control: the approved mapping evaluated against another pair.
    const honest = evaluateMatch({
      left: f.right,
      right: f.other,
      registry: f.assets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      mapping: f.input,
    });
    expect(honest.outcome).not.toBe("MATCHED");
    for (const switchAfter of [1, 2, 3, 5, 8, 13, 50]) {
      const forged = forgeMaterialCase(switchAfter);
      const evaluation = capture(() =>
        evaluateMatch({
          left: forged.right,
          right: forged.other,
          registry: forged.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          mapping: forged.forged as never,
        }),
      );
      // The forged (accessor-backed) mapping is refused at the boundary with
      // the typed INPUT_INVALID failure; nothing is published.
      expect(evaluation.result).toBeUndefined();
      expect(code(evaluation.error)).toBe("INPUT_INVALID");
      // No getter ran: accessor descriptors are refused, never invoked.
      for (const state of forged.states) expect(state.reads).toBe(0);
      const admission = admitMaterializedMapping(forged.forged as never, T30);
      expect(admission).toMatchObject({
        state: "INVALID_PROVENANCE",
        reason: "INPUT_INVALID",
      });
      expect(admission.history).toBeUndefined();
    }
  });

  it("9b. a Proxy that answers differently on later reads is read exactly once", () => {
    const f = pairFixture();
    const legs = [f.right, f.other].sort((a, b) =>
      Buffer.compare(
        Buffer.from(a.metadata.instrumentId),
        Buffer.from(b.metadata.instrumentId),
      ),
    );
    const reads = new Map<string, number>();
    const target = clone(f.input.mapping) as unknown as Record<string, unknown>;
    const later: Record<string, unknown> = {
      leftInstrumentId: legs[0]!.metadata.instrumentId,
      rightInstrumentId: legs[1]!.metadata.instrumentId,
    };
    const mapping = new Proxy(target, {
      get(object, key) {
        if (typeof key === "string") reads.set(`get:${key}`, 1);
        return object[key as string];
      },
      getOwnPropertyDescriptor(object, key) {
        const name = String(key);
        const count = (reads.get(name) ?? 0) + 1;
        reads.set(name, count);
        const found = Reflect.getOwnPropertyDescriptor(object, key);
        // First read: the approved value; any later read: another pair.
        return count > 1 && name in later && found
          ? { ...found, value: later[name] }
          : found;
      },
    });
    const result = evaluateMatch({
      left: f.right,
      right: f.other,
      registry: f.assets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      mapping: { ...f.input, mapping } as never,
    });
    expect(result.outcome).not.toBe("MATCHED");
    // Each mapping field was read at most once per snapshot pass (the
    // evaluation snapshot), never through the get trap.
    for (const [key, count] of reads) {
      expect(key.startsWith("get:"), key).toBe(false);
      expect(count, key).toBe(1);
    }
  });

  it("1/2. getters on identity or canonical asset fields are refused, not run", () => {
    const f = pairFixture();
    const left = clone(f.left) as unknown as {
      metadata: Record<string, unknown>;
    } & Record<string, unknown>;
    const state = switching(
      left.metadata,
      "baseAsset",
      A,
      canonicalAssetId("asset:Z"),
    );
    const base = switching(
      left,
      "nativeBaseAssetReference",
      f.left.nativeBaseAssetReference,
      "other",
    );
    for (const operation of [
      () =>
        evaluateMatch({
          left: left as never,
          right: f.right,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
        }),
      () => generateCandidates([left as never, f.right], f.assets, T30, T30),
    ]) {
      const { result, error } = capture(operation);
      expect(result).toBeUndefined();
      expect(code(error)).toBe("INPUT_INVALID");
    }
    expect(state.reads + base.reads).toBe(0);
    let identityReads = 0;
    const identity = {
      productClass: "DERIVATIVE",
      quoteAssetId: USDT,
      settlementAssetId: USDT,
      contractType: "PERPETUAL",
      valueConvention: "LINEAR",
      exposureUnit: "BASE_UNIT",
    };
    Object.defineProperty(identity, "baseAssetId", {
      enumerable: true,
      get() {
        identityReads += 1;
        return identityReads === 1 ? A : "b".repeat(2_000_000);
      },
    });
    expect(() => canonicalExposureKey(identity as never)).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
    expect(identityReads).toBe(0);
  });

  it("3. getters on mapping/approval identifiers are refused (typed outcome)", () => {
    const f = pairFixture();
    const forged = clone(f.input) as unknown as {
      review: { approvals: Record<string, unknown>[] };
      mapping: Record<string, unknown>;
    };
    const a = switching(
      forged.review.approvals[0]!,
      "actorId",
      "fixture-quant-reviewer",
      "x",
    );
    const b = switching(forged.mapping, "mappingId", "mapping-1", "mapping-2");
    expect(admitMaterializedMapping(forged as never, T30)).toMatchObject({
      state: "INVALID_PROVENANCE",
      reason: "INPUT_INVALID",
    });
    expect(a.reads + b.reads).toBe(0);
  });

  it("4/7. economics getters and fake decimals cannot cross the boundary", () => {
    const f = pairFixture();
    const genuine = contractMultiplier("1");
    const fakes: [string, unknown][] = [
      [
        "duck-typed",
        { isZero: () => false, isNegative: () => false, equals: () => true },
      ],
      [
        "prototype spoof with accessor fields",
        Object.create(ExactDecimal.prototype, {
          coefficient: { get: () => 1n, enumerable: true },
          scale: { get: () => 0, enumerable: true },
        }) as unknown,
      ],
      [
        "prototype spoof with forged non-normalized parts",
        Object.assign(Object.create(ExactDecimal.prototype) as object, {
          coefficient: 10n,
          scale: 1,
        }),
      ],
      [
        "prototype spoof with extra behaviour",
        Object.assign(Object.create(ExactDecimal.prototype) as object, {
          coefficient: 1n,
          scale: 0,
          equals: () => true,
        }),
      ],
    ];
    for (const [name, fake] of fakes) {
      const left = clone(f.left) as unknown as {
        economics: { baseUnitsPerNativeQuantity: { value: unknown } };
        metadata: { contractMultiplier: { value: unknown } };
      };
      const right = clone(f.right) as typeof left;
      for (const leg of [left, right]) {
        leg.economics.baseUnitsPerNativeQuantity.value = fake;
        leg.metadata.contractMultiplier.value = fake;
      }
      const { result, error } = capture(() =>
        evaluateMatch({
          left: left as never,
          right: right as never,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          mapping: f.input,
        }),
      );
      expect(result, name).toBeUndefined();
      expect(code(error), name).toBe("INPUT_INVALID");
      expect(
        () => normalizeBaseExposure(genuine, fake as never),
        name,
      ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    }
    // An economics getter on the payoff is refused without running it.
    const left = clone(f.left) as unknown as {
      economics: Record<string, unknown>;
    };
    const payoff = switching(
      left.economics,
      "payoff",
      { state: "KNOWN", value: "LINEAR" },
      { state: "KNOWN", value: "INVERSE" },
    );
    expect(
      code(
        capture(() =>
          evaluateMatch({
            left: left as never,
            right: f.right,
            registry: f.assets,
            evaluationAt: T30,
            knowledgeCutoff: T30,
          }),
        ).error,
      ),
    ).toBe("INPUT_INVALID");
    expect(payoff.reads).toBe(0);
    // Genuine decimals still work, including a mutated-after-entry genuine one.
    expect(
      normalizeBaseExposure(genuine, contractMultiplier("0.001")).toString(),
    ).toBe("0.001");
    expect(
      normalizeQuoteNotional(
        contractMultiplier("2"),
        contractMultiplier("3"),
      ).toString(),
    ).toBe("6");
    expect(() => normalizeBaseExposure("1" as never, genuine)).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
  });

  it("5/6. registry getters and own custom iterators are refused", () => {
    const base = registry([instrument({ name: "N01_REG" })]).revision;
    const withGetter = clone(base) as unknown as Record<string, unknown>;
    const revisionReads = switching(
      withGetter,
      "revision",
      "registry-v1",
      "r".repeat(500_000),
    );
    const assets = clone(base.assets) as unknown as Record<string, unknown>[];
    const valid = assets[0]!;
    assets[0] = { ...valid, displayName: "d".repeat(500_000), reviewedBy: "" };
    let iterations = 0;
    Object.defineProperty(assets, Symbol.iterator, {
      value: function* () {
        iterations += 1;
        yield valid;
      },
    });
    const withIterator = { ...clone(base), assets };
    for (const revision of [withGetter, withIterator]) {
      const { result, error } = capture(() =>
        admitRegistryRevision(revision as never),
      );
      expect(result).toBeUndefined();
      expect(code(error)).toBe("INPUT_INVALID");
      expect(() => new CuratedAssetRegistry(revision as never)).toThrowError(
        expect.objectContaining({ code: "INPUT_INVALID" }),
      );
    }
    expect(revisionReads.reads).toBe(0);
    expect(iterations).toBe(0);
    // Batch and candidate lists with an own iterator are refused as well.
    const f = pairFixture();
    const list: unknown[] = [f.left, f.right];
    Object.defineProperty(list, Symbol.iterator, {
      value: function* () {
        iterations += 1;
        yield f.left;
      },
    });
    expect(
      code(
        capture(() => generateCandidates(list as never, f.assets, T30, T30))
          .error,
      ),
    ).toBe("INPUT_INVALID");
    expect(code(capture(() => evaluateBatch(list as never)).error)).toBe(
      "INPUT_INVALID",
    );
    expect(iterations).toBe(0);
    // Holes and extra array keys are refused.
    const holey = [f.left, , f.right];
    expect(
      code(
        capture(() => generateCandidates(holey as never, f.assets, T30, T30))
          .error,
      ),
    ).toBe("INPUT_INVALID");
    const extra = Object.assign([f.left, f.right], { injected: true });
    expect(
      code(
        capture(() => generateCandidates(extra as never, f.assets, T30, T30))
          .error,
      ),
    ).toBe("INPUT_INVALID");
  });

  it("8. caller mutation after entry (mid-operation) cannot change the result", () => {
    const f = pairFixture();
    const honest = evaluateMatch({
      left: f.left,
      right: f.right,
      registry: f.assets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      mapping: f.input,
    });
    expect(honest.outcome).toBe("MATCHED");
    const left = clone(f.left);
    const right = clone(f.right);
    const mapping = clone(f.input);
    let mutated = false;
    let polls = 0;
    const signal = {
      get aborted() {
        // Poll 1 is the budget's pre-work check (before the snapshot); from
        // poll 2 on the operation is past entry: rewrite every caller-owned
        // object it received.
        polls += 1;
        if (polls >= 2 && !mutated) {
          mutated = true;
          (left.metadata as { baseAsset: string }).baseAsset = "asset:Z";
          (right as { metadataRevision: string }).metadataRevision = "forged";
          (mapping.mapping as { exposureKey: string }).exposureKey = "forged";
          (mapping.history as unknown[]).length = 0;
          (mapping.candidate as { candidateId: string }).candidateId = "forged";
        }
        return false;
      },
    };
    const during = evaluateMatch({
      left,
      right,
      registry: f.assets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      mapping,
      signal,
    });
    expect(mutated).toBe(true);
    expect(during.resultId).toBe(honest.resultId);
    expect(during.outcome).toBe("MATCHED");
    // The published candidate and mapping are frozen trusted copies.
    expect(Object.isFrozen(during.candidate)).toBe(true);
    expect(during.candidate).not.toBe(mapping.candidate);
    expect(Object.isFrozen(during.mappingVersion)).toBe(true);
  });

  it("evidence and command getters are refused before any proportional work", () => {
    let reads = 0;
    const record: Record<string, unknown> = {
      evidenceId: "evidence-1",
      evidenceClass: "FROZEN_METADATA",
      sourceId: "SOURCE",
      sourceRevision: "source-v1",
      productScope: "ORDINARY_LINEAR_PERPETUAL",
      retrievalDate: "2026-09-15",
      recordedAt: T0,
      validFrom: T0,
      validTo: T30D,
      quality: "VERIFIED",
      policyRevision: "instrument-matching-pilot/v1",
    };
    Object.defineProperty(record, "sourceDigest", {
      enumerable: true,
      get() {
        reads += 1;
        return reads === 1 ? "digest" : "h".repeat(4_000_000);
      },
    });
    expect(() =>
      validateEvidenceBundle([record as unknown as EvidenceRecord], []),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(reads).toBe(0);
    const f = pairFixture();
    const command = clone(f.input.command) as unknown as Record<
      string,
      unknown
    >;
    const commandReads = switching(
      command,
      "mappingId",
      "mapping-1",
      "mapping-2",
    );
    expect(
      admitMappingCommand(new MappingLedger(), command as never),
    ).toMatchObject({
      status: "REJECTED",
      reason: "INPUT_INVALID",
    });
    expect(commandReads.reads).toBe(0);
  });
});

describe("sixth acceptance L-02: replay mode runtime validation", () => {
  it("accepts only AS_KNOWN and CORRECTED", () => {
    const f = pairFixture();
    const history = admittedHistory(f.input);
    const replay = (mode: unknown) =>
      capture(() =>
        (replayMapping as (input: unknown) => unknown)({
          mode,
          history,
          mappingId: history.mappingId,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          replayRevision: "l02",
        }),
      );
    for (const mode of ["AS_KNOWN", "CORRECTED"])
      expect(replay(mode).error).toBeUndefined();
    for (const mode of [
      "BOGUS",
      "as_known",
      "",
      7,
      {},
      null,
      undefined,
      ["AS_KNOWN"],
    ])
      expect(code(replay(mode).error), String(mode)).toBe("INPUT_INVALID");
    // An accessor-backed mode is refused without running the getter.
    let reads = 0;
    const input: Record<string, unknown> = {
      history,
      mappingId: history.mappingId,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      replayRevision: "l02",
    };
    Object.defineProperty(input, "mode", {
      enumerable: true,
      get() {
        reads += 1;
        return "AS_KNOWN";
      },
    });
    expect(code(capture(() => replayMapping(input as never)).error)).toBe(
      "INPUT_INVALID",
    );
    expect(reads).toBe(0);
  });
});

describe("sixth acceptance L-03: no untrusted caller object is echoed", () => {
  it("never publishes the caller candidate by reference; validates it first", () => {
    const f = pairFixture();
    const candidate = clone(f.input.candidate);
    const result = evaluateMatch({
      left: f.left,
      right: f.right,
      registry: f.assets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      candidate,
    });
    expect(result.outcome).toBe("UNAVAILABLE");
    expect(result.candidate).toEqual(f.input.candidate);
    expect(result.candidate).not.toBe(candidate);
    expect(Object.isFrozen(result.candidate)).toBe(true);
    (candidate as { candidateId: string }).candidateId = "mutated";
    expect(result.candidate!.candidateId).toBe(f.input.candidate.candidateId);
    // An unvalidated (malformed) caller candidate is refused, not echoed.
    for (const bad of [
      { ...clone(f.input.candidate), candidateId: "x".repeat(10_000) },
      { ...clone(f.input.candidate), injected: true },
      { ...clone(f.input.candidate), reasons: ["NOT_A_CODE"] },
    ])
      expect(
        code(
          capture(() =>
            evaluateMatch({
              left: f.left,
              right: f.right,
              registry: f.assets,
              evaluationAt: T30,
              knowledgeCutoff: T30,
              candidate: bad as never,
            }),
          ).error,
        ),
      ).toBe("INPUT_INVALID");
  });

  it("validates caller candidate timestamps strictly", () => {
    const f = pairFixture();
    expect(
      code(
        capture(() =>
          evaluateMatch({
            left: f.left,
            right: f.right,
            registry: f.assets,
            evaluationAt: T30,
            knowledgeCutoff: T30,
            candidate: {
              ...clone(f.input.candidate),
              createdAt: "2026-09-15 00:00:00",
            } as never,
          }),
        ).error,
      ),
    ).toBe("EVIDENCE_TIME_INVALID");
  });

  it("refuses a fake registry before any exit, so no forged revision escapes", () => {
    const f = pairFixture();
    const forgedRevision = "r".repeat(1_016);
    for (const registryLike of [
      { revision: { revision: forgedRevision } },
      Object.create(CuratedAssetRegistry.prototype, {
        revision: { value: { revision: forgedRevision }, enumerable: true },
      }) as unknown,
      new Proxy(f.assets, {}),
    ]) {
      // Same venue: the earliest NOT_MATCHED exit, which used to read the
      // fake registry's revision into the published result.
      const { result, error } = capture(() =>
        evaluateMatch({
          left: f.left,
          right: f.left,
          registry: registryLike as never,
          evaluationAt: T30,
          knowledgeCutoff: T30,
        }),
      );
      expect(result).toBeUndefined();
      expect(code(error)).toBe("INPUT_INVALID");
      expect(
        code(
          capture(() =>
            generateCandidates([f.left], registryLike as never, T30, T30),
          ).error,
        ),
      ).toBe("INPUT_INVALID");
    }
    const ledgerLike = { versions: [], transitions: [] };
    expect(
      code(
        capture(() => admitMappingCommand(ledgerLike as never, f.input.command))
          .error,
      ),
    ).toBe("INPUT_INVALID");
  });
});

describe("sixth acceptance L-04: typed failure boundary", () => {
  it("maps malformed caller shapes to typed failures, never a raw TypeError", () => {
    const f = pairFixture();
    const history = admittedHistory(f.input);
    const withoutContext = clone(f.left) as unknown as {
      metadata: Record<string, unknown>;
    };
    delete withoutContext.metadata.context;
    const stringMultiplier = clone(f.left) as unknown as {
      economics: { baseUnitsPerNativeQuantity: { value: unknown } };
    };
    stringMultiplier.economics.baseUnitsPerNativeQuantity.value = "1";
    const undefinedCandidateField = {
      ...clone(f.input),
      candidate: { ...clone(f.input.candidate), leftInstrumentId: undefined },
    };
    const accessor: Record<string, unknown> = {};
    Object.defineProperty(accessor, "left", {
      enumerable: true,
      get: () => f.left,
    });
    class Custom {
      readonly left = f.left;
    }
    const thrown: [string, () => unknown][] = [
      [
        "generateCandidates(null)",
        () => generateCandidates(null as never, f.assets, T30, T30),
      ],
      [
        "generateCandidates([null])",
        () => generateCandidates([null] as never, f.assets, T30, T30),
      ],
      [
        "generateCandidates([{}])",
        () => generateCandidates([{}] as never, f.assets, T30, T30),
      ],
      [
        "generateCandidates(primitive)",
        () => generateCandidates("x" as never, f.assets, T30, T30),
      ],
      ["evaluateMatch(null)", () => evaluateMatch(null as never)],
      ["evaluateMatch(undefined)", () => evaluateMatch(undefined as never)],
      ["evaluateMatch(primitive)", () => evaluateMatch(7 as never)],
      ["evaluateMatch({})", () => evaluateMatch({} as never)],
      ["evaluateMatch(accessor)", () => evaluateMatch(accessor as never)],
      [
        "evaluateMatch(class instance)",
        () => evaluateMatch(new Custom() as never),
      ],
      [
        "evaluateMatch(missing nested context)",
        () =>
          evaluateMatch({
            left: withoutContext as never,
            right: f.right,
            registry: f.assets,
            evaluationAt: T30,
            knowledgeCutoff: T30,
          }),
      ],
      [
        "evaluateMatch(string multiplier)",
        () =>
          evaluateMatch({
            left: stringMultiplier as never,
            right: f.right,
            registry: f.assets,
            evaluationAt: T30,
            knowledgeCutoff: T30,
          }),
      ],
      ["evaluateBatch(null)", () => evaluateBatch(null as never)],
      ["evaluateBatch(non-iterable)", () => evaluateBatch(7 as never)],
      ["evaluateBatch([null])", () => evaluateBatch([null] as never)],
      [
        "admitRegistryRevision(null)",
        () => admitRegistryRevision(null as never),
      ],
      [
        "admitRegistryRevision(primitive)",
        () => admitRegistryRevision("x" as never),
      ],
      [
        "admitRegistryRevision(malformed array)",
        () =>
          admitRegistryRevision({ ...f.assets.revision, assets: "x" } as never),
      ],
      ["new MappingLedger(null)", () => new MappingLedger(null as never)],
      ["new MappingLedger(malformed)", () => new MappingLedger([{}] as never)],
      ["approveCommand(null)", () => approveCommand(null as never)],
      ["approveCommand({})", () => approveCommand({} as never)],
      [
        "invalidateCommand(undefined)",
        () => invalidateCommand(undefined as never),
      ],
      [
        "validateEvidenceBundle(null)",
        () => validateEvidenceBundle(null as never, []),
      ],
      [
        "validateEvidenceBundle([null])",
        () => validateEvidenceBundle([null] as never, []),
      ],
      ["replayMapping(null)", () => replayMapping(null as never)],
      [
        "replayMapping(bad mode)",
        () =>
          replayMapping({
            mode: "BOGUS" as never,
            history,
            mappingId: history.mappingId,
            evaluationAt: T30,
            knowledgeCutoff: T30,
            replayRevision: "r",
          }),
      ],
      [
        "candidateProvenanceDigest(null)",
        () => candidateProvenanceDigest(null as never),
      ],
      [
        "candidateProvenanceDigest(missing field)",
        () =>
          candidateProvenanceDigest({
            ...clone(f.input.candidate),
            reasons: undefined,
          } as never),
      ],
      ["canonicalExposureKey(null)", () => canonicalExposureKey(null as never)],
      [
        "normalizeBaseExposure(malformed decimal)",
        () => normalizeBaseExposure({} as never, {} as never),
      ],
      [
        "MappingLedger.apply(null)",
        () => new MappingLedger().apply(null as never),
      ],
      [
        "admitMappingCommand(fake ledger)",
        () => admitMappingCommand({} as never, f.input.command),
      ],
    ];
    for (const [name, operation] of thrown) {
      const { result, error } = capture(operation);
      expect(result, name).toBeUndefined();
      expect(error, name).toBeInstanceOf(MatchingFailure);
      expect(error, name).not.toBeInstanceOf(TypeError);
      expect(code(error), name).toBe("INPUT_INVALID");
    }
    // Typed-outcome operations return their typed rejection instead.
    for (const [name, value] of [
      ["admission(null)", admitMaterializedMapping(null as never, T30)],
      ["admission(primitive)", admitMaterializedMapping("x" as never, T30)],
      [
        "admission(undefined candidate field)",
        admitMaterializedMapping(undefinedCandidateField as never, T30),
      ],
      [
        "command(null)",
        admitMappingCommand(new MappingLedger(), null as never),
      ],
      [
        "command(primitive)",
        admitMappingCommand(new MappingLedger(), 7 as never),
      ],
    ] as const)
      expect((value as { reason?: string }).reason, name).toBe("INPUT_INVALID");
  });

  it("does not swallow cancellation or budget exhaustion", () => {
    const f = pairFixture();
    const aborted = { aborted: true };
    for (const operation of [
      () => generateCandidates([f.left, f.right], f.assets, T30, T30, aborted),
      () => admitMaterializedMapping(f.input, T30, aborted),
      () => admitMappingCommand(new MappingLedger(), f.input.command, aborted),
      () => validateEvidenceBundle([], [], aborted),
      () =>
        evaluateMatch({
          left: f.left,
          right: f.right,
          registry: f.assets,
          evaluationAt: T30,
          knowledgeCutoff: T30,
          signal: aborted,
        }),
    ])
      expect(code(capture(operation).error)).toBe("EVALUATION_CANCELLED");
    const many = Array.from({ length: 1_024 }, (_, index) =>
      instrument({ name: `L04_${index}`, venue: `L04_V${index % 4}` }),
    );
    expect(
      code(
        capture(() => generateCandidates(many, registry(many), T30, T30)).error,
      ),
    ).toBe("MATCHING_BOUND_EXCEEDED");
  });
});

describe("sixth acceptance: passive inputs keep their accepted semantics", () => {
  it("frozen market-data and plain JSON-shaped inputs still match and digest identically", () => {
    const f = pairFixture();
    const direct = evaluateMatch({
      left: f.left,
      right: f.right,
      registry: f.assets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      mapping: f.input,
    });
    const cloned = evaluateMatch({
      left: clone(f.left),
      right: clone(f.right),
      registry: f.assets,
      evaluationAt: T30,
      knowledgeCutoff: T30,
      mapping: clone(f.input),
    });
    expect(direct.outcome).toBe("MATCHED");
    expect(cloned.resultId).toBe(direct.resultId);
    const versions: MappingVersion[] = [approvedMapping(f.left, f.right)];
    expect(new MappingLedger(clone(versions)).versions).toEqual(
      new MappingLedger(versions).versions,
    );
  });
});
