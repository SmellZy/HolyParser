# Phase 2B — Spread Analytics Core decomposition

Status: **DOCUMENTATION PLAN — PRODUCT-OWNER APPROVAL REQUIRED BEFORE IMPLEMENTATION**  
Scope date: 2026-08-03  
Depends on: frozen and approved Phases 2A.1 through 2A.4

## 1. Purpose and authority

Phase 2B turns validated public market-data observations into deterministic,
read-only spread analytics. It does not create trading authority. This document
decomposes the work into seven independently testable and independently
freezable subphases.

No Phase 2B implementation is authorized by this plan. Each subphase requires
separate product-owner approval. Phase 2B must not modify the frozen canonical
market-data or venue-adapter packages.

## 2. Boundary and non-goals

The future analytics core consumes versioned canonical inputs and emits
versioned analytical results:

```text
frozen public adapters -> canonical observations -> Spread Analytics Core
                                                -> analytical results only
```

The boundary has no network client, exchange credential, persistence, event
bus, UI, Telegram integration, user position, authenticated API, paper or live
execution, Risk Engine, Execution Engine, AI, or billing responsibility.

Analytics must never:

- construct canonical identity from ticker text alone;
- treat USDT and USDC as interchangeable;
- convert an unknown, unsupported, unverified, or research-required value to
  zero or to a supported value;
- silently round a financial value;
- emit actionable output from stale, gapped, disabled, invalid, or ambiguous
  required inputs;
- describe an observation as guaranteed profit;
- call an exchange adapter, Risk Engine, or Execution Engine directly.

Persistence and public API delivery are future consumers of the contracts in
this plan, not parts of Phase 2B.

## 3. Sequence and dependency gates

| Order | Subphase                                      | Independently testable result                                  | Dependency                                           |
| ----: | --------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
|     1 | 2B.1 Canonical Instrument Matching Foundation | Reviewed, versioned match or typed non-match/quarantine        | Frozen 2A metadata contracts                         |
|     2 | 2B.2 Executable Spread Mathematics            | Exact, direction-aware depth and spread result                 | Frozen 2B.1 match contract                           |
|     3 | 2B.3 Funding Differential                     | Native and explicitly normalized funding comparisons           | Frozen 2B.1; 2B.2 units where cash flow is requested |
|     4 | 2B.4 Opportunity Lifecycle                    | Deterministic lifecycle over versioned analytics inputs        | Frozen 2B.2 and 2B.3                                 |
|     5 | 2B.5 Anomaly Detection                        | Deterministic, rule-versioned anomaly observations             | Frozen 2B.1–2B.4 contracts                           |
|     6 | 2B.6 Spread History                           | Immutable history/replay/export contracts, without persistence | Frozen formula and lifecycle versions                |
|     7 | 2B.7 Ranking                                  | Reproducible eligibility and ranking results                   | Frozen 2B.2–2B.6 inputs                              |

A later subphase may consume only frozen public contracts from earlier
subphases. A change to a frozen formula or identity contract requires a new
version; it must not rewrite prior analytical meaning.

## 4. Shared contracts and invariants

### 4.1 Exact-decimal policy

All price, quantity, notional, rate, percentage, multiplier, fee, slippage,
PnL-like scenario value, VWAP, and score component values use the frozen exact
decimal type. External decimal strings remain strings until validated.

- No `number`, float, or double represents a financial value.
- Addition, subtraction, and multiplication are exact within configured domain
  bounds.
- Division requires an explicitly named scale and rounding policy.
- A result records the formula ID, formula version, rounding policy, and input
  revision.
- Overflow, excessive scale, divide-by-zero, incompatible units, and missing
  required operands return typed unavailable/error results; they do not round
  or default silently.
- Percentage output is distinct from a unitless rate. A percentage calculation
  multiplies by exactly `100` only in its named formula.

### 4.2 Knowledge, capability, and quality

Every required input retains both capability state and value knowledge:

- capability: `SUPPORTED`, `UNSUPPORTED`, `UNVERIFIED`, or
  `RESEARCH_REQUIRED`;
- value: `KNOWN`, `UNKNOWN`, or `NOT_APPLICABLE`;
- quality: the frozen market-data quality vocabulary, including `HEALTHY`,
  `DEGRADED`, `STALE`, `GAPPED`, `RECONNECTING`, `DISABLED`, `UNSUPPORTED`,
  `UNVERIFIED`, and `RESEARCH_REQUIRED`.

Only `SUPPORTED` plus a `KNOWN` value may satisfy a required capability gate.
`DEGRADED` may be shown as non-actionable diagnostic output only when a
versioned policy explicitly permits it. `STALE`, `GAPPED`, `RECONNECTING`,
`DISABLED`, `UNSUPPORTED`, `UNVERIFIED`, `RESEARCH_REQUIRED`, invalid, locked,
or crossed executable-book input is always non-executable.

Freshness is evaluated by a versioned policy keyed by venue, product group,
channel, and observation kind. There is no global timeout. A result records the
policy ID and every source timestamp used in its decision.

### 4.2.1 Validity, presentation, comparison, and actionability

These classifications are separate and monotonic; none grants trading
authority:

| Classification            | Meaning                                                                                                                                                                | Minimum gate                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `EXECUTABLE_MARKET_INPUT` | A source input, such as an order book, is initialized, supported, fresh, integrity-valid, unlocked, uncrossed, and complete for its declared coverage.                 | Frozen market-data integrity and freshness policy passes.                                          |
| `VALID_ANALYTICS`         | A named formula was evaluated exactly from schema-valid inputs and produced a typed result.                                                                            | Formula, units, bounds, and provenance are valid; the result may still be stale or non-comparable. |
| `DISPLAYABLE_ANALYTICS`   | A valid result may be shown with its time, units, quality, capability, limitations, and unavailable fields visible.                                                    | Presentation policy permits its quality; it is explicitly labelled diagnostic when non-actionable. |
| `COMPARABLE_ANALYTICS`    | Two or more valid results have an approved match, compatible semantics, units, formula versions, and comparison horizon.                                               | Compatibility policy passes; freshness or depth may still prevent actionability.                   |
| `ACTIONABLE_ANALYTICS`    | A comparable result satisfies every approved mapping, capability, freshness, skew, integrity, full-depth, required-cost, funding-semantic, and settlement-timing gate. | All required inputs are known and supported, and every required book is `EXECUTABLE_MARKET_INPUT`. |

