import { BYBIT_LIMITS } from "./constants.js";
import { BybitLinearRateLimitError } from "./errors.js";

export class BybitPublicRateLimiter {
  private readonly timestamps: number[] = [];
  constructor(
    private readonly now: () => number = Date.now,
    private readonly maximum = BYBIT_LIMITS.publicRequests,
    private readonly windowMs = BYBIT_LIMITS.publicWindowMs,
  ) {
    if (
      !Number.isSafeInteger(maximum) ||
      maximum <= 0 ||
      !Number.isSafeInteger(windowMs) ||
      windowMs <= 0
    )
      throw new BybitLinearRateLimitError(
        "Invalid process-local rate-limit configuration.",
      );
  }
  acquire(): void {
    const current = this.now();
    if (!Number.isSafeInteger(current) || current < 0)
      throw new BybitLinearRateLimitError("Rate-limit clock is invalid.");
    while (
      this.timestamps[0] !== undefined &&
      current - this.timestamps[0] >= this.windowMs
    )
      this.timestamps.shift();
    if (this.timestamps.length >= this.maximum)
      throw new BybitLinearRateLimitError(
        "Process-local Bybit public request budget exhausted.",
      );
    this.timestamps.push(current);
  }
  remaining(): number {
    return Math.max(0, this.maximum - this.timestamps.length);
  }
}
