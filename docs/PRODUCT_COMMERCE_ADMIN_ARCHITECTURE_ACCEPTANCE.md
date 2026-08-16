# Product Design, Commerce, and Administration Architecture Acceptance

- Review date: 2026-08-03
- Review type: formal independent documentation and architecture acceptance
- Final status: **PASS_WITH_WARNINGS**
- Implementation authority: **NONE**

## 1. Reviewed scope

This review accepts only the documentation-only HolyParser Product Design,
Commerce, and Administration Architecture Amendment. It does not authorize D1,
I1, C1, Phase 2B.1, application code, persistence, authentication, providers,
payments, admin operations, UI, dependencies, infrastructure, trading, or a
commit.

Phase 2A.1 through Phase 2A.4 packages and documents, the accepted Phase 2B
architecture/formulas, application source, tests, manifests, lockfile,
infrastructure, and brand PNG contents were treated as frozen.

## 2. Reviewed documents

Amendment documents reviewed completely:

- `DESIGN_SYSTEM.md`;
- `THEME_ARCHITECTURE.md`;
- `PRODUCT_INFORMATION_ARCHITECTURE.md`;
- `SUBSCRIPTION_AND_ENTITLEMENTS.md`;
- `PROMOTION_ENGINE.md`;
- `PAYMENT_ARCHITECTURE.md`;
- `CRYPTO_PAYMENT_ARCHITECTURE.md`;
- `ADMIN_CONSOLE.md`;
- ADR-0010, ADR-0011, and ADR-0012;
- `MASTER_SPEC.md`, `ROADMAP.md`, `DOMAIN_MODEL.md`,
  `API_CONTRACTS_PLAN.md`, `SECURITY_MODEL.md`, `RISK_REGISTER.md`,
  `DECISIONS_REQUIRED.md`, and `ACCEPTANCE_CRITERIA.md`.

Context and frozen evidence reviewed completely:

- `AGENTS.md`, `ARCHITECTURE.md`;
- Phase 0 research, source, capability, and decision registers;
- Phase 1 scope and acceptance;
- Phase 2A.1 through Phase 2A.4 implementation/acceptance documents and
  ADR-0003, ADR-0004, and ADR-0006 through ADR-0008;
- `PHASE_2B_SPREAD_ANALYTICS_PLAN.md`,
  `PHASE_2B_ARCHITECTURE_ACCEPTANCE.md`, and ADR-0009;
- related position, notification, Telegram, roadmap, security, domain, API,
  risk, decision, and acceptance documents.

## 3. Design and theme verdict

**PASS.** The reference direction remains deep navy plus blue/cyan/violet,
professional, precise, premium, data-centric, and explicitly non-casino/non-meme.
The logo and three PNG references are direction rather than pixel-perfect UI and
were not modified.

Semantic tokens, rather than raw component colours, cover backgrounds, surfaces,
borders, text, actions, focus, outcome, knowledge/quality, chart, gap,
uncertainty, and invalid states. Financial meaning is not conveyed by red/green
alone; text/icon/shape and chart labels/patterns are required. Glow is restrained.

`SYSTEM`, `DARK`, and `LIGHT` share one contract but have independently resolved
values. Account and device preference, first-visit system behavior, CSP-compatible
pre-paint initialization, SSR/hydration behavior, cross-origin separation,
reduced motion, focus, and contrast verification are explicit.

The review calculation found the original `border.emphasis` values below the
3:1 essential-boundary requirement. Remediation changed light to `#7B8494`
(3.77:1 on white) and dark to `#536A8A` (3.36:1 on dark surface), restricted
`border.default` to decorative separation, and prohibited sub-contrast disabled
text for required information. Required normal text/status values meet at least
4.5:1 against their documented primary surfaces; inactive disabled text uses the
documented WCAG exception. Dark/light chart values and non-colour distinctions
are now explicit.

Typography separates Space Grotesk-style headings from Inter-style application
copy without making either an installed dependency. Tabular numerals, decimal
alignment, stable widths, fallback behavior, density, responsive ranges,
keyboard access, readable touch targets, loading/empty/degraded/error states,
and financial-table invariants are specified.

## 4. Product information architecture verdict

**PASS.** Public marketing, authenticated analytics, personal billing, and
protected `/admin` are separate surfaces. Planned routes declare status,
dependencies, required entitlement/capability, and typed unavailability rather
than claiming implementation. Navigation is not authorization.

The billing portal separates plan, subscription, payment/invoice, effective
entitlement, usage, grace, promotion, refund, and crypto-invoice state. Provider
redirects and frontend promo displays have no authority. `/admin` has a separate
shell, session, permission, and audit boundary and is not a hidden user-sidebar
item.

## 5. Entitlement and subscription verdict

