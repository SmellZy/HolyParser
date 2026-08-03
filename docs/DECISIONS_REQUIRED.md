# Decisions Required

## 1. How to use this register

`P1-BLOCKING` items must be answered or explicitly accept the recommended default
before the named Phase 1 increment. Later items do not block Phase 1A and must not
be guessed prematurely.

## 2. Phase 1 blocking decisions

### D-001 — Phase 1 approval granularity

- **When:** before Phase 1A
- **Status:** `P1-BLOCKING`
- **Question:** Is Phase 1 approved as five separately reviewed increments, with
  only 1A authorized next?
- **Recommendation:** yes.
- **Why:** the master specification's original Foundation phase combines
  repository, CI, full identity, UI, database, and observability and is too large
  for one safe change.

### D-002 — Runtime/toolchain baselines

- **When:** before Phase 1A
- **Status:** `P1-BLOCKING`
- **Question:** Which supported Java/Kotlin/Spring, Node/Next.js/TypeScript, package
  manager, and build-tool versions are approved?
- **Recommendation:** select current stable/LTS versions during 1A using official
  compatibility documentation, pin them, and record an ADR; do not hardcode
  versions in this planning task.

### D-003 — Monorepo orchestration

- **When:** before Phase 1A
- **Status:** `P1-BLOCKING`
- **Question:** Use plain native build tools initially or add a monorepo
  orchestrator?
- **Recommendation:** native Gradle and one Node workspace first; add orchestration
  only after there are measurable cross-project caching/task needs.

### D-004 — CI and source-hosting target

- **When:** before Phase 1A
- **Status:** `P1-BLOCKING`
- **Question:** Is GitHub/GitHub Actions the approved repository and CI system?
- **Recommendation:** accept the master specification's GitHub Actions choice if
  the repository will be hosted on GitHub; otherwise name the actual platform
  before writing pipeline files.

### D-005 — License and ownership metadata

- **When:** before Phase 1A
- **Status:** `P1-BLOCKING`
- **Question:** Is the repository private/proprietary, and what copyright/license
  headers or contributor policy apply?
- **Recommendation:** keep private/proprietary with no open-source license until
  legal/product ownership is confirmed.

### D-006 — Phase 1 deployment target

- **When:** before Phase 1E; nonblocking for 1A
- **Status:** `OPEN`
- **Question:** Which cloud, region, container registry, DNS, TLS, email, and
  observability providers are approved for non-production?
- **Recommendation:** keep 1A–1D provider-neutral and local/CI-capable; decide
  before non-production deployment.

### D-007 — Identity/legal scope

- **When:** before Phase 1B schema freeze
- **Status:** `P1-BLOCKING`
- **Question:** Which jurisdictions, minimum age, residency restrictions, terms,
  privacy versions, retention, deletion, and consent requirements apply?
- **Recommendation:** do not invent legal text; model versioned acceptance and
  data lifecycle, but obtain qualified legal/product decisions before production.

### D-008 — Email normalization and account identity

- **When:** before Phase 1B/1C contract
- **Status:** `P1-BLOCKING`
- **Question:** Is email the unique login identifier, and what case/Unicode/alias
  normalization policy is approved?
- **Recommendation:** unique normalized email with preserved display form; do not
  collapse provider-specific aliases such as plus addressing.

### D-009 — Session and CSRF design

- **When:** before Phase 1B/1C
- **Status:** `P1-BLOCKING`
- **Question:** Server-side opaque sessions or self-contained tokens?
- **Recommendation:** revocable server-side opaque sessions in secure cookies with
  explicit CSRF protection, idle and absolute expiry, and rotation.

### D-010 — Auth policy values

- **When:** before Phase 1C
- **Status:** `P1-BLOCKING`
- **Question:** Exact password policy, Argon2id work factor, verification/recovery
  TTL, attempt limit, resend cooldown, session lifetimes, and throttling policy?
- **Recommendation:** benchmark Argon2id in the deployment class; make all other
  values configuration with security-approved defaults and abuse tests. The
  master spec's “approximately 10 minutes” is not a final policy.

### D-011 — Email provider and production activation

- **When:** provider interface in 1C; provider selection before 1E
- **Status:** `OPEN`
- **Question:** Which transactional-email provider, sending domain, template
  languages, bounce/complaint handling, and data-processing terms are approved?
- **Recommendation:** local deterministic sink for development/tests; do not send
  production mail until provider/security/operations are approved.

### D-012 — 2FA/passkey Phase 1 scope

- **When:** before Phase 1D scope freeze
- **Status:** `P1-BLOCKING`
- **Question:** Implement passkeys/TOTP now, or defer until exchange connections?
- **Recommendation:** defer implementation to a dedicated security increment
  before credential storage, but model authentication strength and recent
  reauthentication in Phase 1.

