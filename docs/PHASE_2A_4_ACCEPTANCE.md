# Phase 2A.4 formal independent acceptance review

## 1. Decision

| Field                    | Result                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Review date              | 2026-08-03                                                     |
| Scope                    | Bybit V5 `category=linear` public, unauthenticated market data |
| Final status             | **PASS_WITH_WARNINGS**                                         |
| Open BLOCKER findings    | **0**                                                          |
| Open HIGH findings       | **0**                                                          |
| Remediated HIGH findings | **4**                                                          |
| Phase 2B started         | **No**                                                         |
| Freeze recommendation    | **YES, with the recorded warnings**                            |

This report replaces the implementation-produced pre-acceptance draft. The
review reproduced repository, test, runtime, live-canary and current official
documentation evidence independently. Phase 2A.4 is suitable for product-owner
freeze after the four in-scope HIGH findings described below were remediated.

No authenticated API, credential, persistence, event bus, scanner UI,
Telegram, position, paper/live trading, Risk Engine, Execution Engine, AI or
billing capability is accepted by this decision.

## 2. Accepted scope and isolation

Accepted in the isolated `@arbitrage/bybit-linear-public-adapter` package:

- V5 public `category=linear` instrument, ticker, funding-history, order-book
  and server-time REST boundaries;
- V5 public linear order-book WebSocket snapshot/delta lifecycle;
- canonical metadata, price, funding and exact-decimal mappings;
- deterministic snapshot/delta/restart/replacement behavior;
- bounded schemas, transport, queues, reconnects and canary execution;
- capability, quality, freshness and observability contracts;
- source-provenanced fixtures and offline-safe tests.

The review found no Bybit inverse, option or Spot implementation and no other
new venue implementation. Requests cannot attach credentials or reach private
paths. Frozen packages have no diff:

- `packages/market-data`;
- `packages/okx-public-adapter`;
- `packages/binance-usdm-public-adapter`.

## 3. Reviewed files and modules

The complete repository and working-tree diff were inspected. Detailed review
covered:

- all source and tests under `packages/bybit-linear-public-adapter/src`;
- every fixture and `fixtures/manifest.json`;
- the package manifest, TypeScript configuration and root workspace lockfile;
- Phase 0 source/research registers and exchange capability matrix;
- Phase 2A.4 implementation document and ADR 0008;
- architecture, domain, API-contract, security, risk and roadmap documents;
- frozen Phase 2A.1 through Phase 2A.3 implementation and acceptance evidence;
- web, control-api, quality image and Compose compatibility.

## 4. Current official evidence

All Phase 2A.4 public sources were independently re-retrieved on
**2026-08-03**. The authoritative URLs, capability coverage and warnings are
registered one row per source in `PHASE_0_SOURCE_REGISTER.md`.

