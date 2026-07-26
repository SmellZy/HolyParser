# Phase 2A.1 — Canonical Market-Data Foundation

## 1. Status and boundary

Implemented as a mock-only, public-data contract and deterministic test harness.
This phase creates no running market-data service and performs no network access.
It contains no credentials, authenticated calls, persistence, event bus, scanner
UI, paper trading, live trading, Risk Engine, Execution Engine, AI, billing, or
DEX transaction construction.

The approved pilot order is:

1. OKX Exchange V5 Swap/Futures;
2. Binance USDⓈ-M Futures;
3. Bybit V5 `linear`.

Bitget UTA V3 is reserve-only. Phase 2A.1 does not implement any of them.

## 2. Package and dependency boundary

`packages/market-data` is a pure TypeScript workspace with no runtime
dependencies. It contains:

- opaque canonical identifiers;
- exact-decimal wire validation and domain arithmetic;
- instrument, funding, and price observation contracts;
- capability, provenance, quality, and freshness contracts;
- deterministic order-book machines;
- mock adapter capability enforcement;
- metric and structured-event contracts;
- synthetic official-semantics fixtures and tests.

`fast-check` is test-only. The package contains no `fetch`, HTTP, WebSocket,
authentication, signing, database, Redis, queue, or exchange SDK dependency.
Choosing the deployed market-data process language is intentionally deferred to
the separately approved live-adapter phase. The canonical rules are versioned
independently of that process choice.

## 3. Canonical identity invariants

A CEX instrument identity is exactly:

```text
venue
+ product group
+ official instrument ID
+ market type
+ settlement asset
```

The canonical `InstrumentId` is a versioned length-prefixed encoding of those
five opaque components. Length-prefixing prevents delimiter collisions.

Invariants:

- display symbol and concatenated ticker are never identity inputs;
- official instrument ID remains venue-native and opaque;
- product families with different API/execution/custody models remain separate;
- quote and settlement assets are distinct typed roles;
- USDT and USDC canonical asset IDs are never equivalent;
- a manual mapping contract carries provenance, effective time, proposer,
  reviewer, and conflict-quarantine state; no registry or persistence is
  implemented;
- DEX identity is not modeled by this CEX identifier and requires its own later
  chain/token-aware contract.

## 4. Exact-decimal contract

### 4.1 Boundary rules

External financial values remain strings until `ExactDecimal.parse` validates
them. The canonical wire policy is `canonical-financial-decimal/v1`:

| Rule                               | Value                                                     |
| ---------------------------------- | --------------------------------------------------------- |
| notation                           | plain decimal only                                        |
| maximum significant digits         | 78                                                        |
| maximum wire scale                 | 36                                                        |
| leading plus                       | rejected                                                  |
| leading/trailing whitespace        | rejected                                                  |
| locale separators                  | rejected                                                  |
| `NaN`/`Infinity`                   | rejected                                                  |
| leading zero variants such as `01` | rejected                                                  |
| `.5` or `5.`                       | rejected                                                  |
| scientific notation                | rejected unless a separately named wire policy permits it |

The domain representation is a `bigint` coefficient plus an integer scale. It
does not pass prices, quantities, notionals, rates, percentages, multipliers,
tick sizes, quantity steps, or sequence IDs through JavaScript `number`.

The internal maximum scale is 78 so multiplying two independently valid
scale-36 wire values does not immediately lose precision. Results that exceed
78 coefficient digits or scale 78 fail with an overflow error. There is no
clamping.

### 4.2 Financial roles

The package exposes branded exact types for:

- `Price`;
- `Quantity`;
- `Notional`;
- `FundingRate`;
- `Percentage`;
- `ContractMultiplier`;
- `TickSize`;
- `QuantityStep`.

Prices, multipliers, tick sizes, and quantity steps must be positive. Quantities
and notionals may be zero but not negative. Funding and percentage values may be
negative.

### 4.3 Rounding

Every division requires both an output scale and a named policy:

| Policy           | Meaning                                             |
| ---------------- | --------------------------------------------------- |
| `EXACT`          | fail when a remainder exists                        |
| `TOWARD_ZERO`    | truncate magnitude                                  |
| `AWAY_FROM_ZERO` | increase magnitude when a remainder exists          |
| `HALF_UP`        | nearest; exact halves increase magnitude            |
| `HALF_EVEN`      | nearest; exact halves select an even retained digit |

No default rounding policy exists. Trailing decimal zeros may be removed because
that transformation is exact; non-zero digits are never discarded silently.

## 5. Observation contracts

Every observation carries:

- exchange timestamp when available;
- receive timestamp;
- processing timestamp;
- Phase 0 source ID;
- quality state.

