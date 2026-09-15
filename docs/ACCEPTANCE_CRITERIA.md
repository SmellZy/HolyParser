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

D-055 decision acceptance precedes implementation approval. Independently
review [`its decision record`](PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION.md),
including actual Product/Quant/Market Data approval evidence and applicable
D-064 authority; documentation alone is not expert attestation. Later 2B.1
acceptance must reproduce all 29 documented cases and their finite reasons,
exact factor/unit compatibility, native-family veto, curated asset provenance,
two reviewers distinct from proposer, digest-bound/idempotent review,
closed effective intervals, `AS_KNOWN` versus `CORRECTED` history,
invalidation/supersession/rollback and all-or-nothing resource failure.
Unknown frozen economics must remain unavailable. Zero live approved matches
is acceptable under current evidence; a fixture must not fabricate an adapter
capability. No persistence, authentication, event delivery or later financial
formula may be introduced to satisfy these matching criteria.

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

## D-055 verification-readiness record — 2026-09-14

Historical outcome of the earlier incomplete attempt. Authority readiness is
superseded only by the subsequent completion record below; the original Git
failure and incomplete-review evidence remain preserved.

This is a verification-only record, **not formal acceptance, a decision
amendment, or an authority attestation**. D-055's decision document and D-064's
authoritative register remain unchanged. The authority-completion task is
**INCOMPLETE**: no completed independent Quant, Market Data or matching-only
SRE approval was obtained. No implementation is authorized.

### Healthy materialized baseline

The original checkout failed `git fsck --full --no-reflogs` with exit 128,
`fatal: mmap failed: Operation timed out`. A separate tracked-file read also
timed out on two Kotlin test files. Three initial status/diff/index reads
succeeded without reproducing SIGBUS; those successes do not establish
repository health. No stale Git process or `index.lock` was found at the
initial inspection. No Git objects, index or user changes were repaired,
deleted or reset.

All authoritative verification therefore used a fresh remote clone, not the
unstable checkout:

- Source: `git@github.com:SmellZy/HolyParser.git`.
- Remote `HEAD` and `refs/heads/main`, independently retrieved: both
  `3d06712b0cf2958d6920845940314a62fdc391b1`.
- Materialized checkout: `/tmp/holyparser-d055-authority.qFRYME/repo`, detached
  at that exact commit. This temporary path is evidence location, not a
  reproducibility requirement; recreate with the same remote/commit.
- Reapplied existing D-055 documentation only: the seven already-modified
  registers/plan files and the untracked D-055 decision document. Their bytes
  matched the source checkout before this readiness addition.
- The old `package.json` diff predates this task. It prepends the existing D1
  workspace to four aggregate scripts; it changes no dependency declaration.
  It was neither modified nor reapplied to the clean verification clone.
  `package-lock.json` is unchanged. D-055 does not depend on that script diff.
- Five consecutive materialized-clone checks each passed full `git fsck`,
  HEAD/status reads, `git diff --check` and targeted frozen-boundary diffs.
  Each had the same status digest and decision digest; no SIGBUS occurred.
- The original/clone `gradlew.bat` byte difference is checkout line-ending
  normalization under pre-existing global `core.autocrlf=input`, not a task
  edit. The clone has no application-source Git diff. The original checkout
  is not the authoritative environment and is not certified healthy.

### Immutable review target and missing authority

Review target: policy `instrument-matching-pilot/v1`, decision dated
2026-09-14; complete decision snapshot SHA-256:

`60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`

Normative sections 2–14 SHA-256:

`a5fdc8f92bb41d1fe996ef6e32498f665d8a8dd12a2225c6ac4e68809bc4fa4a`

The latter hashes exact UTF-8 bytes from the start of `## 2.` up to, excluding,
`## 15.`. It is a policy-content check, not a substitute for the required
complete reviewed snapshot. No policy bytes were changed in this task.

| Required authority            | Actual evidence                                                                                                                          | Status              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Product                       | Scope approval already recorded in D-055; not a replacement for specialist review                                                        | Recorded scope only |
| Quant                         | Independent technical reviewer `/root/d055_quant` began review but failed before final attestation because execution usage was exhausted | NOT ATTESTED        |
| Market Data                   | Distinct reviewer `/root/d055_market_data` failed before final attestation for the same reason                                           | NOT ATTESTED        |
| Applicable D-064 Security/SRE | Distinct reviewer `/root/d064_scope` supplied preliminary scope analysis but failed before final attestation                             | NOT APPROVED        |

These were AI technical reviewer identities, not human professional signatures.
Partial comments are not `APPROVE`. The proposer cannot finish their reviews
by self-attestation. No attestation document or approval ledger was fabricated.
D-055 remains **NOT APPROVED** and **not eligible for formal independent
acceptance** until all required approvals bind to one identical version/digest
and no implementation-blocking condition remains.