| Source ID  | Current official document                                                                     | Evidence used                                                                 |
| ---------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `BYBIT-01` | [V5 Introduction](https://bybit-exchange.github.io/docs/v5/intro)                             | V5 and product-category boundary                                              |
| `BYBIT-02` | [Get Instruments Info](https://bybit-exchange.github.io/docs/v5/market/instrument)            | identity, assets, contracts, lifecycle, filters, funding interval, pagination |
| `BYBIT-03` | [Get Tickers](https://bybit-exchange.github.io/docs/v5/market/tickers)                        | last/bid/ask/mark/index, native funding, next time and interval-hour          |
| `BYBIT-04` | [Get Funding Rate History](https://bybit-exchange.github.io/docs/v5/market/history-fund-rate) | settled funding history and request bound                                     |
| `BYBIT-05` | [Get Orderbook](https://bybit-exchange.github.io/docs/v5/market/orderbook)                    | REST snapshot, levels, timestamps, `u`, `seq` and depth                       |
| `BYBIT-06` | [WebSocket Orderbook](https://bybit-exchange.github.io/docs/v5/websocket/public/orderbook)    | topic, depths, snapshots/deltas, deletion and `u=1` restart                   |
| `BYBIT-07` | [Integration Guidance](https://bybit-exchange.github.io/docs/v5/guide)                        | official REST origins and regional caveats                                    |
| `BYBIT-08` | [WebSocket Connect](https://bybit-exchange.github.io/docs/v5/ws/connect)                      | linear WSS origin/path, subscription, ack, heartbeat and limits               |
| `BYBIT-09` | [Rate Limit Rules](https://bybit-exchange.github.io/docs/v5/rate-limit)                       | IP and WebSocket limits; incomplete public endpoint quotas                    |
| `BYBIT-10` | [Error Codes](https://bybit-exchange.github.io/docs/v5/error)                                 | HTTP, business, frequency and restart errors                                  |
| `BYBIT-11` | [Get Bybit Server Time](https://bybit-exchange.github.io/docs/v5/market/time)                 | seconds/nanoseconds response contract                                         |
| `BYBIT-16` | [Enum Definitions](https://bybit-exchange.github.io/docs/v5/enum)                             | category, contract and lifecycle enums                                        |
| `BYBIT-18` | [V5 Changelog](https://bybit-exchange.github.io/docs/changelog/v5)                            | current changes through 2026-07-30 and future-dated entry review              |

No current source contradicts the approved V5 linear product group or frozen
canonical contracts. The following ambiguities remain explicit:

1. The canonical REST order-book page supports linear limits through 1000,
   while API Explorer text exposes an older maximum. The canonical page is the
   implementation authority and the contradiction is registered.
2. WebSocket documentation defines `u` ordering and `seq` cross-sequence
   comparison but no previous-ID chain or contiguous `+1` rule. Complete
   silent-gap detection remains `RESEARCH_REQUIRED`.
3. Ticker `fundingRate` is documented as the venue funding rate, not as a
   next-period prediction. It is classified `CURRENT`; prediction remains
   `UNVERIFIED`.
4. Public endpoint-specific quotas are not completely published. The local
   budget is a conservative implementation policy, not an official quota
   claim.
5. The changelog contains a 2026-08-04 entry future-dated relative to this
   review. It does not change the selected public linear contracts and is not
   implemented.

## 5. Verified capability matrix

| Capability                    | State               | Verified treatment                                            |
| ----------------------------- | ------------------- | ------------------------------------------------------------- |
| Instrument metadata           | `SUPPORTED`         | strict linear records; unknown type/status quarantined        |
| Last/bid/ask ticker           | `SUPPORTED`         | three independent exact observations                          |
| Mark price                    | `SUPPORTED`         | `markPrice` only                                              |
| Index price                   | `SUPPORTED`         | `indexPrice` only                                             |
| Current funding               | `SUPPORTED`         | non-empty ticker `fundingRate` is `CURRENT`                   |
| Unknown current funding value | `SUPPORTED`         | explicit UNKNOWN value and semantic; never empty fake success |
| Funding history               | `SUPPORTED`         | settled history is `LAST`                                     |
| Funding interval              | `SUPPORTED`         | explicit instrument minutes or ticker whole hours only        |
| Next funding time             | `SUPPORTED`         | documented non-empty/non-zero field only                      |
| Delivery-Futures funding      | `UNSUPPORTED`       | port call fails; no fake observation                          |
| Predicted funding             | `UNVERIFIED`        | no reviewed prediction contract                               |
| REST book snapshot            | `SUPPORTED`         | bounded V5 linear snapshot                                    |
| WS book snapshot/delta        | `SUPPORTED`         | fixed public linear topic and absolute level changes          |
| Complete sequence validation  | `RESEARCH_REQUIRED` | no official prev-ID or contiguous increment rule              |
| Checksum validation           | `UNVERIFIED`        | no selected-stream checksum contract                          |
| Contract multiplier           | `UNVERIFIED`        | never inferred                                                |

Every `SUPPORTED` declaration has a concrete public port and source ID.
Unsupported, unverified and research-required behavior is not represented by a
fake empty implementation.

## 6. Exact metadata, price and funding mappings

| Bybit field                               | Canonical treatment                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| request `category=linear`                 | mandatory REST product family; fixed linear WS origin/path                        |
| `symbol`                                  | opaque official instrument ID and display value; never parsed into asset identity |
| `baseCoin` / `quoteCoin` / `settleCoin`   | independently resolved base, quote and settlement identities                      |
| `LinearPerpetual`                         | `PERPETUAL`; funding-capable                                                      |
| `LinearFutures`                           | `FUTURE` / `DATED_FUTURE`; funding unsupported                                    |
| `status`                                  | explicit pre-launch/active/settling/expired lifecycle                             |
| `launchTime` / `deliveryTime`             | bounded validated timestamps preserved independently                              |
| `priceFilter.tickSize`                    | exact tick size                                                                   |
| `lotSizeFilter.qtyStep`                   | exact quantity step                                                               |
| `minOrderQty` / `minNotionalValue`        | exact documented minima only                                                      |
| `priceScale`                              | bounded vendor metadata; never substituted for tick size                          |
| `lastPrice` / `bid1Price` / `ask1Price`   | last / bid / ask only                                                             |
| `markPrice` / `indexPrice`                | mark / index only                                                                 |
| ticker `fundingRate`                      | venue-native `CURRENT`, or explicit UNKNOWN when absent                           |
| history `fundingRate`                     | settled `LAST`                                                                    |
| `fundingInterval` / `fundingIntervalHour` | explicit native duration only                                                     |
| REST/WS `u` and `seq`                     | integer lexeme preserved, then exact bigint-safe identifier                       |

Canonical identity includes venue, product group, opaque official ID, market
type and settlement asset. The injected resolver fails closed. USDT and USDC
therefore never compare equal. Inverse, Spot, option, unknown contract and
unknown status records fail closed.

Financial values remain strings until exact-decimal validation. NaN, infinity,
scientific notation, malformed signs/separators, excessive wire length, scale
or precision, zero where prohibited and silent rounding fail closed. Sequence
IDs never pass through JavaScript `number`. Number conversion is limited to
validated timestamps and bounded resource/timer counters, not financial data.

Last, bid, ask, mark and index semantics remain separate. Missing values do not
become zero. Locked/crossed top-of-book data cannot become healthy or
executable. Venue-native funding remains separate from the frozen, separately
named normalized-eight-hour derived calculation.

## 7. Snapshot, delta, `u`, `seq`, restart and recovery evidence

Focused tests and deterministic fixture replay verify:

1. A validated WebSocket snapshot initializes the book; pre-initialization
   deltas are rejected without freshness mutation.
2. Updates preserve `u` and `seq` separately. No interchangeability,
   contiguous increment or previous-ID rule is invented.
3. Equal/older `u` and `seq` pairs are duplicates/old updates and neither
   mutate levels nor refresh freshness.
4. Mixed ordering, malformed/overflowed identifiers, invalid books and
   transport loss fail closed into `GAPPED` or `STALE`.
5. Numeric jumps alone are accepted because the current docs do not define
   them as gaps. This silent-gap limitation is explicit and
   `RESEARCH_REQUIRED`.
6. Zero quantity deletes exactly one level; bid/ask sorting remains canonical.
7. A snapshot replaces local state. A snapshot with `u=1` is the documented
   restart replacement. A delta with `u=1` fails closed.
8. Gap, stale, disconnect and shutdown states suppress executable output.
9. Ordinary deltas cannot recover a gapped/stale book. Only a validated
   replacement snapshot restores output.
10. Stale or future-skewed WS snapshots/deltas cannot produce executable
    output; replaying the fixture produces the same final state.

REST snapshots remain separate observations. No undocumented continuity is
invented between REST and the selected 50-level WebSocket topic. No checksum is
calculated or trusted.

## 8. Network, lifecycle and schema evidence

- REST is fixed to `https://api.bybit.com`; only selected public
  `/v5/market/*` paths are constructible and `category=linear` is injected.
- WebSocket is fixed to `wss://stream.bybit.com/v5/public/linear` with one
  bounded `orderbook.50.{opaque encoded symbol}` topic.
- Protocol, hostname, default TLS port and path are checked. Redirects are
  rejected and a non-empty final response URL must equal the expected URL.
- User input cannot construct an origin or path. Requests omit credentials,
  signatures, referrers and authorization headers.
- REST bodies are bounded while streaming, including absent Content-Length.
  Invalid UTF-8 fails closed. WebSocket accepts bounded text only and rejects
  binary/unexpected message data.
- JSON bytes, depth, nodes, array length, object keys, string/control content,
  decimal/ID lengths, instruments, levels, queue bytes/messages and reconnect
  attempts are bounded.
- Missing fields, undocumented nulls, wrong categories, non-string financial
  values, invalid calendar timestamps and unknown unsafe enum values fail
  before domain mapping.
- Extra fields are ignored only after the complete payload passes structural
  bounds. This is the explicit forward-compatibility policy.
- Requests support deadlines, caller cancellation and deterministic listener
  cleanup. An already-aborted signal prevents network dispatch.
- Reconnect is capped, timers/sockets/queues are cleaned up, concurrent loops
  are prevented and the attempt counter resets only after a valid ready book.
- There is no automatic REST retry or blind retry loop. HTTP, rate-limit,
  business, schema and transport failures remain typed separately.
- The 600 requests/5 seconds/IP documentation is represented by a conservative
  process-local 500/5-second budget. Budgets are bounded non-negative integers.
- Server-time seconds and nanoseconds must agree. RTT and offset are observed;
  poor/unavailable synchronization degrades quality without rewriting exchange
  timestamps.

The implementation depends on the operating system resolver/TLS stack; a
future production deployment still needs network egress policy and DNS controls
outside this package.

## 9. Fixture provenance

The fixture manifest records the 2026-08-03 retrieval date, explicit
`BYBIT_V5_LINEAR` product group, current source IDs, synthetic origin and every
minimal transformation. Tests load the actual fixture files, verify that every
source ID exists with the current retrieval date in the Phase 0 register, and
replay the sequence deterministically.

Fixtures cover USDT/USDC perpetual identities, a USDT delivery Future,
metadata, ticker, current/history funding, explicit/unknown intervals, REST and
WS snapshots, valid delta, duplicate, older update, zero deletion,
contradictory ordering, stale suppression, replacement recovery, `u=1`, wrong
category, unknown product, malformed/oversized input, crossed books, rate-limit
responses and server time. No inverse, Spot or options semantics are imported.

## 10. Findings

### BLOCKER

None.

### HIGH — remediated

| ID         | Defect                                                                                                                                              | Minimal remediation and regression evidence                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `P2A4-H01` | WS snapshots/deltas were always marked healthy, so stale or future-skewed exchange timestamps could yield executable output.                        | Injected the channel freshness policy into the session and WS mapper; stale snapshot and future-skewed delta tests prove fail-closed suppression. |
| `P2A4-H02` | A perpetual ticker with omitted/empty `fundingRate` returned no funding observation, conflating unknown data with no capability.                    | Perpetual mapping now returns explicit UNKNOWN rate and UNKNOWN semantic; focused mapping test added.                                             |
| `P2A4-H03` | Package tests did not load the recorded fixture files and the book fixture did not exercise older/gap/stale/recovery paths claimed by its manifest. | Added provenance validation and deterministic fixture replay tests; expanded the synthetic fixture and transformation declaration.                |
| `P2A4-H04` | An already-aborted caller signal could reach REST/canary network dispatch before cancellation took effect.                                          | Added pre-dispatch abort guards for REST and canary REST/WS flow; tests assert zero network calls.                                                |

All four fixes belong solely to Phase 2A.4. No frozen package was changed.

### MEDIUM

- Complete silent-gap detection is impossible under the reviewed `u/seq`
  contract. Regressions, contradictions and transport loss are detected, but
  complete sequence validation remains `RESEARCH_REQUIRED`.
- Public endpoint-specific quotas are incomplete. The implemented limiter is
  conservative and process-local, not a distributed production quota.
- The observability contract defines finite metrics/events for all required
  outcomes, but not every declared counter/event is emitted at every adapter
  boundary yet (notably generic message/schema/category/stale/invalid-book and
  canary outcome coverage). Core initialization, duplicate, restart, gap,
  recovery, reconnect/resubscribe, overflow, rate-limit and time-quality paths
  are instrumented. Completing the remaining wiring must not add a production
  monitoring backend in this phase.
- Global public endpoints do not prove legal, geographic or data-redistribution
  availability for a future production entity. This remains a product-owner
  and deployment gate.

### LOW

- Canonical REST documentation and API Explorer expose contradictory maximum
  depth text; the canonical market page is the recorded authority.
- The canary is a bounded point-in-time schema/lifecycle probe, not a soak,
  completeness, latency or load test.
- Ticker explicit interval-hour is used when present; instrument metadata is
  the fallback. A future adapter revision should expose an explicit conflict
  event if both official fields are simultaneously present and disagree.
- DNS pinning and distributed egress enforcement belong to deployment
  infrastructure; this package provides strict URL/origin/path validation.

### ACCEPTED_LIMITATIONS

- No predicted funding, checksum, contract multiplier, delivery-Futures
  funding or invented REST-to-WS continuity is exposed.
- No persistence, historical store, production supervisor, monitoring backend,
  private API or trading behavior is present by approved scope.

### TECHNICAL_DEBT

- Complete the remaining finite telemetry emissions before treating adapter
  metrics as operationally complete; keep production monitoring infrastructure
  outside this package.
- Revalidate the canonical REST depth limit, public rate-limit tables, regional
  hosts and changelog immediately before a production release.
- Add deployment-level DNS/egress enforcement and distributed rate coordination
  when a production runtime topology is approved.
- Preserve the bounded canary as a schema/lifecycle probe and add a separate
  production-readiness soak plan rather than widening this canary.

## 11. Commands executed and exact results

Authoritative Node execution used pinned **Node 24.18.0** in the quality image.

```text
docker build --no-cache --file infra/docker/quality.Dockerfile \
  --target quality --tag arbitrage-quality:phase2a4-acceptance-final .

# Executed by the quality target
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build

cd services/control-api
./gradlew clean ktlintCheck test bootJar --no-daemon

docker run ... npm audit --omit=dev --audit-level=high
docker build --file apps/web/Dockerfile ...
docker build --file services/control-api/Dockerfile ...
docker compose -p phase2a4acceptance config --quiet
POSTGRES_PORT=15432 REDIS_PORT=16379 CONTROL_API_PORT=18080 \
  WEB_PORT=13000 docker compose -p phase2a4acceptance \
  up --detach --build --wait --wait-timeout 240
npm run verify:compose

BYBIT_LINEAR_LIVE_CANARY=1 npm run test:canary \
  --workspace=@arbitrage/bybit-linear-public-adapter -- --reporter=verbose
BYBIT_LINEAR_LIVE_CANARY=1 npm run canary \
  --workspace=@arbitrage/bybit-linear-public-adapter

git diff --check
git diff -- packages/market-data packages/okx-public-adapter \
  packages/binance-usdm-public-adapter
gitleaks v8.30.0 detect --no-git --redact
targeted credential/private/trading and financial float/double scans
```

Exact automated counts:

| Suite                         |  Passed | Skipped in default run | Result   |
| ----------------------------- | ------: | ---------------------: | -------- |
| Contracts                     |       8 |                      0 | PASS     |
| Frozen market-data            |      57 |                      0 | PASS     |
| Frozen OKX adapter            |      52 |        1 opt-in canary | PASS     |
| Frozen Binance USDⓈ-M adapter |      72 |        1 opt-in canary | PASS     |
| Bybit linear adapter          |      69 |        1 opt-in canary | PASS     |
| Web                           |       6 |                      0 | PASS     |
| **Default Node total**        | **264** |                  **3** | **PASS** |
| Bybit opt-in live canary      |       1 |                      0 | PASS     |
| Kotlin                        |       2 |                      0 | PASS     |

Across the default and opt-in runs, **265 Node tests passed**; **2 Kotlin tests
passed**. Formatting, linting, TypeScript checking, every production Node build,
Kotlin formatting/tests/bootJar, quality/web/backend image builds,
`git diff --check`, frozen-package check and targeted scope/financial scans all
passed. Production dependency audit reported **0 vulnerabilities**. Gitleaks
v8.30.0 scanned approximately 1.64 MB of source material and reported **no
leaks**.

## 12. Docker and runtime evidence

An isolated `phase2a4acceptance` Compose project was built with loopback-only
ports. All four services reported healthy:

| Check                        | Result                              |
| ---------------------------- | ----------------------------------- |
| PostgreSQL                   | `pg_isready`: accepting connections |
| Redis                        | `PONG`                              |
| Control API container        | healthy                             |
| Web container                | healthy                             |
| `/api/v1/health`             | HTTP 200, 102 bytes                 |
| `/actuator/health`           | HTTP 200, 49 bytes                  |
| `/actuator/health/liveness`  | HTTP 200, 15 bytes                  |
| `/actuator/health/readiness` | HTTP 200, 15 bytes                  |
| Web `/`                      | HTTP 200, 30,356 bytes              |

The isolated containers, network and volumes were removed after evidence was
captured. No existing Compose project was altered.

## 13. Live-canary result

The public credential-free opt-in canary passed on 2026-08-03. It completed in
approximately 3 seconds within one immutable 15-second deadline and the fixed
request/message limits. Point-in-time output was:

```json
{
  "kind": "POINT_IN_TIME",
  "serverEpochMilliseconds": "1785757611528",
  "sampledInstrumentId": "0GUSDT",
  "instrumentRows": 785,
  "tickerRows": 1,
  "fundingRows": 1,
  "restBookUpdateId": "1300772",
  "websocketSnapshotUpdateId": "2148170",
  "websocketDeltaUpdateId": "2148171",
  "websocketMessageCount": 3
}
```

These values are point-in-time external evidence only and are not production
constants. The canary used no credential, retry, persistence or trading path.
External/geographic access failure, schema failure and implementation errors
remain typed separately; this run observed no such failure.

## 14. Security and correctness conclusion

The accepted adapter fails closed on category/type/status mismatch, hostile
payloads, invalid timestamps/decimals/identifiers, stale/future-skewed books,
contradictory ordering, locked/crossed state, queue/message loss, disconnect and
shutdown. Exact financial values and settlement-specific canonical identity are
preserved. Network destinations are fixed public TLS origins and no credential
or trading surface exists.

No BLOCKER or HIGH finding remains. The MEDIUM findings are explicit boundaries
rather than hidden trading assumptions. Phase 2A.4 may be frozen with these
warnings; Phase 2B still requires separate product-owner approval.

## 15. Exact recommended next task

The next task should be a documentation-only Phase 2B design gate before any
analytics implementation:

```text
Read AGENTS.md and all current architecture, roadmap, domain, security,
Phase 0, Phase 1, frozen Phase 2A.1, frozen Phase 2A.2, frozen Phase 2A.3 and
formally accepted Phase 2A.4 documents completely.

Phase 2A.1 through Phase 2A.4 are frozen and approved.

Perform a documentation-only architecture and acceptance-plan decomposition
for Phase 2B — Spread Analytics Core.

Define small independently testable subphases for canonical instrument
matching, explicit manual-mapping provenance and quarantine, exact executable
spread by configured size, venue-native funding differential, separately named
normalized funding comparisons, opportunity lifecycle, anomaly detection,
spread history and ranking. Specify ports, inputs, outputs, data-quality gates,
freshness requirements, deterministic fixtures, observability, security
boundaries, risks and acceptance criteria for every subphase.

Preserve USDT/USDC separation and exact decimals. Treat stale, gapped,
unsupported, unverified and research-required inputs as non-executable. Do not
modify frozen adapter packages. Do not implement application code, persistence,
frontend UI, Telegram, positions, authenticated APIs, paper/live trading, Risk
Engine, Execution Engine, AI or billing. Do not create a commit and do not begin
implementation without separate product-owner approval.
```