`PARTIAL_DEPTH`, `AMBIGUOUS`, `INVALID`, `LOCKED`, and `CROSSED` are explicit
analytical/input reason states even where they are not members of the frozen
market-data quality enum. Together with `STALE`, `GAPPED`, `RECONNECTING`,
`DEGRADED`, `DISABLED`, `UNSUPPORTED`, `UNVERIFIED`, and `RESEARCH_REQUIRED`,
they prohibit `ACTIONABLE_ANALYTICS`. A value can therefore be valid and
displayable while remaining non-comparable or non-actionable.

### 4.3 Revision and provenance envelope

Every analytical output contains:

- deterministic result ID or idempotency key;
- formula or rule ID and version;
- input-revision ID and ordered input references;
- instrument-match version;
- source/provenance IDs;
- exchange, receive, processing, and calculation times where applicable;
- freshness-policy ID and quality decision;
- capability and knowledge states;
- exact units and rounding policy;
- unavailable reason code when no value is produced.

Metric labels use finite allowlisted enums only: component, operation, bounded
formula/rule family, quality class, capability class, outcome class, and reason
code. Full formula, rule, policy, mapping, and input versions belong in bounded
structured events, not metric labels. Symbols, instrument IDs, asset IDs,
mapping IDs, URLs, payloads, user text, and raw error messages are prohibited
metric labels.

### 4.4 Conceptual ports

These are future in-process contracts, not network APIs:

- `InstrumentMatchEvaluator` — evaluates and versions match evidence;
- `ExecutableSpreadCalculator` — consumes a validated match, two immutable
  books, requested size, and explicit cost inputs;
- `FundingDifferentialCalculator` — compares compatible native observations
  and produces separately named derived comparisons;
- `OpportunityStateMachine` — applies versioned qualification rules;
- `DeterministicAnomalyDetector` — evaluates explicit rules over bounded
  windows;
- `SpreadObservationSink` and `SpreadHistoryReader` — contracts only in 2B.6;
  persistence implementations remain deferred;
- `OpportunityRanker` — applies eligibility gates before deterministic ranking.

Ports return typed success, unavailable, rejected, or quarantined outcomes.
Unsupported capabilities do not receive fake empty implementations.

## 5. Formula catalogue requiring approval

The following candidate formulas make the unresolved choices visible. They are
not product approval merely because they appear here.

### 5.1 Midpoint and directional spread

For a valid book:

```text
mid = (bestBid + bestAsk) / 2
```

Division uses a named midpoint rounding policy. For long venue `L` and short
venue `S`, the candidate directional midpoint spread is:

```text
midSpreadPct = ((midS - midL) / midL) * 100
```

The product owner must approve the denominator and sign convention.

### 5.2 VWAP and depth

After converting every level to the approved common exposure unit:

```text
VWAP = sum(levelPrice * filledQuantity) / sum(filledQuantity)
residualQuantity = requestedQuantity - filledQuantity
```

A buy consumes asks from lowest to highest. A sell consumes bids from highest
to lowest. Full executable output requires `residualQuantity = 0`. A partial
VWAP may be returned only as a clearly named diagnostic and is non-actionable.

### 5.3 Entry and exit spread

For entry, buy the long leg at ask-side VWAP and sell the short leg at bid-side
VWAP:

```text
entrySpreadPct =
  ((shortSellVWAP - longBuyVWAP) / longBuyVWAP) * 100
```

For exit, sell the long leg to bids and buy the short leg from asks. The
candidate current directional exit spread is:

```text
exitSpreadPct =
  ((shortBuyToCoverVWAP - longSellToCloseVWAP) / longSellToCloseVWAP) * 100
```

`entrySpreadPct - exitSpreadPct` is not itself asserted to be monetary PnL.
PnL requires leg quantities, exact units, fees, slippage, settlement currency,
and any conversion policy.

### 5.4 Slippage and fees

Candidate leg slippage uses an explicitly supplied reference price:

```text
buySlippagePct  = ((buyVWAP - referencePrice) / referencePrice) * 100
sellSlippagePct = ((referencePrice - sellVWAP) / referencePrice) * 100
feeAmount       = filledFeeBasisNotional * feeRate
```

The reference-price kind, fee basis, maker/taker assumption, fee currency, and
rounding policies require approval. Unknown required fees or slippage make
expected net unavailable.

### 5.5 Funding comparison and cash-flow scenario

For compatible semantics and units only:

```text
directionalNativeDifferential = shortNativeRate - longNativeRate
longFundingCashFlow  = -longFundingBasisNotional * longNativeRate
shortFundingCashFlow =  shortFundingBasisNotional * shortNativeRate
netFundingCashFlow   = longFundingCashFlow + shortFundingCashFlow
```

The signs describe the usual positive-rate convention but require source-backed
adapter semantics and product-owner approval. Cash-flow values are scenario
estimates unless both applicable settlements are realized.

The separately named Phase 2A.1 derived comparison is:

```text
NormalizedFundingRate8hV1.rate = nativeRate * (8 hours / nativeInterval)
formulaId = "normalized-funding-8h/v1"
```

It is unavailable when interval, semantic compatibility, or required timing is
unknown. It never replaces the venue-native value.

### 5.6 Expected result

No generic expected-net number exists until a versioned scenario defines each
required component:

```text
expectedNet = expectedGrossConvergence
            + expectedFundingCashFlow
            - knownTradingFees
            - knownSlippageCost
            - otherRequiredKnownCosts
```

If any policy-required cost is unknown, the result is `UNAVAILABLE`, not a
number with the missing component set to zero.

## 6. Phase 2B.1 — Canonical Instrument Matching Foundation

### 6.1 Scope

Define deterministic matching between two canonical venue instruments without
changing either instrument's identity. Evaluate venue/product group, base,
quote, settlement, market type, contract type, expiry, multiplier and unit
compatibility, plus lifecycle/status compatibility. Official instrument IDs are
opaque and are never parsed. Support reviewed manual mappings with provenance,
effective time, immutable versioning, explicit supersession/correction links,
conflict quarantine, and proposer/reviewer separation.

The concrete pilot, evidence, governance and resource policy is recorded in
[`PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION.md`](PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION.md).
It is a D-055-only decision supplement: the accepted decomposition, frozen
market-data identity and later spread/funding formulas remain unchanged.
Product scope is recorded. Authority completion dated 2026-09-14 is recorded
in the separate [Quant](PHASE_2B_D055_QUANT_ATTESTATION.md),
[Market Data](PHASE_2B_D055_MARKET_DATA_ATTESTATION.md) and matching-only
[D-064](PHASE_2B_D064_MATCHING_APPROVAL.md) records: explicit APPROVE against
D-055 `instrument-matching-pilot/v1`, exact complete snapshot SHA-256
`60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`;
D-064 scope `instrument-matching-resources/v1`. The review snapshot remains
byte-identical. Independent formal decision acceptance and separate Phase
2B.1 implementation authorization remain gates, not presumed approvals.

