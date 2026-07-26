# Phase 0 Product Decisions

## 1. Status

Phase 0 recommendation set, dated **2026-07-26**.

These are proposed product decisions for owner approval. They do not supersede
the formal register in [`DECISIONS_REQUIRED.md`](DECISIONS_REQUIRED.md) until
the owner records acceptance.

## 2. Decisions recommended for approval

### P0-001 — Phase 2A scope

- **Recommendation:** Phase 2A is a mock-first, unauthenticated public
  analytics slice only.
- **Included:** canonical instrument identity, exact-decimal wire contracts,
  exchange-port interfaces, fixtures, order-book state-machine tests,
  freshness/quality states and public adapter work only for explicitly approved
  pilot groups.
- **Excluded:** credentials, authenticated endpoints, private streams, paper
  trading, trading, AI, billing, Risk Engine and Execution Engine.
- **Reason:** public market-data correctness is independently testable and does
  not require financial authority.
- **Owner action:** approve / reject.

### P0-002 — Initial pilot groups

- **Recommendation:** first tranche:
  1. OKX Exchange V5 Swap/Futures public analytics;
  2. Binance USDⓈ-M Futures public analytics;
  3. Bybit V5 `linear` public analytics.
- **Reserve:** Bitget UTA V3.
- **Explicit exclusions:** Binance COIN-M, Bybit inverse/options, all Spot
  groups, DEX/RFQ groups and every authenticated API.
- **Reason:** the three candidates have strong current official evidence for
  metadata, funding, public books and sequence/replacement semantics while
  providing independent schemas.
- **Owner action:** approve the three product groups, not merely company names.

### P0-003 — Product-family isolation

- **Recommendation:** one capability group per materially different API,
  execution or custody model.
- **Required separations:** Binance Spot/Futures/Alpha; OKX Exchange/DEX;
  KuCoin Classic/UTA; MEXC Spot/Futures; Bybit category groups; Bitunix
  Spot/Futures; BloFin SWAP/Spot.
- **Owner action:** approve.

### P0-004 — Canonical asset and instrument identity

- **Recommendation:** CEX identity is
  `(venue, product_group, official_instrument_id, market_type, settlement_asset)`.
  DEX identity is chain namespace/ID plus official token/asset ID or contract
  address for each side.
- **Prohibitions:** no ticker-only DEX identity; no concatenated-symbol parsing
  as authoritative identity; no USDT/USDC merge.
- **Manual mappings:** require provenance, reviewer, effective time and
  quarantine on conflict.
- **Owner action:** approve governance owner and four-eyes workflow.

### P0-005 — Funding representation

- **Recommendation:** store the venue-native rate, documented semantic label,
  interval/duration, observed time, next settlement time and source
  independently. Derived comparison rates must be separately named/versioned.
- **Rules:** never hardcode intervals; never label “last/current” as predicted;
  null/unknown remains unknown.
- **Owner action:** approve display convention and normalized comparison
  horizon.

### P0-006 — Order-book integrity policy

- **Recommendation:** support integrity strategies as capabilities:
  sequence-chain, snapshot-replacement, snapshot-plus-delta and no-trusted-book.
  Checksum is optional, not universal.
- **Rules:** a gap or undocumented recovery makes the book `STALE`; a venue
  without sufficient integrity evidence cannot contribute executable spread.
- **Specific consequences:** OKX and Bitget operate without checksum;
  Hyperliquid is snapshot replacement; Variational has no book; Bitunix book is
  excluded until evidence improves.
- **Owner action:** approve.

### P0-007 — DEX/RFQ separation

- **Recommendation:** exclude OKX DEX, Variational, Aster, Lighter and
  Hyperliquid from the first generic CEX adapter tranche. Research them through
  separate quote-, snapshot-book- or transaction-aware capabilities.
- **Reason:** route quotes, RFQs and on-chain snapshot books do not share CEX
  sequence, custody, settlement or order lifecycle.
- **Owner action:** approve DEX analytics as a later dedicated phase.

### P0-008 — Documentation conflict policy

- **Recommendation:** the current canonical official source wins for
  non-financial exploration, but a documented contradiction blocks financially
  critical use until written vendor evidence or a repeatable sandbox/public
  probe resolves it.
- **Examples:** OKX DEX V5/V6, Aster V1/V3, KuCoin legacy depth, Gate rate
  mirrors, MEXC legacy/current Futures, MEXC Spot WS host.
- **Owner action:** approve and name the research owner.

### P0-009 — Testnet meaning

- **Recommendation:** “order-test” does not count as sandbox; SDK configuration
  does not prove parity; a demo/testnet record must include host, product
  coverage, authentication model and known differences.
- **Owner action:** approve.

### P0-010 — Trading capability inventory

- **Recommendation:** retain trading facts only as future planning evidence.
  They create no authority to implement authentication, signing, private calls
  or order entry.
- **Owner action:** approve.

## 3. Decisions requiring product-owner input

