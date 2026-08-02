# Phase 2A.3 formal independent acceptance review

## 1. Final status

| Field                       | Result                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| Review date                 | 2026-08-02                                                         |
| Accepted scope              | Binance USDⓈ-M Futures public, unauthenticated market-data adapter |
| Final status                | **PASS_WITH_WARNINGS**                                             |
| Unresolved BLOCKER findings | **0**                                                              |
| Unresolved HIGH findings    | **0**                                                              |
| Remediated BLOCKER findings | **1** frozen-test compatibility correction                         |
| Remediated HIGH findings    | **9**                                                              |
| Phase 2A.4 started          | **No**                                                             |
| Freeze recommendation       | **YES**, with the warnings and limitations in this report          |

This report replaces the implementation-produced draft. The review reproduced
official evidence, static behavior, tests, builds, dependency results, Docker
runtime behavior and the opt-in live canary independently. It does not approve
authenticated APIs, persistence, analytics UI or trading.

## 2. Scope and modules reviewed

Reviewed completely:

- all production source, tests and fixtures under
  `packages/binance-usdm-public-adapter`;
- root workspace, lockfile and quality-image changes;
- frozen `packages/market-data` and `packages/okx-public-adapter` diffs and
  compatibility;
- Phase 0 source/research/capability registers, implementation report, ADR,
  roadmap and risk-register changes;
- Phase 1 web/control-api build and runtime compatibility;
- Compose, web, control-api and quality Dockerfiles.

Scope isolation passed. No Binance Spot, Alpha, COIN-M, Options, Bybit or other
venue implementation was introduced. No credential, signing, authentication,
private endpoint, order, position, persistence, event-bus, Telegram, paper/live
trading, Risk Engine, Execution Engine, AI or billing path exists.

`packages/okx-public-adapter` remains byte-for-byte unchanged. The only frozen
`packages/market-data` change is the documented test-only compatibility fix in
section 11; no frozen production contract or behavior changed.

## 3. Current official sources

The following first-party sources were re-retrieved on **2026-08-02** and
compared directly with the implementation:

| Source ID | Official document                          | Retrieval date | Acceptance use                                                      |
| --------- | ------------------------------------------ | -------------- | ------------------------------------------------------------------- |
| BNFUT-01  | Market Data — Futures REST API             | 2026-08-02     | endpoints, parameters, weights, schemas and funding fields          |
| BNFUT-02  | Public Futures WebSocket Market Streams    | 2026-08-02     | routed diff depth, `U/u/pu`, `ps`, `st` and cadence                 |
| BNFUT-03  | Market Futures WebSocket Streams           | 2026-08-02     | mark/index/funding comparison evidence; not implemented as a stream |
| BNFUT-04  | How to manage a local order book correctly | 2026-08-02     | buffer/snapshot/overlap/`pu`/recovery procedure                     |
| BNFUT-05  | General Info                               | 2026-08-02     | REST origin, HTTP 429/418 and public limit behavior                 |
| BNFUT-08  | Change Log                                 | 2026-08-02     | current migration and `rateType` changes                            |
| BNFUT-09  | Important WebSocket Change Notice          | 2026-08-02     | routed `/public` host/path boundary                                 |
| BNFUT-10  | Common Definition                          | 2026-08-02     | contract/status/filter definitions                                  |
| BNFUT-11  | Connect                                    | 2026-08-02     | connection lifetime, ping/pong and connection limits                |

BNFUT-06 and BNFUT-07 retain their accurate 2026-07-26 retrieval dates; they
cover excluded trading/error scope and support no implemented Phase 2A.3 path.
The authoritative URLs and per-source warnings are in
`PHASE_0_SOURCE_REGISTER.md`.

Official-document ambiguities were not hidden:

1. BNFUT-02 prose lists 250/500/100 ms diff-depth cadence, while its parameter
   enum lists only 100/500 ms. Native, 100 ms and 500 ms remain explicit
   configuration; no universal production default is claimed.
2. BNFUT-09 says legacy URLs are decommissioned but also says unrouted public
   depth continues. The adapter uses only the routed
   `wss://fstream.binance.com/public` boundary.
3. The official English BNFUT-10 renderer was unstable. The official localized
   page exposes `PERPETUAL_DELIVERING`, but not enough canonical market-type
   semantics to map it.
4. Current exchange information returns `TRADIFI_PERPETUAL`; reviewed official
   evidence remains insufficient for canonical identity and financial mapping.

