# Phase 2B Spread Analytics Core architecture acceptance

- Review date: 2026-08-03
- Review type: independent documentation and architecture acceptance
- Final status: **PASS_WITH_WARNINGS**
- Implementation authority: **NOT GRANTED**
- Phase 2B.1 authority: **BLOCKED ON D-055**

## 1. Accepted review scope

This review accepts only the decomposition, boundaries, contracts, decision
gates, risks, and acceptance plan for the Phase 2B Spread Analytics Core. It
does not accept or authorize implementation, persistence, UI, Telegram,
positions, authenticated exchange access, paper/live trading, Risk Engine,
Execution Engine, AI, billing, or commerce.

Phase 1 and Phase 2A.1 through Phase 2A.4 remain frozen. Their packages were
unchanged during this review. The unrelated untracked `docs/brand/` directory
was inspected only to identify its presence and was not modified.

## 2. Reviewed documents and modules

Primary Phase 2B evidence:

- `docs/PHASE_2B_SPREAD_ANALYTICS_PLAN.md`
- `docs/adr/0009-spread-analytics-boundary.md`
- `docs/ROADMAP.md`
- `docs/DOMAIN_MODEL.md`
- `docs/API_CONTRACTS_PLAN.md`
- `docs/SECURITY_MODEL.md`
- `docs/RISK_REGISTER.md`
- `docs/DECISIONS_REQUIRED.md`
- `docs/ACCEPTANCE_CRITERIA.md`

Governing and compatibility evidence:

- `AGENTS.md`, `docs/MASTER_SPEC.md`, and `docs/ARCHITECTURE.md`;
- Phase 0 API research, decisions, source register, and capability matrix;
- Phase 1 plan and acceptance evidence;
- Phase 2A.1 through Phase 2A.4 implementation, acceptance, and ADR documents;
- frozen `packages/market-data`, `packages/okx-public-adapter`,
  `packages/binance-usdm-public-adapter`, and
  `packages/bybit-linear-public-adapter` only for compatibility and diff checks.

## 3. Subphase decomposition verdict

**PASS.** The plan separates Phase 2B into:

1. 2B.1 — Canonical Instrument Matching Foundation;
2. 2B.2 — Executable Spread Mathematics;
3. 2B.3 — Funding Differential;
4. 2B.4 — Opportunity Lifecycle;
5. 2B.5 — Deterministic Anomaly Detection;
6. 2B.6 — Spread History Contracts;
7. 2B.7 — Deterministic Ranking.

Each subphase has scope, non-goals, entities/value objects, conceptual ports,
inputs/outputs, exact-decimal and unit rules, quality/freshness/capability gates,
fixtures, unit/property/replay/fault tests, bounded observability, security and
resource limits, risks/decisions, acceptance criteria, and an independent freeze
gate.

No later-phase behavior is owned by an earlier subphase. Ranking consumes but
does not define spread or funding meaning. Opportunity lifecycle owns no order,
position, risk, or execution state. History defines only bounded contracts and
fixture-backed replay. Anomaly detection is deterministic and contains no AI or
ML. Venue adapters remain outside the analytics boundary.

## 4. Cross-subphase dependency verdict

**PASS.** Dependencies are acyclic and conservative:

- 2B.1 depends only on frozen canonical metadata;
- 2B.2 depends on a frozen match contract;
- 2B.3 depends on matching and on 2B.2 units only for cash-flow scenarios;
- 2B.4 consumes frozen spread/funding results;
- 2B.5 consumes bounded immutable analytical inputs;
- 2B.6 records/replays frozen meanings without implementing storage;
- 2B.7 gates eligibility before using frozen analytical components.

Every dependent subphase requires the earlier contract to be accepted and
frozen. A formula or mapping correction creates a new version and does not
rewrite history.

## 5. Canonical matching verdict

**PASS AS A PLAN; IMPLEMENTATION BLOCKED.** 2B.1 preserves venue, product group,
opaque official instrument ID, canonical base/quote/settlement assets,
USDT/USDC separation, market and contract type, expiry, multiplier/unit,
lifecycle/status, provenance, two-person review, effective time, immutable
version, supersession/correction, and conflict quarantine.

