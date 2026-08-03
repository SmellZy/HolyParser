# ADR-0009: Deterministic spread-analytics boundary

- Status: Proposed; implementation requires product-owner approval
- Date: 2026-08-03
- Owners: Product, Quant, Architecture, Security
- Scope: Phase 2B

## Context

The frozen Phase 2A packages produce source-provenanced canonical instrument,
price, funding, and order-book observations. Spread analytics must combine
those observations without weakening their identity, exact-decimal,
capability, quality, or sequence guarantees.

Putting matching or financial calculations inside venue adapters would couple
business meaning to exchange-native payloads. Combining eligibility, ranking,
notifications, positions, and execution would also turn a read-only analytical
component into an implicit command boundary.

## Decision

Phase 2B is a pure, deterministic, read-only domain boundary.

1. It consumes immutable canonical observations and metadata by reference; it
   does not call exchange adapters.
2. Canonical matching is a separate governed step. Display ticker equality is
   evidence at most and can never create canonical identity.
3. Financial arithmetic uses the frozen exact-decimal type. Division requires
   a named scale and rounding policy.
4. Every result records input revision, match version, formula/rule version,
   provenance, units, quality, and availability.
5. Missing or incompatible required input produces a typed unavailable result.
   Unknown cost is not zero.
6. Eligibility gates precede opportunity actionability and ranking. Stale,
   gapped, invalid, unsupported, unverified, research-required, or ambiguous
   required inputs are non-actionable.
7. Executable market input, valid analytics, displayable analytics, comparable
   analytics, and actionable analytics are separate classifications. A higher
   classification requires all lower applicable gates, and none grants trading
   authority.
8. Native funding observations are preserved. Any normalized comparison is a
   separately named and versioned derivation.
9. History ports and replay contracts may be defined, but persistence remains
   outside Phase 2B until separately approved.
10. Analytics has no user position, notification, Risk Engine, Execution Engine,
    exchange credential, or trading authority.
11. Metric dimensions are finite allowlisted enums. Full formula, rule, policy,
    mapping, and input versions are structured-event fields, not metric labels.
12. Each subphase is independently accepted and frozen before its dependent
    subphase begins.

## Consequences

- Results can be reconstructed and audited from versioned inputs.
- Adapters remain isolated and reusable.
- Unknown and poor-quality data reduce availability rather than silently
  producing attractive numbers.
- Product decisions about formula direction, units, costs, funding alignment,
  lifecycle thresholds, anomaly rules, history, and ranking must be explicit
  before their respective implementations.
- Later UI, notification, position, and execution components consume analytics
  contracts but cannot place commands through this boundary.

## Rejected alternatives

- **Calculate spreads inside each adapter:** duplicates financial logic and
  permits venue semantics to leak into canonical meaning.
- **Match concatenated symbols:** merges assets and products incorrectly,
  including USDT/USDC and expiry differences.
- **Use binary floating point for convenience:** violates exact financial
  invariants and deterministic replay.
- **Treat unknown costs or intervals as zero/default:** creates misleading
  expected results.
- **Use one opaque opportunity score:** hides eligibility, completeness, and
  formula assumptions.
- **Add persistence with history contracts:** introduces infrastructure before
  retention, correction, and reproducibility decisions are approved.
- **Allow analytics to invoke risk or execution:** crosses the read-only trust
  boundary and creates trading authority.

## Verification

Every Phase 2B subphase must prove deterministic replay, exact-decimal behavior,
typed unavailable outcomes, finite metric cardinality, hostile-input/resource
bounds, and absence of forbidden dependencies. Frozen adapter-package diffs
must remain empty.
