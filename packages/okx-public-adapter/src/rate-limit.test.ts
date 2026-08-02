import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { OkxQueueOverflowError, OkxRateLimitError } from "./errors.js";
import { BoundedMessageQueue } from "./queue.js";
import { SlidingWindowRateLimiter } from "./rate-limit.js";

describe("bounded transport controls", () => {
  it("enforces local endpoint rate windows without implicit retry", () => {
    let now = 1_000;
    const limiter = new SlidingWindowRateLimiter(() => now);
    limiter.acquire("books", { requests: 2, windowMs: 1_000 });
    limiter.acquire("books", { requests: 2, windowMs: 1_000 });
    expect(() =>
      limiter.acquire("books", { requests: 2, windowMs: 1_000 }),
    ).toThrow(OkxRateLimitError);
    now = 2_001;
    expect(() =>
      limiter.acquire("books", { requests: 2, windowMs: 1_000 }),
    ).not.toThrow();
  });

  it("rejects invalid budgets and clocks without underflow or overflow", () => {
    expect(() =>
      new SlidingWindowRateLimiter(() => -1).acquire("books", {
        requests: 1,
        windowMs: 1,
      }),
    ).toThrow(/clock/);
    expect(() =>
      new SlidingWindowRateLimiter(() => Number.MAX_SAFE_INTEGER + 1).acquire(
        "books",
        {
          requests: 1,
          windowMs: 1,
        },
      ),
    ).toThrow(/clock/);
    expect(() =>
      new SlidingWindowRateLimiter().acquire("books", {
        requests: -1,
        windowMs: 1,
      }),
    ).toThrow(/budget/);
  });

  it("never exceeds configured message or byte capacity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 8 }), { maxLength: 30 }),
        (sizes) => {
          const queue = new BoundedMessageQueue<number>({
            maximumMessages: 5,
            maximumBytes: 20,
          });
          let acceptedMessages = 0;
          let acceptedBytes = 0;
          for (const size of sizes) {
            try {
              queue.push(size, size);
              acceptedMessages += 1;
              acceptedBytes += size;
            } catch (error) {
              expect(error).toBeInstanceOf(OkxQueueOverflowError);
              break;
            }
          }
          expect(queue.state().messages).toBe(acceptedMessages);
          expect(queue.state().bytes).toBe(acceptedBytes);
          expect(queue.state().messages).toBeLessThanOrEqual(5);
          expect(queue.state().bytes).toBeLessThanOrEqual(20);
        },
      ),
    );
  });
});
