# Phase 2A.1 Acceptance Review

## 1. Final status

| Field                                 | Result                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Review date                           | 2026-07-26                                                               |
| Final status                          | **PASS_WITH_WARNINGS**                                                   |
| Unresolved blockers                   | None                                                                     |
| Unresolved high-priority issues       | None                                                                     |
| Phase 2A.2 started                    | No                                                                       |
| Live or authenticated adapter present | No                                                                       |
| Safe to freeze Phase 2A.1             | **Yes**, after the reviewed source-control and CI freeze described below |

Phase 2A.1 is accepted as the canonical, mock-only public market-data
foundation. Five high-priority defects found during this review were corrected
with focused changes and tests. The final pinned-toolchain suite, production
builds, image builds, dependency audit, and Docker Compose runtime checks pass.

This acceptance does not authorize Phase 2A.2 or any network access,
credentials, persistence, authenticated exchange calls, trading, Risk Engine,
Execution Engine, AI, or billing.

## 2. Scope accepted

The accepted scope is:

- strongly typed CEX identity and manual-mapping governance contracts;
- exact-decimal wire validation and bigint-based domain arithmetic;
- instrument metadata, funding, price, provenance, quality, and freshness
  contracts;
- explicit public adapter capability declarations and mock-only ports;
- deterministic snapshot replacement, snapshot-plus-delta,
  sequence-chained-delta, and no-trusted-book strategies;
- OKX, Binance, Bybit, Hyperliquid-style, and adversarial synthetic fixtures
  anchored to Phase 0 source IDs;
- observability metric and structured-event contracts without monitoring
  infrastructure;
- unit, property-based, fixture replay, compatibility, build, and runtime
  evidence.

The review covered the complete `packages/market-data` package,
`PHASE_2A_1_MARKET_DATA_FOUNDATION.md`, ADR 0003, ADR 0004,
`DECISIONS_REQUIRED.md`, `ROADMAP.md`, and their governing Phase 0 and Phase 1
documents.

## 3. Formal verification matrix

