import {
  DeterministicOrderBook,
  type ApplyResult,
  type BookDelta,
  type BookSnapshot,
  type BookUpdate,
  type ExecutableBookView,
  type Timestamp,
} from "@arbitrage/market-data";
import { OKX_LIMITS, OKX_PRODUCT_GROUP, OKX_VENUE } from "./constants.js";
import { OkxSchemaError } from "./errors.js";
import {
  assertOkxFreshnessConfiguration,
  observationLags,
  qualityForExchangeTimestamp,
  type OkxFreshnessConfiguration,
} from "./freshness.js";
import {
  mapWebSocketBookEvent,
  type OkxInstrumentBinding,
  type OkxObservationTimes,
} from "./mapping.js";
import {
  okxMetricLabels,
  type OkxEventSink,
  type OkxMetricSink,
} from "./observability.js";
import { parseJsonPreservingSequenceIds } from "./runtime-schema.js";
import { epochMilliseconds } from "./time.js";
import { parseWebSocketMessage, type OkxWebSocketMessage } from "./wire.js";

export type OkxSessionOutcome =
  | {
      readonly kind: "BOOK";
      readonly result: ApplyResult;
    }
  | {
      readonly kind:
        "HEARTBEAT" | "SUBSCRIPTION" | "PONG" | "RECONNECT_REQUIRED";
      readonly reason?: string;
    };

export interface OkxBookSessionOptions {
  readonly binding: OkxInstrumentBinding;
  readonly eventSink?: OkxEventSink;
  readonly metricSink?: OkxMetricSink;
  readonly maximumMessageBytes?: number;
  readonly freshness: OkxFreshnessConfiguration;
}

export class OkxBookSession {
  private readonly machine: DeterministicOrderBook;
  private readonly maximumMessageBytes: number;
  private trustedTransport = true;
  private requiresReplacement = false;
  private freshnessQuality: "HEALTHY" | "DEGRADED" | "STALE" = "HEALTHY";
  private latestBookSnapshot?: BookSnapshot;
  private readonly acceptedDeltas: BookDelta[] = [];

  constructor(private readonly options: OkxBookSessionOptions) {
    assertOkxFreshnessConfiguration(options.freshness, "books");
    this.maximumMessageBytes =
      options.maximumMessageBytes ?? OKX_LIMITS.websocketMessageBytes;
    this.machine = new DeterministicOrderBook({
      instrumentId: options.binding.instrumentId,
      venue: OKX_VENUE,
      productGroup: OKX_PRODUCT_GROUP,
      channel: "books",
      strategy: "SEQUENCE_CHAINED_DELTA",
      sequencePolicy: "PREVIOUS_ID_CHAIN",
    });
  }

  processText(
    text: string,
    times: OkxObservationTimes,
  ): ReadonlyArray<OkxSessionOutcome> {
    this.options.metricSink?.increment(
      "market_data_messages_total",
      okxMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA"),
    );
    this.options.eventSink?.emit({
      type: "OKX_MESSAGE_RECEIVED",
      occurredAt: times.processingTimestamp,
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
    });

    try {
      let message: OkxWebSocketMessage;
      if (text === "pong") {
        message = { kind: "PONG" };
      } else {
        const raw = parseJsonPreservingSequenceIds(
          text,
          this.maximumMessageBytes,
        );
        message = parseWebSocketMessage(raw);
      }
      return this.processMessage(message, times);
    } catch (error) {
      this.markStale(
        error instanceof Error ? error.message : "Unknown schema error.",
        times.processingTimestamp,
        "OKX_PARSE_FAILED",
      );
      this.options.metricSink?.increment(
        "market_data_parse_failures_total",
        okxMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
      );
      throw error;
    }
  }

