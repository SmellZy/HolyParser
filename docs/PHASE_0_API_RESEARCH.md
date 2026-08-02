# Phase 0 Official API Research

## 1. Scope

This document records the Phase 0 discovery result for the requested venues.
It is an evidence record, not an implementation design and not permission to
call authenticated or trading APIs.

Research date: **2026-07-26**

Evidence sources are identified by source ID in
[`PHASE_0_SOURCE_REGISTER.md`](PHASE_0_SOURCE_REGISTER.md). Status meanings:

- `VERIFIED` — explicitly documented by a reviewed official source;
- `UNVERIFIED` — not confirmed by the reviewed official sources;
- `UNSUPPORTED` — officially unavailable or structurally inapplicable;
- `RESEARCH_REQUIRED` — official evidence is incomplete, ambiguous, stale, or
  contradictory.

Prices, quantities, funding values, timestamps, symbols, intervals, limits and
order types below are documentation facts only. They must still be captured as
exact wire values and fixture-tested before an adapter is approved.

## 2. Research boundary

- Binance Futures means **USDⓈ-M Futures only**. COIN-M is a separate,
  unresearched capability group.
- Products sharing a company are separate groups: Binance Spot, Futures and
  Alpha; OKX Exchange and OKX DEX; MEXC Spot and Futures.
- A DEX quote, RFQ response and CEX order book are different domain objects.
- USDT and USDC remain separate assets.
- DEX identity uses chain and token/asset IDs, never ticker text alone.
- Trading facts are inventoried for future planning only. No credentials,
  private calls, signing implementation, paper trading or execution work is
  authorized.

## 3. Venue capability records

### 3.1 Binance Futures — USDⓈ-M

- **Product, API and access:** `VERIFIED` — Binance USDⓈ-M Futures; REST
  `/fapi/v1` and public/private WebSocket; public analytics, authenticated
  read-only and trading APIs exist. Markets are USDⓈ-margined perpetual and
  delivery futures. Sources: BNFUT-01..07.
- **Instrument identity and constraints:** `VERIFIED` — `symbol`, `pair`,
  `baseAsset`, `quoteAsset`, `marginAsset`, `contractType`, filters for
  `tickSize`, `stepSize`, `minQty` and minimum notional. Ticker format is
  concatenated, for example `BTCUSDT`. Contract multiplier is `UNVERIFIED`;
  a direct linear/inverse field is `UNVERIFIED` and therefore canonical
  classification is `RESEARCH_REQUIRED`. Do not use `pricePrecision` or
  `quantityPrecision` as tick/step.
- **Prices and funding:** mark price, index price, current documented funding
  rate, history and `nextFundingTime` are `VERIFIED`. Predicted-rate semantics
  are `UNVERIFIED`. A complete per-symbol funding interval is
  `RESEARCH_REQUIRED`: `fundingIntervalHours` is published for adjusted
  symbols, so no global interval may be assumed.
- **Books and operations:** REST depth and incremental depth are `VERIFIED`;
  `U/u/pu` continuity and resnapshot on gap are `VERIFIED`; checksum is
  `UNVERIFIED`. Documented cadence is `RESEARCH_REQUIRED` because current prose
  and enum values differ. Current migrated streams can include USDⓈ-M and
  COIN-M records and must be filtered by documented `st`. Limits/weights and
  `/fapi/v1/time` are `VERIFIED`. Demo REST/WS is `VERIFIED`.
- **Authentication and trading inventory:** signed API-key requests, private
  order/position streams, client ID (maximum 36 with documented pattern),
  `LIMIT`, `MARKET`, `STOP`, `STOP_MARKET`, `TAKE_PROFIT`,
  `TAKE_PROFIT_MARKET`, `TRAILING_STOP_MARKET`, IOC, FOK and GTX post-only are
  `VERIFIED`. Error semantics are `VERIFIED`; specific HTTP 503 results have
  unknown execution state, so reconciliation before retry is mandatory.
  Geographic/account eligibility is `RESEARCH_REQUIRED`.

### 3.2 Binance Spot

- **Product, API and access:** `VERIFIED` — Binance Spot Trading; REST API v3,
  public WebSocket and authenticated user-data streams. Market type is Spot.
  Sources: BNSPOT-01..09.
- **Instrument identity and constraints:** `VERIFIED` — uppercase concatenated
  REST symbol such as `BTCUSDT`, lowercase WS subscription name, `baseAsset`,
  `quoteAsset`, `PRICE_FILTER.tickSize`, `LOT_SIZE.stepSize/minQty`, and dynamic
  `MIN_NOTIONAL`/`NOTIONAL` filters. Settlement asset, multiplier and
  inverse/linear type are `UNSUPPORTED`.