|   # | Review area                       | Result and evidence                                                                                                                                                                                                                   |
| --: | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Canonical identity                | **PASS.** `InstrumentId` is a versioned, length-prefixed combination of venue, product group, official instrument ID, market type, and settlement asset. Display symbols are excluded.                                                |
|   2 | USDT/USDC separation              | **PASS.** Distinct settlement asset IDs produce unequal instruments; explicit tests pass.                                                                                                                                             |
|   3 | Exact decimal parsing/arithmetic  | **PASS.** Financial wires remain strings until validation; the domain uses bigint coefficient plus scale.                                                                                                                             |
|   4 | No float/double financial values  | **PASS.** No `float`, `double`, or `parseFloat` exists. JavaScript `number` is limited to nonfinancial scale, policy, comparison, timestamp-validation, and test-control values.                                                      |
|   5 | Overflow, scale, rounding         | **PASS.** Precision 78, wire scale 36, internal scale 78, explicit overflow, no clamping, and named rounding policies are tested. Inexact `EXACT` division fails.                                                                     |
|   6 | Funding semantic separation       | **PASS.** Native rate, current/last/predicted/unknown semantic, interval, observed time, next settlement, source, and quality remain independent.                                                                                     |
|   7 | Normalized eight-hour calculation | **PASS.** `normalized-funding-8h/v1` is a separately named derived function using the known native interval and explicit scale/rounding. It preserves source semantic and native rate.                                                |
|   8 | Capability states                 | **PASS.** Supported, unsupported, unverified, and research-required are distinct. Non-supported ports fail closed; supported ports require both a concrete port and source evidence.                                                  |
|   9 | Freshness and quality             | **PASS.** Thresholds are configured per venue/product/channel. Gapped, reconnecting, unsupported, unverified, research-required, and disabled states cannot become healthy from time alone. Calendar-invalid timestamps are rejected. |
|  10 | Four book strategies              | **PASS.** All four required strategies are implemented and fixture- or unit-tested.                                                                                                                                                   |
|  11 | Snapshot initialization           | **PASS.** Deltas before required initialization are rejected and produce no executable view.                                                                                                                                          |
|  12 | Sequence continuity               | **PASS.** Contiguous, previous-ID-chain, and range bridge policies are exact bigint comparisons. Binance first-event snapshot bridging is distinct from subsequent `pu` chaining.                                                     |
|  13 | Duplicate behavior                | **PASS.** Duplicate/older sequenced updates are explicitly rejected without mutation and emit a structured event. Sequence-less replacement duplicate detection is not invented.                                                      |
|  14 | Gap detection                     | **PASS.** Missing IDs, broken links, invalid ranges, restart deltas, and upstream-gapped observations enter `GAPPED`/`STALE`.                                                                                                         |
|  15 | Restart handling                  | **PASS.** Bybit `u=1` is represented as an explicit replacement snapshot; a restart delta cannot silently continue the old book.                                                                                                      |
|  16 | Explicit recovery                 | **PASS.** A normal snapshot cannot recover a gapped/invalid book. A valid replacement snapshot is required and emits recovery.                                                                                                        |
|  17 | Zero-quantity deletion            | **PASS.** Delta quantity zero deletes the exact price level; zero quantities in snapshots are invalid.                                                                                                                                |
|  18 | Bid/ask ordering                  | **PASS.** Bids are sorted descending and asks ascending on every executable view.                                                                                                                                                     |
|  19 | Locked/crossed rejection          | **PASS.** `bestBid >= bestAsk` makes the book invalid/stale and suppresses executable output.                                                                                                                                         |
|  20 | Post-gap suppression              | **PASS.** After a gap, all deltas and ordinary snapshots are rejected until explicit replacement recovery.                                                                                                                            |
|  21 | Deterministic replay              | **PASS.** Every recorded fixture replays to the same serialized book. Property tests also enforce healthy top-of-book and VWAP monotonicity.                                                                                          |
|  22 | Fixture provenance                | **PASS.** Every fixture records source ID, retrieval date, product group, origin, and transformations. All source IDs exist in `PHASE_0_SOURCE_REGISTER.md`.                                                                          |
|  23 | Manual mapping governance         | **PASS for contract scope.** Provenance, effective time, proposer, distinct reviewer, approval, and conflict quarantine are represented and tested. Registry/workflow persistence remains deferred.                                   |
|  24 | Observability cardinality         | **PASS.** Metric labels are limited to venue, product group, finite capability, and finite state. Instrument ID, free-form channel, and free-form reason are structured-event fields only.                                            |
|  25 | Forbidden implementation          | **PASS.** No network client, URL, WebSocket, exchange SDK, credential/signature, private call, order, trading, risk, execution, AI, billing, database, Redis, or queue code exists in `packages/market-data`.                         |
|  26 | Existing compatibility            | **PASS.** Contract tests, web tests/build, Kotlin tests/bootJar, and unchanged API/runtime endpoints pass.                                                                                                                            |
|  27 | Production and Compose runtime    | **PASS.** Pinned quality image, web image, control API quality/runtime images, and Compose images build. PostgreSQL, Redis, control API, and web are healthy; health, liveness, readiness, and web return HTTP 200.                   |

## 4. Commands executed

```text
Complete repository file inventory and complete governing-document reads
Complete source, fixture, test, package, Docker, Compose, and CI inspection

git status --short --branch
git diff --check
docker compose config --quiet
npm ls --workspace=@arbitrage/market-data --omit=dev --all

Targeted forbidden network, credential, authentication, trading,
float/double, and financial-number scans with rg

npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev --audit-level=high
npm run verify:compose

npm run test --workspace=@arbitrage/market-data
npm run typecheck --workspace=@arbitrage/market-data

./gradlew clean ktlintCheck test bootJar --no-daemon

docker build --file infra/docker/quality.Dockerfile --target quality \
  --tag arbitrage-quality:phase2a1-acceptance-final .
docker build --file apps/web/Dockerfile \
  --tag arbitrage-web:phase2a1-acceptance .
docker build --file services/control-api/Dockerfile --target quality \
  --tag arbitrage-control-api-quality:phase2a1-acceptance .
docker compose build control-api web

docker compose down --remove-orphans
docker compose up --detach --wait --wait-timeout 55
docker compose ps
curl http://127.0.0.1:8080/api/v1/health
curl http://127.0.0.1:8080/actuator/health/liveness
curl http://127.0.0.1:8080/actuator/health/readiness
curl http://127.0.0.1:3000/
```

