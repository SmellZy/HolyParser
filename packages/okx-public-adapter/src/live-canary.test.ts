import { describe, expect, it } from "vitest";
import { runOkxPublicCanary } from "./canary.js";

describe.skipIf(process.env.OKX_LIVE_CANARY !== "1")(
  "credential-free bounded OKX public canary",
  () => {
    it("validates current public REST and WebSocket schemas", async () => {
      const evidence = await runOkxPublicCanary();
      expect(evidence.swapInstrumentCount).toBeGreaterThan(0);
      expect(evidence.tickerRows).toBeGreaterThan(0);
      expect(evidence.markRows).toBeGreaterThan(0);
      expect(evidence.restBookSequenceId).toMatch(/^\d+$/);
      expect(evidence.websocketSnapshotSequenceId).toMatch(/^\d+$/);
    }, 30_000);
  },
);
