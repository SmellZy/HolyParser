# ADR 0006: OKX V5 Public Adapter Boundary

- Status: Accepted for frozen Phase 2A.2
- Date: 2026-07-26

## Context

The approved first live public adapter is OKX Exchange V5 Swap/Futures. Current
official documentation has product-specific identity, funding and sequence
semantics that cannot be represented by parsing ticker text or applying one
generic reconnect rule.

Derivative `baseCcy` and `quoteCcy` are not applicable. `fundingRate` is a
forecast for the upcoming settlement. JSON-books checksum is deprecated and
fixed to zero. `seqId`/`prevSeqId` continuity is documented, including empty
same-ID heartbeats and a maintenance-reset exception, but an exact
server-prescribed gap recovery algorithm is not.

Evidence: `OKX-01`, `OKX-02`, `OKX-03`, re-retrieved 2026-07-27.

## Decision

1. Implement OKX in an isolated `@arbitrage/okx-public-adapter` workspace
   consuming, but not changing, frozen Phase 2A.1 contracts.
2. Require an injected reviewed asset resolver. Do not parse `instId`.
3. For linear derivatives, use `ctValCcy` as base and `settleCcy` as
   quote/settlement. For inverse derivatives, use `settleCcy` as
   base/settlement and `ctValCcy` as quote.
   Preserve `ctVal` as the documented face value of one contract and validate
   `ctMult` independently. The current mapping accepts the guide example's
   empty value and the point-in-time observed unit value. Any other value is
   quarantined for renewed official research; the fields are never silently
   multiplied.
4. Map `fundingRate` to `PREDICTED`; map `settFundingRate` to `CURRENT` only
   during processing and otherwise `LAST`. Derive interval from the two
   documented timestamps.
5. Implement only public JSON `books`; exclude VIP/SBE feeds.
6. Preserve JSON sequence tokens losslessly and validate the previous-ID chain.
7. Treat documented empty same-ID updates as heartbeats.
8. Treat maintenance reset, any gap, malformed input, overflow, stale data or
   disconnect as loss of executable trust.
9. Reconnect and resubscribe with bounded backoff. Restore executable output
   only from a new validated snapshot.
10. Do not calculate checksum.
11. Require an injected channel-specific freshness policy.
12. Keep live public canary tests opt-in, bounded and credential-free.

The replacement-snapshot rule is explicitly an application safety policy, not
a claim that OKX prescribes that exact JSON recovery procedure.

## Consequences

- USDT/USDC and expiry/X-Perp identities cannot collide by display symbol.
- Incomplete asset mappings fail closed instead of producing partial
  instruments.
- A maintenance reset causes temporary unavailability but cannot silently
  weaken the frozen monotonic book machine.
- Public data can be probed safely without adding credential or trading scope.
- Regional WS deployment and exact vendor gap guidance remain
  `RESEARCH_REQUIRED`.

## Rejected alternatives

- Parse `instId` into base/quote: violates canonical identity governance.
- Label `fundingRate` current: contradicts current official semantics.
- Hardcode eight hours: official intervals can change.
- Accept non-zero or calculate checksum: officially unsupported.
- Continue through a gap or maintenance reset: can expose corrupted depth.
- Implement VIP/SBE alongside JSON: unapproved scope and different protocol.
- Retry indefinitely: risks reconnect/rate-limit storms.
