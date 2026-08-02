# Phase 2A.2 — OKX Exchange V5 Public Adapter

## 1. Status and boundary

Implementation date: 2026-07-26.

Status: implemented and independently reviewed on 2026-07-27; see
`PHASE_2A_2_ACCEPTANCE.md` for the authoritative freeze recommendation.

The implementation is limited to public, unauthenticated OKX Exchange API V5
Swap and Futures market data. It adds no private calls, authentication,
credentials, orders, positions, persistence, event bus, UI, paper/live trading,
Risk Engine, Execution Engine, AI, billing, DEX, Binance or Bybit code.

The adapter is an isolated npm workspace,
`@arbitrage/okx-public-adapter`. It consumes the frozen
`@arbitrage/market-data` contracts without modifying them.

## 2. Official evidence

All sources were re-retrieved again on **2026-07-27** for formal acceptance.

| Source ID | Official source                                | URL                                                                               | Evidence used                                                                                              |
| --------- | ---------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `OKX-01`  | OKX API guide                                  | https://www.okx.com/docs-v5/en/                                                   | Public hosts, endpoints, fields, rates, JSON books channel, sequence exceptions, heartbeat and server time |
| `OKX-02`  | OKX API changelog                              | https://www.okx.com/docs-v5/log_en/                                               | Current changes through 2026-07-23, X-Perp support, checksum deprecation and Global REST domain            |
| `OKX-03`  | Order Book Channels Checksum Field Deprecation | https://www.okx.com/en-eu/help/okx-order-book-channels-checksum-field-deprecation | Checksum fixed to zero and prohibited as an integrity check                                                |

The current official evidence does not contradict the approved OKX Exchange V5
Swap/Futures product group or the Phase 2A.1 contracts. It does narrow several
earlier assumptions: derivative `baseCcy`/`quoteCcy` are not applicable,
`fundingRate` is predicted, `nextFundingRate` is unavailable for the current
mechanism, and checksum validation is unsupported.

## 3. Architecture

The adapter has five explicit boundaries:

1. `OkxPublicRestClient`: allowlisted public GET endpoints, local rate budgets,
   timeouts, response-size bounds and runtime envelopes;
2. wire schemas: rejects unknown product categories, malformed structures,
   unsafe sequence numbers, invalid enums and malformed decimals before domain
   mapping;
3. semantic mappers: require a reviewed external asset resolver and create
   Phase 2A.1 observations;
4. `OkxBookSession`: maps JSON `books` messages into the frozen
   previous-ID-chain state machine and owns executable-trust suppression;
5. `OkxPublicWebSocketController`: bounded queue, heartbeat, injected freshness
   policy, reconnect/resubscribe and replacement recovery.

The common `PublicMarketDataAdapter` ports are exposed by a bound
`OkxPublicAdapter`. The bound identity prevents a response for one official
instrument from being silently applied to another.

## 4. Verified public endpoints and channels

| Capability               | Official operation                                      | Access and documented limit                                                    | Source   |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------ | -------- |
| Instrument metadata      | `GET /api/v5/public/instruments?instType=SWAP\|FUTURES` | Public; 20 requests/2 seconds, IP + instrument type                            | `OKX-01` |
| Tickers                  | `GET /api/v5/market/tickers?instType=...`               | Public; 20/2 seconds, IP                                                       | `OKX-01` |
| Mark price               | `GET /api/v5/public/mark-price`                         | Public; 10/2 seconds, IP + instrument ID                                       | `OKX-01` |
| Index price              | `GET /api/v5/market/index-tickers?instId=<uly>`         | Public; 20/2 seconds, IP                                                       | `OKX-01` |
| Current funding response | `GET /api/v5/public/funding-rate?instId=...`            | Public; 10/2 seconds, IP + instrument ID; Swap and X-Perp Futures only         | `OKX-01` |
| Funding history          | `GET /api/v5/public/funding-rate-history?instId=...`    | Public; 10/2 seconds, IP + instrument ID; maximum 400 rows                     | `OKX-01` |
| REST book                | `GET /api/v5/market/books?instId=...&sz=...`            | Public; 40/2 seconds, IP; maximum 400 levels; approximately 50 ms cache update | `OKX-01` |
| Server time              | `GET /api/v5/public/time`                               | Public; 10/2 seconds, IP                                                       | `OKX-01` |
| JSON order book          | `wss://ws.okx.com:8443/ws/v5/public`, channel `books`   | Public, no login; initial snapshot then approximately 100 ms deltas            | `OKX-01` |

