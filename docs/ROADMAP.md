# Development Roadmap

## 1. Roadmap rules

- Only one explicitly approved implementation phase may be active.
- Phase 1 and Phase 2A.1 through Phase 2A.4 are frozen and approved; this
  roadmap does not reopen them.
- Every phase has independently testable deliverables, non-goals, acceptance
  evidence, rollback notes, and a formal review.
- No exchange capability exists because it appears on a roadmap. Current
  official evidence and capability gates remain mandatory.
- Public analytics precedes accounts, positions, paper trading, authenticated
  synchronization, and live execution.
- Paper trading precedes every live-execution capability.
- Live execution remains disabled by default and needs separate product, legal,
  security, risk, and operational approval.
- Telegram is a presentation/command channel, never a financial authority.
- Infrastructure is added only when the owning phase has measured need.

The old Phase 2B–13 labels in `ACCEPTANCE_CRITERIA.md` are historical. The
current Phase 2B decomposition in this roadmap,
`PHASE_2B_SPREAD_ANALYTICS_PLAN.md`, and the consolidated current acceptance
section are authoritative.

## 2. Approved sequence

| Order | Phase      | Outcome                                                 |
| ----: | ---------- | ------------------------------------------------------- |
|     0 | Phase 0    | Official API discovery and product decisions            |
|     1 | Phase 1    | Frozen application foundation                           |
|     2 | Phase 2A.1 | Frozen canonical market-data contracts and mock harness |
|     3 | Phase 2A.2 | OKX Exchange V5 Swap/Futures public adapter             |
|     4 | Phase 2A.3 | Binance USDⓈ-M Futures public adapter                   |
|     5 | Phase 2A.4 | Bybit V5 `linear` public adapter                        |
|     6 | Phase 2B   | Spread Analytics Core                                   |
|     7 | Phase 2C   | Alerts and Notification Foundation                      |
|     8 | Phase 3    | Identity, Accounts and Telegram Linking                 |
|     9 | Phase 4    | Position Workspace                                      |
|    10 | Phase 5    | Paper Trading with Telegram Controls                    |
|    11 | Phase 6    | Authenticated Read-only Exchange Synchronization        |
|    12 | Phase 7    | Manual and Semi-automatic Live Execution                |
|    13 | Phase 8    | Controlled Automatic Farming                            |

Billing, DEX/RFQ/on-chain execution, additional venues, AI expansion,
multi-region deployment, and other scale programs remain unnumbered,
separately approved work after the required foundations. They must not be pulled
into the phases below by implication.

## 3. Completed discovery and foundations

### Phase 0 — Official API discovery and product decisions

Status: completed decision baseline; evidence must still be revalidated per
adapter phase.

Deliverables:

- official source and capability registers;
- product-group-specific capability classification;
- approved pilot order: OKX V5 Swap/Futures, Binance USDⓈ-M Futures, Bybit V5
  `linear`;
- Bitget UTA V3 reserve-only;
- public unauthenticated Phase 2A boundary;
- canonical identity, funding, order-book integrity, and DEX deferral decisions.

Acceptance:

- P0-001 through P0-008 approved;
- unsupported, unverified, and research-required claims fail closed;
- legal/rights restrictions remain explicit blockers for production use.

### Phase 1 — Frozen application foundation

Status: frozen and approved for its bounded implementation.

Delivered:

- monorepo and quality foundation;
- frontend shell, design tokens, and authentication page layouts;
- control API skeleton and health endpoints;
- local PostgreSQL, Redis, and Docker Compose;
- shared health contracts, tests, builds, and documentation.

Not delivered:

- real account identity or sessions;
- exchange connectivity or credentials;
- analytics, positions, notifications, paper/live execution.

The original Phase 1A–1E planning terminology is historical. The accepted
bounded Phase 1 baseline in `PHASE_1_ACCEPTANCE.md` is authoritative.

