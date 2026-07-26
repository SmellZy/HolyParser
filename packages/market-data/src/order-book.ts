import {
  ExactDecimal,
  type Price,
  type Quantity,
  type RoundingPolicy,
} from "./decimal.js";
import type { InstrumentId, ProductGroup, Venue } from "./identifiers.js";
import type {
  MarketDataEventSink,
  MarketDataStructuredEvent,
} from "./observability.js";
import type { ObservationContext, QualityState } from "./quality.js";

declare const updateIdBrand: unique symbol;

export type UpdateId = bigint & {
  readonly [updateIdBrand]: "UpdateId";
};

export function updateId(value: string): UpdateId {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new TypeError("UpdateId must be an unsigned integer string.");
  }
  return BigInt(value) as UpdateId;
}

export type BookSide = "BID" | "ASK";

export interface BookLevel {
  readonly price: Price;
  readonly quantity: Quantity;
}

interface BookEventBase {
  readonly instrumentId: InstrumentId;
  readonly context: ObservationContext;
}

export interface BookSnapshot extends BookEventBase {
  readonly kind: "SNAPSHOT";
  readonly updateId?: UpdateId;
  readonly bids: ReadonlyArray<BookLevel>;
  readonly asks: ReadonlyArray<BookLevel>;
}

export interface ReplacementSnapshot extends BookEventBase {
  readonly kind: "REPLACEMENT_SNAPSHOT";
  readonly updateId?: UpdateId;
  readonly bids: ReadonlyArray<BookLevel>;
  readonly asks: ReadonlyArray<BookLevel>;
}

export interface BookDelta extends BookEventBase {
  readonly kind: "DELTA";
  readonly firstUpdateId?: UpdateId;
  readonly updateId?: UpdateId;
  readonly previousUpdateId?: UpdateId;
  readonly bidChanges: ReadonlyArray<BookLevel>;
  readonly askChanges: ReadonlyArray<BookLevel>;
}

export type BookUpdate = BookSnapshot | ReplacementSnapshot | BookDelta;

export type OrderBookStrategy =
  | "SNAPSHOT_REPLACEMENT"
  | "SNAPSHOT_PLUS_DELTA"
  | "SEQUENCE_CHAINED_DELTA"
  | "NO_TRUSTED_EXECUTABLE_BOOK";

export type SequencePolicy =
  "NONE" | "CONTIGUOUS" | "PREVIOUS_ID_CHAIN" | "RANGE_WITH_PREVIOUS_ID";

export type BookIntegrityState =
  "UNINITIALIZED" | "READY" | "GAPPED" | "INVALID" | "DISABLED";

export type ApplyOutcome =
  | "INITIALIZED"
  | "APPLIED"
  | "REPLACED"
  | "RECOVERED"
  | "DUPLICATE_REJECTED"
  | "GAP_DETECTED"
  | "REJECTED_UNINITIALIZED"
  | "REJECTED_STALE"
  | "REJECTED_UNSUPPORTED"
  | "INVALID_BOOK";

export interface ApplyResult {
  readonly outcome: ApplyOutcome;
  readonly integrityState: BookIntegrityState;
  readonly quality: QualityState;
  readonly reason?: string;
}

export interface OrderBookMachineConfig {
  readonly instrumentId: InstrumentId;
  readonly venue: Venue;
  readonly productGroup: ProductGroup;
  readonly channel: string;
  readonly strategy: OrderBookStrategy;
  readonly sequencePolicy: SequencePolicy;
  readonly restartUpdateId?: UpdateId;
  readonly eventSink?: MarketDataEventSink;
}

export interface ExecutableBookView {
  readonly bids: ReadonlyArray<BookLevel>;
  readonly asks: ReadonlyArray<BookLevel>;
  readonly bestBid: Price;
  readonly bestAsk: Price;
  readonly midpoint: Price;
  readonly lastUpdateId?: UpdateId;
}

function comparePrices(left: Price, right: Price): number {
  return left.compare(right);
}

function cloneLevel(level: BookLevel): BookLevel {
  return Object.freeze({ price: level.price, quantity: level.quantity });
}

function sortedLevels(
  levels: Iterable<BookLevel>,
  side: BookSide,
): ReadonlyArray<BookLevel> {
  return [...levels]
    .map(cloneLevel)
    .sort((left, right) =>
      side === "BID"
        ? comparePrices(right.price, left.price)
        : comparePrices(left.price, right.price),
    );
}

