import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  canonicalAssetId,
  defineFreshnessPolicy,
  timestamp,
  type Timestamp,
} from "@arbitrage/market-data";
import { OkxBookSession } from "./book-session.js";
import {
  ExplicitOkxAssetResolver,
  mapInstrument,
  type OkxInstrumentBinding,
  type OkxObservationTimes,
} from "./mapping.js";
import { parseInstruments } from "./wire.js";
import type { OkxFreshnessConfiguration } from "./freshness.js";

export function fixture<T = unknown>(name: string): T {
  const path = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export const fixedTimestamp: Timestamp = timestamp("2026-07-26T12:00:00.000Z");

export const fixedTimes: OkxObservationTimes = {
  receiveTimestamp: fixedTimestamp,
  processingTimestamp: fixedTimestamp,
};

export function freshness(
  channel: string,
  healthyWithinMs = 86_400_000n,
  staleAfterMs = 172_800_000n,
  maximumFutureSkewMs = 86_400_000n,
): OkxFreshnessConfiguration {
  return Object.freeze({
    policy: defineFreshnessPolicy({
      id: `okx-${channel}-test`,
      venue: "OKX_EXCHANGE",
      productGroup: "OKX_V5_SWAP_FUTURES",
      channel,
      healthyWithinMs,
      staleAfterMs,
    }),
    maximumFutureSkewMs,
  });
}

export function resolver(): ExplicitOkxAssetResolver {
  return new ExplicitOkxAssetResolver(
    new Map([
      ["ALPHA", canonicalAssetId("asset:alpha")],
      ["USDT", canonicalAssetId("asset:usdt")],
      ["USDC", canonicalAssetId("asset:usdc")],
      ["USD", canonicalAssetId("asset:usd")],
    ]),
  );
}

export function bindings(): ReadonlyArray<OkxInstrumentBinding> {
  const raw = fixture<{ readonly instruments: unknown }>("public-rest.json");
  return parseInstruments(raw.instruments).data.map((row) =>
    mapInstrument(row, resolver(), fixedTimes),
  );
}

export function binding(): OkxInstrumentBinding {
  const value = bindings()[0];
  if (value === undefined) {
    throw new Error("Fixture has no instrument.");
  }
  return value;
}

export function session(): OkxBookSession {
  return new OkxBookSession({
    binding: binding(),
    freshness: freshness("books"),
  });
}
