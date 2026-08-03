import { describe, expect, it } from "vitest";
import { runBybitLinearCanary } from "./canary.js";

describe("Bybit public live canary", () => {
  it.skipIf(process.env.BYBIT_LINEAR_LIVE_CANARY !== "1")(
    "runs only when explicitly enabled",
    async () => {
      const result = await runBybitLinearCanary();
      expect(result.kind).toBe("POINT_IN_TIME");
      expect(result.tickerRows).toBeGreaterThan(0);
      expect(result.websocketMessageCount).toBeGreaterThan(0);
    },
    20000,
  );
});
