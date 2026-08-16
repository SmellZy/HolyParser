# Subscription and Entitlement Architecture

Status: future commerce architecture; no provider, database or access-control
implementation is authorized.

## 1. Core decision

Feature code asks for an effective entitlement, never a plan name. A `Plan` is a
marketed bundle; an `EntitlementDefinition` is a versioned right or limit;
`EffectiveEntitlement` is the deterministic, account-scoped evaluation result.
Frontend claims, checkout redirects and payment clients cannot grant access.

Examples of forbidden logic include `plan === "pro"`, trusting a price ID in the
browser, or treating `payment_success=true` as access. The authoritative path is
verified commerce state → grant/revocation ledger → deterministic evaluation →
authorization decision.

Illustrative entitlement keys are `scanner.realtime`, `spread.depth.vwap`,
`alerts.realtime`, `alerts.telegram`, `history.30d`, `exchanges.4`, `api.read`
and `team.members`. Their exact catalogue and limits require C1 approval.

## 2. Domain model

| Entity/value            | Required meaning                                                              |
| ----------------------- | ----------------------------------------------------------------------------- |
| `Product`               | stable commercial product identity                                            |
| `Plan`                  | stable marketed bundle identity, draft/published/retired lifecycle            |
| `PlanVersion`           | immutable entitlements and commercial presentation effective for a time range |
| `Price`                 | immutable currency, amount, billing interval, tax mode and effective range    |
| `BillingInterval`       | explicit cadence; never inferred from a price label                           |
| `EntitlementDefinition` | stable key, scope schema, value/limit type and evaluation policy version      |
| `PlanEntitlement`       | immutable PlanVersion-to-definition grant specification                       |
| `EntitlementGrant`      | append-only source-backed grant or revocation fact                            |
| `EffectiveEntitlement`  | evaluated allowed/value/limit, sources, validity and revision                 |
| `UsageLimit`            | entitlement-bound exact or integer limit plus window policy                   |
| `UsageCounter`          | account, entitlement, window, exact accepted usage and revision               |
| `TrialPolicy`           | eligibility, duration, included grants and transition policy                  |
| `Subscription`          | account/product/provider-neutral commercial agreement                         |
| `SubscriptionPeriod`    | immutable start/end, plan version, price and outcome                          |
| `GracePeriod`           | separately reasoned temporary access window                                   |
| `AccountCredit`         | currency-specific immutable credit ledger entry; not an entitlement           |

Money uses exact decimal plus ISO currency; usage uses an explicit dimension.
USDT, USDC and fiat currencies never share identity or balances implicitly.

## 3. Grant ledger

`EntitlementGrant.source` is one of:

`SUBSCRIPTION`, `PROMOTION`, `TRIAL`, `ADMIN_GRANT`, `PARTNER`,
`COMPENSATION`, `LIFETIME_PURCHASE`.

Every grant records stable grant ID, account, entitlement definition/version,
typed value or exact limit, scope, source and source reference, valid-from and
valid-until, issued-at, issuer actor/system, reason code, policy version,
idempotency key, correlation ID and audit reference. Revocation is an immutable
fact with effective time, actor, reason and link to the grant; rows are not
silently deleted or edited.

Manual/admin grants require independent permission, bounded validity by default,
reason and audit. `LIFETIME_PURCHASE` means the legally approved lifetime of the
specified product/entitlement version and account—not an undocumented promise of
perpetual company or provider operation. Its exact policy is product/legal
blocked.

## 4. Deterministic effective-access evaluation

Evaluation input is an account, environment, evaluation instant and a stable
ledger/catalog revision. Version `entitlement-evaluation.v1` follows:

1. Load published definitions and all relevant non-deleted grant/revocation
   facts within bounded scope.
2. Validate tenant, product, environment, scope, effective times and source
   provenance; quarantine malformed/conflicting facts.
3. Remove grants not yet effective, expired, revoked, suspended by an approved
   source policy or incompatible with the definition version.
4. Apply a versioned `AccountAccessRestriction` overlay before ordinary grants.
   A current security/legal suspension denies its explicitly scoped commercial
   capabilities regardless of grant source, but cannot deny emergency risk,
   reconciliation or safe-close capabilities. The restriction records actor or
   system provenance, reason, scope, effective interval, revision and audit; it
   never deletes or rewrites grants.
5. Group by entitlement and scope. Boolean rights use deny-by-security-policy,
   then explicit source policy; limits use the definition's named merge policy
   (`MAX`, `SUM`, `MIN` or `REPLACE_BY_PRECEDENCE`)—never an implicit merge.
6. Apply deterministic source precedence approved per definition. The initial
   recommendation is security/policy denial > explicit revocation > temporary
   admin/compensation > promotion/partner > subscription/lifetime > trial, but
   product/security must approve the actual table before implementation.
7. Return value/limit, validity horizon, winning and shadowed sources, evaluation
   revision, policy version and typed unavailability/conflict reason.

Overlaps never extend time or add limits unless the definition's approved merge
policy says so. Expiry and revocation recalculate immediately. Plan upgrades may
activate at verified effective time; downgrades default to period end unless an
approved policy says otherwise. Grace grants are explicit and temporary.
Suspension cannot remove access needed to secure/close existing live positions,
reconciliation or emergency handling.

### 4.1 Recalculation and cache