The native root Node run is not acceptance authority: the host reports Node
25.8.1 and nested npm scripts resolved an incompatible Node 22.6.0, while the
repository pins Node 24.18.0. That native run passed formatting, lint, type
checking, contract tests, and all market-data tests before the existing web
Vitest ESM startup incompatibility stopped it. The clean pinned Node 24 Docker
quality target passed the complete suite and is the authoritative result.

## 5. Test and build counts

| Check                             | Result                                                 |
| --------------------------------- | ------------------------------------------------------ |
| Contracts tests                   | 4 passed                                               |
| Market-data tests                 | 57 passed                                              |
| Web tests                         | 6 passed                                               |
| Total Node tests                  | **67 passed, 0 failed**                                |
| Property-based generated cases    | 900 across decimal, book validity, and VWAP properties |
| Kotlin/Spring tests               | **2 passed, 0 failed**                                 |
| Kotlin formatting/lint            | Pass                                                   |
| Spring `bootJar`                  | Pass                                                   |
| TypeScript type checking          | Pass                                                   |
| TypeScript/Next production builds | Pass                                                   |
| Production npm audit              | 0 vulnerabilities                                      |
| Docker quality and image builds   | Pass                                                   |
| Compose invariant check           | Pass                                                   |
| Git whitespace check              | Pass                                                   |
| Forbidden-code scans              | Pass                                                   |

## 6. Verified invariants

- CEX identity cannot be reconstructed from display ticker alone.
- Changing any required identity component changes the canonical instrument.
- USDT and USDC instruments never compare equal.
- Prices, quantities, notionals, funding values, percentages, multipliers,
  ticks, and steps are never silently rounded or represented as IEEE-754
  financial values.
- Unknown is not converted to zero, unsupported, unverified, or
  research-required.
- Current and last funding are never renamed predicted.
- Native funding is not overwritten by normalized eight-hour output.
- No healthy executable book is locked, crossed, gapped, invalid, unsupported,
  or missing one side.
- A gap suppresses best bid, best ask, midpoint, and VWAP until replacement
  recovery.
- Replaying the same valid fixture produces the same result.
- Increasing requested buy quantity cannot improve ask VWAP; increasing
  requested sell quantity cannot improve bid VWAP on a static book.
- No checksum behavior is synthesized.
- Unsupported or unverified capabilities cannot expose fake ports.

## 7. Blocker issues

None.

## 8. High-priority issues

No unresolved high-priority issue remains.

## 9. Remediated issues

### HIGH-001 — Incorrect Binance first-event bridge

- **Finding:** the range policy required the first WebSocket event's `pu` to
  equal the REST snapshot `lastUpdateId`.
- **Why high:** Binance documents a different initialization rule:
  `U <= lastUpdateId <= u`; `pu` links subsequent stream events.
- **Smallest fix:** track whether a delta has been applied since the snapshot,
  apply the range bridge to the first event, and apply `pu` chaining after it.
- **Evidence:** the `BNFUT-04` fixture now has a first range containing the
  snapshot ID while its `pu` deliberately differs; deterministic replay passes.
- **Official evidence:** `BNFUT-04`, Binance USDⓈ-M Futures,
  <https://developers.binance.com/en/docs/products/derivatives-trading-usds-futures/websocket-market-streams/How-to-manage-a-local-order-book-correctly>,
  retrieved again 2026-07-26.

### HIGH-002 — Unbounded observability labels

- **Finding:** free-form `reason` and `channel` were permitted metric
  dimensions.
- **Why high:** exchange error text, subscription topics, or instrument-bearing
  channels could create unbounded cardinality and monitoring failure.
- **Smallest fix:** metric labels now use only venue, product group, finite
  capability, and finite state. Channel/reason remain structured-event fields.
- **Evidence:** a focused contract test rejects both dimensions from every
  metric contract.

### HIGH-003 — Unsupported source-free support claims

- **Finding:** `SUPPORTED` could pass validation with a port but no official
  source ID.
- **Why high:** a future adapter could claim financially relevant support
  without evidence.
- **Smallest fix:** every supported capability must provide a concrete port and
  at least one source ID.
- **Evidence:** a focused fail-closed mock-adapter test passes.

### HIGH-004 — Calendar-invalid timestamps accepted

- **Finding:** `Date.parse` normalizes some impossible calendar dates instead of
  rejecting them.
- **Why high:** invalid observation times can corrupt freshness and lag
  decisions.
- **Smallest fix:** validate RFC 3339 structure, Gregorian calendar day,
  clock, and UTC offset ranges explicitly.
