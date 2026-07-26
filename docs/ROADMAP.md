# Development Roadmap

## 1. Roadmap rules

- A phase starts only after explicit approval.
- Each phase has an independently demonstrable outcome and release gate.
- Failed gate criteria keep the phase open; work does not silently spill into the
  next phase.
- Exchange-dependent work starts only after the relevant official-documentation
  audit is complete.
- Live trading remains feature-flagged off by default and is not present before
  the manual-live phase.
- Scope may be reduced after discovery, but safety gates may not be waived.

## 2. Stage map

| Stage | Phases | Exit outcome |
|---|---|---|
| Planning and discovery | 0 | Verified inputs for architecture and adapter work |
| Foundation | 1A–1E | Secure, observable, deployable product shell |
| Read-only MVP | 2A–4B | Useful multi-venue analytics without credentials |
| Production analytics | 5–7 | Reliable decisions and bounded AI explanations |
| Paper trading | 8 | Realistic execution simulation with evidence |
| Manual live trading | 9–10 | Tightly scoped, user-confirmed paired execution |
| Semi-automatic trading | 11 | Revocable, limited delegated execution |
| Fully automatic trading | 12 | Hardened autonomous operation inside risk limits |
| Commercial scale | 13 | Entitlements and evidence-driven scaling |

## 3. Phases

### Phase 0 — Official API discovery and product decisions

Deliverables:

- official-document source register with access date and API version;
- verified exchange capability matrix;
- per-exchange market-data semantics, symbol model, funding model, timestamps,
  limits, testnet status, and deprecation notices;
- separate later audit for private/order APIs before trading work;
- initial ADR set and threat model;
- resolved Phase 1 blocking decisions.

Acceptance gate:

- every capability is `VERIFIED`, `UNSUPPORTED`, or `UNKNOWN`;
- no `UNKNOWN` capability is assumed by an approved implementation phase;
- volatile facts have a revalidation owner and cadence.

### Phase 1A — Repository and quality foundation

Deliverables:

- minimal monorepo layout for web, control API, shared contracts, fixtures, docs,
  and infrastructure used now;
- pinned toolchains and dependency lock files;
- formatting, linting, type checking, unit-test, migration-validation, dependency,
  secret-scan, and build jobs;
- contribution, ADR, code ownership, and local-development conventions;
- no business feature beyond health/build proof.

Acceptance gate:

- clean checkout follows one documented local workflow;
- CI reproduces all checks and rejects a seeded failure;
- no trading, exchange, or financial module is implemented.

### Phase 1B — Control API and persistence skeleton

Deliverables:

- modular control API;
- PostgreSQL migrations for users, credential-free security metadata, sessions,
  and audit events;
- health/readiness endpoints and redacted telemetry;
- typed error envelope and API versioning skeleton;
- test database and migration rollback/forward strategy.

Acceptance gate:

- migrations apply from empty and upgrade from the previous schema;
- authorization defaults deny;
- logs and traces pass secret/redaction tests.

### Phase 1C — Identity and session lifecycle

Deliverables:

- registration, hashed email verification tokens, login, logout, session listing
  and revocation, password recovery, and password-change session invalidation;
- Argon2id policy, secure cookies, CSRF defense, throttling, and enumeration-safe
  responses;
- notification provider interface with local/test implementation;
- security audit events and abuse tests.

Acceptance gate:

- all positive and abuse-path integration tests pass;
- no verification/recovery token is stored or logged in plaintext;
- production activation waits for a real email provider and operational policy.

### Phase 1D — Web shell and account security UI

Deliverables:

- responsive application shell and design tokens;
- authentication, verification, recovery, profile, sessions, and security pages;
- loading/error/empty states, keyboard navigation, reduced motion, and baseline
  accessibility;
- generated typed client from the approved contract.

Acceptance gate:

- critical auth journeys pass browser tests at desktop and mobile breakpoints;
- accessibility and performance budgets pass;
- UI presents no trading controls.

### Phase 1E — Foundation hardening and release evidence

Deliverables:

- environment/configuration model;
- baseline dashboards, alerts, backup/restore rehearsal, dependency and security
  scans;
- deployment and rollback runbook for a non-production environment;
- Phase 1 evidence report.

Acceptance gate:

- the complete Phase 1 acceptance set in `ACCEPTANCE_CRITERIA.md` passes;
- architecture/security review has no unresolved critical finding;
- product owner approves Phase 2 discovery-selected venues.

### Phase 2A.1 — Canonical market-data foundation

Deliverables:

- versioned canonical public market-data contracts;
- exact-decimal domain primitives and opaque instrument identity;
- explicit capability, provenance, quality, and freshness contracts;
- deterministic replacement, snapshot-plus-delta, sequence-chain, and
  no-trusted-book state machines;
- mock-only adapter harness and official-semantics fixtures;
- observability contracts without monitoring infrastructure.

Acceptance gate:

- malformed or excessive financial decimals fail without rounding;
- USDT and USDC instruments cannot compare equal;
- gaps suppress executable output until explicit snapshot recovery;
- deterministic replay, precision, duplicate, restart, crossed-book, stale, and
  VWAP properties pass;
