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

Private adapter commands are not added until Phase 9 and require an approved
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

| Contract | Owner | Required reviewers |
|---|---|---|
| Auth/control REST | Control team | Security, frontend |
| Instrument/event schemas | Market data | Quant, frontend, architecture |
| Analytics/calculator | Quant | Market data, QA |
| Live protocol | Live data | Frontend, SRE, security |
| Strategy decision | Quant | Risk, architecture |
| Risk authorization | Risk | Execution, security |
| Execution/reconciliation | Execution | Risk, security, QA |
| AI fact/output | AI/product | Quant, security |

Breaking financial, security, or execution contract changes require an ADR,
migration plan, rollback plan, and explicit phase approval.