### Phase 2A.1 — Frozen canonical market-data foundation

Status: frozen and approved.

Delivered:

- exact-decimal and canonical CEX identity contracts;
- funding, price, metadata, capability, quality, and freshness semantics;
- deterministic order-book integrity state machines;
- mock public adapter harness and provenance-bearing fixtures;
- observability contracts without production infrastructure.

Not delivered:

- network clients or live adapters;
- persistence or event bus;
- analytics UI;
- authenticated data or trading.

## 4. Public adapter increments

### Phase 2A.2 — OKX Exchange V5 Swap/Futures public adapter

Status: frozen and approved after the independent formal acceptance review on
2026-07-27.

Scope:

- current officially verified public, unauthenticated OKX V5 Swap/Futures
  metadata, prices, funding, and order-book capabilities;
- runtime schema validation, bounded reconnect/resubscribe, rate-limit handling,
  freshness, sequence-gap suppression, replacement recovery, fixtures, metrics,
  and credential-free canary tests.

Non-goals:

- Binance, Bybit, private APIs, credentials, persistence, scanner UI, Telegram,
  paper/live trading, Risk Engine, and Execution Engine.

Acceptance:

- every endpoint/channel/field/recovery claim cites a re-retrieved official
  source;
- canonical identity and exact decimals preserve Phase 2A.1 invariants;
- any `seqId`/`prevSeqId` gap suppresses executable output until documented
  recovery;
- malformed, stale, reconnect, resubscribe, limit, and drift cases pass;
- all repository quality, build, audit, Docker, and runtime checks remain green.

Implementation evidence:

- isolated `@arbitrage/okx-public-adapter` workspace;
- exact runtime schemas and explicit derivative identity/funding mappings;
- bounded public REST/JSON-WebSocket transports, injected freshness policy and
  low-cardinality observability contracts;
- deterministic provenance fixtures, fault injection, replay tests and an
  opt-in credential-free live canary;
- [`PHASE_2A_2_OKX_PUBLIC_ADAPTER.md`](PHASE_2A_2_OKX_PUBLIC_ADAPTER.md) and
  [`PHASE_2A_2_ACCEPTANCE.md`](PHASE_2A_2_ACCEPTANCE.md).

### Phase 2A.3 — Binance USDⓈ-M Futures public adapter

Status: frozen and approved after formal independent acceptance completed on
2026-08-02 with `PASS_WITH_WARNINGS`.

Scope:

- one isolated public, unauthenticated Binance USDⓈ-M product-group adapter;
- officially verified instrument, ticker/price, funding, and book capabilities;
- documented REST snapshot and `U/u/pu` stream bridge/continuity;
- bounded rate weights, time synchronization, reconnect, fixtures, metrics, and
  canary tests.

Non-goals:

- Binance Spot or Alpha, private/user data, Bybit, persistence, positions, or
  trading.

Acceptance:

- official sources are re-retrieved and product family cannot leak into Spot or
  Alpha;
- first-event snapshot bridging and subsequent `pu` continuity pass long replay
  and fault tests;
- any gap, ambiguous restart, or schema drift makes output stale;
- USDT and USDC remain distinct;
- Phase 2A.1 and 2A.2 tests remain green.

Implementation evidence:

- isolated `@arbitrage/binance-usdm-public-adapter` workspace;
- runtime-bounded public REST and routed diff-depth WebSocket boundaries;
- exact metadata, price and native-funding mappings with explicit unknown,
  unsupported, unverified and research-required states;
- official initial overlap plus subsequent `pu` continuity, immediate stale
  suppression and replacement-snapshot/replay recovery;
- provenance fixtures, deterministic/fault tests, low-cardinality telemetry
  contracts and an opt-in bounded canary;
- [`PHASE_2A_3_BINANCE_USDM_PUBLIC_ADAPTER.md`](PHASE_2A_3_BINANCE_USDM_PUBLIC_ADAPTER.md),
  implementation pre-acceptance evidence and ADR 0007.

