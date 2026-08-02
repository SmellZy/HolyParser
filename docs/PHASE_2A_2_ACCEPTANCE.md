# Phase 2A.2 Formal Acceptance Review

## 1. Final status

| Field                           | Result                                                                   |
| ------------------------------- | ------------------------------------------------------------------------ |
| Review date                     | 2026-07-27                                                               |
| Final status                    | **PASS_WITH_WARNINGS**                                                   |
| Accepted scope                  | OKX Exchange V5 Swap/Futures public, unauthenticated market-data adapter |
| BLOCKER findings                | 0                                                                        |
| HIGH findings after remediation | 0 open                                                                   |
| Phase 2A.1 frozen package       | Unchanged                                                                |
| Phase 2A.3 started              | No                                                                       |
| Freeze recommendation           | **Yes — Phase 2A.2 can be frozen**                                       |

The implementation meets the approved Phase 2A.2 scope after the focused HIGH
remediations recorded below. Remaining findings are bounded, documented and do
not permit invalid market data to become executable. This review does not
approve Binance, authenticated OKX APIs, persistence, analytics, positions or
trading.

## 2. Accepted and excluded scope

Accepted:

- isolated `@arbitrage/okx-public-adapter` workspace;
- OKX Exchange API V5 public Swap and Futures metadata;
- public ticker, mark, index, funding, funding-history, REST-book and
  JSON-WebSocket `books` boundaries;
- exact semantic mapping into frozen Phase 2A.1 contracts;
- bounded REST and WebSocket transports;
- deterministic sequence-chain state, fail-closed recovery and replay;
- low-cardinality metrics/events and a bounded credential-free canary.

Confirmed absent:

- Binance, Bybit, OKX DEX or any other venue adapter;
- credentials, signatures, login or private/authenticated calls;
- orders, positions, balances, execution or trading paths;
- database persistence, event bus and historical storage;
- scanner UI, Telegram, paper/live trading, Risk Engine, Execution Engine, AI
  and billing.

## 3. Files and modules reviewed

The review covered the complete repository and git diff, with detailed
inspection of:

- all production and test files under `packages/okx-public-adapter`;
- fixture payloads and `fixtures/manifest.json`;
- frozen `packages/market-data` contracts and state machines;
- workspace scripts, package manifests and lockfile;
- web and control-service compatibility;
- `compose.yaml`, application Dockerfiles and
  `infra/docker/quality.Dockerfile`;
- Phase 0 source/capability records, Phase 2A.1 contracts and acceptance;
- `docs/PHASE_2A_2_OKX_PUBLIC_ADAPTER.md`;
- ADR 0006 and this acceptance report.

`git diff -- packages/market-data` remained empty.

## 4. Current official evidence

The following first-party sources were independently re-retrieved on
**2026-07-27**:

| Source   | Official document                              | URL                                                                               | Retrieved artifact SHA-256                                         | Acceptance use                                                                   |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `OKX-01` | OKX API guide                                  | https://www.okx.com/docs-v5/en/                                                   | `c75edd5b041b36fc33f981b4c71b29f12f45104efd1e9c4e276881b84864b494` | Hosts, endpoints, fields, product semantics, rates, heartbeat, sequence and time |
| `OKX-02` | OKX API changelog                              | https://www.okx.com/docs-v5/log_en/                                               | `90b0e2ea15c4e7fba080f0d443c9d9c36508e3317e533e717c091a4ebf9bc3af` | X-Perp, host migration, checksum change and changes through 2026-07-23           |
| `OKX-03` | Order Book Channels Checksum Field Deprecation | https://www.okx.com/en-eu/help/okx-order-book-channels-checksum-field-deprecation | `9aed4f00bb913800fd900b8d607db009db4f72f151e32079f3d890e368c4d5cc` | JSON checksum fixed to zero and prohibited as an integrity mechanism             |

Source-register retrieval dates and warnings were updated. The future-dated
2026-07-28 `books-rpi` changelog item does not change the implemented regular
JSON `books` channel.

No source contradicts the approved OKX V5 Swap/Futures product group or frozen
Phase 2A.1 contracts. Two ambiguities remain explicit:

1. OKX documents sequence continuity but not one exact server-prescribed JSON
   gap-recovery procedure. Replacement-snapshot recovery is a local fail-closed
   policy.