### D-064 applicable scope — recommendation only

The register requires Product, Market Data and SRE approval before the affected
subphase is implemented. Matching-only review must decide the existing D-055
metadata-age interval `[0, 60 seconds]`, structural/registry review age and
mapping validity maximum of 30 days, plus every section-13 input, pair,
provenance, byte, decimal and diagnostic bound. The existing maximum of
100,000 logical work steps and cancellation polling at most every 128 steps
is a proposed deterministic computation budget, **not an approved wall-clock
deadline or latency guarantee**. SRE must explicitly accept that distinction
or supply the missing matching-only deadline policy before the gate is removed.

Book/price/funding cross-leg receive-time skew, book depth, anomaly/history
windows, replay/export and ranking limits remain deferred and BLOCKING before
their affected 2B.2–2B.7 implementation. Matching scope must not resolve them
or alter accepted formulas. D-064 was not guessed or marked approved here.

### Zero approved pairs — retained fail-closed evidence

Frozen adapter code corroborates the following gaps. This factual inventory
does not replace the required independent Market Data attestation.

| Venue pair / ordinary linear perpetual family | Frozen identity evidence                                                                      | Missing economics / typed reason                                                                                 | Effect and future requirement                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| OKX ↔ Binance USDⓈ-M                          | Opaque `instId`/`symbol`; independently resolved native base, quote and settlement references | Binance multiplier UNVERIFIED: `MULTIPLIER_UNKNOWN`; convention RESEARCH_REQUIRED: `VALUE_CONVENTION_UNVERIFIED` | Approval UNAVAILABLE; require separately accepted exact units/payoff and capability evidence |
| OKX ↔ Bybit Linear                            | Opaque `instId`/`symbol`; native contract/category and base/quote/settlement evidence         | Bybit multiplier UNVERIFIED: `MULTIPLIER_UNKNOWN`                                                                | Approval UNAVAILABLE; require separately accepted native quantity-to-base economics evidence |
| Binance USDⓈ-M ↔ Bybit Linear                 | Opaque native IDs and independent asset-role references on both legs                          | Both multipliers UNVERIFIED; Binance convention RESEARCH_REQUIRED; same codes as above                           | Approval UNAVAILABLE; both legs need accepted complete economic evidence                     |

All pairs additionally require approved curated asset bindings, reviewed native
ordinary-product evidence, current ACTIVE metadata and complete independent
mapping review. Ticker resemblance establishes none of those facts. Known
identity may support an incomplete diagnostic candidate without unknown
economics becoming approval; missing canonical asset bindings instead return
AMBIGUOUS diagnostics. Synthetic complete fixtures can exercise compatible
matching. Zero approved live pairs is the intended fail-closed pilot condition,
not proof that the matching core is impossible; no rule was widened to create
pairs. Independent authorities must still accept this condition.

### Verification commands and results

Environment: Node **v24.18.1**, npm **11.16.0**, fresh `npm ci`: **450 packages
added, 458 audited**, **7 workspaces**. No dependency or lockfile edits.

| Command / check in materialized clone                                                                                                                                    | Exact result                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `npm ci`                                                                                                                                                                 | Exit 0                                                                                                       |
| `npm run format:check`                                                                                                                                                   | Exit 0                                                                                                       |
| Explicit Prettier check of all eight existing D-055 documents                                                                                                            | Exit 0                                                                                                       |
| `npm run lint`                                                                                                                                                           | Exit 0, authoritative HEAD aggregate scripts                                                                 |
| `npm run typecheck`                                                                                                                                                      | Exit 0, authoritative HEAD aggregate scripts                                                                 |
| `npm test`                                                                                                                                                               | Exit 0; 35 files: 32 passed, 3 skipped; 263 tests: 260 passed, 0 failed, 3 skipped                           |
| `npm run test --workspace=@arbitrage/design-tokens`                                                                                                                      | Exit 0; 4 files, 74 passed, 0 failed, 0 skipped                                                              |
| Combined default + explicit frozen D1 suites                                                                                                                             | 39 files; 337 tests: 334 passed, 0 failed, 3 skipped                                                         |
| Markdown inline/local-file link scan                                                                                                                                     | 65 Markdown files, 68 inline links, 46 local-file links, 0 broken files; not an anchor/remote-link validator |
| Repeated full `git fsck`, status/HEAD and targeted diff checks                                                                                                           | Five consecutive passes in healthy clone                                                                     |
| Documentation-only allowlist and `git diff --check`                                                                                                                      | Pass; only existing D-055 documentation plus this readiness addition                                         |
| Frozen Phase 2A, D1/D2, accepted 2B acceptance/ADR and all non-matching plan sections, Product/Commerce/Admin, application, dependency/lockfile and infrastructure diffs | Unchanged in healthy clone                                                                                   |
| Brand SHA-256 comparison                                                                                                                                                 | All three match accepted baselines                                                                           |

