import { describe, expect, it } from "vitest";

import nextConfig, { securityHeaders } from "../../next.config";

describe("frontend security headers", () => {
  it("applies the complete baseline to every route", async () => {
    const configuredHeaders = await nextConfig.headers?.();

    expect(configuredHeaders).toEqual([
      {
        source: "/(.*)",
        headers: [...securityHeaders],
      },
    ]);
  });

  it("blocks framing, plugins, and browser capabilities not used in Phase 1", () => {
    const values = Object.fromEntries(
      securityHeaders.map(({ key, value }) => [key, value]),
    );

    expect(values["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(values["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(values["Permissions-Policy"]).toContain("payment=()");
    expect(values["X-Content-Type-Options"]).toBe("nosniff");
    expect(values["X-Frame-Options"]).toBe("DENY");
  });
});