2. The guide example leaves `ctMult` empty, while the 2026-07-27 live probe
   returned `ctMult="1"` for current derivative rows. Current notional formulas
   use `ctVal` directly. The adapter accepts only empty or exact unit `ctMult`,
   never combines the fields, and quarantines any other value.

## 5. Verified capability matrix

| Capability                          | Status                             | Implemented evidence                                                      |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| Swap/Futures instrument metadata    | `SUPPORTED`                        | `GET /api/v5/public/instruments`; `OKX-01`, `OKX-02`                      |
| Last/bid/ask ticker                 | `SUPPORTED`                        | `GET /api/v5/market/tickers`; `OKX-01`                                    |
| Mark price                          | `SUPPORTED`                        | `GET /api/v5/public/mark-price`; `OKX-01`                                 |
| Index price                         | `SUPPORTED`                        | `GET /api/v5/market/index-tickers`; `OKX-01`                              |
| Predicted funding                   | `SUPPORTED`                        | `fundingRate`; `OKX-01`                                                   |
| Conditional current/last funding    | `SUPPORTED`                        | `settFundingRate` + `settState`; `OKX-01`                                 |
| Funding history                     | `SUPPORTED`                        | Swap and X-Perp Futures only; `OKX-01`                                    |
| Native funding interval             | `SUPPORTED`                        | Exact `nextFundingTime - fundingTime`; `OKX-01`                           |
| Next settlement time                | `SUPPORTED`                        | `fundingTime`; `OKX-01`                                                   |
| REST order-book snapshot            | `SUPPORTED`                        | `GET /api/v5/market/books`; `OKX-01`                                      |
| WS snapshot and delta               | `SUPPORTED`                        | Public JSON `books`; `OKX-01`                                             |
| Sequence validation                 | `SUPPORTED`                        | Exact `seqId`/`prevSeqId` chain; `OKX-01`, `OKX-02`                       |
| JSON checksum validation            | `UNSUPPORTED`                      | Fixed zero; no calculation or trust; `OKX-02`, `OKX-03`                   |
| Next-period `nextFundingRate`       | `UNSUPPORTED`                      | Empty under `current_period`; `next_period` no longer supported; `OKX-01` |
| Traditional expiry-Futures funding  | `UNSUPPORTED`                      | Funding API applies to Swap and X-Perp Futures; `OKX-01`                  |
| Derivative minimum notional         | `UNVERIFIED`                       | No verified derivative field in the reviewed schema                       |
| Exact vendor gap-recovery algorithm | `RESEARCH_REQUIRED`                | Continuity is documented; exact procedure is not                          |
| Regional public WS routing          | `RESEARCH_REQUIRED`                | Only Global public WS is implemented                                      |
| Demo/testnet adapter                | Not implemented, out of Phase 2A.2 | No capability is inferred                                                 |

## 6. Exact mappings and identity evidence

| OKX wire field/state                   | Canonical mapping                                              | Acceptance result                             |
| -------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| `instId`                               | Opaque `OfficialInstrumentId` and display symbol               | Never parsed for identity                     |
| constants                              | `OKX_EXCHANGE`, `OKX_V5_SWAP_FUTURES`                          | Fixed adapter identity                        |
| `instType=SWAP`                        | `PERPETUAL`                                                    | Verified                                      |
| `FUTURES + ruleType=normal`            | `FUTURE` / `DATED_FUTURE`                                      | Verified                                      |
| `FUTURES + pre_market/xperp`           | `PERPETUAL`                                                    | Verified for X-Perp                           |
| `settleCcy`                            | Explicit settlement asset via reviewed resolver                | Missing mapping fails closed                  |
| linear `ctValCcy`, `settleCcy`         | base=`ctValCcy`; quote/settlement=`settleCcy`                  | Verified                                      |
| inverse `settleCcy`, `ctValCcy`        | base/settlement=`settleCcy`; quote=`ctValCcy`                  | Verified                                      |
| `baseCcy`, `quoteCcy`                  | Not used for derivative identity                               | Non-empty value is quarantined                |
| `ctVal`                                | Exact face value of one contract in canonical multiplier field | No floating point                             |
| `ctMult`                               | Independent empty/unit guard                                   | Other values fail closed                      |
| `ctType`                               | `LINEAR` / `INVERSE`                                           | No symbol inference                           |
| `tickSz`, `lotSz`, `minSz`             | exact tick, quantity step and minimum quantity                 | No rounding                                   |
| no verified field                      | minimum notional `UNVERIFIED`                                  | Never defaulted to zero                       |
| `state`                                | active/pre-launch/settling/suspended lifecycle                 | Unknown enum rejected                         |
| `uly`                                  | opaque official index lookup ID                                | Never reconstructed from `instId`             |
| `last`, `bidPx`, `askPx`               | separate last/bid/ask observations                             | Missing values omitted, never zero            |
| `markPx`                               | `MARK_PRICE`                                                   | Never mapped to index                         |
| `idxPx`                                | `INDEX_PRICE`                                                  | Never mapped to mark                          |
| `fundingRate`                          | `PREDICTED`                                                    | Never current/last                            |
| `settFundingRate + processing`         | `CURRENT`                                                      | Separate observation                          |
| `settFundingRate + settled`            | `LAST`                                                         | Separate observation                          |
| `fundingTime`                          | next settlement of predicted observation                       | Preserved exactly                             |
| `nextFundingTime - fundingTime`        | venue-native interval                                          | Positive exact duration; no fixed eight hours |
| history `fundingRate` / `realizedRate` | historical predicted / last                                    | Never conflated                               |

