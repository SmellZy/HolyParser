import { OkxQueueOverflowError } from "./errors.js";

export interface BoundedQueueOptions {
  readonly maximumMessages: number;
  readonly maximumBytes: number;
}

interface QueueEntry<T> {
  readonly value: T;
  readonly bytes: number;
}

export class BoundedMessageQueue<T> {
  private readonly entries: QueueEntry<T>[] = [];
  private queuedBytes = 0;

  constructor(private readonly options: BoundedQueueOptions) {
    if (
      !Number.isSafeInteger(options.maximumMessages) ||
      !Number.isSafeInteger(options.maximumBytes) ||
      options.maximumMessages <= 0 ||
      options.maximumBytes <= 0
    ) {
      throw new TypeError("Queue limits must be positive safe integers.");
    }
  }

  push(value: T, bytes: number): void {
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new TypeError(
        "Queued message size must be a non-negative integer.",
      );
    }
    if (
      this.entries.length + 1 > this.options.maximumMessages ||
      this.queuedBytes + bytes > this.options.maximumBytes
    ) {
      throw new OkxQueueOverflowError(
        "The bounded OKX message queue is full; market data must be marked stale.",
      );
    }
    this.entries.push({ value, bytes });
    this.queuedBytes += bytes;
  }

  shift(): T | undefined {
    const entry = this.entries.shift();
    if (entry === undefined) {
      return undefined;
    }
    this.queuedBytes -= entry.bytes;
    return entry.value;
  }

  clear(): void {
    this.entries.length = 0;
    this.queuedBytes = 0;
  }

  state(): Readonly<{ messages: number; bytes: number }> {
    return Object.freeze({
      messages: this.entries.length,
      bytes: this.queuedBytes,
    });
  }
}
