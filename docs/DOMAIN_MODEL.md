# Domain Model

## 1. Modeling rules

- Domain identifiers are opaque, stable, and distinct from exchange identifiers.
- Financial quantities are exact decimals with a currency, asset, contract, or
  unit context.
- A rate always declares its horizon and basis.
- Mutable exchange metadata is versioned and effective-dated.
- Source health and data provenance are part of market-data values, not auxiliary
  UI metadata.
- Logical positions and their venue legs are separate aggregates.
- Audit events are append-only.
- This document is conceptual; it does not prescribe table-per-entity persistence.

## 2. Shared value objects

| Value object        | Required fields/invariants                                              |
| ------------------- | ----------------------------------------------------------------------- |
| `Money`             | decimal amount, asset/currency; no implicit currency conversion         |
| `Price`             | decimal amount, base/quote or contract price unit                       |
| `Quantity`          | decimal amount, asset/contract unit                                     |
| `Rate`              | decimal value, basis (`fraction`, `percent`, `bps`), horizon            |
| `FundingRate`       | rate, interval seconds, next settlement time when verified, source time |
| `Percentage`        | exact decimal and documented denominator                                |
| `AssetId`           | canonical asset identity; ticker is display metadata                    |
| `TokenIdentity`     | chain ID plus normalized contract address                               |
| `VenueId`           | canonical venue and product family identity                             |
| `InstrumentId`      | stable canonical instrument identity                                    |
| `ExternalId`        | value plus issuing venue/system                                         |
| `Timestamped<T>`    | value, source time, receive time, processing time                       |
| `DataQuality`       | state, reason codes, last-good time, policy version                     |
| `CorrelationId`     | request/operation correlation without secret material                   |
| `DecimalConstraint` | min/max, tick or step, rounding rule                                    |

JSON represents financial decimal values as strings.

## 3. Identity and access context

### 3.1 User aggregate

`User`

- `id`
- normalized email and display email
- account state: `PENDING_VERIFICATION`, `ACTIVE`, `LOCKED`, `DISABLED`,
  `DELETION_PENDING`
- password credential metadata, never plaintext
- verified-at timestamp
- accepted terms/privacy document versions
- locale and time zone
- created/updated timestamps

Invariants:

- email uniqueness uses a documented normalization policy;
- inactive users cannot create authenticated sessions;
- security-sensitive changes require an audit event;
- legal acceptance is versioned, not a single boolean.

### 3.2 Session aggregate

`Session`

- opaque session ID and hashed/derived server credential
- user ID
- created, last-seen, idle-expiry, absolute-expiry timestamps
- authentication strength and reauthentication time
- device/user-agent summary and coarse network metadata
- state: `ACTIVE`, `REVOKED`, `EXPIRED`

Session rotation must not create two indefinitely valid credentials. Password
reset and “revoke all” terminate applicable sessions.

### 3.3 Verification and recovery challenge

`SecurityChallenge`

- user/purpose
- hashed single-use secret
- created/expiry/consumed timestamps
- attempt count and resend metadata
- state: `ACTIVE`, `CONSUMED`, `EXPIRED`, `LOCKED`

Purposes remain separate: email verification, password recovery, reauthentication,
and later second-factor enrollment.

### 3.4 Authorization concepts

- `Role`: administrative responsibility, not subscription tier.
- `Permission`: narrow action such as viewing audits.
- `Entitlement`: commercial product access.
- `TradingAuthority`: later explicit, revocable financial authority.

These concepts must not be conflated.

### 3.5 Telegram link and application session

`TelegramAccountLink`

- internal user ID;
- verified Telegram stable user ID;
- display-only Telegram username;
- linked, changed, disabled, and unlinked timestamps;
- state: `ACTIVE`, `TRADING_CONTROLS_DISABLED`, `UNLINKED`, `CONFLICT`;
- security audit references.

`TelegramLinkChallenge`

- internal user, purpose, environment, and one-way token digest;
- issue, expiry, consume, and revoke timestamps;
- state: `ACTIVE`, `CONSUMED`, `EXPIRED`, `REVOKED`;
- attempt and conflict evidence.

`TelegramApplicationSession`

- linked user and verified Telegram identity;
- audience/environment and authentication strength;
- issue, idle, and absolute expiry;
- replay/session version and revoke state.

The platform account exists before the link. Username is never identity. Link
changes revoke Telegram sessions/actions and disable future Telegram trading
controls. Exact persistence and provider implementation begin only in Phase 3.

## 4. Venue and capability context

### 4.1 Venue

`Venue`

