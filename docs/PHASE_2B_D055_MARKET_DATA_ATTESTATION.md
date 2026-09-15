# D-055 — Independent Market Data attestation

- Status: **APPROVE**.
- Authority role: **Market Data Reviewer**.
- Independent actor/role marker: `/root/d055_market_data`, delegated technical
  AI Market Data reviewer; distinct from proposer `/root` and Quant reviewer
  `/root/d055_quant`.
- Review/approval date: **2026-09-14**.
- Decision version: `instrument-matching-pilot/v1`.
- Exact reviewed complete snapshot SHA-256:
  `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`.
- Blocking conditions: **NONE within the reviewed decision**.

The reviewer independently recomputed the supplied snapshot digest with Node
24 in the healthy materialized remote clone and completed the review without
editing files. This is an explicit independent technical AI review, not a
fabricated human credential, production operational sign-off, proposer
self-attestation, formal acceptance or implementation authorization.

## Explicit criteria

| Required criterion                          | Verdict / rationale                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| OKX frozen metadata coverage                | APPROVE; preserve official native ID, explicit derivative asset roles, ctVal and guarded ctMult semantics                       |
| Binance USDⓈ-M frozen metadata coverage     | APPROVE; asset roles/IDs known; absent multiplier and convention proof remain unresolved                                        |
| Bybit Linear frozen metadata coverage       | APPROVE; category, IDs, asset roles and LINEAR convention known; multiplier remains unverified                                  |
| Exchange-native instrument IDs              | APPROVE; opaque authoritative references; no parsing or ticker-derived identity                                                 |
| Base/quote/settlement evidence              | APPROVE; independent roles and injected reviewed resolution, not registry approval by type construction                         |
| Contract-size/multiplier evidence           | APPROVE; exact known OKX ctVal under empty/unit ctMult guard; no inferred Binance/Bybit factor                                  |
| Contract unit/convention evidence           | APPROVE; missing quantity/value-unit fields require bounded corroborating evidence; unresolved frozen fields cannot be promoted |
| Lifecycle evidence                          | APPROVE; explicit supported lifecycle mappings and native-family veto; ACTIVE eligibility is separately gated                   |
| Known versus unknown fields                 | APPROVE; missing economics stays unavailable, not one or zero                                                                   |
| Unsupported/research-required fields        | APPROVE; cannot contribute as known supported inputs or be repaired by manual approval                                          |
| Current pilot availability                  | APPROVE; all three current cross-venue assessments remain UNAVAILABLE                                                           |
| No undocumented/live-network field promoted | APPROVE; frozen reviewed repository evidence only; no new retrieval/API probe                                                   |
| No ticker equivalence or hidden assumption  | APPROVE; scoped registry and native evidence required; no price or ticker tie-breaker                                           |
| Candidate versus approval                   | APPROVE; identity-supported diagnostic proposals do not approve incomplete economics                                            |
| Registry and sidecar boundaries             | APPROVE; cannot rewrite frozen IDs/asset observations or upgrade unresolved capability/knowledge                                |
| Conflict/stale evidence fail-closed rules   | APPROVE; quarantine disagreement; reject stale or unsupported required inputs                                                   |

## Per-venue evidence and gaps

| Venue          | Independently verified frozen evidence                                                                                                                                                                                           | Remaining gap                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OKX            | Opaque instId; native instType/ruleType; ctType; linear base = ctValCcy, quote/settlement = settleCcy; canonical multiplier = ctVal; ctMult independently guarded to empty/exact unit; quantity is contracts; explicit lifecycle | Approved scoped registry bindings, current evidence and per-leg quantity/value-unit proof still required. Canonical metadata alone omits some native-family/unit facts. Non-unit ctMult remains quarantined. |
| Binance USDⓈ-M | Opaque symbol; pair descriptive only; independent baseAsset/quoteAsset/marginAsset; documented contract/status mapping                                                                                                           | contractMultiplier UNVERIFIED; contractValueConvention RESEARCH_REQUIRED. Exact native quantity-to-base factor and payoff proof insufficient. Special/ambiguous families remain quarantined.                 |
| Bybit Linear   | Enforced category; opaque symbol; independent baseCoin/quoteCoin/settleCoin; LinearPerpetual/LinearFutures; explicit lifecycle; convention KNOWN LINEAR                                                                          | contractMultiplier UNVERIFIED; native quantity-to-base economics insufficient. Launch/delivery remain native evidence, not invented canonical identity fields.                                               |