### 6.2 Non-goals

No ticker-only auto-match, probabilistic auto-approval, asset-price conversion,
DEX token matching, database, admin UI, order book, spread calculation, or
trading eligibility.

### 6.3 Domain entities and value objects

- `InstrumentMatchCandidate`
- `InstrumentMatchEvidence`
- `InstrumentCompatibilityAssessment`
- `CanonicalInstrumentMatch`
- `ManualMappingProposal`
- `MappingReview`
- `MappingVersion`
- `MappingEffectivePeriod`
- `MappingConflict`
- `MatchConfidenceClass`
- `MatchOutcome`

Confidence is deterministic data completeness (`EXACT_METADATA`,
`REVIEWED_MANUAL`, `AMBIGUOUS`, `INSUFFICIENT`) and never a probability or an
auto-approval threshold.

### 6.4 Ports and interfaces

`InstrumentMatchEvaluator.evaluate(candidate, policy)` returns exactly one of
`MATCHED`, `NOT_MATCHED`, `AMBIGUOUS`, `QUARANTINED`, or `UNAVAILABLE`, with
reason codes. `ManualMappingRegistry` is an interface only; a fixture-backed
in-memory test double is sufficient. No persistence port implementation is in
scope.

### 6.5 Inputs and outputs

Inputs are immutable instrument metadata, canonical asset resolutions,
capability states, lifecycle/status, mapping proposals/reviews, policy version,
and evaluation time. Output is a versioned match record or typed non-match.
Original official instrument IDs remain intact and opaque.

### 6.6 Exact-decimal rules

Multiplier and contract-value comparisons use exact decimals and explicit
units. Scale normalization must not imply economic equivalence. Any required
division uses a named policy; the D-055 pilot requires no division for matching
and unknown multiplier/unit yields `UNAVAILABLE`. Requested-size conversion,
rounding and spread formulas remain D-056–D-058 responsibilities.

### 6.7 Data-quality and freshness gates

Metadata must be supported, known, within its configured metadata-age policy,
and not quarantined. Lifecycle-inactive instruments cannot produce an active
match. An expired mapping version is unavailable for new calculations.

### 6.8 Capability-state handling

Unsupported market types return `NOT_MATCHED`; unresolved asset identity is
`AMBIGUOUS`, conflicting evidence is `QUARANTINED`, and required unverified or
research-required economics is `UNAVAILABLE` under D-055. None can be promoted
by display-symbol equality or manual approval of an unknown frozen field.

### 6.9 Deterministic fixtures

Fixtures cover same-base USDT perpetuals, USDT versus USDC, different base
assets sharing a ticker, linear versus inverse, perpetual versus delivery,
same and different expiry, compatible/incompatible multiplier units, inactive
instruments, manual alias with independent Quant and Market Data reviewers
distinct from the proposer, expired mappings, and
conflicting mappings. Every fixture records source IDs and synthetic
transformations. D-055 section 12 enumerates 29 cases with expected outcomes
and finite reasons, including native-family veto, exact factor compatibility,
historical correction and all-or-nothing bounds.

### 6.10 Unit and property tests

Test identity opacity, symmetry of compatibility where appropriate,
non-transitivity of unapproved aliases, USDT/USDC inequality, proposer/reviewer
separation, effective-time boundaries, immutable versions, conflict
quarantine, and rejection of ticker-only evidence.

### 6.11 Replay and fault injection

Replaying the same ordered metadata and mapping events yields the same match
version. Faults include missing assets, conflicting reviews, clock-boundary
changes, excessive mapping chains, duplicate events, and maliciously long IDs.

### 6.12 Observability

Events: match evaluated, matched, not matched, ambiguous, conflict
quarantined, mapping proposed/reviewed/activated/expired. Finite labels:
outcome, reason code, bounded policy family, market-type class, and confidence
class. The full policy and mapping versions are structured-event fields only.

### 6.13 Security and DoS boundaries

Bound candidate batch size, mapping-chain depth, identifier length, evidence
count, conflict-set size, and evaluation time. Manual mappings require audit
identity and four-eyes review; raw free text is not a metric label.

### 6.14 Risks and deferred decisions

D-055 records the exact pilot matrix, asset registry, multiplier/unit,
cardinality, lifecycle, evidence time, governance and correction/rollback
choices. Dated, inverse, spot and special native families are excluded; USDT
and USDC never merge. No live cross-venue match is currently approved because
frozen Binance/Bybit economics remain incomplete. Quant/Market Data and
matching-only D-064 authority approvals are now explicitly recorded to the
identical snapshot/version. Independent formal D-055 acceptance and separate
implementation authorization remain required; later financial and production
SRE decisions are not resolved here. Zero approved pairs is accepted by the
independent reviewers as fail-closed behavior, not permission to widen rules.

### 6.15 Acceptance criteria

- all match outcomes are typed and reproducible;
- no ticker-only evidence creates a match;
- USDT and USDC never match implicitly;
- unknown units, conflicts, and unreviewed mappings cannot become usable;
- mapping version, provenance, reviewer separation, and effective time are
  enforced;
- official IDs remain opaque and corrections create a superseding version
  rather than mutating historical mappings;
- exact-decimal, hostile-input, replay, property, and fault tests pass;
- no network, persistence, adapter, UI, or trading dependency is introduced.

### 6.16 Freeze requirements

Approve the compatibility matrix and D-055, publish the match contract and
reason-code catalogue, pass authoritative repository verification, record a
formal acceptance report, and freeze before 2B.2 begins.

## 7. Phase 2B.2 — Executable Spread Mathematics

### 7.1 Scope

Define direction-aware midpoint, depth consumption, VWAP, entry spread, exit
spread, partial depth, residual exposure, explicit fees, and explicit slippage
using exact units and immutable book revisions.

### 7.2 Non-goals

No opportunity state, future-price prediction, position PnL, order simulation,
fee scraping, persistence, API transport, or execution.

### 7.3 Domain entities and value objects

- `SpreadDirection`
- `LegRole` (`LONG_BUY`, `SHORT_SELL`, `LONG_SELL_TO_CLOSE`, or
  `SHORT_BUY_TO_COVER`)