  processMessage(
    message: OkxWebSocketMessage,
    times: OkxObservationTimes,
  ): ReadonlyArray<OkxSessionOutcome> {
    if (message.kind === "PONG") {
      return [{ kind: "PONG" }];
    }
    if (message.kind === "ERROR") {
      this.markStale(
        `OKX WebSocket error ${message.code}: ${message.msg}`,
        times.processingTimestamp,
      );
      return [
        {
          kind: "RECONNECT_REQUIRED",
          reason: `OKX WebSocket error ${message.code}.`,
        },
      ];
    }
    if (message.kind === "NOTICE") {
      this.markStale(
        "OKX service-upgrade notice requires a new connection.",
        times.processingTimestamp,
        "OKX_SERVICE_UPGRADE",
      );
      return [
        {
          kind: "RECONNECT_REQUIRED",
          reason: "OKX service-upgrade notice 64008.",
        },
      ];
    }
    if (message.kind === "SUBSCRIPTION") {
      if (message.code !== undefined && message.code !== "0") {
        this.markStale(
          `OKX subscription acknowledgement failed with code ${message.code}.`,
          times.processingTimestamp,
        );
        return [
          {
            kind: "RECONNECT_REQUIRED",
            reason: `OKX subscription acknowledgement failed with code ${message.code}.`,
          },
        ];
      }
      if (
        message.channel !== "books" ||
        message.instId !== this.options.binding.wire.instId
      ) {
        throw new OkxSchemaError(
          "OKX subscription acknowledgement does not match the bound book.",
        );
      }
      return [{ kind: "SUBSCRIPTION" }];
    }
    if (message.instId !== this.options.binding.wire.instId) {
      throw new OkxSchemaError(
        "OKX books message does not match the bound official instrument ID.",
      );
    }

    const outcomes: OkxSessionOutcome[] = [];
    for (const row of message.data) {
      const lastUpdateId = this.machine.state().lastUpdateId;
      const isNoUpdateHeartbeat =
        message.action === "update" &&
        row.asks.length === 0 &&
        row.bids.length === 0 &&
        row.seqId === row.prevSeqId &&
        lastUpdateId?.toString() === row.seqId;

      if (isNoUpdateHeartbeat) {
        if (row.checksum !== "0") {
          throw new OkxSchemaError(
            "OKX JSON books checksum is deprecated and must be fixed to zero.",
            "OKX-03",
          );
        }
        const exchangeTimestamp = epochMilliseconds(row.ts, "books.ts");
        const heartbeatQuality = qualityForExchangeTimestamp(
          exchangeTimestamp,
          times.receiveTimestamp,
          this.options.freshness,
        );
        if (heartbeatQuality === "STALE") {
          this.markStale(
            "OKX heartbeat source timestamp is stale.",
            times.processingTimestamp,
          );
          outcomes.push({
            kind: "RECONNECT_REQUIRED",
            reason: "Stale OKX heartbeat source timestamp.",
          });
          continue;
        }
        if (heartbeatQuality === "DEGRADED") {
          this.markTransportDegraded(
            "OKX heartbeat source timestamp is degraded.",
            times.processingTimestamp,
          );
        } else {
          this.freshnessQuality = "HEALTHY";
        }
        this.recordSuccessfulObservation(
          exchangeTimestamp,
          times,
          "WEBSOCKET_ORDER_BOOK_DELTA",
        );
        outcomes.push({ kind: "HEARTBEAT" });
        continue;
      }

      const isMaintenanceReset =
        message.action === "update" &&
        BigInt(row.seqId) < BigInt(row.prevSeqId) &&
        lastUpdateId?.toString() === row.prevSeqId;
      if (isMaintenanceReset) {
        const resetUpdate = mapWebSocketBookEvent(
          message.action,
          row,
          this.options.binding,
          times,
          false,
          this.options.freshness,
        );
        if (resetUpdate.kind !== "DELTA") {
          throw new OkxSchemaError(
            "Maintenance reset must be an incremental update.",
          );
        }
        this.machine.apply({
          ...resetUpdate,
          context: { ...resetUpdate.context, quality: "GAPPED" },
        });
        this.markStale(
          "Documented OKX maintenance sequence reset requires conservative replacement recovery.",
          times.processingTimestamp,
          "OKX_MAINTENANCE_SEQUENCE_RESET",
        );
        this.options.metricSink?.increment(
          "market_data_sequence_gaps_total",
          okxMetricLabels("SEQUENCE_VALIDATION", "STALE"),
        );
        outcomes.push({
          kind: "RECONNECT_REQUIRED",
          reason: "Maintenance sequence reset.",
        });
        continue;
      }

      const update = mapWebSocketBookEvent(
        message.action,
        row,
        this.options.binding,
        times,
        this.requiresReplacement,
        this.options.freshness,
      );
      if (update.context.quality === "STALE") {
        this.markStale(
          "OKX book source timestamp is stale.",
          times.processingTimestamp,
        );
        outcomes.push({
          kind: "RECONNECT_REQUIRED",
          reason: "Stale OKX book source timestamp.",
        });
        continue;
      }
      const result = this.machine.apply(update);
      this.captureAcceptedUpdate(update, result);

      if (
        result.outcome === "GAP_DETECTED" ||
        result.outcome === "INVALID_BOOK"
      ) {
        this.trustedTransport = false;
        this.freshnessQuality = "STALE";
        this.requiresReplacement = true;
        this.options.metricSink?.increment(
          result.outcome === "GAP_DETECTED"
            ? "market_data_sequence_gaps_total"
            : "market_data_stale_transitions_total",
          okxMetricLabels("SEQUENCE_VALIDATION", "STALE"),
        );
        if (result.outcome === "INVALID_BOOK") {
          this.options.metricSink?.increment(
            "market_data_invalid_books_total",
            okxMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
          );
          this.options.eventSink?.emit({
            type: "OKX_INVALID_BOOK",
            occurredAt: times.processingTimestamp,
            capability: "WEBSOCKET_ORDER_BOOK_DELTA",
            state: "STALE",
            reason: result.reason,
          });
        }
      } else if (result.outcome === "DUPLICATE_REJECTED") {
        this.options.metricSink?.increment(
          "market_data_duplicate_updates_total",
          okxMetricLabels("SEQUENCE_VALIDATION"),
        );
      } else if (
        message.action === "snapshot" &&
        (result.outcome === "RECOVERED" ||
          result.outcome === "REPLACED" ||
          result.outcome === "INITIALIZED")
      ) {
        this.trustedTransport = true;
        this.freshnessQuality =
          update.context.quality === "DEGRADED" ? "DEGRADED" : "HEALTHY";
        this.requiresReplacement = false;
        if (result.outcome === "RECOVERED" || result.outcome === "REPLACED") {
          this.options.metricSink?.increment(
            "market_data_recoveries_total",
            okxMetricLabels("WEBSOCKET_ORDER_BOOK_SNAPSHOT", "HEALTHY"),
          );
          this.options.eventSink?.emit({
            type: "OKX_BOOK_RECOVERED",
            occurredAt: times.processingTimestamp,
            capability: "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
            state: "HEALTHY",
          });
        }
      }
      if (result.outcome === "APPLIED") {
        this.freshnessQuality =
          update.context.quality === "DEGRADED" ? "DEGRADED" : "HEALTHY";
      }
      if (
        result.outcome === "INITIALIZED" ||
        result.outcome === "APPLIED" ||
        result.outcome === "RECOVERED" ||
        result.outcome === "REPLACED"
      ) {
        this.recordSuccessfulObservation(
          update.context.exchangeTimestamp!,
          times,
          update.kind === "DELTA"
            ? "WEBSOCKET_ORDER_BOOK_DELTA"
            : "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
        );
      }

      outcomes.push({ kind: "BOOK", result });
    }
    return outcomes;
  }

