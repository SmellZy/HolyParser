import type {
  FundingObservation,
  InstrumentMetadataObservation,
  MarketPriceObservation,
} from "./observations.js";
import type { BookDelta, BookSnapshot } from "./order-book.js";
import type { ProductGroup, Venue } from "./identifiers.js";
import type { SourceId } from "./quality.js";

export const publicCapabilityNames = [
  "INSTRUMENT_METADATA",
  "TICKER",
  "MARK_PRICE",
  "INDEX_OR_ORACLE_PRICE",
  "CURRENT_FUNDING",
  "PREDICTED_FUNDING",
  "FUNDING_HISTORY",
  "FUNDING_INTERVAL",
  "NEXT_FUNDING_TIME",
  "REST_ORDER_BOOK_SNAPSHOT",
  "WEBSOCKET_ORDER_BOOK_SNAPSHOT",
  "WEBSOCKET_ORDER_BOOK_DELTA",
  "SEQUENCE_VALIDATION",
  "CHECKSUM_VALIDATION",
] as const;

export type PublicCapabilityName = (typeof publicCapabilityNames)[number];

export type CapabilityState =
  "SUPPORTED" | "UNSUPPORTED" | "UNVERIFIED" | "RESEARCH_REQUIRED";

export interface CapabilityDeclaration {
  readonly state: CapabilityState;
  readonly sourceIds: ReadonlyArray<SourceId>;
  readonly note: string;
}

export type AdapterCapabilities = Readonly<
  Record<PublicCapabilityName, CapabilityDeclaration>
>;

interface CapabilityPortBase {
  readonly capability: PublicCapabilityName;
}

export interface InstrumentMetadataPort extends CapabilityPortBase {
  readonly capability: "INSTRUMENT_METADATA";
  listInstruments(): Promise<ReadonlyArray<InstrumentMetadataObservation>>;
}

export interface PriceObservationPort extends CapabilityPortBase {
  readonly capability: "TICKER" | "MARK_PRICE" | "INDEX_OR_ORACLE_PRICE";
  readPrices(): Promise<ReadonlyArray<MarketPriceObservation>>;
}

export interface FundingObservationPort extends CapabilityPortBase {
  readonly capability:
    | "CURRENT_FUNDING"
    | "PREDICTED_FUNDING"
    | "FUNDING_HISTORY"
    | "FUNDING_INTERVAL"
    | "NEXT_FUNDING_TIME";
  readFunding(): Promise<ReadonlyArray<FundingObservation>>;
}

export interface OrderBookSnapshotPort extends CapabilityPortBase {
  readonly capability:
    "REST_ORDER_BOOK_SNAPSHOT" | "WEBSOCKET_ORDER_BOOK_SNAPSHOT";
  readSnapshot(): Promise<BookSnapshot>;
}

export interface OrderBookDeltaPort extends CapabilityPortBase {
  readonly capability: "WEBSOCKET_ORDER_BOOK_DELTA";
  readDeltas(): Promise<ReadonlyArray<BookDelta>>;
}

export interface ValidationCapabilityPort extends CapabilityPortBase {
  readonly capability: "SEQUENCE_VALIDATION" | "CHECKSUM_VALIDATION";
  readonly strategyId: string;
}

export type PublicCapabilityPort =
  | InstrumentMetadataPort
  | PriceObservationPort
  | FundingObservationPort
  | OrderBookSnapshotPort
  | OrderBookDeltaPort
  | ValidationCapabilityPort;

export interface PublicMarketDataAdapter {
  readonly venue: Venue;
  readonly productGroup: ProductGroup;
  readonly capabilities: AdapterCapabilities;
  readonly ports: Readonly<
    Partial<Record<PublicCapabilityName, PublicCapabilityPort>>
  >;
}

export function validateAdapterCapabilities(
  adapter: PublicMarketDataAdapter,
): void {
  for (const name of publicCapabilityNames) {
    const declaration = adapter.capabilities[name];
    const port = adapter.ports[name];

    if (declaration.state === "SUPPORTED" && port === undefined) {
      throw new TypeError(`Supported capability ${name} must provide a port.`);
    }
    if (
      declaration.state === "SUPPORTED" &&
      declaration.sourceIds.length === 0
    ) {
      throw new TypeError(
        `Supported capability ${name} must cite at least one source ID.`,
      );
    }
    if (declaration.state !== "SUPPORTED" && port !== undefined) {
      throw new TypeError(
        `${declaration.state} capability ${name} must not provide a fake port.`,
      );
    }
    if (port !== undefined && port.capability !== name) {
      throw new TypeError(`Capability port ${name} has a mismatched identity.`);
    }
  }
}
