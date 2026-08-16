# Promotion Engine Architecture

Status: future commerce architecture; no redemption or checkout implementation
is authorized.

## 1. Boundary

The Promotion Engine evaluates eligibility and creates a versioned benefit
decision. It does not collect payment, activate a subscription or directly
grant an entitlement. A verified commerce workflow converts an accepted
redemption into price adjustments and/or source-backed `PROMOTION` grants.

## 2. Domain

| Entity                  | Required content                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Promotion`             | stable ID, lifecycle `DRAFT/PUBLISHED/PAUSED/ENDED`, owner, effective range, benefit and constraint versions      |
| `PromoCode`             | normalized lookup identity, stored digest/secret classification, display-safe suffix, use limits, effective range |
| `Redemption`            | account, promotion/code, checkout/subscription, decision, benefit snapshot, time, idempotency and audit           |
| `RedemptionReservation` | atomic pending claim, account/checkout binding, TTL, state and release/consume reason                             |
| `PromotionBenefit`      | typed value and duration semantics                                                                                |
| `PromotionEligibility`  | deterministic result, policy version and finite reason codes                                                      |
| `PromotionConstraint`   | typed predicate and bounded parameter set                                                                         |

Benefits may be percentage discount, fixed-amount discount, free trial period,
free subscription duration, one-time or limited recurring discount,
entitlement-only grant, temporary plan upgrade, temporary limit increase,
approved lifetime entitlement, and partner/referral attribution. Fixed discounts
and credits are currency-specific. Percentage and money values use exact
decimals with a named rounding policy at the final currency-minor-unit boundary.

Discount duration is explicitly `FIRST_PAYMENT`, `FIXED_NUMBER_OF_PERIODS`,
`UNTIL_DATE` or `FOREVER`. `FOREVER`, subscription lifetime, entitlement
lifetime and product lifetime are prohibited until legal/product scope is
approved.

## 3. Constraints and evaluation

Constraints may include `validFrom`, `validUntil`, total and per-user redemption
limits, first-purchase/new-user/existing-subscriber state, allowed and excluded
plans, allowed prices, billing intervals, currencies and regions, minimum exact
purchase, maximum exact discount, eligible account, eligible email or email
domain, verified-email requirement, account age, stackable/non-stackable policy,
campaign and partner attribution. No constraint may be inferred from a public
code string.

Evaluation is server-side against a stable catalog/account/subscription revision:
normalize → rate-limit/abuse gate → digest lookup → published/effective check →
constraint evaluation → atomic reservation → immutable benefit quote. Current
recommendation is one code per checkout and no stacking. If stacking is later
approved, ordering, compatible benefit classes, caps and rounding must be a
versioned product policy; no implementation may choose an order by convenience.

Discount evaluation relative to account credit, tax, proration and provider
coupons remains unresolved. Expected payable amount is unavailable if a required
input or policy is unknown.

## 4. Code security and concurrency

- Public campaign codes may be displayable; secret or one-time codes are
  high-entropy and stored as keyed digests where lookup requirements permit.
- Normalization is versioned and conservative; visually similar characters are
  not silently rewritten.
- Lookup failures return generic messages to reduce enumeration.
- Account, IP/network risk and code-family rate limits are bounded and audited.
- Multi-account velocity/eligibility abuse is detected with approved,
  privacy-minimized signals; ambiguous household cases go to review rather than
  automatic irreversible punishment.
- Reservation is atomic, idempotent and TTL-bound. Duplicate checkout requests
  reuse the same reservation; competing requests cannot exceed limits.
- Reservation consumption requires verified checkout/subscription evidence.
- Expired/failed checkouts release reservations deterministically; unknown
  provider outcome keeps them pending for bounded reconciliation.
- Code values and full eligibility context are excluded from metric labels and
  ordinary logs.

Affiliate/referral attribution, self-referral controls and payout accounting are
separate future decisions and are not implied by `PARTNER` grant provenance.

## 5. Commands, queries, events and audit

Commands: create/update draft, publish, pause/end, create/revoke code, evaluate,
reserve, consume, release and administratively revoke a resulting benefit.
Publishing and high-impact bulk code generation require dedicated permission;
mutations carry actor, reason, expected version, idempotency and audit context.

Queries expose safe eligibility/benefit previews, reservation/redemption status
and admin campaign metrics without secret code disclosure. Events include
`PromotionPublished`, `RedemptionReserved`, `RedemptionRejected`,
`RedemptionConsumed`, `ReservationExpired` and `PromotionBenefitRevoked`.

Audit captures policy/constraint/benefit versions, finite decision reasons and
before/after references, not raw secret codes.

Promotion lifecycle is `DRAFT`, `PUBLISHED`, `PAUSED`, `ENDED`; code lifecycle
is `DRAFT`, `ACTIVE`, `DISABLED`, `EXPIRED`; reservation lifecycle is
`RESERVED`, `CONSUMED`, `RELEASED`, `EXPIRED`; redemption outcome is
`ACCEPTED`, `REJECTED`, `REVOKED` or `REFUNDED_REVIEW`. Transitions require the
current immutable policy/version and cannot be recovered by client retry alone.

Ports are `PromotionCatalogPort`, `PromotionEligibilityEvaluator`,
`RedemptionReservationPort`, `RedemptionLedgerPort`, `PromotionClock` and
`PromotionAuditPort`. Queries require owning-account scope or a precise admin
read permission. Publish, batch generation and revocation require their exact
admin permissions and step-up where policy requires it.

Typed errors distinguish invalid/expired/not-found without leaking secret-code
existence, ineligible, limit reached, reservation conflict, currency mismatch,
price changed, stacking prohibited, stale version, rate limited, unauthorized,
forbidden and temporarily unavailable.

## 6. Acceptance

Required tests cover normalization, expiry edges, exact discount arithmetic,
currency mismatch, one-code rule, reuse limits, parallel reservation races,
duplicate/out-of-order provider events, unknown outcome, brute force, secret
redaction, grant expiry/revocation and deterministic replay. Promo stacking,
evaluation order, lifetime, affiliate and refund interaction decisions block
implementation.