## 3. Product and analytics decisions

### D-013 — MVP users and success metric

- **When:** before Phase 2/3
- **Question:** Is the MVP for individual analysts, an internal quant team, or
  paying retail users; what measurable decision does it improve?
- **Impact:** feature priority, entitlements, latency, compliance, UX, support.

### D-014 — Pilot exchanges

- **When:** after Phase 0 audit, before Phase 2B
- **Question:** Which three venues are first, and is the fourth Bitget or Bitunix?
- **Recommendation:** decide from verified API quality, rights, reliability, and
  ownership capacity—not brand priority.
- **Decision (approved 2026-07-26):** the pilot product groups, in order, are
  OKX Exchange V5 Swap/Futures, Binance USDⓈ-M Futures, and Bybit V5 `linear`.
  Bitget UTA V3 is reserve-only. Company names do not authorize other product
  groups.

### D-015 — Market-data rights and geography

- **When:** before storing/redistributing production data
- **Question:** Are commercial use, caching, historical retention, derived data,
  and redistribution allowed for each venue in target regions?
- **Impact:** product legality and architecture.

### D-016 — Canonical asset governance

- **When:** before Phase 2A
- **Question:** Who approves asset equivalence, aliases, multiplier changes,
  chain/address conflicts, and manual mappings?
- **Recommendation:** named market-data owner plus four-eyes review for financially
  material changes.
- **Decision (approved 2026-07-26):** canonical identity is never derived solely
  from symbol text. Manual mappings require provenance, four-eyes review, and
  conflict quarantine. A named operational owner is still required before a
  production registry accepts manual mappings.

### D-017 — Funding semantics

- **When:** before Phase 2B
- **Question:** What displayed normalization horizon(s) are approved, and how are
  current, predicted, and settled funding distinguished?
- **Recommendation:** show native interval and exact next settlement; offer an
  explicitly labeled comparison horizon derived from verified metadata.
- **Decision (approved 2026-07-26):** store the venue-native value and semantic
  label first. Unknown remains unknown. The normalized eight-hour comparison is
  a separately named and versioned derived metric; it is not the stored native
  value and does not justify a hardcoded venue interval.

### D-018 — Fee and cost source

- **When:** before displaying expected net in Phase 2B
- **Question:** Use user tier, venue default tier, conservative configured tier, or
  unknown for fees/borrow/gas?
- **Recommendation:** show component provenance; if a required cost is unknown,
  expected net is unknown.

### D-019 — USDT/USDC and reporting currency

- **When:** before aggregated PnL or ranking
- **Question:** May a reporting view convert USDT and USDC, using which price,
  timestamp, haircut, and depeg policy?
- **Recommendation:** keep exposures and PnL separate by default; conversion is a
  separately labeled view with risk adjustment.
- **Decision (approved 2026-07-26):** USDT and USDC remain distinct. No implicit
  parity, identity equivalence, aggregation, or conversion is approved.

### D-020 — Performance objective definitions

- **When:** before Phase 2A adapter load tests and Phase 2B analytics SLOs
- **Question:** Workload, hardware/region, event origin/end point, percentile
  window, and allowed degradation for each latency target?
- **Impact:** the master spec's numbers are not testable without measurement
  boundaries.

### D-021 — Historical retention and reproducibility

- **When:** before Phase 2B spread-history persistence
- **Question:** Raw snapshots/deltas versus aggregates, retention periods,
  downsampling, legal deletion, and backtest reproducibility requirements?

### D-022 — Strategy validation thresholds

- **When:** before Phase 8 automatic strategy approval
- **Question:** Required out-of-sample metrics, baselines, error bands, calibration,
  maximum drawdown, and approval authority?
- **Recommendation:** predeclare thresholds before running the final evaluation.

### D-023 — AI provider and policy

- **When:** before any Phase 8 or later AI explanation implementation
- **Question:** Provider/model, region, retention/training terms, cost/latency
  budget, supported languages, and human-facing disclaimer?
- **Recommendation:** provider-independent fact/output contract; no AI dependency
  in core analytics.

## 4. Paper and live-trading decisions

### D-024 — Paper graduation gate

- **When:** define before Phase 5 evidence; approve before Phase 7 live work
- **Question:** Minimum duration/trade scenarios, fill imbalance, reconciliation
  error, slippage calibration, intervention, and loss thresholds?
- **Recommendation:** thresholds are fixed before evidence is collected.

### D-025 — Meaning of manual, semi-auto, and auto

- **When:** before Phase 7
- **Question:** Which exact actions require user confirmation, how long delegated
  authority lasts, and what changes invalidate it?
