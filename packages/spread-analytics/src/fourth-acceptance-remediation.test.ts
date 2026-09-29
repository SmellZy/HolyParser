import { canonicalAssetId } from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import { WorkBudget, assertEvidenceRecord } from "./bounds.js";
import {
  generateCandidatesWithBudget,
  makeCandidate,
  resolveExposureIdentity,
} from "./candidates.js";
import { immutableCandidate } from "./immutable.js";
import { CuratedAssetRegistry } from "./registry.js";
import {
  canonicalExposureKey,
  canonicalSerialize,
  deterministicId,
} from "./serialization.js";
import { T30, instrument, registry } from "./test-fixtures.js";

const assets = (length: number) =>
  canonicalAssetId(`asset:${"A".repeat(length - 6)}`);

function pair(length: number) {
  const left = instrument({ name: "CANDIDATE_LEFT", base: assets(length) });
  const right = instrument({
    name: "CANDIDATE_RIGHT",
    venue: "CANDIDATE_RIGHT_VENUE",
    base: assets(length),
  });
  const curated = registry([left, right]);
  return {
    left: resolveExposureIdentity(left, curated, T30, T30),
    right: resolveExposureIdentity(right, curated, T30, T30),
    curated,
    instruments: [left, right] as const,
  };
}

function materializationSteps(length: number) {
  const { left, right, curated } = pair(length);
  const work = new WorkBudget();
  const candidate = makeCandidate(left, right, curated, T30, T30, work);
  work.beforePublication();
  return { steps: work.steps, candidate };
}