The Global REST origin is `https://openapi.okx.com`, recommended by the
2026-05-20 changelog. `www.okx.com` remains supported by OKX but is not the
adapter default. The REST origin is restricted to the documented Global, US,
EEA and Türkiye allowlist; Global public WebSocket is the only implemented WS
route. Regional deployment remains gated by additional official research.
Source: `OKX-01`, `OKX-02`.

## 5. Exact field and semantic mapping

### 5.1 Instrument identity and metadata

| OKX field(s)                                     | Canonical mapping                          | Rule                                                                                                                                                                                                                                                                                                 | Source                          |
| ------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `instId`                                         | `OfficialInstrumentId`, display symbol     | Preserved as an opaque official identifier; never parsed for identity                                                                                                                                                                                                                                | `OKX-01`                        |
| constant adapter values                          | venue/product group                        | `OKX_EXCHANGE` + `OKX_V5_SWAP_FUTURES`                                                                                                                                                                                                                                                               | `OKX-01`, approved P0 decisions |
| `instType=SWAP`                                  | market/contract type                       | `PERPETUAL`                                                                                                                                                                                                                                                                                          | `OKX-01`                        |
| `instType=FUTURES`, `ruleType=normal`            | market/contract type                       | `FUTURE` / `DATED_FUTURE`                                                                                                                                                                                                                                                                            | `OKX-01`                        |
| `instType=FUTURES`, `ruleType=pre_market\|xperp` | market/contract type                       | `PERPETUAL`                                                                                                                                                                                                                                                                                          | `OKX-01`, `OKX-02`              |
| `settleCcy`                                      | settlement asset                           | Must resolve through the injected reviewed asset resolver                                                                                                                                                                                                                                            | `OKX-01`                        |
| linear `ctValCcy`, `settleCcy`                   | base, quote, settlement                    | Base=`ctValCcy`; quote=settlement=`settleCcy`                                                                                                                                                                                                                                                        | `OKX-01`                        |
| inverse `settleCcy`, `ctValCcy`                  | base, quote, settlement                    | Base=settlement=`settleCcy`; quote=`ctValCcy`                                                                                                                                                                                                                                                        | `OKX-01`                        |
| `baseCcy`, `quoteCcy`                            | no derivative mapping                      | Current docs limit these fields to Spot/Margin; non-empty values are quarantined                                                                                                                                                                                                                     | `OKX-01`                        |
| `ctType`                                         | contract value convention                  | `linear` → `LINEAR`; `inverse` → `INVERSE`                                                                                                                                                                                                                                                           | `OKX-01`                        |
| `ctVal`; `ctMult=""\|1`                          | canonical contract multiplier              | `ctVal` is stored as the documented face value of one contract because the current notional formulas use it directly. `ctMult` is validated separately; the documented empty value and point-in-time observed unit value are accepted, while any other value is quarantined pending renewed research | `OKX-01`                        |
| `tickSz`, `lotSz`, `minSz`                       | tick size, quantity step, minimum quantity | Exact plain-decimal parsing; derivative quantity unit is contracts                                                                                                                                                                                                                                   | `OKX-01`                        |
| no derivative field                              | minimum notional                           | `UNVERIFIED`, never zero                                                                                                                                                                                                                                                                             | `OKX-01`                        |
| `state`                                          | lifecycle                                  | `live` active; `preopen` pre-launch; `settling` settling; suspend/rebase/post-only/test non-actionable                                                                                                                                                                                               | `OKX-01`                        |
| `uly`                                            | official index lookup ID                   | Used verbatim for the index endpoint; never reconstructed from `instId`                                                                                                                                                                                                                              | `OKX-01`                        |

