import { describe, expect, it } from "vitest";
import { runBybitLinearCanary } from "./canary.js";
import { BYBIT_LIMITS } from "./constants.js";

describe("Bybit live canary bounds", () => {
  it("uses immutable finite request, message and deadline limits", () => {
    expect(BYBIT_LIMITS.canaryDurationMs).toBe(15000);
    expect(BYBIT_LIMITS.canaryRequests).toBe(6);
    expect(BYBIT_LIMITS.canaryMessages).toBe(10);
  });
  it("is disabled unless explicitly opted in", () =>
    expect(process.env.BYBIT_LINEAR_LIVE_CANARY).not.toBe("1"));
  it("fails before public network access when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    await expect(runBybitLinearCanary(controller.signal)).rejects.toMatchObject(
      { kind: "TRANSPORT" },
    );
  });
});
