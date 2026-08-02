import { OkxRateLimitError } from "./errors.js";

export interface RateBudget {
  readonly requests: number;
  readonly windowMs: number;
}

export type MillisecondClock = () => number;

export class SlidingWindowRateLimiter {
  private readonly requestTimes = new Map<string, bigint[]>();

  constructor(private readonly now: MillisecondClock = Date.now) {}

  acquire(key: string, budget: RateBudget): void {
    if (
      budget.requests <= 0 ||
      budget.windowMs <= 0 ||
      !Number.isSafeInteger(budget.requests) ||
      !Number.isSafeInteger(budget.windowMs)
    ) {
      throw new TypeError("Rate budget must use positive safe integers.");
    }
    const nowValue = this.now();
    if (!Number.isSafeInteger(nowValue) || nowValue < 0) {
      throw new TypeError(
        "Rate-limit clock must return a non-negative safe integer.",
      );
    }
    const now = BigInt(nowValue);
    const window = BigInt(budget.windowMs);
    const cutoff = now - window;
    const recent = (this.requestTimes.get(key) ?? []).filter(
      (value) => value > cutoff,
    );
    if (recent.length >= budget.requests) {
      const oldest = recent[0];
      const retryAfterMs =
        oldest === undefined ? window : oldest + window - now;
      this.requestTimes.set(key, recent);
      throw new OkxRateLimitError(
        `Local OKX rate budget exhausted for ${key}.`,
        Number(retryAfterMs > 1n ? retryAfterMs : 1n),
      );
    }
    recent.push(now);
    this.requestTimes.set(key, recent);
  }
}
