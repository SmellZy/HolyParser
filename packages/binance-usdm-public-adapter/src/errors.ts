export type BinanceUsdmErrorKind =
  | "CONFIGURATION"
  | "SCHEMA"
  | "NETWORK"
  | "RATE_LIMIT"
  | "PRODUCT_FAMILY"
  | "STALE";

export class BinanceUsdmAdapterError extends Error {
  constructor(
    message: string,
    readonly kind: BinanceUsdmErrorKind,
    readonly sourceId?: string,
  ) {
    super(message);
    this.name = "BinanceUsdmAdapterError";
  }
}

export class BinanceUsdmSchemaError extends BinanceUsdmAdapterError {
  constructor(message: string, sourceId = "BNFUT-01") {
    super(message, "SCHEMA", sourceId);
    this.name = "BinanceUsdmSchemaError";
  }
}

export class BinanceUsdmRateLimitError extends BinanceUsdmAdapterError {
  constructor(
    message: string,
    readonly status: 418 | 429 | "LOCAL",
  ) {
    super(message, "RATE_LIMIT", "BNFUT-05");
    this.name = "BinanceUsdmRateLimitError";
  }
}

export class BinanceUsdmQueueOverflowError extends BinanceUsdmAdapterError {
  constructor(message: string) {
    super(message, "STALE", "BNFUT-11");
    this.name = "BinanceUsdmQueueOverflowError";
  }
}