- `RequestedExposure`
- `ExposureUnit`
- `BookInputRevision`
- `DepthConsumption`
- `ExecutableLegQuote`
- `PartialDepthDiagnostic`
- `ResidualExposure`
- `SpreadCalculation`
- `CostInput`
- `SlippageObservation`
- `ExpectedResultAvailability`

### 7.4 Ports and interfaces

`ExecutableSpreadCalculator.quote(input, formulaPolicy)` is pure and returns a
complete quote, a non-actionable partial diagnostic, or typed unavailable. A
test fixture supplies books; there is no adapter call.

### 7.5 Inputs and outputs

Inputs: frozen match version, long/short direction, immutable valid books,
requested exposure with unit, multiplier conversions, explicit costs,
freshness policy, and calculation time. Outputs explicitly identify buy/sell
venue, long/short venue, leg role, both fills, VWAPs, residuals, formulas, exact
units, quality, provenance, and availability.

### 7.6 Exact-decimal rules

Use the candidate formula catalogue only after D-056 through D-058 approve
size, sign, denominator, fee basis, reference price, scales, and rounding.
There is no implicit base/quote/settlement conversion.

### 7.7 Data-quality and freshness gates

Both books must be initialized, non-empty, uncrossed, unlocked, supported,
fresh under their own policies, and based on the approved match version. Full
actionability requires enough depth on both legs at the same requested
exposure and an allowed receive-time skew.

### 7.8 Capability-state handling

Missing snapshot/delta integrity, unverified conversion units, or
research-required book semantics makes executable spread unavailable. A
midpoint may be a diagnostic only when its own required top-of-book inputs are
healthy.

### 7.9 Deterministic fixtures

Include one- and multi-level books, asymmetric depth, partial long/short leg,
zero deletion already reflected in the revision, USDT/USDC mismatch, contract
multipliers, locked/crossed/stale/gapped books, fees known/unknown, and extreme
exact decimals.

### 7.10 Unit and property tests

Test direction, bid/ask consumption, formula signs, exact VWAP, scale and
overflow rejection, no silent rounding, zero/insufficient depth, and unit
compatibility. On one static valid side, increasing requested quantity must
never improve buy VWAP and must never improve sell VWAP from the taker's
perspective.

### 7.11 Replay and fault injection

The same ordered inputs yield byte-equivalent canonical results. Inject stale
transitions, book replacement, level reordering, duplicate levels, excessive
depth, invalid prices/quantities, timestamp skew, and cost disappearance.

### 7.12 Observability

Events: calculation completed/unavailable, insufficient depth, partial depth,
unit mismatch, stale input, invalid book, overflow, unknown cost. Finite labels:
bounded formula family, outcome, reason code, exposure-unit class, and quality
class. Full formula/input revisions remain structured-event fields.

### 7.13 Security and DoS boundaries

Bound levels consumed, requested-exposure magnitude and digit length, requested
sizes per batch, number of pair calculations, decimal digits/scale, formula
operations, and replay size. Never include symbols or prices in metric labels.

### 7.14 Risks and deferred decisions

Requested-size unit, conversion basis, full-versus-partial policy, time skew,
entry/exit sign and denominator, slippage reference, fee basis, and expected
gross scenario require D-056 through D-058.

### 7.15 Acceptance criteria

- long/short and entry/exit sides are unambiguous and tested;
- VWAP and residual quantities are exact and unit-labelled;
- insufficient/partial depth never becomes a full executable quote;
- stale, gapped, locked, crossed, or incompatible inputs are unavailable;
- unknown required cost makes expected net unavailable;
- monotonic VWAP, deterministic replay, overflow, fault, and property tests
  pass.

### 7.16 Freeze requirements

D-056 through D-058 approved, formula vectors independently reviewed, public
contract versioned, full suite green, formal acceptance recorded, and no
adapter change.

## 8. Phase 2B.3 — Funding Differential

### 8.1 Scope

Compare venue-native funding without changing its semantic, optionally derive
a separately named normalized comparison, align future settlement scenarios,
and calculate exact directional cash-flow scenarios only when all required
inputs are compatible and known.

### 8.2 Non-goals

No funding prediction, universal eight-hour assumption, position accounting,
realized PnL, settlement ingestion, persistence, or trading decision.

### 8.3 Domain entities and value objects

- `FundingComparisonInput`
- `FundingSemanticCompatibility`
- `NativeFundingDifferential`
- `NormalizedFundingComparisonV1`
- `SettlementAlignment`
- `FundingBasisNotional`
- `FundingCashFlowScenario`
- `FundingComparisonAvailability`

### 8.4 Ports and interfaces

`FundingDifferentialCalculator.compare(input, policy)` returns native values
unchanged plus any explicitly available derived result. It never calls a venue
or relabels `CURRENT`, `LAST`, `PREDICTED`, or `UNKNOWN`.

### 8.5 Inputs and outputs

Inputs include match version, two funding observations, semantics, native
intervals, next settlement times, direction, basis notionals and currencies,
funding-rate units, freshness policy, and formula version. Outputs retain every
native input and explain why each derived field is known or unavailable.

### 8.6 Exact-decimal rules

Rates and cash flows use exact decimals. Normalization division and cash-flow
rounding require named policies. Rates with different semantics or settlement
currencies are not subtracted merely because their decimal representation is
valid.

### 8.7 Data-quality and freshness gates

Both observations must satisfy semantic-specific freshness. A future cash-flow
scenario requires applicable future semantics, supported funding on both
products, known intervals where needed, aligned settlement under an approved
window, and known funding-basis notionals.

### 8.8 Capability-state handling

Predicted funding may contribute only when officially supported and observed.
Binance `LAST`, Bybit `CURRENT`, and OKX state-dependent semantics remain
distinct. Delivery futures with unsupported funding are `NOT_APPLICABLE`, not
zero.

### 8.9 Deterministic fixtures

Cover equal/different native intervals, unknown interval, semantic mismatch,
missing next settlement, aligned/misaligned settlements, positive/negative/zero
rates, delivery futures, stale observations, different settlement currencies,
and normalized-v1 vectors.

### 8.10 Unit and property tests

Test sign symmetry after swapping long/short with approved semantics, native
value preservation, normalization scale, zero versus unknown, interval bounds,
settlement windows, delivery exclusion, and no semantic relabeling.

### 8.11 Replay and fault injection

Replay yields identical native and derived records. Inject missing intervals,
settlement rollover, stale timestamps, semantic drift, extreme rates,
unsupported funding, and mid-calculation policy-version changes.

### 8.12 Observability