- **Recommendation:** manual confirms every material action; semi-auto uses a
  short-lived signed policy; auto is a separately approved persistent policy.

### D-026 — Live jurisdiction and regulatory position

- **When:** before storing trading credentials
- **Question:** In which jurisdictions may the product facilitate execution, for
  which users/entities and venues, under what licensing/advice/disclosure rules?
- **Status:** blocks Phase 6 production credential handling and all Phase 7+
  live capabilities.

### D-027 — Initial live venues and products

- **When:** before Phase 6 private API audit and Phase 7 live scope
- **Question:** Which one or two venue/product/environment combinations are in
  scope?
- **Recommendation:** linear perpetuals only if product/legal/risk reviews approve;
  no DEX in the first live scope.

### D-028 — Credential custody and KMS

- **When:** before Phase 6
- **Question:** Cloud KMS/HSM, DEK granularity, rotation/deletion, backup, operator
  access, and regional constraints?

### D-029 — Live risk envelope

- **When:** before Phase 7
- **Question:** System maxima for capital, venue/token exposure, leverage,
  residual delta, slippage, daily loss, drawdown, holding time, unknown orders,
  and beta users?
- **Recommendation:** conservative system ceilings immutable by ordinary admins.

### D-030 — Emergency-close semantics

- **When:** before Phase 7
- **Question:** For every trigger, block new entries only or also attempt safe
  close; who may activate/reset; how is illiquidity handled?
- **Impact:** “kill switch” is ambiguous without per-scope behavior.

### D-031 — Operational ownership

- **When:** before Phase 7
- **Question:** 24/7 or market-hours coverage, on-call roles, incident authority,
  user communication, exchange escalation, RTO/RPO, and manual intervention?

### D-032 — DEX custody and bridge policy

- **When:** before any DEX execution phase
- **Question:** User wallet, session key/smart account, or MPC/HSM; permitted
  chains/contracts/tokens; bridges allowed or prohibited?
- **Recommendation:** analytics only until a separate custody/legal/security
  program is approved; prohibit bridges by default.

## 5. Commercial and scale decisions

### D-033 — Plans and entitlements

- **When:** before any separately approved commercialization phase
- **Question:** Final plan features, data delays, quotas, trial/refund rules, and
  behavior for existing positions after downgrade?
- **Invariant:** billing cannot block risk, reconciliation, or safe position exit.

### D-034 — Billing provider and crypto payment policy

- **When:** before any separately approved billing phase
- **Question:** Provider, accepted assets/chains, confirmation counts, FX/expiry,
  under/overpayment, refunds, sanctions/fraud, tax/invoice requirements?

### D-035 — Scaling triggers

- **When:** before infrastructure expansion
- **Question:** Measured thresholds that justify Redis, event streaming,
  ClickHouse, Kubernetes, and multi-region deployment?
- **Recommendation:** approve each through an ADR backed by load/cost evidence.

## 6. Contradictions, gaps, and unrealistic assumptions

### C-001 — “Microsecond” end-to-end latency

The specification correctly retracts this as unrealistic over Internet exchange
APIs. The in-process decision target also needs hardware, workload, and measurement
definitions. Treat all latency numbers as provisional SLO candidates.

### C-002 — Target microservices versus “no unnecessary infrastructure”

The proposed diagram names many services, event systems, stores, Kubernetes, and
multi-region components while the repository is empty. The resolution is logical
boundaries first, minimal deployables, and evidence-based extraction.

### C-003 — Original Foundation phase is not small

It combines repository, CI, environments, design system, full auth, database, and
observability. This plan divides it into 1A–1E.

### C-004 — Original manual and semi-auto execution are combined

They grant materially different authority. This roadmap separates execution
security/testnet, manual live, semi-auto, and auto.

### C-005 — Product name ambiguity

“Varionational” is interpreted by the specification as likely Variational. The
official product name and API must be confirmed; no adapter folder or identifier
should encode the guess before research.

### C-006 — Current API facts can already be stale

The KuCoin date is now past relative to the repository date; all named channel
cadences, caching, error semantics, and trading availability require current
official confirmation.

### C-007 — Full adapter interface implies unsupported methods

Requiring every adapter to implement every method can invite fake or unsafe
fallbacks. The resolution is capability-gated ports with typed unavailable
results and separate public/private contracts.

### C-008 — Expected net lacks policy for unknown costs

Fees, user tiers, borrow, gas, conversion, and tax are not fully specified.
Required unknown costs must make net unavailable rather than defaulting to zero.

### C-009 — Funding normalization is underspecified

The master spec requests an “8-hour” comparison while prohibiting hardcoded
intervals. A derived comparison horizon is valid only from verified native
interval metadata and clearly separated from native/next settlement values.

### C-010 — Risk-adjusted score denominator