### 5.1 Instrument metadata

The metadata observation contains the official instrument ID, display symbol,
base/quote/settlement assets, market type, contract type, multiplier,
linear/inverse/quanto classification, tick and quantity steps, minimum quantity,
minimum notional, funding capabilities, lifecycle, observation time, and
provenance.

Fields whose evidence can be incomplete use `Knowledge<T>`:

- `KNOWN` contains a value;
- `UNKNOWN` means a value is semantically possible but absent/unknown;
- `UNSUPPORTED` means official evidence confirms unavailability;
- `UNVERIFIED` means current official evidence does not confirm it;
- `RESEARCH_REQUIRED` means evidence is incomplete or contradictory.

An empty string, zero, or fake empty object is not a substitute for any of these
states.

### 5.2 Funding

A funding observation stores independently:

- venue-native exact rate;
- `CURRENT`, `LAST`, `PREDICTED`, or `UNKNOWN` semantic;
- documented interval duration when known;
- observation time;
- next settlement time when known;
- provenance and quality.

`normalized-funding-8h/v1` is the only eight-hour comparison implemented. It is
a separately named derived value and requires a known native rate, a known
positive native interval, an output scale, and an explicit rounding policy. It
does not mutate or replace the native observation and preserves its semantic
label. No venue interval is hardcoded.

### 5.3 Prices

Last, bid, ask, midpoint, mark, index, and oracle prices are separate domain
objects. A venue-native fair or oracle field cannot become a canonical mark or
index observation without a reviewed adapter mapping. Midpoint is derived only
from a valid non-crossed bid/ask pair.

## 6. Public adapter capabilities

Every adapter must declare one of `SUPPORTED`, `UNSUPPORTED`, `UNVERIFIED`, or
`RESEARCH_REQUIRED` for each capability:

- instrument metadata;
- ticker;
- mark price;
- index/oracle price;
- current funding;
- predicted funding;
- funding history;
- funding interval;
- next funding time;
- REST order-book snapshot;
- WebSocket order-book snapshot;
- WebSocket order-book delta;
- sequence validation;
- checksum validation.

`MockPublicMarketDataAdapter` enforces that a `SUPPORTED` capability has a real
fixture-backed port and that every other state has no port. This prevents a fake
empty implementation from being interpreted as support.

## 7. Quality and freshness

Available quality states are:

`HEALTHY`, `DEGRADED`, `STALE`, `GAPPED`, `RECONNECTING`, `UNSUPPORTED`,
`UNVERIFIED`, `RESEARCH_REQUIRED`, and `DISABLED`.

Freshness is configured per venue, product group, and channel. A policy supplies
its own healthy and stale age thresholds. The library has no global timeout and
does not derive one from another venue's documented cadence. Gap, reconnect,
unsupported, unverified, research-required, and disabled states cannot become
healthy merely because a timestamp is recent.

## 8. Order-book integrity

The deterministic machine supports:

1. `SNAPSHOT_REPLACEMENT`;
2. `SNAPSHOT_PLUS_DELTA`;
3. `SEQUENCE_CHAINED_DELTA`;
4. `NO_TRUSTED_EXECUTABLE_BOOK`.

Sequence validation is separately configured as none, contiguous,
previous-ID-chain, or range-with-previous-ID. Update IDs are unsigned `bigint`
values parsed from strings.

For the Binance range policy, initialization and ongoing continuity are
different rules: the first buffered event must bridge the REST snapshot with
`U <= lastUpdateId <= u`; only subsequent events require `pu` to equal the
previous stream event's `u`.

### 8.1 State transitions

| Current state      | Input                      | Result                                 |
| ------------------ | -------------------------- | -------------------------------------- |
| `UNINITIALIZED`    | valid snapshot             | `READY`                                |
| `UNINITIALIZED`    | delta                      | reject, no output                      |
| `READY`            | valid linked delta         | apply and remain `READY`               |
| `READY`            | duplicate/out-of-order ID  | explicitly reject, retain current book |
| `READY`            | sequence gap               | integrity `GAPPED`, quality `STALE`    |
| `READY`            | crossed/invalid result     | integrity `INVALID`, quality `STALE`   |
| `GAPPED`/`INVALID` | delta                      | reject                                 |
| `GAPPED`/`INVALID` | valid replacement snapshot | recover to `READY`                     |
| `DISABLED`         | any update                 | reject as unsupported                  |

After a gap there is no executable view until explicit snapshot recovery.
Adapter-specific reconnect or restart rules must map to replacement recovery
only when official documentation supports that mapping.

### 8.2 Level and output invariants

