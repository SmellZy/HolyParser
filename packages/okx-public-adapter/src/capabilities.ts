import {
  capabilityDeclaration,
  defineCapabilities,
  type AdapterCapabilities,
} from "@arbitrage/market-data";
import {
  OKX_API_SOURCE,
  OKX_CHANGELOG_SOURCE,
  OKX_CHECKSUM_SOURCE,
} from "./constants.js";

export const okxPublicCapabilities: AdapterCapabilities = defineCapabilities(
  {
    INSTRUMENT_METADATA: capabilityDeclaration(
      "SUPPORTED",
      "GET /api/v5/public/instruments for SWAP and FUTURES.",
      [OKX_API_SOURCE, OKX_CHANGELOG_SOURCE],
    ),
    TICKER: capabilityDeclaration(
      "SUPPORTED",
      "GET /api/v5/market/tickers preserves last, bid, and ask semantics.",
      [OKX_API_SOURCE],
    ),
    MARK_PRICE: capabilityDeclaration(
      "SUPPORTED",
      "GET /api/v5/public/mark-price maps only markPx to MARK_PRICE.",
      [OKX_API_SOURCE],
    ),
    INDEX_OR_ORACLE_PRICE: capabilityDeclaration(
      "SUPPORTED",
      "GET /api/v5/market/index-tickers maps idxPx to INDEX_PRICE through the official uly identifier.",
      [OKX_API_SOURCE],
    ),
    CURRENT_FUNDING: capabilityDeclaration(
      "SUPPORTED",
      "settFundingRate is CURRENT only while settState=processing and LAST when settled.",
      [OKX_API_SOURCE],
    ),
    PREDICTED_FUNDING: capabilityDeclaration(
      "SUPPORTED",
      "fundingRate is documented as the predicted rate for the upcoming fundingTime.",
      [OKX_API_SOURCE],
    ),
    FUNDING_HISTORY: capabilityDeclaration(
      "SUPPORTED",
      "GET /api/v5/public/funding-rate-history for SWAP and X-Perp FUTURES.",
      [OKX_API_SOURCE],
    ),
    FUNDING_INTERVAL: capabilityDeclaration(
      "SUPPORTED",
      "Actual interval is derived exactly from nextFundingTime - fundingTime as documented; no fixed interval is assumed.",
      [OKX_API_SOURCE],
    ),
    NEXT_FUNDING_TIME: capabilityDeclaration(
      "SUPPORTED",
      "fundingTime is the settlement time for the predicted fundingRate.",
      [OKX_API_SOURCE],
    ),
    REST_ORDER_BOOK_SNAPSHOT: capabilityDeclaration(
      "SUPPORTED",
      "GET /api/v5/market/books exposes a public sequence-bearing snapshot.",
      [OKX_API_SOURCE],
    ),
    WEBSOCKET_ORDER_BOOK_SNAPSHOT: capabilityDeclaration(
      "SUPPORTED",
      "The public JSON books channel sends action=snapshot on subscription.",
      [OKX_API_SOURCE],
    ),
    WEBSOCKET_ORDER_BOOK_DELTA: capabilityDeclaration(
      "SUPPORTED",
      "The public JSON books channel sends action=update incremental changes.",
      [OKX_API_SOURCE],
    ),
    SEQUENCE_VALIDATION: capabilityDeclaration(
      "SUPPORTED",
      "books seqId/prevSeqId links are documented, including no-update and maintenance-reset exceptions.",
      [OKX_API_SOURCE, OKX_CHANGELOG_SOURCE],
    ),
    CHECKSUM_VALIDATION: capabilityDeclaration(
      "UNSUPPORTED",
      "JSON books checksum is deprecated, fixed to zero, and must not be used.",
      [OKX_CHANGELOG_SOURCE, OKX_CHECKSUM_SOURCE],
    ),
  },
  capabilityDeclaration(
    "RESEARCH_REQUIRED",
    "No current official evidence has been mapped for this capability.",
  ),
);

export const okxCapabilityEvidence = Object.freeze({
  derivativeMinimumNotional: {
    state: "UNVERIFIED",
    sourceIds: [OKX_API_SOURCE],
    note: "The public derivative instrument schema does not document a minimum-notional field.",
  },
  nextPeriodFundingRate: {
    state: "UNSUPPORTED",
    sourceIds: [OKX_API_SOURCE],
    note: "nextFundingRate is empty for current_period and next_period is documented as no longer supported.",
  },
  traditionalExpiryFutureFunding: {
    state: "UNSUPPORTED",
    sourceIds: [OKX_API_SOURCE],
    note: "Funding endpoints apply only to SWAP and X-Perp FUTURES.",
  },
  jsonBookChecksum: {
    state: "UNSUPPORTED",
    sourceIds: [OKX_CHANGELOG_SOURCE, OKX_CHECKSUM_SOURCE],
    note: "The field is fixed to zero and must not be used for verification.",
  },
  serverPrescribedGapRecovery: {
    state: "RESEARCH_REQUIRED",
    sourceIds: [OKX_API_SOURCE, OKX_CHANGELOG_SOURCE],
    note: "Current official JSON-books documentation defines sequence continuity and reconnect heartbeat behavior but not an exact server-prescribed gap recovery algorithm.",
  },
  regionalPublicWebSocketDomains: {
    state: "RESEARCH_REQUIRED",
    sourceIds: [OKX_API_SOURCE],
    note: "The Global public WebSocket URL is verified; region-specific WebSocket routing must be re-researched before regional deployment.",
  },
} as const);