describe("fourth acceptance H-03 candidate materialization", () => {
  it("charges long valid canonical asset IDs proportionally without changing identity bytes", () => {
    const short = materializationSteps(10);
    const long = materializationSteps(155);
    expect(long.steps).toBeGreaterThan(short.steps);
    expect(long.steps - short.steps).toBeGreaterThan(10);
    expect(long.steps).toBeGreaterThan(128);
    expect(long.candidate.exposureKey).toBe(
      canonicalExposureKey(pair(155).left.identity!),
    );
    expect(short.candidate.candidateId).toMatch(/^[a-f0-9]{64}$/u);
    expect(long.candidate.candidateId).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("threads one budget through the whole candidate operation with gap at most 128", () => {
    const { instruments, curated } = pair(155);
    const checks: number[] = [];
    const work = new WorkBudget(undefined, {
      checked(gap, total) {
        expect(gap).toBeLessThanOrEqual(128);
        checks.push(total);
      },
    });
    const result = generateCandidatesWithBudget(
      instruments,
      curated,
      T30,
      T30,
      work,
    );
    expect(result).toHaveLength(1);
    expect(checks.at(-1)).toBe(work.steps);
    expect(
      Math.max(...checks.slice(1).map((at, i) => at - checks[i]!)),
    ).toBeLessThanOrEqual(128);
    expect(work.steps).toBeGreaterThan(materializationSteps(155).steps);
  });

  it("rejects a bounded 8,192-pair batch at the cumulative work cap without partial publication", () => {
    const sizes = [
      32, 32, 32, 32, 32, 32, 32, 32, 33, 33, 33, 33, 33, 33, 33, 33,
    ];
    const instruments = sizes.flatMap((size, group) =>
      Array.from({ length: size }, (_, member) =>
        instrument({
          name: `H03_${group}_${member}`,
          venue: `H03_VENUE_${group}_${member}`,
          base: canonicalAssetId(`asset:H03_GROUP_${group}`),
        }),
      ),
    );
    const curated = registry(instruments);
    let maximumGap = 0;
    const work = new WorkBudget(undefined, {
      checked(gap) {
        maximumGap = Math.max(maximumGap, gap);
      },
    });
    let published: unknown;
    expect(() => {
      published = generateCandidatesWithBudget(
        instruments,
        curated,
        T30,
        T30,
        work,
      );
    }).toThrowError(
      expect.objectContaining({ code: "MATCHING_BOUND_EXCEEDED" }),
    );
    expect(published).toBeUndefined();
    expect(work.steps).toBeGreaterThan(50_000);
    expect(work.steps).toBeLessThanOrEqual(100_000);
    expect(maximumGap).toBe(128);
  });

  it("cancels inside long candidate materialization without publishing a partial result", () => {
    const { instruments, curated } = pair(155);
    let observed = 0;
    const work = new WorkBudget(
      {
        get aborted() {
          return observed >= 128;
        },
      },
      {
        checked(_gap, total) {
          observed = total;
        },
      },
    );
    let published: unknown;
    expect(() => {
      published = generateCandidatesWithBudget(
        instruments,
        curated,
        T30,
        T30,
        work,
      );
    }).toThrowError(expect.objectContaining({ code: "EVALUATION_CANCELLED" }));
    expect(published).toBeUndefined();
    expect(observed).toBe(128);
  });

  it("charges serialization, deterministic hash preparation and immutable copy on the same budget", () => {
    const { left, right, curated } = pair(155);
    const work = new WorkBudget();
    const before = work.steps;
    canonicalExposureKey(left.identity!, work);
    const keySteps = work.steps - before;
    const canonical = canonicalSerialize({ asset: assets(155) }, work);
    const serializationSteps = work.steps - before - keySteps;
    deterministicId("h03-candidate-test/v1", { asset: assets(155) }, work);
    const hashSteps = work.steps - before - keySteps - serializationSteps;
    const candidate = makeCandidate(left, right, curated, T30, T30, work);
    const copyBefore = work.steps;
    immutableCandidate(candidate, work);
    expect(keySteps).toBeGreaterThan(1);
    expect(serializationSteps).toBeGreaterThan(1);
    expect(hashSteps).toBeGreaterThan(1);
    expect(work.steps - copyBefore).toBeGreaterThan(1);
    expect(canonical).toContain(assets(155));
  });

  it("preserves canonical bytes and digests with or without budget plumbing", () => {
    const value = { asset: assets(155), roles: ["BASE", "QUOTE"] };
    const work = new WorkBudget();
    expect(canonicalSerialize(value, work)).toBe(canonicalSerialize(value));
    expect(deterministicId("h03-candidate-test/v1", value, work)).toBe(
      deterministicId("h03-candidate-test/v1", value),
    );
    expect(work.steps).toBeGreaterThan(1);
  });

  it("checks cancellation within budgeted key, serializer, ID and copy work", () => {
    const { left, right, curated } = pair(155);
    const candidate = materializationSteps(155).candidate;
    const operations = [
      (work: WorkBudget) => canonicalExposureKey(left.identity!, work),
      (work: WorkBudget) => canonicalSerialize({ asset: assets(155) }, work),
      (work: WorkBudget) =>
        deterministicId("h03-candidate-test/v1", { asset: assets(155) }, work),
      (work: WorkBudget) => immutableCandidate(candidate, work),
      (work: WorkBudget) => makeCandidate(left, right, curated, T30, T30, work),
    ];
    for (const operation of operations) {
      let checkedAt = 0;
      const work = new WorkBudget(
        {
          get aborted() {
            return checkedAt >= 128;
          },
        },
        {
          checked(_gap, total) {
            checkedAt = total;
          },
        },
      );
      work.step(127);
      expect(() => operation(work)).toThrowError(
        expect.objectContaining({ code: "EVALUATION_CANCELLED" }),
      );
      expect(checkedAt).toBe(128);
    }
  });

  it("precharges evidence JSON traversal before native serialization", () => {
    const work = new WorkBudget();
    const record = { description: "x".repeat(7_900) };
    assertEvidenceRecord(record, work);
    expect(work.steps).toBeGreaterThan(20);
    work.beforePublication();
  });

  it("keeps registry and candidate inputs immutable on cancellation", () => {
    const { instruments, curated } = pair(155);
    const originalRevision = curated.revision;
    const originalMetadata = instruments.map((item) => item.metadataDigest);
    expect(() =>
      generateCandidatesWithBudget(
        instruments,
        curated,
        T30,
        T30,
        new WorkBudget({ aborted: true }),
      ),
    ).toThrowError(expect.objectContaining({ code: "EVALUATION_CANCELLED" }));
    expect(curated.revision).toBe(originalRevision);
    expect(instruments.map((item) => item.metadataDigest)).toEqual(
      originalMetadata,
    );
  });
});
