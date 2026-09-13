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

The Phase 1A–13 labels in this section are retained as historical planning
evidence. Where they conflict with `ROADMAP.md`, they authorize no current work.
The current Phase 2B criteria are in section 5.

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

### Legacy Phase 2B — Public market-data pilot

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

## 5. Current-roadmap Phase 2B — Spread Analytics Core

Phase 2B is decomposed and governed by
[`PHASE_2B_SPREAD_ANALYTICS_PLAN.md`](PHASE_2B_SPREAD_ANALYTICS_PLAN.md). Every
subphase must satisfy the global criteria, remain within ADR 0009, receive
separate implementation approval, pass independent formal acceptance, and be
frozen before its dependent subphase begins.

### Phase 2B.1 — Canonical Instrument Matching Foundation

Accepted when:

- every result is a versioned `MATCHED`, `NOT_MATCHED`, `AMBIGUOUS`,
  `QUARANTINED`, or `UNAVAILABLE` outcome with finite reason codes;
- canonical venue, product group, official instrument ID, base, quote,
  settlement, market/contract type, expiry, multiplier and unit inputs remain
  explicit;
- ticker text alone never creates identity and USDT/USDC never merge;
- manual mapping provenance, effective time, immutable version, independent
  proposer/reviewer, correction, and conflict quarantine are enforced;
- unknown/inactive/incompatible metadata fails closed;
- deterministic fixtures, unit/property/replay/fault/hostile-input/resource
  tests pass and D-055 is approved;
- frozen adapter-package diffs are empty.

### Phase 2B.2 — Executable Spread Mathematics

Accepted when:

- D-056 through D-058 approve requested units, conversion, formulas, rounding,
  fees, slippage and expected-result semantics;
- long entry buys asks, short entry sells bids, long exit sells bids, and short
  exit buys asks according to independently reviewed exact vectors;
- midpoint, entry spread, exit spread, VWAP, filled/residual exposure, fees and
  slippage are separately named, exact, unit-labelled and versioned;
- insufficient or partial depth is non-actionable and never presented as a
  full-size quote;
- stale, gapped, invalid, locked, crossed, incompatible or excessive inputs
  fail closed;
- unknown required cost makes expected net unavailable;
- monotonic-VWAP property, replay, fault, overflow, scale, rounding, skew,
  resource-bound and finite-cardinality tests pass.

Across 2B.1 and 2B.2, executable market input, valid analytics, displayable
analytics, comparable analytics, and actionable analytics pass distinct typed
gates. `PARTIAL_DEPTH`, `AMBIGUOUS`, `INVALID`, `LOCKED`, `CROSSED`, `STALE`,
`GAPPED`, `RECONNECTING`, `DISABLED`, `UNSUPPORTED`, `UNVERIFIED`, and
`RESEARCH_REQUIRED`, plus `DEGRADED`, cannot be actionable.

### Phase 2B.3 — Funding Differential

Accepted when:

- D-059 approves semantic compatibility, direction, basis notional, settlement
  alignment, scale and rounding;
- venue-native rate, semantic, interval, next settlement, source and quality
  are preserved independently;
- `CURRENT`, `LAST`, `PREDICTED`, historical, unknown and not-applicable are
  distinguishable and never silently relabelled;
- normalized eight-hour comparison is separately named/versioned, has no
  universal interval assumption, and is unavailable without a known interval;
- delivery futures expose no fake funding and semantic/timing/currency mismatch
  cannot produce expected cash flow;
- exact sign, zero/unknown, interval, alignment, replay, property, fault and
  resource-bound tests pass.

### Phase 2B.4 — Opportunity Lifecycle

Accepted when:

- D-060 approves the complete state/event table, thresholds, durations, keys,
  expiry, requalification and policy-migration rules;
- `DISCOVERED`, `QUALIFYING`, `ACTIVE`, `CONVERGING`, `DEGRADED`,
  `SUPPRESSED`, `EXPIRED`, and `RESOLVED` transitions are deterministic;
- duplicates are idempotent and out-of-order/forbidden transitions fail closed;
- actionability requires fresh supported inputs, valid mapping, complete depth,
  known required costs and every policy-mandatory gate;