- **Evidence:** 30 February is rejected and a valid leap-day offset timestamp
  is accepted.

### HIGH-005 — Restart classified as a harmless duplicate

- **Finding:** the duplicate/older-ID check ran before the configured restart-ID
  check, so a `u=1` restart delta could leave the old book executable.
- **Why high:** treating a documented restart as a harmless duplicate preserves
  stale depth without recovery.
- **Smallest fix:** evaluate the configured restart identifier before duplicate
  classification, enter `GAPPED`/`STALE`, and require a replacement snapshot.
- **Evidence:** a focused test proves executable output is suppressed at restart
  and restored only by explicit replacement recovery.

## 10. Accepted limitations

- This package is a contract and deterministic harness, not a running
  market-data service.
- Fixtures are small synthetic representations of official semantics, not
  complete exchange payloads or live captures.
- Full hostile JSON schema decoding belongs to each live adapter boundary.
  Fixture parsing validates financially relevant canonical fields but is not a
  general network decoder.
- Sequence-less replacement streams cannot detect duplicates without a stable
  official update identifier.
- Checksum validation is a capability only; no algorithm is implemented or
  implied.
- Manual mapping approval is represented as a contract only. There is no
  registry, persistence workflow, or named production mapping owner yet.
- DEX token identity, custody, quote semantics, and transaction construction
  remain outside this CEX model.
- There is no monitoring exporter, storage, event bus, scanner UI, or
  historical time-series pipeline.
- The local host Node toolchain does not match the pinned project version. The
  reproducible Node 24 container is the acceptance authority.
- The full development dependency audit still reports the previously accepted
  lint-toolchain advisories; the production dependency audit is clean.

## 11. Technical debt

- Add adapter-specific hostile-payload schemas, payload-size limits, and
  fuzzing before any network input is accepted.
- Define and test chronological ordering policy for exchange, receive, and
  processing timestamps at the live adapter boundary.
- Add cross-language golden vectors if canonical contracts cross from
  TypeScript into another runtime.
- Name the operational canonical-asset mapping owner and implement an audited
  registry only in an approved persistence phase.
- Add venue/channel freshness policy catalogs only with official cadence
  evidence.
- Revalidate fixture source dates and semantics before each live adapter phase.
- Resolve the existing development-only npm advisory chain when the
  Next.js/ESLint ecosystem supports a nonbreaking upgrade.

## 12. Security observations

- `packages/market-data` has no runtime dependency and no network, filesystem
  write, credential, authentication, signing, private endpoint, or trading
  path.
- Metric contracts exclude instrument IDs and free-form values.
- Structured-event reasons must remain sanitized diagnostics and must never
  contain raw payloads, credentials, or user-controlled secrets in later
  adapters.
- Decimal wire inputs are length-, precision-, scale-, notation-, sign-, and
  domain-bounded before arithmetic.
- Identifier and source constructors reject empty, trimmed, control-character,
  oversized, or malformed values.
- No production credential or secret was found by the focused scan.
- Future network clients must enforce bounded message sizes before JSON parsing
  and bigint conversion; this phase does not receive network input.

## 13. Runtime verification evidence

Final Compose status:

| Service         | Runtime result              |
| --------------- | --------------------------- |
| PostgreSQL 18.1 | Healthy; loopback port 5432 |
| Redis 8.2       | Healthy; loopback port 6379 |
| Control API     | Healthy; loopback port 8080 |
| Web             | Healthy; loopback port 3000 |

Endpoint evidence:

| Endpoint                     | Result                                                 |
| ---------------------------- | ------------------------------------------------------ |
| `/api/v1/health`             | HTTP 200, `UP`, service `control-api`, version `0.1.0` |
| `/actuator/health/liveness`  | HTTP 200, `UP`                                         |
| `/actuator/health/readiness` | HTTP 200, `UP`                                         |
| Web `/`                      | HTTP 200                                               |

The verified Compose stack was left running and healthy at the end of the
review. Named PostgreSQL and Redis volumes were preserved.

## 14. Freeze recommendation

Phase 2A.1 can be frozen. Before assigning a freeze tag:

1. review and stage the complete uncommitted Phase 2A.1 file set;
2. commit it without mixing unrelated work;
3. run the repository CI on that exact commit;
4. freeze only after CI reproduces the pinned Node, JVM, audit, Docker, and
   secret-scan results.

