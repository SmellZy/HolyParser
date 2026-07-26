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

- **When:** before Phase 3A
- **Question:** What displayed normalization horizon(s) are approved, and how are
  current, predicted, and settled funding distinguished?
- **Recommendation:** show native interval and exact next settlement; offer an
  explicitly labeled comparison horizon derived from verified metadata.
- **Decision (approved 2026-07-26):** store the venue-native value and semantic
  label first. Unknown remains unknown. The normalized eight-hour comparison is
  a separately named and versioned derived metric; it is not the stored native
  value and does not justify a hardcoded venue interval.

### D-018 — Fee and cost source

- **When:** before displaying expected net in Phase 3B
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

- **When:** before Phase 2C load tests
- **Question:** Workload, hardware/region, event origin/end point, percentile
  window, and allowed degradation for each latency target?
- **Impact:** the master spec's numbers are not testable without measurement
  boundaries.

### D-021 — Historical retention and reproducibility

- **When:** before Phase 4A
- **Question:** Raw snapshots/deltas versus aggregates, retention periods,
  downsampling, legal deletion, and backtest reproducibility requirements?

### D-022 — Strategy validation thresholds

- **When:** before Phase 6
- **Question:** Required out-of-sample metrics, baselines, error bands, calibration,
  maximum drawdown, and approval authority?
- **Recommendation:** predeclare thresholds before running the final evaluation.

### D-023 — AI provider and policy

- **When:** before Phase 7
- **Question:** Provider/model, region, retention/training terms, cost/latency
  budget, supported languages, and human-facing disclaimer?
- **Recommendation:** provider-independent fact/output contract; no AI dependency
  in core analytics.

## 4. Paper and live-trading decisions

### D-024 — Paper graduation gate

- **When:** before Phase 8 build
- **Question:** Minimum duration/trade scenarios, fill imbalance, reconciliation
  error, slippage calibration, intervention, and loss thresholds?
- **Recommendation:** thresholds are fixed before evidence is collected.

### D-025 — Meaning of manual, semi-auto, and auto

- **When:** before Phase 9
- **Question:** Which exact actions require user confirmation, how long delegated
  authority lasts, and what changes invalidate it?
- **Recommendation:** manual confirms every material action; semi-auto uses a
  short-lived signed policy; auto is a separately approved persistent policy.

### D-026 — Live jurisdiction and regulatory position

- **When:** before storing trading credentials
- **Question:** In which jurisdictions may the product facilitate execution, for
  which users/entities and venues, under what licensing/advice/disclosure rules?
- **Status:** blocks Phase 9 production credential handling and all live phases.

### D-027 — Initial live venues and products

- **When:** before Phase 9 private API audit
- **Question:** Which one or two venue/product/environment combinations are in
  scope?
- **Recommendation:** linear perpetuals only if product/legal/risk reviews approve;
  no DEX in the first live scope.

### D-028 — Credential custody and KMS

- **When:** before Phase 9
- **Question:** Cloud KMS/HSM, DEK granularity, rotation/deletion, backup, operator
  access, and regional constraints?

### D-029 — Live risk envelope

- **When:** before Phase 10
- **Question:** System maxima for capital, venue/token exposure, leverage,
  residual delta, slippage, daily loss, drawdown, holding time, unknown orders,
  and beta users?
- **Recommendation:** conservative system ceilings immutable by ordinary admins.

### D-030 — Emergency-close semantics

- **When:** before Phase 10
- **Question:** For every trigger, block new entries only or also attempt safe
  close; who may activate/reset; how is illiquidity handled?
- **Impact:** “kill switch” is ambiguous without per-scope behavior.

### D-031 — Operational ownership

- **When:** before Phase 10
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

- **When:** before Phase 13
- **Question:** Final plan features, data delays, quotas, trial/refund rules, and
  behavior for existing positions after downgrade?
- **Invariant:** billing cannot block risk, reconciliation, or safe position exit.

### D-034 — Billing provider and crypto payment policy

- **When:** before Phase 13
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
