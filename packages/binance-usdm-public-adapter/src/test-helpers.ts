import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  canonicalAssetId,
  defineFreshnessPolicy,
  timestamp,
  type Timestamp,
} from "@arbitrage/market-data";
import { BINANCE_USDM_PRODUCT_GROUP, BINANCE_USDM_VENUE } from "./constants.js";
import type { BinanceUsdmFreshnessConfiguration } from "./freshness.js";
import {
  mapInstrument,
  type BinanceUsdmAssetResolver,
  type BinanceUsdmInstrumentBinding,
  type BinanceUsdmObservationTimes,
} from "./mapping.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import { parseExchangeInfo } from "./wire.js";

export function fixture<T>(name: string): T {
  const path = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export const testAssetResolver: BinanceUsdmAssetResolver = {
  resolve(reference) {
    return canonicalAssetId(`ASSET:${reference}`);
  },
};

export const testTimes: BinanceUsdmObservationTimes = Object.freeze({
  receiveTimestamp: timestamp("2026-08-02T00:00:00.500Z"),
  processingTimestamp: timestamp("2026-08-02T00:00:00.600Z"),
});

export function testFreshness(
  channel: string,
): BinanceUsdmFreshnessConfiguration {
  return Object.freeze({
    policy: defineFreshnessPolicy({
      id: `binance-usdm-${channel}/test`,
      venue: BINANCE_USDM_VENUE,
      productGroup: BINANCE_USDM_PRODUCT_GROUP,
      channel,
      healthyWithinMs: 1_000n,
      staleAfterMs: 5_000n,
    }),
    maximumFutureSkewMs: 1_000n,
  });
}

export function testTimestampSequence(): () => Timestamp {
  const values = [
    timestamp("2026-08-02T00:00:00.500Z"),
    timestamp("2026-08-02T00:00:00.600Z"),
  ];
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)]!;
}

export function bindings(): ReadonlyArray<BinanceUsdmInstrumentBinding> {
  const raw = readFileSync(
    fileURLToPath(new URL("../fixtures/exchange-info.json", import.meta.url)),
    "utf8",
  );
  const exchange = parseExchangeInfo(
    parseJsonPreservingIntegers(raw, 1_000_000),
  );
  return exchange.symbols.map((row) =>
    mapInstrument(row, testAssetResolver, testTimes),
  );
}

export function btcBinding(): BinanceUsdmInstrumentBinding {
  return bindings().find((binding) => binding.wire.symbol === "BTCUSDT")!;
}