None of these contradictions invalidates the approved USDⓈ-M product group or
the frozen canonical contracts because affected records/configuration are
quarantined or explicitly `RESEARCH_REQUIRED`.

## 4. Verified capability matrix

| Capability                                   | State               | Verified behavior                                          |
| -------------------------------------------- | ------------------- | ---------------------------------------------------------- |
| Instrument metadata                          | `SUPPORTED`         | documented contract types only; unknown types quarantined  |
| Last ticker                                  | `SUPPORTED`         | V2 `price` -> `LAST_PRICE`                                 |
| Best bid / ask                               | `SUPPORTED`         | `bidPrice` / `askPrice`, separate observations             |
| Mark price                                   | `SUPPORTED`         | `markPrice` -> `MARK_PRICE` only                           |
| Index price                                  | `SUPPORTED`         | `indexPrice` -> `INDEX_PRICE` only                         |
| Latest funding                               | `SUPPORTED`         | `lastFundingRate` -> canonical `LAST`, never predicted     |
| Funding history                              | `SUPPORTED`         | Regular rows -> `LAST`; Special rows fail closed           |
| Adjusted funding interval                    | `SUPPORTED`         | `fundingIntervalHours` only when an official row exists    |
| Unadjusted funding interval                  | `UNVERIFIED`        | absence remains unknown; no eight-hour default             |
| Next funding time                            | `SUPPORTED`         | `nextFundingTime`; zero remains unknown                    |
| Predicted funding                            | `UNVERIFIED`        | no implemented prediction claim                            |
| Delivery-Futures funding                     | `UNSUPPORTED`       | mapping rejects fake funding                               |
| REST order-book snapshot                     | `SUPPORTED`         | `/fapi/v1/depth`, bounded official limits/weights          |
| WebSocket order-book snapshot                | `UNSUPPORTED`       | initialization is REST snapshot plus buffered diff depth   |
| WebSocket diff depth                         | `SUPPORTED`         | routed public stream; `st=1` mandatory                     |
| Sequence validation                          | `SUPPORTED`         | first overlap plus subsequent `pu` chain                   |
| Checksum validation                          | `UNVERIFIED`        | no checksum is calculated or trusted                       |
| Contract multiplier                          | `UNVERIFIED`        | never inferred                                             |
| Linear/inverse classification                | `RESEARCH_REQUIRED` | no direct approved field mapping                           |
| `TRADIFI_PERPETUAL` / `PERPETUAL_DELIVERING` | `RESEARCH_REQUIRED` | counted, observed and quarantined                          |
| Special dividend funding                     | `RESEARCH_REQUIRED` | frozen funding model has no approved semantic; fail closed |

Every `SUPPORTED` declaration has an implementation port and current BNFUT
source IDs. Unsupported and unknown states do not expose fake empty ports.

## 5. Exact metadata, price and funding mappings

### Metadata and identity

| Binance field                           | Canonical treatment                                            |
| --------------------------------------- | -------------------------------------------------------------- |
| `symbol`                                | opaque `OfficialInstrumentId`; never parsed for asset identity |
| `pair`                                  | exchange-native display/reference metadata only                |
| fixed adapter identity                  | venue `BINANCE_FUTURES`, product group `BINANCE_USDM_FUTURES`  |
| `baseAsset`                             | resolver input for base canonical asset                        |
| `quoteAsset`                            | resolver input for quote canonical asset                       |
| `marginAsset`                           | explicit settlement-asset resolver input                       |
| `contractType=PERPETUAL`                | canonical `PERPETUAL`                                          |
| documented month/quarter contract types | canonical `FUTURE` / `DATED_FUTURE`                            |
| undocumented contract type              | quarantine; no identity or observation                         |
| `status`                                | explicit lifecycle mapping; unknown status fails closed        |
| `PRICE_FILTER.tickSize`                 | tick size                                                      |
| `LOT_SIZE.stepSize`                     | quantity step                                                  |
| `LOT_SIZE.minQty`                       | minimum quantity                                               |
| `MIN_NOTIONAL.notional`                 | minimum notional only when the filter exists                   |
| `pricePrecision` / `quantityPrecision`  | validated exchange metadata, never tick/step substitutes       |

