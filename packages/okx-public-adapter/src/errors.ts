export class OkxAdapterError extends Error {
  constructor(
    message: string,
    readonly category:
      | "CONFIGURATION"
      | "TRANSPORT"
      | "RATE_LIMIT"
      | "SCHEMA"
      | "REMOTE"
      | "DATA_QUALITY",
    readonly sourceId: string,
  ) {
    super(message);
    this.name = "OkxAdapterError";
  }
}

export class OkxSchemaError extends OkxAdapterError {
  constructor(message: string, sourceId = "OKX-01") {
    super(message, "SCHEMA", sourceId);
    this.name = "OkxSchemaError";
  }
}

export class OkxRateLimitError extends OkxAdapterError {
  constructor(
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message, "RATE_LIMIT", "OKX-01");
    this.name = "OkxRateLimitError";
  }
}

export class OkxQueueOverflowError extends OkxAdapterError {
  constructor(message: string) {
    super(message, "DATA_QUALITY", "OKX-01");
    this.name = "OkxQueueOverflowError";
  }
}
