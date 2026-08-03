# Phase 2A.4 — Bybit V5 linear public adapter

## 1. Status and boundary

Implementation date: **2026-08-02**  
Status: **implemented; independent formal acceptance pending**

This phase implements only current officially documented, public,
unauthenticated Bybit V5 `category=linear` market data. Frozen
`packages/market-data`, `packages/okx-public-adapter` and
`packages/binance-usdm-public-adapter` are unchanged.

There is no Bybit inverse, Spot, option, credential, signature, private API,
order, position, persistence, event bus, scanner UI, Telegram, paper/live
trading, Risk Engine, Execution Engine, AI or billing code.

## 2. Official evidence

The public sources below were re-retrieved again during independent acceptance
on **2026-08-03**. Full warnings are
in [`PHASE_0_SOURCE_REGISTER.md`](PHASE_0_SOURCE_REGISTER.md).

| Source     | Evidence used                                                        |
| ---------- | -------------------------------------------------------------------- |
| `BYBIT-01` | V5 product-family boundary                                           |
| `BYBIT-02` | instruments, identity fields, constraints, interval, pagination      |
| `BYBIT-03` | last/bid/ask/mark/index, funding and next time                       |
| `BYBIT-04` | settled funding history and request limits                           |
| `BYBIT-05` | REST book fields, bounds, sorting, `u` and `seq`                     |
| `BYBIT-06` | WS topic/depth/cadence, snapshot/delta, zero deletion and `u=1`      |
| `BYBIT-07` | official REST origins and regional restrictions                      |
| `BYBIT-08` | linear WSS path, subscription, acknowledgement, heartbeat/reconnect  |
| `BYBIT-09` | HTTP/WS IP limits and response-limit headers                         |
| `BYBIT-10` | public business, frequency and restart errors                        |
| `BYBIT-11` | `timeSecond` and `timeNano`                                          |
| `BYBIT-16` | `linear`, contract and lifecycle enums                               |
| `BYBIT-18` | current V5 changes through 2026-07-30; future 2026-08-04 entry noted |

The canonical REST order-book page documents linear depth 1..1000. The
official API Explorer still displays an older maximum; it is not used as
implementation authority. Current official evidence does not define
contiguous WS `u/seq` increments, so full sequence validation is explicitly
`RESEARCH_REQUIRED`.

## 3. Package architecture

`@arbitrage/bybit-linear-public-adapter` contains:

- fixed venue/product/source constants and capability declarations;
- bounded JSON parsing that preserves financial strings and integer lexemes;
- metadata, price, funding and order-book mappings;
- fixed-origin public REST client and conservative process-local limiter;
- fixed-path public linear WS lifecycle with bounded queue/reconnect;
- deterministic snapshot/delta/restart session around frozen book contracts;
- low-cardinality metric and bounded structured-event contracts;
- source-provenanced fixtures, fault/property/replay tests and opt-in canary.

Transports and clocks are injectable for deterministic tests. No exchange SDK,
database, broker, secret or trading dependency exists.

## 4. Capability matrix

| Capability                   | State               | Evidence / behavior                               |
| ---------------------------- | ------------------- | ------------------------------------------------- |
| instrument metadata          | `SUPPORTED`         | `BYBIT-02`, `BYBIT-16`; unknown types quarantined |
| last/bid/ask ticker          | `SUPPORTED`         | `BYBIT-03`; separate observations                 |
| mark price                   | `SUPPORTED`         | `markPrice` only, `BYBIT-03`                      |
| index price                  | `SUPPORTED`         | `indexPrice` only, `BYBIT-03`                     |
| current funding              | `SUPPORTED`         | venue-native `fundingRate`, `BYBIT-03`            |
| predicted funding            | `UNVERIFIED`        | no reviewed prediction contract                   |
| funding history              | `SUPPORTED`         | perpetual settled rows, `BYBIT-04`                |
| funding interval             | `SUPPORTED`         | explicit minutes/hours only, `BYBIT-02/03`        |
| next funding time            | `SUPPORTED`         | `nextFundingTime`, `BYBIT-03`                     |
| delivery-Futures funding     | `UNSUPPORTED`       | funding endpoint covers perpetuals                |
| REST book snapshot           | `SUPPORTED`         | bounded `/v5/market/orderbook`, `BYBIT-05`        |
| WS book snapshot/delta       | `SUPPORTED`         | public linear orderbook, `BYBIT-06/08`            |
| complete sequence validation | `RESEARCH_REQUIRED` | no previous ID or contiguous rule                 |
| checksum validation          | `UNVERIFIED`        | no selected-stream checksum contract              |
| contract multiplier          | `UNVERIFIED`        | no unambiguous metadata field                     |

Unsupported/unverified/research-required capabilities have no fake ports.

## 5. Exact mappings

