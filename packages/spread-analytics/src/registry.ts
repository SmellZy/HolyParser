import type { CanonicalAssetId, Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertAtomicId,
  assertCount,
  type CancellationSignal,
} from "./bounds.js";
import { immutableRegistryRevision } from "./immutable.js";
import { MatchingFailure } from "./reasons.js";
import type {
  AssetAlias,
  AssetBinding,
  AssetRegistryRevision,
  BindingRole,
  CanonicalAssetRecord,
} from "./model.js";
import { MATCHING_LIMITS } from "./policy.js";
import { assertClosedKeys } from "./validation.js";

// Date.parse scans its (caller-supplied, possibly long) input once; charge
// that pass before it runs. Parsing semantics are unchanged.
export const chargeTimestamp = (value: unknown, work?: WorkBudget): void =>
  work?.units(typeof value === "string" ? value.length + 1 : 1);
export const epoch = (value: Timestamp, work?: WorkBudget): bigint => {
  chargeTimestamp(value, work);
  const result = Date.parse(value);
  if (!Number.isFinite(result))
    throw new MatchingFailure("EVIDENCE_TIME_INVALID", "Invalid timestamp.");
  return BigInt(result);
};
export function isEffective(
  from: Timestamp,
  to: Timestamp,
  at: Timestamp,
  work?: WorkBudget,
): boolean {
  const start = epoch(from, work),
    end = epoch(to, work),
    point = epoch(at, work);
  if (end <= start || end - start > MATCHING_LIMITS.maximumValidityMs)
    throw new MatchingFailure(
      "EVIDENCE_TIME_INVALID",
      "Invalid evidence interval.",
    );
  return point >= start && point < end;
}
export class CuratedAssetRegistry {
  readonly revision: AssetRegistryRevision;
  readonly #bindingsByKey: ReadonlyMap<string, readonly AssetBinding[]>;
  readonly #aliasesByAsset: ReadonlyMap<string, readonly AssetAlias[]>;
  readonly #assetsById: ReadonlyMap<string, readonly CanonicalAssetRecord[]>;
  constructor(revision: AssetRegistryRevision, work = new WorkBudget()) {
    assertClosedKeys(
      revision,
      ["revision", "recordedAt", "assets", "bindings", "aliases"],
      "Asset registry revision",
      work,
    );
    assertAtomicId(revision.revision, "Registry revision", work);
    epoch(revision.recordedAt, work);
    assertCount(
      revision.assets.length,
      MATCHING_LIMITS.bindings,
      "Canonical asset",
    );
    assertCount(revision.bindings.length, MATCHING_LIMITS.bindings, "Binding");
    assertCount(revision.aliases.length, MATCHING_LIMITS.bindings, "Alias");
    const sources = new Set<string>(),
      targets = new Set<string>();
    for (const alias of revision.aliases) {
      work.step();
      assertClosedKeys(
        alias,
        [
          "aliasId",
          "registryRevision",
          "aliasAssetId",
          "targetAssetId",
          "effectiveFrom",
          "effectiveTo",
          "recordedKnowledgeAt",
          "reviewedBy",
        ],
        "Asset alias",
        work,
      );
      assertAtomicId(alias.aliasId, "Alias", work);
      assertAtomicId(alias.registryRevision, "Alias registry revision", work);
      assertAtomicId(alias.aliasAssetId, "Alias asset", work);
      assertAtomicId(alias.targetAssetId, "Alias target asset", work);
      assertAtomicId(alias.reviewedBy, "Alias reviewer", work);
      epoch(alias.recordedKnowledgeAt, work);
      isEffective(
        alias.effectiveFrom,
        alias.effectiveTo,
        alias.effectiveFrom,
        work,
      );
      if (
        alias.aliasAssetId === alias.targetAssetId ||
        sources.has(alias.aliasAssetId)
      )
        throw new MatchingFailure("ALIAS_CHAIN_FORBIDDEN", "Invalid alias.");
      sources.add(alias.aliasAssetId);
      targets.add(alias.targetAssetId);
    }
    for (const source of sources) {
      work.step();
      if (targets.has(source))
        throw new MatchingFailure(
          "ALIAS_CHAIN_FORBIDDEN",
          "Alias chain forbidden.",
        );
    }
    for (const asset of revision.assets) {
      work.step();
      assertClosedKeys(
        asset,
        [
          "assetId",
          "canonicalSymbol",
          "displayName",
          "registryRevision",
          "effectiveFrom",
          "effectiveTo",
          "recordedKnowledgeAt",
          "evidenceRevision",
          "reviewedBy",
        ],
        "Canonical asset",
        work,
      );
      assertAtomicId(asset.assetId, "Canonical asset", work);
      assertAtomicId(asset.canonicalSymbol, "Canonical symbol", work);
      assertAtomicId(asset.displayName, "Asset display name", work);
      assertAtomicId(asset.registryRevision, "Asset registry revision", work);
      assertAtomicId(asset.evidenceRevision, "Asset evidence revision", work);
      assertAtomicId(asset.reviewedBy, "Asset reviewer", work);
      epoch(asset.recordedKnowledgeAt, work);
      isEffective(
        asset.effectiveFrom,
        asset.effectiveTo,
        asset.effectiveFrom,
        work,
      );
    }
    for (const binding of revision.bindings) {
      work.step();
      assertClosedKeys(
        binding,
        [
          "bindingId",
          "registryRevision",
          "venue",
          "productGroup",
          "nativeAssetReference",
          "role",
          "canonicalAssetId",
          "effectiveFrom",
          "effectiveTo",
          "recordedKnowledgeAt",
          "evidenceRevision",
          "reviewedBy",
        ],
        "Asset binding",
        work,
      );
      for (const [value, label] of [
        [binding.bindingId, "Binding ID"],
        [binding.registryRevision, "Binding registry revision"],
        [binding.venue, "Binding venue"],
        [binding.productGroup, "Binding product group"],
        [binding.nativeAssetReference, "Native asset reference"],
        [binding.canonicalAssetId, "Binding canonical asset"],
        [binding.evidenceRevision, "Binding evidence revision"],
        [binding.reviewedBy, "Binding reviewer"],
      ] as const)
        assertAtomicId(value, label, work);
      if (!(["BASE", "QUOTE", "SETTLEMENT"] as const).includes(binding.role))
        throw new MatchingFailure("INPUT_INVALID", "Binding role is invalid.");
      epoch(binding.recordedKnowledgeAt, work);
      isEffective(
        binding.effectiveFrom,
        binding.effectiveTo,
        binding.effectiveFrom,
        work,
      );
    }
    this.revision = immutableRegistryRevision(revision, work);
    const bindingIndex = new Map<string, AssetBinding[]>();
    for (const binding of this.revision.bindings) {
      work.step();
      work.step(
        Math.max(
          1,
          Math.ceil(
            (binding.venue.length +
              binding.productGroup.length +
              binding.nativeAssetReference.length +
              binding.role.length) /
              128,
          ),
        ),
      );
      const key = [
        binding.venue,
        binding.productGroup,
        binding.nativeAssetReference,
        binding.role,
      ].join("\u0000");
      const values = bindingIndex.get(key) ?? [];
      values.push(binding);
      bindingIndex.set(key, values);
    }
    this.#bindingsByKey = new Map(
      [...bindingIndex].map(([key, values]) => {
        work.step();
        return [key, Object.freeze(values)] as const;
      }),
    );
    const aliasIndex = new Map<string, AssetAlias[]>();
    for (const alias of this.revision.aliases) {
      work.step();
      const values = aliasIndex.get(alias.aliasAssetId) ?? [];
      values.push(alias);
      aliasIndex.set(alias.aliasAssetId, values);
    }
    this.#aliasesByAsset = new Map(
      [...aliasIndex].map(([key, values]) => {
        work.step();
        return [key, Object.freeze(values)] as const;
      }),
    );
    const assetIndex = new Map<string, CanonicalAssetRecord[]>();
    for (const asset of this.revision.assets) {
      work.step();
      const values = assetIndex.get(asset.assetId) ?? [];
      values.push(asset);
      assetIndex.set(asset.assetId, values);
    }
    this.#assetsById = new Map(
      [...assetIndex].map(([key, values]) => {
        work.step();
        return [key, Object.freeze(values)] as const;
      }),
    );
    work.beforePublication();
  }
  resolve(
    venue: string,
    group: string,
    nativeRef: string,
    role: BindingRole,
    at: Timestamp,
    cutoff: Timestamp,
    work?: WorkBudget,
  ):
    | {
        readonly state: "KNOWN";
        readonly assetId: CanonicalAssetId;
        readonly confidence: "EXACT_METADATA" | "REVIEWED_MANUAL";
      }
    | { readonly state: "UNKNOWN" | "CONFLICT" } {
    assertAtomicId(nativeRef, "Native asset reference", work);
    work?.step(
      Math.max(
        1,
        Math.ceil(
          (venue.length + group.length + nativeRef.length + role.length) / 128,
        ),
      ),
    );
    const bindingKey = [venue, group, nativeRef, role].join("\u0000");
    const found = (this.#bindingsByKey.get(bindingKey) ?? []).filter(
      (binding) => {
        work?.step();
        return (
          binding.venue === venue &&
          binding.productGroup === group &&
          binding.nativeAssetReference === nativeRef &&
          binding.role === role &&
          epoch(binding.recordedKnowledgeAt, work) <= epoch(cutoff, work) &&
          isEffective(binding.effectiveFrom, binding.effectiveTo, at, work)
        );
      },
    );
    const ids = new Set(
      found.map((item) => (work?.step(), item.canonicalAssetId)),
    );
    if (ids.size > 1) return { state: "CONFLICT" };
    let asset = found[0]?.canonicalAssetId;
    if (asset === undefined) return { state: "UNKNOWN" };
    const aliases = (this.#aliasesByAsset.get(asset) ?? []).filter((alias) => {
      work?.step();
      return (
        alias.aliasAssetId === asset &&
        epoch(alias.recordedKnowledgeAt, work) <= epoch(cutoff, work) &&
        isEffective(alias.effectiveFrom, alias.effectiveTo, at, work)
      );
    });
    if (aliases.length > 1) return { state: "CONFLICT" };
    const reviewedAlias = aliases[0];
    asset = reviewedAlias?.targetAssetId ?? asset;
    const definitions = (this.#assetsById.get(asset) ?? []).filter(
      (definition) => {
        work?.step();
        return (
          definition.assetId === asset &&
          epoch(definition.recordedKnowledgeAt, work) <= epoch(cutoff, work) &&
          isEffective(
            definition.effectiveFrom,
            definition.effectiveTo,
            at,
            work,
          )
        );
      },
    );
    if (definitions.length > 1) return { state: "CONFLICT" };
    if (definitions.length === 0) return { state: "UNKNOWN" };
    return {
      state: "KNOWN",
      assetId: asset,
      confidence: reviewedAlias ? "REVIEWED_MANUAL" : "EXACT_METADATA",
    };
  }

  describe(
    assetId: CanonicalAssetId,
    at: Timestamp,
    cutoff: Timestamp,
    operationBudget?: WorkBudget,
  ) {
    const work = operationBudget ?? new WorkBudget();
    assertAtomicId(assetId, "Canonical asset", work);
    const records = (this.#assetsById.get(assetId) ?? []).filter((record) => {
      work.step();
      return (
        record.assetId === assetId &&
        epoch(record.recordedKnowledgeAt, work) <= epoch(cutoff, work) &&
        isEffective(record.effectiveFrom, record.effectiveTo, at, work)
      );
    });
    const result = records.length === 1 ? records[0] : undefined;
    if (operationBudget === undefined) work.beforePublication();
    return result;
  }
}

export type RegistryAdmission =
  | { readonly status: "READY"; readonly registry: CuratedAssetRegistry }
  | {
      readonly status: "QUARANTINED";
      readonly reason: "ALIAS_CHAIN_FORBIDDEN";
    };

export function admitRegistryRevision(
  revision: AssetRegistryRevision,
  signal?: CancellationSignal,
): RegistryAdmission {
  try {
    return {
      status: "READY",
      registry: new CuratedAssetRegistry(revision, new WorkBudget(signal)),
    };
  } catch (error) {
    if (
      error instanceof MatchingFailure &&
      error.code === "ALIAS_CHAIN_FORBIDDEN"
    )
      return { status: "QUARANTINED", reason: error.code };
    throw error;
  }
}
