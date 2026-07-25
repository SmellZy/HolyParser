# Architecture

## 1. Purpose and scope

This document turns `MASTER_SPEC.md` into an incremental target architecture. It
describes logical boundaries for the complete product while deliberately avoiding
premature deployment complexity.

This is a planning artifact, not approval to implement all components. Only the
phase explicitly approved by the product owner may be implemented.

## 2. Architectural principles

1. Safety and correctness take precedence over opportunity count and latency.
2. Read-only analytics must be production-grade before any trading path exists.
3. Paper trading must pass its release gates before live execution work starts.
4. Financial values use exact decimal or integer representations, never binary
   floating point.
5. Instruments are identified by canonical metadata, not string manipulation.
6. USDT and USDC exposures remain separate unless an explicit conversion and risk
   policy is later approved.
7. Every exchange integration is isolated behind a versioned adapter contract and
   advertises verified capabilities.
8. Unknown, stale, incomplete, or inconsistent data fails closed.
9. Strategy, risk, execution, and AI are separate trust and responsibility
   boundaries.
10. The AI assistant is read-only and cannot create orders, change limits, access
    secrets, or override deterministic engines.
11. Logical service boundaries do not imply one deployable per module. Processes
    are split only for isolation, scaling, fault containment, or security.
12. Database changes use migrations, events are versioned, and critical actions
    are auditable.

## 3. Product stages

| Stage | Included phases | User value | Trading authority |
|---|---:|---|---|
| Foundation | 0–1 | Safe, testable product base | None |
| Read-only MVP | 2–4 | Live scanner, funding comparison, charts, calculator | None |
| Production analytics | 5–7 | Reliable analytics, deterministic recommendations, AI explanations | None |
| Paper trading | 8 | Realistic simulated execution and risk evaluation | Simulated only |
| Manual trading | 9–10 | Explicitly confirmed, tightly scoped paired execution | Per-action user confirmation |
| Semi-automatic trading | 11 | Rule-bound execution within a user-approved session and limits | Limited delegated authority |
| Fully automatic trading | 12 | Autonomous deterministic execution inside a hardened risk envelope | Persistent, revocable delegated authority |
| Commercial scale | 13 | Entitlements, billing, scaling, multi-region reads | Unchanged by billing |

Live trading is absent from Phase 1 and remains disabled by default in every later
phase.

## 4. Context and trust boundaries

```text
User browser
  |
  | HTTPS / authenticated WebSocket
  v
Web application ----> Control API ----> PostgreSQL
       |                    |
       |                    +----> notification provider
       |
       +------------> Live Data Gateway
                              |
Exchange public APIs -> Adapter processes -> Normalization -> Analytics
                                                   |
                                                   +-> time-series storage

Later, after paper-trading gates:

Strategy Engine -> Risk Engine -> Execution Coordinator -> Private adapters
       |                |                 |
       +---- facts -----+                 +-> reconciliation
       |
       +-> AI explanation boundary (read-only facts only)
```

The browser, public exchange feeds, private exchange APIs, notification providers,
AI provider, and on-chain networks are all untrusted external boundaries.

## 5. Logical modules

### 5.1 Web application

Responsibilities:

- authentication, account security, and responsive product navigation;
- read-only scanner, matrix, charts, calculator, and health/status presentation;
- later paper and trading controls appropriate to the active stage;
- accessible error, empty, loading, stale, and degraded states;
- client-side rendering budgets and batched live updates.

The browser never receives exchange secrets or private signing material.

### 5.2 Control plane

Initially one Kotlin/Spring Boot deployable with strongly separated modules:

- identity and sessions;
- user profile and security settings;
- favorites and user preferences;
- notification orchestration;
- audit-query facade;
- later exchange-connection metadata, entitlements, and administration.

This begins as a modular service, not a collection of microservices. Billing and
notification services are extracted only when load, security, or ownership
requires it.

### 5.3 Market data plane

Rust/Tokio processes introduced in Phase 2:

- one isolated adapter implementation per exchange;
- REST bootstrap and WebSocket lifecycle management;
- local order-book reconstruction;
- sequence validation and resynchronization;
- canonical normalization;
- receive, exchange, and processing timestamps;
- rate-limit accounting and source health;
- normalized event publication.

