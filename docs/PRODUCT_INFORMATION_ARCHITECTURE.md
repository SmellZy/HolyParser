# Product Information Architecture

Status: future product architecture; page presence does not imply implementation
or entitlement.

## 1. Surface boundaries

HolyParser has four related but separately authorized shells:

| Surface                   | Audience                                | Boundary                                                   |
| ------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Public site               | anonymous and evaluating visitors       | public content only; no tenant data                        |
| Authenticated app         | platform users                          | tenant-scoped analytics and account features               |
| Personal billing portal   | account owner / billing-authorized user | subscription, payment and effective-access views           |
| Admin console at `/admin` | explicitly privileged operators         | separate shell, auth/session policy, permissions and audit |

Navigation visibility is not authorization. Every route and command is enforced
server-side. Planned pages display a clear `PLANNED`, `UNAVAILABLE` or
entitlement-required state and must not call unsupported ports.

## 2. Public site

Top-level information architecture:

- Home;
- Product;
- Solutions;
- Pricing;
- Documentation;
- Security;
- Status;
- Log in;
- Get started.

Pricing copy distinguishes plan bundles from effective entitlements and never
promises guaranteed profit. Security and Status expose approved public material
only. Documentation must label analytics, paper, read-only synchronization and
live execution as separate maturity/authority levels.

## 3. Authenticated application

Primary navigation:

- Overview;
- Market Scanner;
- Opportunities;
- Spread Analytics;
- Funding Monitor;
- Charts;
- Watchlists;
- Alerts;
- Positions;
- Notifications;
- Integrations;
- Billing;
- Settings.

Each route declares `implementationStatus`, dependencies, required entitlements,
required data capabilities and a typed unavailable reason. Phase 2B remains a
headless analytics boundary: listing these destinations does not authorize their
UI, persistence or personalized state.

The app distinguishes:

- available and authorized;
- available but not entitled;
- planned but not implemented;
- temporarily degraded;
- unsupported/unverified/research-required;
- disabled by security or policy.

These states must not be collapsed into a generic empty page.

## 4. Personal billing portal

The portal includes:

- Current Plan;
- Effective Entitlements;
- Usage;
- Invoices;
- Payment Methods;
- Crypto Payments;
- Promo Codes;
- Subscription History;
- Cancel or reactivate.

It presents four separate truths: subscription state, payment/invoice state,
effective access, and temporary grace/promotion state. A successful redirect is
never represented as activation. Payment-method details are provider-safe
references only; secrets and full card/bank data are absent. Crypto invoices
show asset, network, amount, address/memo, expiry, confirmation and exception
state explicitly.

The portal also provides plan comparison, checkout preparation, server-validated
promo entry and discount preview, provider-safe payment-method management,
payment/refund status, cancellation at period end and reactivation where the
current subscription policy permits them.

## 5. Admin console

`/admin` has a distinct shell, navigation map, authentication-strength policy,
session lifetime and audit context. It is not a hidden item in the user sidebar
and it never relies on client-side secrecy.

Admin navigation groups are:

- Dashboard;
- Users and Accounts;
- Plans, Prices and Entitlements;
- Subscriptions;
- Payments, Invoices, Refunds and Chargebacks;
- Crypto Invoices and Reconciliation;
- Promotions and Redemptions;
- Usage and Limits;
- Provider Events and Dead Letters;
- Audit and Approvals;
- Roles and Permissions;
- System Configuration and Feature Controls.

The complete command boundary is defined in `ADMIN_CONSOLE.md`.

## 6. Cross-surface flows

- Public pricing → authenticated checkout preparation → provider redirect →
  verified backend event/reconciliation → subscription transition → entitlement
  recalculation → portal result.
- App paywall → entitlement explanation → billing portal; the feature never
  grants access locally.
- Admin support lookup → read-only timeline by default → separately authorized,
  reasoned and audited mutation.
- Status or degradation messages may link to public Status; private incident
  details remain in authorized app/admin views.

Return URLs are allowlisted and environment-bound. Public/admin/app origins do
not share privileged cookies by default.

## 7. Responsive and accessibility rules

Public, app, billing and admin shells reuse design tokens and accessible
components where practical, but keep independent navigation and authorization.
Mobile app navigation prioritizes Overview, Opportunities, Alerts and Positions;
all other destinations remain reachable. Billing and admin tables provide
compact summaries and drill-down rather than hiding financially relevant fields.

## 8. Acceptance

Before any surface implementation, the route inventory, ownership, dependency,
status, entitlement and authorization matrices require product/security review.
Acceptance tests must prove deep-link denial, planned-feature fail-closed states,
cross-tenant isolation, `/admin` separation, theme/accessibility behavior and
that no navigation or provider redirect changes effective access.