Events: comparison completed/unavailable, semantic mismatch, interval unknown,
settlement misaligned, funding unsupported, normalization completed. Finite
labels: semantic pair class, availability, reason code, bounded formula family,
and quality class. Full formula/input versions remain structured-event fields.

### 8.13 Security and DoS boundaries

Bound comparison batches, settlement horizon, interval representation, decimal
size, provenance count, and replay window. Do not label metrics by symbol,
venue-native rate, or settlement timestamp.

### 8.14 Risks and deferred decisions

Semantic compatibility matrix, funding direction, settlement-alignment window,
basis notional/currency, normalized scale/rounding, and use of `CURRENT` versus
`PREDICTED` in expected scenarios require D-059.

### 8.15 Acceptance criteria

- venue-native value, semantic, interval, times, and provenance are preserved;
- current, last, predicted, unknown, and not-applicable are distinguishable;
- no universal interval is hardcoded;
- normalization is separately named/versioned and unavailable without an
  interval;
- incompatible timing/semantics cannot produce expected cash flow;
- exact sign, interval, replay, property, and fault tests pass.

### 8.16 Freeze requirements

D-059 and all sign/normalization vectors approved, capability matrix reconciled
with frozen adapters, formal acceptance recorded, and formula version frozen.

## 9. Phase 2B.4 — Opportunity Lifecycle

### 9.1 Scope

Define a deterministic, idempotent lifecycle over versioned spread, funding,
depth, freshness, and mapping inputs.

### 9.2 Non-goals

No alert delivery, user preference, position, order, recommendation, ML, or
execution authority.

### 9.3 Domain entities and value objects

- `Opportunity`
- `OpportunityKey`
- `OpportunityRevision`
- `QualificationPolicy`
- `QualificationWindow`
- `OpportunityTransition`
- `SuppressionReason`
- `OpportunityState`

States are `DISCOVERED`, `QUALIFYING`, `ACTIVE`, `CONVERGING`, `DEGRADED`,
`SUPPRESSED`, `EXPIRED`, and `RESOLVED`.

### 9.4 Ports and interfaces

`OpportunityStateMachine.apply(current, event, policy)` is a pure transition
function. A bounded in-memory replay harness supplies events; no persistence or
notification provider is implemented.

### 9.4.1 Structural transition table

D-060 must approve the predicates and durations that produce these events, but
an implementation may not invent another transition. `NO_RECORD` is the absence
of an opportunity aggregate, not a persisted state.

| Current state                                                     | Event                                       | Next state                 | Required structural behavior                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `NO_RECORD`                                                       | `CANDIDATE_OBSERVED`                        | `DISCOVERED`               | Create one revision for the deterministic opportunity key.                                           |
| `DISCOVERED`                                                      | `QUALIFICATION_GATES_PASS`                  | `QUALIFYING`               | Start the versioned minimum-duration window.                                                         |
| `QUALIFYING`                                                      | `QUALIFICATION_TICK`                        | `QUALIFYING`               | Advance only monotonic evaluation time; do not reset on duplicates.                                  |
| `QUALIFYING`                                                      | `QUALIFICATION_RESET`                       | `DISCOVERED`               | Clear the qualification window using the approved reason code.                                       |
| `QUALIFYING`                                                      | `MINIMUM_DURATION_SATISFIED`                | `ACTIVE`                   | Require unchanged policy compatibility and all current actionability gates.                          |
| `ACTIVE`                                                          | `CONVERGENCE_CRITERIA_MET`                  | `CONVERGING`               | Preserve the same opportunity key and input lineage.                                                 |
| `CONVERGING`                                                      | `CONVERGENCE_BROKEN`                        | `ACTIVE`                   | Allowed only when all current actionability gates still pass.                                        |
| `ACTIVE` or `CONVERGING`                                          | `QUALIFICATION_CRITERIA_LOST`               | `QUALIFYING`               | Revoke actionability and start a new qualification window.                                           |
| `ACTIVE` or `CONVERGING`                                          | `RESOLUTION_CRITERIA_MET`                   | `RESOLVED`                 | Record a terminal resolution revision.                                                               |
| `DISCOVERED`, `QUALIFYING`, `ACTIVE`, or `CONVERGING`             | `REQUIRED_GATE_FAILED`                      | `DEGRADED`                 | Revoke actionability immediately and record the failed gate.                                         |
| `DEGRADED`                                                        | Further `REQUIRED_GATE_FAILED`              | `DEGRADED`                 | Record a new revision only for a new ordered gate event; duplicates are no-ops.                      |
| `SUPPRESSED`                                                      | `REQUIRED_GATE_FAILED`                      | `SUPPRESSED`               | Preserve suppression and record the failed gate for later re-evaluation.                             |
| `DEGRADED`                                                        | `REQUIRED_GATES_RESTORED`                   | `QUALIFYING`               | Start a new qualification window; never jump directly to `ACTIVE`.                                   |
| Any non-terminal state                                            | `SUPPRESSION_APPLIED`                       | `SUPPRESSED`               | Revoke actionability and record the versioned suppression reason.                                    |
| `SUPPRESSED`                                                      | `SUPPRESSION_CLEARED`                       | `QUALIFYING` or `DEGRADED` | Enter `QUALIFYING` only if all required gates pass; otherwise enter `DEGRADED`.                      |
| `DISCOVERED`, `QUALIFYING`, `ACTIVE`, `CONVERGING`, or `DEGRADED` | `POLICY_VERSION_CHANGED`                    | `QUALIFYING` or `DEGRADED` | Revoke actionability and re-evaluate all gates; pass enters `QUALIFYING`, failure enters `DEGRADED`. |
| `SUPPRESSED`                                                      | `POLICY_VERSION_CHANGED`                    | `SUPPRESSED`               | Preserve suppression and require the new policy during `SUPPRESSION_CLEARED`.                        |
| Any non-terminal state                                            | `EXPIRY_REACHED`                            | `EXPIRED`                  | Record a terminal expiry revision.                                                                   |
| Any state                                                         | Exact duplicate event/revision              | Same state                 | Idempotent no-op; do not refresh freshness or timers.                                                |
| Any state                                                         | Out-of-order, conflicting, or unknown event | Same state                 | Reject without mutation and emit a finite reason code.                                               |
| `RESOLVED` or `EXPIRED`                                           | Any non-duplicate event                     | Same terminal state        | Reject without mutation; a later occurrence requires a new deterministic opportunity key/generation. |

All other state/event pairs are forbidden and rejected without mutation. The
exact definitions of discovery, qualification, convergence, resolution,
suppression, expiry, generation, and minimum duration remain D-060 blockers.

### 9.5 Inputs and outputs

