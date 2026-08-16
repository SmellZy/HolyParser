# Crypto Payment Architecture

Status: future architecture; no asset, network, custody or processor is approved.

## 1. Boundary and identity

Crypto payment is an invoice and reconciliation workflow, not an exchange
deposit or trading feature. Token identity is `(asset identity, network/chain,
token contract or native-asset identity, decimals policy)`. Identical ticker text
on different networks is a different payment route. USDT and USDC remain
distinct.

Private keys, seed phrases, signing, address derivation and sweep authority stay
outside the main application in a separately approved processor/custody boundary.
The application receives bounded invoice and transaction evidence through an
authenticated provider-neutral port. It never stores or logs private keys.

## 2. CryptoInvoice

`CryptoInvoice` records:

- stable invoice/account/checkout/subscription IDs;
- product, immutable PlanVersion and Price references;
- exact billing amount and billing currency;
- quoted asset, network, token/native identity and exact required amount;
- quote source/reference, quote time, expiry and quote policy version;
- destination address plus optional memo/tag, each typed by route;
- required confirmations/finality policy and observed confirmations;
- received exact amount, transaction references and observation times;
- under/overpayment tolerances as explicit policy, never inferred;
- state, state revision, explicit reconciliation state/revision, idempotency and
  reconciliation references;
- provenance, environment, created/expires/settled timestamps and audit link.

States are `CREATED`, `AWAITING_PAYMENT`, `PARTIALLY_PAID`,
`PAID_UNCONFIRMED`, `CONFIRMED`, `UNDERPAID`, `OVERPAID`, `EXPIRED`,
`CANCELLED`, `REFUND_REVIEW` and `REFUNDED`. Exception states
`LATE_PAYMENT_REVIEW`, `WRONG_ASSET_REVIEW`, `WRONG_NETWORK_REVIEW`,
`REORG_REVIEW`, `FAILED` and `RECONCILIATION_REQUIRED` preserve cases that
cannot safely enter the ordinary path.

## 3. Deterministic processing

1. Backend validates account, immutable quote, supported route and limits.
2. Processor creates a single bounded invoice/address request using idempotency.
3. Observations are deduplicated by network/transaction/output or the approved
   provider identity; the same transfer cannot satisfy multiple invoices.
4. Amount, asset, network, destination/memo, expiry and confirmations are checked
   independently.
5. `CONFIRMED` requires the approved exact/tolerance and finality policy. Only then
   may subscription state transition and entitlement recalculation begin.
6. Reorg or contradictory evidence removes presumed finality through an audited
   review/reconciliation transition; history is never rewritten.

Partial, under, over and late payments never silently become paid. Combining
multiple transfers, tolerance, late-price treatment and credit/refund behavior
require approved policy. Wrong asset/network is never auto-converted. Network
fees do not reduce the required received amount unless the approved route
contract explicitly defines that behavior.

Duplicate callbacks/observations are idempotent. Unknown processor outcome does
not create another destination or mark success. Reconciliation polls or consumes
provider evidence with bounded retries and cursors; raw chain exploration or
wallet signing is outside the main application.

## 4. Reorgs, confirmations and expiry

Confirmation requirements are versioned per asset/network/amount/risk tier from
official processor/network evidence; no universal number is hardcoded. A seen
payment remains non-final until policy is met. Reorgs, replacement/conflicting
transactions, provider disagreement and finality regression enter review and may
suspend new commercial benefits according to approved safety/legal policy.

Invoice expiry freezes the quoted obligation. A later observation enters
`LATE_PAYMENT_REVIEW`; it cannot reuse a new quote implicitly. Quote source,
spread, validity, volatile-asset policy and conversion rounding are product-owner
decisions.

## 5. Refund and custody safety

Refunds are new, separately authorized outbound workflows. They do not send to
an unverified transaction input address by default, and never reuse inbound
payment callbacks as authorization. Refund destination verification, sanctions/
regional controls, fees, approval threshold and custody signing ceremony are
separate security/legal decisions. High-value refunds support dual approval.

The processor/custodian exposes least-privilege invoice status and refund-request
ports. Main-application compromise must not yield signing keys. Production
requires key ownership, HSM/MPC/custody, rotation, backup, recovery, withdrawal
allowlist and incident-response approval.

Formal ports are `CryptoInvoiceProcessor`, `CryptoObservationVerifier`,
`CryptoQuoteProvider`, `CryptoReconciliationProvider` and the separately secured
`CryptoRefundCustodyPort`. Capabilities are explicit; absence is unsupported, not
a fake successful result.

## 6. API, events and observability

Commands: create/cancel invoice, accept verified observation, request review,
reconcile and, separately, request refund. Queries expose safe invoice status and
redacted route data to the owning account. Events include
`CryptoInvoiceCreated`, `CryptoPaymentSeen`, `CryptoFinalityReached`,
`CryptoPaymentExceptionRaised`, `CryptoFinalityRegressed` and
`CryptoInvoiceReconciled`.

All mutations require actor/system provenance, account or exact admin
authorization, idempotency, expected invoice revision and audit. Typed errors
distinguish unsupported route, quote expired, amount/asset/network mismatch,
invalid destination/memo evidence, insufficient finality, duplicate conflict,
reorg, stale revision, provider unavailable, unknown outcome, unauthorized,
forbidden and reconciliation required.

Metrics use finite provider/network-family/state/result labels—not addresses,
transaction hashes, assets supplied by users or raw errors. Structured audit may
reference bounded transaction IDs but excludes secrets, full provider payloads
and sensitive wallet topology.

## 7. Acceptance and blocking decisions

Tests require exact amounts, asset/network separation, expiry boundary, late,
partial, over/under, multiple transfer, duplicate, wrong asset/network,
confirmation progression, reorg regression, provider outage, unknown outcome,
reconciliation and refund authorization scenarios.

Provider/custody, approved assets/networks, confirmations, quote source,
volatility/tolerance, late/partial/overpayment, fee/refund, lifetime purchase,
regional/legal and retention decisions block implementation.
