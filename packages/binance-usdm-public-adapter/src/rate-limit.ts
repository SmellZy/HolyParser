import { BinanceUsdmRateLimitError } from "./errors.js";

export interface WeightBudget {
  readonly weight: number;
  readonly windowMs: number;
}

export class WeightedSlidingWindowRateLimiter {
  private readonly entries = new Map<
    string,
    Array<{ at: bigint; weight: bigint }>
  >();

  constructor(private readonly now: () => number = Date.now) {}

  acquire(key: string, requestWeight: number, budget: WeightBudget): void {
    for (const value of [requestWeight, budget.weight, budget.windowMs]) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError(
          "Rate-limit values must be positive safe integers.",
        );
      }
    }
    const nowNumber = this.now();
    if (!Number.isSafeInteger(nowNumber) || nowNumber < 0) {
      throw new TypeError(
        "Rate-limit clock must be a non-negative safe integer.",
      );
    }
    const now = BigInt(nowNumber);
    const cutoff = now - BigInt(budget.windowMs);
    const active = (this.entries.get(key) ?? []).filter(
      (entry) => entry.at > cutoff,
    );
    const used = active.reduce((sum, entry) => sum + entry.weight, 0n);
    if (used + BigInt(requestWeight) > BigInt(budget.weight)) {
      this.entries.set(key, active);
      throw new BinanceUsdmRateLimitError(
        `Local Binance USD-M request-weight budget exhausted for ${key}.`,
        "LOCAL",
      );
    }
    active.push({ at: now, weight: BigInt(requestWeight) });
    this.entries.set(key, active);
  }
}