Inputs are uniquely keyed match/formula revisions, observations, monotonic
evaluation time, and qualification policy. Outputs are an immutable state
revision, transition reason, idempotency key, and next evaluation boundary.

### 9.6 Exact-decimal rules

Threshold comparisons use exact decimals with no implicit rounding. Entry and
exit threshold units must match formula output. Hysteresis-like thresholds, if
approved here, are explicit values and versions; alert hysteresis remains 2C.

### 9.7 Data-quality and freshness gates

`ACTIVE` and `CONVERGING` require fresh, complete, supported inputs and full
depth. Any required stale/gapped/invalid input transitions to `DEGRADED` and
revokes actionability. Recovery re-enters `QUALIFYING`; it never jumps directly
to `ACTIVE` without satisfying the current minimum duration.

### 9.8 Capability-state handling

Unsupported/unverified/research-required required capabilities prevent
qualification. Optional capabilities remain explicitly absent and may affect
only a policy that declares them optional.

### 9.9 Deterministic fixtures

Cover discovery, minimum-duration qualification, activation, convergence,
degradation, recovery/requalification, suppression, duplicate input,
out-of-order revision, policy change, expiry, resolution, mapping conflict,
and missing required cost.

### 9.10 Unit and property tests

Test the complete transition table, forbidden transitions, duplicate
idempotency, monotonic revisions, exact boundary times, restart replay, and the
invariant that no actionable state has failed required gates.

### 9.11 Replay and fault injection

Ordered replay must reconstruct exactly the same final state and transition
log. Inject time jumps, duplicate/out-of-order events, stale/recovered inputs,
mapping invalidation, formula-version change, and threshold flapping.

### 9.12 Observability

Events: state transition, duplicate suppressed, invalid transition,
qualification reset, degraded, expired, resolved. Finite labels: from-state,
to-state, bounded policy family, reason code, and outcome. Full policy and
aggregate revisions remain structured-event fields.

### 9.13 Security and DoS boundaries

Bound active keys, events per evaluation, replay length, rule count, and timer
cardinality. Opportunity keys are structured IDs, not untrusted concatenated
strings or metric labels.

### 9.14 Risks and deferred decisions

Entry/exit thresholds, minimum duration, expiry, convergence definition,
requalification period, optional funding gates, duplicate key, and policy
change behavior require D-060.

### 9.15 Acceptance criteria

- every state/event pair has an explicit deterministic outcome;
- duplicates are idempotent and out-of-order revisions fail closed;
- freshness/depth/mapping/cost gates are enforced before actionability;
- degradation revokes actionability and recovery requires requalification;
- replay and transition property tests pass;
- no alert, persistence, position, or execution code exists.

### 9.16 Freeze requirements

D-060 approved, transition table and timers versioned, formal acceptance
recorded, deterministic replay corpus frozen.

## 10. Phase 2B.5 — Deterministic Anomaly Detection

### 10.1 Scope

Detect unusual spread expansion, sudden convergence, venue divergence,
mark/index divergence, funding discontinuity, liquidity collapse, stale-source,
crossed/invalid-source, mapping conflict, and abnormal quality degradation with
explicit deterministic rules.

### 10.2 Non-goals

No ML, AI, adaptive black-box thresholds, user alert delivery, automated
strategy action, or persistence implementation.

### 10.3 Domain entities and value objects

- `AnomalyRule`
- `AnomalyRuleVersion`
- `BoundedBaselineWindow`
- `AnomalyEvaluation`
- `AnomalyOccurrence`
- `AnomalySeverity`
- `AnomalyEvidence`

### 10.4 Ports and interfaces

`DeterministicAnomalyDetector.evaluate(window, rules)` emits typed occurrences
and unavailable results. Rules are injected versioned data; no remote rule
service is called.

### 10.5 Inputs and outputs

Inputs are bounded versioned spread/funding/liquidity/quality observations.
Output identifies rule version, baseline window, exact threshold comparison,
input revisions, evidence categories, provenance, severity, and availability.

### 10.6 Exact-decimal rules

Absolute and relative changes use exact decimals. Relative change with a zero
or unknown denominator is unavailable unless a separately named rule defines
another exact basis. No statistical float implementation is permitted.

### 10.7 Data-quality and freshness gates

Market anomalies require healthy comparable inputs. Data-quality anomalies may
be emitted precisely because the input is stale/gapped/invalid, but are always
classified as source-health evidence and never as an executable opportunity.

### 10.8 Capability-state handling

A rule declares mandatory capabilities. Unsupported or unknown mandatory input
produces an unavailable evaluation, except a dedicated capability/quality rule
that reports that condition.

### 10.9 Deterministic fixtures

Include stable baseline, threshold boundary, single spike, sustained expansion,
convergence, venue-only move, mark/index separation, rate discontinuity, depth
collapse, stale source, invalid book, mapping conflict, and missing window.

### 10.10 Unit and property tests

Test exact threshold boundaries, window ordering, no future leakage,
permutation rejection, zero denominators, duplicate inputs, quality rule
separation, and deterministic severity.

### 10.11 Replay and fault injection

Replay produces the same occurrences and IDs. Inject gaps, clock skew,
out-of-order samples, baseline truncation, extreme values, rule replacement,
and bounded-window exhaustion.

### 10.12 Observability

Events: anomaly emitted/resolved, evaluation unavailable, threshold crossed,
baseline insufficient, quality anomaly. Finite labels: anomaly type, severity,
bounded rule family, outcome, and reason code. Full rule/input revisions remain
structured-event fields.

### 10.13 Security and DoS boundaries

Bound rule count, window length, observations per key, evaluations per tick,
decimal complexity, and evidence count. No symbol or threshold value is a
metric label.

### 10.14 Risks and deferred decisions

Rule thresholds, window definitions, severity matrix, minimum duration,
baseline method, and whether convergence is an anomaly or lifecycle signal
require D-061.

### 10.15 Acceptance criteria

- every anomaly has deterministic evidence and a versioned rule;
- quality anomalies and market anomalies remain distinct;
- missing/bad inputs cannot create an actionable market signal;
- boundary, window, replay, property, and fault tests pass;
- no AI/ML dependency or adaptive opaque behavior exists.

### 10.16 Freeze requirements

D-061 approved, rule catalogue and fixture corpus frozen, formal acceptance
recorded, performance bounds demonstrated.

## 11. Phase 2B.6 — Spread History Contracts

### 11.1 Scope

Define immutable observation, gap, segment, replay, downsampling-boundary, and
export contracts so later persistence can preserve analytical meaning.

