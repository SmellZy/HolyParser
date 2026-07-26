# ADR 0004: Order-Book Integrity Strategies

- Status: Accepted for Phase 2A.1
- Date: 2026-07-26

## Context

Official venue protocols do not share a universal snapshot/delta, sequence, or
checksum model. Some link previous and current IDs, some bridge an update range,
some publish snapshots plus deltas, and some repeatedly replace a complete book.
Some explicitly do not provide checksum behavior. Treating all feeds alike would
either invent protocol behavior or leave gaps undetected.

## Decision

Implement four explicit strategies:

1. snapshot replacement;
2. snapshot plus incremental delta;
3. sequence-chained delta;
4. no trusted executable book.

Sequence validation is a separate policy:

- none;
- contiguous current ID;
- previous-ID chain;
- update range with previous ID.

The range policy distinguishes the first buffered event after a REST snapshot
from later stream continuity. The first event bridges when its range contains
the snapshot update ID. Only subsequent events validate the previous stream
event ID. This prevents treating Binance `pu` as a link to the REST snapshot.

IDs are parsed from unsigned decimal strings into `bigint`. Checksum is not part
of the generic event and is never synthesized. A future adapter may expose
checksum validation only when its capability is officially supported and its
algorithm is independently tested.

The state machine starts uninitialized except for no-trusted-book, which starts
disabled. Strategies that require initialization reject deltas before a valid
snapshot. Duplicate or older IDs are explicitly rejected without changing the
book. Any sequence-link failure enters `GAPPED` integrity with `STALE` quality.
Further deltas are rejected until a valid replacement snapshot recovers the
book.

Level replacement is exact by price. A delta quantity of zero deletes the level.
Snapshots reject zero quantities and duplicate prices. Bids sort descending and
asks ascending. A locked or crossed result enters invalid/stale state and cannot
produce best prices, midpoint, or VWAP.

## Fixture mapping

- `OKX-01`: synthetic `seqId`/`prevSeqId` previous-link chain.
- `BNFUT-04`: synthetic Binance first-event `U/u` snapshot bridge followed by
  `pu` stream chaining.
- `BYBIT-06`: synthetic snapshot/delta plus documented `u=1` replacement restart.
- `HL-03`: synthetic repeated full snapshot replacement only; no Hyperliquid
  adapter, sequence, or checksum is implied.

The fixtures retain documented protocol relationships while changing values and
reducing levels. Their manifests record retrieval date and transformations.

## Consequences

- A gap always removes executable output immediately.
- Recovery is explicit and replayable.
- Venues lacking sufficient integrity evidence can still expose non-book
  analytics through separate capabilities but cannot expose an executable book.
- Sequence-less replacement streams cannot claim duplicate detection without a
  stable official identifier; content hashing is not invented.
- Adapter-specific subscription buffering and reconnect rules remain Phase 2A.2+
  work and must be backed by official documentation.

## Rejected alternatives

- **Require checksum everywhere:** unsupported by several official protocols and
  explicitly removed from some JSON channels.
- **Accept deltas after a gap:** can silently corrupt depth and VWAP.
- **Retry/reconnect without state transition:** hides loss of trust.
- **Sort only at ingestion and trust later mutations:** risks crossed or
  incorrectly ordered executable output.
- **Use one exchange-specific state machine:** prevents capability-driven
  composition and deterministic cross-venue tests.