Grant, revocation, subscription, catalog, usage-window and clock-boundary events
produce an idempotent recalculation request. The effective result is versioned;
caches are bounded by the earliest source expiry and invalidated by account and
catalog revision. Cache miss or evaluator failure denies newly requested paid
features with a typed temporary-unavailable reason, but must not interrupt
emergency safety paths.

Every authorization records entitlement key, decision, effective revision and
policy version without logging sensitive payment data. Reconciliation compares
ledger facts, subscription state and provider evidence; it never edits history.

## 5. Subscription lifecycle

States:

`INCOMPLETE`, `TRIALING`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `PAUSED`,
`CANCEL_AT_PERIOD_END`, `CANCELLED`, `EXPIRED`, `PAYMENT_REVIEW`,
`CHARGEBACK_REVIEW`.

| Trigger                              | From                                                           | To / rule                                                                                   |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Create without verified payment      | none                                                           | `INCOMPLETE`                                                                                |
| Eligible trial starts                | `INCOMPLETE`                                                   | `TRIALING` with explicit trial grant                                                        |
| Verified activation/renewal          | `INCOMPLETE`, `TRIALING`, `PAST_DUE`, `GRACE_PERIOD`, `PAUSED` | `ACTIVE` at verified effective time                                                         |
| Renewal fails                        | `ACTIVE`                                                       | `PAST_DUE`; no guessed provider retry                                                       |
| Approved grace begins                | `PAST_DUE`                                                     | `GRACE_PERIOD` with explicit end                                                            |
| Access pause                         | `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`                           | `PAUSED` according to approved safety policy                                                |
| Resume with valid entitlement source | `PAUSED`                                                       | `ACTIVE` or `PAST_DUE` from current evidence                                                |
| Schedule cancellation                | `ACTIVE`, `TRIALING`, `GRACE_PERIOD`                           | `CANCEL_AT_PERIOD_END`                                                                      |
| Undo scheduled cancellation          | `CANCEL_AT_PERIOD_END`                                         | prior current evidence state                                                                |
| Period ends after scheduled cancel   | `CANCEL_AT_PERIOD_END`                                         | `CANCELLED`, then grants expire at their explicit boundary                                  |
| No restoration after allowed horizon | `INCOMPLETE`, `CANCELLED`, `PAST_DUE`, `GRACE_PERIOD`          | `EXPIRED` by policy                                                                         |
| Ambiguous provider/payment evidence  | any nonterminal                                                | `PAYMENT_REVIEW`; no new access is inferred                                                 |
| Chargeback evidence                  | applicable                                                     | `CHARGEBACK_REVIEW`; action follows approved legal/safety policy                            |
| Verified refund evidence             | applicable                                                     | `PAYMENT_REVIEW` until the approved refund/access policy resolves the resulting state       |
| Reconciliation resolves review       | `PAYMENT_REVIEW`, `CHARGEBACK_REVIEW`                          | `ACTIVE`, `PAST_DUE`, `CANCELLED` or `EXPIRED` only from current period evidence and policy |

Upgrade, downgrade, proration, refunds, tax adjustments and provider-specific
pause behavior are commands that produce reviewed period/payment/grant facts;
they are not hidden state mutations. Exact policies remain product-owner
decisions. Terminal history is immutable; restoration creates a new period or
explicit transition backed by evidence.

Provider evidence is ordered by subscription, period and provider-neutral
evidence revision/effective time, not webhook arrival. An older, duplicate or
superseded event is retained for audit but cannot regress a newer accepted
period or clear a review state. Contradictory evidence enters `PAYMENT_REVIEW`
or `CHARGEBACK_REVIEW`; only explicit reconciliation against current provider
evidence may leave review. No generic activation event can restore access from a
review state.

## 6. Ports, commands, queries and events

Ports: `EntitlementCatalogPort`, `EntitlementLedgerPort`,
`EffectiveEntitlementEvaluator`, `UsageMeterPort`, `SubscriptionRepository`,
`CommerceClock`, `CommerceAuditPort` and provider-neutral billing ports from
`PAYMENT_ARCHITECTURE.md`.

Commands include create subscription, begin eligible trial, request plan
change, schedule/reactivate cancellation, record verified period outcome,
issue/revoke grant, consume usage and reconcile effective access. Every mutation
requires actor, authorization, idempotency key, expected revision and audit
context.

Queries include current plan, subscription timeline, effective entitlements at
a named instant/revision, usage windows and grant provenance. Events include
`SubscriptionStateChanged`, `EntitlementGrantIssued`, `EntitlementGrantRevoked`,
`EffectiveEntitlementsChanged`, `UsageAccepted/Rejected` and
`EntitlementConflictQuarantined`.

Typed failures distinguish unauthorized, forbidden, conflict, stale revision,
invalid transition, invalid scope, limit exceeded, provider evidence pending,
reconciliation required and temporarily unavailable.

## 7. Acceptance and unresolved policy

Tests must cover source overlap, expiry boundaries, clock skew, revocation,
temporary upgrade, period-end downgrade, grace, suspension, usage concurrency,
cache invalidation, duplicate/out-of-order events, replay and conflict
quarantine. The same ledger and policy revision must produce the same result.

Implementation is blocked on catalog, price/currency/tax, trial, grace,
proration, refund/chargeback, lifetime and source-precedence decisions recorded
in `DECISIONS_REQUIRED.md`.