Ticker similarity cannot create identity. Unknown, unsupported, unverified,
research-required, inactive, expired, conflicting, or unreviewed mappings fail
closed. D-055 now enumerates all product decisions and required joint approval,
but remains unresolved.

## 6. Formula and semantic verdict

**PASS_WITH_WARNINGS.** Candidate formulas are isolated from approval and use
exact decimals, explicit units, named division scale/rounding, formula versions,
and typed unavailable results.

The plan explicitly separates:

- midpoint from executable spread;
- entry long-buy/short-sell from exit long-sell/short-buy-to-cover;
- complete depth from non-actionable partial depth and residual exposure;
- slippage percentage from monetary cost;
- venue-native funding from `NormalizedFundingRate8hV1` with frozen formula ID
  `normalized-funding-8h/v1`;
- expected gross, funding scenario, fees, slippage, and expected net.

No financial float/double or silent rounding is permitted. Unknown required
cost makes expected net unavailable.

Unresolved financial semantics are intentional blockers:

- D-056: exposure unit, conversion, magnitude, depth and skew;
- D-057: direction, sign, denominator, scale and rounding;
- D-058: fee/slippage/cost basis and expected-result scenario;
- D-059: funding semantic compatibility, direction, basis and settlement
  alignment.

These warnings do not prevent freezing the plan, but they prevent their owning
subphase implementations.

## 7. Funding verdict

**PASS.** Native `CURRENT`, `LAST`, `PREDICTED`, historical, `UNKNOWN`, and
not-applicable meaning remains distinguishable. Native rate, interval, next
settlement, source, quality, funding-rate unit, basis notional and settlement
currency remain explicit.

There is no native eight-hour default. The frozen eight-hour result is a
separately named/versioned derived value and cannot overwrite native data.
Semantic, timing, interval, basis-unit, or settlement-currency incompatibility
makes expected cash flow unavailable. D-059 must approve the comparison matrix
and sign/timing policy.

## 8. Opportunity lifecycle verdict

**PASS AFTER REMEDIATION.** The plan now contains a structural transition table
covering discovery, qualification and minimum duration, activation,
convergence/break, qualification loss, degradation, recovery/requalification,
suppression/clear, policy change, expiry, resolution, duplicate/out-of-order
events, and terminal behavior.

All unspecified transitions reject without mutation. Duplicate events do not
refresh timers or freshness. `RESOLVED` and `EXPIRED` are terminal; a later
occurrence requires a new deterministic key/generation. `DEGRADED` recovery
returns through `QUALIFYING`, never directly to `ACTIVE`. D-060 still defines
the product predicates, durations, keys and thresholds before implementation.

The lifecycle owns no order, position, risk decision, or execution authority.

## 9. Anomaly, history, and ranking verdicts

### Anomaly detection

**PASS.** Rules are deterministic, versioned, bounded, exact-decimal, and carry
input revisions, evidence and provenance. Market anomalies are distinct from
source-quality anomalies. Spread expansion/convergence, venue and mark/index
divergence, funding discontinuity, liquidity collapse, stale/invalid/crossed
sources, mapping conflicts, and degradation are covered. No AI/ML or trading
decision exists.

### Spread history

**PASS.** Contracts preserve immutable exact observations, ordered input
revisions, mapping/formula/rule/policy versions, event/exchange/receive/
processing/calculation timestamps, quality/capability/knowledge, provenance,
explicit gaps, downsampling coverage, replay and bounded export meaning.
Persistence, migration, retention jobs and storage are absent and separately
blocked by D-021/D-062.

### Ranking

**PASS.** Eligibility precedes sorting/scoring. Stale, gapped, invalid,
unsupported, unverified, research-required, ambiguous, partial-depth,
unknown-required-cost or semantically incompatible candidates cannot rank as
actionable. Results carry policy and input versions with deterministic total
tie-breaking. Completeness is deterministic field coverage, not financial
probability. Ranking has no execution authority or guaranteed-profit language.

## 10. Data quality and actionability verdict

**PASS AFTER REMEDIATION.** The plan distinguishes:

