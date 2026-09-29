import {
  ExactDecimal,
  contractMultiplier,
  timestamp,
  type ContractMultiplier,
} from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import { generateCandidates } from "./candidates.js";
import { evaluateMatch } from "./evaluator.js";
import type {
  AssetAlias,
  AssetBinding,
  MappingVersion,
  VenueInstrumentEvidence,
} from "./model.js";
import { MATCHING_POLICY_VERSION } from "./policy.js";
import { MatchingFailure } from "./reasons.js";
import { CuratedAssetRegistry } from "./registry.js";
import { replayMapping } from "./replay.js";
import {
  A,
  B,
  T0,
  T1D,
  T30,
  T30D,
  T60,
  T60P1,
  USDC,
  approvedMapping,
  admittedHistory,
  mappingAdmission,
  instrument,
  registry,
} from "./test-fixtures.js";

function run(
  left: VenueInstrumentEvidence,
  right: VenueInstrumentEvidence,
  options: {
    readonly registry?: CuratedAssetRegistry;
    readonly mapping?: MappingVersion;
    readonly at?: typeof T0;
    readonly cutoff?: typeof T0;
  } = {},
) {
  const assets = options.registry ?? registry([left, right]);
  return evaluateMatch({
    left,
    right,
    registry: assets,
    evaluationAt: options.at ?? T30,
    knowledgeCutoff: options.cutoff ?? T30,
    mapping: mappingAdmission(
      left,
      right,
      assets,
      options.mapping ?? approvedMapping(left, right),
    ),
  });
}

