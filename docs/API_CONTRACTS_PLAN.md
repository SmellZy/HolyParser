# API Contracts Plan

## 1. Goals

Contracts must make financial units, freshness, capability, authorization, errors,
and versioning explicit. The plan covers internal product APIs only. It does not
define or invent exchange endpoints.

## 2. Contract-first workflow

1. Write or update the contract and examples.
2. Review domain semantics, threat model, compatibility, and authorization.
3. Generate types/clients where practical.
4. Add provider and consumer contract tests.
5. Implement behind an inactive feature flag when risk warrants.
6. Publish a changelog and migration/rollback notes.
7. Monitor compatibility and schema drift.

OpenAPI is the initial source for REST contracts. Protocol Buffers are introduced
only when a real internal process boundary requires gRPC. JSON Schema or generated
validators govern WebSocket messages and AI responses.

## 3. Common conventions

### 3.1 Representation

- UTF-8 JSON.
- Opaque IDs as strings.
- Financial decimals as canonical strings.
- Timestamps as RFC 3339 UTC instants.
- Durations and intervals as integer seconds.
- Enums are documented and unknown future values are handled safely.
- Optional, unavailable, zero, and unknown are distinct states.
- Currency/asset/unit accompanies every amount where context is not unambiguous.

### 3.2 Request metadata

- correlation ID accepted/generated at ingress;
- trace context propagated but not trusted for authorization;
- contract version;
- idempotency key on product-side mutation operations where duplication matters;
- precondition/version token for security and financial state changes.

### 3.3 Response envelope

Ordinary success responses return typed resources. Errors use a stable envelope:

- `code`;
- safe user-facing `message`;
- `correlationId`;
- optional field violations;
- retry classification and optional safe retry time;
- no stack trace, secret, authentication payload, or raw private exchange response.

HTTP status and domain code both matter. A timeout does not imply a failed
financial action.

### 3.4 Collections

Cursor pagination is preferred for mutable/high-volume collections. Sort keys are
stable and deterministic. APIs impose maximum page size, filter complexity,
historical range, and subscription limits.

### 3.5 Compatibility

- additive optional fields are nonbreaking;
- removing/renaming fields, changing units, or narrowing values is breaking;
- event consumers tolerate unknown fields but reject unknown semantic versions
  when unsafe;
- financial formula/version changes publish a new calculation version;
- exchange-specific fields remain in namespaced extension objects and never leak
  into the common required contract.

## 4. Phase 1 REST contract groups

Exact routes are chosen during Phase 1 contract review. Required resource groups:

- service health/readiness;
- registration and email verification;
- login, logout, and current session;
- session listing and revocation;
- password recovery and password change;
- current user profile and security posture;
- audit-visible user security events.

Rules:

- browser authentication uses Secure, HttpOnly, SameSite cookies;
- state-changing cookie-authenticated requests require CSRF protection;
- registration/recovery responses resist account enumeration;
- verification/recovery secrets never appear in normal response bodies after
  issuance;
- sensitive changes require recent authentication once that feature is available.

Phase 1 includes no exchange connection, market data, strategy, order, position,
credential, wallet, billing, or AI endpoint.

## 5. Read-only analytics contracts

### 5.1 Reference data

Contracts for:

- venues and verified capability status;
- canonical assets/instruments and metadata version;
- instrument mappings and admin review state;
- source/channel health.

Every capability includes verification status. Every instrument includes market
type, quote/settlement assets, contract semantics, constraints, lifecycle, and
effective metadata version.

### 5.2 Scanner and matrix

Query contracts include bounded filters and a requested executable size. Results
include:

- canonical leg identities;
- funding rate, interval, next time, and semantics where available;
- price/depth timestamps and data-quality state;
- mid/executable spread and exact calculation version;
- component costs and explicit unknown components;
- expiry and non-actionable reasons.

The contract must not label a result “net” if required costs are unavailable.

### 5.3 Historical queries and calculator

Historical points carry gap/quality markers and aggregation method. Calculator
requests are immutable scenarios with explicit units; responses echo normalized
inputs, rounding actions, source references, formula version, and unknowns.

## 6. Live WebSocket protocol

The protocol requires:

- authenticated connection and explicit subscription authorization;
- `hello`/version negotiation;
- unique subscription IDs;
- initial bounded snapshot;
- monotonic stream revision per subscription;
- versioned deltas;
- heartbeat and server time;
- data-quality/freshness changes as first-class events;
- resync request or new snapshot on a revision gap;
- rate-limit and backpressure notices;
- unsubscribe and deterministic terminal errors.