Canonical identity remains:

`venue + product group + official instrument ID + market type + settlement asset`.

The asset resolver is mandatory. It must use approved mapping provenance
outside this adapter; a missing mapping throws and quarantines the instrument.
USDT and USDC therefore remain different canonical assets and instrument IDs.

### 5.2 Prices

| OKX field              | Canonical object | Source   |
| ---------------------- | ---------------- | -------- |
| ticker `last`          | `LAST_PRICE`     | `OKX-01` |
| ticker `bidPx`         | `BID_PRICE`      | `OKX-01` |
| ticker `askPx`         | `ASK_PRICE`      | `OKX-01` |
| mark response `markPx` | `MARK_PRICE`     | `OKX-01` |
| index response `idxPx` | `INDEX_PRICE`    | `OKX-01` |

Empty ticker values produce no observation. Mark and index values are never
renamed to each other, and this adapter does not synthesize midpoint. A
locked/crossed ticker or a timestamp outside the injected channel freshness
policy is `STALE`, never healthy executable evidence.

### 5.3 Funding

| OKX field/state                           | Canonical semantic                | Rule                                                                 | Source   |
| ----------------------------------------- | --------------------------------- | -------------------------------------------------------------------- | -------- |
| `fundingRate`                             | `PREDICTED`                       | Forecast for the upcoming `fundingTime`; final settlement may differ | `OKX-01` |
| `settFundingRate`, `settState=processing` | `CURRENT`                         | Rate being used in the current settlement cycle                      | `OKX-01` |
| `settFundingRate`, `settState=settled`    | `LAST`                            | Previous settled cycle                                               | `OKX-01` |
| `fundingTime`                             | next settlement for `fundingRate` | Preserved independently                                              | `OKX-01` |
| `nextFundingTime - fundingTime`           | interval duration                 | Positive whole-second exact difference; no fixed eight hours         | `OKX-01` |
| `nextFundingRate=""`                      | unavailable next-period rate      | `UNSUPPORTED`; never mapped to zero                                  | `OKX-01` |
| history `fundingRate`                     | historical `PREDICTED`            | Stored separately from realized value                                | `OKX-01` |
| history `realizedRate`                    | historical `LAST`                 | Empty remains unknown                                                | `OKX-01` |

Traditional expiry Futures funding is `UNSUPPORTED`. History rows do not carry
a documented per-row interval or next time, so those values remain
`RESEARCH_REQUIRED`/unknown. The separately named
`normalized-funding-8h/v1` Phase 2A.1 function may be applied only after the
native observation and timestamp-derived interval exist.

## 6. Order-book integrity

The implemented channel is public JSON `books` only. VIP/SBE channels are not
implemented.

1. An `action=snapshot` must have `prevSeqId=-1`; it initializes or explicitly
   replaces the book. Source: `OKX-01`.
2. An `action=update` replaces quantities at exact prices and deletes a level
   when quantity is zero. Derivative quantity is contracts. Source: `OKX-01`.
3. A normal delta is valid only when its `prevSeqId` equals the last accepted
   `seqId`. `seqId` may jump; contiguity by `+1` is not invented. Source:
   `OKX-01`.
4. The documented empty update with `seqId=prevSeqId=last seqId` is a heartbeat,
   not an executable mutation or a gap. Source: `OKX-01`.
5. A smaller maintenance `seqId` is a documented exception. The adapter
   conservatively marks the book stale and reconnects instead of weakening the
   frozen monotonic state machine. Source: `OKX-01`; local safety policy:
   ADR 0006.
6. Any other link failure, malformed message, queue overflow, freshness
   violation, disconnect or invalid/crossed book suppresses executable output
   immediately.
7. Recovery requires a new validated `action=snapshot`. Deltas remain
   non-executable until that replacement. This is a fail-closed application
   policy because the exact server-prescribed JSON gap-recovery algorithm is
   `RESEARCH_REQUIRED`.
