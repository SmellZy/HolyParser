# Acceptance Criteria

## 1. Global Definition of Done

Every implemented increment must satisfy all applicable criteria:

- scope and non-goals are documented and the phase is explicitly approved;
- typed versioned contract exists before provider/consumer implementation;
- financial code uses exact decimal/fixed-point values and explicit units;
- unit, integration, negative/fault, and applicable property/browser tests pass;
- exchange functionality links to current official documentation and recorded
  fixtures;
- error, loading, empty, stale, degraded, and recovery states are handled;
- metrics, redacted logs, traces, alerts, and an owner exist;
- security, accessibility, performance, and compatibility checks pass;
- database changes are migrations tested from empty and upgrade paths;
- critical actions and state transitions create safe audit events;
- documentation, migration, rollout, rollback, and runbook changes are complete;
- no secrets appear in code, logs, fixtures, traces, errors, metrics, or frontend;
- no unresolved critical/high defect exists unless the governing phase explicitly
  defines a stricter review process; live financial phases do not waive critical
  findings;
- changed files, executed checks, unresolved issues, and next recommended task are
  reported;
- work on the next phase does not begin without approval.

## 2. Cross-cutting financial criteria

Before any financial calculation is user-visible:

- no `float`/`double`/`f32`/`f64` occurs in the financial domain path;
- JSON financial fields are decimal strings;
- scale, rounding, tick, step, multiplier, inverse, settlement, and quote units are
  explicit;
- USDT and USDC remain separate;
- missing required costs make the result unknown/non-actionable;
- source timestamps, metadata version, formula version, quality, and expiry are
  included;
- tests cover zero division, negative/impossible inputs, extreme precision,
  multiplier/inverse contracts, funding interval conversion, and size rounding;
- VWAP/slippage monotonicity and hedge/PnL invariants pass property tests.

## 3. Cross-cutting exchange criteria

Before enabling any adapter capability:

- capability is `VERIFIED` for the exact venue, product, environment, and API
  version with a current official source;
- symbols, units, timestamps, sequences, rate limits, errors, maintenance, and
  deprecation behavior are documented;
- unit, schema, fixture, replay, reconnect, rate-limit, time-sync, precision,
  malformed-data, and schema-drift tests pass;
- duplicate, missing, out-of-order, future/stale timestamp, zero/negative value,
  403/418/429/5xx, maintenance, delisting, and reconnect scenarios are covered as
  applicable;
- canary and revalidation ownership exist;
- unsupported/unknown capabilities fail closed and are hidden from dependent UI.

Private capabilities additionally require authentication, permission, unknown
order, partial fill, restart, and reconciliation tests.

## 4. Phase gates

### Phase 0 — Official API discovery and decisions

Accepted when:

- every candidate venue has a completed research record;
- each planned Phase 2 capability is `VERIFIED` or removed from scope;
- current official URLs, versions, access/revalidation dates, terms, environments,
  limits, sequences, funding semantics, and deprecations are recorded;
- Binance Alpha, Variational, OKX DEX, KuCoin, Aster, Lighter, Hyperliquid,
  Bitunix, and BloFin targeted research is resolved for their proposed scope;
- pilot venues are selected using documented evidence;
- Phase 1 decisions needed for the approved increment are resolved;
- architecture/threat ADR backlog has owners.

### Phase 1A — Repository and quality foundation

Accepted when:

- a clean checkout can run the documented setup and all checks;
- required toolchains and dependencies are pinned and lock files committed;
- formatting, linting, compile/type checking, unit test, build, migration
  validation, dependency scan, and secret scan execute in CI;
- seeded test branches/fixtures demonstrate that each mandatory CI gate fails when
  its condition is violated;
- ADR/contribution/ownership/local-development conventions exist;
- no exchange, market-data, financial, credential, AI, paper, or trading code is
  introduced.

### Phase 1B — Control API and persistence skeleton

Accepted when:

- modular boundaries and dependency rules are tested/documented;
- PostgreSQL migrations apply to an empty database and upgrade from the previous
  schema;
- health/readiness distinguishes process health from dependency readiness;
- stable error envelopes, correlation, logs, metrics, and traces work;
- logs/errors/telemetry pass redaction tests;
- configuration validation fails safely;
- authorization is deny-by-default and cross-user integration tests pass.

### Phase 1C — Identity and sessions

Accepted when:

- registration, verification, login/logout, recovery/change, session rotation,
  listing, revocation, and revoke-all pass end-to-end integration tests;
- Argon2id policy is benchmarked/documented;
- challenges are hashed, purpose-bound, expiring, single-use, attempt-limited, and
  resend-limited;
- cookies, CSRF, idle/absolute expiry, rotation, and password-reset invalidation
  are tested;
