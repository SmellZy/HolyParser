import { readFileSync } from "node:fs";
import { timestamp } from "@arbitrage/market-data";
import { describe, expect, it } from "vitest";
import { BybitOrderBookSession } from "./book-session.js";
import { parseWsBook } from "./wire.js";
import { binding, freshness } from "./test-helpers.js";

interface FixtureManifest {
  readonly retrievalDate: string;
  readonly productGroup: string;
  readonly fixtures: ReadonlyArray<{
    readonly file: string;
    readonly sourceIds: readonly string[];
    readonly origin: "copied" | "minimally-transformed" | "synthetic";
    readonly transformations: string;
  }>;
}

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"),
  ) as T;
}

describe("Bybit source-provenanced recorded fixtures", () => {
  it("references only registered current Bybit sources with transformations", () => {
    const manifest = fixture<FixtureManifest>("manifest.json");
    const sourceRegister = readFileSync(
      new URL("../../../docs/PHASE_0_SOURCE_REGISTER.md", import.meta.url),
      "utf8",
    );
    expect(manifest.retrievalDate).toBe("2026-08-03");
    expect(manifest.productGroup).toBe("BYBIT_V5_LINEAR");
    for (const entry of manifest.fixtures) {
      expect(entry.transformations.length).toBeGreaterThan(0);
      expect(["copied", "minimally-transformed", "synthetic"]).toContain(
        entry.origin,
      );
      expect(entry.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of entry.sourceIds)
        expect(sourceRegister).toContain(`| ${sourceId}`);
    }
  });

  it("replays duplicate, older, gap, stale suppression and recovery deterministically", () => {
    const recorded = fixture<{
      readonly topic: string;
      readonly messages: readonly unknown[];
    }>("book-sequence.json");
    const replay = () => {
      const session = new BybitOrderBookSession(
        binding(),
        recorded.topic,
        freshness,
      );
      const outcomes = recorded.messages.map((value) => {
        const wire = parseWsBook(value);
        const received = timestamp(
          new Date(Number(BigInt(wire.timestamp) + 100n)).toISOString(),
        );
        return session.apply(wire, {
          receiveTimestamp: received,
          processingTimestamp: received,
        }).outcome;
      });
      return JSON.stringify(
        { outcomes, state: session.state(), view: session.executableView() },
        (_, value) => (typeof value === "bigint" ? value.toString() : value),
      );
    };
    const first = replay();
    expect(JSON.parse(first).outcomes).toEqual([
      "INITIALIZED",
      "APPLIED",
      "DUPLICATE_REJECTED",
      "APPLIED",
      "DUPLICATE_REJECTED",
      "GAP_DETECTED",
      "REJECTED_STALE",
      "RECOVERED",
      "REPLACED",
    ]);
    expect(replay()).toBe(first);
  });
});
