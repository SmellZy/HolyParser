import type { Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertAtomicId,
  assertCount,
  sameText,
  type CancellationSignal,
} from "./bounds.js";
import {
  isAdmittedMappingHistory,
  materializedHistoryRecords,
  materializedHistoryTransitions,
  type AdmittedMappingHistory,
} from "./admission.js";
import type { MappingVersion, ReplayMode, ReplayResult } from "./model.js";
import { MATCHING_LIMITS, MATCHING_POLICY_VERSION } from "./policy.js";
import { isEffective } from "./registry.js";
import { epoch } from "./time.js";
import { MatchingFailure } from "./reasons.js";
import { compareUtf8WithBudget, deterministicId } from "./serialization.js";

export function replayMapping(input: {
  readonly mode: ReplayMode;
  readonly history: AdmittedMappingHistory;
  readonly mappingId: string;
  readonly evaluationAt: Timestamp;
  readonly knowledgeCutoff: Timestamp;
  readonly replayRevision: string;
  readonly signal?: CancellationSignal;
}): ReplayResult {
  const work = new WorkBudget(input.signal);
  work.step();
  if (!isAdmittedMappingHistory(input.history))
    throw new MatchingFailure(
      "INPUT_INVALID",
      "Replay requires admitted history.",
    );
  assertAtomicId(input.mappingId, "Mapping ID", work);
  assertAtomicId(input.replayRevision, "Replay revision", work);
  if (!sameText(input.mappingId, input.history.mappingId, work))
    throw new MatchingFailure(
      "MAPPING_REVISION_CONFLICT",
      "Replay mapping ID mismatch.",
    );
  const records = materializedHistoryRecords(input.history);
  const transitions = materializedHistoryTransitions(input.history);
  assertCount(
    records.length,
    MATCHING_LIMITS.mappingVersionsPerMapping,
    "Mapping history",
  );
  // Strict canonical UTC timestamps (time.ts): the caller's evaluation and
  // knowledge times are validated up front; invalid times reject the replay.
  epoch(input.evaluationAt, work);
  epoch(input.knowledgeCutoff, work);
  const parse = (value: string): bigint => epoch(value, work);
  const versions = records.map((record) => (work.step(), record.mapping));
  const known = versions
    .filter((version) => {
      work.step();
      return parse(version.recordedKnowledgeAt) <= parse(input.knowledgeCutoff);
    })
    .sort((a, b) => (work.step(), a.version - b.version));
  const visibleTransitions = transitions.filter((transition) => {
    work.step();
    return (
      parse(transition.effectiveAt) <= parse(input.evaluationAt) &&
      (input.mode === "CORRECTED" ||
        parse(transition.recordedKnowledgeAt) <= parse(input.knowledgeCutoff))
    );
  });
  const transitionFor = (version: number) => {
    let found = undefined as (typeof visibleTransitions)[number] | undefined;
    for (const transition of visibleTransitions) {
      work.step();
      if (transition.affectedVersion === version) found = transition;
    }
    return found;
  };
  const approved = known
    .filter((version) => {
      work.step();
      return isEffective(
        version.effectiveFrom,
        version.effectiveTo,
        input.evaluationAt,
        work,
      );
    })
    .at(-1);
  const selected: MappingVersion | undefined = approved;
  const selectedTransition = selected
    ? transitionFor(selected.version)
    : undefined;
  const invalidated = selectedTransition?.transitionType === "INVALIDATE";
  const outcome = selected && !invalidated ? "MATCHED" : "UNAVAILABLE";
  const reason = invalidated
    ? "MAPPING_INVALIDATED"
    : selected
      ? "COMPATIBLE_APPROVED"
      : "MAPPING_UNAPPROVED";
  const compare = compareUtf8WithBudget(work);
  work.units(versions.length + 1);
  const history = [...versions]
    .sort(
      (a, b) => (
        work.step(),
        a.version - b.version || compare(a.mappingId, b.mappingId)
      ),
    )
    .map((version) => {
      work.step();
      return {
        evidence: version.evidenceRevision,
        effectiveFrom: version.effectiveFrom,
        effectiveTo: version.effectiveTo,
        id: version.mappingId,
        knowledge: version.recordedKnowledgeAt,
        policy: version.policyRevision,
        registry: version.registryRevision,
        status:
          transitionFor(version.version)?.transitionType ?? version.status,
        version: String(version.version),
      };
    });
  const result = Object.freeze({
    mode: input.mode,
    replayRevision: deterministicId(
      "mapping-replay/v1",
      {
        evaluationAt: input.evaluationAt,
        history,
        historyDigest: input.history.digest,
        knowledgeCutoff: input.knowledgeCutoff,
        mode: input.mode,
        revision: input.replayRevision,
        transitions: visibleTransitions.map((transition) => {
          work.step();
          return {
            digest: transition.commandDigest,
            effectiveAt: transition.effectiveAt,
            id: transition.transitionId,
            knowledge: transition.recordedKnowledgeAt,
            type: transition.transitionType,
            version: String(transition.affectedVersion),
          };
        }),
      },
      work,
    ),
    mapping: selected,
    outcome,
    reason,
    policyRevision: MATCHING_POLICY_VERSION,
    registryRevision: selected?.registryRevision,
    evidenceRevision: selected?.evidenceRevision,
    evaluationAt: input.evaluationAt,
    knowledgeCutoff: input.knowledgeCutoff,
  });
  work.beforePublication();
  return result;
}