Frozen mapping and capability modules were independently inspected, together
with complete applicable foundation, adapter, research/source/capability and
governing decision documents. Adapter resolvers and strongly typed asset
constructors do not establish an approved canonical asset registry binding.
OKX FUTURES pre_market/xperp may normalize to PERPETUAL; D-055 correctly vetoes
these special native families despite that canonical enum.

Historical official evidence remains OKX 2026-07-27, Binance 2026-08-02 and
Bybit 2026-08-03. No source retrieval dates were refreshed by this review.

## Zero-pair result and future evidence

| Pair            | Current family                        | Economics reason codes                                             | Candidate versus approval                                                   |
| --------------- | ------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| OKX ↔ Binance   | Conditional ordinary linear perpetual | MULTIPLIER_UNKNOWN and VALUE_CONVENTION_UNVERIFIED on Binance      | Identity-supported diagnostics possible; approved compatibility UNAVAILABLE |
| OKX ↔ Bybit     | Conditional ordinary linear perpetual | MULTIPLIER_UNKNOWN on Bybit                                        | Identity-supported diagnostics possible; approved compatibility UNAVAILABLE |
| Binance ↔ Bybit | Conditional ordinary linear perpetual | MULTIPLIER_UNKNOWN on both; VALUE_CONVENTION_UNVERIFIED on Binance | Identity-supported diagnostics possible; approved compatibility UNAVAILABLE |

Missing canonical bindings may additionally yield ASSET_IDENTITY_UNKNOWN or
NATIVE_ASSET_REFERENCE_UNAVAILABLE before economics checks under the snapshot's
precedence. Reason lists are retained rather than hiding additional gaps.

Zero approved pairs is **APPROVED as intentional fail-closed behavior**, not an
implementation impossibility. Pure matching can be verified with synthetic
complete evidence. Actual approved pairs need separately accepted official
economics research/compatibility evidence, exact native units/factors, approved
registry bindings, current supported ACTIVE metadata and independent mapping
reviews. No sidecar or manual interpretation can bypass frozen unresolved
fields. This review requires no adapter modification for synthetic-core work;
the live approval evidence gaps must be separately closed first.

Bybit full sequence/silent-gap validation remains RESEARCH_REQUIRED. A match
cannot upgrade that capability or independently make its book actionable.

## D-064 matching-only Market Data approval

- Authority role: **Market Data**.
- Actor: `/root/d055_market_data`.
- Approval date: **2026-09-14**.
- D-055 digest: the exact complete snapshot digest above.
- D-055 decision version: `instrument-matching-pilot/v1`.
- D-064 matching-scope version: `instrument-matching-resources/v1`.
- Status: **APPROVE**.
- Blocking conditions: **NONE**.

Approve the exact [matching-only D-064 record](PHASE_2B_D064_MATCHING_APPROVAL.md):
HEALTHY metadata age [0,60s], structural/registry revalidation age at most 30
days, mapping validity at most 30 days, half-open intervals, every section-13
bound unchanged, whole-batch failure, 100,000 logical work steps, cancellation
polls at most 128 steps plus pre-publication checks. The same evaluation-time
metadata-age bounds imply metadata-observation skew at most 60 seconds; this
is not a financial receive-time/book skew approval.

Pure bounded offline matching has no claimed wall-clock SLO. Production
latency/scheduling and later price/book/funding skew, windows, replay/export and
ranking policies remain separately gated. No unresolved Market Data ambiguity
blocks this matching-only decision.

## Revisit and scope

Revisit on new official economics evidence, changed asset/unit/lifecycle/native
family facts, conflict incident or pilot expansion. A new decision snapshot
requires renewed digest-bound approval. Formal D-055 acceptance and separate
Phase 2B.1 authorization remain required. This attestation approves no live
pair, production registry entry, adapter capability upgrade or implementation.