`expectedShortfall` horizon, confidence level, estimator, minimum observations,
and zero/negative handling are missing. The formula cannot be productionized
until specified and validated.

### C-011 — Safe-size haircut example is not a policy

The suggested 60–80% range cannot be hardcoded. Haircuts need a versioned,
validated policy per venue/instrument/regime with conservative defaults.

### C-012 — DEX is materially broader than a venue adapter

Gas, approval, signing, nonce, reorg, MEV, bridge, and custody create a separate
program. DEX analytics and DEX execution need distinct approvals.

### C-013 — Regulatory and data-rights requirements are missing

User jurisdictions, advice/execution status, exchange terms, market-data
redistribution, privacy, retention, sanctions, tax, and age requirements can
change the product and must be resolved before production-relevant phases.

### C-014 — Execution correctness cannot rely on client order IDs everywhere

The master spec requires them, but venue support/constraints are not verified.
Where absent, the venue may be unsuitable for live scope or require a formally
approved alternative reconciliation design.

### C-015 — “Safely close” is not always possible

Exchange outage, illiquidity, chain congestion, or unknown order state can make
immediate closing more dangerous. Kill-switch behavior must be state- and
scope-specific, with reconciliation/manual intervention paths.

### C-016 — LLM fact attribution needs a concrete mechanism

“Every fact is tied to tool output” requires stable fact IDs, redaction, schema
validation, and deterministic post-validation, which are now planned for Phase 7.

### C-017 — Profit language and product liability

The product must avoid guaranteed-return claims, but required disclosures,
suitability language, and AI explanation wording are not defined.

### C-018 — Availability objectives are absent

No RPO, RTO, SLO/error budget, maintenance policy, or on-call model is supplied.
These are necessary before production analytics and mandatory before live trading.

## 7. Phase 0 discovery addendum — 2026-07-26

The evidence and recommendations for these entries are recorded in
[`PHASE_0_API_RESEARCH.md`](PHASE_0_API_RESEARCH.md) and
[`PHASE_0_DECISIONS.md`](PHASE_0_DECISIONS.md).

**Approval record:** on 2026-07-26, the product owner approved P0-001 through
P0-008 with Phase 2A remaining public and unauthenticated, the three named pilot
product groups, Bitget UTA V3 as reserve-only, venue-native funding storage,
separate versioned eight-hour normalization, sequence-only integrity under the
documented-fixture rules, and deferred DEX/RFQ/on-chain adapters.

| Existing decision                        | Phase 0 evidence-based recommendation                                                                                            | Status / owner input                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| D-013 — MVP users and success metric     | Start with professional/internal analysts and correctness/staleness evidence, not execution or monetization                      | **OWNER DECISION REQUIRED**                                                           |
| D-014 — Pilot exchanges                  | Name product groups: OKX Exchange V5 Swap/Futures, Binance USDⓈ-M Futures and Bybit V5 linear; Bitget UTA V3 reserve             | **APPROVED 2026-07-26**                                                               |
| D-015 — Market-data rights and geography | Complete legal/terms review for the intended operator/user entities before production redistribution or authenticated validation | **BLOCKING BEFORE PRODUCTION PILOT**                                                  |
| D-016 — Canonical asset governance       | CEX identity includes official instrument/product/settlement; DEX uses chain plus token ID/address; four-eyes mappings           | **POLICY APPROVED 2026-07-26; OPERATIONAL OWNER REQUIRED BEFORE PRODUCTION MAPPINGS** |
| D-017 — Funding semantics                | Store native rate/meaning/interval/time/source; derived comparison rate separately versioned; no hardcoded interval              | **APPROVED 2026-07-26**                                                               |
| D-019 — USDT/USDC and reporting currency | Keep assets distinct; no implicit parity/conversion                                                                              | **APPROVED 2026-07-26**                                                               |
| D-020 — Performance objectives           | Use documented venue cadence plus measured receive/processing lag; no universal latency claim                                    | **Can be specified in Phase 2A**                                                      |
| D-027 — Initial live venues and products | Phase 0 makes no live recommendation; inventory is not authority                                                                 | **DEFERRED UNTIL PAPER GRADUATION**                                                   |
| D-032 — DEX custody and bridge policy    | Keep DEX/RFQ outside generic CEX Phase 2A; no transaction construction                                                           | **PHASE BOUNDARY APPROVED 2026-07-26; CUSTODY DECISIONS DEFERRED**                    |

### D-036 — Phase 2A public/authenticated boundary

- **Question:** may Phase 2A use read-only API keys?
- **Recommendation:** no. Phase 2A is unauthenticated public analytics only.
- **Why blocking:** permitting keys expands security scope into secret handling,
  tenant authorization, revocation and private-data retention.