**PASS_WITH_WARNINGS.** ADR-0010 correctly makes versioned
`EffectiveEntitlement` the technical access result. Plan names, premium flags,
frontend state, provider clients, and redirects cannot grant access. All seven
required grant sources preserve issuer/system provenance, scope, value/limit,
validity, reason, revocation, idempotency, and audit.

Overlap, merge, precedence, expiry, revocation, temporary upgrades, grace,
recalculation, bounded caching, invalidation, conflict quarantine, and usage
concurrency are deterministic contracts. A versioned, audited
`AccountAccessRestriction` now has explicit deny precedence for scoped commercial
capabilities while preserving emergency risk, reconciliation, and safe-close
operations. D-065 is the implementation gate for its exact policy.

Subscription, payment, and effective access remain separate facts. All required
subscription states and creation, trial, renewal/failure, grace, pause/resume,
plan change, cancellation, expiry, refund, chargeback, restoration, and
reconciliation paths are represented. Older/duplicate/superseded provider events
cannot regress newer accepted period state or clear a review state; only explicit
reconciliation against current evidence can resolve review. Prices and periods
remain immutable historical facts.

Warning: D-065, D-070, D-071, and related policy decisions intentionally block
implementation of source precedence, trial/grace, proration, accounting,
refund/chargeback, and plan-change behavior.

## 6. Fiat payment-boundary verdict

**PASS_WITH_WARNINGS.** ADR-0011 and the payment architecture define independent
checkout, payment, recurring billing, invoice, refund, webhook-verification, and
reconciliation ports. Provider IDs remain opaque references. No provider was
selected.

Signatures are verified over bounded required bytes before processing. Event
identity/digest, replay windows, versioned state, duplicates, missing/reordered
events, unknown outcomes, bounded retries, dead-letter/manual review, outage,
SSRF controls, immutable evidence, and reconciliation are explicit. Timeout/5xx
cannot cause blind financial retry. Redirects never activate a subscription or
entitlement.

C3 is correctly provider-neutral and precedes any concrete adapter. D-066,
D-067, D-071, D-077, and D-078 block tax/provider/refund/retention/regional
integration or production, not the generic C3 contract foundation.

## 7. Crypto payment-boundary verdict

**PASS_WITH_WARNINGS.** Asset, network, native/token identity, address/memo,
amount, quote, expiry, finality, and reconciliation are explicit. Same-ticker
routes and USDT/USDC remain distinct. Required confirmations are versioned policy,
not constants.

Partial, unconfirmed, confirmed, underpaid, overpaid, late, expired, wrong-asset,
wrong-network, reorg, refund-review, failed, and reconciliation-required behavior
is fail-closed. Duplicate observations are idempotent and one transfer cannot
satisfy multiple invoices. Final confirmation advances through subscription and
entitlement state; it cannot bypass them.

Refunds are separately authorized review workflows. Signing, derivation, private
keys, seed phrases, sweeping, and hot-wallet custody remain outside the main
application behind a separately approved processor/custody boundary. C5 is a
policy-injected domain plus mock custody boundary and must freeze before a
concrete processor. D-068, D-069, D-071, D-077, and D-078 gate route-specific
pilot/production behavior.

## 8. Promotion verdict

**PASS_WITH_WARNINGS.** Promotion, PromoCode, Redemption,
RedemptionReservation, PromotionBenefit, PromotionEligibility, and
PromotionConstraint are separate. Percentage/fixed, trial/free duration,
entitlement, temporary upgrade/limit, lifetime, and partner/referral benefits
have explicit exact units and duration semantics.

Eligibility is server-side. Initial one-code/no-stacking is a recommendation,
not hidden final policy. Evaluation order and stacking remain D-072. Atomic
TTL reservations, idempotent redemption, generic lookup failures, normalization,
keyed digests for secret codes, rate limits, races, replay, concurrent checkout,
multi-account/privacy-sensitive abuse review, refund interaction, provenance, and
audit are covered. D-073/D-074 block lifetime and affiliate behavior.

## 9. Admin, RBAC, and audit verdict

**PASS_WITH_WARNINGS.** Admin modules cover every required account, catalog,
subscription, payment, crypto, promotion, usage, reconciliation, provider-event,
audit, permission, and configuration concern. Currency totals are separate unless
a versioned conversion source/time/quality is present. Catalog and promotion use
immutable draft/validate/publish; bulk commands require bounded preview and
immutable confirmation digest.

`isAdmin` is rejected. Roles are versioned bundles of independent, expiring,
environment-scoped permissions. Role assignment cannot edit the permission
catalogue. High-risk commands require stronger sessions/step-up and policy may
require a distinct approver; self-approval and changed/expired command digests
fail. Refund execution cannot bypass request, approval, current-state validation,
or reconciliation.

