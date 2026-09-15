# D-055 — Canonical Instrument Matching Compatibility and Governance

## 1. Decision record and authority

Decision date: **2026-09-14**. Policy ID: `instrument-matching-pilot/v1`.
Status: **PRODUCT DECISION RECORDED; QUANT AND MARKET-DATA APPROVAL AND
INDEPENDENT FORMAL ACCEPTANCE REQUIRED**.

The Product Owner's documentation-only task authorizes the concrete pilot
choices below. Product scope approval is recorded through that task. Quant and
Market Data are accountable for the dimensional and official-evidence review;
their separately identifiable approvals are **not present in the repository**.
This document supplies their exact decision to review and does not fabricate
their signatures. The register requires all three authorities before D-055 is
marked `APPROVED`. No production mapping, asset-registry entry, runtime
permission, or Phase 2B.1 implementation is approved here.

Approval ledger:

| Authority      | Recorded choice / approval evidence                                                                                                | Gate                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Product Owner  | Conservative pilot and documentation scope authorized by the current task; recorded 2026-09-14                                     | Independent acceptance and separate implementation task still required |
| Quant          | Exact unit/economic policy in sections 4–5 is the recommendation; no separate approval attestation supplied                        | Must attest to the immutable decision digest before D-055 approval     |
| Market Data    | Source, registry, lifecycle and capability policy in sections 2–8 is the recommendation; no separate approval attestation supplied | Must attest to the same decision digest before D-055 approval          |
| Security / SRE | Review bounded input and operation policy; no production operational parameters are approved                                       | Applicable D-064 approval and production ownership remain separate     |

Attestations must identify actor, role, approval date, document revision/digest,
scope and exceptions. One person cannot claim both independent mapping-review
roles. The present policy has no unspecified implementation defaults. Pending
authority is an approval blocker, rather than a missing algorithm choice.

## 2. Frozen evidence and available identifiers

This task uses repository evidence only. No official source was re-retrieved
and no live API/canary was run. These retrieval dates remain historical:

| Evidence                          | Retrieved                            | Relevant facts and retained gaps                                                                                                                                                      |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OKX-01`, `OKX-02`                | 2026-07-27                           | `instId`, `instType`, `ruleType`, `ctType`, `ctVal`, `ctMult`, `ctValCcy`, `settleCcy`, lifecycle; derivative quantity is contracts; non-unit `ctMult` remains quarantined            |
| `BNFUT-01`, `BNFUT-10`            | 2026-08-02                           | Opaque `symbol`, display/reference `pair`, independent `baseAsset`, `quoteAsset`, `marginAsset`, contract/status enums; multiplier `UNVERIFIED`, value convention `RESEARCH_REQUIRED` |
| `BYBIT-02`, `BYBIT-16`            | 2026-08-03                           | `category=linear`, opaque `symbol`, independent `baseCoin`, `quoteCoin`, `settleCoin`, contract/status and launch/delivery times; multiplier `UNVERIFIED`                             |
| ADR 0003, Phase 2A.1 contracts    | Frozen 2026-07-26 baseline           | Exact five-component CEX identity, opaque asset IDs, knowledge/capability/quality distinctions, bounded exact decimals                                                                |
| Phase 2A.2–2A.4 formal acceptance | 2026-07-27 / 2026-08-02 / 2026-08-03 | Authoritative adapter mapping and limitations; acceptance does not prove economic equivalence across venues                                                                           |

URLs and warnings remain in [the source register](PHASE_0_SOURCE_REGISTER.md).
Field-level research is in [Phase 0 research](PHASE_0_API_RESEARCH.md) and
[the capability matrix](EXCHANGE_CAPABILITY_MATRIX.md).

Frozen identifiers available to analytics are `Venue`, `ProductGroup`,
`OfficialInstrumentId`, `InstrumentId`, `CanonicalAssetId`, `QuoteAsset`,
`SettlementAsset`, `OfficialAssetReference`, and `MappingActorId`. The existing
`ManualAssetMapping` contains venue/product/native asset reference, canonical
asset ID, source, effective time, proposer, reviewer and review state. It has
no immutable history/version mechanism; analytics must wrap that contract,
never rewrite it or treat its existence as registry approval.

Exact adapter identities:

| Adapter | Venue             | Product group          | Native instrument / asset references                                                                             |
| ------- | ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| OKX     | `OKX_EXCHANGE`    | `OKX_V5_SWAP_FUTURES`  | `instId`; linear base=`ctValCcy`, quote/settlement=`settleCcy`; `uly` is opaque index lookup, not asset identity |
| Binance | `BINANCE_FUTURES` | `BINANCE_USDM_FUTURES` | `symbol`; `baseAsset`, `quoteAsset`, `marginAsset`; `pair` is descriptive only                                   |
| Bybit   | `BYBIT`           | `BYBIT_V5_LINEAR`      | `symbol`; `baseCoin`, `quoteCoin`, `settleCoin`; category must be exactly linear                                 |

The frozen metadata observation does not expose every native family, expiry,
collateral, quantity-unit or contract-value-unit field. A bounded immutable
`InstrumentCompatibilityEvidence` sidecar may preserve already reviewed native
evidence, bound to the observation digest and official ID. It cannot overwrite
`UNVERIFIED`/`RESEARCH_REQUIRED` frozen fields. New economics research or a
capability upgrade requires a separately accepted evidence/compatibility
decision before actionable use; a manual approval cannot bypass that gate.

## 3. Identity and asset registry

### 3.1 Four distinct field roles

| Role                                       | Fields                                                                                                                                                                 | Rule                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Frozen venue-instrument identity           | venue, product group, opaque official instrument ID, market type, settlement asset                                                                                     | Preserve existing `cex-instrument/v1` encoding unchanged; matching never makes two venue IDs equal                       |
| Analytical exposure identity               | approved canonical base/quote/settlement IDs, derivative/perpetual/linear class, `BASE_UNIT` exposure dimension                                                        | Separate compatibility identity; never replaces the venue instrument record                                              |
| Compatibility evidence                     | native family, contract type, perpetual marker/expiry, lifecycle, multiplier meaning/unit, contract specification, collateral applicability, registry/source revisions | Every required fact must be known, consistent, current and approved                                                      |
| Later normalization / descriptive metadata | per-leg native quantity unit and base-unit factor / display symbol, pair, precision, names, launch/delivery timestamps                                                 | Native quantity conversion is explicit evidence; requested-size, tick/lot rounding and spread math belong to D-056–D-058 |

Lifecycle is eligibility, not a mutable identity component. Multiplier and
contract-value unit are compatibility-critical economics, checked outside the
key. Their change invalidates eligibility even if the frozen instrument ID
does not change. Collateral is separate from settlement: the pilot owns no
account collateral mode, portfolio margin or custody assertion. A specification
with collateral-dependent payoff requires known compatible evidence; otherwise
`COLLATERAL_ECONOMICS_UNVERIFIED`. Account collateral availability is outside
matching and cannot grant execution eligibility.

### 3.2 Canonical asset policy

Choose a manually curated, immutable, versioned canonical asset registry with
official-evidence bindings. Its asset ID is opaque and stable; its display
symbol is not its key. Each binding is scoped by venue, product group and exact
official asset reference, plus an effective interval and evidence revision.
The frozen adapters construct strongly typed asset IDs from official asset
fields; they do not consult this future curated registry. Never claim a registry
binding produced those existing IDs. Resolution requires exact native asset
references in digest-bound official evidence and an approved scoped binding.
Missing native reference returns `UNAVAILABLE` /
`NATIVE_ASSET_REFERENCE_UNAVAILABLE`.

Preserve the original `frozenAdapterAssetId` in its observation and venue
identity. The compatibility assessment carries a separate
`assessedCanonicalAssetId` from the registry, with binding/version provenance.
Registry aliases may establish one analytical asset identity across different
native references, but never rewrite a frozen base/quote/settlement field or
InstrumentId. Constructor validation or equal adapter ID text alone proves
neither binding nor economic identity.

The pilot admits approved crypto-asset underlying identities and exact approved
USDT or USDC quote/settlement identities. This decision approves no actual
registry entries. USDT and USDC remain different even at identical prices.

| Case                                                   | Decision                                                                                                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate ticker / same ticker for unrelated assets    | Separate IDs and bindings; ambiguous identity returns `ASSET_IDENTITY_UNKNOWN` or `ASSET_BINDING_CONFLICT`                                                           |
| Venue alias                                            | Direct reviewed binding to one asset ID; never a ticker substitution rule                                                                                            |
| Rebrand without economic identity change               | Preserve asset ID; append a versioned display/alias update with official evidence and effective time                                                                 |
| Redenomination / changed unit                          | New unit/asset revision and economic review; old observations keep their old identity/unit; automatic matching stops                                                 |
| Wrapped / bridged asset                                | Distinct asset ID by default; pilot rejects cross-wrapper/cross-bridge equivalence                                                                                   |
| Chain/network representation                           | Chain namespace, network and token/native identity are evidence when relevant; network ticker alone is insufficient; CEX claims do not prove cross-chain fungibility |
| Conflicting contract address, issuer or alias evidence | Quarantine; no external metadata rank may choose a winner                                                                                                            |

External aggregators, social media, price correlation and symbol similarity
cannot authorize identity. Future external research can provide a reference
only after official corroboration and governance review. No runtime network
lookup participates in matching or replay. Alias bindings point directly to an
asset ID; no alias-to-alias graph is permitted (depth maximum one).

## 4. Pilot compatibility matrix

Choose cross-venue, ordinary **linear perpetual derivatives only**, requiring
the same canonical base, quote and settlement IDs. Quote must equal settlement
and be the approved USDT ID or approved USDC ID. This is a pilot restriction,
not a claim that all linear products require that relationship. Both legs must
be ACTIVE with complete known economics. No expiry tolerance is approved:
dated products are excluded, including two products with exactly equal expiry.

| Comparison                                                                      | Pilot outcome / reason                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Ordinary linear perpetual / ordinary linear perpetual, all gates satisfied      | Compatible candidate; only reviewed complete approval yields `MATCHED`         |
| Perpetual / dated future                                                        | `NOT_MATCHED`, `DATED_PRODUCT_EXCLUDED`                                        |
| Dated / same-expiry dated                                                       | `NOT_MATCHED`, `DATED_PRODUCT_EXCLUDED`                                        |
| Dated / different-expiry dated                                                  | `NOT_MATCHED`, `DATED_PRODUCT_EXCLUDED` (expiry mismatch retained as evidence) |
| Spot / perpetual or spot / dated                                                | `NOT_MATCHED`, `SPOT_DERIVATIVE_MISMATCH`                                      |
| Known linear / known linear                                                     | Continue economics checks; label alone is insufficient                         |
| Inverse / linear; quanto / linear                                               | `NOT_MATCHED`, `VALUE_CONVENTION_MISMATCH`                                     |
| USDT / USDT settlement, same base/quote                                         | Continue all remaining checks                                                  |
| USDT / USDC settlement                                                          | `NOT_MATCHED`, `SETTLEMENT_ASSET_MISMATCH`                                     |
| Same base/quote, different settlement                                           | `NOT_MATCHED`, `SETTLEMENT_ASSET_MISMATCH`                                     |
| Both legs agree with each other, but quote differs from settlement within a leg | `NOT_MATCHED`, `QUOTE_SETTLEMENT_MISMATCH`                                     |
| Same ticker, different canonical base                                           | `NOT_MATCHED`, `BASE_ASSET_MISMATCH`                                           |
| Different known positive base-unit factors, same economic exposure              | Compatible candidate under section 5; never merged native quantities           |
| Same ticker, incompatible contract-value unit or payoff                         | `NOT_MATCHED`, `CONTRACT_UNIT_MISMATCH` or `PAYOFF_MISMATCH`                   |
| ACTIVE / pre-listing, halted, suspended, delisting, expired                     | `UNAVAILABLE`, `LIFECYCLE_NOT_ACTIVE`                                          |
| Unknown lifecycle                                                               | `UNAVAILABLE`, `LIFECYCLE_UNKNOWN`                                             |
| Same venue, even different instruments                                          | `NOT_MATCHED`, `SAME_VENUE_EXCLUDED`                                           |

### 4.1 Venue families versus actual readiness

| Current frozen family                                                     | Policy classification                     | Actual required evidence / limitation                                                                                                             |
| ------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OKX `SWAP`, `ctType=linear`, `state=live`, approved USDT or USDC roles    | Eligible conditionally                    | Native SWAP proof, curated assets, contract-unit/`ctValCcy` evidence, known `ctVal`, accepted empty/unit `ctMult`, freshness and reviews required |
| OKX inverse SWAP                                                          | Ineligible                                | Known inverse convention                                                                                                                          |
| OKX normal FUTURES                                                        | Ineligible                                | Dated product excluded                                                                                                                            |
| OKX FUTURES `pre_market` / `xperp`                                        | Ineligible in pilot                       | Frozen mapping can produce PERPETUAL; native family must still veto pilot admission; `SPECIAL_PRODUCT_EXCLUDED`                                   |
| Binance documented `PERPETUAL`, `TRADING`, approved stablecoin roles      | Research-required                         | Multiplier `UNVERIFIED`; convention `RESEARCH_REQUIRED`; no inferred factor of one                                                                |
| Binance documented delivery family                                        | Ineligible                                | Dated product excluded                                                                                                                            |
| Binance `TRADIFI_PERPETUAL`, `PERPETUAL_DELIVERING`                       | Research-required and quarantined         | No frozen canonical observation may be fabricated                                                                                                 |
| Bybit `linear` / `LinearPerpetual` / `Trading`, approved stablecoin roles | Research-required for actionable matching | Convention LINEAR is known; multiplier remains `UNVERIFIED`                                                                                       |
| Bybit `LinearFutures`                                                     | Ineligible                                | Dated product excluded                                                                                                                            |
| Any non-pilot venue/category; unsupported native enum                     | Ineligible / quarantined                  | `PRODUCT_UNSUPPORTED` / `PRODUCT_ENUM_UNVERIFIED`                                                                                                 |

| Pair                          | Policy allows after complete evidence? | Readiness using current frozen contracts                       |
| ----------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| OKX / Binance USDⓈ-M          | Yes, conditional                       | `UNAVAILABLE`: Binance multiplier and convention incomplete    |
| OKX / Bybit Linear            | Yes, conditional                       | `UNAVAILABLE`: Bybit multiplier incomplete                     |
| Binance USDⓈ-M / Bybit Linear | Yes, conditional                       | `UNAVAILABLE`: both multiplier gaps and Binance convention gap |

Therefore **zero actual cross-venue pairs are approved by this decision**.
An empty actionable match set is a correct pilot result. Synthetic fixtures
can prove implementation behavior without pretending the live evidence gaps
have closed. Book sequence capability (including Bybit's silent-gap limitation)
is independently gated by later analytics and is never upgraded by a match.

## 5. Exact contract economics and normalization

Each leg requires a positive known exact factor `baseUnitsPerNativeQuantity`,
its native quantity unit (`CONTRACT` or explicitly documented `BASE_UNIT`),
canonical base unit, quote-price unit, settlement unit, LINEAR payoff evidence
and the native contract-multiplier meaning. A unit-valued factor is still
required when native quantity is base quantity; never infer it from a label.
Quote notional has dimension quote-asset units, and settlement cash value has
dimension settlement-asset units. Their equality is permitted only under the
explicit same-asset pilot constraint; no FX conversion is introduced.

Dimensional compatibility is established through:

```text
baseExposure = nativeQuantity × baseUnitsPerNativeQuantity
priceUnit = quoteAssetUnits / baseAssetUnit
quoteNotional = baseExposure × price
```

These equations define matching evidence dimensions only. D-056 owns requested
exposure and depth normalization; D-057 owns spread denominators and rounding.
No request size or trade quantity is selected in Phase 2B.1.

Factors `1`, `0.001` and `100` base units per contract are compatible when they
refer to the same approved base unit and linear payoff; respective native
quantities `1`, `1000` and `0.01` describe one base unit. This does not assert
that those quantities satisfy venue minimum/step constraints. Actionability
for a configured size requires the later quantity/depth gates. No `1000` or
`k` prefix is parsed to establish a factor.

Use frozen exact decimals (78 coefficient digits, wire scale 36, domain scale
78, maximum wire length 256). No floating-point comparison, epsilon, clamping
or silent rounding. Compatibility compares dimensions and exact factors;
division is unnecessary for candidate eligibility. An illustrative or later
conversion division requires explicit `EXACT` and fails on a remainder.
Overflow returns `DECIMAL_BOUND_EXCEEDED`. Zero/negative returns
`MULTIPLIER_INVALID`; absent known factor returns `MULTIPLIER_UNKNOWN`;
inconsistent units return `CONTRACT_UNIT_MISMATCH`. Metadata disagreement is a
conflict, not a normalization opportunity.

## 6. Lifecycle and evidence time

| Native / evidence lifecycle                         | Frozen canonical equivalent                         | Candidate / approval / current eligibility                            |
| --------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| TRADING / live / Trading                            | ACTIVE                                              | May generate compatible candidates and approve after every other gate |
| PRE_LISTING / PENDING_TRADING / preopen / PreLaunch | PRE_LAUNCH                                          | Display-only diagnostic; cannot approve actionable match              |
| HALTED / TRADING_HALT                               | SUSPENDED                                           | Unavailable; invalidate current eligibility                           |
| SUSPENDED                                           | SUSPENDED                                           | Unavailable; invalidate current eligibility                           |
| DELISTING notice                                    | Separate veto evidence; do not invent a frozen enum | Immediately unavailable at notice effective time                      |
| DELIVERING / settling                               | SETTLING                                            | Unavailable; pilot excludes dated products                            |
| EXPIRED / DELIVERED / Closed                        | EXPIRED                                             | Unavailable; no new approval                                          |
| DELISTED / CLOSE                                    | DELISTED                                            | Unavailable; no new approval                                          |
| UNKNOWN                                             | UNKNOWN                                             | UNAVAILABLE / `LIFECYCLE_UNKNOWN`; never assume ACTIVE                |
| Contradictory native/normalized lifecycle           | Conflict sidecar                                    | QUARANTINED / `METADATA_EVIDENCE_CONFLICT`                            |

A new snapshot can refresh unchanged ACTIVE lifecycle evidence within an
approved mapping interval; it does not extend the approval interval. A material
identity/unit/family change or inactive lifecycle closes current eligibility
through an append-only invalidation record. Recovery requires fresh evidence
and a new reviewed match version. A simple status bounce cannot resurrect an
invalidated version.

An unchanged-economics refresh must preserve the approved structural
fingerprint: exact venue/product/native ID, registry asset bindings, native
family, contract type/value convention, native quantity and price units,
base-unit factor, settlement and collateral applicability. The new observation
revision/digest and lifecycle/time facts remain explicit inputs. Only these
time/observation revisions may refresh eligibility without new economic review;
they never replace the approved structural digest or extend its interval.

Matching-only pilot ages, evaluated with explicit `evaluationAt`:

- Current normalized metadata must have age in `[0, 60 seconds]` from
  `metadataObservedAt`; negative age fails `EVIDENCE_TIME_INVALID`.
- Current metadata quality must be HEALTHY; all other frozen quality states
  are non-actionable. No book freshness is evaluated here.
- Registry and structural contract evidence must have a reviewed validity
  interval and revalidation age at most 30 days. The effective eligibility end
  is the earliest evidence expiry or mapping expiry.
- Each approved mapping validity is at most 30 days; renewal creates a new
  reviewed version. All intervals are `[effectiveFrom, effectiveTo)`.

These values are the concrete D-055 pilot policy submitted for expert review,
not current exchange cadence facts. Applicable matching load/time controls
must also receive the D-064 authority approval; D-064 remains open for all
later input kinds, skew, books, windows, ranking and SRE objectives.
Historical replay evaluates freshness at its supplied historical evaluation
time, rather than today's wall clock. Retrieval date never substitutes for
observation time or automatically refreshes structural evidence.

## 7. Candidate and evidence contracts

`CandidateMatch` is the descriptive name for the planned
`InstrumentMatchCandidate`; these are one concept, not duplicate APIs. It
contains candidate ID, canonical ordered left/right instrument references,
both metadata digests and source revisions, registry version, canonical asset
evidence, product/settlement/economics/lifecycle evidence, finite reason codes,
quality/completeness, proposer identity (or `DETERMINISTIC_EVALUATOR` for machine
proposals), createdAt/effectiveAt, evaluationAt, knowledgeCutoff, policy version
and evidence-set digest. Machine proposal is never approval.

An evidence record contains evidence ID/class, official source ID or curated
registry reference, product scope, source revision/digest, retrieval date,
source timestamp when actually supplied, receive/processing timestamps when
available, recordedAt, valid interval, review actor/date, documented unit,
quality and policy version. Missing exchange timestamp is explicit absence;
never manufacture one. Evidence references are bounded local identifiers and
digests, not dereferenced URLs or attached hostile payloads.

Evidence precedence is a check order, not permission to suppress conflict:

1. Official native ID/product/contract specification establishes venue facts.
2. Frozen adapter observation establishes what analytics can safely consume.
3. Approved versioned registry binds native asset references to canonical IDs.
4. Reviewed manual interpretation attaches direct corroborating evidence.

Every required class must agree. Official/native and frozen normalized
disagreement returns `METADATA_EVIDENCE_CONFLICT`. A curated mapping cannot
change a vendor contract fact. A reviewer cannot promote an unresolved
knowledge/capability state. No price or ticker score breaks a tie.

Deterministic confidence retains the frozen planning vocabulary:
`EXACT_METADATA`, `REVIEWED_MANUAL`, `AMBIGUOUS`, `INSUFFICIENT`.
EXACT_METADATA means evidence completeness, not automatic approval.
REVIEWED_MANUAL requires the same economic gates as EXACT_METADATA.

## 8. Status, quality and transitions

Mapping status and current evaluation outcome are separate.

| Current status                                    | Command / evidence                                                                    | Next status / rule                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| none                                              | Valid deterministic/manual proposal                                                   | CANDIDATE                                                                          |
| CANDIDATE                                         | Complete policy-compliant evidence plus required reviews                              | APPROVED                                                                           |
| CANDIDATE                                         | Known incompatibility or reviewed rejection                                           | REJECTED                                                                           |
| CANDIDATE / APPROVED                              | Conflicting identity, economics, approvals or overlapping interval                    | CONFLICT; quarantine every affected current identity                               |
| CONFLICT                                          | Conflict detected / review opened                                                     | QUARANTINED; ordinary approval cannot recover                                      |
| CANDIDATE / APPROVED                              | Invalid provenance                                                                    | QUARANTINED; approval cannot repair unauthenticated evidence                       |
| CANDIDATE / APPROVED                              | Stale evidence or unknown economics without conflicting facts                         | Status unchanged; current evaluation UNAVAILABLE; no automatic renewal or approval |
| APPROVED                                          | Material lifecycle/economic change or erroneous approval                              | INVALIDATED through an explicit append-only record                                 |
| APPROVED                                          | Validity end reached without a new event                                              | Stored status unchanged; eligibility expired with `MAPPING_EXPIRED`                |
| APPROVED                                          | Valid reviewed replacement and non-overlapping closure                                | SUPERSEDED                                                                         |
| REJECTED / QUARANTINED / INVALIDATED / SUPERSEDED | Correction or reapproval request                                                      | New CANDIDATE version; old status/history preserved                                |
| any                                               | Exact duplicate command ID/digest                                                     | Idempotent no-op                                                                   |
| any                                               | Reused command ID with different digest, wrong expected revision, unlisted transition | Reject, no mutation                                                                |

Quality classes: `COMPLETE_APPROVED`, `INCOMPLETE`, `CONFLICTING`,
`RESEARCH_REQUIRED`, `UNSUPPORTED`, `STALE_EVIDENCE`. Only COMPLETE_APPROVED
with APPROVED status effective at the evaluation time can pass matching
eligibility. This gate is a necessary input for later actionability and does
not itself make an opportunity actionable or authorize execution.

| Evaluation outcome | Conditions                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| MATCHED            | Complete effective reviewed mapping, current known supported metadata, all compatibility gates pass                                               |
| NOT_MATCHED        | Known policy exclusion or incompatibility                                                                                                         |
| AMBIGUOUS          | Asset identity/alias not established with sufficient evidence                                                                                     |
| QUARANTINED        | Conflict, invalid provenance, ambiguous one-to-many binding, unresolved product record                                                            |
| UNAVAILABLE        | Missing known economics, stale evidence, unapproved/expired/superseded/invalidated mapping, unsupported required capability or inactive lifecycle |

Check precedence: malformed/bounded input; conflict/quarantine; known scope
exclusion; unknown identity; required knowledge; lifecycle/freshness; review
and effective interval; compatibility. Within asset compatibility, check base,
then settlement, then quote (`QUOTE_ASSET_MISMATCH`), then the pilot's within-leg
quote/settlement equality; check units/payoff after those fields. Collect
bounded reasons in this order, then code byte order for ties. Never hide a
conflict behind a ticker mismatch.

## 9. Manual governance and cardinality

Market Data or Quant may propose a mapping. Every manual approval requires two
distinct review actors: one Market Data reviewer and one Quant reviewer, both
different from the proposer. Product owns policy and pilot scope, not a
one-click exception to economic gates. New asset identity, alias, rebrand or
redenomination additionally requires Product approval of the registry change.
Security governs actor/audit integrity; no RBAC, authentication or admin UI is
implemented by Phase 2B.1. Test actors are explicit synthetic identities.

Reviews bind to an immutable command/evidence digest, exact expected mapping
revision, policy and effective interval. Mandatory reason code, bounded reason
text, evidence references and actor/role provenance are retained. A changed
proposal requires new review. Self-review or the same actor in two reviewer
roles fails `REVIEWER_SEPARATION_REQUIRED`. Audit facts include actor, role,
action, target/version, before/after digests, reason, recordedAt, command ID and
correlation reference. No credentials or full external payloads are retained.

Choose **one venue instrument → one approved exposure identity at any effective
instant**. Separate venue instruments may share an exposure identity; they are
never merged records. A single instrument may participate in multiple distinct
cross-venue pair assessments under the same approved identity, subject to the
candidate bound. That is not one-to-many asset mapping.

Conceptual uniqueness: exact `(venue, productGroup, officialInstrumentId)`
binding and effective interval; frozen InstrumentId consistency; pair/mapping
version; command ID/digest; and non-overlapping approved identity intervals.
Unexpected multiple same-venue products claiming one exposure require reviewed
native-family distinction or `DUPLICATE_EXPOSURE_CONFLICT`; no arbitrary best
match wins. Persistence constraints are deferred.

## 10. Immutable time, correction, supersession and rollback

`MappingVersion` contains mappingId, positive integer version, effectiveFrom,
effectiveTo, recordedAt, priorVersion, supersededBy reference where applicable,
correction reason, evidence revisions/digest, registry version, policy version
and approval references. Both record and closure/correction events are
append-only. A later closure derives the effective end in a projection; it
does not edit the original signed record. Expected-version checking prevents
two concurrent approvals.

Two replay modes are explicit:

- `AS_KNOWN`: resolve the exact event-time version using an explicit
  knowledgeCutoff; preserve the original result and approval facts.
- `CORRECTED`: apply recorded invalidations/corrections to the affected interval;
  output a new revision with correction provenance and mark affected original
  analytics non-actionable. Never silently relabel AS_KNOWN output.

If a match is wrong, append invalidation with affected valid-time interval,
quarantine current dependent eligibility and retain every prior fact. Create a
new reviewed candidate/version to correct it. Supersession closes the prior
interval and opens the new interval only after complete approval. Future
analytics may replay/re-evaluate through a documented invalidation reference;
Phase 2B.1 emits that contract and does not run history jobs or an event bus.

Rollback is a new reviewed version restoring previously correct evidence and
policy, after current freshness/knowledge checks. It never deletes correction
history or resurrects an invalidated version in place. Fixture replay must
prove atomic projection replacement with no mixed registry/policy/mapping set.
Past wrong approvals remain inspectable and are never offered as current
actionable truth.

## 11. Key and deterministic evaluation

Compatibility key fields, in fixed order:

```text
instrument-exposure-pilot/v1
DERIVATIVE
canonicalBaseAssetId
canonicalQuoteAssetId
canonicalSettlementAssetId
PERPETUAL
LINEAR
BASE_UNIT
```

Encoding is the exact ASCII prefix `instrument-exposure-pilot/v1|` followed by
the seven remaining fields, each encoded as its base-10 UTF-8 byte length,
colon, and exact bytes, with no separator or normalization between fields.
This new analytical key uses byte lengths; do not change the frozen
JS-code-unit-prefixed InstrumentId. Excluded
from the compatibility key: venue/official ID (retained in each leg), display
ticker, native multiplier (checked dimensionally), lifecycle/time (gates),
fees/funding/prices/book data (later calculations), account collateral (no
account mode), and mapping/registry version (explicit result provenance).
Equality of the key alone is never approval.

Identical input snapshot, asset registry, policy, manual mapping/event set,
evaluationAt and knowledgeCutoff produce identical candidates and outcomes.
Sort by raw UTF-8 byte order of frozen instrument IDs; order left/right
canonically; exclude same-venue pairs; group by known compatibility key before
enumeration; never silently sample overflows. Candidate IDs use SHA-256 of
domain-separated canonical serialized ordered references and input revisions.
Canonical serialization uses documented fixed field order, exact decimal
strings, UTF-8, LF and one final newline, with no machine path, wall-clock,
random value or locale ordering. createdAt comes from supplied proposal input,
not evaluator wall clock. Digest collisions fail closed if content differs.

Evaluation emits finite events for proposal, evaluation, approval, rejection,
conflict, quarantine, expiry, invalidation, supersession, stale evidence,
resource failure and rollback. Metrics permit only the three pilot venues,
finite outcomes/reason codes, `PILOT_V1` policy family and confidence classes.
IDs, symbols, aliases, full versions, free text and digests are bounded event
fields only and never metric labels.

## 12. Fail-closed reason catalogue and acceptance fixtures

All fixtures below are documentation examples for future synthetic local
tests. `asset:A`, `asset:B`, `asset:USDT`, `asset:USDC` are synthetic approved
registry IDs, not real production approvals. Unless overridden, both legs have
complete fresh supported ACTIVE ordinary linear-perpetual evidence and
independent reviews. Outcomes test the whole policy, not ticker resemblance.

| #   | Fixture                                                                  | Expected outcome / primary reason                                                                                        |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Same asset A, same USDT quote/settlement, same known economics, reviewed | MATCHED / `COMPATIBLE_APPROVED`                                                                                          |
| 2   | Same ticker, asset A versus B                                            | NOT_MATCHED / `BASE_ASSET_MISMATCH`                                                                                      |
| 3   | USDT versus USDC settlement                                              | NOT_MATCHED / `SETTLEMENT_ASSET_MISMATCH`                                                                                |
| 4   | Linear versus inverse                                                    | NOT_MATCHED / `VALUE_CONVENTION_MISMATCH`                                                                                |
| 5   | Perpetual versus dated; also equal-expiry dated pair                     | NOT_MATCHED / `DATED_PRODUCT_EXCLUDED`                                                                                   |
| 6   | Same base exposure with factors 1 / 0.001 / 100 and known units          | MATCHED / `COMPATIBLE_APPROVED`; native quantity remains per-leg                                                         |
| 7   | Missing multiplier, including frozen Binance/Bybit UNVERIFIED            | UNAVAILABLE / `MULTIPLIER_UNKNOWN`                                                                                       |
| 8   | Unknown lifecycle                                                        | UNAVAILABLE / `LIFECYCLE_UNKNOWN`                                                                                        |
| 9   | Reviewed direct native alias, complete units                             | MATCHED / `COMPATIBLE_APPROVED`, confidence REVIEWED_MANUAL                                                              |
| 10  | Conflicting manual identity bindings                                     | QUARANTINED / `ASSET_BINDING_CONFLICT`                                                                                   |
| 11  | Superseded mapping                                                       | Current UNAVAILABLE / `MAPPING_SUPERSEDED`; historical AS_KNOWN resolves old version within interval                     |
| 12  | Rebrand of unchanged identity                                            | Same asset ID; new registry version at effective time; old replay retains old label/revision                             |
| 13  | Duplicate ticker without authoritative registry bindings                 | AMBIGUOUS / `ASSET_IDENTITY_UNKNOWN`; no candidate approval                                                              |
| 14  | Non-pilot/unsupported family                                             | NOT_MATCHED / `PRODUCT_UNSUPPORTED`                                                                                      |
| 15  | Metadata age 60 seconds plus one millisecond                             | UNAVAILABLE / `EVIDENCE_STALE`; exactly 60 seconds accepted if other gates pass                                          |
| 16  | Known zero/negative multiplier                                           | UNAVAILABLE / `MULTIPLIER_INVALID`                                                                                       |
| 17  | Known incompatible quantity/value units                                  | NOT_MATCHED / `CONTRACT_UNIT_MISMATCH`                                                                                   |
| 18  | Unapproved candidate                                                     | UNAVAILABLE / `MAPPING_UNAPPROVED`                                                                                       |
| 19  | Quarantined/invalidated mapping                                          | QUARANTINED / `MAPPING_QUARANTINED`; UNAVAILABLE / `MAPPING_INVALIDATED` respectively                                    |
| 20  | Unknown frozen convention / capability                                   | UNAVAILABLE / `VALUE_CONVENTION_UNVERIFIED` / `CAPABILITY_UNAVAILABLE`                                                   |
| 21  | Alias-to-alias or cycle                                                  | QUARANTINED / `ALIAS_CHAIN_FORBIDDEN`                                                                                    |
| 22  | Multiplier/native evidence disagrees with normalized metadata            | QUARANTINED / `METADATA_EVIDENCE_CONFLICT`                                                                               |
| 23  | Concurrent overlapping approved versions                                 | QUARANTINED / `MAPPING_INTERVAL_CONFLICT`                                                                                |
| 24  | Inactive/pre-listing/suspended/delisting/expired                         | UNAVAILABLE / `LIFECYCLE_NOT_ACTIVE`                                                                                     |
| 25  | Exact effectiveTo boundary or approval validity >30 days                 | UNAVAILABLE / `MAPPING_EXPIRED`; invalid proposal / `EVIDENCE_TIME_INVALID`                                              |
| 26  | Same command ID/different digest, self-review, stale expected revision   | Reject without mutation / `COMMAND_DIGEST_CONFLICT`, `REVIEWER_SEPARATION_REQUIRED`, `MAPPING_REVISION_CONFLICT`         |
| 27  | Ordinary PERPETUAL canonical enum backed by OKX xperp native family      | NOT_MATCHED / `SPECIAL_PRODUCT_EXCLUDED`                                                                                 |
| 28  | Wrong historical approval corrected later                                | AS_KNOWN preserves original revision; CORRECTED returns UNAVAILABLE / `MAPPING_INVALIDATED` for affected interval        |
| 29  | Bound reached / bound exceeded; permutation replay                       | At-bound evaluates normally; overflow UNAVAILABLE / `MATCHING_BOUND_EXCEEDED`; identical ordered output for permutations |

Additional closed codes: `INPUT_INVALID`, `EVIDENCE_TIME_INVALID`,
`COLLATERAL_ECONOMICS_UNVERIFIED`, `PAYOFF_MISMATCH`, `SAME_VENUE_EXCLUDED`,
`SPOT_DERIVATIVE_MISMATCH`, `PRODUCT_ENUM_UNVERIFIED`,
`QUOTE_SETTLEMENT_MISMATCH`, `QUOTE_ASSET_MISMATCH`,
`NATIVE_ASSET_REFERENCE_UNAVAILABLE`,
`DUPLICATE_EXPOSURE_CONFLICT`, `DECIMAL_BOUND_EXCEEDED`,
`EVALUATION_CANCELLED`, `TRANSITION_REJECTED`, `DIAGNOSTICS_TRUNCATED`.
Code additions require policy version review; raw exchange errors cannot become
reason codes. Unknown asset, missing economics, unapproved/superseded mapping,
stale evidence and every conflict remain diagnostic/displayable only.

Required properties: compatibility symmetry; distinct venue identity;
USDT/USDC inequality; ordering/permutation determinism; no transitive inferred
aliases; no actionability from extra incomplete evidence; effective interval
boundaries; reviewer separation; unchanged AS_KNOWN replay; atomic rollback;
overflow/cancellation leaves prior accepted state intact. Fault tests remove
registry/evidence revisions, inject lifecycle/economic conflict, reorder or
duplicate commands and exceed each bound. No runtime fixtures are created by
this task.

## 13. Matching resource and security policy

These are matching input/operation limits, not adapter transport limits or a
universal analytics SLO. The full input must pass before any match is published.

| Limit                                             | Pilot maximum / rule                                                                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instruments per operation                         | 1,024 total across the three pilot groups; duplicate instrument revisions conflict                                                                    |
| Canonical asset bindings supplied                 | 4,096; direct alias depth 1; cycles/alias-to-alias rejected                                                                                           |
| Candidate partners per instrument                 | 32; both legs counted; no silent top-N selection                                                                                                      |
| Candidate pairs per operation                     | 8,192; preflight grouping/counting before pair materialization                                                                                        |
| Mapping versions loaded per mapping               | 64; missing historical segment returns UNAVAILABLE rather than flattening history                                                                     |
| Mapping/event records per operation               | 4,096 total                                                                                                                                           |
| Evidence records per instrument / mapping version | 32; total evidence references 32,768                                                                                                                  |
| Conflict records                                  | 128; overflow rejects batch, diagnostic summary remains bounded                                                                                       |
| Diagnostics                                       | 200 total including final DIAGNOSTICS_TRUNCATED summary; no hostile payload dump                                                                      |
| Opaque atomic IDs                                 | Frozen 160 UTF-16 code-unit bound plus maximum 640 UTF-8 bytes; official Unicode bytes preserved without case/NFC rewriting                           |
| Composite instrument/key reference                | 4,096 UTF-8 bytes; validate exact frozen encoding, not a display grammar                                                                              |
| Reason / description text                         | 512 UTF-8 bytes each; no control characters or executable markup                                                                                      |
| Timestamps                                        | Frozen validated UTC millisecond/calendar range; explicit receive/processing/evaluation/recorded time; invalid or missing required time rejects input |
| Individual structured evidence record             | 8 KiB; no raw source payload attachment                                                                                                               |
| Total supplied serialized input                   | 16 MiB; fatal UTF-8, closed schema, depth 16, 100,000 nodes, 64 keys/object                                                                           |
| Serialized output                                 | 16 MiB; fail before publication                                                                                                                       |
| Decimal / arithmetic                              | Frozen wire length 256, digits 78, wire scale 36, domain scale 78; overflow fails                                                                     |
| Deterministic work budget                         | 100,000 explicit record/pair/evidence validation steps per operation; exhaustion fails whole batch                                                    |
| Cancellation                                      | Caller signal checked before work and at each bounded chunk of at most 128 steps; no result publication after cancellation                            |

Array limits follow each named collection bound; generic array maximum 32,768
does not override a narrower field limit. No live I/O, database, RBAC runtime,
event bus, credentials or time-driven retries exist. Replay loads an explicit
bounded segment and rejects incomplete required history; it cannot cap history
and silently accept a guessed current version. Wall-clock processing SLO and
production scheduling are D-064/SRE decisions; this policy's deterministic
work budget is the acceptance invariant.

Conceptual ports remain pure: candidate generator, evaluator, canonical asset
registry reader, effective-version resolver, mapping command evaluator and
bounded audit/invalidation result sink. Only fixture-backed in-memory readers
are contemplated for Phase 2B.1. Manual content is validated as data and never
executed or fetched. New dependencies or frozen-contract corrections require
separate scope approval.

## 14. Alternatives, gates and revisit rules

| Alternative                                             | Evaluation / decision                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Ticker-only / concatenated-symbol matching              | Rejected: collisions, aliases and economic prefixes do not prove identity                                           |
| Canonical symbol-only asset registry                    | Rejected: names can collide/rebrand; choose opaque reviewed IDs                                                     |
| Automatic external-metadata / price-similarity approval | Rejected: no deterministic official proof; network changes break replay                                             |
| Same chain/address always implies same CEX instrument   | Rejected: wrapper, venue claim, unit and settlement economics still differ                                          |
| Broad perpetual/dated/spot/inverse pilot                | Deferred: increases lifecycle/payoff/expiry policy beyond frozen evidence                                           |
| USDT/USDC parity conversion                             | Rejected for pilot under D-019                                                                                      |
| Require identical raw multipliers                       | Rejected: unnecessarily excludes exactly compatible base exposure; explicit known normalization is required instead |
| Assume multiplier 1 for Binance/Bybit                   | Rejected: violates their frozen UNVERIFIED state                                                                    |
| Manual override of unknown economics or conflict        | Rejected: review cannot fabricate an official contract fact                                                         |
| One-to-many active identity / best-match score          | Rejected: conflicts quarantine all affected records                                                                 |
| Mutable correction or deletion of history               | Rejected: historical results must resolve their exact approved version                                              |
| Implement registry persistence/admin workflow now       | Deferred: fixture-backed contracts satisfy matching; production infrastructure needs separate approval              |

Implementation gate: Quant and Market Data attestations, independent D-055
formal acceptance, applicable D-064 matching approval, and a separate Product
Owner Phase 2B.1 task. Existing Phase 2B architecture acceptance is historical
and does not certify this decision. No implementation begins from this task.

Production gate: named operational registry owner/reviewers under D-016;
official economics evidence gaps independently resolved; current metadata and
capability evidence; D-015 rights/geography; approved production D-064/SRE
policy and any separately approved audit/persistence runtime. No live pair is
enabled merely because the synthetic acceptance matrix passes.

Revisit requires a new policy revision and authority review for new products,
cross-settlement conversion, asset unit/issuer/wrapper change, non-unit OKX
ctMult, new official Binance/Bybit multiplier evidence, mapping incident,
larger workload or lifecycle disagreement. Funding, spread and execution
semantics remain owned by their existing later decisions. ADR 0009 already
governs the pure analytics boundary; no new ADR is necessary.

## 15. Verification evidence

This is decision-task evidence, not a formal independent acceptance report.
Verification date: 2026-09-14. Git authority at task entry:
`3d06712b0cf2958d6920845940314a62fdc391b1`.

Clean Node verification used `/tmp/holyparser-d055-verify.vPkOgp`, without
inherited `node_modules`, with **Node 24.18.1 / npm 11.16.0**. The isolated
source copy was checked against the working tree: **199 code/configuration
files, zero differences**. The prior clean copy's Windows Gradle wrapper had
LF checkout normalization; its exact CRLF bytes were restored in the temporary
verification copy only. The repository wrapper was not modified. Git comparison
between the prior copy's commit and the task-entry commit showed documentation
changes only, not a different application/dependency baseline.

| Command / check                                                                              | Exact result                                                                                       |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PATH=/opt/homebrew/opt/node@24/bin:$PATH npm ci` in isolated directory                      | Exit 0; 450 packages added, 458 audited; 7 workspaces                                              |
| `npm run format:check`                                                                       | Exit 0; repository formatting passed                                                               |
| `node node_modules/prettier/bin/prettier.cjs --check <eight D-055 documents>`                | Exit 0; all eight passed (root formatting does not cover all top-level docs)                       |
| `npm run lint`                                                                               | Exit 0; all seven workspaces passed                                                                |
| `npm run typecheck`                                                                          | Exit 0; all seven workspaces passed                                                                |
| `npm run test`                                                                               | Exit 0; 39 discovered test files: 36 passed, 3 skipped; 337 tests: 334 passed, 0 failed, 3 skipped |
| Markdown/local-file and header-anchor validator                                              | 65 Markdown files, 68 links, 46 local links, 0 broken files/anchors                                |
| `git diff --check`                                                                           | Exit 0; no whitespace errors                                                                       |
| `git diff HEAD --name-only -z` + untracked-file allowlist + pre-existing package digest      | Eight task documents; only unrelated `package.json`; 0 unauthorized paths                          |
| Frozen Phase 2A/D1, brand and implementation-evidence byte comparison to prior accepted copy | 106 frozen document/brand/evidence files; 0 differences                                            |
| Frozen package/application/TSX/layout/route/infrastructure and lockfile diff                 | Empty; included in 199-file byte comparison and final Git scope check                              |
| Accepted Phase 2B architecture acceptance / ADR 0009                                         | Unchanged; included in frozen comparison                                                           |
| D1/D2 and Product/Commerce/Admin dedicated frozen-document diff                              | Empty; shared registers receive D-055-only amendments                                              |
| Accepted Phase 2B plan boundaries outside section 6                                          | Byte-identical global exact rules, 2B.2–2B.7 formulas/contracts, and later plan/prompt             |
| Brand SHA-256 comparison, before and after                                                   | All three accepted hashes match, as listed below                                                   |