function validateSnapshotLevels(
  bids: ReadonlyArray<BookLevel>,
  asks: ReadonlyArray<BookLevel>,
): string | undefined {
  for (const [side, levels] of [
    ["bid", bids],
    ["ask", asks],
  ] as const) {
    const seen = new Set<string>();
    for (const level of levels) {
      if (level.quantity.isZero()) {
        return `Snapshot contains a zero-quantity ${side} level.`;
      }
      const key = level.price.toString();
      if (seen.has(key)) {
        return `Snapshot contains a duplicate ${side} price.`;
      }
      seen.add(key);
    }
  }
  return validateTopOfBook(
    sortedLevels(bids, "BID"),
    sortedLevels(asks, "ASK"),
  );
}

function validateTopOfBook(
  bids: ReadonlyArray<BookLevel>,
  asks: ReadonlyArray<BookLevel>,
): string | undefined {
  const bestBid = bids[0];
  const bestAsk = asks[0];

  if (
    bestBid !== undefined &&
    bestAsk !== undefined &&
    bestBid.price.compare(bestAsk.price) >= 0
  ) {
    return "Book is crossed or locked.";
  }
  return undefined;
}

export class DeterministicOrderBook {
  private readonly bids = new Map<string, BookLevel>();
  private readonly asks = new Map<string, BookLevel>();
  private lastUpdateId?: UpdateId;
  private hasAppliedDeltaSinceSnapshot = false;
  private integrityState: BookIntegrityState;
  private quality: QualityState;

  constructor(private readonly config: OrderBookMachineConfig) {
    this.integrityState =
      config.strategy === "NO_TRUSTED_EXECUTABLE_BOOK"
        ? "DISABLED"
        : "UNINITIALIZED";
    this.quality =
      config.strategy === "NO_TRUSTED_EXECUTABLE_BOOK"
        ? "UNSUPPORTED"
        : "RECONNECTING";
  }

  apply(update: BookUpdate): ApplyResult {
    if (update.instrumentId !== this.config.instrumentId) {
      throw new TypeError("Book update targets a different instrument.");
    }

    if (this.config.strategy === "NO_TRUSTED_EXECUTABLE_BOOK") {
      return this.result(
        "REJECTED_UNSUPPORTED",
        "No trusted executable-book strategy is configured.",
      );
    }

    if (update.context.quality === "GAPPED") {
      return this.enterGap(update, "Source marked the update as gapped.");
    }

    if (update.kind !== "DELTA") {
      return this.applySnapshot(update);
    }

    if (this.config.strategy === "SNAPSHOT_REPLACEMENT") {
      return this.result(
        "REJECTED_UNSUPPORTED",
        "Replacement-only books do not accept deltas.",
      );
    }
    if (this.integrityState === "UNINITIALIZED") {
      return this.result(
        "REJECTED_UNINITIALIZED",
        "A snapshot is required before deltas.",
      );
    }
    if (this.integrityState === "GAPPED" || this.integrityState === "INVALID") {
      return this.result(
        "REJECTED_STALE",
        "A replacement snapshot is required before more deltas.",
      );
    }

    const sequenceResult = this.validateSequence(update);
    if (sequenceResult !== undefined) {
      return sequenceResult;
    }

    this.applyChanges(this.bids, update.bidChanges);
    this.applyChanges(this.asks, update.askChanges);
    this.lastUpdateId = update.updateId ?? this.lastUpdateId;
    this.hasAppliedDeltaSinceSnapshot = true;

    const invalidReason = validateTopOfBook(
      this.currentBids(),
      this.currentAsks(),
    );
    if (invalidReason !== undefined) {
      this.integrityState = "INVALID";
      this.quality = "STALE";
      this.emit(update, "INVALID_BOOK_DETECTED", invalidReason);
      this.emit(update, "STALE_TRANSITION", invalidReason);
      return this.result("INVALID_BOOK", invalidReason);
    }

    this.integrityState = "READY";
    this.quality = update.context.quality;
    return this.result("APPLIED");
  }

  state(): Readonly<{
    integrityState: BookIntegrityState;
    quality: QualityState;
    lastUpdateId?: UpdateId;
  }> {
    return Object.freeze({
      integrityState: this.integrityState,
      quality: this.quality,
      ...(this.lastUpdateId === undefined
        ? {}
        : { lastUpdateId: this.lastUpdateId }),
    });
  }