Three skipped tests are default-off live exchange canaries; none was enabled.
No production build, live exchange work or implementation was performed.
`npm ci` reported seven existing audit findings (2 moderate, 4 high, 1
critical). Optional `npm audit --omit=dev --json` exited 1 and reported three
production findings across `nanoid`, `next` and `sharp` (2 high, 1 critical).
These are current advisories against unchanged dependencies, separate
maintenance/security debt, not D-055 changes; no dependency remediation or
claim of a clean audit is made.

Brand digests, in `docs/brand/references`:

- `holyparser-dark.png`:
  `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08`.
- `holyparser-design-system.png`:
  `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54`.
- `holyparser-logo-system.png`:
  `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c`.

Next task: complete independent Quant and Market Data attestations to the
unchanged review target and obtain explicit matching-only Product/Market
Data/SRE D-064 approval. Then verify identical approval digests and conditions
before scheduling a separate D-055 formal acceptance task. Phase 2B.1 remains
blocked; this readiness record does not authorize it.

## D-055 authority-completion record — 2026-09-14

Authority status: **APPROVED**. This is **authority completion only**, not
formal D-055 acceptance, Phase 2B.1 implementation approval or live-pair
approval. The earlier incomplete-review record is historical, not deleted or
retroactively represented as a successful review.

Exact immutable reviewed complete snapshot SHA-256:

`60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`

Decision version: `instrument-matching-pilot/v1`.
D-064 matching-scope version: `instrument-matching-resources/v1`.
The decision document is retained byte-for-byte at the above digest; only
separate authority records and cross-references change. Its initial pending
ledger describes the review target's historical authority state, not the
current dated approval ledger.

| Required authority   | Explicit completed evidence                                                                                         | Status / blocking conditions |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Quant Reviewer       | /root/d055_quant; [independent Quant attestation](PHASE_2B_D055_QUANT_ATTESTATION.md), 2026-09-14                   | APPROVE / NONE               |
| Market Data Reviewer | /root/d055_market_data; [independent Market Data attestation](PHASE_2B_D055_MARKET_DATA_ATTESTATION.md), 2026-09-14 | APPROVE / NONE               |
| D-064 Product        | Task owner's explicit Product APPROVE reply to the exact digest/scope/limits, 2026-09-14                            | APPROVE / NONE               |
| D-064 Market Data    | /root/d055_market_data; completed scoped approval, 2026-09-14                                                       | APPROVE / NONE               |
| D-064 SRE            | /root/d064_scope; completed independent scoped approval, 2026-09-14                                                 | APPROVE / NONE               |

The [D-064 scope and complete authority ledger](PHASE_2B_D064_MATCHING_APPROVAL.md)
records exact limits, rationale, implementation/production gates and deferred
2B.2–2B.7 scope. All approvals target the same digest and versions; Quant,
Market Data and SRE actors are distinct from proposer /root. These are
explicitly identified AI technical reviews, not fabricated human credentials.
Product's actual explicit reply is preserved; no approval is inferred.

Both independent policy reviewers accept zero current approved pairs as
intentional fail-closed behavior. OKX ↔ Binance and Binance ↔ Bybit remain
UNAVAILABLE with MULTIPLIER_UNKNOWN and VALUE_CONVENTION_UNVERIFIED economics
reasons; OKX ↔ Bybit remains UNAVAILABLE with MULTIPLIER_UNKNOWN. Missing
canonical bindings may separately prevent identity-established candidates.
Diagnostic candidates and complete synthetic fixtures do not upgrade frozen
economics or approve actual mappings.

D-055 is now eligible for a **separate formal independent acceptance task**,
subject to the successful frozen-boundary and verification evidence recorded
below. Phase 2B.1 remains blocked pending that acceptance and a separate
Product Owner implementation task. Later analytics, production economics,
operational ownership, scheduling/watchdog/latency and data-use approvals
remain their separate gates.

### Completed authority-task verification

All checks below ran in the healthy materialized remote clone
`/tmp/holyparser-d055-authority.qFRYME/repo`, source commit
`3d06712b0cf2958d6920845940314a62fdc391b1`, not the unstable original checkout.
Environment: Node **v24.18.1**, npm **11.16.0**, **7 workspaces**.

