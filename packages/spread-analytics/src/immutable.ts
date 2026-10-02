import type {
  AssetAlias,
  AssetBinding,
  AssetRegistryRevision,
  CanonicalAssetRecord,
  InstrumentMatchCandidate,
  MappingVersion,
  ReviewApproval,
  ReviewRecord,
} from "./model.js";
import type { WorkBudget } from "./bounds.js";

// Copy/freeze accounting: an own-key enumeration of a caller object is the
// only native pass that runs before its size is known; its size is charged
// immediately after and before the spread copy and freeze (two more passes).
export function chargeCopy(value: object, work?: WorkBudget): void {
  if (work === undefined) return;
  work.units(3 * Reflect.ownKeys(value).length + 1);
}
const freezeApproval = (
  value: ReviewApproval,
  work?: WorkBudget,
): ReviewApproval => (chargeCopy(value, work), Object.freeze({ ...value }));

export function immutableMapping(
  value: MappingVersion,
  work?: WorkBudget,
): MappingVersion {
  chargeCopy(value, work);
  return Object.freeze({
    ...value,
    approvals: Object.freeze(
      value.approvals.map(
        (approval) => (work?.step(), freezeApproval(approval, work)),
      ),
    ),
  });
}

export function immutableReview(
  value: ReviewRecord,
  work?: WorkBudget,
): ReviewRecord {
  chargeCopy(value, work);
  return Object.freeze({
    ...value,
    approvals: Object.freeze(
      value.approvals.map(
        (approval) => (work?.step(), freezeApproval(approval, work)),
      ),
    ),
  });
}

export function immutableCandidate(
  value: InstrumentMatchCandidate,
  work?: WorkBudget,
): InstrumentMatchCandidate {
  chargeCopy(value, work);
  if (value.provisionalIdentity) chargeCopy(value.provisionalIdentity, work);
  work?.units(2 * value.reasons.length + 1);
  return Object.freeze({
    ...value,
    provisionalIdentity: value.provisionalIdentity
      ? Object.freeze({ ...value.provisionalIdentity })
      : undefined,
    reasons: Object.freeze([...value.reasons]),
  });
}

const freezeAsset = (
  value: CanonicalAssetRecord,
  work?: WorkBudget,
): CanonicalAssetRecord => (
  chargeCopy(value, work),
  Object.freeze({ ...value })
);
const freezeBinding = (
  value: AssetBinding,
  work?: WorkBudget,
): AssetBinding => (chargeCopy(value, work), Object.freeze({ ...value }));
const freezeAlias = (value: AssetAlias, work?: WorkBudget): AssetAlias => (
  chargeCopy(value, work),
  Object.freeze({ ...value })
);

export function immutableRegistryRevision(
  value: AssetRegistryRevision,
  work?: WorkBudget,
): AssetRegistryRevision {
  return Object.freeze({
    revision: value.revision,
    recordedAt: value.recordedAt,
    assets: Object.freeze(
      value.assets.map((item) => (work?.step(), freezeAsset(item, work))),
    ),
    bindings: Object.freeze(
      value.bindings.map((item) => (work?.step(), freezeBinding(item, work))),
    ),
    aliases: Object.freeze(
      value.aliases.map((item) => (work?.step(), freezeAlias(item, work))),
    ),
  });
}
