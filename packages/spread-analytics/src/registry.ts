import type { CanonicalAssetId, Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertAtomicId,
  assertCount,
  chargeKey,
  sameText,
  type CancellationSignal,
} from "./bounds.js";
import { frozenRecord, immutableRegistryRevision } from "./immutable.js";
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
import { epoch } from "./time.js";
import { inputBoundary, snapshotInput } from "./snapshot.js";

// Strict canonical RFC 3339 UTC timestamps (see time.ts); no Date.parse.
export { epoch } from "./time.js";
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
// Internal construction hand-off: a public caller cannot supply a budget. The
// value is read and cleared at the start of the constructor.
let pendingRegistryBudget: WorkBudget | undefined;
export function registryWithBudget(
  revision: AssetRegistryRevision,
  work: WorkBudget,
): CuratedAssetRegistry {
  pendingRegistryBudget = work;
  try {
    return new CuratedAssetRegistry(revision);
  } finally {
    pendingRegistryBudget = undefined;
  }
}
type Resolution =
  | {
      readonly state: "KNOWN";
      readonly assetId: CanonicalAssetId;
      readonly confidence: "EXACT_METADATA" | "REVIEWED_MANUAL";
    }
  | { readonly state: "UNKNOWN" | "CONFLICT" };
// Budgeted internal operations, bound in the class static block below.
export let resolveWithBudget: (
  registry: CuratedAssetRegistry,
  venue: string,
  group: string,
  nativeRef: string,
  role: BindingRole,
  at: Timestamp,
  cutoff: Timestamp,
  work: WorkBudget,
) => Resolution;
/** Brand check (L-03): only a genuine registry instance is trusted. */
export let isCuratedAssetRegistry: (
  value: unknown,
) => value is CuratedAssetRegistry;
// Trusted revision read (seventh-acceptance N-02), bound below. It reads only
// the private revision captured at construction; the public `revision` field
// is never consulted by any operation.
let privateRevisionId: (registry: CuratedAssetRegistry) => string;
/**
 * The operation-local registry revision snapshot: authenticates the handle,
 * reads its private revision exactly once, re-validates and bounds it (an
 * atomic identifier, charged to the operation budget), and returns the
 * immutable string that the rest of the operation uses for comparison,
 * hashing and publication.
 */
