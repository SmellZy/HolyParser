import type {
  PublicCapabilityName,
  QualityState,
  Timestamp,
} from "@arbitrage/market-data";

export type BinanceUsdmStructuredEventType =
  | "BINANCE_USDM_CONNECTION_STATE"
  | "BINANCE_USDM_MESSAGE_RECEIVED"
  | "BINANCE_USDM_PARSE_FAILED"
  | "BINANCE_USDM_SCHEMA_REJECTED"
  | "BINANCE_USDM_PRODUCT_REJECTED"
  | "BINANCE_USDM_SEQUENCE_GAP"
  | "BINANCE_USDM_DUPLICATE_OLD"
  | "BINANCE_USDM_STALE"
  | "BINANCE_USDM_SNAPSHOT_INITIALIZED"
  | "BINANCE_USDM_RECOVERED"
  | "BINANCE_USDM_RECONNECT"
  | "BINANCE_USDM_RESUBSCRIBED"
  | "BINANCE_USDM_QUEUE_OVERFLOW"
  | "BINANCE_USDM_RESPONSE_OVERFLOW"
  | "BINANCE_USDM_RATE_LIMITED"
  | "BINANCE_USDM_SERVER_TIME_QUALITY"
  | "BINANCE_USDM_INVALID_BOOK"
  | "BINANCE_USDM_CANARY_RESULT";

export interface BinanceUsdmStructuredEvent {
  readonly type: BinanceUsdmStructuredEventType;
  readonly occurredAt: Timestamp;
  readonly capability: PublicCapabilityName;
  readonly state?: QualityState;
  readonly reasonCode?:
    | "NETWORK"
    | "SCHEMA"
    | "PRODUCT_FAMILY"
    | "SEQUENCE"
    | "FRESHNESS"
    | "CAPACITY"
    | "RATE_LIMIT"
    | "BOOK_INTEGRITY"
    | "EXTERNAL";
  readonly attempt?: number;
}

export interface BinanceUsdmEventSink {
  emit(event: BinanceUsdmStructuredEvent): void;
}

export class RecordingBinanceUsdmEventSink implements BinanceUsdmEventSink {
  readonly events: BinanceUsdmStructuredEvent[] = [];

  emit(event: BinanceUsdmStructuredEvent): void {
    this.events.push(Object.freeze({ ...event }));
  }
}

export type BinanceUsdmMetricName =
  | "market_data_adapter_state"
  | "market_data_messages_total"
  | "market_data_parse_failures_total"
  | "market_data_schema_rejections_total"
  | "market_data_product_rejections_total"
  | "market_data_sequence_gaps_total"
  | "market_data_duplicate_updates_total"
  | "market_data_stale_transitions_total"
  | "market_data_snapshot_initializations_total"
  | "market_data_recoveries_total"
  | "market_data_reconnects_total"
  | "market_data_resubscriptions_total"
  | "market_data_queue_overflows_total"
  | "market_data_response_overflows_total"
  | "market_data_rate_limits_total"
  | "market_data_server_time_quality_total"
  | "market_data_invalid_books_total"
  | "market_data_canary_outcomes_total"
  | "market_data_last_successful_observation_timestamp"
  | "market_data_receive_lag_milliseconds"
  | "market_data_processing_lag_milliseconds";

export interface BinanceUsdmMetricLabels {
  readonly venue: "BINANCE_FUTURES";
  readonly productGroup: "BINANCE_USDM_FUTURES";
  readonly capability: PublicCapabilityName;
  readonly state?: QualityState;
}

export interface BinanceUsdmMetricSink {
  increment(name: BinanceUsdmMetricName, labels: BinanceUsdmMetricLabels): void;
  observe(
    name: BinanceUsdmMetricName,
    value: bigint,
    labels: BinanceUsdmMetricLabels,
  ): void;
}

export function binanceUsdmMetricLabels(
  capability: PublicCapabilityName,
  state?: QualityState,
): BinanceUsdmMetricLabels {
  return Object.freeze({
    venue: "BINANCE_FUTURES",
    productGroup: "BINANCE_USDM_FUTURES",
    capability,
    ...(state === undefined ? {} : { state }),
  });
}

export class RecordingBinanceUsdmMetricSink implements BinanceUsdmMetricSink {
  private readonly counters = new Map<string, bigint>();
  private readonly observations = new Map<string, bigint[]>();

  increment(
    name: BinanceUsdmMetricName,
    labels: BinanceUsdmMetricLabels,
  ): void {
    const key = JSON.stringify([name, labels]);
    this.counters.set(key, (this.counters.get(key) ?? 0n) + 1n);
  }

  observe(
    name: BinanceUsdmMetricName,
    value: bigint,
    labels: BinanceUsdmMetricLabels,
  ): void {
    const key = JSON.stringify([name, labels]);
    const values = this.observations.get(key) ?? [];
    values.push(value);
    this.observations.set(key, values);
  }

  value(name: BinanceUsdmMetricName, labels: BinanceUsdmMetricLabels): bigint {
    return this.counters.get(JSON.stringify([name, labels])) ?? 0n;
  }

  observed(
    name: BinanceUsdmMetricName,
    labels: BinanceUsdmMetricLabels,
  ): ReadonlyArray<bigint> {
    return [...(this.observations.get(JSON.stringify([name, labels])) ?? [])];
  }
}
