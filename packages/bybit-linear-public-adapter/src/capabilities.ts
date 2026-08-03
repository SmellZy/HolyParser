import {
  capabilityDeclaration,
  defineCapabilities,
  type AdapterCapabilities,
} from "@arbitrage/market-data";
import {
  BYBIT_FUNDING_SOURCE,
  BYBIT_INSTRUMENT_SOURCE,
  BYBIT_REST_BOOK_SOURCE,
  BYBIT_TICKER_SOURCE,
  BYBIT_WS_BOOK_SOURCE,
} from "./constants.js";

export const BYBIT_LINEAR_CAPABILITIES: AdapterCapabilities =
  defineCapabilities(
    {
      INSTRUMENT_METADATA: capabilityDeclaration(
        "SUPPORTED",
        "V5 instruments-info provides category, opaque identity, asset roles, contract type/status and explicit filters.",
        [BYBIT_INSTRUMENT_SOURCE],
      ),
      TICKER: capabilityDeclaration(
        "SUPPORTED",
        "V5 tickers preserves last, bid and ask as separate observations.",
        [BYBIT_TICKER_SOURCE],
      ),
      MARK_PRICE: capabilityDeclaration(
        "SUPPORTED",
        "tickers.markPrice maps only to MARK_PRICE.",
        [BYBIT_TICKER_SOURCE],
      ),
      INDEX_OR_ORACLE_PRICE: capabilityDeclaration(
        "SUPPORTED",
        "tickers.indexPrice maps only to INDEX_PRICE.",
        [BYBIT_TICKER_SOURCE],
      ),
      CURRENT_FUNDING: capabilityDeclaration(
        "SUPPORTED",
        "Ticker venue-native fundingRate is preserved as CURRENT and never predicted.",
        [BYBIT_TICKER_SOURCE],
      ),
      PREDICTED_FUNDING: capabilityDeclaration(
        "UNVERIFIED",
        "No reviewed public Bybit field proves a predicted next-period funding rate.",
        [BYBIT_TICKER_SOURCE],
      ),
      FUNDING_HISTORY: capabilityDeclaration(
        "SUPPORTED",
        "Funding history provides settled historical rates for perpetual contracts.",
        [BYBIT_FUNDING_SOURCE],
      ),
      FUNDING_INTERVAL: capabilityDeclaration(
        "SUPPORTED",
        "instruments-info fundingInterval is minutes and ticker fundingIntervalHour is explicitly whole hours.",
        [BYBIT_INSTRUMENT_SOURCE, BYBIT_TICKER_SOURCE],
      ),
      NEXT_FUNDING_TIME: capabilityDeclaration(
        "SUPPORTED",
        "tickers.nextFundingTime is the documented next funding timestamp.",
        [BYBIT_TICKER_SOURCE],
      ),
      REST_ORDER_BOOK_SNAPSHOT: capabilityDeclaration(
        "SUPPORTED",
        "V5 market orderbook provides bounded linear snapshots.",
        [BYBIT_REST_BOOK_SOURCE],
      ),
      WEBSOCKET_ORDER_BOOK_SNAPSHOT: capabilityDeclaration(
        "SUPPORTED",
        "The linear orderbook stream initializes and replaces from snapshot messages.",
        [BYBIT_WS_BOOK_SOURCE],
      ),
      WEBSOCKET_ORDER_BOOK_DELTA: capabilityDeclaration(
        "SUPPORTED",
        "The linear orderbook stream publishes absolute level deltas with zero deletion.",
        [BYBIT_WS_BOOK_SOURCE],
      ),
      SEQUENCE_VALIDATION: capabilityDeclaration(
        "RESEARCH_REQUIRED",
        "Bybit documents ordering and cross-sequence comparison but no prev-ID chain or contiguous increment rule for WS deltas.",
        [BYBIT_WS_BOOK_SOURCE, BYBIT_REST_BOOK_SOURCE],
      ),
      CHECKSUM_VALIDATION: capabilityDeclaration(
        "UNVERIFIED",
        "No checksum contract is documented for the selected stream.",
        [BYBIT_WS_BOOK_SOURCE],
      ),
    },
    capabilityDeclaration(
      "RESEARCH_REQUIRED",
      "No source-backed Bybit linear mapping is approved.",
      [BYBIT_INSTRUMENT_SOURCE],
    ),
  );