Every mutation carries actor, permission, authentication assurance, reason,
idempotency, expected version, request/correlation, and optional approval.
Append-only audit preserves actor/session/action/target/before/after/reason/time/
request/correlation/approval and is itself authorized/audited. Secrets, private
keys, full payment credentials, signatures, raw payloads, and unbounded notes are
excluded. D-075/D-076/D-077 block final session, approval, and retention policy.

## 10. Domain and API verdict

**PASS.** Where applicable, future domains define entities/value objects, state
machines, commands, queries, events, ports, invariants, exact values,
idempotency, authorization, audit, typed errors, and optimistic concurrency.
Conceptual `/api/v1/billing/*` and `/api/v1/admin/*` examples match the existing
versioned API convention and explicitly create no endpoint. Provider ingress is
separate from user/admin contracts. No event-bus or persistence implementation is
implied.

## 11. Roadmap and dependency verdict

**PASS.** The exact D1–D6, I1–I4, and C1–C8 tracks are present. Design tokens
precede components/shells; identity precedes billing ownership; I3/I4 RBAC,
admin authentication, and audit precede admin mutation; catalog/entitlements
precede gating/subscriptions; C3/C5 provider-neutral/mock boundaries precede
concrete integrations; C7 waits for I4 and owned commerce commands.

The review corrected stale pre-renumbering references in D-066 through D-077 and
R-092 through R-104. Commerce remains outside frozen Phase 2B. Legacy Phase 13
billing is explicitly historical/non-authoritative and creates no implementation
permission.

## 12. Decision and risk completeness

**PASS_WITH_WARNINGS.** D-065 through D-078 identify the unresolved question,
authority, implementation gate, recommendation, and production gate where it
differs. D-065 now includes the previously missing entitlement precedence,
merge, account-suspension, grace, upgrade, and limit policy. Provider/custody
selection blocks only concrete integration/production, not neutral foundations.

R-089 through R-119 each contain impact, trigger, prevention, detection,
recovery, residual risk, and owning future track. Track ownership was corrected
to the final roadmap numbering.

Open decisions are accepted implementation gates, not architecture defects:
catalog/prices/currencies, tax/accounting, fiat provider, crypto processor/routes,
quote/finality/exceptions, trial/grace/proration, refund/chargeback, promotion
stacking/order, lifetime, affiliate, admin sessions, dual approval, retention,
and regional/legal availability.

## 13. Findings and remediations

| ID   | Severity | Finding                                                                                          | Remediation                                                                                     | Result |
| ---- | -------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------ |
| H-01 | HIGH     | Decision/risk rows referenced obsolete commerce/identity track numbers                           | aligned D-066…D-077 and R-092…R-104 with final C3/C4/C5/I3/I4 ownership                         | CLOSED |
| H-02 | HIGH     | Entitlement precedence and account suspension were blocking but had no explicit D-065…D-078 gate | expanded D-065 and specified audited restriction-overlay precedence/safety exception            | CLOSED |
| H-03 | HIGH     | Generic activation from a review state and vague provider ordering could permit state regression | limited review exit to reconciliation with current period evidence; older events are audit-only | CLOSED |
| H-04 | HIGH     | Essential `border.emphasis` contrast was below 3:1                                               | replaced both values, constrained decorative border usage, documented disabled-text exception   | CLOSED |
| H-05 | HIGH     | C3/C5 incorrectly depended on selecting concrete providers before neutral boundaries             | separated generic/mock foundations from later provider/custody pilot and production gates       | CLOSED |
| H-06 | HIGH     | Chart tokens had names but no resolved dark/light contract                                       | added complete resolved chart table and non-colour distinction rules                            | CLOSED |

No BLOCKER or unresolved HIGH finding remains.

## 14. Medium, low, and accepted limitations

### MEDIUM

- D-065 through D-078 remain unresolved by design. No affected implementation
  may choose defaults.
- Exact provider signature algorithms, regional controls, tax behavior, crypto
  routes/finality, and custody controls require then-current official evidence
  in separately approved integration tasks.
- Token contrast calculations validate documented base pairings; complete
  component, overlay, chart-series, forced-colour, localization, and assistive-
  technology evidence belongs to D1–D6 acceptance.

### LOW

- Role and permission names are provisional contract vocabulary until I3; their
  security semantics and separation-of-duty invariants are authoritative.
- R-089 through R-119 contain every required qualitative field but need normal
  likelihood/impact rescoring at the owning implementation gate.

### ACCEPTED_LIMITATION

- No concrete provider, plan, price, currency, tax, crypto route, custody model,
  admin TTL, or approval threshold is selected.
- No database, event bus, provider adapter, UI, authentication, or admin runtime
  exists for these future domains.
- Brand files and amendment documents are currently working-tree artifacts; no
  commit was requested or created.
