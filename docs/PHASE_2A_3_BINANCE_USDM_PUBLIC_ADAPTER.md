# Phase 2A.3 — Binance USDⓈ-M public adapter

## 1. Status and boundary

Implementation date: **2026-08-02**  
Status: **implemented; independent formal acceptance pending**

This phase implements only current officially documented, public,
unauthenticated Binance USDⓈ-M Futures market data. It does not approve or
implement Binance Spot, Alpha, COIN-M, Bybit, credentials, private APIs,
persistence, scanner UI, Telegram, positions, paper/live trading, Risk Engine,
Execution Engine, AI or billing.

Frozen `packages/market-data` and `packages/okx-public-adapter` are unchanged.
ADR 0007 defines the adapter boundary.

## 2. Official evidence

All sources were re-retrieved on **2026-08-02**. Full warnings and API versions
are in [`PHASE_0_SOURCE_REGISTER.md`](PHASE_0_SOURCE_REGISTER.md).

| Source     | Official document                                                                                                                                                                                  | Implementation evidence                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `BNFUT-01` | [Market Data — Futures REST API](https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/rest-api/market-data)                                         | endpoints, fields, weights, filters, depth, prices, funding and time |
| `BNFUT-02` | [Public Futures WebSocket Market Streams](https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/ws-streams/public)                                   | diff depth, `U/u/pu`, `st`, product family and cadence               |
| `BNFUT-03` | [Market Futures WebSocket Streams](https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/ws-streams/market)                                          | semantic cross-check only; no mark/funding WS port implemented       |
| `BNFUT-04` | [How to manage a local order book correctly](https://developers.binance.com/en/docs/products/derivatives-trading-usds-futures/websocket-market-streams/How-to-manage-a-local-order-book-correctly) | initialization, overlap, chaining and recovery                       |
| `BNFUT-05` | [General Info](https://developers.binance.com/en/docs/products/derivatives-trading-usds-futures/general-info)                                                                                      | HTTPS, weights, HTTP 429/418 and public operational rules            |
| `BNFUT-08` | [Change Log](https://developers.binance.com/en/docs/products/derivatives-trading-usds-futures/change-log)                                                                                          | current changes through 2026-07-29 and migration history             |
| `BNFUT-09` | [Important WebSocket Change Notice](https://developers.binance.com/en/docs/products/derivatives-trading-usds-futures/websocket-market-streams/Important-WebSocket-Change-Notice)                   | routed public WSS boundary and legacy decommission                   |
| `BNFUT-10` | [Common Definition](https://developers.binance.com/en/docs/products/derivatives-trading-usds-futures/common-definition)                                                                            | contract/status enums, filters and public request budget             |
| `BNFUT-11` | [Connect](https://developers.binance.com/en/docs/products/derivatives-trading-usds-futures/websocket-market-streams/Connect)                                                                       | connection lifetime, protocol ping/pong and stream/message limits    |

No reviewed evidence contradicts the approved USDⓈ-M public product group or
the frozen canonical contracts. The official cadence prose and enum still
conflict; this remains `RESEARCH_REQUIRED` rather than being inferred.

## 3. Package architecture

`@arbitrage/binance-usdm-public-adapter` contains:

- fixed venue/product/source constants and capability declarations;
- bounded JSON/wire schemas that preserve integer source tokens;
- canonical metadata, price, funding and book mappings;
- bounded public REST client and local weighted budgets;
- routed public diff-depth WebSocket controller with bounded reconnect;
- Binance bootstrap/recovery session around the frozen deterministic book;
- finite-label metrics and bounded structured events;
- provenance-bearing fixtures, fault injection and deterministic tests;
- a default-off public canary.

Network transports are injectable for tests. There is no persistence, event
bus, credential field, signing path, private host or trading port.

## 4. Capability matrix

| Capability                  | State                                                       | Concrete port / reason                                                              | Sources                |
| --------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------- |
| Instrument metadata         | `SUPPORTED` for documented contract types                   | `exchangeInfo` mapping; unknown types quarantined                                   | `BNFUT-01`, `BNFUT-10` |
| Last ticker                 | `SUPPORTED`                                                 | V2 symbol ticker                                                                    | `BNFUT-01`, `BNFUT-08` |
| Best bid/ask                | `SUPPORTED`                                                 | book ticker                                                                         | `BNFUT-01`             |
| Mark price                  | `SUPPORTED`                                                 | premium index `markPrice`                                                           | `BNFUT-01`             |
| Index price                 | `SUPPORTED`                                                 | premium index `indexPrice`                                                          | `BNFUT-01`             |
| Latest funding              | `SUPPORTED`                                                 | `lastFundingRate` mapped as `LAST`                                                  | `BNFUT-01`             |
| Predicted funding           | `UNVERIFIED`                                                | reviewed fields do not prove next-period prediction                                 | `BNFUT-01`, `BNFUT-03` |
| Funding history             | `SUPPORTED` for `Regular`; `Special` is `RESEARCH_REQUIRED` | regular settled history; Special dividend-funding rows fail closed                  | `BNFUT-01`, `BNFUT-08` |
| Funding interval            | `SUPPORTED` conditionally                                   | adjusted-symbol `fundingIntervalHours`; absence unknown                             | `BNFUT-01`             |
| Next funding time           | `SUPPORTED`                                                 | `nextFundingTime`                                                                   | `BNFUT-01`             |
| Delivery-Futures funding    | `UNSUPPORTED`                                               | no fake perpetual funding capability                                                | `BNFUT-01`             |
| REST book snapshot          | `SUPPORTED`                                                 | bounded `/fapi/v1/depth`                                                            | `BNFUT-01`, `BNFUT-04` |
| WS snapshot                 | `UNSUPPORTED`                                               | selected stream is diff depth; bootstrap uses REST                                  | `BNFUT-02`, `BNFUT-04` |
| WS delta                    | `SUPPORTED`                                                 | routed public diff-depth stream                                                     | `BNFUT-02`, `BNFUT-09` |
| Sequence validation         | `SUPPORTED`                                                 | overlap then `pu` chaining                                                          | `BNFUT-04`             |
| Checksum validation         | `UNVERIFIED`                                                | no selected-stream checksum contract                                                | `BNFUT-02`, `BNFUT-04` |
| Contract multiplier         | `UNVERIFIED`                                                | no current official field mapped                                                    | `BNFUT-01`             |
| Direct linear/inverse field | `RESEARCH_REQUIRED`                                         | product naming is not field evidence                                                | `BNFUT-01`             |
| `TRADIFI_PERPETUAL`         | `RESEARCH_REQUIRED`                                         | partially listed but lacks sufficient exchangeInfo/canonical semantics; quarantined | `BNFUT-01`, `BNFUT-10` |
| `PERPETUAL_DELIVERING`      | `RESEARCH_REQUIRED`                                         | documented label does not justify canonical dated-Future mapping; quarantined       | `BNFUT-10`             |

Unsupported/unverified capabilities have no fake empty implementation.

## 5. Exact field and semantic mappings

| Binance field or evidence              | Canonical result                                               |
| -------------------------------------- | -------------------------------------------------------------- |
| constants                              | venue `BINANCE_FUTURES`, product group `BINANCE_USDM_FUTURES`  |
| `symbol`                               | opaque official instrument ID and display symbol; never parsed |
| `pair`                                 | exchange-native display/reference value only                   |
| `contractType=PERPETUAL`               | market `PERPETUAL`, contract type `PERPETUAL`                  |
| supported month/quarter delivery type  | market `FUTURE`, contract type `DATED_FUTURE`                  |
| `baseAsset`                            | canonical base through injected resolver                       |
| `quoteAsset`                           | canonical quote through injected resolver                      |
| `marginAsset`                          | explicit settlement asset through injected resolver            |
| `PRICE_FILTER.tickSize`                | exact tick size                                                |
| `LOT_SIZE.stepSize` / `minQty`         | exact quantity step / minimum quantity                         |
| `MIN_NOTIONAL.notional`                | exact minimum notional; absence remains unknown                |
| `pricePrecision` / `quantityPrecision` | retained only as wire metadata; never constraints              |
| no verified multiplier/type fields     | `UNVERIFIED` multiplier / `RESEARCH_REQUIRED` convention       |
| ticker `price`                         | `LAST_PRICE`                                                   |
| book ticker `bidPrice` / `askPrice`    | `BID_PRICE` / `ASK_PRICE`; no implicit midpoint                |
| `markPrice` / `indexPrice`             | `MARK_PRICE` / `INDEX_PRICE`                                   |
| `lastFundingRate`                      | native rate with semantic `LAST`; empty remains unknown        |
| `nextFundingTime`                      | next settlement; zero remains unknown                          |
| `fundingIntervalHours`                 | exact venue-native duration for matching adjusted row only     |
| regular funding-history `fundingRate`  | independently stored settled historical observation            |
| funding-history `rateType=Special`     | fail closed; distinct canonical semantic is research-required  |

Every identity includes venue, product group, official ID, market type and
settlement asset. A missing/conflicting asset mapping fails closed. USDT and
USDC settlement produce different canonical identities.

Official identifiers and asset references remain bounded opaque Unicode
strings; no ASCII/ticker grammar is used for canonical identity. URL delimiter
and control characters are rejected at the transport boundary, and path
components are encoded. Financial values are strings until the frozen
exact-decimal validator accepts them. NaN, infinity, scientific notation,
malformed separators/signs,
excessive wire length, excessive scale/significance, negative required-positive
values and silent rounding are rejected. No eight-hour interval or contract
multiplier is inferred.

## 6. Order-book integrity

The session states are `BUFFERING`, `AWAITING_BRIDGE`, `READY`, `GAPPED`,
`STALE` and `STOPPED`.

Initialization and steady state:

1. diff-depth events are schema-validated and buffered before a snapshot;
2. REST depth supplies `lastUpdateId` and exact bid/ask levels;
3. buffered records with `u < lastUpdateId` are discarded as old;
4. the first accepted event satisfies `U <= lastUpdateId <= u`, whether it was
   buffered before or arrives after the REST snapshot;
5. first-event `pu` is deliberately not compared with the snapshot ID;
6. every subsequent event requires `pu == previous accepted u`;
7. absolute zero quantity deletes a level;
8. an equality boundary (`u == lastUpdateId`) is an explicit no-op boundary
   confirmation, and its successor still must chain with `pu`;
9. bids descend, asks ascend and locked/crossed books cannot be healthy.

A missing bridge, broken `pu`, malformed/overflowed ID, disconnect, stale
timestamp, invalid book, queue/message overflow or wrong `st` fails closed.
Executable output is unavailable in `GAPPED`/`STALE`. Ordinary deltas and an
ordinary snapshot cannot recover it. Recovery requires an explicit replacement
snapshot plus a new buffered overlap/replay cycle. No checksum is invented.

The WebSocket `st` discriminator is mandatory and must equal `1`; `st=2`
COIN-M records are rejected before domain mapping. Update IDs are bigint-safe
and never pass through JavaScript number.

## 7. Network, limits and time

| Control             | Phase 2A.3 behavior                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| REST origin         | fixed `https://fapi.binance.com`                                                                                                      |
| REST paths          | fixed allowlist for exchange info, V2 ticker, book ticker, premium index, funding history/configuration, depth and time               |
| redirects           | rejected (`redirect: error` plus response URL validation)                                                                             |
| REST timeout/cancel | bounded abort controller plus caller cancellation and cleanup                                                                         |
| REST retries        | none                                                                                                                                  |
| response body       | streaming byte bound, including absent or misleading content length                                                                   |
| JSON                | depth/node/array/key/string/decimal/ID/instrument/level bounds                                                                        |
| request budget      | local 2400 weight/minute for documented weighted endpoints; funding history/info use only their documented shared 500/5-minute budget |
| 429 / 418           | distinct typed terminal results; no automatic retry or invented delay                                                                 |
| server time         | exact epoch validation, midpoint offset and RTT quality observation                                                                   |
| WSS origin/path     | fixed `wss://fstream.binance.com/public/ws/<stream>`                                                                                  |
| subscription        | raw URL stream; reconnecting the same bounded URL is resubscription                                                                   |
| message/queue       | byte, message-count and total queued-byte bounds                                                                                      |
| reconnect           | one connection loop, bounded attempts and delay, reset only after READY/recovery, deterministic timers/socket cleanup                 |
| heartbeat           | WebSocket runtime answers protocol ping frames; no invented JSON heartbeat                                                            |
| cadence             | native, documented-enum 100 ms or 500 ms; contradiction remains research-required                                                     |

Server-time failure degrades time quality and never rewrites exchange financial
timestamps. Metric labels contain only fixed venue/product group, canonical
capability and finite quality state. Symbols, instrument IDs, URLs, payloads,
raw errors and free-form reasons are excluded. Structured events carry finite
reason codes and never full hostile payloads.

Unknown forward-compatible object fields are ignored only after global
byte/depth/node/key/string bounds pass. Required fields and enums remain
strict; unknown product/contract discriminators are quarantined or rejected,
and unknown filters cannot supply canonical constraints.

## 8. Fixtures and tests

`fixtures/manifest.json` records retrieval date, product group, official source
IDs, copied/minimally transformed/synthetic origin and transformations for each
fixture. Minimal fixtures cover perpetual/delivery and USDT/USDC metadata,
prices, funding/configuration, REST depth, overlap/linked/duplicate/old/gap/zero
events, wrong family, malformed/excessive payloads, invalid books, rate limits
and server time.

Tests cover schemas, exact mapping, canonical identity, USDT/USDC separation,
decimal and ID boundaries, overlap, `pu` chaining, duplicates/old events,
gap/stale/recovery, zero deletion, ordering, locked/crossed suppression,
freshness, queue/message/response bounds, redirects, 429/418, time quality,
reconnect/resubscribe/cleanup, deterministic replay, generated bigint chains,
fault injection and canary cancellation.

## 9. Canary

The live canary is disabled unless `BINANCE_USDM_LIVE_CANARY=1` is explicitly
set. Immutable local bounds cap it at 15 seconds, seven REST requests, ten
WebSocket messages, one selected active perpetual and bounded response sizes.
It probes server time, exchange info, V2 last, book ticker, premium/funding
data, funding configuration, one five-level REST depth and one diff-depth
message. It uses no credential, persistence, private endpoint, retry or trading
path and closes on success, error, timeout or cancellation.

Canary output is point-in-time evidence only. An external access failure is a
typed canary/external result and does not by itself prove an implementation
defect.

## 10. Accepted limitations and remaining risks

- Official cadence prose and parameter enum conflict.
- A 2026-08-02 canary observed `TRADIFI_PERPETUAL`. The REST catalog partially
  lists it, while common/exchangeInfo semantics remain incomplete. These rows
  are counted and quarantined; no canonical semantics are inferred.
- `PERPETUAL_DELIVERING` and funding-history `rateType=Special` remain
  fail-closed until distinct canonical mappings are approved.
- The migration notice contradicts itself about legacy public-depth survival;
  only the routed `/public` path is implemented.
- Complete unadjusted per-symbol funding intervals are not documented.
- Predicted funding, checksum, contract multiplier and direct linear/inverse
  classification are not claimed.
- The implementation uses the Global production public origin only; legal,
  geographic and data-rights eligibility remains a production-pilot gate.
- Request weights, routed schema and migration behavior can change and require
  source/changelog recheck plus canary evidence.
- The local rate limiter is process-local; distributed budgeting belongs to a
  later measured infrastructure phase.
- This implementation evidence is not an independent formal acceptance review.

## 11. Formal acceptance gate

Phase 2A.3 may enter independent formal acceptance only after formatting,
linting, pinned-Node type checking/tests/builds, Kotlin regression, production
audit, quality/application images, Compose runtime endpoints, scans and the
bounded public canary have reproducible evidence. The reviewer must re-retrieve
official Binance documentation, distrust this implementation report, add tests
for prose-only invariants, classify findings and fix only Phase 2A.3 BLOCKER or
HIGH defects.