- **Prices and funding:** ticker is `VERIFIED`. Mark price, index price,
  current/predicted/historical funding, funding interval and next-funding time
  are `UNSUPPORTED` for Spot.
- **Books and operations:** `/api/v3/depth`, incremental depth at documented
  1000 ms or 100 ms, `lastUpdateId/U/u`, buffering/snapshot/replay and gap
  restart are `VERIFIED`. Checksum is `UNVERIFIED`. Dynamic rate-limit
  declarations, route weights and `/api/v3/time` are `VERIFIED`. API-only
  virtual-asset Spot Testnet is `VERIFIED` and can reset.
- **Authentication and trading inventory:** API key plus documented HMAC,
  RSA or Ed25519 signing, private order/account streams and client order ID are
  `VERIFIED`. `MARKET`, `LIMIT`, `STOP_LOSS`, `STOP_LOSS_LIMIT`,
  `TAKE_PROFIT`, `TAKE_PROFIT_LIMIT`, IOC, FOK and `LIMIT_MAKER` post-only are
  `VERIFIED`. Derivative position streams are `UNSUPPORTED`. Error/unknown
  state behavior is `VERIFIED`: timeout `-1007` and some 5xx outcomes require
  query/stream reconciliation. Geography is `RESEARCH_REQUIRED`.

### 3.3 Binance Alpha

- **Product, API and access:** `VERIFIED` — Binance Alpha Trading public REST
  and public WebSocket. Authenticated read-only and trading API availability
  are `UNVERIFIED`. Treat Alpha separately from Binance Spot and from a DEX.
  Sources: BNALPHA-01..03.
- **Instrument identity and constraints:** `VERIFIED` — Alpha identifier such
  as `ALPHA_105USDT`, `baseAsset`, `quoteAsset`, tick/step/minimum filters, and
  token metadata including `tokenId`, `alphaId`, `chainId`, `chainName`,
  `contractAddress` and decimals. Canonical token identity must use chain and
  contract. Settlement, multiplier and contract type are `UNVERIFIED`.
- **Prices and funding:** ticker is `VERIFIED`; mark, index and every requested
  funding capability are `UNVERIFIED`.
- **Books and operations:** full REST depth, partial/full WS depth, `U/u/pu`
  and documented 0/100/500 ms stream enums are `VERIFIED`. Checksum is
  `UNVERIFIED`; complete resynchronization is `RESEARCH_REQUIRED`. The
  exchange-info description claims time/limits while its schema omits them, so
  server time, weights and errors are `RESEARCH_REQUIRED`. Testnet is
  `UNVERIFIED`.
- **Authentication and trading inventory:** authentication, private
  order/position streams, client order ID, order types, IOC/FOK/post-only and
  unknown-order-state behavior are `UNVERIFIED`. Geography/account
  restrictions are `RESEARCH_REQUIRED`.

### 3.4 OKX Exchange

- **Product, API and access:** `VERIFIED` — OKX Exchange API V5, public and
  authenticated REST/WS. Markets: Spot, Margin, Swap, Futures, Option and
  documented Events. Sources: OKX-01..03.
- **Instrument identity and constraints:** `VERIFIED` — official `instId`,
  `instType`, `instFamily`, `uly`, `settleCcy`, `ctVal`, `ctMult`, `ctValCcy`,
  `ctType` (`linear`/`inverse`), `tickSz`, `lotSz`, `minSz`, state and
  `ruleType`. For derivatives, the current guide explicitly limits `baseCcy`
  and `quoteCcy` to Spot/Margin; they must not be parsed from `instId`.
  Linear base/quote/settlement roles are obtained from
  `ctValCcy`/`settleCcy`; inverse roles remain distinct. Pre-market X-Perps
  use `instType=FUTURES` plus `ruleType=pre_market`, later `xperp`. Minimum
  notional is `UNVERIFIED`. Source: OKX-01, OKX-02.
- **Prices and funding:** ticker `last`/`bidPx`/`askPx`, derivative `markPx`,
  and index `idxPx` are `VERIFIED` and are not interchangeable.
  `fundingRate` is explicitly the `PREDICTED` upcoming-settlement rate;
  `settFundingRate` is `CURRENT` only while `settState=processing`, otherwise
  it is `LAST`. `nextFundingRate` is `UNSUPPORTED` for `current_period`;
  `next_period` is no longer supported. The actual interval is the difference
  between `fundingTime` and `nextFundingTime`; it can be 8/6/4/2/1 hours and
  is never hardcoded. Funding applies to Swap and X-Perp Futures, not
  traditional expiry Futures. History is `VERIFIED`; derivative minimum
  notional remains `UNVERIFIED`. Source: OKX-01.
