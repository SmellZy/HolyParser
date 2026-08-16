# ADR-0011: Provider-neutral payment boundary

- Status: Accepted for future architecture
- Date: 2026-08-03
- Scope: fiat and crypto commercial payments

## Context

Provider event order, signatures, retry semantics, hosted checkout, subscriptions
and refund capabilities differ. Crypto additionally has route identity,
confirmations, reorgs and custody. Coupling application state to one provider or
browser redirects would create unsafe activation and migration behavior.

## Decision

HolyParser owns provider-neutral invoices, attempts, payments, subscriptions,
grants and reconciliation. Adapters implement only declared capabilities behind
checkout/payment/subscription/invoice/refund/webhook/reconciliation ports.
Verified backend evidence or reconciliation may advance commercial state;
redirects never do.

Crypto invoice processing uses a separate provider/custody boundary. Asset plus
network identity is explicit, and private keys/signing never reside in the main
application. All external outcomes are idempotent, replay-protected, bounded and
audited before entitlement recalculation.

## Consequences

- No provider is selected by this ADR.
- Provider-specific references remain opaque and environment-scoped.
- Duplicate, missing, reordered and unknown events are routine reconciliation
  cases, not reasons to guess success.
- New providers require contract/security tests without changing entitlement
  semantics.
- Tax, proration, refunds, crypto finality and custody remain approval gates.

## Rejected alternatives

- Provider SDK types as the core domain.
- Activation from success redirect or unverified webhook.
- Blind retries after timeout/5xx.
- Wallet private keys in the main billing service.