8. `checksum` must be exactly zero. It is never calculated or checked because
   official documentation says it is deprecated and must not be used. Sources:
   `OKX-02`, `OKX-03`.
9. Duplicate or older snapshots and same-ID level-bearing updates are rejected
   without mutation. Only an empty same-ID update is a heartbeat.

Sequence JSON tokens are captured from the raw source text before JavaScript
number conversion. They are then validated as unsigned decimal strings and
converted to `bigint`, preventing safe-integer truncation.

## 7. Transport and operational controls

| Control                 | Implementation                                                                                                               | Evidence                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| REST timeout            | Default 8 seconds, configurable downward/upward by constructor                                                               | Local safety bound                                   |
| REST body               | 2,000,000-byte default, `Content-Length` precheck and streaming byte-count cancellation                                      | Local safety bound                                   |
| JSON structure          | Global depth, node, array, object-key and integer-digit limits; endpoint-specific row/level bounds                           | Local fail-closed policy                             |
| REST retry              | No automatic retry; HTTP 429 returns a typed error and optional `Retry-After`                                                | Endpoint limits: `OKX-01`                            |
| REST rate budgets       | Per-path sliding windows set to current official limits                                                                      | `OKX-01`                                             |
| WS message              | 1,000,000-byte default                                                                                                       | Local safety bound                                   |
| Inbound queue           | 2,048 messages / 16,000,000 bytes default                                                                                    | Local safety bound                                   |
| Subscription            | 64 KB maximum, one books argument per controller                                                                             | `OKX-01`                                             |
| Subscription request ID | Fixed alphanumeric ID under 32 characters; no punctuation                                                                    | `OKX-01`                                             |
| WS operation budget     | 480 subscribe/unsubscribe/login operations per connection/hour                                                               | `OKX-01`                                             |
| WS connect rate         | Shared process-local sliding window enforces 3 connection attempts/s; reconnect also uses bounded exponential delay          | `OKX-01` plus local safety policy                    |
| WS connect timeout      | A connection that does not open within 10 seconds is closed, marked stale and enters bounded recovery                        | Local safety bound                                   |
| Heartbeat               | After transport inactivity, send string `ping`, require `pong`, otherwise reconnect                                          | `OKX-01`                                             |
| Service upgrade         | Notice `64008` makes data stale and creates a replacement connection                                                         | `OKX-01`                                             |
| Freshness               | A mandatory venue/product/channel policy supplies healthy and stale thresholds; degraded/stale suppress executable output    | Phase 2A.1 contract plus local policy                |
| Reconnect               | Disconnect/error/timeout clears connection timers, marks the book stale, uses bounded backoff and resubscribes automatically | Local safety policy; reconnect requirement: `OKX-01` |

No URL, endpoint or credential is accepted from market-data payloads. REST
origins are allowlisted and WebSocket uses the official Global TLS URL. No
authentication header or login operation exists.

## 8. Observability

Structured events cover message receipt, parse failure, queue overflow, rate
limit, degraded/stale transition, invalid book, gap/recovery,
reconnect/resubscribe, service upgrade, maintenance reset, server-time
degradation and canary outcome.

Counters cover messages, parse failures, gaps, duplicates, stale transitions,
recoveries, reconnects, queue overflow, rate limits, invalid books and canary
outcomes. Bounded observations cover last success and receive/processing lag.
Metric dimensions are limited to venue, product group, canonical capability
and quality state. Official instrument IDs, symbols, payloads, URLs and raw
errors are not metric labels.

This is a contract and in-memory recording harness, not production monitoring
infrastructure.

## 9. Fixtures, replay and fault injection

`packages/okx-public-adapter/fixtures/manifest.json` records source IDs,
retrieval date, product group, origin and transformations for every fixture.

- `public-rest.json`: minimally transformed metadata, ticker, mark, index,
  funding and REST-book examples, with explicit USDT/USDC separation;
