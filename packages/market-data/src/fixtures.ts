import { price, quantity } from "./decimal.js";
import {
  instrumentId,
  officialInstrumentId,
  productGroup,
  settlementAsset,
  venue,
  canonicalAssetId,
  type InstrumentIdentity,
} from "./identifiers.js";
import {
  updateId,
  type BookDelta,
  type BookLevel,
  type BookSnapshot,
  type BookUpdate,
  type OrderBookStrategy,
  type ReplacementSnapshot,
  type SequencePolicy,
} from "./order-book.js";
import { sourceId, timestamp } from "./quality.js";

export type FixtureOrigin = "COPIED" | "MINIMALLY_TRANSFORMED" | "SYNTHETIC";

export interface FixtureProvenance {
  readonly sourceId: string;
  readonly retrievalDate: string;
  readonly productGroup: string;
  readonly origin: FixtureOrigin;
  readonly transformations: ReadonlyArray<string>;
}

export interface RawBookFixture {
  readonly fixtureId: string;
  readonly provenance: FixtureProvenance;
  readonly venue: string;
  readonly productGroup: string;
  readonly officialInstrumentId: string;
  readonly marketType: InstrumentIdentity["marketType"];
  readonly settlementAsset: string;
  readonly strategy: OrderBookStrategy;
  readonly sequencePolicy: SequencePolicy;
  readonly restartUpdateId?: string;
  readonly events: ReadonlyArray<{
    readonly kind: BookUpdate["kind"];
    readonly updateId?: string;
    readonly firstUpdateId?: string;
    readonly previousUpdateId?: string;
    readonly bids?: ReadonlyArray<readonly [string, string]>;
    readonly asks?: ReadonlyArray<readonly [string, string]>;
    readonly bidChanges?: ReadonlyArray<readonly [string, string]>;
    readonly askChanges?: ReadonlyArray<readonly [string, string]>;
    readonly exchangeTimestamp?: string;
    readonly receiveTimestamp: string;
    readonly processingTimestamp: string;
  }>;
}

export interface RecordedBookFixture {
  readonly fixtureId: string;
  readonly provenance: FixtureProvenance;
  readonly identity: InstrumentIdentity;
  readonly instrumentId: ReturnType<typeof instrumentId>;
  readonly strategy: OrderBookStrategy;
  readonly sequencePolicy: SequencePolicy;
  readonly restartUpdateId?: ReturnType<typeof updateId>;
  readonly events: ReadonlyArray<BookUpdate>;
}

function levels(
  raw: ReadonlyArray<readonly [string, string]> | undefined,
): ReadonlyArray<BookLevel> {
  return (raw ?? []).map(([rawPrice, rawQuantity]) => ({
    price: price(rawPrice),
    quantity: quantity(rawQuantity),
  }));
}

export function parseRecordedBookFixture(
  raw: RawBookFixture,
): RecordedBookFixture {
  sourceId(raw.provenance.sourceId);
  const identity: InstrumentIdentity = {
    venue: venue(raw.venue),
    productGroup: productGroup(raw.productGroup),
    officialInstrumentId: officialInstrumentId(raw.officialInstrumentId),
    marketType: raw.marketType,
    settlementAsset: settlementAsset(canonicalAssetId(raw.settlementAsset)),
  };
  const canonicalInstrumentId = instrumentId(identity);

  const events = raw.events.map((event): BookUpdate => {
    const context = {
      ...(event.exchangeTimestamp === undefined
        ? {}
        : { exchangeTimestamp: timestamp(event.exchangeTimestamp) }),
      receiveTimestamp: timestamp(event.receiveTimestamp),
      processingTimestamp: timestamp(event.processingTimestamp),
      source: sourceId(raw.provenance.sourceId),
      quality: "HEALTHY" as const,
    };
    const ids = {
      ...(event.updateId === undefined
        ? {}
        : { updateId: updateId(event.updateId) }),
      ...(event.firstUpdateId === undefined
        ? {}
        : { firstUpdateId: updateId(event.firstUpdateId) }),
      ...(event.previousUpdateId === undefined
        ? {}
        : { previousUpdateId: updateId(event.previousUpdateId) }),
    };

    if (event.kind === "DELTA") {
      return {
        kind: "DELTA",
        instrumentId: canonicalInstrumentId,
        context,
        ...ids,
        bidChanges: levels(event.bidChanges),
        askChanges: levels(event.askChanges),
      } satisfies BookDelta;
    }

    const snapshot = {
      kind: event.kind,
      instrumentId: canonicalInstrumentId,
      context,
      ...ids,
      bids: levels(event.bids),
      asks: levels(event.asks),
    };
    return snapshot as BookSnapshot | ReplacementSnapshot;
  });

  return Object.freeze({
    fixtureId: raw.fixtureId,
    provenance: Object.freeze({ ...raw.provenance }),
    identity,
    instrumentId: canonicalInstrumentId,
    strategy: raw.strategy,
    sequencePolicy: raw.sequencePolicy,
    ...(raw.restartUpdateId === undefined
      ? {}
      : { restartUpdateId: updateId(raw.restartUpdateId) }),
    events,
  });
}