  markTransportStale(reason: string, occurredAt: Timestamp): void {
    this.markStale(reason, occurredAt);
  }

  markTransportDegraded(reason: string, occurredAt: Timestamp): void {
    if (this.freshnessQuality !== "HEALTHY") {
      return;
    }
    this.freshnessQuality = "DEGRADED";
    this.options.eventSink?.emit({
      type: "OKX_BOOK_DEGRADED",
      occurredAt,
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "DEGRADED",
      reason,
    });
  }

  executableView(): ExecutableBookView | undefined {
    return this.trustedTransport && this.freshnessQuality === "HEALTHY"
      ? this.machine.executableView()
      : undefined;
  }

  readLatestSnapshot(): BookSnapshot {
    if (this.latestBookSnapshot === undefined) {
      throw new OkxSchemaError(
        "No validated OKX WebSocket snapshot is available.",
      );
    }
    return this.latestBookSnapshot;
  }

  drainAcceptedDeltas(): ReadonlyArray<BookDelta> {
    const result = this.acceptedDeltas.splice(0);
    return result;
  }

  state(): Readonly<{
    trustedTransport: boolean;
    requiresReplacement: boolean;
    freshnessQuality: "HEALTHY" | "DEGRADED" | "STALE";
    machine: ReturnType<DeterministicOrderBook["state"]>;
  }> {
    return Object.freeze({
      trustedTransport: this.trustedTransport,
      requiresReplacement: this.requiresReplacement,
      freshnessQuality: this.freshnessQuality,
      machine: this.machine.state(),
    });
  }

