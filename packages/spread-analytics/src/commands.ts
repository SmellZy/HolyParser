import type { Timestamp } from "@arbitrage/market-data";
import {
  WorkBudget,
  assertAtomicId,
  assertCompositeId,
  assertCount,
  assertReasonText,
} from "./bounds.js";
import type {
  MappingTransitionRecord,
  MappingVersion,
  ReviewApproval,
} from "./model.js";
import { chargeCopy, immutableMapping } from "./immutable.js";
import { MATCHING_LIMITS, MATCHING_POLICY_VERSION } from "./policy.js";
import { chargeTimestamp, epoch, isEffective } from "./registry.js";
import { MatchingFailure } from "./reasons.js";
import { compareUtf8WithBudget, deterministicId } from "./serialization.js";
import {
  createTransitionRecord,
  validateTransitionRecord,
} from "./transitions.js";

export interface ApprovalInput {
  readonly actorId: string;
  readonly role: ReviewApproval["role"];
  readonly recordedAt: Timestamp;
}
export interface ApproveCommandInput {
  readonly commandId: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly expectedRevision: number;
  readonly proposedBy: string;
  readonly mappingId: string;
  readonly leftInstrumentId: string;
  readonly rightInstrumentId: string;
  readonly exposureKey: string;
  readonly effectiveFrom: Timestamp;
  readonly effectiveTo: Timestamp;
  readonly recordedKnowledgeAt: Timestamp;
  readonly registryRevision: string;
  readonly evidenceRevision: string;
  readonly reasonText: string;
  readonly approvals: readonly ApprovalInput[];
}
export interface ApproveMappingCommand extends ApproveCommandInput {
  readonly kind: "APPROVE_MAPPING";
  readonly approvals: readonly ReviewApproval[];
  readonly commandDigest: string;
}
export interface InvalidateCommandInput {
  readonly commandId: string;
  readonly expectedRevision: number;
  readonly mappingId: string;
  readonly affectedVersion: number;
  readonly effectiveAt: Timestamp;
  readonly recordedKnowledgeAt: Timestamp;
  readonly reasonText: string;
  readonly invalidationReference: string;
  readonly proposedBy: string;
  readonly registryRevision: string;
  readonly evidenceRevision: string;
  readonly provenanceDigest: string;
  readonly approvals: readonly ApprovalInput[];
}
export interface InvalidateMappingCommand extends InvalidateCommandInput {
  readonly kind: "INVALIDATE_MAPPING";
  readonly transition: MappingTransitionRecord;
  readonly commandDigest: string;
}
export type MappingCommand = ApproveMappingCommand | InvalidateMappingCommand;
function payload(input: ApproveCommandInput, work?: WorkBudget): string {
  return deterministicId(
    "mapping-command/v1",
    {
      commandId: input.commandId,
      candidateDigest: input.candidateDigest,
      candidateId: input.candidateId,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      evidenceRevision: input.evidenceRevision,
      expectedRevision: String(input.expectedRevision),
      exposureKey: input.exposureKey,
      left: input.leftInstrumentId,
      mappingId: input.mappingId,
      proposedBy: input.proposedBy,
      reasonText: input.reasonText,
      recordedKnowledgeAt: input.recordedKnowledgeAt,
      registryRevision: input.registryRevision,
      right: input.rightInstrumentId,
    },
    work,
  );
}

function assertRevision(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new MatchingFailure("INPUT_INVALID", `${label} is invalid.`);
}

