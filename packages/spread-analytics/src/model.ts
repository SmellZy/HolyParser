import type {
  CanonicalAssetId,
  ExactDecimal,
  InstrumentMetadataObservation,
  Timestamp,
} from "@arbitrage/market-data";
import type { MatchReasonCode } from "./reasons.js";
import type { CanonicalExposureIdentity } from "./serialization.js";
import type { MATCHING_POLICY_VERSION } from "./policy.js";

export type BindingRole = "BASE" | "QUOTE" | "SETTLEMENT";
export interface AssetBinding {
  readonly bindingId: string;
  readonly registryRevision: string;
  readonly venue: string;
  readonly productGroup: string;
  readonly nativeAssetReference: string;
  readonly role: BindingRole;
  readonly canonicalAssetId: CanonicalAssetId;
  readonly effectiveFrom: Timestamp;
  readonly effectiveTo: Timestamp;
  readonly recordedKnowledgeAt: Timestamp;
  readonly evidenceRevision: string;
  readonly reviewedBy: string;
}
export interface AssetAlias {
  readonly aliasId: string;
  readonly registryRevision: string;
  readonly aliasAssetId: CanonicalAssetId;
  readonly targetAssetId: CanonicalAssetId;
  readonly effectiveFrom: Timestamp;
  readonly effectiveTo: Timestamp;
  readonly recordedKnowledgeAt: Timestamp;
  readonly reviewedBy: string;
}
export interface CanonicalAssetRecord {
  readonly assetId: CanonicalAssetId;
  readonly canonicalSymbol: string;
  readonly displayName: string;
  readonly registryRevision: string;
  readonly effectiveFrom: Timestamp;
  readonly effectiveTo: Timestamp;
  readonly recordedKnowledgeAt: Timestamp;
  readonly evidenceRevision: string;
  readonly reviewedBy: string;
}
export interface AssetRegistryRevision {
  readonly revision: string;
  readonly recordedAt: Timestamp;
  readonly assets: readonly CanonicalAssetRecord[];
  readonly bindings: readonly AssetBinding[];
  readonly aliases: readonly AssetAlias[];
}
export interface EvidenceRecord {
  readonly evidenceId: string;
  readonly evidenceClass:
    | "CURATED_ASSET_BINDING"
    | "FROZEN_METADATA"
    | "MANUAL_CORROBORATION"
    | "OFFICIAL_CONTRACT_SPECIFICATION";
  readonly sourceId: string;
  readonly sourceRevision: string;
  readonly sourceDigest: string;
  readonly productScope: string;
  readonly retrievalDate: string;
  readonly sourceTimestamp?: Timestamp;
  readonly receiveTimestamp?: Timestamp;
  readonly processingTimestamp?: Timestamp;
  readonly recordedAt: Timestamp;
  readonly validFrom: Timestamp;
  readonly validTo: Timestamp;
  readonly reviewerId?: string;
  readonly reviewedAt?: Timestamp;
  readonly documentedUnit?: string;
  readonly quality:
    "AUTHORITATIVE" | "RESEARCH_REQUIRED" | "STALE" | "UNVERIFIED" | "VERIFIED";
  readonly policyRevision: typeof MATCHING_POLICY_VERSION;
  readonly description?: string;
}
export type KnownValue<T> =
  | { readonly state: "KNOWN"; readonly value: T }
  | {
      readonly state: "UNKNOWN" | "UNVERIFIED";
      readonly reasonCode: MatchReasonCode;
    };
export interface NativeEconomicsEvidence {
  readonly evidenceRevision: string;
  readonly nativeFamily: string;
  readonly nativeQuantityUnit: KnownValue<string>;
  readonly canonicalBaseUnit: KnownValue<string>;
  readonly baseUnitsPerNativeQuantity: KnownValue<ExactDecimal>;
  readonly payoff: KnownValue<"LINEAR" | "INVERSE" | "QUANTO">;
  readonly collateralVerified: boolean;
}
export interface VenueInstrumentEvidence {
  readonly metadata: InstrumentMetadataObservation;
  readonly metadataRevision: string;
  readonly metadataDigest: string;
  readonly nativeBaseAssetReference: string;
  readonly nativeQuoteAssetReference: string;
  readonly nativeSettlementAssetReference: string;
  readonly economics: NativeEconomicsEvidence;
}
export type MappingStatus =
  | "CANDIDATE"
  | "APPROVED"
  | "REJECTED"
  | "CONFLICT"
  | "QUARANTINED"
  | "SUPERSEDED"
  | "INVALIDATED";
export type Completeness =
  | "COMPLETE_APPROVED"
  | "INCOMPLETE"
  | "CONFLICTING"
  | "RESEARCH_REQUIRED"
  | "UNSUPPORTED"
  | "STALE_EVIDENCE";
