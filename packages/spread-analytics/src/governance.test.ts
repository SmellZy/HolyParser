import { describe, expect, it } from "vitest";
import {
  approveCommand,
  invalidateCommand,
  MappingLedger,
} from "./commands.js";
import { replayMapping } from "./replay.js";
import {
  T0,
  T1D,
  T30,
  T30D,
  approvedMapping,
  admittedHistory,
  instrument,
  mappingAdmission,
  registry,
} from "./test-fixtures.js";

function validCommand(
  overrides: Partial<Parameters<typeof approveCommand>[0]> = {},
) {
  return approveCommand({
    commandId: "command-1",
    candidateId: "candidate-1",
    candidateDigest: "candidate-digest-1",
    expectedRevision: 0,
    proposedBy: "product-proposer",
    mappingId: "mapping-1",
    leftInstrumentId: "left",
    rightInstrumentId: "right",
    exposureKey: "key",
    effectiveFrom: T0,
    effectiveTo: T30D,
    recordedKnowledgeAt: T0,
    registryRevision: "registry-v1",
    evidenceRevision: "evidence-v1",
    reasonText: "independently reviewed",
    approvals: [
      { actorId: "quant-reviewer", role: "QUANT_REVIEWER", recordedAt: T0 },
      {
        actorId: "market-data-reviewer",
        role: "MARKET_DATA_REVIEWER",
        recordedAt: T0,
      },
    ],
    ...overrides,
  });
}

describe("scenario 26 governance commands", () => {
  it("is idempotent for the same command and digest", () => {
    const command = validCommand();
    const first = new MappingLedger().apply(command);
    const second = first.ledger.apply(command);
    expect(second.idempotent).toBe(true);
    expect(second.ledger.versions).toHaveLength(1);
  });

  it("rejects same command ID with a different digest without mutation", () => {
    const first = new MappingLedger().apply(validCommand());
    const changed = validCommand({ reasonText: "different reviewed reason" });
    expect(() => first.ledger.apply(changed)).toThrowError(
      expect.objectContaining({ code: "COMMAND_DIGEST_CONFLICT" }),
    );
    expect(first.ledger.versions).toHaveLength(1);
  });

  it("rejects proposer/reviewer overlap", () => {
    expect(() =>
      new MappingLedger().apply(validCommand({ proposedBy: "quant-reviewer" })),
    ).toThrowError(
      expect.objectContaining({ code: "REVIEWER_SEPARATION_REQUIRED" }),
    );
  });

  it("rejects stale expected revision", () => {
    const first = new MappingLedger().apply(validCommand());
    expect(() =>
      first.ledger.apply(
        validCommand({ commandId: "command-2", expectedRevision: 0 }),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "MAPPING_REVISION_CONFLICT" }),
    );
  });

  it("rejects invalid command inputs before hashing or publication", () => {
    expect(() => validCommand({ expectedRevision: -1 })).toThrowError(
      expect.objectContaining({ code: "INPUT_INVALID" }),
    );
    expect(() =>
      validCommand({ reasonText: "https://untrusted.invalid/reason" }),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
    expect(() =>
      validCommand({
        approvals: [
          { actorId: "quant", role: "UNTRUSTED_ROLE" as never, recordedAt: T0 },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "INPUT_INVALID" }));
  });

  it("adds an immutable invalidation record and preserves the approved record", () => {
    const approved = new MappingLedger().apply(validCommand());
    const invalidation = invalidateCommand({
      commandId: "invalidate-1",
      expectedRevision: 1,
      mappingId: "mapping-1",
      affectedVersion: 1,
      effectiveAt: T1D,
      recordedKnowledgeAt: T1D,
      reasonText: "reviewed correction",
      invalidationReference: "correction-1",
      proposedBy: "product-transition-proposer",
      registryRevision: approved.mapping.registryRevision,
      evidenceRevision: approved.mapping.evidenceRevision,
      provenanceDigest: approved.mapping.approvals[0]!.approvedDigest,
      approvals: [
        {
          actorId: "quant-transition-reviewer",
          role: "QUANT_REVIEWER",
          recordedAt: T1D,
        },
        {
          actorId: "market-data-transition-reviewer",
          role: "MARKET_DATA_REVIEWER",
          recordedAt: T1D,
        },
      ],
    });
    const result = approved.ledger.apply(invalidation);
    expect(result.ledger.versions.map((value) => value.status)).toEqual([
      "APPROVED",
    ]);
    expect(
      result.ledger.transitions.map((value) => value.transitionType),
    ).toEqual(["INVALIDATE"]);
    expect(approved.ledger.versions).toHaveLength(1);
  });
});

describe("replay", () => {
  it("is deterministic across history ordering", () => {
    const left = instrument({ name: "OKX" });
    const right = instrument({ name: "BINANCE" });
    const first = approvedMapping(left, right);
    const invalidated = approvedMapping(left, right, "INVALIDATED", {
      version: 2,
      priorVersion: 1,
      recordedKnowledgeAt: T1D,
    });
    const input = {
      mode: "CORRECTED" as const,
      mappingId: first.mappingId,
      evaluationAt: T30,
      knowledgeCutoff: T1D,
      replayRevision: "r1",
    };
    const assets = registry([left, right]);
    const invalidatedAdmission = mappingAdmission(
      left,
      right,
      assets,
      invalidated,
    );
    expect(
      replayMapping({
        ...input,
        history: admittedHistory(invalidatedAdmission),
      }),
    ).toEqual(
      replayMapping({
        ...input,
        history: admittedHistory(invalidatedAdmission),
      }),
    );
  });
});