- `books-sequence.json`: synthetic documented snapshot, chained delta,
  zero-quantity deletion, heartbeat, gap, maintenance reset and recovery;
- `malformed.json`: synthetic adversarial decimal, checksum, identity,
  sequence, structure and size cases.

The replay harness can drop, duplicate or replace frames. Replaying the same
valid fixture produces the same sorted book and sequence. Faulted gaps remove
executable output.

## 10. Credential-free canary

The canary is disabled by default. `npm run canary
--workspace=@arbitrage/okx-public-adapter` prints a skip message unless
`OKX_LIVE_CANARY=1` is explicitly set.

When enabled it performs only bounded public calls: server time, Swap/Futures
instruments, Swap tickers, one mark response, one five-level REST book and one
JSON-books WebSocket snapshot. It sends no login, credential or private call
and closes after the first valid snapshot, 32 messages or a ten-second
deadline. Bounds cannot be expanded by caller options.

The canary validates the public wire boundary only. It does not create
canonical assets without a separately reviewed mapping.

## 11. Capability disposition

### Verified and implemented

- instrument metadata for Swap and Futures;
- last/bid/ask, mark and index prices;
- predicted and conditional current/last funding, history, derived native
  interval and settlement time;
- REST and JSON-WebSocket books;
- previous-ID sequence validation;
- public time and documented rate/heartbeat limits.

### Unsupported

- JSON checksum validation;
- next-period `nextFundingRate` in the current mechanism;
- funding for traditional expiry Futures.

### Unverified

- derivative minimum notional.

### Research required

- exact server-prescribed JSON gap recovery;
- regional public WebSocket routing and product availability;
- future schema fields not present in the reviewed guide.

## 12. Acceptance criteria

The formal review completed these gates:

- formatting, lint, type checking, all Node/Kotlin tests, builds and production
  audit pass;
- Docker quality/image/Compose runtime and health checks pass;
- the opt-in public canary completes without credentials;
- deterministic tests cover schemas, exact decimals, USDT/USDC identity,
  funding semantics, heartbeat, duplicate, gap, maintenance reset, queue
  overflow, freshness, reconnect/resubscribe and replacement recovery;
- forbidden-scope scans find no credentials, auth, private API, persistence or
  trading implementation;
- the formal reviewer independently checks current OKX docs and canary
  evidence.

The authoritative result is `PASS_WITH_WARNINGS` in
`PHASE_2A_2_ACCEPTANCE.md`. Passing and freezing this phase does not approve
Phase 2A.3 or any authenticated/trading phase.

## 13. Implementation verification evidence

On 2026-07-27, the final pinned Node 24 quality image passed formatting, lint,
type checking, all production builds and 119 offline Node tests, with the
credential-free live test intentionally skipped in the offline suite. The
opt-in live canary test then passed separately. Kotlin formatting, two tests
and `bootJar`, production dependency audit, both application images, Compose
invariants, four-service clean-state runtime health and all health endpoints
passed.

The live canary sampled:

- server time `1785104997802`;
- 426 Swap and 130 Futures instrument rows;
- one live `BTC-USD-SWAP`;
- 426 Swap ticker rows and one mark row;
- REST book sequence `95963622653`;
- JSON-WebSocket snapshot sequence `95963623032`.

These counts and IDs are point-in-time runtime evidence, not hardcoded product
assumptions.

The first live canary attempt correctly exposed an invalid punctuation-bearing
subscription request ID (`60033 Parameter id error`). The implementation was
changed to fixed alphanumeric IDs, regression assertions were added, the full
pinned quality image was rebuilt, and both the canary script and live canary
test then passed.

The independent formal review additionally remediated channel freshness,
crossed/locked REST evidence, structural JSON bounds, server-time quality,
disconnect/timeout cleanup, duplicate snapshot recovery, `ctVal`/`ctMult`
ambiguity, REST observability and hard canary bounds. Focused regression tests
cover every remediation; details are in `PHASE_2A_2_ACCEPTANCE.md`.