  freshnessConfiguration(): OkxFreshnessConfiguration {
    return this.options.freshness;
  }

  private markStale(
    reason: string,
    occurredAt: Timestamp,
    eventType:
      | "OKX_PARSE_FAILED"
      | "OKX_BOOK_STALE"
      | "OKX_SERVICE_UPGRADE"
      | "OKX_MAINTENANCE_SEQUENCE_RESET" = "OKX_BOOK_STALE",
  ): void {
    const changed = this.trustedTransport;
    this.trustedTransport = false;
    this.freshnessQuality = "STALE";
    this.requiresReplacement = true;
    this.options.eventSink?.emit({
      type: eventType,
      occurredAt,
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "STALE",
      reason,
    });
    if (changed) {
      this.options.metricSink?.increment(
        "market_data_stale_transitions_total",
        okxMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
      );
    }
  }

  private captureAcceptedUpdate(update: BookUpdate, result: ApplyResult): void {
    if (
      update.kind !== "DELTA" &&
      (result.outcome === "INITIALIZED" ||
        result.outcome === "APPLIED" ||
        result.outcome === "REPLACED" ||
        result.outcome === "RECOVERED")
    ) {
      this.latestBookSnapshot = Object.freeze({
        ...update,
        kind: "SNAPSHOT",
      });
      this.acceptedDeltas.length = 0;
      return;
    }
    if (update.kind === "DELTA" && result.outcome === "APPLIED") {
      if (this.acceptedDeltas.length >= OKX_LIMITS.queuedMessages) {
        throw new OkxSchemaError("The bounded accepted-delta buffer is full.");
      }
      this.acceptedDeltas.push(update);
    }
  }

  private recordSuccessfulObservation(
    exchangeTimestamp: Timestamp,
    times: OkxObservationTimes,
    capability: "WEBSOCKET_ORDER_BOOK_DELTA" | "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
  ): void {
    const lags = observationLags(
      exchangeTimestamp,
      times.receiveTimestamp,
      times.processingTimestamp,
    );
    const labels = okxMetricLabels(capability);
    this.options.metricSink?.observe(
      "market_data_receive_lag_milliseconds",
      lags.receiveLagMs,
      labels,
    );
    this.options.metricSink?.observe(
      "market_data_processing_lag_milliseconds",
      lags.processingLagMs,
      labels,
    );
    this.options.metricSink?.observe(
      "market_data_last_successful_observation_timestamp",
      lags.processingEpochSeconds,
      labels,
    );
  }
}
