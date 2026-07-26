import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  healthStatuses,
  isHealthResponse,
  type HealthResponse,
} from "./index.js";

describe("isHealthResponse", () => {
  it("accepts the versioned control API health payload", () => {
    expect(
      isHealthResponse({
        status: "UP",
        service: "control-api",
        version: "0.1.0",
        timestamp: "2026-07-25T12:00:00Z",
      }),
    ).toBe(true);
  });

  it("rejects unknown health states", () => {
    expect(
      isHealthResponse({
        status: "UNKNOWN",
        service: "control-api",
        version: "0.1.0",
        timestamp: "2026-07-25T12:00:00Z",
      }),
    ).toBe(false);
  });

  it("rejects timestamps that are not OpenAPI date-time values", () => {
    expect(
      isHealthResponse({
        status: "UP",
        service: "control-api",
        version: "0.1.0",
        timestamp: "2026-07-25",
      }),
    ).toBe(false);
  });

  it("keeps the TypeScript health contract aligned with OpenAPI", () => {
    const specification = parse(
      readFileSync(
        new URL("../openapi/control-api.yaml", import.meta.url),
        "utf8",
      ),
    ) as {
      components: {
        schemas: {
          HealthResponse: {
            additionalProperties: boolean;
            properties: Record<string, unknown>;
            required: Array<keyof HealthResponse>;
          };
          HealthStatus: { enum: string[] };
        };
      };
    };
    const { HealthResponse: response, HealthStatus: status } =
      specification.components.schemas;

    expect(status.enum).toEqual(healthStatuses);
    expect(response.additionalProperties).toBe(false);
    expect([...response.required].sort()).toEqual(
      ["service", "status", "timestamp", "version"].sort(),
    );
    expect(Object.keys(response.properties).sort()).toEqual(
      [...response.required].sort(),
    );
  });
});
