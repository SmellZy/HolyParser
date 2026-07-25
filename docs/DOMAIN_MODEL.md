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

| Value object | Required fields/invariants |
|---|---|
| `Money` | decimal amount, asset/currency; no implicit currency conversion |
| `Price` | decimal amount, base/quote or contract price unit |
| `Quantity` | decimal amount, asset/contract unit |
| `Rate` | decimal value, basis (`fraction`, `percent`, `bps`), horizon |
| `FundingRate` | rate, interval seconds, next settlement time when verified, source time |
| `Percentage` | exact decimal and documented denominator |
| `AssetId` | canonical asset identity; ticker is display metadata |
| `TokenIdentity` | chain ID plus normalized contract address |
| `VenueId` | canonical venue and product family identity |
| `InstrumentId` | stable canonical instrument identity |
| `ExternalId` | value plus issuing venue/system |
| `Timestamped<T>` | value, source time, receive time, processing time |
| `DataQuality` | state, reason codes, last-good time, policy version |
| `CorrelationId` | request/operation correlation without secret material |
| `DecimalConstraint` | min/max, tick or step, rounding rule |

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

### 7.1 Market pair

`MarketPair`

- leg A instrument
- leg B instrument
- comparison type: futures–futures, futures–spot, CEX–DEX
- approved asset-equivalence mapping/version
- quote-currency relationship

Pairing does not imply fungibility. Conversion, chain, settlement, and depeg risk
remain explicit.

### 7.2 Calculation snapshot

`CalculationSnapshot`

- calculation ID/version
- requested size and unit
- immutable input references/timestamps
- buy/sell VWAPs
- mid and executable spread
- fee, funding, slippage, borrow, gas, and other cost components
- missing/unknown components
- residual delta and hedge ratio
- data quality and expiry

If a required component is unknown, `expectedNet` is unavailable rather than
optimistically treating the component as zero.

### 7.3 Opportunity

`Opportunity`

- ID and strategy type
- proposed long and short legs
- calculation snapshot
- expected funding/convergence/cost/risk reserve
- safe size
- score components and policy/model versions
- state: `CANDIDATE`, `WATCH`, `ACTIONABLE`, `NO_TRADE`, `EXPIRED`,
  `DATA_UNRELIABLE`
- reasons, risks, generated/expiry timestamps

An opportunity is an observation, not an order instruction.

### 7.4 User analytics

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

`LogicalPosition`

- ID, user, strategy, two or more legs
- state:
  `PLANNED`, `PRECHECK`, `ENTERING`, `PARTIALLY_HEDGED`, `HEDGED`,
  `HOLDING`, `EXIT_REQUESTED`, `EXITING`, `CLOSED`, `DEGRADED`,
  `EMERGENCY_HEDGE`, `RECONCILIATION_REQUIRED`, `FAILED`
- entry/exit calculations, actual fees/funding/PnL
- residual delta and risk state
- version for concurrency control

Every transition has a validated predecessor, cause, actor, timestamp, and audit
event.

### 10.4 Leg, order, and fill

`PositionLeg`

- logical position, venue/instrument, side, target and filled quantity, exposure

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

| Classification | Components |
|---|---|
| Security-sensitive | identity, sessions, challenges, RBAC, audit, configuration, notifications, credential vault, signing, admin controls, AI redaction |
| Financially critical | instrument metadata, exact decimals, order books, funding/fees, calculators, strategy, risk, order state, fills, reconciliation, PnL, kill switches |
| Both | exchange credentials, Risk Engine, execution, position recovery, DEX signing, manual/semi/auto authority |

Changes to either category require threat review, negative tests, metrics,
documentation, and explicit ownership.
