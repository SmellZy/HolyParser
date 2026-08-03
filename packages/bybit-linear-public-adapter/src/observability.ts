import type {
  PublicCapabilityName,
  QualityState,
  Timestamp,
} from "@arbitrage/market-data";
import { BYBIT_LINEAR_PRODUCT_GROUP, BYBIT_LINEAR_VENUE } from "./constants.js";

export type BybitMetricName =
  | "market_data_messages_total"
  | "market_data_parse_failures_total"
  | "market_data_schema_rejections_total"
  | "market_data_product_rejections_total"
  | "market_data_snapshot_initializations_total"
  | "market_data_duplicate_updates_total"
  | "market_data_sequence_gaps_total"
  | "market_data_stale_transitions_total"
  | "market_data_restarts_total"
  | "market_data_recoveries_total"
  | "market_data_reconnects_total"
  | "market_data_resubscriptions_total"
  | "market_data_queue_overflows_total"
  | "market_data_response_overflows_total"
  | "market_data_rate_limits_total"
  | "market_data_server_time_quality_total"
  | "market_data_invalid_books_total"
  | "market_data_canary_results_total";
export interface BybitMetricLabels {
  readonly venue: string;
  readonly productGroup: string;
  readonly capability: PublicCapabilityName;
  readonly quality: QualityState;
}
export interface BybitMetricSink {
  increment(name: BybitMetricName, labels: BybitMetricLabels): void;
  observe?(
    name: "market_data_receive_lag_ms" | "market_data_processing_lag_ms",
    value: bigint,
    labels: BybitMetricLabels,
  ): void;
}
export type BybitReasonCode =
  | "PARSE"
  | "SCHEMA"
  | "PRODUCT_CATEGORY"
  | "DUPLICATE"
  | "SEQUENCE_ORDER"
  | "TRANSPORT_GAP"
  | "STALE"
  | "RESTART"
  | "RECOVERY"
  | "RECONNECT"
  | "RESUBSCRIBE"
  | "QUEUE_OVERFLOW"
  | "RESPONSE_OVERFLOW"
  | "RATE_LIMIT"
  | "TIME_QUALITY"
  | "INVALID_BOOK"
  | "CANARY";
export interface BybitStructuredEvent {
  readonly type: string;
  readonly occurredAt: Timestamp;
  readonly capability: PublicCapabilityName;
  readonly state: QualityState;
  readonly reasonCode: BybitReasonCode;
}
export interface BybitEventSink {
  emit(event: BybitStructuredEvent): void;
}
export function metricLabels(
  capability: PublicCapabilityName,
  quality: QualityState,
): BybitMetricLabels {
  return Object.freeze({
    venue: BYBIT_LINEAR_VENUE,
    productGroup: BYBIT_LINEAR_PRODUCT_GROUP,
    capability,
    quality,
  });
}
