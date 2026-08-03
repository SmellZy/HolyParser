import {
  DeterministicOrderBook,
  type ApplyResult,
  type BookDelta,
  type BookSnapshot,
  type ExecutableBookView,
  type Timestamp,
} from "@arbitrage/market-data";
import { BYBIT_LINEAR_PRODUCT_GROUP, BYBIT_LINEAR_VENUE } from "./constants.js";
import { BybitLinearSchemaError } from "./errors.js";
import type { BybitFreshnessPolicy } from "./freshness.js";
import {
  mapWsBook,
  type BybitInstrumentBinding,
  type BybitObservationTimes,
} from "./mapping.js";
import type { BybitEventSink, BybitMetricSink } from "./observability.js";
import { metricLabels } from "./observability.js";
import type { BybitWsBookWire } from "./wire.js";

export type BybitBookSessionState =
  "UNINITIALIZED" | "READY" | "GAPPED" | "STALE" | "STOPPED";
export type BybitSessionOutcome =
  | "INITIALIZED"
  | "APPLIED"
  | "REPLACED"
  | "RECOVERED"
  | "DUPLICATE_REJECTED"
  | "REJECTED_UNINITIALIZED"
  | "GAP_DETECTED"
  | "REJECTED_STALE";
export interface BybitSessionResult {
  readonly outcome: BybitSessionOutcome;
  readonly state: BybitBookSessionState;
  readonly reason?: string;
}

