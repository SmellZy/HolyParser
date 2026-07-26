import type { ProductGroup, Venue } from "./identifiers.js";
import type { QualityState, Timestamp } from "./quality.js";

export const metricNames = [
  "market_data_adapter_state",
  "market_data_messages_total",
  "market_data_parse_failures_total",
  "market_data_sequence_gaps_total",
  "market_data_duplicate_updates_total",
  "market_data_stale_transitions_total",
  "market_data_recoveries_total",
  "market_data_invalid_books_total",
  "market_data_last_successful_observation_timestamp",
  "market_data_receive_lag_milliseconds",
  "market_data_processing_lag_milliseconds",
] as const;

export type MetricName = (typeof metricNames)[number];

export interface MetricContract {
  readonly name: MetricName;
  readonly type: "COUNTER" | "GAUGE" | "HISTOGRAM";
  readonly unit: "COUNT" | "STATE" | "MILLISECONDS" | "EPOCH_SECONDS";
  readonly allowedDimensions: ReadonlyArray<
    "venue" | "product_group" | "capability" | "state"
  >;
}

export const marketDataMetricContracts: ReadonlyArray<MetricContract> = [
  {
    name: "market_data_adapter_state",
    type: "GAUGE",
    unit: "STATE",
    allowedDimensions: ["venue", "product_group", "state"],
  },
  {
    name: "market_data_messages_total",
    type: "COUNTER",
    unit: "COUNT",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_parse_failures_total",
    type: "COUNTER",
    unit: "COUNT",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_sequence_gaps_total",
    type: "COUNTER",
    unit: "COUNT",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_duplicate_updates_total",
    type: "COUNTER",
    unit: "COUNT",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_stale_transitions_total",
    type: "COUNTER",
    unit: "COUNT",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_recoveries_total",
    type: "COUNTER",
    unit: "COUNT",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_invalid_books_total",
    type: "COUNTER",
    unit: "COUNT",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_last_successful_observation_timestamp",
    type: "GAUGE",
    unit: "EPOCH_SECONDS",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_receive_lag_milliseconds",
    type: "HISTOGRAM",
    unit: "MILLISECONDS",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
  {
    name: "market_data_processing_lag_milliseconds",
    type: "HISTOGRAM",
    unit: "MILLISECONDS",
    allowedDimensions: ["venue", "product_group", "capability"],
  },
];

export type MarketDataEventType =
  | "ADAPTER_STATE_CHANGED"
  | "MESSAGE_RECEIVED"
  | "PARSE_FAILED"
  | "SEQUENCE_GAP_DETECTED"
  | "DUPLICATE_UPDATE_REJECTED"
  | "STALE_TRANSITION"
  | "BOOK_RECOVERED"
  | "INVALID_BOOK_DETECTED"
  | "OBSERVATION_SUCCEEDED";

export interface MarketDataStructuredEvent {
  readonly type: MarketDataEventType;
  readonly occurredAt: Timestamp;
  readonly venue: Venue;
  readonly productGroup: ProductGroup;
  readonly channel: string;
  readonly state?: QualityState;
  readonly reason?: string;
  readonly updateId?: string;
  readonly previousUpdateId?: string;
}

export interface MarketDataEventSink {
  emit(event: MarketDataStructuredEvent): void;
}

export class RecordingEventSink implements MarketDataEventSink {
  readonly events: MarketDataStructuredEvent[] = [];

  emit(event: MarketDataStructuredEvent): void {
    this.events.push(Object.freeze({ ...event }));
  }
}