  executableView(): ExecutableBookView | undefined {
    if (this.integrityState !== "READY" || this.quality !== "HEALTHY") {
      return undefined;
    }

    const bids = this.currentBids();
    const asks = this.currentAsks();
    const bestBid = bids[0];
    const bestAsk = asks[0];

    if (
      bestBid === undefined ||
      bestAsk === undefined ||
      validateTopOfBook(bids, asks) !== undefined
    ) {
      return undefined;
    }

    const midpoint = bestBid.price
      .add(bestAsk.price)
      .divide(
        ExactDecimal.fromParts(2n, 0),
        Math.max(bestBid.price.scale, bestAsk.price.scale) + 1,
        "EXACT",
      ) as Price;

    return Object.freeze({
      bids,
      asks,
      bestBid: bestBid.price,
      bestAsk: bestAsk.price,
      midpoint,
      ...(this.lastUpdateId === undefined
        ? {}
        : { lastUpdateId: this.lastUpdateId }),
    });
  }

  calculateVwap(
    side: BookSide,
    requestedQuantity: Quantity,
    outputScale: number,
    roundingPolicy: RoundingPolicy,
  ): Price | undefined {
    const view = this.executableView();
    if (view === undefined || requestedQuantity.isZero()) {
      return undefined;
    }

    const levels = side === "ASK" ? view.asks : view.bids;
    let remaining: ExactDecimal = requestedQuantity;
    let totalNotional = ExactDecimal.fromParts(0n, 0);

    for (const level of levels) {
      const fillQuantity =
        level.quantity.compare(remaining) <= 0 ? level.quantity : remaining;
      totalNotional = totalNotional.add(level.price.multiply(fillQuantity));
      remaining = remaining.subtract(fillQuantity);
      if (remaining.isZero()) {
        return totalNotional.divide(
          requestedQuantity,
          outputScale,
          roundingPolicy,
        ) as Price;
      }
    }

    return undefined;
  }

  private applySnapshot(
    snapshot: BookSnapshot | ReplacementSnapshot,
  ): ApplyResult {
    const previousState = this.integrityState;

    if (
      (previousState === "GAPPED" || previousState === "INVALID") &&
      snapshot.kind !== "REPLACEMENT_SNAPSHOT"
    ) {
      return this.result(
        "REJECTED_STALE",
        "Recovery requires an explicit replacement snapshot.",
      );
    }

    if (
      previousState === "READY" &&
      snapshot.updateId !== undefined &&
      this.lastUpdateId !== undefined &&
      snapshot.kind === "SNAPSHOT" &&
      snapshot.updateId <= this.lastUpdateId
    ) {
      this.emit(
        snapshot,
        "DUPLICATE_UPDATE_REJECTED",
        "Duplicate or out-of-order snapshot.",
      );
      return this.result(
        "DUPLICATE_REJECTED",
        "Duplicate or out-of-order snapshot.",
      );
    }

    if (
      this.config.sequencePolicy !== "NONE" &&
      snapshot.updateId === undefined
    ) {
      return this.enterGap(snapshot, "Sequenced snapshot has no update ID.");
    }

    const invalidReason = validateSnapshotLevels(snapshot.bids, snapshot.asks);
    if (invalidReason !== undefined) {
      this.bids.clear();
      this.asks.clear();
      this.integrityState = "INVALID";
      this.quality = "STALE";
      this.emit(snapshot, "INVALID_BOOK_DETECTED", invalidReason);
      this.emit(snapshot, "STALE_TRANSITION", invalidReason);
      return this.result("INVALID_BOOK", invalidReason);
    }

    this.bids.clear();
    this.asks.clear();
    this.applySnapshotLevels(this.bids, snapshot.bids);
    this.applySnapshotLevels(this.asks, snapshot.asks);
    this.lastUpdateId = snapshot.updateId;
    this.hasAppliedDeltaSinceSnapshot = false;
    this.integrityState = "READY";
    this.quality = snapshot.context.quality;

    if (previousState === "GAPPED" || previousState === "INVALID") {
      this.emit(snapshot, "BOOK_RECOVERED", "Replacement snapshot applied.");
      return this.result("RECOVERED");
    }
    if (previousState === "UNINITIALIZED") {
      return this.result("INITIALIZED");
    }
    return this.result(
      snapshot.kind === "REPLACEMENT_SNAPSHOT" ? "REPLACED" : "APPLIED",
    );
  }