An adapter may implement only verified capabilities. Unsupported calls return a
typed `CAPABILITY_UNAVAILABLE` result; they must not silently fall back.

### 5.4 Live Data Gateway

Responsibilities:

- authenticated and entitlement-aware subscriptions;
- server-side aggregation and throttling;
- bounded payloads and backpressure;
- snapshot plus versioned delta semantics;
- explicit data-quality and freshness fields;
- disconnect or downgrade when the client cannot keep up.

Raw order-book deltas are not broadcast indiscriminately to browsers.

### 5.5 Analytics and time-series

Responsibilities:

- exact spread, VWAP, depth, fee, funding, and deviation calculations;
- normalized funding horizons without hardcoded exchange intervals;
- opportunity ranking with traceable inputs;
- historical aggregates and query APIs;
- deterministic data-quality gates.

TimescaleDB may be introduced when Phase 4 needs historical series. ClickHouse,
object archives, and a streaming platform are deferred until measured volume
justifies them.

### 5.6 Strategy Engine

Introduced after production analytics:

- deterministic opportunity decisions;
- explicit `NO_TRADE` and expiry;
- versioned strategy configuration and model provenance;
- backtest and walk-forward evaluation;
- structured explanations and risk inputs.

It does not place orders and cannot bypass the Risk Engine.

### 5.7 Risk Engine

Logically independent and, before live trading, operationally isolated:

- validates pre-trade and continuous risk invariants;
- owns circuit breakers and kill-switch evaluation;
- records decision inputs, policy version, and reason codes;
- fails closed on timeout or unavailable dependencies;
- denies orders that exceed user, venue, symbol, strategy, or system limits.

Only the Risk Engine can authorize an execution intent, and authorization is
short-lived and bound to exact order parameters.

### 5.8 Paper simulator

Introduced before any private exchange adapter:

- order-book-based fills;
- configurable network and processing latency;
- partial fills, rejects, outages, and uncertain outcomes;
- fee, funding, liquidation, and slippage models;
- comparison of expected versus simulated outcomes;
- deterministic replay from recorded fixtures.

Its interface mirrors the future execution port without sharing live credentials
or a route to a real venue.

### 5.9 Execution and reconciliation

Not implemented before the relevant later phase:

- durable logical-position and order state machines;
- paired slice coordination;
- unique client-order identities where officially supported;
- typed handling of accepted, rejected, timed-out, and unknown outcomes;
- reconciliation before any retry;
- restart recovery, unmatched-fill detection, and emergency hedging;
- explicit manual intervention state.

Private adapter calls are available only from isolated execution workers. An HTTP
timeout or 5xx is never treated as evidence that an order was not accepted.

### 5.10 AI assistant

The AI boundary consumes a narrow, redacted, read-only fact API. Output is schema
validated and constrained by deterministic decisions:

- `NO_TRADE` cannot become `ENTER`;
- stale inputs force `DATA_UNRELIABLE`;
- every factual claim references supplied facts;
- numeric fields are validated against source values;
- no secret, signing, execution, or risk-limit tool exists.

## 6. Initial deployable topology by stage

### Phase 1

- `web`;
- `control-api`;
- PostgreSQL;
- local email sink/provider adapter;
- CI and local container tooling.

No event bus, Kubernetes, Redis, TimescaleDB, ClickHouse, Vault, exchange adapter,
strategy service, risk service, execution service, or AI runtime is required.

### Read-only MVP

- add market-data adapter processes;
- add analytics/live-gateway deployment, combined at first if profiling permits;
- add Redis only if multi-instance live fan-out, distributed rate limiting, or
  session requirements prove it necessary;
- add a durable event bus only when process decoupling or replay requirements
  cannot be met safely in-process.

### Production analytics

- isolate analytics where scaling and failure containment require it;
- add time-series storage and object archive according to measured retention and
  query load;
- add deterministic strategy and read-only AI boundaries.

### Trading stages

- isolate Risk Engine and execution workers;
- add KMS/HSM-backed credential encryption;
- segregate public-data and private-execution networks and identities;
- use dedicated queues or a durable log only after delivery semantics and recovery
  requirements are documented.

## 7. Data and calculation architecture

### 7.1 Exact values