- **Decision (approved 2026-07-26):** Phase 2A is public and unauthenticated.
  Credentials, signing, authenticated calls, and private data are excluded.

### D-037 — Order-book integrity without checksum

- **Question:** may a venue be trusted when it documents sequence/replacement
  semantics but no checksum?
- **Recommendation:** yes for analytics when deterministic fixtures verify
  sequence/gap/restart behavior; otherwise mark the book stale. Never fabricate
  a checksum requirement.
- **Evidence:** current OKX JSON and Bitget UTA V3 explicitly removed/disabled
  checksum; Hyperliquid uses full snapshot replacement.
- **Decision (approved 2026-07-26):** sequence-only books are acceptable when
  official sequence semantics and deterministic fixture tests exist. Any gap or
  undocumented recovery makes the book `STALE`; executable output remains
  unavailable until explicit recovery.

### D-038 — DEX/RFQ phase boundary

- **Question:** should OKX DEX, Variational, Aster, Lighter or Hyperliquid share
  the first generic exchange adapter?
- **Recommendation:** no. Use later quote-, snapshot-book- and
  transaction-aware ports.
- **Decision (approved 2026-07-26):** DEX, RFQ, and on-chain venue adapters are
  deferred to dedicated later phases. A Hyperliquid-style replacement fixture
  may test a generic state machine but does not authorize a Hyperliquid adapter.

### D-039 — Official documentation contradiction policy

- **Question:** what evidence resolves conflicting official pages?
- **Recommendation:** current canonical docs can guide non-financial research,
  but financially critical use remains blocked until vendor clarification or a
  repeatable official sandbox/public probe is recorded.
- **Current conflicts:** OKX DEX V5/V6; Aster V1/V3; KuCoin legacy depth; Gate
  limits; MEXC legacy/current Futures; MEXC Spot WS host.
- **Decision (approved 2026-07-26):** apply the recommended fail-closed policy.
  A named research owner and resolution evidence remain required before an
  affected product group can support financially critical output.

### D-040 — Venue-native price naming

- **Question:** may venue fields such as MEXC `fairPrice` or Hyperliquid
  `oraclePx` be silently mapped to canonical mark/index?
- **Recommendation:** no. Preserve exchange-native semantic name until a
  documented mapping decision is approved.
- **Decision for Phase 2A.1 (approved 2026-07-26):** no silent mapping is
  permitted. A later product-specific adapter must record an approved mapping or
  preserve the native semantic name.

### C-019 — A checksum is not a universal order-book invariant

The earlier planning matrix implied checksum research for every adapter.
Official current evidence shows checksum is absent on many venues and explicitly
removed/disabled on OKX JSON and Bitget UTA V3. Integrity must be
capability-driven.

### C-020 — “Predicted funding” is not a portable field

Some venues expose predicted/next funding, some expose current or last rate,
some return a nullable next rate, and others expose a multi-venue aggregator.
Names must retain official semantics; absence is not permission to derive a
prediction.

### C-021 — Test endpoint is not testnet

KuCoin order-test validates a request without providing a complete matching
environment. Official SDK configuration alone also does not establish
production parity. Testnet status must include host, products, authentication
and known differences.

### C-022 — Unified company APIs are not unified product semantics

Binance, OKX, KuCoin, MEXC, Bitunix, BloFin and Bybit expose materially
different product groups under one brand. A company-level capability flag can
silently claim unsupported functionality and is prohibited.

## 8. Position, alert, notification, and Telegram decisions — 2026-07-26

The product owner approved the future capability families and roadmap placement
documented in `POSITION_MANAGEMENT.md`, `NOTIFICATION_ARCHITECTURE.md`,
`TELEGRAM_INTEGRATION.md`, and ADR 0005. The principles below are accepted; the
parameter and policy questions remain open and do not authorize implementation.

### D-041 — Position accounting definitions

- **When:** before Phase 4 contract freeze
- **Status:** `OWNER DECISION REQUIRED`
- **Question:** What exact formulas, currencies, timing, and sign conventions
  define entry/current spread, spread PnL, funding PnL, fees,
  estimated/realized slippage, net PnL, residual delta, and liquidation buffer?
- **Recommendation:** version each component; retain native settlement currency;
  make aggregate output unknown when a required component/conversion is unknown.

### D-042 — Multi-leg eligibility and limits

- **When:** before Phase 4
- **Status:** `OWNER DECISION REQUIRED`
- **Question:** Which strategy shapes and maximum leg count are supported first,
  and how are valuation, hedge tolerance, and partial state defined for more than
  two legs?
- **Recommendation:** ship two legs first; keep the aggregate extensible; require
  a separately tested policy before enabling each multi-leg shape.

