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

const freezeApproval = (value: ReviewApproval): ReviewApproval =>
  Object.freeze({ ...value });

export function immutableMapping(
  value: MappingVersion,
  work?: WorkBudget,
): MappingVersion {
  return Object.freeze({
    ...value,
    approvals: Object.freeze(
      value.approvals.map(
        (approval) => (work?.step(), freezeApproval(approval)),
      ),
    ),
  });
}

export function immutableReview(
  value: ReviewRecord,
  work?: WorkBudget,
): ReviewRecord {
  return Object.freeze({
    ...value,
    approvals: Object.freeze(
      value.approvals.map(
        (approval) => (work?.step(), freezeApproval(approval)),
      ),
    ),
  });
}

export function immutableCandidate(
  value: InstrumentMatchCandidate,
  work?: WorkBudget,
): InstrumentMatchCandidate {
  // Closed-schema upper bounds are charged before native object spreads.
  work?.step(32);
  if (value.provisionalIdentity) work?.step(7);
  return Object.freeze({
    ...value,
    provisionalIdentity: value.provisionalIdentity
      ? Object.freeze({ ...value.provisionalIdentity })
      : undefined,
    reasons:
      (work?.step(value.reasons.length), Object.freeze([...value.reasons])),
  });
}

const freezeAsset = (value: CanonicalAssetRecord): CanonicalAssetRecord =>
  Object.freeze({ ...value });
const freezeBinding = (value: AssetBinding): AssetBinding =>
  Object.freeze({ ...value });
const freezeAlias = (value: AssetAlias): AssetAlias =>
  Object.freeze({ ...value });

export function immutableRegistryRevision(
  value: AssetRegistryRevision,
  work?: WorkBudget,
): AssetRegistryRevision {
  return Object.freeze({
    revision: value.revision,
    recordedAt: value.recordedAt,
    assets: Object.freeze(
      value.assets.map((item) => (work?.step(), freezeAsset(item))),
    ),
    bindings: Object.freeze(
      value.bindings.map((item) => (work?.step(), freezeBinding(item))),
    ),
    aliases: Object.freeze(
      value.aliases.map((item) => (work?.step(), freezeAlias(item))),
    ),
  });
}