Test breakdown:

| Workspace                   | Files | Passed tests | Failed | Skipped |
| --------------------------- | ----: | -----------: | -----: | ------: |
| design-tokens               |     4 |           74 |      0 |       0 |
| contracts                   |     1 |            4 |      0 |       0 |
| market-data                 |     4 |           57 |      0 |       0 |
| okx-public-adapter          |     9 |           52 |      0 |       1 |
| binance-usdm-public-adapter |     9 |           72 |      0 |       1 |
| bybit-linear-public-adapter |    10 |           69 |      0 |       1 |
| web                         |     2 |            6 |      0 |       0 |
| Total                       |    39 |          334 |      0 |       3 |

The three skipped tests are default-off exchange canaries. No live exchange
probe, runtime fixture, new test, production build or infrastructure operation
was needed or performed for this documentation task. Workspace pretest hooks
compile the existing market-data package in the isolated directory.

Frozen brand references:

| File under `docs/brand/references/` | SHA-256                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `holyparser-dark.png`               | `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08` |
| `holyparser-design-system.png`      | `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54` |
| `holyparser-logo-system.png`        | `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c` |

Other preserved digests:

- Pre-existing unrelated `package.json`:
  `41f156d410cb2db2b6c73479c82bae8b705778dd41eed090284b39c69243823e`.
  Its four aggregate scripts already included design-token checks before this
  task; no dependency, script or workspace change was made here.