- `id`, display name, legal/product family
- type: `CEX`, `DEX_AGGREGATOR`, `ONCHAIN_VENUE`
- environment: `PRODUCTION`, `TESTNET`, `SANDBOX`
- operational status
- capability-set version

OKX CEX and OKX DEX are separate venues. Binance and Binance Alpha are separate
product families when their identifiers and semantics differ.

### 4.2 Capability declaration

`VenueCapability`

- venue/environment
- capability enum
- status: `VERIFIED`, `UNSUPPORTED`, `UNKNOWN`, `DEPRECATED`, `BLOCKED`
- constraints and product scope
- official source reference and access date
- verification owner and next-review date

Capability status controls runtime behavior. `UNKNOWN` is never treated as
supported.

### 4.3 Adapter health

`SourceHealth`

- venue, channel, optional instrument
- state: `HEALTHY`, `DEGRADED`, `STALE`, `RECONNECTING`, `RATE_LIMITED`,
  `MAINTENANCE`, `DISABLED`
- reason codes
- transition and last-message timestamps
- measured lag and threshold policy

## 5. Asset and instrument context

### 5.1 Asset

`Asset`

- canonical ID
- canonical/display symbols and name
- kind: fiat, stablecoin, crypto asset, derivative reference, unknown
- optional issuer/network identities
- lifecycle state

Aliases such as XBT/BTC are mappings with provenance, not destructive rewrites.

### 5.2 Canonical instrument

`CanonicalInstrument`

- ID, venue, external symbol and external instrument ID if supplied
- base, quote, settlement, and margin assets
- market type: `SPOT`, `PERPETUAL`, `FUTURE`, `OPTION`, `DEX_SWAP`, other verified
- contract type and multiplier
- inverse/linear indicator
- price tick, quantity step, minimum/maximum quantity, minimum notional
- funding schedule metadata when applicable
- lifecycle status: `PREMARKET`, `ACTIVE`, `SUSPENDED`, `DELISTING`, `DELISTED`
- token identity/chain where applicable
- effective metadata version

Invariants:

- spot and perpetual instruments never share an identity;
- USDT and USDC instruments never share an identity;
- a multiplier is explicit, including `1000PEPE`-style contracts;
- DEX token identity relies on chain and contract address, not ticker alone;
- values rounded for an order satisfy the verified tick and quantity step.

### 5.3 Instrument mapping

`InstrumentMapping`

- raw venue identifiers and parsed candidates
- canonical instrument/asset references
- source: `AUTOMATIC`, `VENUE_METADATA`, `MANUAL`
- confidence/reason codes
- reviewer and approval timestamps
- effective interval and superseded version
- state: `PROPOSED`, `APPROVED`, `CONFLICT`, `REJECTED`

Any manual override creates an audit event. A conflict blocks dependent analytics.

## 6. Market-data context

### 6.1 Market event envelope

`MarketEvent`

- event ID and schema version
- venue/instrument
- source channel and optional sequence/range
- source, receive, and processing times
- instrument-metadata version
- quality
- typed payload

### 6.2 Order book

`OrderBook`

- venue/instrument
- ordered bid and ask levels of exact price and quantity
- snapshot identity and last applied sequence
- generation/version
- quality and timestamps

Invariants:

- bids and asks are ordered and nonnegative;
- crossed/invalid books are rejected or explicitly quarantined;
- an unproven sequence gap immediately makes the book non-actionable;
- a new snapshot creates a new generation before buffered deltas are applied.

### 6.3 Other observations

- `TickerObservation`: bid, ask, last where supplied and semantics verified.
- `MarkIndexObservation`: mark and/or index with independent availability.
- `FundingObservation`: current/predicted/historical classification, interval,
  next settlement when supplied, and source semantics.
- `TradeObservation`: venue trade ID where supplied, side semantics, price,
  quantity, and timestamps.
- `FeeScheduleObservation`: venue/product/tier basis and effective time.

Missing fields remain missing. The system does not synthesize unsupported mark,
index, funding, fee, or open-interest data.

## 7. Analytics context

### 7.1 Canonical instrument match

`CanonicalInstrumentMatch`

- immutable match/version ID and effective interval
- leg A and leg B canonical instrument identities
- venue and product group for each leg
- canonical base, quote, and settlement assets for each leg
- market type, contract type, expiry, multiplier, contract-value unit, and
  compatibility result
- mapping evidence, provenance, proposer, independent reviewer, and policy
  version
- outcome: `MATCHED`, `NOT_MATCHED`, `AMBIGUOUS`, `QUARANTINED`, or
  `UNAVAILABLE`
- deterministic completeness class and finite reason codes