- no network client or real exchange adapter exists.

### Phase 2A.2 — OKX Exchange V5 public adapter

Scope: OKX Exchange V5 Swap/Futures public, unauthenticated data only. This is a
separate approval and implementation task.

Deliverables:

- a network boundary isolated behind the Phase 2A.1 public adapter ports;
- documented instrument, funding, ticker/mark/index, snapshot, and WebSocket
  book mappings only where current official OKX evidence supports them;
- rate-limit, server-time, reconnect, resubscribe, sequence-chain, and explicit
  replacement recovery behavior;
- recorded integration fixtures, contract tests, fault injection, and a
  credential-free canary mode;
- capability declarations linked to current official source IDs.

Acceptance gate:

- no credentials, private calls, order methods, or non-OKX product groups;
- JSON `seqId`/`prevSeqId` gaps immediately make output stale;
- checksum is not invented after the documented JSON checksum removal;
- unsupported, unverified, and research-required fields remain explicit;
- sustained replay and bounded public test runs show deterministic recovery and
  no undetected crossed healthy book.

### Phase 2B — Remaining pilot public market-data adapters

Scope: Binance USDⓈ-M Futures and Bybit V5 `linear`, each as a separate small
approved increment. Bitget UTA V3 remains reserve-only.

Deliverables:

- instruments, funding where verified, prices, mark/index where verified, and
  local order books;
- snapshot/delta sequencing, reconnect, rate-limit manager, time sync, and health;
- recorded fixtures from public endpoints only;
- canary contract monitor with no production money or credentials.

Acceptance gate:

- sustained replay and soak tests show no undetected book divergence;
- gaps immediately suppress dependent output;
- adapter capability claims link to official sources.

### Phase 2C — Normalized live data gateway

Deliverables:

- normalized event schemas;
- bounded snapshot/delta live protocol;
- subscription authorization, backpressure, batching, compression evaluation, and
  data-freshness propagation;
- server-side metrics and client reconnect behavior.

Acceptance gate:

- slow clients cannot exhaust service resources;
- stale/degraded state survives end-to-end to the UI contract;
- p95/p99 measurements use an approved workload definition.

### Phase 3A — Funding Matrix MVP

Deliverables:

- two-venue selector, shared-instrument table, funding and interval presentation,
  countdown, quote marker, prices, normalized differential, direction, favorites,
  sorting, virtualization, and freshness;
- mobile card layout and accessible non-color status indicators.

Acceptance gate:

- funding normalization uses instrument metadata, not hardcoded eight-hour
  assumptions;
- sorting and live updates remain correct under replay load;
- incomplete data is excluded or visibly non-actionable.

### Phase 3B — Arbitrage Scanner MVP

Deliverables:

- approved subset of filters and columns;
- mid and executable spread at a requested size;
- depth/VWAP, verified fees, estimated cost breakdown, and explicit unknown values;
- favorites and calculator handoff contract.

Acceptance gate:

- financial/property tests pass;
- “expected net” is never shown when a required cost is unknown;
- no result is described as guaranteed profit or executable without current depth.

### Phase 4A — Historical data and opportunity detail

Deliverables:

- retention/downsampling policy and time-series storage;
- spread, deviations, funding markers, depth/slippage, source quality, and
  opportunity detail;
- historical query limits, export policy, and chart performance.

Acceptance gate:

- chart provenance and gaps are visible;
- retention, restore, and query-load tests pass;
- historical and live instrument metadata versions are reconcilable.

### Phase 4B — Exact spread calculator

Deliverables:

- two-leg entry/exit calculations, fees, funding events, slippage, hedge ratio,
  residual delta, break-even, ROE, and liquidation-buffer inputs;
- quick-add with immutable input timestamp/provenance;
- export with calculation version.

Acceptance gate:

- exact-decimal and property-based tests cover multiplier, inverse, rounding,
  USDT/USDC separation, zero division, and increasing-size slippage;
- unsupported borrow, fee, or liquidation inputs are visibly unknown.

### Phase 5 — Production analytics hardening

Deliverables:

- fourth venue and further venues one at a time;
- contract-drift monitoring, on-call runbooks, SLOs, load/soak/chaos tests;
- data-quality score, venue maintenance states, reconciliation of REST and stream;
- measured decision on Redis, event bus, and ClickHouse.

Acceptance gate:

- defined SLO observation window passes;
- schema drift and degraded sources fail safely;
- capacity evidence supports the next-stage workload.

### Phase 6 — Deterministic Strategy Engine

Deliverables:

- funding and convergence strategies with `NO_TRADE`;
- traceable score components, cost/risk reserves, expiry, safe-size estimate, and
  versioned decision records;
- walk-forward/purged validation and order-book/latency/partial-fill simulations;
- read-only strategy APIs.

Acceptance gate:

- out-of-sample validation meets predeclared thresholds;
- decisions reproduce from versioned inputs/configuration;
- strategy cannot call execution and refuses stale or incomplete inputs.

### Phase 7 — Read-only AI assistant

Deliverables:

- redacted fact tools, schema-validated response, provenance, and page context;
- enforced state constraints including `DATA_UNRELIABLE`;
- prompt-injection, hallucination, data-leakage, availability, and cost tests.