Clients must never apply a delta across snapshot generations. The server may
coalesce updates. A slow client is downgraded or disconnected rather than allowed
to create unbounded buffers.

## 7. Internal adapter contract

The common adapter is capability-based rather than requiring every method to work.
Conceptual ports:

- discover instruments;
- fetch public snapshots/observations;
- subscribe to verified public channels;
- report health/rate-limit/time-sync information;
- later, separately authorized private queries and commands.

Each call declares:

- venue and environment;
- capability required;
- normalized request;
- deadline;
- safe retry classification;
- typed exchange error;
- source timestamps and raw-schema version reference.

Raw payloads may be stored only in controlled fixtures/archives under the data
classification policy. They do not become product contracts.

Private adapter commands are not added until Phase 6 and require an approved
official API audit. Unsupported capabilities fail before I/O.

## 8. Normalized market events

All normalized events share:

- schema version and event ID;
- venue, instrument, and metadata version;
- source channel and sequence/range where provided;
- source, receive, and processing timestamps;
- quality state and reason codes;
- correlation/causation where applicable;
- typed payload.

Order-book delta meaning is documented per source adapter and normalized only
after sequence rules are verified. Funding events distinguish current, predicted,
and settled/historical semantics.

## 9. Strategy, risk, and AI contracts

### 9.1 Strategy

Input references immutable analytics snapshots. Output contains action, direction,
safe size, expected components, confidence/calibration metadata, reasons, risks,
strategy/configuration versions, and expiry.

### 9.2 Risk

Risk evaluation binds:

- exact intent parameters;
- user/venue/instrument/strategy;
- market and account snapshot versions;
- applicable policy versions;
- decision, reason codes, issue time, and expiry.

An allow result is not reusable for a modified intent.

### 9.3 AI

AI tools are read-only and return redacted, bounded facts. AI output follows a
strict schema containing recommendation, confidence, summary, supporting factors,
risk factors, next review condition, fact references, and data timestamp.

The validation layer enforces:

- no stronger action than the deterministic decision;
- stale data maps to `DATA_UNRELIABLE`;
- referenced entities exist in supplied facts;
- numeric statements match or are explicitly qualitative.

## 10. Paper and execution contracts

Paper and live APIs use an explicit environment discriminant and visually distinct
resources. No default environment is permitted for an execution request.

Later live command contracts require:

- idempotency identity;
- exact instrument metadata version;
- exact quantity/price/slippage/time-in-force constraints;
- valid short-lived Risk Engine decision;
- authority/confirmation evidence;
- client request time and expiry;
- optimistic concurrency token.

Responses distinguish:

- accepted with known order identity;
- rejected;
- not sent;
- timed out/unknown;
- reconciliation required.

Only a verified reconciliation result may transition an unknown order into a
resolved state. API design must make blind retry impossible or conspicuous.

## 11. Webhook contracts

Notification and later billing webhooks require:

- signature verification using provider-specific official guidance;
- timestamp/replay controls;
- unique event IDs and idempotent handling;
- raw body protection and bounded size;
- asynchronous processing with observable terminal state;
- no entitlement grant before confirmed payment policy.

## 12. Contract tests

Every contract group requires:

- schema validation and generated-client compile checks;
- provider/consumer examples;
- authorization and cross-tenant isolation tests;
- invalid/unknown enum and missing-field tests;
- decimal precision and timestamp tests;
- error-envelope/redaction tests;
- backward-compatibility diff in CI.

Exchange adapters additionally require official-doc traceability, recorded
fixtures, replay, schema drift, rate-limit, reconnect, ordering, and fault tests.

## 13. Ownership and change control

| Contract                 | Owner        | Required reviewers            |
| ------------------------ | ------------ | ----------------------------- |
| Auth/control REST        | Control team | Security, frontend            |
| Instrument/event schemas | Market data  | Quant, frontend, architecture |
| Analytics/calculator     | Quant        | Market data, QA               |
| Live protocol            | Live data    | Frontend, SRE, security       |
| Strategy decision        | Quant        | Risk, architecture            |
| Risk authorization       | Risk         | Execution, security           |
| Execution/reconciliation | Execution    | Risk, security, QA            |
| AI fact/output           | AI/product   | Quant, security               |

Breaking financial, security, or execution contract changes require an ADR,
migration plan, rollback plan, and explicit phase approval.

