# ADR 0007: Binance USDⓈ-M public adapter boundary

- Status: accepted for Phase 2A.3 implementation; independent acceptance pending
- Date: 2026-08-02
- Owners: architecture, market data, security
- Sources: `BNFUT-01` through `BNFUT-05`, `BNFUT-08` through `BNFUT-11`

## Context

Phase 2A.3 needs one public, unauthenticated Binance USDⓈ-M Futures adapter
without weakening frozen Phase 2A.1 contracts or importing Binance Spot,
Alpha, COIN-M, private or trading behavior. Current Binance documentation has
migrated public WebSocket routing, a mixed derivatives product discriminator,
an overlap-based local-book bootstrap and a cadence inconsistency.

## Decision

Create the isolated `@arbitrage/binance-usdm-public-adapter` workspace.

The adapter fixes venue and product group to `BINANCE_FUTURES` and
`BINANCE_USDM_FUTURES`. Canonical CEX identity uses the opaque official
`symbol`, explicit product group, canonical market type and resolved
`marginAsset` settlement identity. `pair` and ticker text are display/reference
values only. Asset resolution is injected and fails closed. USDT and USDC are
never aliases.

Official identifiers and asset references are bounded opaque Unicode strings,
not ASCII grammars. Control/URL-delimiter characters fail at the transport
boundary and path components are encoded. A contract type without sufficient
canonical market semantics is counted and quarantined with finite telemetry;
it is never guessed into a canonical market type. The partially documented
`TRADIFI_PERPETUAL` and ambiguous `PERPETUAL_DELIVERING` therefore remain
`RESEARCH_REQUIRED` and quarantined.

Only the current official public TLS boundaries are allowed:

- REST: `https://fapi.binance.com` with a fixed path allowlist;
- WebSocket: `wss://fstream.binance.com/public/ws/<stream>`.

Redirects, arbitrary origins/paths and private endpoints are rejected. No
credential, signature or authentication surface exists.

All financial wire values remain strings through bounded runtime validation
and then enter the frozen exact-decimal domain. Update IDs are preserved from
JSON source text and converted directly to bigint; they never traverse a
JavaScript number. Timestamps and non-financial resource bounds may use safe
integers after explicit validation.

Metadata uses explicit `PRICE_FILTER.tickSize`, `LOT_SIZE.stepSize/minQty` and
`MIN_NOTIONAL.notional`. `pricePrecision` and `quantityPrecision` are ignored
for trading constraints. Contract multiplier is `UNVERIFIED`; direct
linear/inverse classification is `RESEARCH_REQUIRED`. Delivery Futures remain
distinct and do not expose funding.

`last`, bid, ask, `markPrice` and `indexPrice` produce separate observations.
`lastFundingRate` is canonical `LAST`, not predicted. Funding interval is
known only when a matching official `fundingInfo.fundingIntervalHours` row is
present; absence is unknown. `rateType=Special` history fails closed because
the frozen canonical observation cannot preserve its dividend-funding
semantic. No eight-hour default exists.

The local book follows the official algorithm:

1. connect and buffer diff-depth messages;
2. obtain the REST snapshot;
3. discard buffered records whose `u < lastUpdateId`;
4. bridge on `U <= lastUpdateId <= u`, without requiring first-event `pu`;
5. require every later `pu` to equal the previous accepted `u`;
6. interpret quantities as absolute and delete zero quantities;
7. on any gap, disconnect or invalid book, suppress executable output;
8. recover only with a new replacement snapshot and replay cycle.

The current migrated stream must contain `st=1`; other or absent product-family
records fail closed. No checksum is calculated or trusted. Native, 100 ms and
500 ms stream configurations are exposed; the documentation cadence conflict
remains `RESEARCH_REQUIRED` and none is a universal freshness assumption.

The bridge is processed whether it was buffered before or arrives after the
REST snapshot. An equality boundary (`u == lastUpdateId`) confirms the
snapshot boundary without replaying already represented levels; its successor
must still satisfy the official `pu` chain.

REST response, WebSocket message, JSON structure, queue, reconnect and canary
resources are bounded. HTTP 429 and 418 are distinct terminal request results;
there is no automatic REST retry and no invented `Retry-After` contract.
WebSocket reconnect is bounded and its attempt counter resets only after a
valid initialized/recovered book. The live canary is credential-free,
immutable, default-off, cancellable and produces point-in-time evidence only.

## Consequences

- Phase 2A.1 and the frozen OKX adapter remain unchanged.
- USDⓈ-M and COIN-M cannot share records or capability evidence.
- Incomplete funding interval, multiplier and classification data propagate as
  explicit evidence states instead of defaults.
- A gap temporarily sacrifices availability to preserve executable-book
  integrity.
- A later source recheck is mandatory before acceptance and each release,
  especially for routed streams, cadence and request weights.
- Live use still requires jurisdiction/data-rights approval and a formal
  independent Phase 2A.3 acceptance review.

## Rejected alternatives

- Parsing `symbol`/`pair` to derive canonical asset or settlement identity.
- Treating every USDⓈ-M instrument as perpetual or as officially linear.
- Using precision fields as tick/step or assuming an eight-hour interval.
- Requiring the bridge event's `pu` to equal the REST snapshot ID.
- Accepting ordinary deltas after a gap or inventing checksum recovery.
- Reusing Spot, Alpha, COIN-M, legacy WebSocket or authenticated endpoints.
- Retrying public REST requests automatically after 429, 418 or 5xx.
