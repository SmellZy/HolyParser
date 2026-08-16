# Admin Console Architecture

Status: future security-sensitive control-plane architecture; no admin UI or
backend implementation is authorized.

## 1. Separate control plane

The Admin Console lives under `/admin` with a separate shell, navigation,
authorization policy, stricter session and audit context. It is not a hidden
consumer-app route, and possession of an ordinary user session or knowledge of
the URL grants nothing. Deployment/origin separation is preferred where the
threat model justifies it; the final topology is a security decision.

Admin reads and mutations go through dedicated application commands. Direct
database edits, provider-dashboard-only corrections and browser-to-provider
financial calls are not normal operations.

## 2. Modules

| Module                                      | Read concerns                                                                                                                                                                                              | Controlled actions                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Dashboard                                   | active subscriptions, trials, MRR/ARR by currency, churn, failed payments, refunds, chargebacks, pending crypto invoices, promotion redemptions, manual grants, reconciliation backlog and provider health | drill-down only                                                                                                    |
| Users and Accounts                          | identity, security status, access history, safe support timeline                                                                                                                                           | view, suspend/restore under policy; initiate secure recovery                                                       |
| Plans, Prices and Entitlements              | products, plan/price versions, entitlements, effective ranges                                                                                                                                              | create draft, publish plan version, activate/deactivate price, bounded manual grant/revoke/recalculate             |
| Subscriptions                               | periods, plan changes, trial/grace/cancel states                                                                                                                                                           | extend trial, change plan, grant grace, pause/resume, cancel now/at period end, restore through versioned commands |
| Payments, Invoices, Refunds and Chargebacks | attempts, invoices, refunds, chargebacks, provider evidence                                                                                                                                                | reconcile, submit approved refund, classify review; manual confirmation is high risk and separately approved       |
| Crypto Payments                             | invoices, route/finality state, under/overpayment and exceptions                                                                                                                                           | reconcile, review exceptions, separately request refund                                                            |
| Promotions, Promo Codes and Redemptions     | campaigns, codes, reservations, redemption metrics                                                                                                                                                         | create draft, publish/pause/end, revoke future use, preview/confirm bulk generation                                |
| Usage and Limits                            | counters, windows, limit sources                                                                                                                                                                           | reconcile usage; changes occur through entitlement/catalog commands                                                |
| Provider events                             | verified events, failures, dead letters                                                                                                                                                                    | bounded replay/reconcile; never edit raw evidence                                                                  |
| Audit and approvals                         | append-only actions, pending high-risk requests                                                                                                                                                            | approve/reject where separation is required                                                                        |
| Roles and permissions                       | assignments, expiry, access review                                                                                                                                                                         | grant/revoke under separation-of-duty policy                                                                       |
| Configuration                               | safe feature/provider/limit status                                                                                                                                                                         | versioned, allowlisted changes; secrets handled elsewhere                                                          |

Dashboard money is grouped by currency. It never adds USD, EUR, USDT, USDC or
other values without an explicit versioned conversion source, time and quality;
the default is separate totals.

## 3. Permission model

There is no `isAdmin` authorization shortcut. Suggested roles are assignment
bundles only:

- `SUPPORT_ADMIN`;
- `BILLING_ADMIN`;
- `PROMOTION_MANAGER`;
- `FINANCE_VIEWER`;
- `SECURITY_AUDITOR`;
- `READ_ONLY_ADMIN`;
- `SUPER_ADMIN` (break-glass, exceptional and monitored).

Additional least-privilege bundles such as `CATALOG_MANAGER` or
`FINANCE_REVIEWER` may be introduced only from the independent permissions.

Independent permissions include:

- `account.read`, `account.suspend`, `account.restore`;
- `subscriptions.read`, `subscriptions.modify`, `subscriptions.cancel`;
- `entitlements.read`, `entitlements.grant`, `entitlements.revoke`;
- `plans.read`, `plans.write`, `prices.publish`;
- `payments.read`, `refunds.issue`;
- `promotions.create`, `promotions.publish`, `promo-codes.generate`;
- `payments.reconcile`, `refunds.request`, `refunds.approve`;
- `chargebacks.read`, `chargebacks.resolve`;
- `crypto-payments.review`, `crypto_invoice.read`, `crypto_invoice.reconcile`, `crypto_refund.request`,
  `crypto_refund.approve`;
- `reconciliation.run`, `provider_event.read`, `provider_event.replay`;
- `role.read`, `role.assign`, `role.revoke`;
- `audit.read`, `approval.review`, `configuration.change`.