- **Books and operations:** `/market/books` (400) and `/market/books-full`
  (5000, one-second cache) are `VERIFIED`. WS `books` 100 ms, eligible
  `books-l2-tbt`/`books50-l2-tbt` 10 ms, `books5` snapshot 100 ms and BBO are
  documented. `prevSeqId/seqId` continuity, the same-ID empty no-update
  message, and the smaller-ID maintenance reset exception are `VERIFIED`.
  JSON checksum is `UNSUPPORTED` after 2026-06-23: the field remains but is
  always `0`. Exact server-prescribed JSON gap recovery is
  `RESEARCH_REQUIRED`; Phase 2A.2 therefore closes and resubscribes, accepting
  executable recovery only from a new `action=snapshot`. Endpoint limits,
  WebSocket 3-connect-requests/s, 480 operations/connection/hour, 64 KB
  subscription bound, heartbeat behavior, `/api/v5/public/time`, Global
  public hosts and Demo Trading are `VERIFIED`. Region-specific WebSocket
  routing remains `RESEARCH_REQUIRED`. Sources: OKX-01..03.
- **Authentication and trading inventory:** API key/secret/passphrase,
  HMAC-SHA256 Base64 headers, private order/position streams, `clOrdId`
  (32 alphanumeric, pending-order uniqueness), market/limit/post-only/FOK/IOC
  and optimal-limit-IOC are `VERIFIED`. Errors use top-level and per-item
  codes. Cancel/amend acceptance is not final state; stream/query
  reconciliation is mandatory. Regional domains and VIP feed access are
  documented, but product availability still requires owner/account review.

### 3.5 OKX DEX / Onchain OS

- **Product, API and access:** official product is OKX DEX / Onchain OS Swap
  API. REST endpoints and authenticated developer-project access are
  `VERIFIED`; Swap WebSocket is `UNVERIFIED`. The UI/pages say V5 and show
  `/api/v5`, while the access guide shows `/api/v6`; API family is therefore
  `RESEARCH_REQUIRED`. Sources: OKXDEX-01..08.
- **Instrument identity and constraints:** `VERIFIED` — chain index plus token
  contract address, token decimals/name/symbol, from-token and to-token. A CEX
  symbol, base/quote/settlement model, multiplier, linear/inverse, static tick
  and quantity step are `UNSUPPORTED`. Stable minimum quantity/notional
  metadata is `RESEARCH_REQUIRED`; route-time min/max errors exist.
- **Prices and funding:** route quote, input/output quantities, estimated gas
  and price impact are `VERIFIED`. CEX ticker, mark/index and all funding
  capabilities are `UNSUPPORTED`.
- **Books and operations:** order-book snapshot, incremental channel,
  sequence and checksum are `UNSUPPORTED`; a route quote is not a book.
  Trial/start-up/enterprise RPS tiers are `VERIFIED`; dedicated server time and
  general sandbox are `UNVERIFIED`. Reconnect/resync is inapplicable to the
  reviewed REST quote API.
- **Authentication and trading inventory:** project key/passphrase/timestamp
  and HMAC-SHA256 Base64 are `VERIFIED`. Swap returns transaction construction;
  wallet signing/broadcast remains external. CEX private streams, client order
  ID, positions, market/limit/IOC/FOK/post-only are `UNSUPPORTED`; `exactIn`
  and constrained `exactOut` are verified swap modes. Business errors may use
  HTTP 200. Transaction-hash/finality/reorg/nonce recovery is
  `RESEARCH_REQUIRED`. Access tier and chain restrictions are documented.

### 3.6 Bitget

- **Product, API and access:** `VERIFIED` — Bitget UTA API V3, REST/WS,
  public/authenticated, covering Spot, Margin, USDT-Futures, USDC-Futures and
  Coin-Futures. Classic V2 is maintenance-only. Sources: BITGET-01..19.
- **Instrument identity and constraints:** concatenated symbol such as
  `BTCUSDT`, `baseCoin`, `quoteCoin`, `priceMultiplier` tick,
  `quantityMultiplier` step, `minOrderQty`, `minOrderAmount`, type/state and
  futures `fundInterval` are `VERIFIED`. Settlement, contract multiplier and
  explicit linear/inverse are `UNVERIFIED`. Quantity denomination differs by
  futures category and must not be inferred.