function validateApproveInput(
  input: ApproveCommandInput,
  work?: WorkBudget,
): void {
  for (const [value, label] of [
    [input.commandId, "Command ID"],
    [input.candidateId, "Candidate ID"],
    [input.candidateDigest, "Candidate digest"],
    [input.proposedBy, "Proposer ID"],
    [input.mappingId, "Mapping ID"],
    [input.registryRevision, "Registry revision"],
    [input.evidenceRevision, "Evidence revision"],
  ] as const) {
    work?.step();
    assertAtomicId(value, label, work);
  }
  assertCompositeId(input.leftInstrumentId, work);
  assertCompositeId(input.rightInstrumentId, work);
  assertCompositeId(input.exposureKey, work);
  assertReasonText(input.reasonText, work);
  assertRevision(input.expectedRevision, "Expected revision");
  epoch(input.recordedKnowledgeAt, work);
  isEffective(
    input.effectiveFrom,
    input.effectiveTo,
    input.effectiveFrom,
    work,
  );
  for (const approval of input.approvals) {
    work?.step();
    assertAtomicId(approval.actorId, "Reviewer ID", work);
    if (
      !["MARKET_DATA_REVIEWER", "PRODUCT_REVIEWER", "QUANT_REVIEWER"].includes(
        approval.role,
      )
    )
      throw new MatchingFailure("INPUT_INVALID", "Reviewer role is invalid.");
    epoch(approval.recordedAt, work);
  }
}
export function approveCommand(
  input: ApproveCommandInput,
  work?: WorkBudget,
): ApproveMappingCommand {
  const operation = work ?? new WorkBudget();
  validateApproveInput(input, operation);
  const digest = payload(input, operation);
  chargeCopy(input, operation);
  const result = Object.freeze({
    ...input,
    kind: "APPROVE_MAPPING",
    approvals: Object.freeze(
      input.approvals.map(
        (a) => (
          operation.step(),
          chargeCopy(a, operation),
          Object.freeze({ ...a, approvedDigest: digest })
        ),
      ),
    ),
    commandDigest: digest,
  });
  if (work === undefined) operation.beforePublication();
  return result;
}
export function invalidateCommand(
  input: InvalidateCommandInput,
): InvalidateMappingCommand {
  const work = new WorkBudget();
  assertAtomicId(input.commandId, "Command ID", work);
  assertAtomicId(input.mappingId, "Mapping ID", work);
  assertAtomicId(input.invalidationReference, "Invalidation reference", work);
  assertReasonText(input.reasonText, work);
  assertRevision(input.expectedRevision, "Expected revision");
  if (!Number.isSafeInteger(input.affectedVersion) || input.affectedVersion < 1)
    throw new MatchingFailure("INPUT_INVALID", "Affected version is invalid.");
  epoch(input.recordedKnowledgeAt, work);
  const transition = createTransitionRecord(
    {
      transitionId: input.commandId,
      mappingId: input.mappingId,
      affectedVersion: input.affectedVersion,
      transitionType: "INVALIDATE",
      effectiveAt: input.effectiveAt,
      reasonCode: "MAPPING_INVALIDATED",
      reasonText: input.reasonText,
      reference: input.invalidationReference,
      policyRevision: MATCHING_POLICY_VERSION,
      expectedRevision: input.expectedRevision,
      expectedState: "APPROVED",
      proposerId: input.proposedBy,
      registryRevision: input.registryRevision,
      evidenceRevision: input.evidenceRevision,
      provenanceDigest: input.provenanceDigest,
      recordedKnowledgeAt: input.recordedKnowledgeAt,
      approvals: input.approvals,
    },
    work,
  );
  chargeCopy(input, work);
  const result = Object.freeze({
    ...input,
    kind: "INVALIDATE_MAPPING",
    transition,
    commandDigest: transition.commandDigest,
  });
  work.beforePublication();
  return result;
}