No acceptance finding requires Phase 2A.2 work to close Phase 2A.1.

## 15. Exact recommendation for the next task

The next task is a separately approved **Phase 2A.2 — OKX Exchange V5
Swap/Futures public adapter**. Do not combine Binance, Bybit, authenticated
features, persistence, or trading with it.

Use this exact prompt:

```text
Read AGENTS.md and all relevant Phase 0, Phase 1, Phase 2A.1 and acceptance
documents completely before changing anything, including:

docs/MASTER_SPEC.md
docs/ARCHITECTURE.md
docs/ROADMAP.md
docs/DOMAIN_MODEL.md
docs/API_CONTRACTS_PLAN.md
docs/SECURITY_MODEL.md
docs/EXCHANGE_CAPABILITY_MATRIX.md
docs/PHASE_0_API_RESEARCH.md
docs/PHASE_0_SOURCE_REGISTER.md
docs/PHASE_0_DECISIONS.md
docs/PHASE_1_ACCEPTANCE.md
docs/PHASE_2A_1_MARKET_DATA_FOUNDATION.md
docs/PHASE_2A_1_ACCEPTANCE.md
docs/DECISIONS_REQUIRED.md
docs/RISK_REGISTER.md
docs/ACCEPTANCE_CRITERIA.md
docs/adr/0003-canonical-market-data-model.md
docs/adr/0004-order-book-integrity-strategies.md

Phase 2A.1 is frozen and approved.

Implement Phase 2A.2 only:
OKX Exchange V5 Swap/Futures public, unauthenticated market-data adapter.

Before modifying files:
1. inspect the complete repository;
2. present a concise implementation plan;
3. list expected files to create or modify;
4. identify blocking ambiguities;
5. re-retrieve current official OKX documentation and changelog;
6. update the Phase 0 source register retrieval dates and warnings where needed;
7. stop if official evidence contradicts the approved product group or
   Phase 2A.1 contracts.

Scope only officially verified public OKX Exchange V5 Swap/Futures capabilities:
- instrument metadata;
- ticker, mark and index prices with explicit semantic mapping;
- venue-native funding observations, documented interval and next funding time;
- public REST order-book snapshot where required;
- public WebSocket snapshot/delta books;
- seqId/prevSeqId continuity;
- documented reconnect, resubscribe and replacement recovery;
- server time and public rate-limit handling;
- bounded queues, message-size limits and runtime schema validation;
- recorded minimal fixtures, deterministic replay, fault injection, metrics and
  structured events;
- credential-free bounded canary/integration tests.

Requirements:
- use only current official OKX documentation;
- cite a Phase 0 source ID for every endpoint, channel, field mapping,
  capability claim and recovery rule;
- keep official instrument ID, product group, market type and settlement asset
  explicit;
- preserve USDT and USDC separation;
- preserve decimals as strings until exact validation;
- preserve native funding semantic and interval;
- mark unsupported, unverified and research-required capabilities explicitly;
- any seqId/prevSeqId gap immediately makes the book STALE and suppresses
  executable output until documented replacement recovery;
- do not invent JSON checksum behavior;
- no private API, credentials, authentication, orders, positions, persistence,
  event bus, scanner UI, paper/live trading, Risk Engine, Execution Engine, AI,
  billing, DEX, Binance or Bybit code.

Add focused unit, property, replay, schema, reconnect, resubscribe, rate-limit,
gap, stale, recovery, malformed-payload and bounded public integration tests.
Network integration tests must be credential-free, bounded, opt-in and safe for
CI/offline execution.

Run formatting, linting, type checking, all Node and Kotlin tests, production
builds, production dependency audit, Docker image builds, Docker Compose
startup and health checks, and forbidden credential/trading scans.

Create the Phase 2A.2 implementation and acceptance documentation, but do not
begin Binance, Bybit, authenticated APIs, persistence, analytics UI, or any
trading phase. Do not create a commit.

At the end report:
1. implementation summary;
2. official sources and retrieval dates;
3. verified, unsupported, unverified and research-required capabilities;
4. exact field and semantic mappings;
5. sequence/reconnect/recovery behavior;
6. files changed;
7. commands, test counts and results;
8. runtime/canary evidence;
9. security and correctness decisions;
10. accepted limitations and remaining risks;
11. whether Phase 2A.2 can enter formal acceptance review;
12. the exact recommended acceptance-review prompt.
```