Canonical identity includes venue, product group, official instrument ID,
market type and settlement asset. Injected asset resolution is mandatory.
Focused tests prove that USDT and USDC instruments do not compare equal.

All financial wire values remain strings through schema validation and then use
the frozen exact-decimal type. Scientific notation, malformed values, more than
36 canonical fractional digits, more than 78 significant digits, silent
rounding, negative prices/quantities and invalid zero snapshot quantities fail
closed. No financial `float`, `double` or JavaScript `number` path was found.

## 7. Runtime-schema and data-quality evidence

- Required envelope and row fields cannot disappear silently.
- Undocumented `null` is rejected; documented empty strings remain distinct.
- Unknown additional fields are intentionally ignored for forward
  compatibility, but the entire payload is still bounded.
- Limits cover response bytes, WS frame bytes, JSON depth, node count, array
  length, object-key count, field length, book levels and integer digits.
- Malformed JSON, excessive nesting, huge arrays, hostile decimals and
  overflowed sequence identifiers fail closed.
- Sequence tokens are preserved from JSON source text and never traverse
  JavaScript `number`.
- Millisecond epochs are validated as bounded unsigned integers before ISO
  conversion.
- Per-channel freshness policies and future-skew bounds are injected; no
  global timeout is hardcoded.
- Stale/locked/crossed ticker or REST-book evidence cannot be healthy.
- Server time is schema-validated. Round-trip and midpoint clock offset are
  measured without rewriting any financial timestamp; failure changes the
  server-time state to `DEGRADED`.

## 8. Sequence, heartbeat and recovery evidence

The deterministic review verified:

1. An initial snapshot requires `prevSeqId=-1`.
2. A normal delta requires `prevSeqId == last accepted seqId`.
3. `seqId` is not required to increment by one.
4. Duplicate/older deltas are rejected without mutation.
5. Duplicate/older snapshots are rejected while the book is healthy.
6. Only an empty update with
   `seqId=prevSeqId=last accepted seqId` is a heartbeat.
7. Same-ID updates containing levels are not heartbeats and cannot mutate the
   book.
8. Non-zero checksum, malformed sequence or source-time failure marks the
   session stale.
9. A gap immediately suppresses executable output.
10. Ordinary deltas cannot recover a stale/gapped session.
11. Disconnect, timeout, queue overflow and maintenance reset require a new
    validated snapshot.
12. Only a snapshot received while explicit replacement is required is mapped
    as `REPLACEMENT_SNAPSHOT`.
13. Zero-quantity deltas delete levels; snapshots reject zero quantity.
14. Bids and asks remain sorted.
15. Locked/crossed books become invalid/stale and cannot be executable.
16. No checksum is calculated or trusted.
17. Replaying the same valid fixture yields the same book and update ID.

OKX does not prescribe the exact local gap-recovery algorithm in the reviewed
JSON guide. Reconnect plus validated replacement snapshot is therefore
correctly labeled as local conservative policy in ADR 0006.

## 9. Network and security boundary

Verified:

