import { MATCHING_LIMITS } from "./policy.js";
import type { MatchReasonCode } from "./reasons.js";
import { compareUtf8WithBudget } from "./serialization.js";
import { WorkBudget } from "./bounds.js";
export interface Diagnostic {
  readonly code: MatchReasonCode;
  readonly subject:
    "BATCH" | "LEFT" | "MAPPING" | "PAIR" | "REGISTRY" | "RIGHT";
}
export function boundedDiagnostics(
  items: readonly Diagnostic[],
): readonly Diagnostic[] {
  const work = new WorkBudget();
  work.step(items.length);
  const compare = compareUtf8WithBudget(work);
  const ordered = [...items].sort((a, b) =>
    // work: fixed vocabularies; flattened by the charged comparator.
    compare(`${a.subject}:${a.code}`, `${b.subject}:${b.code}`),
  );
  const result = Object.freeze(
    ordered.length <= MATCHING_LIMITS.diagnostics
      ? ordered
      : [
          ...ordered.slice(0, MATCHING_LIMITS.diagnostics - 1),
          { code: "DIAGNOSTICS_TRUNCATED", subject: "BATCH" } as const,
        ],
  );
  work.beforePublication();
  return result;
}