Canonical identity contains venue, product group, opaque official ID, market
type and explicit settlement asset. Resolver failure is fail-closed. USDT and
USDC therefore remain distinct even when display text resembles another
instrument. Bounded opaque Unicode identifiers are supported; URL delimiters
and control characters are rejected and the remaining path component is
encoded.

### Prices

`price`, `bidPrice`, `askPrice`, `markPrice` and `indexPrice` remain independent
exact-decimal observations. Missing/empty/non-string financial values fail
schema validation and never become zero. A locked or crossed book ticker is
`STALE`, not executable. Exchange, receive and processing timestamps,
provenance and quality remain explicit.

### Funding

- `premiumIndex.lastFundingRate` is the latest venue-native rate with semantic
  `LAST`; empty is `UNKNOWN`.
- `fundingRate.fundingRate` with Regular/omitted `rateType` is historical
  `LAST` at `fundingTime`.
- `rateType=Special` is rejected because it represents separate dividend
  funding semantics that the frozen canonical contract cannot preserve.
- `premiumIndex.nextFundingTime` is retained; official zero is unknown.
- `fundingInfo.fundingIntervalHours` is converted exactly to duration seconds
  only for the named symbol. Missing rows remain unknown.
- No eight-hour interval is hardcoded. The Phase 2A.1 normalized-eight-hour
  function remains a separately named derived calculation.
- Delivery Futures cannot produce current or historical funding observations.

## 6. Runtime schema and hostile-input evidence

Validation is bounded for streaming REST bytes, WebSocket bytes, JSON depth,
node count, array length, object-key count, string/decimal/update-ID lengths,
instrument count and book levels. UTF-8 decoding is fatal. Malformed JSON,
control characters, invalid timestamps, undocumented nulls, missing required
fields, non-string financial values, excessive decimals/nesting, negative
identifiers and non-USDⓈ-M stream records fail closed before domain mapping.

Financial wire values remain strings until frozen exact-decimal validation.
`U`, `u`, `pu` and `lastUpdateId` are preserved as integer strings and then
exact IDs; they never pass through JavaScript number. JavaScript numbers found
by the financial-type scan are restricted to non-financial bounds, counters,
timestamps, documented integer metadata and local RTT; financial amount
mapping uses no float/double, `parseFloat`, `toFixed` or implicit rounding.

Additional forward-compatible object fields are ignored only after global
shape bounds; required fields and documented discriminators/enums are strict.
Unknown product types are quarantined rather than silently accepted.

## 7. REST snapshot and U/u/pu evidence

The state-machine behavior was reproduced with focused regression, replay and
fault tests:

1. diff-depth events buffer before REST initialization;
2. `/fapi/v1/depth` returns a bounded exact snapshot with bigint-safe
   `lastUpdateId`;
3. buffered events with `u < lastUpdateId` are discarded without freshness
   refresh;
4. the first accepted event satisfies `U <= lastUpdateId <= u` and does **not**
   require `pu == lastUpdateId`;
5. equality `u == lastUpdateId` is an explicit boundary-confirming no-op; the
   next event must chain `pu` to that ID;
6. all later accepted events require `pu == previous accepted u`;
7. zero quantity deletes exactly one level; updates are absolute quantities;
8. duplicate/old events do not mutate or refresh accepted freshness;
9. malformed/overflowed IDs, invalid levels and locked/crossed books fail
   closed;
10. a continuity break immediately enters `GAPPED`/`STALE`, removes executable
    output and emits finite telemetry;
11. ordinary deltas and ordinary snapshots cannot recover a gap;
12. recovery requires explicit replacement snapshot plus a new complete
    overlap/replay cycle;
13. disconnect and shutdown revoke executable output;
14. deterministic fixture replay produces identical state; no checksum is
    implemented.

Both a first overlap buffered before the snapshot and one arriving after the
snapshot are covered. Reconnect-attempt state resets only after a fully ready,
bridged, non-recovery session.

## 8. Network, SSRF, rate-limit and observability evidence

- REST is fixed to `https://fapi.binance.com`; WSS is fixed to
  `wss://fstream.binance.com/public/ws/...`.
- Protocol, hostname, empty port, REST path and response URL are checked.
  Redirects use `redirect: error` and redirected/mismatched response URLs are
  rejected. User input can only populate validated/encoded query or stream
  components, never an origin.
- TLS hostname verification plus the hardcoded origin prevents a DNS result
  from authorizing another hostname. No credentials or authentication headers
  exist.