Acceptance gate:

- AI cannot access secrets, orders, or mutable risk settings;
- attempts to upgrade `NO_TRADE` are rejected;
- product works normally when the AI provider is unavailable.

### Phase 8 — Paper trading

Deliverables:

- deterministic simulator for book fills, latency, partial fills, fees, funding,
  liquidation, rejects, outages, and uncertain order status;
- paper position/order state machines, history, reconciliation, risk limits, kill
  switches, and expected-versus-actual reports;
- scenario library and long-running simulation.

Acceptance gate:

- no network route or credential can place a real order;
- required fault scenarios and restart recovery pass;
- a predeclared volume and duration of paper evidence meets error, imbalance, and
  intervention thresholds.

### Phase 9 — Execution security and testnet readiness

Deliverables:

- KMS/HSM design, envelope-encrypted credential vault, permission validation,
  reauthentication, 2FA/passkey gates, network isolation, and audit;
- deterministic Risk Engine authorization;
- private-adapter contract research for one venue at a time;
- testnet-only order coordinator and reconciliation where an official testnet
  exists.

Acceptance gate:

- security review and credential lifecycle tests pass;
- timeout/5xx/unknown-state paths reconcile before any retry;
- live-trading feature flag is absent or forced off in all deployed environments.

### Phase 10 — Manual live paired execution

Prerequisites: explicit legal/product approval, external security assessment,
Phase 8 evidence, Phase 9 gate, incident staffing, and approved venues.

Deliverables:

- minimal 1–2 venue scope;
- preview plus explicit reauthentication and confirmation for every entry, exit,
  cancel, emergency action, and material amendment;
- paired slices, aggressive limit/IOC only where verified, reconciliation,
  emergency hedge, kill switches, and operator runbooks;
- tightly capped beta and immutable audit.

Acceptance gate:

- live remains off by default and can be globally disabled;
- no blind retry is possible by construction;
- controlled beta meets predeclared safety and reconciliation thresholds.

### Phase 11 — Semi-automatic trading

Deliverables:

- precise delegated-action policy, expiry, capital/venue/token/strategy/time
  bounds, and revocation;
- automatic actions only inside a short-lived approved session;
- notification and operator intervention paths;
- continuous risk evaluation and safe degradation.

Acceptance gate:

- authority cannot exceed the signed policy;
- revocation and every kill-switch scope take effect within an approved bound;
- soak, chaos, incident-drill, and financial-control reviews pass.

### Phase 12 — Fully automatic trading

Deliverables:

- persistent but revocable deterministic strategy authority;
- hardened high-availability risk/reconciliation/execution;
- maintenance scheduling, disaster recovery, anomaly detection, and controlled
  rollout;
- independent security, risk-model, and operational approvals.

Acceptance gate:

- long-duration paper and limited-live evidence meets predeclared thresholds;
- penetration test and incident exercises close all critical/high findings;
- product owner issues explicit separate approval to enable any account.

### Phase 13 — Billing and evidence-driven scale

Deliverables:

- provider abstraction, idempotent webhooks, payment states, entitlements, and
  support/admin workflows;
- usage limits that never interfere with risk, exits, or reconciliation;
- scale changes such as ClickHouse, event streaming, Kubernetes, or multi-region
  reads only when supported by measurements.

Acceptance gate:

- payment and entitlement consistency tests pass;
- loss of billing services cannot block safety-critical position handling;
- cost, capacity, backup, and rollback objectives are met.

## 4. Initially mocked modules

| Module | Mock until | Reason |
|---|---|---|
| Email delivery | Phase 1 production hardening | Deterministic auth tests and no provider commitment |
| Exchange public APIs | Each adapter passes Phase 0/2 contract audit | Avoid invented or drifting contracts |
| Live gateway feed | Phase 2C | UI can develop against versioned fixtures |
| Time-series store | Phase 4A | Avoid infrastructure before historical requirements |
| Fee/borrow schedules | Officially verified per venue/product | Unknown costs must remain unknown |
| Strategy output | Phase 6 | UI needs stable fixtures before real scoring |
| AI provider | Phase 7 | Deterministic product must not depend on AI |
| Paper execution port | Phase 8 implementation | Earlier UI uses non-executable fixtures |
| Credential vault/KMS | Phase 9 | No exchange secrets before trading readiness |
| Private exchange adapters | Phase 9 per venue | Requires separate official private-API audit |
| Billing provider | Phase 13 | Entitlements are not MVP-critical |
| DEX signer/wallet | Dedicated later approval | Custody and transaction policy unresolved |

Mocks must use production-shaped contracts, deterministic clocks/IDs, fault
injection, and clearly synthetic data. They must never silently activate in a
production trading environment.

## 5. Critical dependencies

```text
Official API audit -> Public adapter -> Read-only analytics
Read-only analytics -> Strategy validation -> AI explanations
Strategy + risk design -> Paper simulator -> Execution readiness
Paper evidence + security audit -> Manual live
Manual evidence -> Semi-auto -> Full auto
```

No commercial or schedule pressure may invert these dependencies.
