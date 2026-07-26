export const healthStatuses = ["UP", "DEGRADED", "DOWN"] as const;

export type HealthStatus = (typeof healthStatuses)[number];

export interface HealthResponse {
  readonly status: HealthStatus;
  readonly service: "control-api";
  readonly version: string;
  readonly timestamp: string;
}

const rfc3339DateTime =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/;

export function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    healthStatuses.includes(candidate.status as HealthStatus) &&
    candidate.service === "control-api" &&
    typeof candidate.version === "string" &&
    typeof candidate.timestamp === "string" &&
    rfc3339DateTime.test(candidate.timestamp) &&
    !Number.isNaN(Date.parse(candidate.timestamp))
  );
}