- **Prices and funding:** ticker, futures mark/index/current funding, dynamic
  interval, next time and history are `VERIFIED`; predicted funding is
  `UNVERIFIED`.
- **Books and operations:** REST snapshot up to 1000 is `VERIFIED` but lacks
  sequence. WS snapshot/delta, `seq/pseq`, restart indicator and 1/10/20/50 ms
  cadences are `VERIFIED`; exact gap action is `RESEARCH_REQUIRED`. UTA V3
  checksum is `UNSUPPORTED` since 2026-05-19. Overall/endpoint/WS limits,
  heartbeat, common V2 server-time endpoint and V3 demo are `VERIFIED`.
- **Authentication and trading inventory:** API key/secret/passphrase with
  HMAC-SHA256 Base64 or RSA, private order/position channels, `clientOid`
  (32-character rule), limit/market, IOC/FOK/GTC/post-only are `VERIFIED`.
  Error docs explicitly require query by `clientOid` for timeout/service
  uncertainty. RPI is restricted. Exact geographic/entity/account-mode
  eligibility is `RESEARCH_REQUIRED`.

### 3.7 Gate

- **Product, API and access:** `VERIFIED` — Gate API v4 (`v4.106.x` at
  research time), public/authenticated REST/WS. Spot, Margin, Perpetual,
  Delivery and Options exist. Sources: GATE-01..05.
- **Instrument identity and constraints:** Spot `ETH_USDT`, `base`, `quote`,
  min base/quote amounts and precisions are `VERIFIED`; explicit tick/step are
  `UNVERIFIED`. Futures name, path/product settlement, `settle_currency`,
  inverse/direct `type`, `quanto_multiplier`, `order_price_round`,
  `order_size_min/max` and decimal-enabled flag are `VERIFIED`. Explicit
  base/quote decomposition, decimal quantity step and minimum notional are
  `UNVERIFIED`.
- **Prices and funding:** Spot/futures tickers and derivative mark/index are
  `VERIFIED`. Current/history, `funding_interval`, `funding_next_apply` and
  `funding_rate_next` are `VERIFIED`; deprecated
  `funding_rate_indicative` must not be used.
- **Books and operations:** Spot/futures snapshots, WS updates, `U/u`,
  snapshot alignment, continuity and futures `full=true` replacement are
  `VERIFIED`; checksum is `UNVERIFIED`, exact gap/backoff policy
  `RESEARCH_REQUIRED`. Current canonical public limit is 200 requests/10 s per
  endpoint/IP; an older official mirror's 900/s is stale. `/spot/time` is
  `VERIFIED`, but an official regional page disagrees on authentication, so
  access semantics are `RESEARCH_REQUIRED`. Futures testnet is `VERIFIED`;
  complete Spot REST parity is `RESEARCH_REQUIRED`. Futures decimal size needs
  `X-Gate-Size-Decimal: 1` to prevent truncation.
- **Authentication and trading inventory:** `KEY/Timestamp/SIGN`,
  SHA-512 body hash and HMAC-SHA512, private order/position streams, custom
  `text` client ID, limit/market, GTC/IOC/FOK/post-only are `VERIFIED`.
  Client-ID retention and exact timeout recovery are `RESEARCH_REQUIRED`.
  Errors use HTTP plus `label/message`. Region/product availability is
  `RESEARCH_REQUIRED`.

### 3.8 KuCoin

- **Product, API and access:** production Classic Spot/Futures and
  pre-production UTA/Pro are separate. Official UTA introduction explicitly
  says it is unreleased, unstable and must not be used for production/live
  trading; production UTA is therefore `UNSUPPORTED`. Sources: KUCOIN-01..17.
- **Instrument identity and constraints:** Classic Spot `BTC-USDT`,
  `baseCurrency`, `quoteCurrency`, base/quote increments/minimums,
  `priceIncrement`, `minFunds` are `VERIFIED`. Futures such as `XBTUSDTM`,
  base/quote/settle, `lotSize`, `tickSize`, `multiplier`, `isInverse` are
  `VERIFIED`; futures minimum quantity/notional are `UNVERIFIED`.
- **Prices and funding:** tickers and futures mark/index are `VERIFIED`.
  Classic current/predicted funding, granularity, funding time and history are
  `VERIFIED`; UTA equivalents are documentation evidence only and not
  production-ready.