Matching does not alter either instrument identity and does not imply
fungibility. Ticker-text equality cannot create a match. USDT and USDC remain
distinct unless a later explicit conversion scenario is separately approved;
Phase 2B matching never treats them as equal.

`MarketPair` is a read-only reference to an accepted match version plus an
explicit long/short direction. It is not an independently inferred identity.

### 7.2 Calculation snapshot

`CalculationSnapshot`

- calculation ID, formula version, and input-revision ID
- canonical match version and explicit long/short direction
- requested exposure and exact unit
- immutable input references and exchange/receive/processing/calculation times
- buy/sell depth consumption, exact VWAPs, and residual exposure
- midpoint, entry spread, and exit spread as separately named values
- explicit fee, funding, slippage, and other versioned cost inputs
- missing, unknown, unsupported, unverified, and research-required components
- quality, freshness-policy version, availability, and expiry

If a required component is unknown, `expectedNet` is unavailable rather than
optimistically treating the component as zero.

`AnalyticsUsability`

- executable-market-input gate result for every required source input
- valid-analytics gate result
- displayable-analytics gate result and diagnostic limitations
- comparable-analytics gate result and semantic/unit compatibility
- actionable-analytics gate result and finite failed-gate reasons

The gates are separate and monotonic. A valid or displayable result is not
necessarily comparable or actionable, and actionability never grants trading
authority. Partial depth, ambiguous identity, invalid/locked/crossed books, and
stale/gapped/reconnecting/disabled/unsupported/unverified/research-required
inputs cannot pass the actionable gate.

### 7.3 Funding comparison

`FundingDifferential`

- match and input-revision IDs
- long and short venue-native observations preserved independently
- semantic compatibility: current, last, predicted, historical, unknown, or
  not applicable
- native intervals and next-settlement alignment
- exact directional native differential when comparable
- separately named/versioned normalized comparison when available
- exact funding-basis notional/unit and directional cash-flow scenario when all
  required inputs are known
- formula version, provenance, quality, and typed unavailable reason

No universal interval or predicted semantic is inferred.

### 7.4 Opportunity

`Opportunity`

- ID and strategy type
- proposed long and short legs
- calculation snapshot
- expected funding/convergence/cost scenario components where known
- full-depth requested exposure and residual exposure
- ranking components, deterministic completeness, and policy/formula versions
- state: `DISCOVERED`, `QUALIFYING`, `ACTIVE`, `CONVERGING`, `DEGRADED`,
  `SUPPRESSED`, `EXPIRED`, or `RESOLVED`
- immutable transition revision, idempotency key, reasons, generated time,
  qualification window, and expiry

An opportunity is an observation, not an order instruction.

An `ACTIVE` or `CONVERGING` opportunity requires all policy-mandatory inputs to
be supported, known, fresh, complete, and valid. A degraded input revokes
actionability; recovery returns through qualification rather than directly to
an active state.

### 7.5 Anomaly, history, and ranking

`AnomalyOccurrence` references a deterministic rule version, bounded baseline
window, exact threshold evidence, input revisions, quality, severity, and
availability. Market anomalies and source-quality anomalies are distinct. No
ML or AI detector belongs to Phase 2B.

`SpreadObservationRecord` is immutable and carries exact values/units, mapping
and formula versions, ordered input revisions, all relevant timestamps,
provenance, capability/knowledge/quality state, and explicit gap markers.
History contracts do not imply persistence.

`RankingResult` contains an eligibility decision, deterministic completeness,
versioned components, total tie-break evidence, excluded candidates with finite
reasons, and ordered eligible candidates. Eligibility precedes ranking; an
unknown required cost or non-executable input cannot enter an actionable list.

### 7.6 User analytics

- `Favorite`: user plus canonical market pair/instrument, not raw ticker.
- `CalculatorScenario`: versioned user inputs and optional source snapshot.
- `AlertRule`: conditions, cooldown, channels, last evaluation; no trading
  authority.

## 8. Strategy and AI context

### 8.1 Strategy decision

`StrategyDecision`

- decision ID, strategy version, configuration version
- immutable market/calculation inputs
- action: `NO_TRADE`, `WATCH`, `PREPARE_ENTRY`, `ENTER`, `HOLD`,
  `PREPARE_EXIT`, `EXIT`, `EMERGENCY_EXIT`, `DATA_UNRELIABLE`
- exact proposed direction and size
- expected values, reasons, risks, confidence/calibration metadata
- generated and expiry timestamps

Confidence may use non-financial statistical representation, but any serialized
financial field remains an exact decimal string.

### 8.2 AI explanation

`AIExplanation`