### 11.2 Non-goals

No database, migration, object storage, message bus, retention job, chart API,
or historical backfill.

### 11.3 Domain entities and value objects

- `SpreadObservationRecord`
- `AnalyticsInputRevision`
- `FormulaVersionReference`
- `HistoryGapMarker`
- `HistorySegment`
- `ReplayManifest`
- `DownsamplingSpecification`
- `AnalyticsExportEnvelope`

### 11.4 Ports and interfaces

Define `SpreadObservationSink`, `SpreadHistoryReader`, and `AnalyticsExporter`
contracts. Only bounded in-memory fixture implementations are allowed for
contract and replay tests.

### 11.5 Inputs and outputs

Records include event/exchange/receive/processing/calculation timestamps,
mapping/formula/rule/policy versions, ordered input revisions, exact values and
units, quality, capability, knowledge, provenance, and explicit gaps. Export
includes schema version and ordering guarantees.

### 11.6 Exact-decimal rules

History stores canonical exact-decimal strings and never reserializes through
binary float. Downsampling formulas require their own version, units, scale,
rounding, coverage, and quality rules.

### 11.7 Data-quality and freshness gates

History records all accepted analytical quality states; it never fills missing
periods. Gaps are first-class records. A historical record cannot be relabeled
healthy based on later data.

### 11.8 Capability-state handling

Unsupported/unverified/research-required results remain explicit records when
the capture policy includes them. Export consumers can distinguish unavailable
from missing and not-applicable.

### 11.9 Deterministic fixtures

Include ordered observations, equal timestamps with stable tie-breakers,
explicit gaps, formula upgrades, mapping-version changes, quality transitions,
downsampling boundary cases, and export round trips.

### 11.10 Unit and property tests

Test immutability, stable ordering, lossless decimal round trip, no gap filling,
schema evolution, deterministic export, coverage computation, and live-versus-
replay consistency.

### 11.11 Replay and fault injection

The manifest reproduces the same analytics results from the same source
revisions. Inject truncation, duplicate records, out-of-order segments, missing
formula versions, corrupt decimals, gap boundaries, and export cancellation.

### 11.12 Observability

Events: record accepted/rejected, gap recorded, replay completed/failed, export
bounded/truncated. Finite labels: schema version, record kind, outcome, reason
code, and quality class.

### 11.13 Security and DoS boundaries

Bound records per batch, replay window, export rows/bytes, provenance entries,
segment count, and schema depth. Future exports require authorization and
tenant scoping, but Phase 2B has no user data or delivery endpoint.

### 11.14 Risks and deferred decisions

Retention, raw-versus-derived policy, downsampling functions, timezone/export
format, correction policy, and reproducibility horizon require D-062 and the
existing D-021.

### 11.15 Acceptance criteria

- records are immutable, ordered, versioned, exact, and gap-aware;
- live and replay calculations match for the same input revisions;
- downsampling cannot hide coverage or quality gaps;
- exports are bounded and lossless for exact values;
- contract tests pass with in-memory fixtures only;
- no persistence infrastructure is introduced.

### 11.16 Freeze requirements

D-021/D-062 approved for contract meaning, schema evolution rules published,
round-trip and replay corpus accepted, formal acceptance recorded. Persistence
still requires separate future approval.

## 12. Phase 2B.7 — Deterministic Ranking

### 12.1 Scope

Define eligibility and deterministic ranking from executable spread, funding
differential, expected gross scenario, known fees/slippage, depth, freshness,
quality, settlement timing, residual exposure, and deterministic completeness.

### 12.2 Non-goals

No personalized recommendation, guaranteed-profit claim, ML/AI score, capital
allocation, position context, order routing, notification, or execution.

### 12.3 Domain entities and value objects

- `RankingCandidate`
- `RankingEligibility`
- `DataCompletenessAssessment`
- `RankingPolicy`
- `RankingComponent`
- `RankingResult`
- `RankingTieBreak`
- `ExclusionReason`

Completeness is a deterministic inventory of required known fields, not a
probability of success.

### 12.4 Ports and interfaces

`OpportunityRanker.rank(candidates, policy)` first evaluates eligibility, then
sorts eligible candidates using a versioned deterministic tuple or approved
score. Excluded candidates retain typed reasons and cannot silently enter the
actionable list.

### 12.5 Inputs and outputs

Inputs reference immutable results from 2B.2–2B.6 and a ranking policy.
Outputs include ordered eligible candidates, excluded candidates, component
values, tie-break evidence, input/formula/policy versions, and availability.

### 12.6 Exact-decimal rules

All numeric components and any approved weighted score use exact decimals.
Weights, scales, normalization ranges, clipping, and rounding are explicit
policy data. Missing values are never substituted with zero.

### 12.7 Data-quality and freshness gates

Stale, gapped, invalid, unsupported, unverified, research-required, incomplete
depth, unresolved mapping, unknown required cost, or misaligned required
funding excludes actionability before ranking. Non-actionable diagnostic lists
must be named separately.

### 12.8 Capability-state handling

The policy declares every component required or optional. Required unknown
capability excludes the candidate. Optional absence is reported and affects
completeness exactly as the policy specifies; it is not silently neutral.

### 12.9 Deterministic fixtures

Cover equal spread with different depth, known/unknown fees, settlement
misalignment, residual exposure, stale candidate, mapping conflict, tied
scores, exact boundary values, policy versions, and adversarial candidate
counts.

### 12.10 Unit and property tests

Test permutation-independent ordering, total deterministic tie-breaks,
eligibility before score, monotonic behavior only for components declared
monotonic, exact weights, unknown-cost exclusion, and reproducibility.

### 12.11 Replay and fault injection

Replaying the same candidate set and policy yields identical order and
exclusions. Inject duplicate IDs, missing components, formula-version mismatch,
stale transition, extreme decimals, excessive candidates, and cancellation.

### 12.12 Observability

Events: ranking completed, candidate excluded, tie resolved, policy mismatch,
ranking unavailable. Finite labels: bounded policy family, outcome, exclusion
reason, completeness class, and candidate-count bucket. Full policy/input
versions remain structured-event fields.

### 12.13 Security and DoS boundaries

Bound candidate count, component count, sort work, decimal complexity, and
batch duration. Stable internal IDs may appear in structured audit events but
not metric labels. Copy contracts prohibit guaranteed-profit language.

### 12.14 Risks and deferred decisions

Eligibility policy, required costs, component weights/order, normalization,
tie-breaks, confidence terminology, diagnostic versus actionable lists, and
copy rules require D-063. Scaling limits share D-064.

