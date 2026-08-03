import { BybitLinearAdapterError } from "./errors.js";

export interface BoundedQueueOptions {
  readonly maximumMessages: number;
  readonly maximumBytes: number;
}
export class BoundedMessageQueue<T> {
  private readonly items: Array<{ value: T; bytes: number }> = [];
  private bytes = 0;
  constructor(private readonly options: BoundedQueueOptions) {
    if (
      !Number.isSafeInteger(options.maximumMessages) ||
      options.maximumMessages <= 0 ||
      !Number.isSafeInteger(options.maximumBytes) ||
      options.maximumBytes <= 0
    )
      throw new BybitLinearAdapterError(
        "Queue bounds must be positive safe integers.",
        "CONFIGURATION",
        "BYBIT-08",
      );
  }
  push(value: T, bytes: number): void {
    if (
      !Number.isSafeInteger(bytes) ||
      bytes < 0 ||
      this.items.length >= this.options.maximumMessages ||
      this.bytes + bytes > this.options.maximumBytes
    )
      throw new BybitLinearAdapterError(
        "WebSocket inbound queue bound exceeded.",
        "STALE",
        "BYBIT-08",
      );
    this.items.push({ value, bytes });
    this.bytes += bytes;
  }
  shift(): T | undefined {
    const item = this.items.shift();
    if (item === undefined) return undefined;
    this.bytes -= item.bytes;
    return item.value;
  }
  clear(): void {
    this.items.length = 0;
    this.bytes = 0;
  }
  size(): number {
    return this.items.length;
  }
}