export function trustedRegistryRevision(
  registry: unknown,
  work: WorkBudget,
): string {
  if (!isCuratedAssetRegistry(registry))
    throw new MatchingFailure("INPUT_INVALID", "Registry is not authentic.");
  const revision = privateRevisionId(registry);
  assertAtomicId(revision, "Registry revision", work);
  return revision;
}
export class CuratedAssetRegistry {
  static {
    isCuratedAssetRegistry = (value: unknown): value is CuratedAssetRegistry =>
      typeof value === "object" && value !== null && #bindingsByKey in value;
    privateRevisionId = (registry) => registry.#revisionId;
    resolveWithBudget = (
      registry,
      venue,
      group,
      nativeRef,
      role,
      at,
      cutoff,
      work,
    ) => registry.#resolve(venue, group, nativeRef, role, at, cutoff, work);
  }
  // N-02: the public view is a non-writable, non-configurable own data
  // property defined once in the constructor (no TypeScript-only readonly).
  // Authority lives in the private fields below.
  declare readonly revision: AssetRegistryRevision;
  readonly #revisionId: string;
  readonly #bindingsByKey: ReadonlyMap<string, readonly AssetBinding[]>;
  readonly #aliasesByAsset: ReadonlyMap<string, readonly AssetAlias[]>;
  readonly #assetsById: ReadonlyMap<string, readonly CanonicalAssetRecord[]>;
  constructor(revision: AssetRegistryRevision) {
    const parent = pendingRegistryBudget;
    pendingRegistryBudget = undefined;
    const work = parent ?? new WorkBudget();
    // N-01: one passive frozen snapshot of the caller revision; malformed
    // shapes surface as typed INPUT_INVALID (L-04).
    const state = inputBoundary(() =>
      CuratedAssetRegistry.#build(snapshotInput(revision, work), work),
    );
    this.#revisionId = state.revision.revision;
    this.#bindingsByKey = state.bindingsByKey;
    this.#aliasesByAsset = state.aliasesByAsset;
    this.#assetsById = state.assetsById;
    // work: fixed-shape definition and freeze of the instance (O(1)).
    Object.defineProperty(this, "revision", {
      value: state.revision,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    // A direct instance is frozen outright. A subclass instance cannot be
    // frozen here (its own fields are defined after this constructor), but
    // its `revision` is already non-redefinable and no operation reads it.
    if (new.target === CuratedAssetRegistry) Object.freeze(this);
    if (parent === undefined) work.beforePublication();
  }
  static #build(revision: AssetRegistryRevision, work: WorkBudget) {
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
        sameText(alias.aliasAssetId, alias.targetAssetId, work) ||
        sources.has(chargeKey(alias.aliasAssetId, work))
      )
        throw new MatchingFailure("ALIAS_CHAIN_FORBIDDEN", "Invalid alias.");
      sources.add(chargeKey(alias.aliasAssetId, work));
      targets.add(chargeKey(alias.targetAssetId, work));
    }
    for (const source of sources) {
      work.step();
      if (targets.has(chargeKey(source, work)))
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
    const frozenRevision = immutableRegistryRevision(revision, work);
    const bindingIndex = new Map<string, AssetBinding[]>();
    for (const binding of frozenRevision.bindings) {
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
      const values = bindingIndex.get(chargeKey(key, work)) ?? [];
      values.push(binding);
      bindingIndex.set(chargeKey(key, work), values);
    }
    const bindingsByKey = new Map(
      [...bindingIndex].map(([key, values]) => {
        work.step();
        chargeKey(key, work);
        return [key, Object.freeze(values)] as const;
      }),
    );
    const aliasIndex = new Map<string, AssetAlias[]>();
    for (const alias of frozenRevision.aliases) {
      work.step();
      const values = aliasIndex.get(chargeKey(alias.aliasAssetId, work)) ?? [];
      values.push(alias);
      aliasIndex.set(chargeKey(alias.aliasAssetId, work), values);
    }
    const aliasesByAsset = new Map(
      [...aliasIndex].map(([key, values]) => {
        work.step();
        chargeKey(key, work);
        return [key, Object.freeze(values)] as const;
      }),
    );
    const assetIndex = new Map<string, CanonicalAssetRecord[]>();
    for (const asset of frozenRevision.assets) {
      work.step();
      const values = assetIndex.get(chargeKey(asset.assetId, work)) ?? [];
      values.push(asset);
      assetIndex.set(chargeKey(asset.assetId, work), values);
    }
    const assetsById = new Map(
      [...assetIndex].map(([key, values]) => {
        work.step();
        chargeKey(key, work);
        return [key, Object.freeze(values)] as const;
      }),
    );
    return {
      revision: frozenRevision,
      bindingsByKey,
      aliasesByAsset,
      assetsById,
    };
  }
  /** Public lookup: its own operation budget and final check. */
  resolve(
    venue: string,
    group: string,
    nativeRef: string,
    role: BindingRole,
    at: Timestamp,
    cutoff: Timestamp,
  ): Resolution {
    const work = new WorkBudget();
    const result = this.#resolve(
      venue,
      group,
      nativeRef,
      role,
      at,
      cutoff,
      work,
    );
    work.beforePublication();
    return result;
  }
  #resolve(
    venue: string,
    group: string,
    nativeRef: string,
    role: BindingRole,
    at: Timestamp,
    cutoff: Timestamp,
    work: WorkBudget,
  ): Resolution {
    if (role !== "BASE" && role !== "QUOTE" && role !== "SETTLEMENT")
      throw new MatchingFailure("INPUT_INVALID", "Binding role is invalid.");
    assertAtomicId(venue, "Venue", work);
    assertAtomicId(group, "Product group", work);
    assertAtomicId(nativeRef, "Native asset reference", work);
    work.step(
      Math.max(
        1,
        Math.ceil(
          (venue.length + group.length + nativeRef.length + role.length) / 128,
        ),
      ),
    );
    const bindingKey = [venue, group, nativeRef, role].join("\u0000");
    const found = (
      this.#bindingsByKey.get(chargeKey(bindingKey, work)) ?? []
    ).filter((binding) => {
      work.step();
      return (
        sameText(binding.venue, venue, work) &&
        sameText(binding.productGroup, group, work) &&
        sameText(binding.nativeAssetReference, nativeRef, work) &&
        binding.role === role &&
        epoch(binding.recordedKnowledgeAt, work) <= epoch(cutoff, work) &&
        isEffective(binding.effectiveFrom, binding.effectiveTo, at, work)
      );
    });
    const ids = new Set(
      found.map(
        (item) => (work.step(), chargeKey(item.canonicalAssetId, work)),
      ),
    );
    if (ids.size > 1) return frozenRecord({ state: "CONFLICT" as const });
    let asset = found[0]?.canonicalAssetId;
    if (asset === undefined) return frozenRecord({ state: "UNKNOWN" as const });
    const aliases = (
      this.#aliasesByAsset.get(chargeKey(asset, work)) ?? []
    ).filter((alias) => {
      work.step();
      return (
        sameText(alias.aliasAssetId, asset, work) &&
        epoch(alias.recordedKnowledgeAt, work) <= epoch(cutoff, work) &&
        isEffective(alias.effectiveFrom, alias.effectiveTo, at, work)
      );
    });
    if (aliases.length > 1) return frozenRecord({ state: "CONFLICT" as const });
    const reviewedAlias = aliases[0];
    asset = reviewedAlias?.targetAssetId ?? asset;
    const resolved = asset;
    const definitions = (
      this.#assetsById.get(chargeKey(resolved, work)) ?? []
    ).filter((definition) => {
      work.step();
      return (
        sameText(definition.assetId, resolved, work) &&
        epoch(definition.recordedKnowledgeAt, work) <= epoch(cutoff, work) &&
        isEffective(definition.effectiveFrom, definition.effectiveTo, at, work)
      );
    });
    if (definitions.length > 1)
      return frozenRecord({ state: "CONFLICT" as const });
    if (definitions.length === 0)
      return frozenRecord({ state: "UNKNOWN" as const });
    return frozenRecord({
      state: "KNOWN" as const,
      assetId: asset,
      confidence: reviewedAlias
        ? ("REVIEWED_MANUAL" as const)
        : ("EXACT_METADATA" as const),
    });
  }

  describe(assetId: CanonicalAssetId, at: Timestamp, cutoff: Timestamp) {
    const work = new WorkBudget();
    assertAtomicId(assetId, "Canonical asset", work);
    const records = (
      this.#assetsById.get(chargeKey(assetId, work)) ?? []
    ).filter((record) => {
      work.step();
      return (
        sameText(record.assetId, assetId, work) &&
        epoch(record.recordedKnowledgeAt, work) <= epoch(cutoff, work) &&
        isEffective(record.effectiveFrom, record.effectiveTo, at, work)
      );
    });
    const result = records.length === 1 ? records[0] : undefined;
    work.beforePublication();
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
  const work = new WorkBudget(signal);
  let result: RegistryAdmission;
  try {
    result = frozenRecord({
      status: "READY" as const,
      registry: registryWithBudget(revision, work),
    });
  } catch (error) {
    if (
      !(error instanceof MatchingFailure) ||
      error.code !== "ALIAS_CHAIN_FORBIDDEN"
    )
      throw error;
    result = frozenRecord({
      status: "QUARANTINED" as const,
      reason: error.code,
    });
  }
  // Every typed outcome, READY or QUARANTINED, passes the final check; no
  // work follows it.
  work.beforePublication();
  return result;
}

// N-02: the class surface is immutable too; replacing a prototype method or
// static member of the trusted class is refused.
Object.freeze(CuratedAssetRegistry.prototype);
Object.freeze(CuratedAssetRegistry);