- **Books and operations:** Classic partial and authenticated full snapshots
  are `VERIFIED`. Pro/UTA `obu depth=increment@10ms` top-500 snapshot/delta,
  `O/C` continuity and documented cadences are `VERIFIED`; checksum is
  `UNVERIFIED`, gap recovery `RESEARCH_REQUIRED`. Legacy `depth=increment`
  shutdown after 2026-07-15 is `RESEARCH_REQUIRED`: docs still list it and no
  final shutdown notice was found. REST weighted pools and time endpoints are
  `VERIFIED`; Pro docs contradict themselves at 300 versus 150 new
  connections/5 min/IP. Full sandbox is `UNVERIFIED`; order-test is not a
  sandbox.
- **Authentication and trading inventory:** key/secret/passphrase/version,
  HMAC-SHA256 signatures, private orders/positions, `clientOid`, limit/market,
  GTC/GTT/IOC/FOK/post-only are `VERIFIED` for applicable Classic products.
  Transport-timeout recovery is `RESEARCH_REQUIRED`. UTA has VIP, subaccount
  and capital restrictions; exact geographic/site availability is
  `RESEARCH_REQUIRED`.

### 3.9 Aster DEX / Aster Perpetuals

- **Product, API and access:** official repository recommends Futures/Spot API
  V3 and says new V1 API-key creation became unsupported on 2026-03-25. Public
  REST/WS, authenticated V3 and testnet documentation exist. Product taxonomy
  “Aster DEX” versus “Aster Perpetuals” remains `RESEARCH_REQUIRED`. Sources:
  ASTER-01..06.
- **Instrument identity and constraints:** V3 exchange metadata verifies
  symbol/pair, base, quote, margin asset, `PERPETUAL`, tick, quantity
  step/minimum and minimum notional. Multiplier and direct inverse/linear field
  are `UNVERIFIED`.
- **Prices and funding:** ticker, mark, index, last/current documented funding,
  history, interval configuration and next time are `VERIFIED`. Whether
  `lastFundingRate` represents a predicted rate is `RESEARCH_REQUIRED`.
- **Books and operations:** depth and diff streams with `U/u/pu`, 250/500/100
  ms, 24-hour connection, ping/pong and local replay algorithm are documented.
  However, the WS synchronization page is legacy and cites a V1 snapshot path
  while V3 is recommended; production host examples also conflict. Snapshot,
  reconnect and canonical host are therefore `RESEARCH_REQUIRED` for V3.
  Checksum is `UNVERIFIED`. Dynamic/example limits and V3 time are
  `VERIFIED`. V3 testnet is `VERIFIED`, parity `RESEARCH_REQUIRED`.
- **Authentication and trading inventory:** V3 wallet/signer/nonce signature,
  private order/account streams, client ID, limit/market/stop/take-profit/
  trailing-stop and GTC/IOC/FOK/GTX/HIDDEN are `VERIFIED`. Legacy HMAC docs
  conflict with V3 and must not be mixed. A documented 503 can mean unknown
  execution state. Geography is `UNVERIFIED`.

### 3.10 Variational

- **Product, API and access:** `VERIFIED` — Variational Omni public,
  unversioned read-only REST `/metadata/stats`; perpetual markets. Trading API
  is explicitly still in development and is `UNSUPPORTED`. Sources:
  VAR-01..05.
- **Instrument identity and constraints:** ticker/name and USDC-denominated
  prices/volume are `VERIFIED`. Exact quote/settlement distinction, token
  identity, multiplier, inverse/linear, tick, quantity step, minimum quantity
  and minimum notional are `UNVERIFIED`.
- **Prices and funding:** mark price, current funding and per-market
  `funding_interval_s` are `VERIFIED`. API index field, predicted rate, public
  history and next timestamp are `UNVERIFIED`. Product docs describe a
  variable 1–8 hour interval; the API field is authoritative.
- **Books and operations:** Omni officially has no order book, so snapshot,
  incremental channel, sequence and checksum are `UNSUPPORTED`. The endpoint
  provides indicative RFQ quote sizes and can cache them up to 600 seconds;
  this is not executable real-time spread data. REST limit 10 requests/10 s
  per IP and global 1000/min are `VERIFIED`. WebSocket, server time and sandbox
  are `UNVERIFIED`.
- **Authentication and trading inventory:** API auth/signature, private
  streams, client order ID, API order types/TIF and API unknown-order behavior
  are `UNSUPPORTED` while the trading API is unavailable. Product UI features
  are not API evidence. Restricted-person/country policy exists, but exact API
  geography is `RESEARCH_REQUIRED`.