### Phase 2A.4 — Bybit V5 `linear` public adapter

Status: frozen and approved after formal independent acceptance completed on
2026-08-03 with `PASS_WITH_WARNINGS`.

Scope:

- one isolated public, unauthenticated Bybit V5 `linear` adapter;
- officially verified metadata, ticker/price, funding, and order-book
  capabilities;
- documented snapshot/delta and `u=1` restart/replacement behavior;
- bounded transport, limits, freshness, fixtures, metrics, and canary tests.

Non-goals:

- inverse, spot, option, private, order, credential, persistence, or trading
  scope.

Acceptance:

- current official product/category evidence supports every mapping;
- `u=1` invalidates prior book state and only an accepted replacement restores
  executable output;
- category, settlement, funding semantic, and exact-decimal boundaries pass;
- full three-adapter deterministic and runtime regression suite passes.

Implementation evidence:

- isolated `@arbitrage/bybit-linear-public-adapter` workspace;
- bounded public REST and `wss://stream.bybit.com/v5/public/linear` boundaries;
- exact metadata, price, funding and book mappings with explicit evidence
  states and USDT/USDC separation;
- snapshot/delta application, duplicate/older rejection, `u=1` replacement,
  transport-gap suppression and replacement-snapshot recovery;
- full sequence-gap detection remains `RESEARCH_REQUIRED` because current
  official payloads contain neither a previous ID nor a contiguous-increment
  contract;
- source-provenanced fixtures, deterministic/property/fault tests,
  low-cardinality telemetry and a default-off bounded public canary;
- [`PHASE_2A_4_BYBIT_LINEAR_PUBLIC_ADAPTER.md`](PHASE_2A_4_BYBIT_LINEAR_PUBLIC_ADAPTER.md),
  implementation pre-acceptance evidence and ADR 0008.

## 5. Analytics and notification foundations

### Phase 2B — Spread Analytics Core

Status: documentation decomposition complete; implementation is not approved.

The authoritative decomposition is
[`PHASE_2B_SPREAD_ANALYTICS_PLAN.md`](PHASE_2B_SPREAD_ANALYTICS_PLAN.md), with
the following independently testable and freezable sequence:

| Order | Subphase                                              | Outcome                                                                                       |
| ----: | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
|     1 | Phase 2B.1 — Canonical Instrument Matching Foundation | Versioned match, non-match, ambiguity, or conflict quarantine without ticker-derived identity |
|     2 | Phase 2B.2 — Executable Spread Mathematics            | Exact direction-aware VWAP, entry/exit spread, depth, residual, fee, and slippage contracts   |
|     3 | Phase 2B.3 — Funding Differential                     | Native semantic-preserving comparison and separately named normalized derivations             |
|     4 | Phase 2B.4 — Opportunity Lifecycle                    | Deterministic qualification, degradation, suppression, expiry, and resolution                 |
|     5 | Phase 2B.5 — Anomaly Detection                        | Deterministic rule-versioned market and data-quality anomalies; no ML/AI                      |
|     6 | Phase 2B.6 — Spread History                           | Immutable observation, gap, replay, downsampling, and export contracts; no persistence        |
|     7 | Phase 2B.7 — Ranking                                  | Eligibility-first, reproducible ranking from versioned complete inputs                        |

Recommended opportunity lifecycle:

```text
DISCOVERED -> QUALIFYING -> ACTIVE -> CONVERGING -> RESOLVED
                       \-> SUPPRESSED | EXPIRED | DEGRADED
```

Deliverables:

- independently frozen matching, formula, lifecycle, anomaly, history, and
  ranking contracts;
- input revision, quality, provenance, and expiry on every result;
- deterministic fixture/replay and property tests;
- unknown-cost and insufficient-liquidity behavior;
- finite-cardinality observability and bounded hostile-input/resource behavior;
- read-only contracts that later UI/alerts may consume.