1. `EXECUTABLE_MARKET_INPUT`;
2. `VALID_ANALYTICS`;
3. `DISPLAYABLE_ANALYTICS`;
4. `COMPARABLE_ANALYTICS`;
5. `ACTIONABLE_ANALYTICS`.

The classifications are separate and monotonic but never confer trading
authority. Actionability requires an approved match, supported/known required
capabilities and units, fresh inputs, acceptable cross-leg skew, initialized
valid books, complete requested depth, known required costs, and compatible
funding semantics/timing.

`DEGRADED`, `STALE`, `GAPPED`, `RECONNECTING`, `DISABLED`, `UNSUPPORTED`,
`UNVERIFIED`, `RESEARCH_REQUIRED`, `AMBIGUOUS`, `PARTIAL_DEPTH`, `INVALID`,
`LOCKED`, and `CROSSED` are non-actionable.

## 11. Security and resource-bound verdict

**PASS AFTER REMEDIATION.** The plan requires explicit fail-closed limits for
pair batches, mapping chains/evidence, requested-exposure magnitude, depth
levels, decimals/operations, anomaly windows/rules, replay records, history and
export bytes, ranking candidates/components, provenance count/bytes, deadlines
and cancellation.

Hostile mappings, excessive input, and resource-limit failures return typed
rejection/unavailability without silent sampling. Metrics use finite allowlisted
families/buckets. Full formula/rule/policy/mapping/input versions, symbols,
instrument IDs, URLs, payloads, raw errors, and free-form mapping/reason text are
not metric labels. Full versions remain bounded structured-event fields.

## 12. Decisions and risks verdict

**PASS_WITH_WARNINGS.** D-055 through D-064 are assigned to their owning
subphases, state that they block implementation rather than production only,
name all joint approval authorities, and do not authorize recommended values by
their presence.

R-080 through R-088 record likelihood, impact, trigger, prevention, detection,
recovery, residual risk, owner and owning subphase. The companion control matrix
added during review makes detection and recovery independently reviewable.

## 13. Findings and remediations

| ID       | Severity | Finding                                                                                                                                                                    | Remediation                                                                                                                     | Status     |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| F-2B-001 | HIGH     | 2B.4 required a complete transition table but provided only prose.                                                                                                         | Added the structural state/event table, terminal rules, duplicate/out-of-order behavior and policy-change fail-closed handling. | REMEDIATED |
| F-2B-002 | HIGH     | Valid, displayable, comparable, actionable analytics and executable inputs were not formally separated.                                                                    | Added the monotonic usability classifications to the plan, domain, API, security and acceptance contracts.                      | REMEDIATED |
| F-2B-003 | HIGH     | R-080–R-088 lacked separately reviewable detection, recovery and residual-risk evidence.                                                                                   | Added a Phase 2B risk-control companion matrix.                                                                                 | REMEDIATED |
| F-2B-004 | HIGH     | Full formula/rule/policy versions were proposed as metric labels, creating avoidable cardinality growth.                                                                   | Restricted metrics to bounded allowlisted families/buckets; retained full versions only in bounded structured events/results.   | REMEDIATED |
| F-2B-005 | HIGH     | The plan/API used a derived funding name that did not exactly match the frozen Phase 2A.1 contract.                                                                        | Restored `NormalizedFundingRate8hV1` and `normalized-funding-8h/v1`.                                                            | REMEDIATED |
| F-2B-006 | HIGH     | Lifecycle compatibility, opaque IDs, correction/supersession, explicit leg roles, processing timestamps and some provenance/version fields were inherited only implicitly. | Made them explicit in their owning subphase and D-055/D-056 contracts.                                                          | REMEDIATED |

There are no unresolved BLOCKER or HIGH architecture findings.

## 14. Remaining warnings and accepted limitations

- D-055 is unresolved and blocks Phase 2B.1.
- D-056 through D-064 intentionally leave product thresholds and financial
  meaning unresolved until their owning subphase is approved.
- Bybit full silent-gap detection remains `RESEARCH_REQUIRED`; therefore a
  required Bybit executable book cannot silently pass an actionability policy
  that requires verified sequence validation.
- History persistence and retention remain separate decisions and are not
  implemented.
