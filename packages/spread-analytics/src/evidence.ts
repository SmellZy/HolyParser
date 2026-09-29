import {
  WorkBudget,
  assertAtomicId,
  assertCount,
  assertEvidenceRecord,
  assertReasonText,
  type CancellationSignal,
} from "./bounds.js";
import type { EvidenceRecord } from "./model.js";
import { MATCHING_LIMITS, MATCHING_POLICY_VERSION } from "./policy.js";
import { epoch, isEffective } from "./registry.js";
import { MatchingFailure } from "./reasons.js";
import { compareUtf8WithBudget } from "./serialization.js";

const evidenceClasses = new Set<string>([
  "CURATED_ASSET_BINDING",
  "FROZEN_METADATA",
  "MANUAL_CORROBORATION",
  "OFFICIAL_CONTRACT_SPECIFICATION",
]);

export interface EvidenceSubjectReferences {
  readonly subjectId: string;
  readonly evidenceIds: readonly string[];
}

export function validateEvidenceBundle(
  records: readonly EvidenceRecord[],
  subjects: readonly EvidenceSubjectReferences[],
  signal?: CancellationSignal,
): readonly EvidenceRecord[] {
  const work = new WorkBudget(signal);
  assertCount(
    records.length,
    MATCHING_LIMITS.evidenceReferences,
    "Evidence record",
  );
  let references = 0;
  const ids = new Set<string>();
  for (const record of records) {
    work.step();
    assertEvidenceRecord(record, work);
    const allowed = new Set([
      "evidenceId",
      "evidenceClass",
      "sourceId",
      "sourceRevision",
      "sourceDigest",
      "productScope",
      "retrievalDate",
      "sourceTimestamp",
      "receiveTimestamp",
      "processingTimestamp",
      "recordedAt",
      "validFrom",
      "validTo",
      "reviewerId",
      "reviewedAt",
      "documentedUnit",
      "quality",
      "policyRevision",
      "description",
    ]);
    for (const key of Object.keys(record)) {
      work.step();
      if (!allowed.has(key))
        throw new MatchingFailure(
          "INPUT_INVALID",
          "Evidence record has an unknown field.",
        );
    }
    if (!evidenceClasses.has(record.evidenceClass))
      throw new MatchingFailure("INPUT_INVALID", "Evidence class is invalid.");
    assertAtomicId(record.evidenceId, "Evidence ID", work);
    assertAtomicId(record.sourceId, "Evidence source", work);
    assertAtomicId(record.sourceRevision, "Source revision", work);
    assertAtomicId(record.sourceDigest, "Source digest", work);
    assertAtomicId(record.productScope, "Evidence product scope", work);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(record.retrievalDate))
      throw new MatchingFailure(
        "INPUT_INVALID",
        "Evidence retrieval date is invalid.",
      );
    for (const timestamp of [
      record.sourceTimestamp,
      record.receiveTimestamp,
      record.processingTimestamp,
    ])
      if (timestamp !== undefined) epoch(timestamp);
    if (record.reviewerId !== undefined)
      assertAtomicId(record.reviewerId, "Evidence reviewer", work);
    if ((record.reviewerId === undefined) !== (record.reviewedAt === undefined))
      throw new MatchingFailure(
        "INPUT_INVALID",
        "Evidence review provenance is incomplete.",
      );
    if (record.reviewedAt !== undefined) epoch(record.reviewedAt);
    if (record.documentedUnit !== undefined)
      assertAtomicId(record.documentedUnit, "Evidence documented unit", work);
    if (
      ![
        "AUTHORITATIVE",
        "RESEARCH_REQUIRED",
        "STALE",
        "UNVERIFIED",
        "VERIFIED",
      ].includes(record.quality)
    )
      throw new MatchingFailure(
        "INPUT_INVALID",
        "Evidence quality is invalid.",
      );
    if (record.policyRevision !== MATCHING_POLICY_VERSION)
      throw new MatchingFailure(
        "INPUT_INVALID",
        "Evidence policy revision is invalid.",
      );
    if (ids.has(record.evidenceId))
      throw new MatchingFailure(
        "METADATA_EVIDENCE_CONFLICT",
        "Duplicate evidence ID.",
      );
    ids.add(record.evidenceId);
    epoch(record.recordedAt);
    isEffective(record.validFrom, record.validTo, record.validFrom);
    if (record.description !== undefined)
      assertReasonText(record.description, work);
  }
  for (const subject of subjects) {
    work.step();
    assertAtomicId(subject.subjectId, "Evidence subject", work);
    assertCount(
      subject.evidenceIds.length,
      MATCHING_LIMITS.evidencePerSubject,
      "Evidence per subject",
    );
    references += subject.evidenceIds.length;
    assertCount(
      references,
      MATCHING_LIMITS.evidenceReferences,
      "Evidence reference",
    );
    for (const evidenceId of subject.evidenceIds) {
      work.step();
      assertAtomicId(evidenceId, "Evidence reference", work);
      if (!ids.has(evidenceId))
        throw new MatchingFailure(
          "INPUT_INVALID",
          "Unknown evidence reference.",
        );
    }
  }
  const result = Object.freeze(
    records
      .map((record) => (work.step(), Object.freeze({ ...record })))
      .sort((a, b) => {
        return compareUtf8WithBudget(work)(a.evidenceId, b.evidenceId);
      }),
  );
  work.beforePublication();
  return result;
}