- degradation revokes actionability and recovery re-enters qualification;
- the structural transition table covers terminal states, suppression,
  duplicate/out-of-order events, policy changes and every unlisted transition
  rejects without mutation;
- full transition, timer-boundary, replay, restart and fault tests pass.

### Phase 2B.5 — Deterministic Anomaly Detection

Accepted when:

- D-061 approves a bounded, versioned rule/window/threshold/severity catalogue;
- every anomaly has reproducible evidence and exact threshold evaluation;
- market anomalies remain separate from stale/invalid/source-quality anomalies;
- no ML, AI, future leakage, opaque adaptive threshold or action authority is
  introduced;
- insufficient/bad inputs cannot create an actionable market signal;
- boundary, window, ordering, replay, property, fault, load and cardinality
  tests pass.

### Phase 2B.6 — Spread History Contracts

Accepted when:

- D-021 and D-062 approve record, gap, ordering, correction, downsampling,
  export, schema-evolution and reproducibility meaning;
- records are immutable, exact-decimal, versioned, provenance-bearing,
  quality-aware and explicitly gap-preserving;
- downsampling retains coverage/quality and never silently fills gaps;
- live and replay outputs agree for identical input/formula/mapping versions;
- bounded export and exact round-trip tests pass using in-memory fixtures only;
- no database, migration, event bus, retention job or other persistence
  implementation is introduced.

### Phase 2B.7 — Deterministic Ranking

Accepted when:

- D-063/D-064 approve eligibility, required inputs/costs, ranking components or
  tuple, normalization, tie-breaks, completeness, copy, and load bounds;
- eligibility is evaluated before ranking and every exclusion has a finite
  reason;
- stale, gapped, invalid, incomplete-depth, ambiguous-mapping,
  unsupported/unverified/research-required, or unknown-required-cost candidates
  cannot rank as actionable;
- all component, formula, input and policy versions reconstruct the exact
  ordering;
- ordering is permutation-independent with total deterministic tie-breaks;
- no guaranteed-profit, probabilistic confidence, AI, personalization,
  position, risk, or execution authority is introduced;
- replay, property, tie, extreme-decimal, adversarial-size, cancellation and
  finite-cardinality tests pass.

Across all subphases, full formula, rule, policy, mapping and input versions are
bounded structured-event fields rather than metric labels. Metrics use only
allowlisted finite families/buckets, and provenance count/bytes are bounded.

### Phase 2B aggregate freeze

Accepted when all seven subphases are independently frozen, authoritative
repository checks pass, frozen adapter packages remain unchanged, and the
result authorizes read-only analytical contracts only. Persistence, public UI,
notifications, positions, authenticated data, paper/live trading, Risk Engine,
Execution Engine, AI and billing remain unapproved.

## 6. Release evidence template

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

## 7. Future Design, Identity/Admin, and Commerce track gates

These gates are architecture acceptance targets only. Every implementation item
needs a separate approval, scoped plan, evidence report and formal freeze.

### Design track

| Track | Accepted when                                                                                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1    | frozen canonical tokens cover both independently designed themes; required semantic, scale, status/chart, contrast, governance, migration and rollback evidence has formally passed           |
| D2    | selected D2.1–D2.5 primitives pass versioned API/state, keyboard/focus, screen-reader, forced-colour, localization, security/resource, migration and rollback gates                           |
| D3    | public and authenticated route/status/dependency/entitlement matrices are implemented; deep links enforce backend authorization and planned routes fail closed                                |
| D4    | `SYSTEM`/`DARK`/`LIGHT` precedence, authenticated/device persistence and CSP-safe no-flash boot pass first-paint, corrupt-storage, hydration, cross-tab and system-change tests               |
| D5    | exact financial strings, units, provenance, USDT/USDC, stale/gapped/unknown/research-required and missing chart ranges remain explicit across responsive density modes                        |
| D6    | billing and `/admin` use shared tokens but separate shells/authority; redirect cannot activate access and privileged actions present reason, scope, version, step-up/approval and audit state |

#### D1 — Brand and Semantic Design Tokens detailed gate

D1 implementation and formal independent acceptance were completed under
`D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md` and
`D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md`. D-079 through D-088 are exact
and approved, ADR-0013 is `Accepted`, and
`D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE.md` freezes the foundation.