## 14. Spread opportunity and position contracts

Phase 2B introduces in-process, read-only, versioned analytics contracts in
seven frozen increments. Phase 2B does not itself authorize a public HTTP API,
persistence, or event bus.

### 14.1 Phase 2B.1 matching contracts

- `InstrumentMatchCandidate` and bounded evidence;
- compatibility assessment for venue/product group, canonical base/quote/
  settlement assets, market/contract type, expiry, multiplier and unit;
- versioned manual proposal, independent review, effective period, conflict,
  provenance, and correction records;
- typed `MATCHED`, `NOT_MATCHED`, `AMBIGUOUS`, `QUARANTINED`, and `UNAVAILABLE`
  results.

### 14.2 Phase 2B.2 spread contracts

- requested exposure with an explicit approved unit;
- immutable book-input revisions and exact level consumption;
- long/short entry and exit leg quote, VWAP, filled/residual quantity, depth
  availability, fee input, and slippage derivation;
- separately named midpoint, entry-spread, exit-spread, expected-gross, and
  expected-net availability.

Partial-depth diagnostics are non-actionable. Unknown required cost makes
expected net unavailable.

### 14.3 Phase 2B.3 funding contracts

- independently preserved venue-native observations and semantics;
- semantic compatibility, native interval, next-settlement alignment, and
  exact directional comparison;
- frozen `NormalizedFundingRate8hV1` references with formula ID
  `normalized-funding-8h/v1`, rather than replacing native values;
- funding-basis notional/unit and cash-flow scenario only when every required
  input is compatible and known.

### 14.4 Phase 2B.4–2B.7 analytical result contracts

- immutable opportunity revisions and deterministic transition events for
  `DISCOVERED`, `QUALIFYING`, `ACTIVE`, `CONVERGING`, `DEGRADED`,
  `SUPPRESSED`, `EXPIRED`, and `RESOLVED`;
- deterministic anomaly rules, bounded input windows, evidence and occurrence;
- immutable spread observations, gap markers, replay manifests, downsampling
  specifications, and bounded export envelopes without a persistence
  implementation;
- eligibility-first ranking inputs, completeness, components, exclusions,
  tie-breaks, and ordered results.

Across every Phase 2B contract:

- canonical legs refer to an approved match version; display symbols never
  define identity;
- result IDs/idempotency keys, input revisions, formula/rule/policy versions,
  source/receive/processing/calculation times, exact values and units,
  provenance, freshness, quality, capability, and knowledge are explicit;
- success, unavailable, rejected, and quarantined are distinct typed outcomes;
- executable market input, valid analytics, displayable analytics, comparable
  analytics, and actionable analytics are separate typed classifications;
- unsupported behavior has no fake empty implementation;
- decimal division names scale and rounding policy;
- stale, gapped, invalid, unsupported, unverified, research-required, or
  ambiguous mandatory input cannot become executable or actionable;
- metric/event reason codes are finite and payloads are bounded.
- full formula/rule/policy/mapping/input versions are bounded event/result
  fields, never unbounded metric labels.

The exact request/response contracts and formulas are governed by
[`PHASE_2B_SPREAD_ANALYTICS_PLAN.md`](PHASE_2B_SPREAD_ANALYTICS_PLAN.md) and
ADR 0009. External REST/live-stream exposure belongs to a later explicitly
approved delivery phase.

Phase 4 adds tenant-scoped position query/command contracts for:

- manual and watch-only position creation;
- canonical two-leg and extensible multi-leg definitions;
- targets, notes, alert subscriptions, and state history;
- exact entry and current executable valuation;
- spread/funding/fee/slippage/net PnL breakdown;
- residual delta, supported liquidation buffer, quality, and reconciliation.

Position commands carry an idempotency key and expected aggregate version.
Mode-inapplicable transitions are rejected. A position response never implies
exchange synchronization unless its origin, authority, and reconciliation state
explicitly say so.

Phase 5 extends the same command family with paper-only previews and
confirmations. Phase 6 adds read-only synchronization queries. Phase 7 may add
live commands only behind accepted risk/execution contracts.

## 15. Alert and notification contracts

Alert contracts cover:

- rule create/version/pause/resume/mute/unmute/expire;
- canonical instrument/token, venue pair, strategy, metric, exact threshold,
  direction, size, duration, cooldown, hysteresis, grouping, quiet hours,
  severity, expiry, and channel preferences;