### 12.15 Acceptance criteria

- eligibility is evaluated before ranking;
- stale/incomplete/unknown-required inputs cannot rank as actionable;
- all component, formula, and policy versions are reconstructible;
- ordering and tie-breaks are deterministic under input permutation;
- expected net is unavailable when a required cost is unknown;
- no AI, personalization, position, or execution dependency exists.

### 12.16 Freeze requirements

D-063/D-064 approved, ranking and copy policies versioned, adversarial bounds
demonstrated, replay corpus accepted, formal acceptance recorded.

## 13. Shared observability contract

Minimum structured event families are:

- `analytics.match.*`;
- `analytics.spread.*`;
- `analytics.funding.*`;
- `analytics.opportunity.*`;
- `analytics.anomaly.*`;
- `analytics.history.*`;
- `analytics.ranking.*`.

All events have bounded schemas, event version, component, outcome, finite
reason code, calculation time, input revision, and policy/formula version.
Payload excerpts, full books, source messages, symbols, and raw errors are not
logged. Cardinality and payload-size tests are acceptance requirements for
each subphase. Full versions are structured-event fields only; metric dimensions
use allowlisted bounded families or compatibility-major buckets.

## 14. Shared security and resource limits

Each implementation prompt must set explicit configurable bounds for:

- input records and pair candidates per batch;
- order-book levels consumed per calculation;
- decimal digits, scale, and operations;
- mapping evidence and conflict-chain depth;
- window length and anomaly-rule count;
- replay records and export bytes;
- ranking candidates and components;
- provenance entries, identifier lengths, and total provenance bytes;
- processing deadline and cancellation.

Bounds fail closed with typed unavailable/rejected results. No future package
may accept URLs, credentials, exchange payloads, arbitrary executable
expressions, or user-authored code.

## 15. Product-owner decisions required before implementation

| Decision    | Blocks    | Required resolution                                                                         |
| ----------- | --------- | ------------------------------------------------------------------------------------------- |
| D-055       | 2B.1      | Compatibility matrix, expiry/multiplier/unit rules, mapping owner and correction process    |
| D-056       | 2B.2      | Requested exposure unit, conversion basis, partial-depth behavior, receive-time skew        |
| D-057       | 2B.2      | Entry/exit spread direction, sign, denominator, output scale and rounding                   |
| D-058       | 2B.2/2B.7 | Required costs, fee/slippage bases, expected-gross scenario and net availability            |
| D-059       | 2B.3      | Funding semantic matrix, sign, basis notional, settlement alignment, normalization rounding |
| D-060       | 2B.4      | Lifecycle thresholds, durations, keys, expiry, requalification and policy migration         |
| D-061       | 2B.5      | Anomaly rules, windows, thresholds and severities                                           |
| D-021/D-062 | 2B.6      | Retention/downsampling/export/correction meaning; persistence remains deferred              |
| D-063       | 2B.7      | Eligibility, ranking components/weights, tie-breaks, confidence and copy policy             |
| D-064       | all       | Freshness/skew/load policies and bounded processing objectives                              |

Until these are approved, implementations must not choose defaults that affect
financial meaning or actionability.

## 16. Phase 2B completion gate

Phase 2B is complete only when every subphase is independently accepted and
frozen; all formula, policy, mapping, fixture, reason-code, event, and schema
versions are documented; replay is deterministic; resource bounds and
cardinality tests pass; frozen adapter packages remain byte-for-byte untouched;
and repository-wide formatting, linting, type checking, tests, production
builds, dependency audit, and forbidden-scope scans pass.

Phase 2B completion authorizes later consumers to use analytical contracts. It
does not authorize persistence, UI, notifications, positions, or trading.

## 17. Exact recommended implementation prompt for Phase 2B.1

```text
Read AGENTS.md and all current architecture, roadmap, domain, API-contract,
security, risk, decisions, acceptance, Phase 0, Phase 1, and frozen Phase 2A.1
through Phase 2A.4 documents completely. Read
docs/PHASE_2B_SPREAD_ANALYTICS_PLAN.md and
docs/adr/0009-spread-analytics-boundary.md completely.

Phase 2A.1 through Phase 2A.4 are frozen and approved. The product owner has
approved D-055 with the exact compatibility matrix, expiry/multiplier/unit
rules, mapping owner, review workflow, effective-time semantics, and correction
policy recorded in docs/DECISIONS_REQUIRED.md.

Implement Phase 2B.1 only: Canonical Instrument Matching Foundation.

Before modifying files:
1. inspect the complete repository and git diff;
2. verify the approved D-055 decision is recorded without contradiction;
3. present a concise implementation plan;
4. list expected files to create or modify;
5. identify blocking ambiguities and stop if financial meaning is unresolved.

Implement strongly typed, deterministic contracts and pure matching logic for
venue/product-group identity, canonical base/quote/settlement assets, market
and contract type, expiry, multiplier/unit compatibility, manual mapping
provenance, proposer/reviewer separation, effective time, conflict quarantine,
immutable mapping versions, and deterministic completeness-based confidence.

No ticker-text-only match may become canonical identity. USDT and USDC must
never merge implicitly. Unknown, unsupported, unverified, research-required,
inactive, conflicting, expired, or unreviewed inputs must fail closed with
typed outcomes. Use exact decimals only; do not silently round.

Add bounded deterministic fixtures, unit tests, property tests, replay tests,
fault injection, hostile-input/resource-bound tests, finite-cardinality metrics
contracts, structured events, and documentation. Do not expose fake ports for
unsupported behavior.

Do not modify packages/market-data, packages/okx-public-adapter,
packages/binance-usdm-public-adapter, or packages/bybit-linear-public-adapter
except for an explicitly justified BLOCKER compatibility correction. Do not
add network clients, persistence, event bus, frontend UI, Telegram, positions,
authenticated APIs, paper/live trading, Risk Engine, Execution Engine, AI, or
billing. Do not begin Phase 2B.2 and do not create a commit.

Run the pinned authoritative formatting, linting, type checking, all Node and
Kotlin tests, production builds, production dependency audit, Docker quality
and runtime checks, git diff check, secret/forbidden-scope scan, financial
float/double scan, and frozen-package diff check.

Create Phase 2B.1 implementation and implementation-produced pre-acceptance
documentation. At the end report implementation, contracts and invariants,
mapping governance, files changed, exact tests/results, runtime evidence,
security/correctness decisions, limitations/risks, whether Phase 2B.1 can enter
formal independent acceptance, and the exact recommended acceptance-review
prompt. Do not create a commit.
```
