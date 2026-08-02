import {
  DeterministicOrderBook,
  type ApplyResult,
  type BookDelta,
  type BookSnapshot,
  type BookUpdate,
  type ExecutableBookView,
  type Timestamp,
} from "@arbitrage/market-data";
import {
  BINANCE_USDM_LIMITS,
  BINANCE_USDM_PRODUCT_GROUP,
  BINANCE_USDM_VENUE,
} from "./constants.js";
import {
  BinanceUsdmAdapterError,
  BinanceUsdmQueueOverflowError,
} from "./errors.js";
import {
  assertFreshnessConfiguration,
  type BinanceUsdmFreshnessConfiguration,
} from "./freshness.js";
import {
  mapDiffDepth,
  type BinanceUsdmInstrumentBinding,
  type BinanceUsdmObservationTimes,
} from "./mapping.js";
import {
  binanceUsdmMetricLabels,
  type BinanceUsdmEventSink,
  type BinanceUsdmMetricSink,
} from "./observability.js";
import { BoundedMessageQueue } from "./queue.js";
import { parseJsonPreservingIntegers } from "./runtime-schema.js";
import { parseDiffDepth, type BinanceDiffDepthWire } from "./wire.js";

export type BinanceUsdmBookSessionState =
  "BUFFERING" | "AWAITING_BRIDGE" | "READY" | "GAPPED" | "STALE" | "STOPPED";

export type BinanceUsdmBookOutcome =
  | { readonly kind: "BUFFERED" }
  | { readonly kind: "OLD_REJECTED" }
  | { readonly kind: "SNAPSHOT_ACCEPTED"; readonly result: ApplyResult }
  | { readonly kind: "DELTA_ACCEPTED"; readonly result: ApplyResult }
  | { readonly kind: "GAP"; readonly result: ApplyResult }
  | { readonly kind: "RECOVERY_REQUIRED"; readonly reason: string };

export interface BinanceUsdmBookSessionOptions {
  readonly binding: BinanceUsdmInstrumentBinding;
  readonly freshness: BinanceUsdmFreshnessConfiguration;
  readonly maximumMessageBytes?: number;
  readonly maximumQueuedMessages?: number;
  readonly maximumQueuedBytes?: number;
  readonly eventSink?: BinanceUsdmEventSink;
  readonly metricSink?: BinanceUsdmMetricSink;
}

interface BufferedDelta {
  readonly update: BookDelta;
  readonly bytes: number;
}

export class BinanceUsdmBookSession {
  private readonly machine: DeterministicOrderBook;
  private readonly queue: BoundedMessageQueue<BufferedDelta>;
  private readonly maximumMessageBytes: number;
  private stateValue: BinanceUsdmBookSessionState = "BUFFERING";
  private bridgeAccepted = false;
  private snapshotBoundaryBridge = false;
  private recovery = false;
  private acceptedUpdates = 0n;
  private latestSnapshot?: BookSnapshot;
  private readonly acceptedDeltas: BookDelta[] = [];

  constructor(private readonly options: BinanceUsdmBookSessionOptions) {
    assertFreshnessConfiguration(options.freshness, "depth");
    this.maximumMessageBytes =
      options.maximumMessageBytes ?? BINANCE_USDM_LIMITS.websocketMessageBytes;
    this.queue = new BoundedMessageQueue(
      options.maximumQueuedMessages ?? BINANCE_USDM_LIMITS.queuedMessages,
      options.maximumQueuedBytes ?? BINANCE_USDM_LIMITS.queuedBytes,
    );
    this.machine = new DeterministicOrderBook({
      instrumentId: options.binding.instrumentId,
      venue: BINANCE_USDM_VENUE,
      productGroup: BINANCE_USDM_PRODUCT_GROUP,
      channel: "depth",
      strategy: "SNAPSHOT_PLUS_DELTA",
      sequencePolicy: "RANGE_WITH_PREVIOUS_ID",
    });
  }

  processText(
    text: string,
    times: BinanceUsdmObservationTimes,
  ): ReadonlyArray<BinanceUsdmBookOutcome> {
    this.options.metricSink?.increment(
      "market_data_messages_total",
      binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA"),
    );
    this.options.eventSink?.emit({
      type: "BINANCE_USDM_MESSAGE_RECEIVED",
      occurredAt: times.processingTimestamp,
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
    });
    try {
      const raw = parseJsonPreservingIntegers(text, this.maximumMessageBytes);
      const wire = parseDiffDepth(raw);
      const update = mapDiffDepth(
        wire,
        this.options.binding,
        times,
        this.options.freshness,
      );
      return this.acceptDelta(
        update,
        new TextEncoder().encode(text).byteLength,
      );
    } catch (error) {
      this.stateValue = "STALE";
      this.recovery = true;
      const productFamily =
        error instanceof BinanceUsdmAdapterError &&
        error.kind === "PRODUCT_FAMILY";
      this.options.metricSink?.increment(
        productFamily
          ? "market_data_product_rejections_total"
          : "market_data_parse_failures_total",
        binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
      );
      this.options.eventSink?.emit({
        type: productFamily
          ? "BINANCE_USDM_PRODUCT_REJECTED"
          : "BINANCE_USDM_PARSE_FAILED",
        occurredAt: times.processingTimestamp,
        capability: "WEBSOCKET_ORDER_BOOK_DELTA",
        state: "STALE",
        reasonCode: productFamily ? "PRODUCT_FAMILY" : "SCHEMA",
      });
      throw error;
    }
  }

