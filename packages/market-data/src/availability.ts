export type KnowledgeState =
  "KNOWN" | "UNKNOWN" | "UNSUPPORTED" | "UNVERIFIED" | "RESEARCH_REQUIRED";

export type Knowledge<T> =
  | {
      readonly state: "KNOWN";
      readonly value: T;
    }
  | {
      readonly state: Exclude<KnowledgeState, "KNOWN">;
      readonly reason: string;
    };

export const known = <T>(value: T): Knowledge<T> => ({
  state: "KNOWN",
  value,
});

export const unknown = <T>(reason: string): Knowledge<T> => ({
  state: "UNKNOWN",
  reason,
});

export const unsupported = <T>(reason: string): Knowledge<T> => ({
  state: "UNSUPPORTED",
  reason,
});

export const unverified = <T>(reason: string): Knowledge<T> => ({
  state: "UNVERIFIED",
  reason,
});

export const researchRequired = <T>(reason: string): Knowledge<T> => ({
  state: "RESEARCH_REQUIRED",
  reason,
});
