import {
  capabilityDeclaration,
  defineCapabilities,
  type AdapterCapabilities,
} from "@arbitrage/market-data";
import {
  BINANCE_USDM_DEFINITIONS_SOURCE,
  BINANCE_USDM_GENERAL_SOURCE,
  BINANCE_USDM_LOCAL_BOOK_SOURCE,
  BINANCE_USDM_REST_SOURCE,
  BINANCE_USDM_WS_MIGRATION_SOURCE,
  BINANCE_USDM_WS_SOURCE,
} from "./constants.js";

export const binanceUsdmPublicCapabilities: AdapterCapabilities =
  defineCapabilities(
    {
      INSTRUMENT_METADATA: capabilityDeclaration(
        "SUPPORTED",
        "exchangeInfo supplies opaque symbol/pair, asset roles, contract type/status and explicit trading filters.",
        [BINANCE_USDM_REST_SOURCE, BINANCE_USDM_DEFINITIONS_SOURCE],
      ),
      TICKER: capabilityDeclaration(
        "SUPPORTED",
        "V2 symbol-price ticker supplies latest price; bookTicker supplies bid and ask without deriving midpoint.",
        [BINANCE_USDM_REST_SOURCE],
      ),
      MARK_PRICE: capabilityDeclaration(
        "SUPPORTED",
        "premiumIndex.markPrice maps only to canonical MARK_PRICE.",
        [BINANCE_USDM_REST_SOURCE],
      ),
      INDEX_OR_ORACLE_PRICE: capabilityDeclaration(
        "SUPPORTED",
        "premiumIndex.indexPrice maps only to canonical INDEX_PRICE.",
        [BINANCE_USDM_REST_SOURCE],
      ),
      CURRENT_FUNDING: capabilityDeclaration(
        "SUPPORTED",
        "premiumIndex.lastFundingRate is preserved with the official Latest semantic and canonical LAST label.",
        [BINANCE_USDM_REST_SOURCE],
      ),
      PREDICTED_FUNDING: capabilityDeclaration(
        "UNVERIFIED",
        "Current official evidence does not define lastFundingRate as a predicted next-period rate.",
        [BINANCE_USDM_REST_SOURCE],
      ),
      FUNDING_HISTORY: capabilityDeclaration(
        "SUPPORTED",
        "fundingRate returns settled historical rates in ascending order; Special rateType rows fail closed pending a distinct canonical semantic.",
        [BINANCE_USDM_REST_SOURCE],
      ),
      FUNDING_INTERVAL: capabilityDeclaration(
        "SUPPORTED",
        "fundingInfo provides fundingIntervalHours only for symbols whose interval/cap/floor was adjusted; other symbols remain unknown.",
        [BINANCE_USDM_REST_SOURCE],
      ),
      NEXT_FUNDING_TIME: capabilityDeclaration(
        "SUPPORTED",
        "premiumIndex.nextFundingTime is retained as the documented next funding timestamp.",
        [BINANCE_USDM_REST_SOURCE],
      ),
      REST_ORDER_BOOK_SNAPSHOT: capabilityDeclaration(
        "SUPPORTED",
        "fapi/v1/depth provides the bounded snapshot used by the official local-book algorithm.",
        [BINANCE_USDM_REST_SOURCE, BINANCE_USDM_LOCAL_BOOK_SOURCE],
      ),
      WEBSOCKET_ORDER_BOOK_SNAPSHOT: capabilityDeclaration(
        "UNSUPPORTED",
        "The selected diff-depth stream is incremental; initialization uses the REST depth snapshot.",
        [BINANCE_USDM_WS_SOURCE, BINANCE_USDM_LOCAL_BOOK_SOURCE],
      ),
      WEBSOCKET_ORDER_BOOK_DELTA: capabilityDeclaration(
        "SUPPORTED",
        "The routed public diff-depth stream provides U/u/pu and absolute level quantities.",
        [BINANCE_USDM_WS_SOURCE, BINANCE_USDM_WS_MIGRATION_SOURCE],
      ),
      SEQUENCE_VALIDATION: capabilityDeclaration(
        "SUPPORTED",
        "The official algorithm defines initial snapshot overlap and subsequent pu chaining with full snapshot/replay recovery.",
        [BINANCE_USDM_LOCAL_BOOK_SOURCE],
      ),
      CHECKSUM_VALIDATION: capabilityDeclaration(
        "UNVERIFIED",
        "No checksum semantics are documented for the selected USD-M diff-depth stream.",
        [BINANCE_USDM_WS_SOURCE, BINANCE_USDM_LOCAL_BOOK_SOURCE],
      ),
    },
    capabilityDeclaration(
      "RESEARCH_REQUIRED",
      "No current official Binance USD-M evidence has been mapped for this capability.",
      [BINANCE_USDM_GENERAL_SOURCE],
    ),
  );

export const binanceUsdmCapabilityEvidence = Object.freeze({
  undocumentedContractTypes: {
    state: "RESEARCH_REQUIRED",
    sourceIds: [BINANCE_USDM_REST_SOURCE, BINANCE_USDM_DEFINITIONS_SOURCE],
    note: "Contract types absent from current official definitions are counted and quarantined, never mapped.",
  },
  specialFundingRate: {
    state: "RESEARCH_REQUIRED",
    sourceIds: [BINANCE_USDM_REST_SOURCE],
    note: "The frozen funding observation cannot preserve Binance Special dividend funding semantics, so those history rows fail closed.",
  },
  contractMultiplier: {
    state: "UNVERIFIED",
    sourceIds: [BINANCE_USDM_REST_SOURCE],
    note: "exchangeInfo does not document a contract multiplier.",
  },
  linearInverseClassification: {
    state: "RESEARCH_REQUIRED",
    sourceIds: [BINANCE_USDM_REST_SOURCE],
    note: "No direct per-instrument linear/inverse field is documented.",
  },
  unadjustedFundingInterval: {
    state: "UNVERIFIED",
    sourceIds: [BINANCE_USDM_REST_SOURCE],
    note: "fundingInfo is explicitly limited to adjusted symbols; absence cannot be interpreted as eight hours.",
  },
  predictedFunding: {
    state: "UNVERIFIED",
    sourceIds: [BINANCE_USDM_REST_SOURCE],
    note: "lastFundingRate is Latest, not officially predicted.",
  },
  checksum: {
    state: "UNVERIFIED",
    sourceIds: [BINANCE_USDM_WS_SOURCE],
    note: "No checksum field or algorithm is documented for diff depth.",
  },
  deliveryFuturesFunding: {
    state: "UNSUPPORTED",
    sourceIds: [BINANCE_USDM_REST_SOURCE],
    note: "Funding history is documented for perpetual Futures; delivery instruments expose no fake capability.",
  },
} as const);