Non-goals:

- accounts, personal positions, Telegram, authenticated exchange data, paper or
  live execution;
- persistence, event bus, frontend UI, Risk Engine, Execution Engine, AI, and
  billing.

Acceptance:

- no stale/gapped or insufficient-depth input produces actionable output;
- expected net is unavailable when a required cost is unknown;
- USDT/USDC and product groups never merge implicitly;
- executable spread, funding differential, ranking, lifecycle, anomaly, and
  history reproduce from immutable inputs and formula versions;
- each subphase receives separate implementation approval, formal acceptance,
  and freeze before a dependent subphase starts;
- frozen public adapter packages remain unchanged;
- history uses fixture-backed contracts only; persistence requires a separate
  future approval.

Blocking product decisions D-055 through D-064 define compatibility, requested
size, formulas, costs, funding alignment, lifecycle, anomaly, history, ranking,
freshness, and bounded-load policies. They must not be replaced by implementation
defaults.

### Phase 2C — Alerts and Notification Foundation

Scope:

- alert domain and system-defined rules;
- deterministic rule evaluation;
- minimum duration, cooldown, hysteresis, deduplication, grouping, suppression,
  severity, expiry, and mute contracts;
- notification, delivery, action, transactional outbox, attempts, and
  dead-letter state;
- in-app delivery;
- deterministic mock Telegram provider.

Because real accounts arrive in Phase 3, Phase 2C implements user-neutral
contracts and system-owned/test recipients only. Per-user activation and private
delivery are deferred.

Non-goals:

- real Telegram provider/API, link tokens, user sessions, private notifications,
  exchange credentials, paper/live action, Risk Engine, or Execution Engine.

Acceptance:

- alert and delivery state machines pass unit, property, replay, concurrency,
  idempotency, retry, rate-limit, and failure-isolation tests;
- Telegram mock failure changes delivery state only;
- public/private data classification fails closed;
- no provider credentials or real external delivery exist;
- notification telemetry uses bounded labels.

## 6. Accounts, positions, and paper trading

### Phase 3 — Identity, Accounts and Telegram Linking

Scope:

- registration, email verification, secure sessions, recovery, and audit;
- per-user notification preferences;
- website-issued single-use Telegram linking challenges;
- stable Telegram-ID-to-internal-user linking and unlinking;
- server-side Mini App init-data verification and short-lived sessions;
- Telegram Gateway;
- read-only private notifications and status.

Non-goals:

- position execution, exchange credentials, private exchange APIs, paper/live
  orders, Risk Engine, or Execution Engine.

Acceptance:

- identity/session and link flows pass expiry, replay, race, account-conflict,
  unlink, environment-separation, enumeration, and cross-user tests;
- Telegram username is never canonical identity;
- unsigned, expired, replayed, unlinked, and frontend-asserted identities fail;
- link/unlink audit and in-app/email security notifications work;
- changing a linked Telegram account disables future Telegram trading controls;
- Gateway cannot reach exchange adapters or financial secrets.

### Phase 4 — Position Workspace

Scope:

- manually entered positions;
- watch-only positions;
- two-leg canonical identity with extensible multi-leg contracts;
- public live executable valuation;
- entry/current spread, spread PnL, funding PnL, fees, estimated/realized
  slippage, net PnL, residual delta, and supported liquidation buffer;
- targets, state history, data quality, notes, and personal alerts;
- read-only private bot and Mini App position views.

Non-goals:

- exchange credentials or synchronized private state;
- paper or live orders;
- Risk Engine or Execution Engine.

Acceptance:

- manual/watch lifecycle mode gates and transition history pass;
- unknown components never become zero;
- stale/gapped public data suppresses executable valuation;
- USDT/USDC remain separate and conversions are explicit views;
- web, bot, and Mini App render the same tenant-scoped backend truth;
- Telegram outage does not alter position or alert state.

