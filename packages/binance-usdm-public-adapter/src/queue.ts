import { BinanceUsdmQueueOverflowError } from "./errors.js";

export class BoundedMessageQueue<T> {
  private readonly entries: Array<{
    readonly value: T;
    readonly bytes: number;
  }> = [];
  private bytes = 0;

  constructor(
    private readonly maximumMessages: number,
    private readonly maximumBytes: number,
  ) {
    if (
      !Number.isSafeInteger(maximumMessages) ||
      !Number.isSafeInteger(maximumBytes) ||
      maximumMessages <= 0 ||
      maximumBytes <= 0
    ) {
      throw new TypeError("Queue bounds must be positive safe integers.");
    }
  }

  push(value: T, bytes: number): void {
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new TypeError(
        "Queued byte count must be a non-negative safe integer.",
      );
    }
    if (
      this.entries.length >= this.maximumMessages ||
      this.bytes + bytes > this.maximumBytes
    ) {
      throw new BinanceUsdmQueueOverflowError(
        "Binance USD-M inbound queue overflowed; the bound book is stale.",
      );
    }
    this.entries.push({ value, bytes });
    this.bytes += bytes;
  }

  shift(): T | undefined {
    const entry = this.entries.shift();
    if (entry === undefined) return undefined;
    this.bytes -= entry.bytes;
    return entry.value;
  }

  clear(): void {
    this.entries.length = 0;
    this.bytes = 0;
  }

  state(): Readonly<{ messages: number; bytes: number }> {
    return Object.freeze({ messages: this.entries.length, bytes: this.bytes });
  }
}