D1 freezes only when:

- one canonical source and versioned schema reject duplicates, unknown/circular
  aliases, invalid values, incomplete themes and exceeded resource bounds;
- DARK and LIGHT contain the same semantic contract; SYSTEM remains selection
  policy, and generation plus the committed artifacts/manifest reproduce
  byte-for-byte under the approved pinned toolchain;
- typography, scale, financial/status/quality/capability and chart contracts are
  complete, retain theme-independent meaning and require non-colour cues;
- every allowed contrast pairing passes the approved matrix, with documented
  exceptions only, and arbitrary unvalidated pairings fail;
- raw-value scanning and exact expiring exceptions are enforced; semantic
  compatibility and deprecation tests pass;
- the Phase 1 bridge changes token foundations only, documents migration and
  atomic rollback, installs no font/dependency and makes no page/component
  redesign;
- frozen adapters, accepted Phase 2B documents and brand references are
  unchanged; documentation links, formatting, lint, type checking, default
  tests and the D1 authoritative suite pass;
- formal review reports zero BLOCKER and zero unresolved HIGH findings and no
  scope outside D1.

Passing D1 does not authorize D2, D4, component/chart work, identity, commerce,
admin runtime or Phase 2B implementation.

#### D2 — Foundational Component Library detailed gate

D2 planning and later review are governed by
[`D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN.md`](D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN.md)
and
[`D2_FOUNDATIONAL_COMPONENT_LIBRARY_ACCEPTANCE_PLAN.md`](D2_FOUNDATIONAL_COMPONENT_LIBRARY_ACCEPTANCE_PLAN.md).
Planning acceptance, product decisions, implementation, checkpoint acceptance,
and aggregate acceptance are separate tasks.

Exact product decisions are recorded in
[`D2_COMPONENT_DECISIONS.md`](D2_COMPONENT_DECISIONS.md). They are normative
author-produced inputs until a separate formal decision-acceptance report
independently verifies their consistency, accessibility, security,
determinism, and D1/frozen-boundary compatibility. D2.1 cannot begin before that
review and separate implementation authorization.

Every D2 component is accepted only when:

- its purpose, semantic element/role, public versioned API, variants, sizes,
  finite state matrix, precedence, composition, controlled/uncontrolled policy,
  limits, and invalid-combination behavior are exact;
- accessible names, labels/descriptions/errors, keyboard, focus-visible/return,
  pointer/touch, disabled/read-only/invalid/loading/selection semantics, hit
  areas, screen-reader behavior, zoom/reflow, and long-content evidence pass;
- DARK/LIGHT, inherited SYSTEM boundary, forced colours, reduced motion,
  localization/RTL, and non-colour status evidence pass to D-092/D-098;
- styles consume frozen D1 semantic tokens, raw-value scan passes, and no public
  raw colour/spacing/radius/shadow/layer API exists;
- hostile text/HTML/URL/icon/style input, resource bounds, mount/unmount,
  cleanup, deterministic evidence, and compatibility tests pass;
- its implementation/report contains no unapproved dependency, page, shell,
  route, business logic, financial formatter, or later-phase behavior.

Checkpoint-specific gates:

- **D2.1 core:** action/link semantics, names, status redundancy, intrinsic
  composition, themes, hit areas, and hostile content pass; required
  D-089–D-099/D-101 decisions are formally accepted as applicable.
- **D2.2 forms:** D2.1 is frozen; native labels/errors, autofill,
  controlled/uncontrolled, keyboard, selection groups, read-only/disabled/
  invalid states, and browser behavior pass; no auth/validation logic exists.
- **D2.3 overlays:** dependencies and D-093/D-094 are approved; focus
  containment/return, Escape/outside, inertness, portal, nesting, collision,
  scroll lock, hydration, touch, cleanup, and browser/AT evidence pass.
- **D2.4 data/feedback:** ProgressIndicator, Skeleton, EmptyState, semantic
  table/sort intent/pagination, exact-value access, zero/unknown, quality,
  overflow, density, and screen-reader evidence pass; no formatting, ranking,
  fetching, virtualization, or D5 logic exists.