- explanation ID
- source strategy/risk decision IDs
- recommendation constrained to allowed state
- summary, supporting factors, risk factors, next-review condition
- fact references
- input data timestamp, model/configuration version
- validation status

It is never a source of trading authority.

## 9. Risk context

### 9.1 Risk policy

`RiskPolicy`

- owner/scope: system, user, venue, symbol, strategy
- version and effective interval
- exact limits and approved units
- activation status and approver

System limits can only narrow user authority. A user limit cannot override a
stricter system limit.

### 9.2 Risk decision

`RiskDecision`

- decision ID and immutable policy/input versions
- outcome: `ALLOW`, `DENY`, `REVOKE`, `REQUIRE_MANUAL_REVIEW`
- reason codes and evaluated limits
- exact bound execution intent, if allowed
- issue and expiry timestamps

An allow decision is short-lived, single-purpose, and parameter-bound.

### 9.3 Circuit breaker and kill switch

- `CircuitBreaker`: signal, scope, threshold, state, trip/reset evidence.
- `KillSwitch`: scope, mode (`BLOCK_NEW`, `BLOCK_AND_SAFE_CLOSE`), actor,
  activation time, reason, acknowledgement.

Reset is separately authorized and audited; recovery is not automatic unless an
approved policy explicitly permits it.

## 10. Trading context (not before later approved phases)

### 10.1 Trading credential

`ExchangeCredential`

- metadata and encrypted material reference
- venue/environment, user, permission evidence
- encryption-key version
- created/rotated/revoked/last-validated timestamps
- state

The secret is not part of normal domain/API responses.

### 10.2 Execution intent

`ExecutionIntent`

- ID, source strategy/user action
- exact legs, direction, size, price/slippage bounds, time in force
- risk decision and expiry
- authority type: paper, explicit manual, delegated semi-auto, auto
- state and idempotency identity

An expired or mismatched risk authorization invalidates the intent.

### 10.3 Logical position

The future aggregate is named `SpreadPosition`; `LogicalPosition` is retained
only as a historical name and must not form a second aggregate.

`SpreadPosition`

- ID, owner, strategy, origin, authority mode, and two or more legs;
- origin: `MANUAL_ENTRY`, `WATCH_ONLY`, `PAPER_SIMULATION`,
  `EXCHANGE_SYNCHRONIZATION`, `SYSTEM_EXECUTION`;
- authority: `TRACKING_ONLY`, `PAPER_ONLY`, `SYNCHRONIZED_READ_ONLY`,
  `MANUAL_LIVE`, `SEMI_AUTOMATIC`, `AUTOMATIC`;
- state:
  `DRAFT`, `WATCHING`, `ENTRY_PROPOSED`, `ENTERING`,
  `PARTIALLY_HEDGED`, `HEDGED`, `HOLDING`, `EXIT_PROPOSED`, `EXITING`,
  `CLOSED`, `DEGRADED`, `EMERGENCY_HEDGE`, `RECONCILIATION_REQUIRED`,
  `FAILED`;
- entry and exit targets;
- versioned entry/current executable valuation;
- spread PnL, funding PnL, fees, estimated/realized slippage, net PnL,
  residual delta, and supported liquidation buffer;
- data quality, reconciliation state, notes, and alert subscriptions;
- optimistic concurrency version.

Every transition has a mode-valid predecessor, cause, actor, timestamp,
quality/state evidence, and audit event. Tracking and synchronized read-only
modes cannot enter action-only states by platform command. State meanings,
transition graph, and mode matrix are authoritative in
`POSITION_MANAGEMENT.md`.

### 10.4 Leg, order, and fill

`PositionLeg`

- spread position and stable leg ID;
- canonical instrument identity, venue, product group, and settlement asset;
- long/short direction;
- exact entry/current price and quantity;
- target/filled quantity and exposure;
- fee, funding, slippage, quality, and reconciliation components.

`OrderAttempt`

- internal ID and unique attempt number
- client order ID only when officially supported
- venue order ID when known
- exact request summary without authentication payload
- state: `CREATED`, `SUBMITTING`, `ACKNOWLEDGED`, `PARTIALLY_FILLED`,
  `FILLED`, `CANCEL_PENDING`, `CANCELED`, `REJECTED`, `EXPIRED`,
  `UNKNOWN`, `RECONCILIATION_REQUIRED`
- timestamps and reconciliation evidence

`Fill`

- stable venue fill identity where available
- order/leg, exact price, quantity, fee, liquidity role, timestamps

An `UNKNOWN` order cannot be resubmitted. Resolution must use official query,
open-order, fill, and position evidence as available for that venue.

### 10.5 Reconciliation