describe("all 29 accepted D-055 scenarios", () => {
  it("1 matches complete reviewed A/USDT linear perpetuals", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    expect(run(left, right)).toMatchObject({
      outcome: "MATCHED",
      reasons: ["COMPATIBLE_APPROVED"],
    });
  });

  it("2 rejects the same ticker when canonical base assets differ", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE", base: B });
    expect(run(left, right)).toMatchObject({
      outcome: "NOT_MATCHED",
      reasons: ["BASE_ASSET_MISMATCH"],
    });
  });

  it("3 keeps USDT and USDC settlement distinct", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE", quote: USDC, settle: USDC });
    expect(run(left, right)).toMatchObject({
      outcome: "NOT_MATCHED",
      reasons: ["SETTLEMENT_ASSET_MISMATCH"],
    });
  });

  it("4 rejects linear/inverse economics", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE", convention: "INVERSE" });
    expect(run(left, right)).toMatchObject({
      outcome: "NOT_MATCHED",
      reasons: ["VALUE_CONVENTION_MISMATCH"],
    });
  });

  it.each([
    [
      "perpetual/dated",
      instrument({ name: "OKX" }),
      instrument({
        name: "BINANCE",
        contract: "DATED_FUTURE",
        marketType: "FUTURE",
      }),
    ],
    [
      "dated/dated",
      instrument({
        name: "OKX",
        contract: "DATED_FUTURE",
        marketType: "FUTURE",
      }),
      instrument({
        name: "BINANCE",
        contract: "DATED_FUTURE",
        marketType: "FUTURE",
      }),
    ],
  ])("5 excludes %s products", (_name, left, right) => {
    expect(run(left, right)).toMatchObject({
      outcome: "NOT_MATCHED",
      reasons: ["DATED_PRODUCT_EXCLUDED"],
    });
  });

  it.each(["1", "0.001", "100"])(
    "6 permits differing exactly normalizable right-leg multiplier %s",
    (rightMultiplier) => {
      const left = instrument({ name: "OKX", multiplier: "1" });
      const right = instrument({
        name: "BINANCE",
        multiplier: rightMultiplier,
      });
      expect(run(left, right).outcome).toBe("MATCHED");
    },
  );

  it("7 fails closed on an unknown multiplier", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({
      name: "BINANCE",
      multiplier: "UNKNOWN",
      metadataMultiplier: "UNKNOWN",
    });
    expect(run(left, right)).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["MULTIPLIER_UNKNOWN"],
    });
  });

  it("8 fails closed on unknown lifecycle", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE", lifecycle: "UNKNOWN" });
    expect(run(left, right)).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["LIFECYCLE_UNKNOWN"],
    });
  });

  it("9 permits one reviewed direct alias without ticker inference", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE", base: B });
    const alias: AssetAlias = {
      aliasId: "alias-b-to-a",
      registryRevision: "registry-v1",
      aliasAssetId: B,
      targetAssetId: A,
      effectiveFrom: T0,
      effectiveTo: T30D,
      recordedKnowledgeAt: T0,
      reviewedBy: "asset-reviewer",
    };
    const normalizedRight = {
      ...right,
      economics: {
        ...right.economics,
        canonicalBaseUnit: { state: "KNOWN", value: `${A}:BASE_UNIT` } as const,
      },
    };
    const assets = registry([left, normalizedRight], {}, [alias]);
    expect(run(left, normalizedRight, { registry: assets }).outcome).toBe(
      "MATCHED",
    );
    expect(
      generateCandidates([left, normalizedRight], assets, T30, T30)[0]
        ?.confidence,
    ).toBe("REVIEWED_MANUAL");
  });

  it("10 quarantines conflicting manual identity bindings", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const base = registry([left, right]);
    const first = base.revision.bindings.find(
      (value) => value.venue === right.metadata.venue && value.role === "BASE",
    )!;
    const conflict: AssetBinding = {
      ...first,
      bindingId: "conflicting-base",
      canonicalAssetId: B,
    };
    const assets = new CuratedAssetRegistry({
      ...base.revision,
      bindings: [...base.revision.bindings, conflict],
    });
    expect(run(left, right, { registry: assets })).toMatchObject({
      outcome: "QUARANTINED",
      reasons: ["ASSET_BINDING_CONFLICT"],
    });
  });

  it("11 distinguishes a superseded current mapping from historical AS_KNOWN replay", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const old = approvedMapping(left, right);
    const superseded = approvedMapping(left, right, "SUPERSEDED", {
      version: 2,
      priorVersion: 1,
      recordedKnowledgeAt: T60,
    });
    expect(run(left, right, { mapping: superseded, at: T60 })).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["MAPPING_SUPERSEDED"],
    });
    expect(
      replayMapping({
        mode: "AS_KNOWN",
        history: admittedHistory(
          mappingAdmission(left, right, registry([left, right]), superseded),
        ),
        mappingId: old.mappingId,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        replayRevision: "r1",
      }),
    ).toMatchObject({ outcome: "MATCHED", mapping: { version: 1 } });
  });

  it("12 preserves canonical identity across an explicitly reviewed rebrand revision", () => {
    const before = instrument({ name: "OLD_BRAND" });
    const after = instrument({ name: "NEW_BRAND" });
    const peer = instrument({ name: "OKX" });
    const beforeAssets = registry([peer, before]);
    const next = registry([peer, after]);
    const afterAssets = new CuratedAssetRegistry({
      ...next.revision,
      revision: "registry-v2",
      assets: next.revision.assets.map((asset) =>
        asset.assetId === A
          ? {
              ...asset,
              registryRevision: "registry-v2",
              canonicalSymbol: "NEW",
              displayName: "New Brand",
            }
          : { ...asset, registryRevision: "registry-v2" },
      ),
      bindings: next.revision.bindings.map((binding) => ({
        ...binding,
        registryRevision: "registry-v2",
      })),
    });
    const beforeResult = run(peer, before, { registry: beforeAssets });
    const afterResult = run(peer, after, {
      registry: afterAssets,
      mapping: approvedMapping(peer, after, "APPROVED", {
        registryRevision: "registry-v2",
      }),
    });
    expect(beforeResult.outcome).toBe("MATCHED");
    expect(afterResult.outcome).toBe("MATCHED");
    expect(
      generateCandidates([peer, before], beforeAssets, T30, T30)[0]
        ?.exposureKey,
    ).toBe(
      generateCandidates([peer, after], afterAssets, T30, T30)[0]?.exposureKey,
    );
    expect(beforeAssets.describe(A, T30, T30)?.displayName).toBe("asset:A");
    expect(afterAssets.describe(A, T30, T30)?.displayName).toBe("New Brand");
    expect(
      replayMapping({
        mode: "AS_KNOWN",
        history: admittedHistory(
          mappingAdmission(
            peer,
            before,
            beforeAssets,
            approvedMapping(peer, before),
          ),
        ),
        mappingId: "mapping-1",
        evaluationAt: T30,
        knowledgeCutoff: T30,
        replayRevision: "rebrand-replay",
      }).registryRevision,
    ).toBe("registry-v1");
  });

  it("13 does not use duplicate ticker text when bindings are absent", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const empty = new CuratedAssetRegistry({
      revision: "empty-v1",
      recordedAt: T0,
      assets: [],
      bindings: [],
      aliases: [],
    });
    expect(run(left, right, { registry: empty })).toMatchObject({
      outcome: "AMBIGUOUS",
      reasons: ["ASSET_IDENTITY_UNKNOWN"],
    });
  });

  it("14 rejects unsupported product families", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE", contract: "OTHER" });
    expect(run(left, right)).toMatchObject({
      outcome: "NOT_MATCHED",
      reasons: ["PRODUCT_UNSUPPORTED"],
    });
  });

  it("15 accepts exactly 60 seconds and rejects 60 seconds plus 1ms", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    expect(run(left, right, { at: T60 }).outcome).toBe("MATCHED");
    expect(run(left, right, { at: T60P1 })).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["EVIDENCE_STALE"],
    });
  });

  it.each(["0", "-1"])("16 rejects known invalid multiplier %s", (value) => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const invalid = {
      ...right,
      metadata: {
        ...right.metadata,
        contractMultiplier: {
          state: "KNOWN",
          value: contractMultiplier("1"),
        } as const,
      },
      economics: {
        ...right.economics,
        baseUnitsPerNativeQuantity: {
          state: "KNOWN",
          value: ExactDecimal.parse(value) as ContractMultiplier,
        } as const,
      },
    };
    expect(run(left, invalid)).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["MULTIPLIER_INVALID"],
    });
  });

  it("17 rejects incompatible exact quantity units", () => {
    const left = instrument({ name: "OKX", unit: "CONTRACT" });
    const initial = instrument({ name: "BINANCE", unit: "LOT" });
    const right = {
      ...initial,
      economics: {
        ...initial.economics,
        canonicalBaseUnit: {
          state: "KNOWN",
          value: "asset:B:BASE_UNIT",
        } as const,
      },
    };
    expect(run(left, right)).toMatchObject({
      outcome: "NOT_MATCHED",
      reasons: ["CONTRACT_UNIT_MISMATCH"],
    });
  });

  it("18 keeps a generated candidate unapproved", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const assets = registry([left, right]);
    const [candidate] = generateCandidates([left, right], assets, T30, T30);
    expect(
      evaluateMatch({
        left,
        right,
        registry: assets,
        evaluationAt: T30,
        knowledgeCutoff: T30,
        candidate,
      }),
    ).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["MAPPING_UNAPPROVED"],
    });
  });

  it.each([
    ["QUARANTINED", "QUARANTINED", "MAPPING_QUARANTINED"],
    ["INVALIDATED", "UNAVAILABLE", "MAPPING_INVALIDATED"],
  ] as const)("19 handles %s mappings", (status, outcome, reason) => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    expect(
      run(left, right, { mapping: approvedMapping(left, right, status) }),
    ).toMatchObject({ outcome, reasons: [reason] });
  });

  it("20 reports unknown convention and unavailable capability without inference", () => {
    const left = instrument({ name: "OKX" });
    const unknown = instrument({ name: "BINANCE", convention: "UNKNOWN" });
    expect(run(left, unknown)).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["VALUE_CONVENTION_UNVERIFIED"],
    });
    const unavailable = instrument({
      name: "BINANCE_UNAVAILABLE",
      quality: "UNAVAILABLE",
    });
    expect(run(left, unavailable)).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["CAPABILITY_UNAVAILABLE"],
    });
  });

  it("21 rejects alias chains and cycles during registry construction", async () => {
    const makeAlias = (
      id: string,
      from: typeof A,
      to: typeof A,
    ): AssetAlias => ({
      aliasId: id,
      registryRevision: "r",
      aliasAssetId: from,
      targetAssetId: to,
      effectiveFrom: T0,
      effectiveTo: T30D,
      recordedKnowledgeAt: T0,
      reviewedBy: "reviewer",
    });
    const { admitRegistryRevision } = await import("./registry.js");
    expect(
      admitRegistryRevision({
        revision: "r",
        recordedAt: T0,
        assets: [],
        bindings: [],
        aliases: [makeAlias("a-b", A, B), makeAlias("b-a", B, A)],
      }),
    ).toEqual({ status: "QUARANTINED", reason: "ALIAS_CHAIN_FORBIDDEN" });
  });

  it("22 quarantines metadata/economics contradictions", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({
      name: "BINANCE",
      multiplier: "1",
      metadataMultiplier: "2",
    });
    expect(run(left, right)).toMatchObject({
      outcome: "QUARANTINED",
      reasons: ["METADATA_EVIDENCE_CONFLICT"],
    });
  });

  it("23 identifies interval overlap as a typed governance conflict", async () => {
    const { MappingLedger, admitMappingCommand, approveCommand } =
      await import("./commands.js");
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const first = approvedMapping(left, right);
    const command = approveCommand({
      commandId: "overlap",
      candidateId: "candidate-overlap",
      candidateDigest: "candidate-overlap-digest",
      expectedRevision: 0,
      proposedBy: "p",
      mappingId: "mapping-2",
      leftInstrumentId: first.leftInstrumentId,
      rightInstrumentId: first.rightInstrumentId,
      exposureKey: `${first.exposureKey}:different`,
      effectiveFrom: T0,
      effectiveTo: T30D,
      recordedKnowledgeAt: T0,
      registryRevision: "r",
      evidenceRevision: "e",
      reasonText: "reviewed",
      approvals: [
        { actorId: "q", role: "QUANT_REVIEWER", recordedAt: T0 },
        { actorId: "m", role: "MARKET_DATA_REVIEWER", recordedAt: T0 },
      ],
    });
    expect(
      admitMappingCommand(new MappingLedger([first]), command),
    ).toMatchObject({
      status: "QUARANTINED",
      reason: "MAPPING_INTERVAL_CONFLICT",
      ledger: { versions: [first] },
    });
  });

  it.each([
    "PRE_LAUNCH",
    "SUSPENDED",
    "SETTLING",
    "EXPIRED",
    "DELISTED",
  ] as const)("24 rejects inactive lifecycle %s", (lifecycle) => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: `BINANCE_${lifecycle}`, lifecycle });
    expect(run(left, right)).toMatchObject({
      outcome: "UNAVAILABLE",
      reasons: ["LIFECYCLE_NOT_ACTIVE"],
    });
  });

  it("25 treats effectiveTo as exclusive and rejects intervals over 30 days", () => {
    const left = instrument({ name: "OKX", observedAt: T1D });
    const right = instrument({ name: "BINANCE", observedAt: T1D });
    const expired = approvedMapping(left, right, "APPROVED", {
      effectiveTo: T1D,
    });
    expect(
      run(left, right, { at: T1D, cutoff: T1D, mapping: expired }),
    ).toMatchObject({ outcome: "UNAVAILABLE", reasons: ["MAPPING_EXPIRED"] });
    const validRegistry = registry([left]);
    expect(() =>
      new CuratedAssetRegistry({
        revision: "r",
        recordedAt: T0,
        assets: validRegistry.revision.assets,
        bindings: [
          {
            ...validRegistry.revision.bindings[0]!,
            effectiveTo: timestamp("2026-10-15T00:00:00.001Z"),
          },
        ],
        aliases: [],
      }).resolve(
        left.metadata.venue,
        left.metadata.productGroup,
        left.nativeBaseAssetReference,
        "BASE",
        T30,
        T30,
      ),
    ).toThrowError(expect.objectContaining({ code: "EVIDENCE_TIME_INVALID" }));
  });

  it("27 excludes OKX special product families", () => {
    const left = instrument({ name: "OKX_XPERP", family: "OKX_XPERP" });
    const right = instrument({ name: "BINANCE" });
    expect(run(left, right)).toMatchObject({
      outcome: "NOT_MATCHED",
      reasons: ["SPECIAL_PRODUCT_EXCLUDED"],
    });
  });

  it("28 keeps AS_KNOWN immutable while CORRECTED applies later invalidation", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const approved = approvedMapping(left, right);
    const invalidated = approvedMapping(left, right, "INVALIDATED", {
      version: 2,
      priorVersion: 1,
      recordedKnowledgeAt: T1D,
    });
    const assets = registry([left, right]);
    const common = {
      history: admittedHistory(
        mappingAdmission(left, right, assets, invalidated),
      ),
      mappingId: approved.mappingId,
      evaluationAt: T30,
      replayRevision: "replay-v1",
    } as const;
    expect(
      replayMapping({ ...common, mode: "AS_KNOWN", knowledgeCutoff: T30 }),
    ).toMatchObject({ outcome: "MATCHED", reason: "COMPATIBLE_APPROVED" });
    expect(
      replayMapping({ ...common, mode: "CORRECTED", knowledgeCutoff: T1D }),
    ).toMatchObject({ outcome: "UNAVAILABLE", reason: "MAPPING_INVALIDATED" });
  });

  it("29 produces byte-stable candidates for input permutations", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const assets = registry([left, right]);
    expect(generateCandidates([left, right], assets, T30, T30)).toEqual(
      generateCandidates([right, left], assets, T30, T30),
    );
  });
});

describe("current frozen venue economics remain fail-closed", () => {
  const okx = instrument({ name: "OKX" });
  const binance = instrument({
    name: "BINANCE",
    multiplier: "UNKNOWN",
    metadataMultiplier: "UNKNOWN",
    convention: "UNKNOWN",
  });
  const bybit = instrument({
    name: "BYBIT",
    multiplier: "UNKNOWN",
    metadataMultiplier: "UNKNOWN",
  });

  it.each([
    [
      "OKX/Binance",
      okx,
      binance,
      ["MULTIPLIER_UNKNOWN", "VALUE_CONVENTION_UNVERIFIED"],
    ],
    ["OKX/Bybit", okx, bybit, ["MULTIPLIER_UNKNOWN"]],
    [
      "Binance/Bybit",
      binance,
      bybit,
      ["MULTIPLIER_UNKNOWN", "VALUE_CONVENTION_UNVERIFIED"],
    ],
  ] as const)("reports %s as UNAVAILABLE", (_name, left, right, reasons) => {
    expect(run(left, right)).toMatchObject({ outcome: "UNAVAILABLE", reasons });
  });
});
