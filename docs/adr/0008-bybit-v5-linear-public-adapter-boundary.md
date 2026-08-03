# ADR 0008: Bybit V5 linear public adapter boundary

- Status: Proposed for Phase 2A.4 independent acceptance
- Date: 2026-08-02

## Context

The approved third pilot adapter is Bybit V5 `category=linear`, which contains
USDT perpetuals, USDT Futures and USDC contracts. It is a different capability
group from Bybit inverse, Spot and options. Current official evidence provides
opaque instrument and asset fields, explicit trading constraints, ticker and
funding fields, REST order-book snapshots, and a public linear WebSocket with
snapshot/delta updates.

The order-book documentation defines replacement snapshots, zero-quantity
deletion, update ID `u`, cross-sequence `seq`, and `u=1` service-restart
replacement. It does not publish a previous-update ID or state that successive
`u` or `seq` values differ by exactly one. REST describes `u` as “in sequence,”
while WS defines only relative ordering. Treating numeric jumps as loss would
therefore invent behavior.

Evidence: `BYBIT-01`..`BYBIT-11`, `BYBIT-16`, and `BYBIT-18`, re-retrieved for
independent acceptance on 2026-08-03.

## Decision

1. Implement an isolated `@arbitrage/bybit-linear-public-adapter`; do not
   modify the frozen canonical, OKX or Binance packages.
2. Enforce `category=linear`, the fixed Global REST origin, and the exact
   public linear WSS path. Reject inverse, Spot, option and unknown products.
3. Treat `symbol` as an opaque official ID. Resolve `baseCoin`, `quoteCoin` and
   `settleCoin` through an injected reviewed asset resolver. Settlement remains
   part of canonical identity, so USDT and USDC cannot collide.
4. Map only `LinearPerpetual` and `LinearFutures`; quarantine unknown contract
   types and statuses. Do not infer a multiplier.
5. Map `tickSize`, `qtyStep`, `minOrderQty`, and `minNotionalValue` only from
   their official fields. `priceScale` is retained as vendor metadata and is
   not a tick size.
6. Keep last, bid, ask, mark and index as separate observations. A locked or
   crossed top of book is stale and non-executable.
7. Preserve ticker `fundingRate` as venue-native `CURRENT`, history as `LAST`,
   and interval only from `fundingInterval` or `fundingIntervalHour`. Predicted
   funding remains `UNVERIFIED`; delivery-Futures funding is `UNSUPPORTED`.
8. Accept a fresh valid initial snapshot; apply fresh absolute deltas; reject duplicate or
   older `(u, seq)` pairs without refreshing freshness. Configured staleness or
   future skew, a contradictory pair,
   message/queue loss, disconnect, invalid book, malformed input or overflow
   revokes executable trust.
9. Treat a valid `type=snapshot, u=1` message as documented restart replacement.
   Ordinary deltas cannot recover a gapped/stale book; a validated replacement
   snapshot is required.
10. Do not interpret numeric jumps as gaps and do not claim complete sequence
    validation. That capability remains `RESEARCH_REQUIRED` until Bybit
    publishes a previous-ID or contiguous-increment contract.
11. Do not calculate or trust a checksum.
12. Use bounded requests/messages/queues/reconnect, no automatic REST retry,
    a conservative process-local public budget and a default-off bounded
    credential-free canary.

## Consequences

- The adapter can supply public linear analytics and fail-closed executable
  depth without claiming an integrity signal Bybit does not document.
- Silent packet loss that does not surface as a transport/queue failure cannot
  be proven from `u/seq` alone. Deployment must retain bounded reconnect and
  replacement behavior, and Phase 2B must respect the capability state.
- Global host access does not prove legal or regional availability.
- A future official sequence contract, new product enum or endpoint-limit
  change requires a new evidence review and acceptance change.

## Rejected alternatives

- Parse `BTCUSDT` or `BTCPERP`: violates canonical identity governance.
- Require `u == previous u + 1` or the same rule for `seq`: undocumented.
- Use REST `u` to bootstrap a lower-depth WS stream as a continuous chain:
  REST documents correspondence specifically to 1000-level data, while the
  implemented WS depth is separately initialized by its own snapshot.
- Treat a delta with `u=1` as recovery: official restart behavior is snapshot
  replacement.
- Hardcode eight-hour funding or call funding predicted: contradicted by the
  explicit per-instrument interval and missing prediction semantics.
- Add regional/private/trading hosts: outside Phase 2A.4.
