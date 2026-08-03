export type BybitLinearErrorKind =
  | "CONFIGURATION"
  | "SCHEMA"
  | "TRANSPORT"
  | "HTTP"
  | "BUSINESS"
  | "RATE_LIMIT"
  | "STALE"
  | "PRODUCT_REJECTED";

export class BybitLinearAdapterError extends Error {
  constructor(
    message: string,
    readonly kind: BybitLinearErrorKind,
    readonly sourceId: string,
  ) {
    super(message);
    this.name = "BybitLinearAdapterError";
  }
}

export class BybitLinearSchemaError extends BybitLinearAdapterError {
  constructor(message: string, sourceId = "BYBIT-01") {
    super(message, "SCHEMA", sourceId);
    this.name = "BybitLinearSchemaError";
  }
}

export class BybitLinearRateLimitError extends BybitLinearAdapterError {
  constructor(message: string) {
    super(message, "RATE_LIMIT", "BYBIT-09");
    this.name = "BybitLinearRateLimitError";
  }
}