export class BybitOrderBookSession {
  private readonly book: DeterministicOrderBook;
  private stateValue: BybitBookSessionState = "UNINITIALIZED";
  private lastUpdateId?: bigint;
  private lastSequence?: bigint;
  private lastAcceptedReceive?: Timestamp;
  private latestSnapshot?: BookSnapshot;
  private readonly acceptedDeltas: BookDelta[] = [];
  constructor(
    private readonly binding: BybitInstrumentBinding,
    private readonly expectedTopic: string,
    private readonly freshness: BybitFreshnessPolicy,
    private readonly metricSink?: BybitMetricSink,
    private readonly eventSink?: BybitEventSink,
  ) {
    this.book = new DeterministicOrderBook({
      instrumentId: binding.instrumentId,
      venue: BYBIT_LINEAR_VENUE,
      productGroup: BYBIT_LINEAR_PRODUCT_GROUP,
      channel: "BYBIT_V5_LINEAR_ORDERBOOK",
      strategy: "SNAPSHOT_PLUS_DELTA",
      sequencePolicy: "NONE",
    });
  }
  apply(
    wire: BybitWsBookWire,
    times: BybitObservationTimes,
  ): BybitSessionResult {
    if (this.stateValue === "STOPPED")
      return this.result("REJECTED_STALE", "Session is stopped.");
    if (wire.topic !== this.expectedTopic)
      return this.gap(
        "Topic does not match the subscribed linear order book.",
        times,
      );
    const currentU = BigInt(wire.updateId);
    const currentSeq = BigInt(wire.sequence);
    if (wire.updateId === "1") {
      if (wire.type !== "snapshot")
        return this.gap("u=1 restart is not a snapshot.", times);
      this.metricSink?.increment(
        "market_data_restarts_total",
        metricLabels("WEBSOCKET_ORDER_BOOK_SNAPSHOT", "RECONNECTING"),
      );
      return this.applySnapshot(wire, times, true);
    }
    if (wire.type === "snapshot")
      return this.applySnapshot(
        wire,
        times,
        this.stateValue !== "UNINITIALIZED",
      );
    if (this.stateValue === "UNINITIALIZED")
      return this.result(
        "REJECTED_UNINITIALIZED",
        "Initial snapshot is required.",
      );
    if (this.stateValue !== "READY")
      return this.result(
        "REJECTED_STALE",
        "Validated replacement snapshot is required.",
      );
    if (this.lastUpdateId === undefined || this.lastSequence === undefined)
      return this.gap("Sequence state is missing.", times);
    if (currentU <= this.lastUpdateId && currentSeq <= this.lastSequence) {
      this.metricSink?.increment(
        "market_data_duplicate_updates_total",
        metricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "HEALTHY"),
      );
      return this.result("DUPLICATE_REJECTED", "Duplicate or older update.");
    }
    if (currentU <= this.lastUpdateId || currentSeq <= this.lastSequence)
      return this.gap("u and seq ordering is contradictory.", times);
    const mapped = mapWsBook(
      wire,
      this.binding,
      times,
      "DELTA",
      this.freshness,
    ) as BookDelta;
    const result = this.book.apply(mapped);
    if (
      result.outcome === "INVALID_BOOK" ||
      this.book.executableView() === undefined
    )
      return this.gap(
        "Delta produced an invalid, locked or crossed book.",
        times,
      );
    this.lastUpdateId = currentU;
    this.lastSequence = currentSeq;
    this.lastAcceptedReceive = times.receiveTimestamp;
    this.acceptedDeltas.push(mapped);
    return this.result("APPLIED");
  }
  markTransportGap(
    reason: "QUEUE_OVERFLOW" | "MESSAGE_OVERFLOW" | "DISCONNECT",
    occurredAt: Timestamp,
  ): BybitSessionResult {
    if (this.stateValue === "STOPPED")
      return this.result("REJECTED_STALE", "Session is stopped.");
    this.stateValue = reason === "DISCONNECT" ? "STALE" : "GAPPED";
    this.metricSink?.increment(
      "market_data_sequence_gaps_total",
      metricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
    );
    this.eventSink?.emit({
      type: "BYBIT_BOOK_TRUST_REVOKED",
      occurredAt,
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "STALE",
      reasonCode:
        reason === "QUEUE_OVERFLOW" ? "QUEUE_OVERFLOW" : "TRANSPORT_GAP",
    });
    return this.result("GAP_DETECTED", reason);
  }
  stop(occurredAt: Timestamp): void {
    this.markTransportGap("DISCONNECT", occurredAt);
    this.stateValue = "STOPPED";
  }
  executableView(): ExecutableBookView | undefined {
    return this.stateValue === "READY" ? this.book.executableView() : undefined;
  }
  readLatestSnapshot(): BookSnapshot {
    if (this.latestSnapshot === undefined)
      throw new BybitLinearSchemaError(
        "No validated WebSocket snapshot is available.",
        "BYBIT-06",
      );
    return this.latestSnapshot;
  }
  drainAcceptedDeltas(): readonly BookDelta[] {
    const result = Object.freeze([...this.acceptedDeltas]);
    this.acceptedDeltas.length = 0;
    return result;
  }
  state(): Readonly<{
    state: BybitBookSessionState;
    lastUpdateId?: bigint;
    lastSequence?: bigint;
    lastAcceptedReceive?: Timestamp;
  }> {
    return Object.freeze({
      state: this.stateValue,
      ...(this.lastUpdateId === undefined
        ? {}
        : { lastUpdateId: this.lastUpdateId }),
      ...(this.lastSequence === undefined
        ? {}
        : { lastSequence: this.lastSequence }),
      ...(this.lastAcceptedReceive === undefined
        ? {}
        : { lastAcceptedReceive: this.lastAcceptedReceive }),
    });
  }
  private applySnapshot(
    wire: BybitWsBookWire,
    times: BybitObservationTimes,
    replacement: boolean,
  ): BybitSessionResult {
    const recovering =
      this.stateValue === "GAPPED" || this.stateValue === "STALE";
    const mapped = mapWsBook(
      wire,
      this.binding,
      times,
      replacement || recovering ? "REPLACEMENT" : "INITIAL",
      this.freshness,
    ) as BookSnapshot;
    const result: ApplyResult = this.book.apply(mapped);
    if (
      result.outcome === "INVALID_BOOK" ||
      this.book.executableView() === undefined
    )
      return this.gap(
        "Snapshot is invalid, locked, crossed or non-healthy.",
        times,
      );
    const view = this.book.executableView();
    if (view === undefined) {
      return this.gap("Snapshot did not produce executable output.", times);
    }
    this.lastUpdateId = BigInt(wire.updateId);
    this.lastSequence = BigInt(wire.sequence);
    this.lastAcceptedReceive = times.receiveTimestamp;
    this.stateValue = "READY";
    this.acceptedDeltas.length = 0;
    this.latestSnapshot = Object.freeze({
      kind: "SNAPSHOT",
      instrumentId: this.binding.instrumentId,
      updateId: mapped.updateId,
      bids: view.bids,
      asks: view.asks,
      context: mapped.context,
    });
    const outcome = recovering
      ? "RECOVERED"
      : replacement
        ? "REPLACED"
        : "INITIALIZED";
    this.metricSink?.increment(
      outcome === "RECOVERED"
        ? "market_data_recoveries_total"
        : "market_data_snapshot_initializations_total",
      metricLabels("WEBSOCKET_ORDER_BOOK_SNAPSHOT", "HEALTHY"),
    );
    return this.result(outcome);
  }
  private gap(
    reason: string,
    times: BybitObservationTimes,
  ): BybitSessionResult {
    this.stateValue = "GAPPED";
    this.metricSink?.increment(
      "market_data_sequence_gaps_total",
      metricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
    );
    this.eventSink?.emit({
      type: "BYBIT_BOOK_GAPPED",
      occurredAt: times.processingTimestamp,
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "STALE",
      reasonCode: "SEQUENCE_ORDER",
    });
    return this.result("GAP_DETECTED", reason);
  }
  private result(
    outcome: BybitSessionOutcome,
    reason?: string,
  ): BybitSessionResult {
    return Object.freeze({
      outcome,
      state: this.stateValue,
      ...(reason === undefined ? {} : { reason }),
    });
  }
}