Roles map to the minimum permissions for an environment and may expire. Support
cannot publish catalog, reveal payment secrets or grant itself privileges.
Requesters cannot approve their own high-risk actions. Security admins cannot
erase audit history. Auditor is read-only.

Role definitions and permission bundles are immutable versioned policy. Changes
use draft, security review, publish, effective time and rollback/supersession;
`roles.assign` cannot edit the permission catalogue. The `refunds.issue`
permission authorizes only execution of an already policy-valid refund command;
it never substitutes for `refunds.request`, required step-up, approval or
current-state reconciliation.

## 4. Session and authentication policy

Admin sessions require a normal verified platform identity plus explicitly
assigned permission and stronger authentication. Final values are pending, but
the architecture requires shorter absolute/idle TTLs than consumer sessions,
phishing-resistant MFA/passkey where supported, recent-auth step-up for high-risk
commands, device/session listing, immediate revocation, environment binding and
no privilege elevation inside an old low-assurance session.

High-risk actions include role elevation, permission-policy change, catalog or
price publish, large promotion/code batch, lifetime or mass entitlement grant,
manual payment confirmation, provider-event replay, large refund, crypto refund,
chargeback resolution and security/configuration change. They require step-up;
selected amount/scope thresholds may additionally require dual approval.

If dual control is adopted, `ApprovalRequest` records immutable command digest,
requester, required permission/assurance, reason, exact scope/amount/currency,
expiry and state. `ApprovalDecision` records a distinct approver, decision,
time, comment reason and command digest. Any command change invalidates prior
approval. Thresholds remain product/security decisions.

## 5. Command and bulk-action contract

Every mutation contains:

- authenticated actor and effective permission;
- authentication assurance and step-up time;
- target, expected version and environment;
- explicit reason code plus bounded note where policy allows;
- stable idempotency key;
- request and correlation IDs;
- optional valid approval reference;
- dry-run/preview digest for bulk actions.

Admin application ports are narrow command/query ports owned by the account,
catalog, subscription, entitlement, promotion, payment, crypto, reconciliation,
role and audit domains. The console has no generic database/provider command.
Typed failures distinguish unauthenticated, forbidden permission, step-up
required, approval required/expired/changed, self-approval prohibited, stale
version, idempotency conflict, invalid transition, scope/amount bound exceeded,
provider outcome unknown, reconciliation required and temporarily unavailable.

Bulk operations are bounded and asynchronous only through a separately approved
job boundary. They require preview of exact target count/effect, confirmation of
the immutable digest, per-target result, cancellation policy and no partial
success presented as total success. Plan, price and promotion changes use
draft/validate/publish; published history is superseded, never edited.

Optimistic concurrency rejects stale admin screens. Unknown provider outcome
enters reconciliation/manual review and is not blindly retried.

## 6. Append-only audit

`AdminAuditEvent` records:

- stable event ID, occurred/received/recorded timestamps;
- actor and impersonation/delegation context, if approved;
- safe administrative session reference;
- role/permission and authentication assurance;
- command/action, target type and safe target ID;
- before/after state references or bounded redacted diff;
- reason code and bounded note;
- idempotency, request, correlation and approval IDs;
- provider/event safe reference where applicable;
- result and finite error classification;
- environment, source application and integrity-chain/export reference.

Audit is append-only, access-controlled, retention-governed and monitored for
gaps. It never contains passwords, session tokens, API keys, webhook signatures,
private keys, seed phrases, full card/bank details, raw provider payloads or
unbounded user input. Audit export itself is privileged and audited.

## 7. Safety, observability and outage behavior

Metrics use finite module/action/result/permission/assurance buckets; actor,
account, invoice, symbol, code, free-form reason and payload are not labels.
Alerts cover privilege assignment, repeated denial, high-risk action, approval
collusion signals, bulk scope, audit pipeline failure, reconciliation backlog and
break-glass use.

Admin outage cannot block public market data, emergency risk handling,
position reconciliation or existing safe access. It may disable new catalog,
promo, checkout and discretionary corrections. Break-glass cannot bypass core
financial invariants or delete evidence.

## 8. Acceptance

Implementation requires permission-matrix tests, direct-route denial, tenant and
environment isolation, expired/revoked role tests, step-up and approval replay,
self-approval denial, stale-version/idempotency, bulk preview digest, exact
currency handling, audit completeness/redaction/integrity, provider unknown
outcome and outage exercises.

Admin TTL, MFA policy, dual-approval action/amount thresholds, refund authority,
break-glass ownership, retention/privacy and regional/legal rules are blocking
decisions.