| Command / independent verification                                                                                | Exact observed result                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh `npm ci`                                                                                                    | Exit 0; 450 packages added, 458 audited                                                                                                                                    |
| `npm run format:check`                                                                                            | Exit 0                                                                                                                                                                     |
| Explicit Prettier checks for all six new/updated authority documents                                              | Pass                                                                                                                                                                       |
| `npm run lint`                                                                                                    | Exit 0                                                                                                                                                                     |
| `npm run typecheck`                                                                                               | Exit 0                                                                                                                                                                     |
| `npm test` using authoritative HEAD aggregate scripts                                                             | Exit 0; 35 files (32 passed, 3 skipped); 263 tests (260 passed, 0 failed, 3 skipped)                                                                                       |
| Explicit frozen D1 `npm run test --workspace=@arbitrage/design-tokens`                                            | Exit 0; 4 files, 74 passed, 0 failed, 0 skipped                                                                                                                            |
| Combined default plus explicit D1 coverage                                                                        | 39 files; 337 tests, 334 passed, 0 failed, 3 skipped                                                                                                                       |
| Markdown/local-file validation                                                                                    | 68 Markdown files, 83 inline links, 61 local links including 1 checked heading anchor, 0 broken                                                                            |
| Authority consistency                                                                                             | All three new authority records reference only the exact required complete digest; policy/scope versions agree; actor independence and all five explicit approvals checked |
| Decision integrity                                                                                                | Complete D-055 snapshot remains SHA-256 60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931                                                                   |
| Repeated Git health                                                                                               | Five consecutive full fsck, status/HEAD, targeted diff and diff-check passes; identical status and decision digests; no SIGBUS                                             |
| Documentation-only scope                                                                                          | Three new authority documents and three authority cross-reference/register updates; no other task changes                                                                  |
| Existing unrelated/shared changes                                                                                 | Pre-existing API-contract, domain, security and risk document bytes unchanged by this task; old package.json script diff excluded from clone and not modified              |
| Frozen Phase 2A, D1/D2, Product/Commerce/Admin, accepted 2B acceptance/ADR and all plan content outside section 6 | No unauthorized diff                                                                                                                                                       |
| Application/dependency/lockfile/infrastructure                                                                    | No diff                                                                                                                                                                    |
| Brand SHA-256                                                                                                     | All three accepted baselines match                                                                                                                                         |

The new files are the Quant attestation, Market Data attestation and D-064
matching approval linked above. Updated files are DECISIONS_REQUIRED.md,
matching authority cross-references in PHASE_2B_SPREAD_ANALYTICS_PLAN.md and
this acceptance-criteria record. No technical policy, accepted formula,
adapter or frozen design artifact changed. The immutable review target was
not rewritten merely to update its historical pending ledger.

The three skipped tests are default-off exchange canaries; none was enabled.
No production build or live exchange call was required or performed. Fresh
installation reported seven advisories against unchanged dependencies (2
moderate, 4 high, 1 critical) and two existing install-script approval warnings.
Those are separate dependency-maintenance debt, not new task changes or a
claim of a clean security audit. No dependency remediation was performed.

### Exact recommended next task — formal acceptance only

```text
Use the healthy materialized repository
/tmp/holyparser-d055-authority.qFRYME/repo, not the unstable original checkout.
Read AGENTS.md, the complete immutable D-055 decision snapshot, all three
authority records, exact D-064 register/scope, relevant frozen Phase 2A
contracts/research and accepted Phase 2B architecture, decision/risk/acceptance
registers completely.

Perform a formal independent documentation acceptance review of D-055 only.
The exact snapshot SHA-256 must remain
60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931.
Decision version is instrument-matching-pilot/v1; approved D-064 matching
scope is instrument-matching-resources/v1. Treat the approved choices as
normative inputs; do not treat author reports or attestations as proof of
technical correctness. Independently verify identity/asset/economics units,
pilot exclusions, lifecycle/freshness, immutable effective/knowledge-time
history, governance, cardinality, key encoding, determinism, all 29 documented
fixture outcomes/reason codes, zero-pair fail-closed behavior and every bound.
Verify all five explicit approvals and reviewer independence bind to the same
snapshot/versions with no blocking conditions. Review cooperative cancellation
and the logical work budget without claiming a wall-clock SLO. Later D-064
and production evidence gates must remain deferred and visible.

Run pinned Node 24 documentation/repository verification and frozen-boundary
checks. Do not implement Phase 2B.1, create runtime fixtures/tests, modify
adapters/contracts/formulas, D1/D2, application/dependencies/infrastructure or
brand assets. Do not widen the pilot. If a normative rule is rejected, stop
for a new decision/authority cycle rather than silently changing this snapshot.
Create docs/PHASE_2B_D055_ACCEPTANCE.md with PASS/PASS_WITH_WARNINGS/FAIL,
findings, independently reproduced evidence, exact commands/counts,
authority/digest checks, frozen boundaries, freeze recommendation and the
next task. Do not authorize implementation or create a commit.
```
