# ADR-0010: Entitlements over plan-name checks

- Status: Accepted for future architecture
- Date: 2026-08-03
- Scope: product access and commerce integration

## Context

Plan names are commercial presentation and change over time. Access can also
come from trial, promotion, partner, compensation, admin or lifetime grants.
Direct plan-name checks cannot represent overlaps, limits, expiry, revocation or
provenance and make migrations unsafe.

## Decision

All feature authorization queries a versioned `EffectiveEntitlement`. Plans and
PlanVersions are bundles that issue source-backed `EntitlementGrant` facts. A
deterministic evaluator handles validity, precedence, merge policy, limits,
revocation, grace and conflict quarantine. Provider redirects and frontend state
are never grant sources.

Every entitlement decision exposes a revision, policy version and typed denial
or unavailability reason. Financial safety and reconciliation paths are not
disabled merely because commercial access is degraded.

## Consequences

- Catalog, subscription, promotion and administration share one access model.
- Cached decisions require explicit invalidation and expiry bounds.
- Plan migrations do not require feature-code string changes.
- The evaluator and grant ledger become security-sensitive and need replay,
  concurrency, audit and policy-version tests.
- Product owners must approve per-entitlement precedence and merge semantics.

## Rejected alternatives

- Checking `plan == PRO` in frontend/backend feature code.
- Granting access from a checkout return URL.
- Letting every provider adapter write application permissions directly.
- Treating a missing limit or evaluator error as unlimited access.