  processWire(
    wire: BinanceDiffDepthWire,
    times: BinanceUsdmObservationTimes,
    bytes = 1,
  ): ReadonlyArray<BinanceUsdmBookOutcome> {
    return this.acceptDelta(
      mapDiffDepth(wire, this.options.binding, times, this.options.freshness),
      bytes,
    );
  }

  acceptSnapshot(
    snapshot: Extract<
      BookUpdate,
      { readonly kind: "SNAPSHOT" | "REPLACEMENT_SNAPSHOT" }
    >,
  ): ReadonlyArray<BinanceUsdmBookOutcome> {
    if (this.stateValue === "STOPPED") {
      throw new BinanceUsdmAdapterError(
        "Stopped book session cannot accept snapshots.",
        "STALE",
        "BNFUT-04",
      );
    }
    if (this.recovery && snapshot.kind !== "REPLACEMENT_SNAPSHOT") {
      return [
        {
          kind: "RECOVERY_REQUIRED",
          reason:
            "Gap recovery requires a replacement snapshot and replay cycle.",
        },
      ];
    }
    const result = this.machine.apply(snapshot);
    if (result.outcome === "INVALID_BOOK" || result.quality === "STALE") {
      this.stateValue = "STALE";
      this.recovery = true;
      this.emitInvalid(snapshot.context.processingTimestamp);
      return [{ kind: "SNAPSHOT_ACCEPTED", result }];
    }
    this.stateValue = "AWAITING_BRIDGE";
    this.latestSnapshot =
      snapshot.kind === "SNAPSHOT"
        ? snapshot
        : { ...snapshot, kind: "SNAPSHOT" };
    this.bridgeAccepted = false;
    this.snapshotBoundaryBridge = false;
    const outcomes: BinanceUsdmBookOutcome[] = [
      { kind: "SNAPSHOT_ACCEPTED", result },
    ];
    const snapshotId = snapshot.updateId;
    if (snapshotId === undefined) {
      this.enterStale(snapshot.context.processingTimestamp, "SEQUENCE");
      return outcomes;
    }

    let buffered = this.queue.shift();
    while (buffered !== undefined) {
      const delta = buffered.update;
      outcomes.push(...this.processBridgeCandidate(delta, snapshotId));
      const currentState = this.state().state;
      if (currentState === "GAPPED" || currentState === "STALE") {
        this.queue.clear();
        break;
      }
      buffered = this.queue.shift();
    }
    return Object.freeze(outcomes);
  }

  beginRecovery(): void {
    if (this.stateValue !== "GAPPED" && this.stateValue !== "STALE") {
      return;
    }
    this.queue.clear();
    this.recovery = true;
    this.bridgeAccepted = false;
    this.snapshotBoundaryBridge = false;
    this.stateValue = "BUFFERING";
  }

  markTransportStale(occurredAt: Timestamp): void {
    if (this.stateValue === "STOPPED") return;
    this.enterStale(occurredAt, "NETWORK");
    this.recovery = true;
  }

  stop(occurredAt: Timestamp): void {
    this.markTransportStale(occurredAt);
    this.queue.clear();
    this.stateValue = "STOPPED";
  }

  state(): Readonly<{
    state: BinanceUsdmBookSessionState;
    bridgeAccepted: boolean;
    recoveryRequired: boolean;
    acceptedUpdates: bigint;
    queuedMessages: number;
    queuedBytes: number;
  }> {
    const queued = this.queue.state();
    return Object.freeze({
      state: this.stateValue,
      bridgeAccepted: this.bridgeAccepted,
      recoveryRequired: this.recovery,
      acceptedUpdates: this.acceptedUpdates,
      queuedMessages: queued.messages,
      queuedBytes: queued.bytes,
    });
  }

  executableView(): ExecutableBookView | undefined {
    if (this.stateValue !== "READY" || !this.bridgeAccepted || this.recovery) {
      return undefined;
    }
    return this.machine.executableView();
  }