### Phase 5 — Paper Trading with Telegram Controls

Scope:

- simulated entry and exit;
- simulated partial fills, rejects, latency, fees, funding, slippage, and
  residual delta;
- deterministic paper position/reconciliation state machines;
- bot buttons and Mini App execution previews;
- single-use confirmation and audit flow.

Non-goals:

- real credentials, production exchange orders, or live authority.

Acceptance:

- no real endpoint or credential is reachable;
- paper/live environment separation is mechanical and visible;
- partial hedge, restart, unknown outcome, reconciliation, emergency simulation,
  replay, and concurrency tests pass;
- every action is idempotent, expiring, current-state validated, and audited;
- old Telegram messages cannot mutate paper state;
- provider failure does not change paper position state.

## 7. Private synchronization and live control

### Phase 6 — Authenticated Read-only Exchange Synchronization

Scope:

- separately approved credential vault;
- read-only balances, orders, fills, and real positions;
- private-stream and REST reconciliation;
- authenticated exchange-synchronized positions;
- Telegram read-only monitoring.

Non-goals:

- order submission, amend/cancel, live previews, Risk Engine, or Execution
  Engine.

Acceptance:

- legal/security/private-capability research is approved per product group;
- least-privilege credentials cannot trade or withdraw;
- secrets are KMS/vault protected, redacted, revocable, and isolated;
- restart, stream gap, external action, mismatch, stale, and unknown state fail
  closed;
- synchronization grants no execution authority;
- Telegram Gateway cannot access credentials or private adapters directly.

### Phase 7 — Manual and Semi-automatic Live Execution

Scope:

- Risk Engine;
- Execution Engine;
- manual and separately bounded semi-automatic authority;
- paired execution and slicing;
- partial-fill and unknown-order handling;
- kill switches and emergency workflows;
- Telegram/Mini App previews and explicit confirmation.

Non-goals:

- default-on live trading or persistent automatic farming.

Acceptance:

- paper graduation, legal, product, security, venue, risk, and operations gates
  are approved before live activation;
- live is off by default per account/environment;
- no blind order retry exists;
- every command follows authorization, state/freshness, risk, preview,
  confirmation, execution, and reconciliation;
- critical callbacks are single-use, short-lived, idempotent, and state-bound;
- high-notional actions meet strong reauthentication policy;
- Telegram limits cannot exceed immutable system limits and Telegram cannot
  change risk limits without approved web reauthentication;
- paired, partial, outage, restart, unknown-order, kill-switch, and rollback
  drills meet predeclared thresholds.

### Phase 8 — Controlled Automatic Farming

Scope:

- separately approved automatic entry and exit;
- capital allocation and strategy limits;
- pause/resume and emergency controls;
- continuous risk and reconciliation;
- AI explanation layer only after deterministic validation.

Non-goals:

- unconstrained authority, AI execution authority, or Telegram-owned automation.

Acceptance:

- persistent authority is exact, bounded, revocable, opt-in, and below immutable
  system ceilings;
- long-duration paper and limited-live evidence meet thresholds declared before
  evaluation;
- risk, execution, reconciliation, disaster recovery, maintenance, anomaly,
  allocation, and kill-switch paths pass independent review;
- Telegram is monitoring and command presentation only;
- AI cannot originate or strengthen financial authority and the system remains
  safe without AI;
- staged rollout and global disable are tested.

## 8. Initially mocked components

| Component                         | Mock until                                             |
| --------------------------------- | ------------------------------------------------------ |
| Exchange public adapters          | Their individual 2A.x phase                            |
| Alert Telegram provider           | Real provider is separately approved in/after Phase 3  |
| Email/web-push providers          | Provider/security decision in Phase 3+                 |
| Position exchange synchronization | Phase 6                                                |
| Exchange credential vault         | Phase 6                                                |
| Paper fill/funding model          | Implemented only in Phase 5; deterministic before then |
| Risk Engine                       | Phase 7                                                |
| Execution Engine                  | Phase 7                                                |
| Automatic policy engine           | Phase 8                                                |
| AI explanation                    | Phase 8 or separately approved later work              |

