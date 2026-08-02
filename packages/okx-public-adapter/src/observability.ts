import type {
  PublicCapabilityName,
  QualityState,
  Timestamp,
} from "@arbitrage/market-data";

export type OkxStructuredEventType =
  | "OKX_MESSAGE_RECEIVED"
  | "OKX_PARSE_FAILED"
  | "OKX_RATE_LIMITED"
  | "OKX_QUEUE_OVERFLOW"
  | "OKX_BOOK_DEGRADED"
  | "OKX_BOOK_STALE"
  | "OKX_INVALID_BOOK"
  | "OKX_BOOK_RECOVERED"
  | "OKX_RECONNECT_SCHEDULED"
  | "OKX_RESUBSCRIBED"
  | "OKX_SERVICE_UPGRADE"
  | "OKX_MAINTENANCE_SEQUENCE_RESET"
  | "OKX_CANARY_SUCCEEDED"
  | "OKX_CANARY_FAILED"
  | "OKX_SERVER_TIME_DEGRADED";

export interface OkxStructuredEvent {
  readonly type: OkxStructuredEventType;
  readonly occurredAt: Timestamp;
  readonly capability: PublicCapabilityName;
  readonly state?: QualityState;
  readonly reason?: string;
  readonly attempt?: number;
}

export interface OkxEventSink {
  emit(event: OkxStructuredEvent): void;
}

export class RecordingOkxEventSink implements OkxEventSink {
  readonly events: OkxStructuredEvent[] = [];

  emit(event: OkxStructuredEvent): void {
    this.events.push(Object.freeze({ ...event }));
  }
}

export type OkxMetricName =
  | "market_data_messages_total"
  | "market_data_parse_failures_total"
  | "market_data_sequence_gaps_total"
  | "market_data_duplicate_updates_total"
  | "market_data_stale_transitions_total"
  | "market_data_recoveries_total"
  | "market_data_reconnects_total"
  | "market_data_queue_overflows_total"
  | "market_data_rate_limits_total"
  | "market_data_invalid_books_total"
  | "market_data_canary_outcomes_total"
  | "market_data_last_successful_observation_timestamp"
  | "market_data_receive_lag_milliseconds"
  | "market_data_processing_lag_milliseconds";

export interface OkxMetricLabels {
  readonly venue: "OKX_EXCHANGE";
  readonly productGroup: "OKX_V5_SWAP_FUTURES";
  readonly capability: PublicCapabilityName;
  readonly state?: QualityState;
}

export interface OkxMetricSink {
  increment(name: OkxMetricName, labels: OkxMetricLabels): void;
  observe(name: OkxMetricName, value: bigint, labels: OkxMetricLabels): void;
}

export class RecordingOkxMetricSink implements OkxMetricSink {
  private readonly values = new Map<string, bigint>();
  private readonly observations = new Map<string, bigint[]>();

  increment(name: OkxMetricName, labels: OkxMetricLabels): void {
    const key = JSON.stringify([name, labels]);
    this.values.set(key, (this.values.get(key) ?? 0n) + 1n);
  }

  value(name: OkxMetricName, labels: OkxMetricLabels): bigint {
    return this.values.get(JSON.stringify([name, labels])) ?? 0n;
  }

  observe(name: OkxMetricName, value: bigint, labels: OkxMetricLabels): void {
    const key = JSON.stringify([name, labels]);
    const values = this.observations.get(key) ?? [];
    values.push(value);
    this.observations.set(key, values);
  }

  observed(
    name: OkxMetricName,
    labels: OkxMetricLabels,
  ): ReadonlyArray<bigint> {
    return [...(this.observations.get(JSON.stringify([name, labels])) ?? [])];
  }
}

export function okxMetricLabels(
  capability: PublicCapabilityName,
  state?: QualityState,
): OkxMetricLabels {
  return Object.freeze({
    venue: "OKX_EXCHANGE",
    productGroup: "OKX_V5_SWAP_FUTURES",
    capability,
    ...(state === undefined ? {} : { state }),
  });
}