| Decision | Required input | Recommended answer | Blocking |
|---|---|---|---|
| D-013 MVP user and success metric | Intended first user and measurable outcome | Internal/professional analyst; correct/stale-aware cross-venue analytics before monetization | Yes, for product acceptance |
| D-014 pilot exchanges | Exact product groups and order | OKX Exchange V5 Swap/Futures; Binance USDⓈ-M; Bybit V5 linear; Bitget reserve | Yes, for Phase 2A real adapter work |
| D-015 rights/geography | User/operator jurisdictions, account entities, data retention/redistribution | Legal/terms review before production data redistribution or authenticated testing | Yes, before production pilot |
| D-016 identity governance | Mapping owner, reviewer and conflict SLA | Four-eyes mapping; DEX chain/token identity; quarantine conflict | Yes, for canonical model |
| D-017 funding semantics | Native display, comparison horizon and null policy | Store native first; normalized 8-hour equivalent only as an explicitly derived value | Yes, for analytics UI |
| D-019 reporting asset | Whether any reporting conversion is allowed | Keep USDT and USDC separate; conversion unavailable until a priced policy exists | Yes |
| P0-006 integrity | Whether sequence-only venues are acceptable without checksum | Yes when official sequence/replacement semantics and fixtures exist; otherwise stale | Yes |
| P0-007 DEX timing | Whether DEX/RFQ groups enter Phase 2A | No; create a later dedicated analytics phase | Yes |
| MEXC price mapping | Whether `fairPrice` maps to canonical mark price | Keep exchange-native until semantics are formally approved | No for first tranche |
| Auth boundary | Whether Phase 2A may use read-only keys | No; public-only | Yes |

## 4. Analytics-only classifications

| Group | Classification until a later decision |
|---|---|
| Binance Alpha | Public analytics only |
| OKX DEX | Token-address-aware quote analytics only |
| KuCoin Classic | Public analytics only; UTA excluded from production |
| Aster | Research/analytics only pending V3 resolution |
| Variational | Cached funding/mark/RFQ analytics only |
| Lighter | Public analytics only pending numeric/on-chain decisions |
| Bitunix Futures | Ticker/funding analytics; book excluded |
| Bitunix Spot | Excluded |
| BloFin SWAP | Later public analytics; not first tranche |
| BloFin Spot | Excluded |
| Gate | Later public analytics after decimal-size/limit validation |
| Hyperliquid | Separate on-chain snapshot-book analytics |
| MEXC Spot/Futures | Public analytics after current-schema probes |

## 5. Phase 2A approval determination

**Conditional yes.** Phase 2A can be approved only after the owner accepts
P0-001 through P0-008 and D-014/D-016/D-017/D-019, and only with the public,
mock-first scope stated here.

Approval does not require every venue ambiguity to be resolved because excluded
or analytics-only groups can remain `RESEARCH_REQUIRED`. It does require:

1. the first tranche to be named by product group;
2. no authenticated endpoints;
3. every unsupported adapter method to be represented as an explicit
   capability, never a fake implementation;
4. exact-decimal contracts and no hardcoded intervals/mappings;
5. fixture-based sequence/gap/staleness tests before any live public feed is
   accepted.

## 6. Exact recommended prompt for Phase 2A

```text
Read AGENTS.md and these documents completely before changing anything:

docs/MASTER_SPEC.md
docs/ARCHITECTURE.md
docs/ROADMAP.md
docs/DOMAIN_MODEL.md
docs/API_CONTRACTS_PLAN.md
docs/SECURITY_MODEL.md
docs/EXCHANGE_CAPABILITY_MATRIX.md
docs/PHASE_0_API_RESEARCH.md
docs/PHASE_0_SOURCE_REGISTER.md
docs/PHASE_0_DECISIONS.md
docs/PHASE_1.md
docs/PHASE_1_ACCEPTANCE.md
docs/DECISIONS_REQUIRED.md
docs/RISK_REGISTER.md
docs/ACCEPTANCE_CRITERIA.md

Phase 1 is frozen and approved. Phase 0 decisions P0-001 through P0-008 are
approved. Implement Phase 2A only: the mock-first, unauthenticated public
analytics harness and canonical market-data contracts.

Before modifying files:
1. inspect the complete repository;
2. provide a concise implementation plan;
3. list expected files to create or modify;
4. identify blocking issues;
5. do not proceed if the approved pilot product groups are ambiguous.

Phase 2A scope:
- canonical venue, product-group, asset and instrument identifiers;
- exact-decimal wire/domain contracts for instrument metadata, ticker,
  mark/index price, native funding observations and order-book
  snapshots/deltas;
- explicit freshness, quality, sequence and capability states;
- common public-market-data adapter ports with unsupported capabilities
  represented explicitly;
- mocked adapters and official-document-derived recorded fixtures;
- deterministic local order-book state machines and tests for snapshot,
  delta, gap, restart, stale and recovery behavior;
- observability contracts and documentation;
- public, unauthenticated adapters only for these product groups, in this
  order: OKX Exchange V5 Swap/Futures, Binance USDⓈ-M Futures, Bybit V5
  linear;
- Bitget UTA V3 remains a reserve and must not be implemented without separate
  approval.

Hard requirements:
- do not use float or double for prices, quantities, rates or financial
  calculations;
- keep USDT and USDC distinct;
- do not parse symbols as canonical identity;
- do not hardcode funding intervals, symbol mappings, tick sizes or rate
  limits;
- use only the official sources recorded in
  docs/PHASE_0_SOURCE_REGISTER.md and re-check their current changelogs before
  coding an adapter;
- mark missing official evidence UNVERIFIED and contradictory evidence
  RESEARCH_REQUIRED;
- mark stale/degraded/gapped data explicitly;
- do not invent endpoints, fields, checksums or resynchronization behavior.

Do not implement:
- credentials or API-key storage;
- authenticated/private API calls or streams;
- order placement, paper trading or live trading;
- Risk Engine or Execution Engine;
- AI, billing or DEX transaction construction;
- Binance Spot, Binance Alpha, Binance COIN-M, OKX DEX, Bybit inverse/options,
  KuCoin, Gate, Aster, Variational, Lighter, Bitunix, BloFin, Hyperliquid or
  MEXC adapters.

Implement the smallest independently testable slices. Run formatting, linting,
type checking and all tests. Document fixtures, source dates, local startup,
changed files, unresolved issues and the acceptance result. Do not create a
commit and do not begin Phase 2B.
```