Mocks fail closed and cannot resemble successful unsupported capabilities.

## 9. Critical dependencies

- Phase 2A.2 requires current official OKX evidence.
- Phase 2A.3 requires accepted 2A.2 boundaries and current Binance evidence.
- Phase 2A.4 requires accepted earlier adapter boundaries and current Bybit
  evidence.
- Phase 2B.1 requires all three pilot public adapters accepted and D-055
  approved. Each later 2B.x increment requires its earlier dependency frozen
  plus the decisions named in `PHASE_2B_SPREAD_ANALYTICS_PLAN.md`.
- Phase 2C requires versioned analytics events; personal activation waits for
  Phase 3.
- Phase 3 requires identity/legal/provider/security decisions.
- Phase 4 requires Phase 2B analytics and Phase 3 tenant identity.
- Phase 5 requires Phase 4 positions and Phase 2C/3 command-notification
  foundations.
- Phase 6 requires legal approval and private capability/credential threat
  models.
- Phase 7 requires paper graduation, read-only reconciliation, Risk/Execution
  reviews, and operations readiness.
- Phase 8 requires controlled live evidence and a new explicit approval.

Passing a phase does not authorize the next one.

## 10. Future cross-cutting product tracks — architecture only

These tracks refine future work without authorizing it or altering Phase 2B.
Each item is independently implementable, testable and freezable after its
decisions are approved.

### Design track

| Track                                            | Scope                                                                                                                                           | Depends on                             | Acceptance gate                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| D1 — Brand and Semantic Design Tokens            | canonical source/schema, dark/light semantic resolution, typography/scales, status/chart tokens, validation and bounded Phase 1 token migration | amendment frozen; D-079–D-088 approved | independent D1 acceptance passes; no unresolved BLOCKER/HIGH         |
| D2 — Foundational Component Library              | accessible controls, forms, feedback, dialogs and navigation                                                                                    | D1                                     | keyboard, focus, screen-reader, disabled/loading/error matrices pass |
| D3 — Public and Authenticated Application Shells | public IA and authenticated responsive shell                                                                                                    | D2; corresponding route contracts      | deep links and planned/unavailable/entitlement states fail closed    |
| D4 — Dark/Light Theme Completion                 | `SYSTEM`/`DARK`/`LIGHT`, account/device persistence and no-flash boot                                                                           | D1–D3; security/CSP review             | first-paint, hydration, corrupt-storage and preference tests pass    |
| D5 — Financial Tables and Visualization          | exact-value grids, chart and order-book presentation                                                                                            | D2/D4; frozen domain contracts         | USDT/USDC, units, quality/gap and density remain explicit            |
| D6 — Admin UI System                             | personal billing patterns and separate `/admin` presentation                                                                                    | D2/D4; C/I contracts accepted          | admin boundary, strong-action and audit UX pass                      |

### Identity and administration track

| Track                                                   | Scope                                                                           | Depends on                                   | Acceptance gate                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| I1 — Account and Identity Foundation                    | account identity, tenant ownership and recovery foundation                      | Phase 1 foundation; identity/legal decisions | account isolation, recovery and ownership review passes                 |
| I2 — Email Verification and Session Security            | verification, session inventory/revocation and strong-auth foundation           | I1                                           | abuse, enumeration, expiry, revocation and session-security tests pass  |
| I3 — RBAC Permission Model                              | independent permissions and time-bounded role assignments                       | I2; ADR-0012                                 | deny-default matrix, separation of duties and assignment tests pass     |
| I4 — Administrative Authentication and Audit Foundation | `/admin` sessions, step-up, reason, idempotency, approval and append-only audit | I3; admin policy decisions                   | direct-route, self-approval, replay, stale-version and audit tests pass |