- REST bodies are bounded while streaming, including chunked responses without
  `Content-Length`. Requests have timeout/cancellation and no automatic retry.
- WebSocket frames, inbound queue, reconnect attempts and timers are bounded;
  duplicate connection loops are prevented and stop closes socket/timers/queue.
  Protocol ping/pong is delegated to the native WebSocket runtime per BNFUT-11;
  raw URL streams need no JSON subscription acknowledgement.
- Official depth weights and public per-minute budget are modeled. Funding
  history/config use only their official shared 500-per-five-minute budget;
  no undocumented additional endpoint weight is invented.
- HTTP 429 and 418 are distinct; neither creates automatic retry or invents a
  `Retry-After` contract. Budgets reject invalid/overflowing requests.
- Server time is schema-validated; RTT and offset use integer arithmetic.
  failure/unreliable RTT degrades time quality and never rewrites exchange
  financial timestamps.
- Metric labels are limited to fixed venue/product group, finite capability and
  finite quality. Symbol, URL, payload, raw exchange error and free-form reason
  are absent. Structured events use finite reason codes and never raw payloads
  or credentials.

Parse/schema rejection, product quarantine, duplicate, gap, stale,
initialization, recovery, reconnect/resubscribe, queue/response overflow, rate
limit, invalid book, time quality and canary outcome are observable.

## 9. Fixtures and provenance

Every fixture is represented in
`packages/binance-usdm-public-adapter/fixtures/manifest.json` with a BNFUT
source ID, 2026-08-02 retrieval date, `BINANCE_USDM_FUTURES` product group,
copied/minimally-transformed/synthetic origin and documented transformation.
No fixture imports Spot or COIN-M semantics. TRADIFI and
PERPETUAL_DELIVERING cases are synthetic quarantine-only evidence. Replay
fixtures cover REST initialization, initial overlap, `pu` continuity, zero
deletion, gap and explicit replacement recovery.

## 10. Finding classification

### Unresolved BLOCKER and HIGH

None.

### Remediated BLOCKER

| ID   | Defect                                                                                                                           | Smallest correction                                                                                          | Evidence                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| B-01 | Frozen fixture provenance test compared literal Markdown spacing, so the formatted Phase 0 source table made the full suite fail | Changed only the frozen test assertion to accept legal Markdown cell padding; no production contract changed | market-data 57/57 and quality image pass |

This is the only frozen-package compatibility correction and is justified by
the explicit full-suite acceptance requirement.

### Remediated HIGH

| ID   | Defect                                                                                         | Correction and regression evidence                                                                  |
| ---- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| H-01 | First overlap arriving after the REST snapshot remained queued forever                         | process bridge candidates immediately in `AWAITING_BRIDGE`; focused late-overlap test               |
| H-02 | Official equality boundary `u == lastUpdateId` could be discarded and cause a false gap        | explicit boundary-confirming no-op followed by required `pu` chain; equality regression test        |
| H-03 | Malformed frame marked stale but allowed ordinary-snapshot recovery                            | parse failure now requires explicit replacement recovery; regression test                           |
| H-04 | Initial bridge gap lacked the required gap metric/event                                        | fail-closed gap path now emits finite gap/stale telemetry; focused assertion                        |
| H-05 | Any schema-valid WebSocket message reset reconnect attempts before initialization              | reset only after `READY`, accepted bridge and no recovery requirement; reconnect regression test    |
| H-06 | `rateType=Special` could lose dividend semantics by becoming ordinary `LAST`                   | Special history now fails closed and capability is `RESEARCH_REQUIRED`; mapping test                |
| H-07 | `PERPETUAL_DELIVERING` could be mapped as an ordinary dated future without sufficient evidence | removed from mappable types; both undocumented types quarantined; parametrized test                 |
| H-08 | Funding history consumed an undocumented extra public endpoint weight                          | removed invented global weight; official shared funding budget remains; limiter test                |
| H-09 | Canary operations could exceed the claimed global duration when individually bounded           | one immutable 15-second abort deadline now covers all REST and WSS work; deadline/cancellation test |

### MEDIUM

- M-01: cadence and legacy/routed migration documentation remain
  contradictory; configuration stays explicit and release research remains
  mandatory.
- M-02: current live metadata returned **150** `TRADIFI_PERPETUAL` rows. They
  were correctly quarantined, but this is a material product-evidence gap.