- zero quantity in a delta deletes the price level;
- zero quantity or duplicate price in a snapshot makes it invalid;
- bids are sorted descending and asks ascending;
- a locked or crossed top of book never becomes healthy;
- best bid, best ask, midpoint, and VWAP are exposed only through a valid healthy
  executable view;
- insufficient depth returns no VWAP;
- larger requested buy quantity cannot improve ask VWAP on a static book;
- larger requested sell quantity cannot improve bid VWAP on a static book;
- no checksum is calculated or assumed.

For a sequence-less replacement stream, duplicate detection is available only
when the source supplies a stable identifier. Content hashing is not invented.

## 9. Fixture provenance

All market values are deliberately small synthetic examples; no substantial
official payload is copied.

| Fixture                                 | Phase 0 source | Retrieval  | Product group               | Origin and transformation                                                  |
| --------------------------------------- | -------------- | ---------- | --------------------------- | -------------------------------------------------------------------------- |
| `okx-sequence-chain.json`               | `OKX-01`       | 2026-07-26 | OKX V5 Swap/Futures         | synthetic; `seqId`/`prevSeqId` semantics renamed to canonical IDs          |
| `binance-u-u-pu.json`                   | `BNFUT-04`     | 2026-07-26 | Binance USDⓈ-M Futures      | synthetic; `U/u/pu` mapped to canonical first/current/previous IDs         |
| `bybit-snapshot-restart.json`           | `BYBIT-06`     | 2026-07-26 | Bybit V5 linear             | synthetic; documented `u=1` restart represented as replacement snapshot    |
| `hyperliquid-snapshot-replacement.json` | `HL-03`        | 2026-07-26 | Hyperliquid-style test only | synthetic repeated snapshot replacement; no adapter, sequence, or checksum |
| `adversarial-inputs.json`               | `BNFUT-04`     | 2026-07-26 | canonical harness           | synthetic malformed decimal, ID, and crossed-book cases                    |

Each fixture embeds source ID, retrieval date, product group, copied/transformed/
synthetic classification, and transformations. The Hyperliquid-style fixture
tests only the generic replacement strategy and grants no approval for an
on-chain adapter.

## 10. Observability contracts

The package defines, but does not export to a monitoring backend:

- adapter state;
- message count;
- parse failures;
- sequence gaps;
- duplicate updates;
- stale transitions;
- recovery;
- invalid books;
- last successful observation;
- receive lag;
- processing lag.

Structured events carry venue, product group, channel, quality, reason, and
optional update linkage. Instrument IDs are not approved metric labels, avoiding
unbounded cardinality. Free-form channels and reasons remain structured-event
fields and are not approved metric labels. Metrics use the finite canonical
capability dimension instead.

## 11. Verification and local commands

There is no Phase 2A.1 runtime to start. Install and run the repository quality
suite:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

The unchanged application stack remains:

```bash
docker compose up --build
docker compose ps
```

## 12. Phase 2A.1 acceptance

- [x] Required canonical identifiers are strongly typed.
- [x] CEX identity includes all five approved components.
- [x] USDT/USDC separation is tested.
- [x] Financial wire values are exact validated strings; financial arithmetic is
      bigint-based.
- [x] Scientific notation, scale, precision, malformed signs, separators, and
      silent rounding are tested.
- [x] Metadata, funding, price, capability, quality, freshness, and provenance
      contracts exist.
- [x] Four order-book strategies and four sequence policies exist.
- [x] Initialization, ordered delta, duplicate, gap, restart, recovery,
      deletion, crossing, deterministic replay, and VWAP invariants are tested.
- [x] Mock capability ports fail closed.
- [x] No network, credential, persistence, trading, or monitoring
      infrastructure is present.

## 13. Acceptance criteria for Phase 2A.2

Phase 2A.2 may implement only the OKX Exchange V5 Swap/Futures public adapter
after explicit approval. It is accepted only when:

1. current official OKX sources and changelog are re-retrieved and registered;
2. every JSON field mapping cites source ID and product group;
3. all endpoints and WebSocket channels are public and unauthenticated;
4. instrument identity comes from official metadata, never symbol parsing;
5. native funding semantic, interval, and next time remain independently known
   or unknown;
6. `seqId`/`prevSeqId` gaps suppress output and trigger documented snapshot
   recovery;
7. no JSON checksum behavior is invented;
8. rate limits, time sync, reconnect, resubscribe, bounded queues, and parse
   failures are tested;
9. recorded/replayed fixtures and bounded credential-free integration tests
   pass;
10. no order, credential, private stream, paper/live trading, DEX, persistence,
    event bus, Risk Engine, or Execution Engine code appears;
11. all repository quality, build, production-audit, and Compose checks remain
    green.