- `package-lock.json`:
  `490609469b0fb2bb5075a1c902cbb6eef262cf39e1cfb3be5aef37aac55c6de5`.
- Accepted global exact-decimal plan section:
  `df448b0f21c8ed622b2316431494452c4f365dc6eb8967ee2f2765b14f9a2114`.
- Accepted 2B.2–2B.7 formula/contract sections:
  `527c447ef6f1a9680627aef01cc0239d2191a41311cb1d3c836fb47d490fb317`.
- Accepted later plan/prompt sections:
  `cf33d887e96fac68158e2970747777c10f4e76bcb19f487b3587ffbd655f5d7c`.

Environment attempts are not acceptance evidence: a no-hardlink Git clone
failed with an iCloud object-read timeout; a shared clone checkout was stopped
after stalling. Hydration and a fresh dependency install in the verified local
copy provided the successful suite above. A prematurely started workspace
installation was cancelled and is not counted as clean verification. A later
workspace-only restore attempt failed under disk pressure, and an offline
attempt could not read the cloud-backed manifest/lockfile (`ETIMEDOUT`). The
ignored `node_modules` was restored from the successful isolated locked install;
only its failed-install/generated leftovers were removed. The isolated install
was preserved through an APFS clone. These host operations are not additional
acceptance results. No tracked application, manifest, lockfile, dependency
declaration or infrastructure file was changed by these attempts.