- immutable evaluations and occurrences;
- suppression, acknowledgment, and resolution.

Notification contracts cover:

- `Notification`, recipient, preference, template, delivery, action, outbox, and
  attempt identifiers/states;
- classification: public analytics, user private, financial sensitive, security
  sensitive, or secret/non-renderable;
- channels: in-app, Telegram private/channel, email, and web push;
- delivery status and safe provider reason code;
- optional provider message/edit reference;
- stable deduplication and idempotency identity.

External APIs do not expose raw outbox rows, provider secrets, raw provider
payloads, or unrestricted provider errors. Internal delivery ports accept a
classified, rendered message and idempotency key and return a typed result:
delivered, retry-after, permanent rejection, unknown-provider-outcome, or
disabled.

Notification actions are opaque internal references. They do not serialize an
order, credential, risk decision, or mutable financial parameters.

## 16. Telegram linking and Mini App contracts

The website-side linking contract:

- requires an authenticated platform session;
- creates an opaque, purpose/environment/user-bound, single-use, expiring link;
- returns a safe deep-link presentation value;
- never returns a Telegram bot secret;
- supports status and unlink with recent authentication according to policy.

The Telegram Gateway consumes a verified provider identity plus opaque token and
returns only a generic success/failure result. Telegram username is display
metadata. Link conflict details are not exposed for account enumeration.

Mini App session exchange accepts the original initialization payload only over
the approved encrypted boundary. The server verifies it, resolves a linked
internal identity, enforces replay/age/environment policy, and returns a
short-lived application session. A frontend Telegram user ID is not an accepted
identity input.

Exact payload fields and provider verification algorithms are defined only from
current official Telegram documentation in the approved Phase 3 implementation.

## 17. Telegram query and command contracts

Bot and Mini App share backend query contracts for status, opportunities,
positions, position detail, alerts, charts, executable spread by size, books,
funding, calculator output, PnL, history, and action history. The Mini App may
use richer presentation schemas but not divergent financial calculations.

The future command envelope contains:

- authenticated internal actor and linked-channel context;
- command type and opaque target;
- environment;
- idempotency key;
- expected aggregate/reconciliation version;
- issue and expiry time;
- optional preview ID and action handle;
- required authentication strength.

The future financial command progression is contractually separate:

1. prepare;
2. validate current state and data;
3. obtain Risk Engine decision when applicable;
4. issue an expiring immutable preview;
5. confirm the exact preview;
6. revalidate;
7. hand off to Execution Engine;
8. reconcile;
9. query terminal or unknown status.

Prepare and confirm are not exchange-adapter calls. A confirmation can return
expired, state-changed, market-changed, authorization-required, risk-denied,
accepted, rejected, unknown, or reconciliation-required. An unknown result has
no generic retry operation.

Critical action handles are single-use and bound to user, linked Telegram ID,
session, environment, resource, command, state version, and preview. Expired or
superseded message actions fail closed. Telegram-specific limits are represented
as reductions below system/user risk limits, never as an authority increase.

## 18. Future contract ownership

| Contract                           | Owner           | Required reviewers                    |
| ---------------------------------- | --------------- | ------------------------------------- |
| Opportunity/spread                 | Quant/analytics | Market data, product, QA              |
| Position/valuation                 | Position domain | Quant, security, risk                 |
| Alert rule/evaluation              | Alerts          | Quant, product, SRE                   |
| Notification/outbox/delivery       | Notifications   | Security, SRE, product                |
| Telegram linking/session           | Identity        | Security, privacy, Telegram gateway   |
| Telegram query/presentation        | Product clients | Domain owner, security, accessibility |
| Telegram paper action              | Paper execution | Security, position domain, QA         |
| Telegram live preview/confirmation | Execution       | Risk, security, reconciliation, QA    |

Position, alert, notification, Telegram identity, and financial-command contract
changes require compatibility tests and the owning phase approval. A provider
API change cannot weaken the internal command-security boundary.

## 19. Future commerce and administration contracts

The route names below are conceptual REST resources. Exact transport, paths and
schemas require the owning implementation phase; listing them creates no current
endpoint.

### 19.1 Account commerce queries

- `GET /api/v1/billing/summary` — subscription, payment and effective-access
  summaries as separate objects;
- `GET /api/v1/billing/entitlements` — effective value/limit, validity,
  revision and safe provenance;