  private validateSequence(delta: BookDelta): ApplyResult | undefined {
    if (this.config.sequencePolicy === "NONE") {
      if (
        delta.updateId !== undefined &&
        delta.updateId === this.lastUpdateId
      ) {
        this.emit(delta, "DUPLICATE_UPDATE_REJECTED", "Duplicate update ID.");
        return this.result("DUPLICATE_REJECTED", "Duplicate update ID.");
      }
      return undefined;
    }

    if (delta.updateId === undefined || this.lastUpdateId === undefined) {
      return this.enterGap(delta, "Sequence ID is missing.");
    }
    if (
      this.config.restartUpdateId !== undefined &&
      delta.updateId === this.config.restartUpdateId
    ) {
      return this.enterGap(
        delta,
        "Restart identifier requires a replacement snapshot.",
      );
    }
    if (delta.updateId <= this.lastUpdateId) {
      this.emit(
        delta,
        "DUPLICATE_UPDATE_REJECTED",
        "Duplicate or out-of-order update ID.",
      );
      return this.result(
        "DUPLICATE_REJECTED",
        "Duplicate or out-of-order update ID.",
      );
    }

    const expected = (this.lastUpdateId + 1n) as UpdateId;

    if (
      this.config.sequencePolicy === "CONTIGUOUS" &&
      delta.updateId !== expected
    ) {
      return this.enterGap(delta, "Contiguous sequence ID gap detected.");
    }

    if (
      this.config.sequencePolicy === "PREVIOUS_ID_CHAIN" &&
      delta.previousUpdateId !== this.lastUpdateId
    ) {
      return this.enterGap(delta, "Previous update ID does not link.");
    }

    if (this.config.sequencePolicy === "RANGE_WITH_PREVIOUS_ID") {
      if (!this.hasAppliedDeltaSinceSnapshot) {
        if (
          delta.firstUpdateId === undefined ||
          delta.firstUpdateId > this.lastUpdateId ||
          delta.updateId < this.lastUpdateId
        ) {
          return this.enterGap(
            delta,
            "First update range does not bridge the snapshot sequence.",
          );
        }
        return undefined;
      }

      if (
        delta.previousUpdateId !== this.lastUpdateId ||
        delta.firstUpdateId === undefined ||
        delta.firstUpdateId > expected ||
        delta.updateId < expected
      ) {
        return this.enterGap(
          delta,
          "Update range does not bridge the previous sequence.",
        );
      }
    }

    return undefined;
  }

  private enterGap(update: BookUpdate, reason: string): ApplyResult {
    this.integrityState = "GAPPED";
    this.quality = "STALE";
    this.emit(update, "SEQUENCE_GAP_DETECTED", reason);
    this.emit(update, "STALE_TRANSITION", reason);
    return this.result("GAP_DETECTED", reason);
  }

  private applySnapshotLevels(
    target: Map<string, BookLevel>,
    levels: ReadonlyArray<BookLevel>,
  ): void {
    for (const level of levels) {
      target.set(level.price.toString(), cloneLevel(level));
    }
  }

  private applyChanges(
    target: Map<string, BookLevel>,
    changes: ReadonlyArray<BookLevel>,
  ): void {
    for (const level of changes) {
      const key = level.price.toString();
      if (level.quantity.isZero()) {
        target.delete(key);
      } else {
        target.set(key, cloneLevel(level));
      }
    }
  }

  private currentBids(): ReadonlyArray<BookLevel> {
    return sortedLevels(this.bids.values(), "BID");
  }

  private currentAsks(): ReadonlyArray<BookLevel> {
    return sortedLevels(this.asks.values(), "ASK");
  }

  private emit(
    update: BookUpdate,
    type: MarketDataStructuredEvent["type"],
    reason: string,
  ): void {
    this.config.eventSink?.emit({
      type,
      occurredAt: update.context.processingTimestamp,
      venue: this.config.venue,
      productGroup: this.config.productGroup,
      channel: this.config.channel,
      state: this.quality,
      reason,
      ...(update.updateId === undefined
        ? {}
        : { updateId: update.updateId.toString() }),
      ...(update.kind !== "DELTA" || update.previousUpdateId === undefined
        ? {}
        : { previousUpdateId: update.previousUpdateId.toString() }),
    });
  }

  private result(outcome: ApplyOutcome, reason?: string): ApplyResult {
    return Object.freeze({
      outcome,
      integrityState: this.integrityState,
      quality: this.quality,
      ...(reason === undefined ? {} : { reason }),
    });
  }
}