- Database: `NUMERIC(precision, scale)` chosen per domain, or scaled integers where
  a fixed unit is guaranteed.
- JVM: `BigDecimal` with explicit scale and rounding mode.
- Rust: reviewed decimal/fixed-point type; no `f32`/`f64` in financial domain
  models.
- JSON and WebSocket: canonical decimal strings, never JSON numbers for financial
  values.
- Percentages and rates carry an explicit basis and horizon.

Rounding occurs only at named boundaries such as venue tick/lot normalization.

### 7.2 Time

All stored timestamps are UTC instants. Payloads use RFC 3339 UTC. Durations and
funding intervals are explicit integer seconds. Each market datum records:

- source event time, if supplied;
- receive time;
- processing time;
- freshness policy and health state.

Countdowns are derived from a verified next-funding timestamp or schedule model,
not from a hardcoded interval.

### 7.3 Data quality

Every analytics result carries:

- source health for each leg;
- oldest required input timestamp;
- calculation timestamp;
- freshness threshold/policy version;
- quality status and reason codes;
- instrument metadata version.

No opportunity is executable if any required input is stale, mismapped, missing,
or degraded beyond its policy.

## 8. Persistence boundaries

PostgreSQL is the initial source of truth for users, sessions, configuration,
audit metadata, favorites, and later trading state. Time-series market data is
separated from transactional state. Raw secrets are never stored in application
tables without envelope encryption.

Required persistence rules:

- schema changes only through ordered migrations;
- optimistic concurrency or explicit locks for critical state transitions;
- append-only audit events for security and financial actions;
- retention and deletion policies defined before production data collection;
- backups and restore tests before production launch;
- unique constraints for idempotency and external identifiers.

## 9. Internal communication

- Browser-to-control APIs: versioned REST/OpenAPI.
- Browser live data: versioned WebSocket protocol.
- Cross-language internal calls: protobuf/gRPC only after a process boundary
  exists.
- Internal domain events: versioned envelopes with stable identifiers,
  correlation/causation IDs, producer time, schema version, and quality metadata.

At-least-once delivery is assumed for durable events. Consumers must be
idempotent. “Exactly once” is not claimed.

## 10. Failure and recovery model

- Public data gap: mark the affected book `STALE`, stop dependent calculations,
  resnapshot, and resume only after continuity is proven.
- Dependency outage: shed noncritical work in the documented priority order and
  expose degraded status.
- Process restart: rebuild read models from durable state/snapshots.
- Order uncertainty: enter `RECONCILIATION_REQUIRED`; query official order,
  fills, and position sources before deciding any next action.
- Conflicting position: block new activity and require reconciliation or manual
  resolution.
- AI outage: analytics continue; explanations are unavailable.
- Notification outage: trading authority is not expanded; critical alerts remain
  queued and visible in-product.

## 11. Observability

All modules emit structured, redacted logs, metrics, and traces with correlation
IDs. Phase-specific service-level indicators are defined before implementation.
Security events and financial state transitions are audit events, not ordinary
debug logs.

Metrics must not use raw user, symbol, or order identifiers as unbounded labels.
No keys, signatures, passwords, tokens, private payloads, or seed material may be
logged.

## 12. Architecture decisions to record

Before or during the relevant phase, create ADRs for:

1. monorepo tooling and version pinning;
2. exact decimal representation by language and wire format;
3. modular control-plane boundary;
4. session model and CSRF approach;
5. canonical instrument identity and metadata versioning;
6. order-book reconstruction contract per exchange;
7. live protocol snapshot/delta and backpressure semantics;
8. time-series storage selection and retention;
9. event bus adoption criteria;
10. Risk Engine authorization token/decision contract;
11. execution state machines and reconciliation invariants;
12. CEX credential envelope encryption;
13. DEX custody/signing model;
14. AI fact provenance and redaction;
15. deployment, rollback, backup, and disaster-recovery targets.

## 13. Explicit non-goals for Phase 1

- exchange API integration or capability claims;
- market-data ingestion;
- financial analytics;
- strategy, risk, execution, paper, or AI engines;
- storing exchange credentials or wallet material;
- placing testnet, sandbox, or live orders;
- billing;
- Kubernetes, ClickHouse, Redpanda, or multi-region infrastructure.