- M-03: Special funding-history rows fail closed. A mixed response containing
  such a row may require caller-side isolation before other rows can be used;
  defining the missing semantic belongs to a canonical-model amendment.
- M-04: the full development dependency audit reports one pre-existing
  high-severity `brace-expansion <1.1.17` denial-of-service advisory through
  ESLint. Production dependencies are clean; dependency maintenance should
  update the tooling chain separately.
- M-05: rate budgets are process-local. A distributed budget belongs to later
  deployment architecture after measured need.
- M-06: geographic availability, terms and data-redistribution rights remain a
  product/legal gate rather than an adapter claim.

### LOW

- The public path allowlist includes the official combined-stream prefix, but
  Phase 2A.3 constructs only the fixed raw `/public/ws/` diff-depth path.
- Protocol pong is runtime-managed and therefore tested indirectly through the
  bounded live canary rather than through an application-level ping frame.
- The canary is a point-in-time compatibility probe, not a reliability,
  completeness or load test.

### ACCEPTED_LIMITATION

- No predicted funding, checksum, contract multiplier, inferred
  linear/inverse classification, unadjusted default interval or delivery-
  Futures funding is exposed.
- No persistence, event bus, long-running supervisor, historical store,
  authenticated API or trading path is present by approved scope.
- The local development environment initially had iCloud-evicted dependency
  files. A clean lockfile-based `npm ci` restored them; this was environmental,
  not a repository defect.

## 11. Commands and exact results

Authoritative Node execution used **Node 24.18.0** for both root and npm
lifecycle processes. Commands reproduced:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
npm run verify:compose

cd services/control-api
./gradlew clean ktlintCheck test bootJar --no-daemon

docker build --file infra/docker/quality.Dockerfile --target quality ...
docker build --file apps/web/Dockerfile ...
docker build --file services/control-api/Dockerfile ...
docker compose config --quiet
docker compose build control-api web
docker compose up --detach --wait --wait-timeout 180
docker compose ps
curl API health, actuator health/liveness/readiness and web endpoints

BINANCE_USDM_LIVE_CANARY=1 npm run test:canary \
  --workspace=@arbitrage/binance-usdm-public-adapter -- --reporter=verbose
BINANCE_USDM_LIVE_CANARY=1 npm run canary \
  --workspace=@arbitrage/binance-usdm-public-adapter

git diff --check
targeted secret/credential/private/trading/network/financial-type scans
```

Exact automated counts:

| Suite                      |  Passed |         Skipped | Result   |
| -------------------------- | ------: | --------------: | -------- |
| Contracts                  |       8 |               0 | PASS     |
| Frozen market-data         |      57 |               0 | PASS     |
| Frozen OKX adapter         |      52 | 1 opt-in canary | PASS     |
| Binance USDⓈ-M adapter     |      72 | 1 opt-in canary | PASS     |
| Web                        |       6 |               0 | PASS     |
| **Default Node total**     | **195** |           **2** | **PASS** |
| Binance opt-in live canary |       1 |               0 | PASS     |
| Kotlin                     |       2 |               0 | PASS     |

Formatting, lint, TypeScript, Kotlin formatting, bootJar, all Node production
builds, quality/web/control-api image builds, Compose validation,
`git diff --check`, forbidden-scope/secret/financial scans and
`npm audit --omit=dev` all passed. Production dependency audit result:
**0 vulnerabilities**.

## 12. Docker and live-canary evidence

An isolated `phase2a3acceptance` Compose project used ports
15432/16379/18080/13000. PostgreSQL, Redis, control-api and web all reached
`healthy`; `/api/v1/health`, `/actuator/health`, liveness and readiness returned
`UP`; the web endpoint returned HTTP 200 with a 30,356-byte response. The
review-only containers, network and volumes were then removed. The user's
pre-existing `arbitrage-platform` containers and data remained running and
healthy.

The credential-free opt-in canary passed. Direct point-in-time evidence at
`2026-08-02T19:00:31.873Z` reported:

- 701 documented-type instrument rows accepted;
- 150 undocumented `TRADIFI_PERPETUAL` rows quarantined;
- one bounded last-price, book-ticker and premium-index response;
- 743 adjusted-funding rows observed;
- one five-level REST depth snapshot and one routed `st=1` diff-depth message;
- server time and exact update IDs validated.

Counts, sampled symbol and sequence IDs are evidence only and are not
hardcoded. External failure, schema drift and implementation defect use
distinct fail-closed error paths.

## 13. Security observations and technical debt

The adapter exposes a least-privilege public-only network surface and carries
no secret material. Bounded streaming, exact values, explicit stale/gap state,
recovery gating and low-cardinality telemetry provide the intended financial
correctness boundary. There is no executable-trading output or authority.

Technical debt to schedule separately:

- update the ESLint transitive dependency chain for the dev-only
  `brace-expansion` advisory;
- resolve Binance cadence/migration contradictions before production rollout;
- obtain official semantics and product approval before admitting
  `TRADIFI_PERPETUAL`, `PERPETUAL_DELIVERING` or Special funding;
- choose a distributed rate-budget design only when multiple adapter replicas
  are approved;
- complete legal/geographic/data-redistribution review before a pilot.

## 14. Freeze recommendation

**Phase 2A.3 can be frozen with warnings.** All BLOCKER and HIGH findings are
remediated, the authoritative suites and runtime checks pass, live public
schemas were observed successfully, and unresolved items are explicitly
quarantined or non-production limitations. Freezing requires product-owner
approval; it must not silently approve the quarantined products or start Phase
2A.4.

## 15. Exact recommended next prompt

```text
Read AGENTS.md and all current architecture, roadmap, security, Phase 0,
Phase 1, frozen Phase 2A.1, frozen Phase 2A.2 and frozen Phase 2A.3
implementation and acceptance documents completely.

