# Provider-Neutral Payment Architecture

Status: future architecture; no fiat provider has been selected and no payment
implementation is authorized.

## 1. Trust boundary

HolyParser owns provider-neutral commercial state and reconciliation. A provider
owns its hosted payment method details and external event vocabulary. Provider
adapters translate verified evidence; they cannot write entitlements directly.

Required ports:

- `CheckoutProvider`;
- `PaymentProvider`;
- `SubscriptionBillingProvider`;
- `InvoiceProvider`;
- `RefundProvider`;
- `WebhookVerifier`;
- `ReconciliationProvider`.

Each capability is declared supported/unsupported/unverified/research-required.
Unsupported methods are absent, not empty successful implementations.

## 2. Domain records

| Record                     | Required fields                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `PaymentCustomerReference` | account, provider, opaque customer reference, environment, status                                           |
| `CheckoutSession`          | internal ID, account, immutable quote/catalog revisions, provider reference, return origins, expiry, state  |
| `PaymentAttempt`           | attempt ID/number, exact amount/currency, purpose, provider reference, state and unknown-outcome flag       |
| `Payment`                  | verified provider payment identity, exact amount/currency, state, evidence time and reconciliation revision |
| `Invoice`                  | immutable line/discount/tax/credit totals, currency, period, provider reference and state                   |
| `Refund`                   | payment, exact amount/currency, reason, state, approvals and provider evidence                              |
| `Chargeback`               | provider case, disputed amount/currency, evidence deadlines, state and access-review link                   |
| `ProviderEvent`            | provider/event ID, verified digest, received time, provider time, type, processing state and safe reference |
| `ReconciliationResult`     | scope, expected/observed revisions, differences, outcome, follow-up and audit reference                     |

Financial values are exact decimals. Provider IDs are opaque bounded strings.
Raw payment instruments, CVV, bank credentials and unrestricted provider
payloads do not enter the application model or logs.

Provider-neutral lifecycles are explicit. Checkout is `CREATED`, `OPEN`,
`COMPLETED`, `EXPIRED`, `CANCELLED` or `UNKNOWN`; an attempt is `CREATED`,
`PENDING`, `SUCCEEDED`, `DECLINED`, `FAILED`, `UNKNOWN` or
`RECONCILIATION_REQUIRED`; invoice is `DRAFT`, `OPEN`, `PAID`, `VOID`,
`UNCOLLECTIBLE` or `REVIEW`; refund is `REQUESTED`, `PENDING`, `SUCCEEDED`,
`FAILED`, `UNKNOWN` or `REVIEW`; chargeback is `OPEN`, `EVIDENCE_REQUIRED`,
`WON`, `LOST`, `CLOSED` or `REVIEW`. Provider adapters map only officially
verified states; an unmapped value fails into review, not success.

## 3. Checkout and activation

1. An authenticated, authorized backend command validates account, catalog,
   price, currency, promotion reservation and idempotency.
2. It creates an immutable internal quote and a provider checkout session through
   an allowlisted adapter.
3. The browser receives only the provider-safe redirect/client reference.
4. Return/cancel redirects show `processing`, `failed` or reconciled state; they
   never activate a subscription.
5. A verified backend event or explicit reconciliation establishes payment and
   subscription evidence.
6. Subscription transition emits grant changes; the entitlement evaluator
   produces effective access.

No frontend-provided amount, currency, price, account, success flag or
entitlement is authoritative.

## 4. Webhooks and event processing

Webhook endpoints enforce provider/environment path allowlists, TLS, bounded
body before parsing, timestamp/replay window and provider-current signature
verification over the required raw bytes. Secrets live in an approved secret
manager and are rotatable per environment.

`(provider, environment, providerEventId)` is unique. Verified events are stored
before side effects and processed idempotently. Duplicate events return a safe
success after matching the stored digest; same ID with different digest is a
security conflict. Missing, reordered or delayed events are valid operating
conditions and are resolved by state-version rules plus reconciliation—not
arrival-order assumptions.

Handlers distinguish accepted, permanent rejection, retryable internal failure,
unknown provider outcome and manual review. Retries are bounded with exponential
backoff and jitter, have no financial side effect without idempotency, and end in
dead-letter/manual-review state. Provider 5xx/timeouts never cause blind creation
of a second charge/refund/subscription.

## 5. Reconciliation and provider outage

Scheduled and operator-triggered reconciliation is bounded by account, provider,
time range and cursor. It compares provider state with local immutable attempts,
payments, invoices, refunds, chargebacks and subscriptions. Differences are
classified with finite reason codes; corrections produce new facts and audit.

During outage, new checkout may be disabled, pending results remain pending and
existing effective access follows approved grace policy. Emergency risk,
position closing and reconciliation must not depend on billing availability.
No provider outage is translated into success.

## 6. Rate limits, SSRF and data protection

Adapters use hardcoded official TLS origins/path templates, reject redirects to
unapproved origins, bound responses and timeouts, and never accept arbitrary
URLs from users or provider payloads. Local budgets and provider error classes
prevent retry storms. Provider event bodies are encrypted/retained only if legal
and operational policy requires them; normal telemetry uses safe IDs, type/state
enums and correlation IDs.

PCI scope, tax processing, statement descriptors, supported countries/currencies
and provider selection remain explicit product/security/legal decisions.

## 7. API and audit contract

Mutations require authenticated actor, permission, idempotency key, expected
resource/catalog version and correlation/audit context. Typed errors include
invalid quote, unsupported currency, price changed, promotion unavailable,
provider unavailable, payment pending, payment declined, unknown outcome,
signature invalid, replay, conflict and reconciliation required.

Audit records actor/system, permission, command, target, before/after safe state,
reason, idempotency, request/correlation, provider/event safe references and
outcome. It excludes secrets and full payloads.

Commands include prepare/expire checkout, accept verified provider event,
record/reconcile attempt, payment and invoice, request/reconcile refund and
classify chargeback. Queries expose owning-account safe summaries or exact-
permission admin timelines. Events are versioned state transitions with stable
source and idempotency identity. Typed errors distinguish invalid signature,
replay, duplicate conflict, invalid transition, price/currency mismatch,
unauthorized, forbidden, provider unavailable, declined, rate limited, unknown
outcome, stale version and reconciliation required.

## 8. Acceptance and provider-selection gate

Contract tests must cover signatures, replay, duplicates, ID/digest conflicts,
out-of-order/missing events, redirect non-authority, exact currencies, concurrent
checkout, timeout/unknown outcome, bounded retry/dead-letter, refund and
chargeback review, provider outage and reconciliation replay.

No production implementation may begin until fiat provider, region, currency,
tax, proration, refund, chargeback, data-retention and compliance decisions are
approved from current official provider documentation.
