# ADR 0003: Canonical Market-Data Model

- Status: Accepted for Phase 2A.1
- Date: 2026-07-26

## Context

Public exchange products use incompatible instrument identifiers, settlement
roles, funding semantics, price names, decimal encodings, and capability sets.
A ticker-only or floating-point model would merge financially distinct products
and permit silent precision loss. Phase 2A.1 must define the invariant boundary
before any network adapter is written.

## Decision

### Identity

For a CEX, canonical instrument identity is the versioned combination of venue,
product group, official instrument ID, market type, and settlement asset. Each
component is an opaque branded identifier. Display ticker is presentation data.
USDT and USDC are distinct canonical assets.

The package defines a manual-mapping review contract with provenance, effective
time, distinct proposer/reviewer, and conflict quarantine. It does not implement
a registry or persistence workflow. DEX token identity requires a separate
chain/token-aware model.

### Exact decimals

Financial wire values remain strings through validation. The domain uses a
`bigint` coefficient and scale, with 78 coefficient digits, canonical wire scale
36, and internal scale 78. Canonical wires are plain decimals. A product-specific
contract may opt into scientific notation only through a separately named policy.

Division always requires output scale and one of the documented named rounding
policies. Exact division fails on a remainder. There is no implicit rounding,
clamping, `float`, or `double`.

### Semantics

Unknown, unsupported, unverified, and research-required metadata are distinct.
Native funding is stored with its documented semantic, interval, timing,
provenance, and quality. `normalized-funding-8h/v1` is a separate derived value.
Last, bid, ask, midpoint, mark, index, and oracle prices remain separate types;
adapter mapping cannot silently rename a native field.

Every observation carries exchange time when available, receive time, processing
time, source ID, and quality. Freshness thresholds are configured per venue,
product group, and channel. Observation timestamps require calendar-valid RFC
3339 values; JavaScript date normalization is not accepted as validation.

### Implementation boundary

The Phase 2A.1 model is a pure TypeScript workspace because it is a shared
contract/mock harness, not a deployed data-plane process. It has no runtime
dependency and no network boundary. The live process language and cross-process
serialization are decided in the separately approved adapter phase without
weakening these invariants.

## Consequences

- Exchange adapters must perform explicit validation and semantic mapping.
- Large values and identifiers avoid JavaScript safe-integer loss.
- Calculations can fail explicitly on scale, precision, or rounding instead of
  returning an approximate value.
- Consumers must handle knowledge and quality states rather than substitute
  defaults.
- A future Rust/Tokio data plane may implement the same versioned wire rules, but
  equivalence tests will be required at that boundary.
- The package does not itself solve asset-registry governance, persistence, or
  market-data distribution.

## Rejected alternatives

- **Ticker or concatenated-symbol identity:** aliases and settlement differences
  collide.
- **IEEE-754 number:** cannot guarantee exact prices, sizes, or rates.
- **Universal eight-hour funding:** exchange intervals and semantics vary.
- **Nullable fields only:** cannot distinguish unavailable from unverified or
  contradictory evidence.
- **One generic price field:** silently changes exchange-native meaning.
- **Scaffold a live service now:** adds deployment and network scope before an
  adapter is approved.