### 3.11 Lighter

- **Product, API and access:** `VERIFIED` — Lighter API v1.0, mainnet REST/WS,
  public analytics and authenticated account/transaction APIs; Spot and
  Perpetual order books. Sources: LIGHTER-01..12.
- **Instrument identity and constraints:** market ID/type, symbol, base/quote
  asset IDs, status, min base/quote amounts and supported size/price/quote
  decimals are `VERIFIED`. Exact static tick/step, settlement asset,
  multiplier and inverse/linear fields are `UNVERIFIED` or
  `RESEARCH_REQUIRED`; do not derive without an approved rule.
- **Prices and funding:** public funding aggregator and funding history are
  `VERIFIED`, but the rate is a JSON number and includes several venues, so the
  `lighter` entry must be selected. Whether it is current/predicted is
  `RESEARCH_REQUIRED`. Hourly product funding is `VERIFIED`; next timestamp is
  `UNVERIFIED`. Current mark/index endpoint mapping is `RESEARCH_REQUIRED`.
- **Books and operations:** REST book endpoint and WS initial snapshot plus
  changes every 50 ms are `VERIFIED`. Continuity is
  `current.begin_nonce == previous.nonce`; `offset` may jump and changes after
  reconnect. Checksum is `UNVERIFIED`; reconnect requires a new snapshot.
  Weighted standard/premium REST and WS limits are `VERIFIED`; server time is
  `UNVERIFIED`. Official SDK shows testnet, but parity is
  `RESEARCH_REQUIRED`.
- **Authentication and trading inventory:** indexed signing keys, nonce,
  read-only tokens, private order/position/trade/funding streams, uint48 client
  order index, limit/market/stop-loss/take-profit/TWAP, IOC/GTT/post-only are
  `VERIFIED`; FOK is `UNSUPPORTED` in the documented enum. API key `code=200`
  means sequencer acceptance, not execution. Timeout recovery is
  `RESEARCH_REQUIRED`. General keys can authorize secure withdrawals, a
  financially critical future concern. Geography is `UNVERIFIED`.

### 3.12 Bitunix

- **Product, API and access:** Futures OpenAPI v1 public/authenticated REST/WS
  is `VERIFIED`. The separate Spot portal is skeletal; all Spot capabilities
  are `RESEARCH_REQUIRED` or `UNVERIFIED`. Sources: BITUNIX-01..15.
- **Instrument identity and constraints:** Futures concatenated symbol, base,
  quote, min/max trade volume and precisions are `VERIFIED`. Settlement,
  multiplier, inverse/linear, explicit tick/step and minimum notional are
  `UNVERIFIED`; precision may not be converted into step without evidence.
- **Prices and funding:** ticker, mark, index, current/history, interval and
  next time are `VERIFIED`; predicted funding is `UNVERIFIED`.
- **Books and operations:** REST snapshot and WS `depth_books`/book snapshots
  exist, but no sequence, checksum, cadence or gap/resync procedure is
  documented. Integrity and reconnect are `RESEARCH_REQUIRED`. General
  endpoint/message/subscription limits are `VERIFIED`; server time and
  testnet are `UNVERIFIED`.
- **Authentication and trading inventory:** documented double-SHA256 signing,
  private order/position streams, client ID, limit/market, IOC/FOK/GTC/
  post-only are `VERIFIED`. Detailed errors, unknown-order reconciliation and
  geography are `RESEARCH_REQUIRED`.

### 3.13 BloFin

- **Product, API and access:** BloFin OpenAPI v1 public/authenticated REST/WS is
  `VERIFIED` for SWAP/perpetual contracts. A clear Spot market/trade API family
  is `RESEARCH_REQUIRED`. Source: BLOFIN-01.
- **Instrument identity and constraints:** `instId` such as `BTC-USDT`, base,
  quote, settlement, contract value, min size, lot, tick, `SWAP`,
  linear/inverse and state are `VERIFIED`. Minimum notional is `UNVERIFIED`.
- **Prices and funding:** ticker, mark, index, current/history, dynamic
  interval/unit and settlement time are `VERIFIED`; predicted funding is
  `UNVERIFIED`.
- **Books and operations:** REST snapshot, WS 200-level snapshot/delta at 100
  ms, `prevSeqId/seqId` and merge/delete rules are `VERIFIED`; checksum is
  `UNVERIFIED`, gap recovery `RESEARCH_REQUIRED`. Heartbeat/reconnect and
  REST/WS/trading limits are documented. Server time is `UNVERIFIED`. Demo
  REST/WS is `VERIFIED`.