- REST origins are restricted at runtime to the exact documented HTTPS Global,
  US, EEA and Türkiye origin allowlist.
- The WS controller uses one fixed official Global TLS URL and public path.
- Endpoint paths are compile-time constants; parameter values pass through
  `URLSearchParams`.
- Redirect mode is `error`, so an HTTP redirect cannot escape the allowlist.
- No user payload can construct a host, protocol, port or path.
- No credential, authorization header, cookie, login or private call exists.
- REST bodies are bounded during streaming, including chunked bodies, and the
  reader is cancelled on overflow.
- REST requests have abort deadlines and no automatic retry.
- HTTP 429, local limiter exhaustion, OKX business errors and transport errors
  remain distinct.
- WS connect timeout, frame/queue bounds, bounded reconnect, bounded
  resubscribe operations and process-local connection rate control are active.
- Timers, queued data, pending pong state and socket references are cleaned on
  disconnect/shutdown.
- Receive time is captured at ingress rather than at queue drain.
- Structured errors do not emit raw payloads; metric labels cannot contain
  instrument IDs, symbols, URLs, payloads or raw errors.

The adapter relies on operating-system DNS and TLS validation for its fixed
official hosts. Production deployment should additionally enforce egress DNS
and destination policy; application-level DNS pinning is not implemented.

## 10. Observability evidence

Finite labels are limited to venue, product group, capability and quality.
The following outcomes are observable without high-cardinality dimensions:

- message count and parse failure;
- sequence gap and duplicate;
- degraded/stale transition and invalid book;
- reconnect, resubscribe and recovery;
- queue overflow and rate limiting;
- server-time degradation;
- canary success/failure;
- last successful observation;
- receive and processing lag.

Both REST and WS paths record bounded parse/freshness evidence. The
implementation provides contracts and in-memory test recorders only; production
monitoring infrastructure remains out of scope.

## 11. Commands executed and results

Authoritative Node verification used the repository-pinned Node 24.18.0 Docker
image because the host Node 25.8.1 is outside the declared engine range.

```text
curl official OKX guide, changelog and checksum notice
shasum -a 256 retrieved official artifacts

docker build --target quality \
  -t arbitrage-quality:phase2a2-formal-final \
  -f infra/docker/quality.Dockerfile .

./gradlew clean ktlintCheck test bootJar --no-daemon
npm audit --omit=dev --audit-level=high
npm run verify:compose
docker compose config --quiet
docker compose --project-name phase2a2final build control-api web
docker compose --project-name phase2a2final up --detach
docker compose --project-name phase2a2final ps
curl health, liveness, readiness and web endpoints

docker run --rm -e OKX_LIVE_CANARY=1 \
  arbitrage-quality:phase2a2-formal-final \
  npm run canary --workspace=@arbitrage/okx-public-adapter
docker run --rm -e OKX_LIVE_CANARY=1 \
  arbitrage-quality:phase2a2-formal-final \
  npm run test:canary --workspace=@arbitrage/okx-public-adapter

gitleaks 8.30.0 source scan
rg forbidden credentials/private/trading/venue patterns
rg financial float/double/number patterns
git diff -- packages/market-data
git diff --check
```

Results:

| Suite                         | Result                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| Contracts Node tests          | 4 passed                                                           |
| Frozen market-data Node tests | 57 passed                                                          |
| OKX adapter offline tests     | 52 passed; 1 opt-in live test skipped by default                   |
| Web Node tests                | 6 passed                                                           |
| Total offline Node            | **119 passed; 1 intentional skip**                                 |
| Live OKX canary integration   | **1 passed**                                                       |
| Kotlin                        | **2 passed**; ktlint and `bootJar` passed                          |
| Formatting/lint/typecheck     | Passed in final pinned quality image                               |
| Production builds             | Contracts, market-data, OKX adapter and six-route web build passed |
| Production dependency audit   | 0 vulnerabilities                                                  |
| Docker images                 | Quality, control API and web images built                          |
| Compose clean-state runtime   | PostgreSQL, Redis, control API and web all healthy                 |
| HTTP runtime                  | Health, liveness, readiness and web all returned 200               |
| Gitleaks 8.30.0               | No leaks in approximately 933 KB of source                         |
| Frozen package check          | No `packages/market-data` diff                                     |
| Git whitespace                | Passed                                                             |