export interface ReviewApproval {
  readonly actorId: string;
  readonly role: "MARKET_DATA_REVIEWER" | "PRODUCT_REVIEWER" | "QUANT_REVIEWER";
  readonly approvedDigest: string;
  readonly recordedAt: Timestamp;
}
export interface ReviewRecord {
  readonly reviewId: string;
  readonly candidateId: string;
  readonly proposerId: string;
  readonly commandDigest: string;
  readonly expectedRevision: number;
  readonly approvals: readonly ReviewApproval[];
  readonly recordedAt: Timestamp;
}
export interface MappingVersion {
  readonly mappingId: string;
  readonly version: number;
  readonly status: MappingStatus;
  readonly leftInstrumentId: string;
  readonly rightInstrumentId: string;
  readonly exposureKey: string;
  readonly effectiveFrom: Timestamp;
  readonly effectiveTo: Timestamp;
  readonly recordedKnowledgeAt: Timestamp;
  readonly registryRevision: string;
  readonly evidenceRevision: string;
  readonly policyRevision: typeof MATCHING_POLICY_VERSION;
  readonly reasonCode: MatchReasonCode;
  readonly priorVersion?: number;
  readonly supersededBy?: number;
  readonly invalidationReference?: string;
  readonly approvals: readonly ReviewApproval[];
}
export type MappingTransitionType = "SUPERSEDE" | "INVALIDATE" | "CORRECT";
export interface MappingTransitionRecord {
  readonly transitionId: string;
  readonly mappingId: string;
  readonly affectedVersion: number;
  readonly transitionType: MappingTransitionType;
  readonly effectiveAt: Timestamp;
  readonly reasonCode: MatchReasonCode;
  readonly reasonText?: string;
  readonly reference?: string;
  readonly successorVersion?: number;
  readonly policyRevision: typeof MATCHING_POLICY_VERSION;
  readonly expectedRevision: number;
  readonly expectedState: "APPROVED";
  readonly proposerId: string;
  readonly registryRevision: string;
  readonly evidenceRevision: string;
  readonly provenanceDigest: string;
  readonly recordedKnowledgeAt: Timestamp;
  readonly approvals: readonly ReviewApproval[];
  readonly commandDigest: string;
}
export interface InstrumentMatchCandidate {
  readonly candidateId: string;
  readonly leftInstrumentId: string;
  readonly rightInstrumentId: string;
  readonly leftMetadataRevision: string;
  readonly rightMetadataRevision: string;
  readonly leftMetadataDigest: string;
  readonly rightMetadataDigest: string;
  readonly leftEconomicsRevision: string;
  readonly rightEconomicsRevision: string;
  readonly registryRevision: string;
  readonly provisionalIdentity?: ProvisionalExposureIdentity;
  readonly exposureKey?: string;
  readonly evidenceSetDigest: string;
  readonly proposerId: "DETERMINISTIC_EVALUATOR";
  readonly createdAt: Timestamp;
  readonly effectiveAt: Timestamp;
  readonly evaluationAt: Timestamp;
  readonly knowledgeCutoff: Timestamp;
  readonly policyRevision: typeof MATCHING_POLICY_VERSION;
  readonly completeness: Completeness;
  readonly confidence: "EXACT_METADATA" | "REVIEWED_MANUAL";
  readonly reasons: readonly MatchReasonCode[];
}
export interface ProvisionalExposureIdentity {
  readonly productClass?: "DERIVATIVE";
  readonly baseAssetId: CanonicalAssetId;
  readonly quoteAssetId: CanonicalAssetId;
  readonly settlementAssetId: CanonicalAssetId;
  readonly contractType?: "PERPETUAL";
  readonly valueConvention?: "LINEAR";
  readonly exposureUnit?: "BASE_UNIT";
}
export type MatchOutcome =
  "MATCHED" | "NOT_MATCHED" | "AMBIGUOUS" | "QUARANTINED" | "UNAVAILABLE";
export interface CurrentEligibility {
  readonly outcome: MatchOutcome;
  readonly reasons: readonly MatchReasonCode[];
  readonly evaluatedAt: Timestamp;
  readonly mappingVersion?: number;
}
export interface ConflictRecord {
  readonly conflictId: string;
  readonly code: MatchReasonCode;
  readonly subjectIds: readonly string[];
  readonly recordedAt: Timestamp;
  readonly policyRevision: typeof MATCHING_POLICY_VERSION;
}
export interface MatchEvaluation {
  readonly resultId: string;
  readonly outcome: MatchOutcome;
  readonly reasons: readonly MatchReasonCode[];
  readonly candidate?: InstrumentMatchCandidate;
  readonly mappingVersion?: MappingVersion;
  readonly registryRevision: string;
  readonly evidenceRevisions: readonly [string, string];
  readonly policyRevision: typeof MATCHING_POLICY_VERSION;
  readonly evaluationAt: Timestamp;
  readonly knowledgeCutoff: Timestamp;
}
export type ReplayMode = "AS_KNOWN" | "CORRECTED";
export interface ReplayResult {
  readonly mode: ReplayMode;
  readonly replayRevision: string;
  readonly mapping?: MappingVersion;
  readonly outcome: MatchOutcome;
  readonly reason: MatchReasonCode;
  readonly policyRevision: typeof MATCHING_POLICY_VERSION;
  readonly registryRevision?: string;
  readonly evidenceRevision?: string;
  readonly evaluationAt: Timestamp;
  readonly knowledgeCutoff: Timestamp;
}
export interface ResolvedInstrument {
  readonly instrument: VenueInstrumentEvidence;
  readonly provisionalIdentity?: ProvisionalExposureIdentity;
  readonly identity?: CanonicalExposureIdentity;
  readonly confidence?: "EXACT_METADATA" | "REVIEWED_MANUAL";
  readonly reasons: readonly MatchReasonCode[];
}