- **Authentication and trading inventory:** key/secret/passphrase,
  HMAC-SHA256 hex then Base64, private orders/positions, 32-character
  clientOrderId, limit/market/post-only/FOK/IOC and structured errors are
  `VERIFIED`. Some business errors use HTTP 200. Unknown-state policy and
  geography are `RESEARCH_REQUIRED`.

### 3.14 Bybit

- **Product, API and access:** `VERIFIED` — Bybit API V5 Unified Trading,
  public/authenticated REST and public/private/order-entry WS. Spot, linear,
  inverse and options must be separate categories. Sources: BYBIT-01..17.
- **Instrument identity and constraints:** symbol, category-specific format,
  base/quote/settlement, contract type, tick, quantity step and derivatives
  minimum quantity/notional are `VERIFIED`. Spot `minOrderQty` is deprecated;
  current minimum amount is authoritative. Derivative contract multiplier is
  `UNVERIFIED`.
- **Prices and funding:** derivative ticker, mark, index, current/history,
  per-instrument interval and next time are `VERIFIED`; predicted funding is
  `UNVERIFIED`.
- **Books and operations:** REST snapshot and WS snapshot/delta, `u`, cross
  sequence, restart `u=1`, replacement snapshots and category/depth cadences
  are `VERIFIED`. Checksum is `UNVERIFIED`. IP/UID/endpoint/WS limits, server
  time and testnet are `VERIFIED`.
- **Authentication and trading inventory:** HMAC-SHA256 or RSA-SHA256,
  private orders/positions/executions, `orderLinkId` (36, unique), limit,
  market, IOC/FOK/post-only and conditional/TP-SL are `VERIFIED`. Market
  becomes IOC limit; acknowledgement is asynchronous. Exhaustive timeout
  unknown-state behavior is `RESEARCH_REQUIRED`; reconcile before retry.
  Regional 403/entity hosts and account-category restrictions are documented
  and require owner validation.

### 3.15 Hyperliquid

- **Product, API and access:** `VERIFIED` — Hyperliquid HyperCore Info and
  Exchange APIs plus WebSocket, mainnet/testnet; fully on-chain Spot and linear
  Perpetual order books. Address-based account state is public query data, not
  conventional authenticated read-only. Sources: HL-01..11.
- **Instrument identity and constraints:** Perpetual `coin`/meta index and Spot
  token index/token ID/canonical flag are `VERIFIED`. Most Spot order symbols
  are `@index`; UI aliases cannot define identity. Perpetuals are one
  underlying unit, linear, USDC-margined and generally USDT-denominated; docs
  warn they are technically quanto because no USDC/USDT conversion is applied.
  `szDecimals`, significant-figure price rules and size precision are
  `VERIFIED`; static tick/minimum quantity/notional fields are
  `UNVERIFIED`.
- **Prices and funding:** `markPx`, `oraclePx`, current funding, history,
  hourly interval, predicted funding and predicted `nextFundingTime` are
  `VERIFIED`; predicted funding is only for the first perp DEX. `oraclePx`
  must remain exchange-native until an index-price mapping decision.
- **Books and operations:** REST Info `l2Book` and WS `l2Book` are `VERIFIED`.
  WS is a full snapshot feed pushed on each block at least 0.5 s after the
  prior push, not deltas; incremental channel, sequence and checksum are
  `UNSUPPORTED`. Reconnect uses a fresh snapshot; user time-series
  subscriptions can include `isSnapshot`. Weighted REST/address/WS limits and
  testnet are `VERIFIED`; a dedicated server-time endpoint is `UNVERIFIED`.
- **Authentication and trading inventory:** wallet/API-agent signature,
  nonce, private-by-address order/position/fill channels, optional 128-bit hex
  client ID, limit/market/trigger/TWAP and GTC/IOC/ALO post-only are
  `VERIFIED`; FOK is `UNSUPPORTED`. Error and order-status query are
  documented, but network-timeout recovery is `RESEARCH_REQUIRED`. Product,
  validator and regional restrictions require legal/account confirmation.

### 3.16 MEXC

- **Product, API and access:** MEXC Spot API v3 and relaunched Futures API v1
  are separate `VERIFIED` public/authenticated families. A legacy official
  Futures guide still says order API is under maintenance, while current
  changelog/announcement says it reopened on 2026-03-31; current docs govern,
  but production freshness is `RESEARCH_REQUIRED`. Sources:
  MEXCSPOT-01, MEXCFUT-01..26.