- `GET /api/v1/billing/usage`;
- `GET /api/v1/billing/invoices` and invoice detail;
- `GET /api/v1/billing/payment-methods` — provider-safe references only;
- `GET /api/v1/billing/crypto-invoices` and detail;
- `GET /api/v1/billing/subscription-history`.

### 19.2 Account commerce commands

- prepare checkout and apply/reserve promotion;
- request a plan change;
- schedule cancellation and reactivate before the applicable boundary;
- create/cancel a crypto invoice where its state permits;
- request an allowed refund/review without implying provider completion.

Every mutation requires authenticated account actor, entitlement/ownership
authorization, idempotency key, expected catalog/resource revision and typed
audit context. The server resolves price/account/currency and promotion; the
client cannot supply authoritative amounts or grants.

### 19.3 Provider ingress and reconciliation

Webhook ingress is provider/environment specific, bounded before parse and
verified over provider-required raw bytes. It returns no internal details.
Provider event identity is unique and digest conflicts fail closed. Internal
reconciliation commands are privileged, bounded and idempotent; there is no
generic retry-payment or retry-refund command after unknown outcome.

### 19.4 Admin queries and commands

`/api/v1/admin/*` is a separate authorization namespace for account, catalog,
subscription, entitlement, payment, crypto, promotion, provider-event,
reconciliation, role, approval and audit resources. Route knowledge or an admin
shell session is insufficient; each command declares its exact permission and
authentication assurance.

Admin mutations include actor, permission, reason, idempotency key, expected
version, request/correlation IDs and optional approval/dry-run digest. Responses
distinguish accepted, completed, pending, partially completed, provider outcome
unknown, stale version, step-up required, approval required, forbidden,
conflict, reconciliation required and temporarily unavailable.

### 19.5 Contract envelopes and events

Where applicable, outputs carry resource/catalog/policy versions, exact amount
and currency or usage unit, provenance, created/effective/expiry timestamps and
typed state/unavailability reason. Unknown values are absent with a reason, not
zero.

Events include catalog publication, subscription transitions, verified payment,
invoice/refund/chargeback transitions, promotion reservation/redemption,
entitlement grant/revocation/recalculation, crypto observation/finality/reorg,
reconciliation result, admin approval and append-only audit. Event schemas are
versioned, idempotent and bounded; event-bus infrastructure is not authorized by
this architecture amendment.

## 20. Authorization, idempotency and audit matrix

| Contract family           | Authority                                                      | Idempotency             | Audit minimum                                          |
| ------------------------- | -------------------------------------------------------------- | ----------------------- | ------------------------------------------------------ |
| Effective access query    | account or exact admin read permission                         | query revision          | decision policy/revision, not secret source data       |
| Checkout/promo command    | account owner/billing authority                                | required                | quote/catalog/promo revisions and outcome              |
| Provider ingress          | verified provider evidence                                     | provider event identity | verification/result and safe provider reference        |
| Refund/crypto exception   | exact admin/account policy plus step-up/approval as applicable | required                | amount/currency/route, reason, before/after, approvals |
| Catalog/promotion publish | exact publish permission and step-up                           | required                | immutable version/digest and affected scope            |
| Grant/revocation          | exact permission or verified system source                     | required                | provenance, validity, reason and effective revision    |

No contract returns secrets, full payment instruments, private keys, webhook
signatures, raw provider payloads or unrestricted admin audit notes.

## 21. D1 design-token artifact contracts

D1 has no HTTP, WebSocket, persistence or user-preference API. Its public
boundary is a deterministic build artifact contract consumed locally by later
frontend work:

- canonical token-set metadata declares schema/token-set versions, namespace
  and artifact policy; ordered source records explicitly declare stable token
  IDs, primitive/semantic kind, family, types, aliases, lifecycle and
  independent DARK/LIGHT values;
- generated CSS custom properties expose semantic names only to components;
- generated typed metadata exposes token IDs, versions and roles but no runtime
  authority;
- a manifest exposes schema/token-set/generator versions, compatibility aliases
  and artifact digests;
- validation reports typed bounded findings without embedding arbitrary source
  content in metrics or logs.

Source and generated artifacts must change atomically, reproduce byte-for-byte
under pinned tooling and pass compatibility, parity, contrast and raw-value
gates. Consumer code cannot make primitives, plan names, financial meanings or
theme preference authoritative through this boundary. Exact paths and committed
artifact policy remain subject to D-079 and ADR-0013; D1 does not implement D4
preference/session contracts.