- Live exchange canaries were not run because this was documentation-only.

## 15. Verification evidence

Authoritative commands/results:

```text
PATH=/opt/homebrew/Cellar/node@24/24.18.1/bin:$PATH npm run format:check
PASS (exit 0)

docker run --rm arbitrage-quality:phase2a4-acceptance-final2 \
  sh -c 'npm run lint && npm run typecheck && npm test'
PASS (pinned Node 24.18.0 quality image)
Lint: PASS
TypeScript: PASS
Tests: 264 passed, 3 opt-in live-canary tests skipped

Ruby local Markdown-link validator over README/docs/**/*.md
PASS

git diff --check
PASS

documentation-only allowlist scan
PASS (20 documentation files; 3 preserved brand references)

git diff --quiet -- packages/market-data packages/okx-public-adapter \
  packages/binance-usdm-public-adapter packages/bybit-linear-public-adapter \
  and Phase 2A implementation/acceptance documents
PASS

git diff --quiet -- docs/PHASE_2B_SPREAD_ANALYTICS_PLAN.md \
  docs/PHASE_2B_ARCHITECTURE_ACCEPTANCE.md \
  docs/adr/0009-spread-analytics-boundary.md
PASS

shasum -a 256 docs/brand/references/holyparser-dark.png \
  docs/brand/references/holyparser-design-system.png \
  docs/brand/references/holyparser-logo-system.png
PASS (all three hashes match the review baseline)
```

Test count by workspace:

| Workspace                     |  Passed | Skipped |
| ----------------------------- | ------: | ------: |
| Contracts                     |       8 |       0 |
| Market data                   |      57 |       0 |
| OKX public adapter            |      52 |       1 |
| Binance USDⓈ-M public adapter |      72 |       1 |
| Bybit linear public adapter   |      69 |       1 |
| Web                           |       6 |       0 |
| **Total**                     | **264** |   **3** |

Contrast spot-check evidence:

- light `border.emphasis` / white: 3.77:1;
- dark `border.emphasis` / dark surface: 3.36:1;
- required normal light/dark text and status pairings: at least 4.5:1;
- status and chart state also require non-colour labels/shapes/patterns.

Brand reference hashes match the review baseline:

```text
e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08  docs/brand/references/holyparser-dark.png
459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54  docs/brand/references/holyparser-design-system.png
5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c  docs/brand/references/holyparser-logo-system.png
```

## 16. Scope-isolation evidence

- No application, test, package manifest, lockfile, infrastructure, service, or
  adapter source diff exists.
- Phase 2A.1 through Phase 2A.4 packages/documents are unchanged.
- Accepted Phase 2B plan, acceptance report, ADR-0009, and formulas are unchanged.
- Brand PNG hashes are unchanged.
- Changes are restricted to the approved architecture documents, six HIGH
  remediations in those documents, and this acceptance report.
- No dependency, provider, credential, private API, persistence, payment,
  authentication, admin runtime, UI, trading, AI, or billing implementation was
  introduced.

## 17. Freeze recommendation

The amendment **may be frozen** with `PASS_WITH_WARNINGS`. The warnings are
explicit implementation/production gates, not unresolved architecture
contradictions. Freezing the amendment does not approve D1, I1, C1, Phase 2B.1,
or any provider integration.

## 18. Exact recommended next task

The next task should be a documentation-only D1 implementation-plan and
acceptance decomposition. It must not implement tokens or components and must
not begin commerce, identity, admin, Phase 2B.1, or provider work.

```text
Read AGENTS.md and all frozen architecture, design, theme, security, roadmap,
decision, risk, acceptance, and brand-reference documents completely.

The Product Design, Commerce and Administration Architecture Amendment is
frozen and approved. Perform a documentation-only implementation-plan and
formal acceptance decomposition for D1 — Brand and Semantic Design Tokens.

Do not implement frontend components or CSS. Do not add dependencies. Do not
modify application source, tests, manifests, lockfiles, infrastructure, frozen
adapters, accepted Phase 2B documents, or docs/brand images. Do not begin D2,
I1, C1, Phase 2B.1, payment, authentication, admin runtime or provider work.

Define exact D1 deliverables, token source/schema and versioning, dark/light
resolution, typography contracts without installing fonts, status and chart
semantics, contrast test matrix, raw-value lint boundary, documentation and
fixture strategy, migration from current Phase 1 tokens, compatibility policy,
security/accessibility review, rollback, acceptance criteria and freeze gate.

Identify every product/design/security decision required before implementation.
Create the D1 planning and acceptance-plan documentation only. Run
documentation-focused verification with pinned Node 24. Do not create a commit.

At the end report whether D1 is ready for separate implementation approval and
provide the exact recommended D1 implementation prompt without starting it.
```