The final quality image manifest list was:

`sha256:c4e80c99af070224c5d89841928e9f461f06a05c9f1fb966ee107083d4a5bd1c`.

## 12. Live-canary evidence

The final opt-in, credential-free canary passed on 2026-07-27:

```text
serverTime=1785104997802
swapInstrumentCount=426
futuresInstrumentCount=130
sampledInstrumentId=BTC-USD-SWAP
tickerRows=426
markRows=1
restBookSequenceId=95963622653
websocketSnapshotSequenceId=95963623032
```

These are point-in-time observations, not constants or hardcoded symbol/count
assumptions. The canary is disabled in normal tests and CI; it is bounded by
10 seconds, 32 messages, fixed response/frame sizes, one sampled instrument
and one valid snapshot. It cannot persist or trade.

## 13. Findings

### BLOCKER

None.

### HIGH — remediated

| ID     | Defect                                                                                                           | Smallest remediation and regression evidence                                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `H-01` | REST ticker/book mappings could expose stale, locked, crossed, duplicate or zero-quantity evidence as healthy    | Added injected channel freshness, future-skew checks, REST-book normalization/validation and focused stale/cross/duplicate/zero tests                                 |
| `H-02` | Disconnect/shutdown did not immediately revoke executable WS output; connect and timer lifecycle were incomplete | Disconnect/stop now marks stale, clears timers/queue/pong state, adds connect deadline and requires replacement recovery; focused disconnect/stop/timeout tests added |
| `H-03` | Duplicate/older snapshots could be mislabeled as replacement and bypass duplicate rejection                      | Replacement mapping is now conditional on explicit recovery state; duplicate/older snapshot no-mutation tests added                                                   |
| `H-04` | Runtime JSON had byte bounds but insufficient structural and integer limits                                      | Added depth/node/array/object/integer bounds plus hostile nesting, huge level-array and overflow tests                                                                |
| `H-05` | `ctVal`/`ctMult` ambiguity was not fail-closed                                                                   | Preserved documented `ctVal` semantics, accepted only documented empty or observed exact-unit `ctMult`, quarantined other values and added tests                      |
| `H-06` | Server-time quality and REST observation metrics were incomplete                                                 | Added schema validation, RTT/offset evidence, degraded state, REST parse events, last-success/lag observations and focused tests                                      |
| `H-07` | Duplicate WS traffic could refresh freshness and queued messages lost ingress receive time                       | Only accepted updates/valid heartbeat refresh freshness; queue captures receive timestamp at ingress; duplicate-freshness test added                                  |
| `H-08` | Canary bounds could be expanded and snapshot semantic validation was incomplete                                  | Enforced hard 10-second/32-message maxima and validates initial sequence, checksum, timestamp and exact decimals; focused canary tests added                          |

Every HIGH fix remained inside Phase 2A.2. No broad refactor or
future-phase feature was added.

### MEDIUM

1. Successful subscription acknowledgements are validated by channel and
   instrument but their returned request `id` is not correlated. This cannot
   make a book executable because a valid snapshot is still required.
2. WebSocket connection and REST limiters are process-local. Multi-replica
   deployments need an egress-level aggregate budget before production scale.
3. Regional public WebSocket routing and jurisdiction/product availability
   remain `RESEARCH_REQUIRED`.
4. `ctMult` prose/examples remain incomplete. Any future non-unit value is
   quarantined rather than interpreted.
5. Application-level DNS pinning is absent. Fixed TLS origins, redirect
   rejection and no user-constructed URLs contain the current SSRF surface;
   production egress enforcement remains required.

### LOW

1. Bounded unknown response fields are ignored intentionally for forward
   compatibility; field adoption still requires an explicit source-backed
   mapper update.
2. An empty `settFundingRate` yields no current/last observation rather than a
   fabricated zero; callers must treat absence as unknown.
3. No long-duration WS soak or provider-chaos environment exists in this
   phase.

## 14. Accepted limitations and technical debt

- exact vendor-prescribed JSON gap recovery is not documented;
- maintenance sequence reset intentionally sacrifices temporary availability
  to preserve monotonic trust;