### D-043 — Manual-to-synchronized position adoption

- **When:** before Phase 6
- **Status:** `OWNER DECISION REQUIRED`
- **Question:** When authenticated exchange state resembles a manual position,
  may it be linked, merged, or only displayed as a conflict?
- **Recommendation:** never auto-merge; require explicit reviewed adoption with
  provenance and retain both histories.

### D-044 — Position retention and correction policy

- **When:** before Phase 4 persistence
- **Status:** `OWNER/LEGAL DECISION REQUIRED`
- **Question:** Retention, deletion, export, note moderation, correction,
  backdating, and audit requirements for manual, paper, synchronized, and live
  positions?
- **Recommendation:** append-only corrections for financial facts; separate
  user-editable notes; legal review before production retention.

### D-045 — Alert default policies

- **When:** before Phase 2C
- **Status:** `OWNER DECISION REQUIRED`
- **Question:** Default thresholds, minimum duration, cooldown, hysteresis,
  grouping, severity, expiry, quiet hours, timezone, and emergency override?
- **Recommendation:** configuration per alert family; emergency system rules
  cannot be suppressed by ordinary user quiet hours.

### D-046 — Notification durability and delivery SLO

- **When:** before Phase 2C persistence/operations
- **Status:** `OWNER/SRE DECISION REQUIRED`
- **Question:** Retry count, backoff ceiling, provider unknown-outcome policy,
  dead-letter retention, backlog collapse, delivery SLO, and operator workflow?
- **Recommendation:** bounded exponential retry with jitter, deterministic
  idempotency, channel isolation, finite backlog, and explicit dead-letter owner.

### D-047 — Public Telegram editorial and data policy

- **When:** before any public channel activation
- **Status:** `OWNER/LEGAL DECISION REQUIRED`
- **Question:** Channel owner, regions, languages, moderation, redistribution
  rights, delay, disclaimers, severity, publishing cadence, and incident notices?
- **Recommendation:** allowlisted `PUBLIC_ANALYTICS` templates only; no personal,
  account, secret, private-alert, or action data.

### D-048 — Telegram provider and operating model

- **When:** before Phase 3 provider activation
- **Status:** `OWNER/SECURITY/LEGAL DECISION REQUIRED`
- **Question:** Bot/channel ownership, provider terms, operating entity, domains,
  environment applications, secret custody, webhook/polling operating model,
  retention, and support ownership?
- **Recommendation:** separate production/non-production applications and
  secrets; narrow gateway workload; provider activation is separate from the
  Phase 2C mock.

### D-049 — Telegram identity and TTL policy

- **When:** before Phase 3 contract freeze
- **Status:** `OWNER/SECURITY DECISION REQUIRED`
- **Question:** Linking-token, Mini App initialization-age, application-session,
  callback, preview, and confirmation TTLs; relinking; multiple-account; recovery;
  attempt and rate limits?
- **Recommendation:** short, purpose/audience/environment-bound values; single-use
  critical actions; link change revokes sessions/actions and disables trading
  controls.

### D-050 — Mini App origin and browser-security policy

- **When:** before Phase 3 Mini App implementation
- **Status:** `SECURITY/PRODUCT DECISION REQUIRED`
- **Question:** Production origins, CSP/frame policy, cookie/session model, CSRF,
  redirect allowlist, locales, accessibility target, and supported clients?
- **Recommendation:** same backend/session authority with strict environment
  separation; never trust frontend Telegram identity fields.

### D-051 — Telegram outage and fallback policy

- **When:** before real provider activation
- **Status:** `OWNER/SRE DECISION REQUIRED`
- **Question:** Availability objective, notification backlog limit, fallback
  channels, status communication, recovery order, and emergency escalation?
- **Recommendation:** web/in-app remains authoritative; Telegram never gates
  risk/reconciliation; expired actions stay expired after recovery.

### D-052 — Telegram paper-action UX

- **When:** before Phase 5
- **Status:** `OWNER/SECURITY DECISION REQUIRED`
- **Question:** Which paper actions are allowed in bot versus Mini App, required
  preview detail, confirmation text, expiry, cancellation, and action history?
- **Recommendation:** bot prepares; Mini App or bot confirms an immutable,
  short-lived paper preview; no real endpoint is reachable.

### D-053 — Telegram live-action scope and limits

- **When:** before any Phase 7 Telegram live-control design
- **Status:** `LIVE-BLOCKING OWNER/RISK/SECURITY DECISION`
- **Question:** Which live actions, venues, products, users, notionals, daily
  limits, authentication strength, web reauthentication, and confirmation paths
  are permitted?
- **Recommendation:** no live action by default; Telegram limits only reduce
  authority; high notional requires passkey/2FA/web reauthentication; risk-limit
  changes are prohibited or require web reauthentication.