Phase 2A.1, Phase 2A.2 and Phase 2A.3 are frozen and approved.

Implement Phase 2A.4 only:
Bybit V5 linear public, unauthenticated market-data adapter.

Do not modify packages/market-data, packages/okx-public-adapter or
packages/binance-usdm-public-adapter except for an explicitly justified
BLOCKER compatibility correction. Do not implement any other venue or Bybit
inverse/options/spot product group. Do not add credentials, private APIs,
authentication, persistence, event bus, scanner UI, Telegram, positions,
paper/live trading, Risk Engine, Execution Engine, AI or billing.

Before changing files, inspect the complete repository and git diff;
re-retrieve current official Bybit V5 market, WebSocket order-book,
integration guidance, rate-limit, error and changelog documentation; update
the relevant Phase 0 source rows and warnings; present a concise plan, expected
files and blocking ambiguities; and stop if official evidence contradicts the
approved Bybit V5 linear product group or frozen canonical contracts.

Implement only source-backed public Bybit V5 linear capabilities: canonical
instrument metadata and USDT/USDC separation; exact last/bid/ask/mark/index
semantics; venue-native funding with documented interval/next time/history;
bounded REST snapshot where officially required; public WebSocket
snapshot/delta with documented `u`/`seq` semantics and `u=1` restart handling;
explicit replacement recovery; runtime schema and hostile-input bounds;
hardcoded official TLS origins/path allowlists and redirect rejection; bounded
queues, messages, timeouts, reconnect/resubscribe and cleanup; official rate
limits and server time; finite metrics/events; source-provenanced fixtures;
deterministic replay/fault/property tests; and a default-off credential-free
bounded live canary.

Do not infer endpoints, fields, interval, checksum, sequence, product or
recovery semantics. Declare every capability SUPPORTED, UNSUPPORTED,
UNVERIFIED or RESEARCH_REQUIRED, with current official source IDs for every
SUPPORTED claim. Any gap, ambiguous restart, disconnect, overflow, stale
timestamp or invalid/crossed book must suppress executable output until the
officially justified explicit recovery path completes.

Create docs/PHASE_2A_4_BYBIT_LINEAR_PUBLIC_ADAPTER.md,
docs/PHASE_2A_4_ACCEPTANCE.md as implementation-produced pre-acceptance
evidence, and docs/adr/0008-bybit-v5-linear-public-adapter-boundary.md. Update
only relevant Phase 0 evidence, capability, roadmap, risk and workspace quality
configuration.

Run pinned Node 24 formatting, linting, type checking, all Node tests and
production builds; Kotlin formatting/tests/bootJar; production dependency
audit; quality/web/backend image builds; Compose validation/startup and all
health endpoints; git diff/secret/forbidden-scope/financial-type scans; and the
bounded live canary when public access permits. Report exact test counts,
runtime evidence, sources, mappings, sequence/recovery behavior, limitations,
risks and whether Phase 2A.4 can enter formal independent acceptance review.

Do not create a commit and do not begin Phase 2B.
```