### Commerce track

| Track                                      | Scope                                                                                                            | Depends on                                         | Acceptance gate                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| C1 — Product Catalog and Entitlements      | Product/Plan/PlanVersion/Price, definitions, grants and pure evaluator                                           | decisions on catalog/precedence; ADR-0010          | deterministic overlap/expiry/revocation/usage tests pass                                 |
| C2 — Subscription State Machine            | provider-neutral subscriptions, periods, trial, grace and plan-change commands                                   | C1; identity ownership from I1; lifecycle policies | complete transition, idempotency and reconciliation tests pass                           |
| C3 — Fiat Payment Provider Boundary        | provider-neutral ports, verified event inbox, attempts/invoices and reconciliation harness; no concrete provider | C1–C2; ADR-0011; generic security contracts        | synthetic signature, duplicate, reorder, unknown-outcome, outage and redirect tests pass |
| C4 — Promotion and Promo-Code Engine       | promotion/code/reservation/redemption and benefit decisions                                                      | C1–C2; promo policies                              | exact arithmetic, race, multi-account abuse and secret-redaction tests pass              |
| C5 — Crypto Invoice and Settlement         | route identity, policy-driven invoice/finality/reorg and mock custody boundary; no concrete processor            | C1–C2; ADR-0011; generic custody boundary          | synthetic asset/network, finality, reorg, exception and reconciliation tests pass        |
| C6 — Billing Self-Service Portal           | plan/access/usage/invoice/payment/crypto/promo/history and safe commands                                         | C2–C5 as relevant; D2/D4; I1                       | portal separates subscription, payment, grace, promotion and effective access            |
| C7 — Admin Commerce Console                | authorized catalog/subscription/payment/crypto/promo/reconciliation operations                                   | I4; corresponding C1–C5 commands; D6               | permission, step-up/approval, currency separation and audit tests pass                   |
| C8 — Reconciliation, Refunds and Reporting | refunds/chargebacks, dead letters, reporting, SLO/runbooks                                                       | C3/C5 as applicable; C7                            | dual-control policy, exact currency, restore, audit and disaster exercises pass          |

### Dependency and parallelism rules

- D1 → D2 → D3 is sequential; D4 follows the shell/token foundation. D5 waits
  for D2/D4 and frozen financial contracts. D6 waits for D2/D4 and I/C contracts.
- I1 → I2 → I3 → I4 is sequential. Identity ownership precedes billing ownership;
  RBAC and audit precede every admin mutation.
- C1 → C2 is sequential. C3, C4 and C5 may then proceed in parallel after their
  contract-level decisions; provider/custody selection is not a prerequisite for
  the provider-neutral C3 or mock-boundary C5 foundations. Those boundaries must
  freeze before any separately approved concrete integration.
  C6 waits for the relevant read/command contracts. C7 waits for I4 and domain
  commands. C8 waits for the payment rails and C7 operations boundary.
- Phase 2B remains read-only analytics and has no dependency on commerce.
- Design components never become a second source of authorization; admin and
  provider clients never grant entitlements directly.

Every track requires a separate implementation prompt and formal acceptance.

### D1 planning and approval gate

D1 is decomposed in
`D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md`; its independent review is defined in
`D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md`. D-079 through D-088 are
approved in `D1_DESIGN_DECISIONS.md`, and ADR-0013 is `Accepted`. D1 is now
eligible for a separate implementation approval but has not begun.

D1 may change only the token source/schema, repository-native validation and
generation boundary, committed deterministic token artifacts if approved, and
the bounded Phase 1 token consumer bridge. It does not authorize a component or
page redesign, a runtime theme picker, font installation, D2–D6, identity,
commerce, admin runtime or Phase 2B work. D1 implementation and formal
acceptance are separate tasks; passing either does not authorize D2.