### D-054 — Notification privacy, consent, and retention

- **When:** before Phase 3 personal delivery
- **Status:** `OWNER/LEGAL/SECURITY DECISION REQUIRED`
- **Question:** Consent, channel opt-in, quiet-hours jurisdiction, content
  minimization, template languages, retention/deletion, device previews, and
  security-message override?
- **Recommendation:** data-classification allowlists, minimal private content,
  no secrets, versioned consent, and immutable security audit.

## 9. Phase 2B Spread Analytics Core decisions — 2026-08-03

For D-055 through D-064, every authority named in `Status` must approve and the
product owner records the final decision. `When: before Phase 2B.x` means before
any implementation of that subphase, not merely before production deployment.
An unresolved item must not be converted into an implementation default.

### D-055 — Canonical instrument compatibility and mapping governance

- **When:** before Phase 2B.1
- **Status:** `BLOCKING PRODUCT/QUANT/MARKET-DATA DECISION`
- **Question:** Which market/contract types and lifecycle/status combinations,
  expiries, multiplier and contract-value units are compatible; what expiry
  tolerance and one-to-one/one-to-many cardinality rules apply; who owns
  mappings; and how are correction, supersession, rollback, effective time,
  proposer/reviewer separation, and deterministic confidence classes governed?
- **Recommendation:** initially allow only an explicitly enumerated pilot
  derivatives compatibility matrix; require exact canonical base/quote/
  settlement roles, compatible economic units, four-eyes review, immutable
  versions, conflict quarantine, and no probabilistic auto-approval.

### D-056 — Requested exposure and depth-completion policy

- **When:** before Phase 2B.2
- **Status:** `BLOCKING PRODUCT/QUANT DECISION`
- **Question:** Is requested size expressed as base quantity, quote notional, or
  settlement notional; how are contract values converted; what receive-time
  skew and minimum/maximum requested exposure apply; and may partial depth be
  displayed?
- **Recommendation:** require an explicit unit on every request, derive common
  exposure only from approved exact multiplier/unit data, require full depth on
  both legs for executable output, and expose any partial result as a separately
  named non-actionable diagnostic with residual quantity.

### D-057 — Spread direction, denominator, scale, and rounding

- **When:** before Phase 2B.2
- **Status:** `BLOCKING PRODUCT/QUANT DECISION`
- **Question:** Approve long/short sign, entry and exit bid/ask direction,
  percentage denominator, output scale, midpoint scale, and named rounding
  policies.
- **Recommendation:** use the candidate formulas in
  `PHASE_2B_SPREAD_ANALYTICS_PLAN.md`; independently approve golden vectors and
  make every division policy explicit. Do not describe entry-minus-exit spread
  as monetary PnL.

### D-058 — Required cost and expected-result policy

- **When:** before Phase 2B.2 expected-result output or Phase 2B.7 ranking
- **Status:** `BLOCKING PRODUCT/QUANT DECISION`
- **Question:** Which fees and costs are mandatory; which maker/taker tier and
  notional/currency basis apply; what exact reference defines slippage; and
  what scenario defines expected gross convergence?
- **Recommendation:** model each cost as an explicit versioned input with
  source/effective time and currency. If a policy-required component is unknown,
  expected net is unavailable. Do not use a zero default or guaranteed-profit
  wording.

### D-059 — Funding compatibility, direction, and settlement alignment

- **When:** before Phase 2B.3
- **Status:** `BLOCKING PRODUCT/QUANT/MARKET-DATA DECISION`
- **Question:** Which combinations of `CURRENT`, `LAST`, `PREDICTED`, and
  historical semantics may be compared; what sign and basis notional apply;
  what next-settlement skew is acceptable; and which scale/rounding policy
  applies to normalized and cash-flow results?
- **Recommendation:** always preserve native observations; permit a directional
  or expected cash-flow result only for an enumerated compatible semantic and
  timing policy. Keep the frozen normalized eight-hour calculation separately
  named/versioned and unavailable when interval is unknown.

### D-060 — Opportunity lifecycle policy

- **When:** before Phase 2B.4
- **Status:** `BLOCKING PRODUCT/QUANT DECISION`
- **Question:** What entry/exit thresholds, minimum duration, convergence rule,
  expiry, duplicate key, funding gate, requalification delay, and policy-version
  migration apply?
- **Recommendation:** approve a complete transition table. Any failed required
  gate enters `DEGRADED`; recovery returns to `QUALIFYING`, not directly to
  `ACTIVE`; duplicate revisions are idempotent and out-of-order revisions fail
  closed.

### D-061 — Deterministic anomaly catalogue