The last document-format rerun passed and manifest/lockfile digests still
matched, but its subsequent host `git diff --check` terminated with SIGBUS
(exit 138). The earlier complete Git/scope/frozen checks above passed; the
last host repeat is explicitly **not** a pass. A fully materialized, healthy
local Git worktree and a fresh final scope/diff check are required before
independent acceptance/freeze. This environmental limitation does not replace
the successful isolated Node suite or authorize repository/infrastructure repair
inside this documentation task.

`npm ci` reports pre-existing full-tree audit debt: **7 vulnerabilities
(2 moderate, 4 high, 1 critical)**, plus existing install-script policy warnings
for `fsevents` and `unrs-resolver`. No audit fix, dependency approval or package
change was attempted. This is separate dependency-maintenance/security debt;
passing documentation tests is not a production dependency/security approval.

Decision readiness: the technical policy and approval questions are fully
specified and ready for independent review. D-055 is **not yet APPROVED**:
Quant/Market Data attestations, independent decision acceptance and applicable
D-064 authority are still gates. Phase 2B.1 remains explicitly unauthorized.

## 16. Exact recommended next task

```text
Read AGENTS.md and all frozen Phase 2A instrument/adapter, accepted Phase 2B,
domain, API, security, risk, decisions and acceptance documents completely.
Review docs/PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION.md completely.

Perform a formal independent documentation acceptance review of D-055 only.
Treat its Product task approval as recorded scope authority; verify and record
separately identifiable Quant and Market Data approval attestations against
the exact decision revision/digest before marking D-055 APPROVED. If those
attestations are not supplied, report the approval blocker explicitly.

Independently verify frozen five-part venue identity versus analytical exposure
identity, curated asset bindings, exact USDT/USDC separation, the conservative
linear-perpetual matrix, native-family gates, known multiplier/unit economics,
actual Binance/Bybit evidence gaps, lifecycle/freshness, candidate/status/quality
outcomes, reviewer separation, immutable valid-time and knowledge-time history,
correction/rollback, all 29 documented fixtures/reasons and bounded determinism.
Review the applicable D-064 matching authority gate separately; do not imply
that later book, skew, spread, funding or SRE policies are approved.

Inspect repository/diff and preserve the pre-existing package.json change.
Use pinned Node 24 for documentation formatting, lint, typecheck, default tests,
local-link validation, diff/scope/frozen-boundary and brand SHA-256 checks.
Do not run live APIs or exchange canaries. Fix only documentation BLOCKER/HIGH
defects without changing frozen contracts, formulas, D1/D2 or brand references.

Create docs/PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION_ACCEPTANCE.md with status,
findings/remediations, exact verification counts, authority/gap verdicts, freeze
recommendation and the exact next task. Do not implement Phase 2B.1, modify code,
dependencies, manifests, lockfiles or infrastructure, begin another phase, or
create a commit. Passing review does not authorize implementation; request it
only as a separate Product Owner task after all applicable gates are satisfied.
```