export class MappingLedger {
  readonly versions: readonly MappingVersion[];
  readonly transitions: readonly MappingTransitionRecord[];
  #commandDigests: Map<string, string>;
  constructor(
    versions: readonly MappingVersion[] = [],
    transitions: readonly MappingTransitionRecord[] = [],
    work = new WorkBudget(),
  ) {
    assertCount(
      versions.length,
      MATCHING_LIMITS.mappingEventRecords,
      "Mapping record",
    );
    const counts = new Map<string, number>();
    for (const v of versions) {
      work.step();
      const n = (counts.get(v.mappingId) ?? 0) + 1;
      assertCount(
        n,
        MATCHING_LIMITS.mappingVersionsPerMapping,
        "Mapping history",
      );
      counts.set(v.mappingId, n);
    }
    this.versions = Object.freeze(
      versions.map((value) => (work.step(), immutableMapping(value, work))),
    );
    this.transitions = Object.freeze(
      transitions.map((transition) => {
        work.step();
        chargeCopy(transition, work);
        return Object.freeze({
          ...transition,
          approvals: Object.freeze(
            transition.approvals.map((approval) => {
              work.step();
              chargeCopy(approval, work);
              return Object.freeze({ ...approval });
            }),
          ),
        });
      }),
    );
    this.#commandDigests = new Map();
  }
  commandDigest(commandId: string): string | undefined {
    const work = new WorkBudget();
    assertAtomicId(commandId, "Command ID", work);
    const result = this.#commandDigests.get(commandId);
    work.beforePublication();
    return result;
  }
  commandDigestSnapshot(): readonly Readonly<{
    readonly commandId: string;
    readonly digest: string;
  }>[] {
    const work = new WorkBudget();
    work.step(this.#commandDigests.size);
    const result = Object.freeze(
      [...this.#commandDigests]
        .sort(([left], [right]) => {
          return compareUtf8WithBudget(work)(left, right);
        })
        .map(([commandId, digest]) => {
          work.step();
          return Object.freeze({ commandId, digest });
        }),
    );
    work.beforePublication();
    return result;
  }
  apply(
    command: MappingCommand,
    operationBudget?: WorkBudget,
  ): {
    readonly ledger: MappingLedger;
    readonly mapping: MappingVersion;
    readonly idempotent: boolean;
  } {
    const work = operationBudget ?? new WorkBudget();
    work.step();
    if (command.kind === "INVALIDATE_MAPPING")
      this.assertInvalidateCommandBinding(command, work);
    const priorDigest = this.#commandDigests.get(command.commandId);
    if (priorDigest !== undefined) {
      if (priorDigest !== command.commandDigest)
        throw new MatchingFailure(
          "COMMAND_DIGEST_CONFLICT",
          "Command ID reused.",
        );
      work.units(2 * this.versions.length + 1);
      const mapping = [...this.versions]
        .reverse()
        .find((v) => (work.step(), v.mappingId === command.mappingId));
      if (!mapping)
        throw new MatchingFailure(
          "TRANSITION_REJECTED",
          "Missing idempotent result.",
        );
      const result = { ledger: this, mapping, idempotent: true };
      if (operationBudget === undefined) work.beforePublication();
      return result;
    }
    const revision = this.versions.filter(
      (v) => (work.step(), v.mappingId === command.mappingId),
    ).length;
    if (command.expectedRevision !== revision)
      throw new MatchingFailure(
        "MAPPING_REVISION_CONFLICT",
        "Stale expected revision.",
      );
    let mapping: MappingVersion;
    let nextVersions = this.versions;
    let nextTransitions = this.transitions;
    if (command.kind === "APPROVE_MAPPING") {
      mapping = this.approve(command, revision, work);
      work.step(this.versions.length);
      nextVersions = [...this.versions, mapping];
    } else {
      const transition = this.invalidate(command, revision, work);
      mapping = this.versions.find(
        (value) =>
          (work.step(), true) &&
          value.mappingId === command.mappingId &&
          value.version === command.affectedVersion,
      )!;
      work.step(this.transitions.length);
      nextTransitions = [...this.transitions, transition];
    }
    const commands = new Map<string, string>();
    for (const [commandId, digest] of this.#commandDigests) {
      work.step();
      commands.set(commandId, digest);
    }
    commands.set(command.commandId, command.commandDigest);
    const ledger = new MappingLedger(nextVersions, nextTransitions, work);
    ledger.#commandDigests = commands;
    const result = {
      ledger,
      mapping,
      idempotent: false,
    };
    if (operationBudget === undefined) work.beforePublication();
    return result;
  }
  private approve(
    command: ApproveMappingCommand,
    revision: number,
    work: WorkBudget,
  ): MappingVersion {
    assertReasonText(command.reasonText, work);
    if (command.commandDigest !== payload(command, work))
      throw new MatchingFailure(
        "COMMAND_DIGEST_CONFLICT",
        "Invalid command digest.",
      );
    const quant = command.approvals.filter(
        (a) => (work.step(), a.role === "QUANT_REVIEWER"),
      ),
      md = command.approvals.filter(
        (a) => (work.step(), a.role === "MARKET_DATA_REVIEWER"),
      );
    if (
      quant.length !== 1 ||
      md.length !== 1 ||
      new Set([command.proposedBy, quant[0]!.actorId, md[0]!.actorId]).size !==
        3
    )
      throw new MatchingFailure(
        "REVIEWER_SEPARATION_REQUIRED",
        "Independent reviewers required.",
      );
    if (
      quant[0]!.approvedDigest !== command.commandDigest ||
      md[0]!.approvedDigest !== command.commandDigest
    )
      throw new MatchingFailure(
        "COMMAND_DIGEST_CONFLICT",
        "Approval digest mismatch.",
      );
    isEffective(
      command.effectiveFrom,
      command.effectiveTo,
      command.effectiveFrom,
      work,
    );
    const parse = (value: string): number => (
      chargeTimestamp(value, work),
      Date.parse(value)
    );
    const overlap = this.versions.some(
      (v) =>
        (work.step(), true) &&
        v.status === "APPROVED" &&
        [v.leftInstrumentId, v.rightInstrumentId].some(
          (id) =>
            id === command.leftInstrumentId || id === command.rightInstrumentId,
        ) &&
        parse(v.effectiveFrom) < parse(command.effectiveTo) &&
        parse(command.effectiveFrom) < parse(v.effectiveTo) &&
        v.exposureKey !== command.exposureKey,
    );
    if (overlap)
      throw new MatchingFailure(
        "MAPPING_INTERVAL_CONFLICT",
        "Mapping intervals conflict.",
      );
    return immutableMapping(
      {
        mappingId: command.mappingId,
        version: revision + 1,
        status: "APPROVED",
        leftInstrumentId: command.leftInstrumentId,
        rightInstrumentId: command.rightInstrumentId,
        exposureKey: command.exposureKey,
        effectiveFrom: command.effectiveFrom,
        effectiveTo: command.effectiveTo,
        recordedKnowledgeAt: command.recordedKnowledgeAt,
        registryRevision: command.registryRevision,
        evidenceRevision: command.evidenceRevision,
        policyRevision: MATCHING_POLICY_VERSION,
        reasonCode: "COMPATIBLE_APPROVED",
        priorVersion: revision ? revision : undefined,
        approvals: command.approvals,
      },
      work,
    );
  }
  private invalidate(
    command: InvalidateMappingCommand,
    revision: number,
    work: WorkBudget,
  ): MappingTransitionRecord {
    assertReasonText(command.reasonText, work);
    const target = this.versions.find(
      (v) =>
        (work.step(), true) &&
        v.mappingId === command.mappingId &&
        v.version === command.affectedVersion &&
        v.status === "APPROVED",
    );
    if (!target)
      throw new MatchingFailure(
        "TRANSITION_REJECTED",
        "Approved target required.",
      );
    if (revision !== command.expectedRevision)
      throw new MatchingFailure(
        "MAPPING_REVISION_CONFLICT",
        "Stale transition revision.",
      );
    if (
      this.transitions.some(
        (transition) => (
          work.step(),
          transition.mappingId === command.mappingId &&
            transition.affectedVersion === command.affectedVersion
        ),
      )
    )
      throw new MatchingFailure(
        "TRANSITION_REJECTED",
        "Mapping already has a terminal transition.",
      );
    return validateTransitionRecord(
      command.transition,
      target,
      target.approvals[0]?.approvedDigest ?? "missing-provenance",
      work,
    );
  }
  private assertInvalidateCommandBinding(
    command: InvalidateMappingCommand,
    work: WorkBudget,
  ): void {
    work.step();
    const transition = command.transition;
    if (
      command.commandId !== transition.transitionId ||
      command.commandDigest !== transition.commandDigest ||
      command.mappingId !== transition.mappingId ||
      command.affectedVersion !== transition.affectedVersion ||
      command.expectedRevision !== transition.expectedRevision ||
      command.effectiveAt !== transition.effectiveAt ||
      command.recordedKnowledgeAt !== transition.recordedKnowledgeAt ||
      command.invalidationReference !== transition.reference ||
      command.reasonText !== transition.reasonText ||
      command.proposedBy !== transition.proposerId ||
      command.registryRevision !== transition.registryRevision ||
      command.evidenceRevision !== transition.evidenceRevision ||
      command.provenanceDigest !== transition.provenanceDigest ||
      transition.transitionType !== "INVALIDATE" ||
      command.approvals.length !== transition.approvals.length ||
      command.approvals.some(
        (approval, index) => (
          work.step(),
          approval.actorId !== transition.approvals[index]?.actorId ||
            approval.role !== transition.approvals[index]?.role ||
            approval.recordedAt !== transition.approvals[index]?.recordedAt
        ),
      )
    )
      throw new MatchingFailure(
        "COMMAND_DIGEST_CONFLICT",
        "Invalidation command does not bind its transition.",
      );
  }
}

export type MappingCommandAdmission =
  | {
      readonly status: "APPLIED";
      readonly ledger: MappingLedger;
      readonly mapping: MappingVersion;
      readonly idempotent: boolean;
    }
  | {
      readonly status: "QUARANTINED" | "REJECTED";
      readonly ledger: MappingLedger;
      readonly reason: import("./reasons.js").MatchReasonCode;
    };

export function admitMappingCommand(
  ledger: MappingLedger,
  command: MappingCommand,
  signal?: import("./bounds.js").CancellationSignal,
): MappingCommandAdmission {
  const work = new WorkBudget(signal);
  try {
    const result = {
      status: "APPLIED" as const,
      ...ledger.apply(command, work),
    };
    work.beforePublication();
    return result;
  } catch (error) {
    if (!(error instanceof MatchingFailure)) throw error;
    return {
      status:
        error.code === "MAPPING_INTERVAL_CONFLICT" ? "QUARANTINED" : "REJECTED",
      ledger,
      reason: error.code,
    };
  }
}