  readLatestSnapshot(): BookSnapshot {
    if (this.latestSnapshot === undefined) {
      throw new BinanceUsdmAdapterError(
        "No Binance USD-M REST snapshot has been accepted.",
        "STALE",
        "BNFUT-04",
      );
    }
    return this.latestSnapshot;
  }

  drainAcceptedDeltas(): ReadonlyArray<BookDelta> {
    const values = this.acceptedDeltas.splice(0, this.acceptedDeltas.length);
    return Object.freeze(values);
  }

  replayFingerprint(): string {
    const view = this.executableView();
    if (view === undefined) return `${this.stateValue}:NO_EXECUTABLE_OUTPUT`;
    const side = (levels: ExecutableBookView["bids"]) =>
      levels
        .map(
          (level) => `${level.price.toString()}@${level.quantity.toString()}`,
        )
        .join(",");
    return [
      this.stateValue,
      view.lastUpdateId?.toString() ?? "",
      side(view.bids),
      side(view.asks),
    ].join("|");
  }

  private acceptDelta(
    update: BookDelta,
    bytes: number,
  ): ReadonlyArray<BinanceUsdmBookOutcome> {
    if (this.stateValue === "STOPPED") {
      return [
        { kind: "RECOVERY_REQUIRED", reason: "Book session is stopped." },
      ];
    }
    if (update.context.quality === "STALE") {
      this.enterStale(update.context.processingTimestamp, "FRESHNESS");
      this.recovery = true;
      return [
        { kind: "RECOVERY_REQUIRED", reason: "Diff-depth timestamp is stale." },
      ];
    }
    if (this.stateValue === "BUFFERING") {
      try {
        this.queue.push({ update, bytes }, bytes);
      } catch (error) {
        if (error instanceof BinanceUsdmQueueOverflowError) {
          this.stateValue = "STALE";
          this.recovery = true;
          this.options.metricSink?.increment(
            "market_data_queue_overflows_total",
            binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
          );
          this.options.eventSink?.emit({
            type: "BINANCE_USDM_QUEUE_OVERFLOW",
            occurredAt: update.context.processingTimestamp,
            capability: "WEBSOCKET_ORDER_BOOK_DELTA",
            state: "STALE",
            reasonCode: "CAPACITY",
          });
        }
        throw error;
      }
      return [{ kind: "BUFFERED" }];
    }
    if (this.stateValue === "AWAITING_BRIDGE") {
      const snapshotId = this.latestSnapshot?.updateId;
      if (snapshotId === undefined) {
        this.enterStale(update.context.processingTimestamp, "SEQUENCE");
        this.recovery = true;
        return [
          {
            kind: "RECOVERY_REQUIRED",
            reason: "Snapshot sequence boundary is unavailable.",
          },
        ];
      }
      return this.processBridgeCandidate(update, snapshotId);
    }
    if (this.stateValue === "GAPPED" || this.stateValue === "STALE") {
      return [
        {
          kind: "RECOVERY_REQUIRED",
          reason: "A new REST snapshot and replay cycle is required.",
        },
      ];
    }
    return this.applyDelta(update);
  }

  private applyDelta(update: BookDelta): ReadonlyArray<BinanceUsdmBookOutcome> {
    let machineUpdate = update;
    if (this.snapshotBoundaryBridge) {
      const snapshotId = this.latestSnapshot?.updateId;
      if (snapshotId === undefined || update.previousUpdateId !== snapshotId) {
        return this.forceGap(update);
      }
      machineUpdate = Object.freeze({
        ...update,
        firstUpdateId: snapshotId,
      });
    }
    const result = this.machine.apply(machineUpdate);
    if (result.outcome === "DUPLICATE_REJECTED") {
      this.options.metricSink?.increment(
        "market_data_duplicate_updates_total",
        binanceUsdmMetricLabels("SEQUENCE_VALIDATION"),
      );
      this.options.eventSink?.emit({
        type: "BINANCE_USDM_DUPLICATE_OLD",
        occurredAt: update.context.processingTimestamp,
        capability: "SEQUENCE_VALIDATION",
        reasonCode: "SEQUENCE",
      });
      return [{ kind: "OLD_REJECTED" }];
    }
    if (result.outcome === "GAP_DETECTED") {
      this.stateValue = "GAPPED";
      this.recovery = true;
      this.options.metricSink?.increment(
        "market_data_sequence_gaps_total",
        binanceUsdmMetricLabels("SEQUENCE_VALIDATION", "STALE"),
      );
      this.options.eventSink?.emit({
        type: "BINANCE_USDM_SEQUENCE_GAP",
        occurredAt: update.context.processingTimestamp,
        capability: "SEQUENCE_VALIDATION",
        state: "STALE",
        reasonCode: "SEQUENCE",
      });
      return [{ kind: "GAP", result }];
    }
    if (result.outcome === "INVALID_BOOK" || result.quality === "STALE") {
      this.stateValue = "STALE";
      this.recovery = true;
      this.emitInvalid(update.context.processingTimestamp);
      return [{ kind: "DELTA_ACCEPTED", result }];
    }
    this.acceptedUpdates += 1n;
    this.acceptedDeltas.push(update);
    this.snapshotBoundaryBridge = false;
    if (!this.bridgeAccepted) {
      this.markBridgeAccepted(update.context.processingTimestamp);
    }
    this.stateValue = "READY";
    return [{ kind: "DELTA_ACCEPTED", result }];
  }

