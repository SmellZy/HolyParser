import { describe, expect, it } from "vitest";
import { runBinanceUsdmPublicCanary } from "./canary.js";

const live = process.env.BINANCE_USDM_LIVE_CANARY === "1";

describe.skipIf(!live)("Binance USD-M live public canary", () => {
  it("collects bounded point-in-time evidence without credentials", async () => {
    const result = await runBinanceUsdmPublicCanary();
    expect(result.instrumentCount).toBeGreaterThan(0);
    expect(result.lastPriceRows).toBe(1);
    expect(result.bookTickerRows).toBe(1);
    expect(result.premiumIndexRows).toBe(1);
    expect(BigInt(result.restDepthUpdateId)).toBeGreaterThanOrEqual(0n);
    expect(BigInt(result.websocketFinalUpdateId)).toBeGreaterThanOrEqual(0n);
  }, 30_000);
});