- **D2.5 evidence/adoption:** selected earlier checkpoints are frozen; aggregate
  deterministic/browser/AT evidence and only named migrations pass; route, DOM,
  copy, navigation, responsive structure, and business behavior remain intact.

Each checkpoint and aggregate D2 freeze requires BLOCKER = 0, unresolved HIGH =
0, authoritative pinned Node/browser evidence, documented migration and atomic
rollback, and unchanged D1, frozen Phase 2A, accepted Phase 2B,
Product/Commerce/Admin, brand, dependency/lockfile, and infrastructure
boundaries except an exact separately approved allowlist. Passing one checkpoint
does not authorize the next or any D3–D6 work.

### Identity and administration track

| Track | Accepted when                                                                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1    | approved account identity/ownership/recovery policy passes tenant, identity-conflict and recovery review; no commerce authority is implied                              |
| I2    | verification and session policy passes abuse, enumeration, expiry, revocation, inventory and strong-auth tests                                                          |
| I3    | independent permissions and expiring assignments replace `isAdmin`; deny-default, separation-of-duty, stale assignment and environment tests pass                       |
| I4    | D-075/D-076 are approved; `/admin` route/session, step-up, reason, idempotency, version, approval, redacted append-only audit, break-glass and self-approval tests pass |

### Commerce track

| Track | Accepted when                                                                                                                                                                                                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1    | D-065/D-073/D-077 are approved as applicable; immutable catalog and grant contracts plus pure entitlement evaluator pass overlap, precedence, expiry, revocation, cache, usage concurrency, conflict and replay tests; no plan-name authorization exists                                                         |
| C2    | D-070/D-071 are approved; every subscription state/transition, trial/grace/upgrade/downgrade/cancel/restore/review path is deterministic, idempotent and reconciled; safety operations remain independent                                                                                                        |
| C3    | provider-neutral fiat ports, bounded ingress contracts, exact invoice values and synthetic verifier/reconciliation fixtures pass signature/replay, duplicate/reorder/missing, timeout/unknown, outage and redirect non-authority tests; no concrete provider, tax calculation or regional checkout is introduced |
| C4    | D-072/D-074 are approved as applicable; exact benefits, eligibility, one-code/stacking policy, atomic TTL reservation, races, brute force, multi-account abuse, secret redaction, refund interaction and replay pass                                                                                             |
| C5    | typed asset/network route contracts, policy-injected invoices, finality/reorg/expiry/exception states and mock custody boundary pass exact, duplicate, partial/over/under/late/wrong-route and deterministic reconciliation tests; no concrete processor, production route or key material is introduced         |
| C6    | self-service views/commands separate plan, subscription, payment, grace, promotion and effective access; provider-safe flows, stale frontend, ownership, redirect non-authority and accessibility tests pass                                                                                                     |
| C7    | I4 and relevant C commands are frozen; every admin operation passes exact permission, step-up/approval, idempotency, version, bulk preview, currency separation, unknown outcome and append-only audit tests                                                                                                     |
| C8    | approved refund/chargeback/approval/retention policies pass bounded reconciliation, dead-letter recovery, reporting, dual-control threshold, exact currency, audit integrity/export, backup/restore and disaster exercises                                                                                       |

### Aggregate architecture invariants

- Plans are bundles; effective entitlements authorize access.
- Frontends, redirects and provider adapters cannot grant access directly.
- Historical PlanVersion, Price, invoice, grant, payment and audit facts are not
  silently overwritten.
- All monetary, crypto and percentage values are exact decimals with explicit
  currency/unit and named rounding only at approved boundaries.
- USDT, USDC and same-ticker cross-network assets remain distinct.
- Unknown provider/payment/finality outcomes remain unknown or in review until
  reconciliation; no blind financial retry exists.
- Crypto keys/custody are outside the main application.
- `/admin` is a separate deny-default permission boundary with stronger session
  and append-only audit; visibility is not authority.
- Money is not aggregated across currencies without explicit versioned
  conversion provenance.
- Commerce/admin outage cannot block emergency risk, safe position handling or
  reconciliation.
- No D/I/C gate authorizes Phase 2B implementation, persistence, frontend,
  payment, identity or admin code by itself.