  private forceGap(update: BookDelta): ReadonlyArray<BinanceUsdmBookOutcome> {
    const result = this.machine.apply({
      ...update,
      context: { ...update.context, quality: "GAPPED" },
    });
    this.stateValue = "GAPPED";
    this.recovery = true;
    this.snapshotBoundaryBridge = false;
    this.options.metricSink?.increment(
      "market_data_sequence_gaps_total",
      binanceUsdmMetricLabels("SEQUENCE_VALIDATION", "STALE"),
    );
    this.options.eventSink?.emit({
      type: "BINANCE_USDM_SEQUENCE_GAP",
      occurredAt: update.context.processingTimestamp,
      capability: "SEQUENCE_VALIDATION",
      state: "STALE",
      reasonCode: "SEQUENCE",
    });
    return [{ kind: "GAP", result }];
  }

  private processBridgeCandidate(
    update: BookDelta,
    snapshotId: NonNullable<BookSnapshot["updateId"]>,
  ): ReadonlyArray<BinanceUsdmBookOutcome> {
    if (update.updateId !== undefined && update.updateId < snapshotId) {
      return [{ kind: "OLD_REJECTED" }];
    }
    if (this.bridgeAccepted) return this.applyDelta(update);
    if (
      update.firstUpdateId !== undefined &&
      update.updateId !== undefined &&
      update.firstUpdateId <= snapshotId &&
      update.updateId >= snapshotId
    ) {
      if (update.updateId === snapshotId) {
        this.snapshotBoundaryBridge = true;
        this.markBridgeAccepted(update.context.processingTimestamp);
        this.stateValue = "READY";
        return [{ kind: "OLD_REJECTED" }];
      }
      return this.applyDelta(update);
    }
    if (
      update.firstUpdateId !== undefined &&
      update.firstUpdateId > snapshotId
    ) {
      return this.forceGap(update);
    }
    return [{ kind: "OLD_REJECTED" }];
  }

  private markBridgeAccepted(occurredAt: Timestamp): void {
    const wasRecovery = this.recovery;
    this.bridgeAccepted = true;
    this.recovery = false;
    this.options.metricSink?.increment(
      "market_data_snapshot_initializations_total",
      binanceUsdmMetricLabels("SEQUENCE_VALIDATION", "HEALTHY"),
    );
    this.options.eventSink?.emit({
      type: "BINANCE_USDM_SNAPSHOT_INITIALIZED",
      occurredAt,
      capability: "SEQUENCE_VALIDATION",
      state: "HEALTHY",
    });
    if (wasRecovery) {
      this.options.metricSink?.increment(
        "market_data_recoveries_total",
        binanceUsdmMetricLabels("SEQUENCE_VALIDATION", "HEALTHY"),
      );
      this.options.eventSink?.emit({
        type: "BINANCE_USDM_RECOVERED",
        occurredAt,
        capability: "SEQUENCE_VALIDATION",
        state: "HEALTHY",
      });
    }
  }

  private enterStale(
    occurredAt: Timestamp,
    reasonCode: "NETWORK" | "FRESHNESS" | "SEQUENCE",
  ): void {
    this.stateValue = "STALE";
    this.options.metricSink?.increment(
      "market_data_stale_transitions_total",
      binanceUsdmMetricLabels("WEBSOCKET_ORDER_BOOK_DELTA", "STALE"),
    );
    this.options.eventSink?.emit({
      type: "BINANCE_USDM_STALE",
      occurredAt,
      capability: "WEBSOCKET_ORDER_BOOK_DELTA",
      state: "STALE",
      reasonCode,
    });
  }

  private emitInvalid(occurredAt: Timestamp): void {
    this.options.metricSink?.increment(
      "market_data_invalid_books_total",
      binanceUsdmMetricLabels("SEQUENCE_VALIDATION", "STALE"),
    );
    this.options.eventSink?.emit({
      type: "BINANCE_USDM_INVALID_BOOK",
      occurredAt,
      capability: "SEQUENCE_VALIDATION",
      state: "STALE",
      reasonCode: "BOOK_INTEGRITY",
    });
  }
}