- **When:** before Phase 2B.5
- **Status:** `BLOCKING PRODUCT/QUANT DECISION`
- **Question:** Which anomaly rules, exact thresholds, baseline/window methods,
  minimum durations, severity levels, and resolution rules apply?
- **Recommendation:** use bounded, versioned deterministic rules only; separate
  market anomalies from source-quality anomalies; prohibit ML/AI and future
  leakage.

### D-062 — History, downsampling, export, and correction semantics

- **When:** before Phase 2B.6
- **Status:** `BLOCKING PRODUCT/DATA/LEGAL DECISION`
- **Question:** In addition to D-021, what immutable record, gap, ordering,
  downsampling coverage, correction, schema evolution, export format, and
  reproducibility-horizon semantics apply?
- **Recommendation:** define exact versioned contracts and fixture replay in
  2B.6, retain gaps explicitly, and defer every persistence implementation and
  retention job to separate approval.

### D-063 — Ranking eligibility, score, tie-break, and copy policy

- **When:** before Phase 2B.7
- **Status:** `BLOCKING PRODUCT/QUANT/LEGAL DECISION`
- **Question:** Which inputs are required, which deterministic tuple or weighted
  score ranks eligible candidates, how are components normalized, how are ties
  resolved, what does completeness mean, and which product wording is allowed?
- **Recommendation:** gate eligibility before ranking; exclude stale/gapped,
  incomplete-depth, unresolved-mapping, and unknown-required-cost candidates;
  use deterministic completeness rather than success probability; prohibit
  guaranteed-profit language.

### D-064 — Analytics freshness, skew, and bounded-load policies

- **When:** before the affected Phase 2B.x subphase
- **Status:** `BLOCKING PRODUCT/MARKET-DATA/SRE DECISION`
- **Question:** What venue/product/channel freshness, cross-leg receive-time
  skew, batch, book-level, window, replay/export, ranking-candidate, decimal,
  provenance-count/byte, processing-deadline, and cancellation limits apply?
- **Recommendation:** version policies by input kind rather than use a global
  timeout; enforce explicit fail-closed resource bounds and finite-cardinality
  telemetry.

### C-023 — Alert foundation precedes user identity

The approved roadmap places Phase 2C before Phase 3 identity. Therefore Phase 2C
can implement only system-owned/user-neutral rule contracts, test recipients,
in-app foundation, and a mock Telegram provider. Per-user rule activation,
preferences, and private delivery begin in Phase 3.

### C-024 — Position lifecycle does not imply authority

The same lifecycle vocabulary spans tracking, paper, synchronized, and live
positions, but not every state is valid in every mode. Mode gates are mandatory.
An observed synchronized `ENTERING` or `EXITING` state grants no platform order
permission.

### C-025 — Telegram callback is not a financial command

Provider callback data is replayable and old messages persist. The callback may
only resolve an opaque, single-use, short-lived internal action. It cannot
contain or directly execute an exchange command.

### C-026 — Notification success is not financial truth

Delivery, editing, retry, and dead-letter outcomes are communication state.
Coupling them to positions, alerts, risk, execution, or reconciliation would
make provider outages financially unsafe and is prohibited.

### C-027 — “Current PnL” is ambiguous

Midpoint, executable close value, mark-based margin view, realized PnL, and
reporting-currency conversion are different. Phase 4 cannot label a value
“current PnL” until D-041 defines the component, size, source, quality, time, and
conversion semantics.

### C-028 — Consolidated acceptance register uses legacy phase labels

`ACCEPTANCE_CRITERIA.md` retains the superseded Phase 2B–13 sequence as
historical evidence and now contains a separately labelled current-roadmap
Phase 2B register. The current roadmap and
`PHASE_2B_SPREAD_ANALYTICS_PLAN.md` govern; legacy labels authorize no work.

### C-029 — Instrument match is not asset conversion

A valid Phase 2B.1 match proves only the compatibility policy recorded in its
version. It does not assert stablecoin parity, cross-chain fungibility,
conversion availability, custody, or settlement equivalence. USDT and USDC do
not match implicitly.

### C-030 — Partial depth is not an executable quote

A partial VWAP can be a bounded diagnostic only. It cannot satisfy executable
spread, actionability, expected-net, or ranking eligibility for the requested
size. Residual exposure remains explicit.

### C-031 — Funding comparison is not funding prediction

Native `LAST`, `CURRENT`, and `PREDICTED` observations are not interchangeable.
Normalization changes horizon representation, not semantic certainty. A
semantic or timing mismatch makes an expected cash-flow result unavailable.

### C-032 — Completeness is not probability

Matching and ranking confidence in Phase 2B describes deterministic evidence
and required-field completeness only. It must not be presented as probability
of profit, strategy success, or execution quality.