`ReconciliationRun`

- scope, trigger, start/end time
- external snapshots/evidence references
- mismatches and classifications
- actions taken and unresolved items
- outcome

Externally created orders or positions are not adopted automatically without an
explicit approved policy.

## 11. Paper-trading context

Paper objects use the same conceptual order/position states but separate
namespaces, persistence, credentials, and UI labels. Each result also records:

- simulator version and scenario seed;
- latency and fill models;
- fixture/order-book generation;
- simulated venue fault;
- expected versus simulated slippage, fills, and PnL.

Paper and live records can never share an environment identifier or be aggregated
without an explicit environment dimension.

## 12. Billing context (deferred)

`Plan`, `Subscription`, `Invoice`, `PaymentIntent`,
`BlockchainTransaction`, `Entitlement`, and `WebhookEvent` are separate
aggregates. Webhook identity is unique and idempotent. Entitlements are granted
only after the provider-specific confirmation policy succeeds.

Billing state must never block reconciliation, risk evaluation, emergency action,
or a user’s ability to secure or close an existing live position.

## 13. Security and financial criticality

| Classification       | Components                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security-sensitive   | identity, sessions, challenges, RBAC, audit, configuration, notifications, credential vault, signing, admin controls, AI redaction                  |
| Financially critical | instrument metadata, exact decimals, order books, funding/fees, calculators, strategy, risk, order state, fills, reconciliation, PnL, kill switches |
| Both                 | exchange credentials, Risk Engine, execution, position recovery, DEX signing, manual/semi/auto authority                                            |

Changes to either category require threat review, negative tests, metrics,
documentation, and explicit ownership.

## 14. Alert context

`AlertRule`

- user or system owner;
- canonical token/instrument, venue-pair, and strategy filters;
- metric, exact threshold, direction, size, and required data quality;
- minimum duration, cooldown, hysteresis, deduplication, and grouping;
- quiet hours, severity, expiration, mute/pause, and channel preferences;
- version and state: `DRAFT`, `ACTIVE`, `PAUSED`, `EXPIRED`, `DISABLED`.

`AlertEvaluation`

- rule/formula version and immutable inputs;
- event/receive/processing time and data revisions;
- exact result, quality, decision, and reason.

`AlertOccurrence`

- rule and deterministic occurrence/deduplication identity;
- state: `CANDIDATE`, `QUALIFYING`, `TRIGGERED`, `SUPPRESSED`,
  `ACKNOWLEDGED`, `RESOLVED`, `EXPIRED`;
- threshold crossing, duration, suppression, acknowledgment, and resolution
  evidence.

`AlertSuppressionState` records cooldown, hysteresis, mute, quiet-hours,
deduplication, and grouping state independently. Suppression prevents a delivery;
it does not erase the occurrence.

## 15. Notification context

`Notification`, `NotificationRecipient`, `NotificationPreference`,
`NotificationTemplate`, `NotificationDelivery`, `NotificationAction`,
`DeliveryOutbox`, and `DeliveryAttempt` form the future notification domain.

Channels are `IN_APP`, `TELEGRAM_PRIVATE`, `TELEGRAM_CHANNEL`, `EMAIL`, and
`WEB_PUSH`. A notification is channel-neutral; a delivery is recipient/channel
specific.

Delivery states are `PENDING`, `IN_FLIGHT`, `DELIVERED`, `RETRY_SCHEDULED`,
`DEAD_LETTER`, `CANCELED`, and `EXPIRED`. Action states are `ISSUED`,
`CONSUMED`, `EXPIRED`, and `REVOKED`.

The future dispatcher uses a transactional outbox, stable idempotency,
bounded exponential retry, dead-letter handling, provider-rate-limit handling,
and delivery audit. A delivery outcome never changes a position, alert,
reconciliation, risk, or execution result.

## 16. Telegram gateway context

`TelegramGateway` is an application boundary, not a domain aggregate. It maps
verified provider input to authenticated internal queries/commands and approved
templates. It owns no strategy, financial value, position, alert truth,
exchange secret, Risk Engine decision, or execution state.

`TelegramCommand`

- internal actor and linked Telegram identity;
- command kind, target, environment, and idempotency key;
- expected resource/state version;
- issue/expiry time and authorization result;
- optional preview/action reference.

`NotificationAction` used by Telegram is opaque, single-use, short-lived,
identity/environment/resource/version-bound, and replay-protected. It never
serializes an order or credential into callback data.

The public channel accepts only `PUBLIC_ANALYTICS`. Private bot/Mini App data is
tenant-scoped. The Mini App is a client of platform contracts and cannot
calculate or persist independent business truth.