| Bybit field                               | Canonical meaning                                      |
| ----------------------------------------- | ------------------------------------------------------ |
| `category=linear`                         | product group `BYBIT_V5_LINEAR` only                   |
| `symbol`                                  | opaque official instrument ID and display symbol       |
| `baseCoin` / `quoteCoin` / `settleCoin`   | injected base / quote / explicit settlement identities |
| `LinearPerpetual`                         | `PERPETUAL`; current/historical funding supported      |
| `LinearFutures`                           | `FUTURE` / `DATED_FUTURE`; funding unsupported         |
| `PreLaunch/Trading/Delivering/Closed`     | pre-launch/active/settling/expired lifecycle           |
| `priceFilter.tickSize`                    | exact tick size                                        |
| `lotSizeFilter.qtyStep`                   | exact quantity step                                    |
| `minOrderQty` / `minNotionalValue`        | exact minimum quantity / notional                      |
| `priceScale`                              | retained vendor metadata; never tick size              |
| `lastPrice` / `bid1Price` / `ask1Price`   | last / bid / ask observations                          |
| `markPrice` / `indexPrice`                | mark / index observations                              |
| ticker `fundingRate`                      | venue-native `CURRENT`, never predicted                |
| history `fundingRate`                     | settled historical `LAST`                              |
| `fundingInterval` / `fundingIntervalHour` | documented native interval only                        |
| `nextFundingTime`                         | next settlement when non-empty/non-zero                |
| REST/WS `u`                               | exact bigint-safe update ID                            |
| REST/WS `seq`                             | exact bigint-safe cross-sequence ordering evidence     |

All financial values remain strings until frozen exact-decimal validation.
NaN, infinity, scientific notation, malformed signs/separators, excessive
precision/scale/length, negative positive-only values and silent rounding fail
closed. Exchange integer IDs are never parsed through JavaScript `number`.

## 6. Book integrity and recovery

1. A valid WS snapshot initializes and sorts the book.
2. Deltas before initialization are rejected.
3. A delta must advance both `u` and `seq`; an equal/older pair is rejected
   without mutation or freshness refresh.
4. A mixed ordering (one advances while the other regresses/equal) is
   contradictory and marks the session `GAPPED`/stale.
5. Numeric jumps are accepted because current sources do not define `+1`
   continuity. This is not claimed as complete gap validation.
6. Zero delta quantity deletes exactly one level.
7. A valid new snapshot replaces local state; `u=1` is treated as the
   documented service-restart replacement.
8. `u=1` on a delta, malformed IDs, queue/message loss, disconnect, invalid or
   locked/crossed book revoke executable output.
9. Ordinary deltas cannot recover. Only a validated replacement snapshot can
   restore executable output.
10. Configured freshness and future-skew checks apply to every WS snapshot and
    delta; stale input never becomes executable.
11. No checksum is calculated or trusted.

REST snapshots are independently validated observations. They are not joined
to a 50-level WS stream as an invented continuity bridge; the official REST
correspondence is specifically documented for 1000-level order-book data.

## 7. Network, limits and time

- REST origin is exactly `https://api.bybit.com`; paths are fixed public
  `/v5/market/*` routes and `category=linear` is injected by code.
- WSS is exactly `wss://stream.bybit.com/v5/public/linear`; one bounded
  `orderbook.50.{symbol}` topic is subscribed.
- Redirects are rejected and response URL is revalidated. User input cannot
  create a host, scheme, port or path.
- REST bodies, WS messages, JSON depth/nodes/arrays/keys/strings, decimal/ID
  lengths, instruments, book levels, queues, reconnect attempts and canary
  activity are bounded.
- Requests have deadlines/cancellation and no automatic retry.
- The documented default is 600 HTTP requests/5 seconds/IP; the adapter uses a
  conservative process-local 500/5-second budget. This is not a distributed
  production quota.
- HTTP 403, business `retCode`, `10006`, schema and transport failures remain
  distinct. No `Retry-After` behavior is invented.
- Server seconds/nanoseconds must agree. RTT and offset are observed; poor time
  quality degrades state and never rewrites exchange financial timestamps.

## 8. Fixtures, tests and canary

`fixtures/manifest.json` records source ID, retrieval date, product group,
origin and transformations. Minimal synthetic fixtures cover USDT/USDC,
perpetual/delivery metadata, prices, funding, REST/WS books, valid updates,
duplicates/older updates, deletion, restart, gap, malformed/category/crossed
inputs, rate limits and server time.

The canary is disabled unless `BYBIT_LINEAR_LIVE_CANARY=1`. Immutable bounds
limit it to 15 seconds, six public requests and ten WS messages. It probes
server time, one instruments page, one active linear perpetual ticker/funding,
one 50-level REST snapshot and one public WS book message. It has no credential,
retry, persistence or trading path and reports point-in-time evidence only.

## 9. Accepted limitations and next gate

- complete silent-gap detection from WS `u/seq` is research-required;
- endpoint-specific public-market UID limits are incomplete;
- Global hosts do not establish regional/legal availability;
- contract multiplier and checksum remain unverified;
- no long-running soak, production metrics backend, persistence or analytics
  service exists.

Phase 2A.4 may be frozen only after an independent formal acceptance review
re-retrieves current Bybit sources, reproduces all offline/runtime/canary
evidence and classifies the sequence limitation explicitly. Phase 2B is not
authorized by this implementation.