- enumeration, brute force, replay, race, cross-user, malformed input, clock
  boundary, provider outage, and abuse-limit tests pass;
- security audit events contain no secrets;
- the email adapter is deterministic in tests and production sending cannot be
  accidentally enabled without configuration.

### Phase 1D — Web shell and security UI

Accepted when:

- approved auth/security journeys pass browser tests;
- generated client matches the approved API contract;
- desktop, tablet, and mobile layouts are usable;
- keyboard, focus, labels, contrast, error association, reduced motion, and
  baseline automated accessibility checks pass;
- CSP/secure-header and browser storage tests pass;
- agreed bundle/LCP/long-task budgets pass under the defined profile;
- no trading or exchange-credential control is present.

### Phase 1E — Foundation hardening

Accepted when:

- non-production deployment and rollback are rehearsed;
- backup restore to the approved recovery point is demonstrated;
- dashboards and alerts cover auth, database, notification, and error indicators;
- dependency, secret, SAST, DAST, and configuration reviews have no blocking
  finding;
- runbooks and incident contacts are tested in a tabletop;
- complete Phase 1 evidence confirms no exchange secret storage or trading path;
- Phase 2A is separately approved.

### Phase 2A — Instruments and adapter harness

Accepted when:

- common public adapter/capability contract is versioned;
- canonical instrument/mapping workflow blocks unknown/conflicting identities;
- tests cover XBT/BTC alias, `1000`/`k` multiplier, spot/perpetual separation,
  inverse/linear, settlement, premarket/delisting, chain/address collision, and
  USDT/USDC;
- manual mapping is four-eyes approved and audited;
- fixture/replay/fault harness is deterministic;
- all real exchange ports remain mocked until capability verification.

### Phase 2B — Public market-data pilot

Accepted when:

- three approved adapters pass all cross-cutting exchange criteria;
- books reconstruct correctly from snapshot/delta fixtures and long replay;
- any gap/out-of-order/checksum failure immediately suppresses actionable output
  and resynchronizes;
- source/receive/processing times and health are measured;
- rate-limit and reconnect storms remain bounded;
- sustained soak has no undetected divergence;
- canary uses public data and no production money/credentials.

### Phase 2C — Live gateway

Accepted when:

- protocol version, auth, subscriptions, snapshot generation, monotonic revision,
  heartbeat, resync, errors, and quality events pass contract tests;
- slow-client/backpressure tests prove bounded memory;
- batching/coalescing does not break calculation semantics;
- stale/degraded status reaches clients within an approved bound;
- measured latency/capacity meets the approved workload objective;
- reconnect/resubscribe cannot silently miss generations.

### Phase 3A — Funding Matrix MVP

Accepted when:

- verified shared instruments and native funding metadata render correctly;
- normalized horizon is derived from metadata and labeled separately;
- quote/settlement-based USDC marker is correct;
- sorting, favorites, countdown, virtualization, live cell update, sticky header,
  keyboard use, non-color state, and mobile cards pass tests;
- stale/missing/unknown data is visibly non-actionable;
- no hardcoded symbol mapping or funding interval exists.

### Phase 3B — Scanner MVP

Accepted when:

- approved filters/columns and bounded queries work;
- mid spread is explicitly distinguished from executable spread;
- exact depth/VWAP at requested size and verified cost components pass financial
  tests;
- insufficient liquidity and unknown costs suppress expected net/actionability;
- result expiry and source quality are visible;
- favorite and calculator handoff preserve canonical IDs, units, provenance, and
  timestamp.

### Phase 4A — Historical analytics

Accepted when:

- retention, downsampling, rights, metadata-version, and gap policy are approved;
- chart/query values reproduce from documented inputs and versions;
- source outages and missing intervals are visible, not interpolated silently;
- load/range limits, export, backup, and restore pass;
- charts meet accessibility and weak-device performance budgets.

### Phase 4B — Calculator

Accepted when:

- all requested two-leg calculations have exact definitions and units;
- property tests cover entry/exit, fees, funding, inverse/multiplier, residual
  delta, break-even, ROE, rounding, and monotonic slippage;
- liquidation, borrow, gas, and conversion are shown only with verified inputs or
  explicit manual assumptions;
- quick-add freezes provenance and does not mutate past scenarios with live data;
- exports contain input/calculation versions and currency separation.

### Phase 5 — Production analytics

Accepted when:

- additional venues are added one independently gated adapter at a time;
- SLOs and an observation window are approved and met;
- drift canary, maintenance/degradation, alerting, runbooks, load, soak, chaos,
  and capacity tests pass;
- on-call ownership and incident escalation exist;
- infrastructure additions have measured ADR evidence and restore/rollback plans.

### Phase 6 — Deterministic Strategy Engine

Accepted when:

- decision inputs/outputs, expiry, `NO_TRADE`, reasons, risks, and versions are
  contract tested;
- calculations reproduce from immutable inputs/config;
- purged/walk-forward/out-of-sample validation uses thresholds declared before
  final evaluation;
- fee, slippage, latency, partial fills, delisting, outages, funding reversal,
  quote depeg, and structural breaks are simulated;
- strategy cannot call execution or bypass quality/risk boundaries;
- stale/incomplete input yields `DATA_UNRELIABLE` or `NO_TRADE`.

### Phase 7 — AI assistant

Accepted when:

- only allowlisted read-only fact tools are exposed;
- secrets and direct/prompt-injected identifiers are redacted/bounded;
- every fact has valid provenance and output matches strict schema;
- deterministic post-validation blocks invented entities/numbers and stronger
  actions;
- stale input only permits `DATA_UNRELIABLE`;
- provider outage, timeout, malformed output, injection, leakage, and cost-limit
  tests pass;
- the rest of the product remains functional without AI.

### Phase 8 — Paper trading

Accepted when:

- there is no reachable real-order endpoint or real credential;
- simulator models latency, book consumption, partial fills, rejects, fees,
  funding, slippage, liquidation, outage, and unknown outcomes;
- order/position/risk/reconciliation/kill-switch state machines pass model-based,
  fault, concurrency, restart, and deterministic replay tests;
- one-leg fill and unknown-order scenarios never blind retry;
- paper/live environment separation is mechanically enforced and visible;
- evidence volume/duration and calibration thresholds declared in D-024 are met;
- paper history compares expected and simulated outcomes.

### Phase 9 — Execution security and testnet readiness

Accepted when:

- private capability research is complete for each scoped venue/environment;
- credential vault threat model, KMS/HSM envelope encryption, rotation, revocation,
  permission validation, reauthentication, MFA, audit, and recovery tests pass;
- Risk Engine issues short-lived parameter-bound decisions and fails closed;
- testnet execution/reconciliation passes all required timeout, 5xx, partial-fill,
  restart, external-order, mismatch, and rate-limit scenarios;
- security review has no blocking finding;
- all deployed live feature flags remain forced off.

### Phase 10 — Manual live paired execution

Accepted when:

- legal/product/security/operations approvals are documented;
- scope is limited to approved users, caps, venues, products, and regions;
- every material action requires preview, recent strong authentication, and
  explicit confirmation;
- paired slicing, officially verified order types, slippage bounds, durable state,
  reconciliation, emergency handling, and kill switches pass drills;
- blind retry is impossible;
- controlled beta meets predeclared unknown-order, unmatched-fill, residual-delta,
  loss, slippage, availability, and intervention thresholds;
- live remains off by default for every account and environment.

### Phase 11 — Semi-automatic trading

Accepted when:

- delegated authority is exact, signed/audited, time-bound, revocable, and limited
  by system/user/venue/symbol/strategy/capital/time policy;
- any changed condition invalidates authority as specified;
- Risk Engine continuously authorizes and can revoke;
- user, venue, strategy, symbol, and global kill switches meet activation bounds;
- notification failure does not increase authority;
- long soak, chaos, revocation, incident, and financial-control reviews pass.

### Phase 12 — Fully automatic trading

Accepted when:

- a separate explicit auto-mode approval exists;
- persistent delegated authority remains constrained and revocable;
- high-availability risk, reconciliation, execution, recovery, maintenance,
  anomaly, and disaster paths pass;
- independent security/pentest, risk-model, legal/product, and operational reviews
  close all blocking findings;
- long-duration paper and limited-live evidence meet thresholds declared before
  evaluation;
- staged rollout, rollback, per-account opt-in, and global disable are tested;
- AI remains outside execution.

### Phase 13 — Billing and scaling

Accepted when:

- checkout/invoice/payment/webhook/entitlement states are contract tested and
  idempotent;
- signature, replay, duplicate, reordering, under/overpayment, expiry, refund, and
  provider-outage cases pass;
- access is granted only after approved confirmation;
- downgrade/outage cannot block security, risk, reconciliation, emergency close,
  history, or credential revocation;
- each infrastructure expansion meets its measured adoption trigger, capacity,
  cost, backup, security, and rollback criteria.

## 5. Release evidence template

Every phase report contains:

```text
Approved scope:
Delivered requirements:
Explicit non-goals confirmed:
Changed files/migrations:
Contract versions:
Official exchange sources and access dates (if applicable):
Tests/checks and exact results:
Performance/accessibility evidence:
Security findings and disposition:
Metrics/alerts/runbooks:
Migration/rollout/rollback/restore evidence:
Known limitations and risk-register updates:
Live-trading flag/state:
Recommended next task:
Approval requested for:
```

Passing tests does not authorize the next phase or any live trading.