- derivative minimum notional remains `UNVERIFIED`;
- only Global public WS routing is implemented;
- no production metrics backend, persistence or event bus exists;
- no authenticated/testnet/trading behavior exists;
- host Node 25 is unsupported; repository verification must use pinned Node 24;
- the pre-existing default local Docker development volumes were damaged by a
  Docker Desktop storage I/O failure during review. They were preserved and
  not deleted. Clean-state runtime was independently proven with isolated
  acceptance volumes, which were removed after testing.

## 15. Security observations

- No secret or credential path exists.
- Gitleaks found no source leak.
- Raw hostile payloads are not used as metric labels or structured-event
  fields.
- All financial values use exact decimal strings/domain types.
- Executable order-book output fails closed after stale, gap, invalid book,
  disconnect, malformed input or overflow.
- No automatic REST retry exists.
- The canary has no write/private endpoint and no persistence.

## 16. Freeze recommendation

**Phase 2A.2 can be frozen.**

The remaining warnings are explicit production-hardening or vendor-research
items, not uncontained correctness defects. Phase 2A.3 still requires separate
approval and must preserve the Phase 2A.1 and Phase 2A.2 frozen boundaries.

## 17. Exact recommended Phase 2A.3 prompt

```text
Read AGENTS.md and all current architecture, roadmap, security, Phase 0,
Phase 1, frozen Phase 2A.1 and frozen Phase 2A.2 implementation and acceptance
documents completely.

Phase 2A.1 and Phase 2A.2 are frozen and approved.

Implement Phase 2A.3 only:
Binance USDⓈ-M Futures public, unauthenticated market-data adapter.

Do not modify packages/market-data or packages/okx-public-adapter except for an
explicitly justified BLOCKER compatibility correction. Do not implement Bybit
or any other venue. Do not add credentials, private/authenticated APIs,
persistence, event bus, scanner UI, Telegram, positions, paper/live trading,
Risk Engine, Execution Engine, AI or billing.

Before changing files:
1. inspect the complete repository and git diff;
2. re-retrieve current official Binance USDⓈ-M Futures REST, WebSocket,
   local-order-book, general-information and changelog documentation;
3. update Phase 0 source retrieval dates and warnings;
4. present a concise plan, expected files and blocking ambiguities;
5. stop if official evidence contradicts the approved product group or frozen
   canonical contracts.

Implement only source-backed public USDⓈ-M Futures capabilities:
- exchange/instrument metadata with explicit official identity, settlement and
  USDT/USDC separation;
- last/bid/ask, mark and index observations with exact semantics;
- venue-native funding, documented interval and next settlement time;
- REST depth snapshot and public diff-depth stream;
- the official U/u/pu initialization, overlap, continuity, duplicate, gap and
  replacement-recovery rules;
- server time and documented request weights/rate limits;
- hardcoded official TLS allowlists, redirect rejection, bounded streaming
  bodies, timeouts, cancellation, bounded WS queues/messages and runtime
  schemas;
- deterministic source-provenanced fixtures, replay, fault injection,
  low-cardinality observability and a bounded opt-in credential-free canary.

Preserve decimals as strings until exact validation. Never pass update IDs
through JavaScript number. Never infer symbol identity, funding semantics,
intervals, rate limits, recovery rules or unsupported capabilities. Mark
UNSUPPORTED, UNVERIFIED and RESEARCH_REQUIRED explicitly.

Add focused unit, property, schema, mapping, sequence, duplicate, overlap, gap,
stale, reconnect, recovery, malformed, overflow, rate-limit and canary tests.
Run formatting, linting, TypeScript checking, all Node/Kotlin tests, production
builds and dependency audit, Docker image/Compose health, endpoint checks,
secret/forbidden-scope/financial-float scans and the bounded live canary.

Create:
- docs/PHASE_2A_3_BINANCE_USDM_PUBLIC_ADAPTER.md
- docs/PHASE_2A_3_ACCEPTANCE.md as implementation-produced pre-acceptance
  evidence only
- docs/adr/0007-binance-usdm-public-adapter-boundary.md

Update only the relevant Phase 0 source/capability, roadmap and risk records.
Do not create a commit and do not begin Phase 2A.4.

At the end report implementation, official sources and dates, capability
states, exact mappings, sequence/recovery behavior, files changed, commands and
test counts, Docker/canary evidence, security decisions, limitations, whether
Phase 2A.3 can enter formal acceptance review, and the exact recommended formal
acceptance prompt.
```