- Conservative bounds may reject legitimate large analytical workloads; silent
  partial sampling is prohibited.
- The historical phase labels retained in `ACCEPTANCE_CRITERIA.md` remain
  non-authoritative and explicitly marked legacy.

## 15. Verification evidence

The final authoritative results after all review remediations are:

| Check                       | Command/evidence                                                                                                                                     | Result                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Changed-document formatting | `node node_modules/prettier/bin/prettier.cjs --check <10 reviewed/changed documents>`                                                                | PASS                                                                            |
| Repository formatting       | `npm run format:check`                                                                                                                               | PASS                                                                            |
| Pinned runtime              | quality image `arbitrage-quality:phase2a4-acceptance-final2`                                                                                         | Node `v24.18.0`                                                                 |
| Lint                        | `npm run lint` in the pinned quality image                                                                                                           | PASS, 6/6 Node workspaces                                                       |
| TypeScript                  | `npm run typecheck` in the pinned quality image                                                                                                      | PASS, 6/6 Node workspaces                                                       |
| Default Node tests          | `npm test` in the pinned quality image                                                                                                               | PASS: 33 test files, 264 tests passed; 3 opt-in live-canary files/tests skipped |
| Markdown/document links     | bounded local validation over the 10 reviewed/changed documents                                                                                      | PASS, every relative Markdown link resolves                                     |
| Required subphase structure | bounded heading validation                                                                                                                           | PASS: 7/7 subphases and 16/16 required section families                         |
| Whitespace diff             | `git diff --check`                                                                                                                                   | PASS                                                                            |
| Frozen packages             | `git diff --name-only -- packages/market-data packages/okx-public-adapter packages/binance-usdm-public-adapter packages/bybit-linear-public-adapter` | PASS, empty                                                                     |
| Documentation-only scope    | tracked diff and dependency/application/infrastructure path scans                                                                                    | PASS, no non-document change                                                    |
| `docs/brand/` preservation  | SHA-256 inventory after review                                                                                                                       | Three original untracked files present; no review edit                          |

No live exchange canary is required for this documentation-only review.

## 16. Freeze and next-task recommendation

The Phase 2B architecture plan **may be frozen** because section 15 passes.
Freezing the plan accepts its decomposition and fail-closed boundaries; it does
not approve any implementation or resolve D-055 through D-064.

Phase 2B.1 is **not permitted to begin** because D-055 is not resolved.

Exact recommended next task:

```text
Read AGENTS.md, docs/PHASE_2B_SPREAD_ANALYTICS_PLAN.md,
docs/PHASE_2B_ARCHITECTURE_ACCEPTANCE.md,
docs/adr/0009-spread-analytics-boundary.md, docs/DOMAIN_MODEL.md,
docs/API_CONTRACTS_PLAN.md, docs/SECURITY_MODEL.md,
docs/DECISIONS_REQUIRED.md, docs/RISK_REGISTER.md and
docs/ACCEPTANCE_CRITERIA.md completely.

Perform a documentation-only product-owner decision task for D-055 — Canonical
instrument compatibility and mapping governance.

Do not implement Phase 2B.1 and do not modify application code or frozen
adapter packages. Decide and record: the initial pilot compatibility matrix;
venue/product/market/contract and lifecycle compatibility; canonical
base/quote/settlement requirements; expiry rules and tolerances; multiplier,
contract-value-unit and cardinality rules; unsupported/unknown behavior;
manual mapping ownership; proposer/reviewer authority; evidence requirements;
effective-time semantics; immutable versioning; conflict quarantine;
correction, supersession and rollback; deterministic completeness classes; and
the exact acceptance fixtures required before implementation.

Preserve opaque official instrument IDs and USDT/USDC separation. Ticker text
alone must never create canonical identity. Do not introduce persistence, UI,
Telegram, positions, authenticated APIs, paper/live trading, Risk Engine,
Execution Engine, AI, billing or commerce. Do not create a commit.

At the end report the exact approved D-055 decision, rejected alternatives,
remaining blockers, documents changed, verification performed, and whether a
separate Phase 2B.1 implementation task may now be approved.
```