- **Instrument identity and constraints:** Spot concatenated symbol/base/quote
  is `VERIFIED`, but current filter/tick/step/minimum semantics are
  `RESEARCH_REQUIRED`; precision cannot be used as step. Futures underscore
  symbol, base/quote/settle, perpetual/delivery, contract size, tick
  `priceUnit`, contract step `volUnit`, min volume and `apiAllowed` are
  `VERIFIED`; explicit linear/inverse and minimum notional are `UNVERIFIED`.
- **Prices and funding:** Spot ticker is `VERIFIED`; mark/index/funding and
  contract concepts are `UNSUPPORTED`. Futures ticker/index/`fairPrice`,
  current/history, collect cycle and next settle are `VERIFIED`; predicted
  funding is `UNVERIFIED`. Mapping `fairPrice` to canonical mark is
  `RESEARCH_REQUIRED`.
- **Books and operations:** Spot REST/Protobuf WS versioned depth and continuity
  are documented, but current `ws://wbs-api.mexc.com/ws` versus retired secure
  host is `RESEARCH_REQUIRED`. Futures snapshot/version, 200 ms WS increments,
  next-version continuity and commits-based gap recovery are `VERIFIED`;
  checksum is `UNVERIFIED`. Endpoint weights and Futures server time are
  `VERIFIED`. Testnet/sandbox is `UNVERIFIED`.
- **Authentication and trading inventory:** Spot and Futures HMAC-SHA256,
  private orders/account/positions, client IDs and limit/market/IOC/FOK/
  post-only variants are `VERIFIED`; symbol metadata remains authoritative.
  Spot 5xx and Futures internal timeout can represent unknown state and require
  status query before retry. Futures requires KYC, excludes Innovation Zone
  and varies by region; exact geography is `RESEARCH_REQUIRED`.

## 4. Cross-venue verified facts

- No reviewed venue supports a safe universal symbol parser.
- No reviewed derivative group supports a safe universal funding interval.
- Only a subset exposes an explicit static tick; precision and significant
  figures are not interchangeable with tick size.
- Checksum is not a common invariant: it is unverified on most venues and
  officially removed/disabled on current OKX JSON and Bitget UTA V3.
- Unknown execution state is explicitly documented by Binance, Bitget and MEXC
  and indirectly present through asynchronous acceptance on several others.
- Demo/testnet availability does not establish production parity.

## 5. Explicitly unsupported capability summary

| Product group | Confirmed unsupported capability |
|---|---|
| Binance Spot | Derivative contract/settlement, mark/index, funding and derivative positions |
| OKX Exchange | JSON order-book checksum after 2026-06-23; Spot mark price as derivative concept |
| OKX DEX | CEX symbol/book/funding/positions/order lifecycle and CEX TIF/order types |
| Bitget UTA V3 | Order-book checksum after 2026-05-19 |
| KuCoin UTA | Production/live use under the current official UTA introduction |
| Variational Omni | Order book and currently available trading API |
| Lighter | FOK in the reviewed documented enum |
| Hyperliquid | Incremental delta book, sequence/checksum and FOK |
| MEXC Spot | Derivative mark/index/funding/contract semantics |

## 6. Research-required blockers

1. OKX DEX V5 versus V6 production endpoint family.
2. Aster V3 production host and V3-compatible book synchronization procedure.
3. KuCoin legacy depth actual shutdown state and conflicting Pro WS limit.
4. MEXC Spot secure WS endpoint and current Spot documentation ownership.
5. Binance Futures migrated mixed-product stream filtering and cadence.
6. Bitunix book integrity, server time, sandbox and unknown-state behavior.
7. Gate current canonical limit policy versus stale mirrors and decimal-size
   delivery.
8. Lighter funding-rate semantics/numeric representation and testnet parity.
9. Exact geography, account entity and data-use rights for every pilot.

## 7. Phase 0 recommendation

First implementation evidence should be collected for a deliberately narrow,
unauthenticated public-analytics slice:

1. **OKX Exchange V5** — derivatives public metadata, funding and sequence-based
   books; checksum intentionally excluded.
2. **Binance USDⓈ-M Futures** — public metadata/funding/books, explicitly
   filtered to USDⓈ-M and with no predicted-funding claim.
3. **Bybit V5 linear** — public metadata/funding/books, with category-specific
   schemas.

Bitget UTA V3 is the preferred reserve/fourth candidate. Binance Spot is a
valuable separate Spot capability group after the derivative pilot. This
recommendation is for analytics only; it does not approve authenticated calls,
paper trading or execution.
