# Exchange Capability Matrix

## 1. Status

Phase 0 official API discovery snapshot, retrieved **2026-07-26**.

This matrix is a product-selection summary. Detailed field-level evidence is in
[`PHASE_0_API_RESEARCH.md`](PHASE_0_API_RESEARCH.md); every reviewed official
source is in
[`PHASE_0_SOURCE_REGISTER.md`](PHASE_0_SOURCE_REGISTER.md).

Legend:

- `VERIFIED` — current official evidence explicitly supports the capability;
- `UNVERIFIED` — no reviewed official evidence confirms it;
- `UNSUPPORTED` — official evidence confirms it is absent/inapplicable;
- `RESEARCH_REQUIRED` — current official evidence is ambiguous,
  contradictory, stale, or incomplete.

“Trading support” means that an official API documents trading, not that this
project is authorized to use it. No trading is approved.

## 2. Product-level capability separation

| Capability group | Public analytics support | Authenticated read-only support | Trading support | Testnet / demo support | First production pilot suitability |
|---|---|---|---|---|---|
| Binance USDⓈ-M Futures | `VERIFIED` — metadata, ticker, mark/index, funding, books | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED` | **Recommended**, public derivatives analytics only |
| Binance Spot | `VERIFIED` — metadata, ticker, books | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED` | Recommended as a separate Spot tranche after the first derivatives slice |
| Binance Alpha | `VERIFIED` public market data | `UNVERIFIED` | `UNVERIFIED` | `UNVERIFIED` | Analytics-only; not first pilot |
| OKX Exchange V5 | `VERIFIED` across Spot/Swap/Futures/Options | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED` Demo | **Recommended first pilot**, public derivatives analytics only |
| OKX DEX / Onchain OS | `VERIFIED` quote/token/route analytics, developer authentication required | `VERIFIED` for project-authenticated quote data | Transaction construction `VERIFIED`; no CEX execution model; not approved | `UNVERIFIED` | Separate DEX analytics phase only |
| Bitget UTA V3 | `VERIFIED` across Spot and futures categories | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED` Demo | Preferred reserve/fourth public-analytics pilot |
| Gate API v4 | `VERIFIED` Spot/Futures analytics | `VERIFIED` | `VERIFIED` documented; not approved | Futures `VERIFIED`; Spot REST parity `RESEARCH_REQUIRED` | Secondary analytics candidate after decimal-size/limit validation |
| KuCoin Classic | `VERIFIED` with order-book transition caveats | `VERIFIED` | `VERIFIED` documented; not approved | Full sandbox `UNVERIFIED` | Analytics-only until depth-deprecation state is confirmed |
| KuCoin UTA / Pro | Documentation exists | Documentation exists | Production use `UNSUPPORTED` by current official introduction | `UNVERIFIED` | Excluded from production |
| Aster DEX / Perpetuals V3 | `VERIFIED` metadata/funding; book path `RESEARCH_REQUIRED` | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED`, parity `RESEARCH_REQUIRED` | Analytics research only until V3 host/book conflicts close |
| Variational Omni | `VERIFIED` read-only funding/mark/RFQ stats; up to 600 s cache | `UNSUPPORTED` as a private API in reviewed docs | `UNSUPPORTED`; official trading API still in development | `UNVERIFIED` | Analytics-only, not real-time executable spread data |
| Lighter v1 | `VERIFIED` Spot/Perp metadata, books and funding | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED` via official SDK; parity `RESEARCH_REQUIRED` | Analytics-only initially |
| Bitunix Futures v1 | `VERIFIED`, but book integrity `RESEARCH_REQUIRED` | `VERIFIED` | `VERIFIED` documented; not approved | `UNVERIFIED` | Funding/ticker analytics only; no first-pilot book |
| Bitunix Spot | `RESEARCH_REQUIRED` | `RESEARCH_REQUIRED` | `RESEARCH_REQUIRED` | `UNVERIFIED` | Excluded |
| BloFin OpenAPI v1 SWAP | `VERIFIED` | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED` Demo | Secondary public-analytics candidate |
| BloFin Spot | `RESEARCH_REQUIRED` | `RESEARCH_REQUIRED` | `RESEARCH_REQUIRED` | `UNVERIFIED` | Excluded |
| Bybit V5 linear | `VERIFIED` | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED` | **Recommended**, public derivatives analytics only |
| Bybit V5 Spot/inverse/options | `VERIFIED` but category-specific | `VERIFIED` | `VERIFIED` documented; not approved | `VERIFIED` | Later separate category groups |
| Hyperliquid HyperCore | `VERIFIED` Spot/Perp snapshot-book analytics | Public-by-address account queries `VERIFIED`; not conventional auth | `VERIFIED` signed actions; not approved | `VERIFIED` | Separate on-chain analytics phase |
| MEXC Futures v1 | `VERIFIED` current API; source freshness `RESEARCH_REQUIRED` | `VERIFIED` | `VERIFIED` after 2026 relaunch; not approved | `UNVERIFIED` | Later analytics candidate after schema/source probe |
| MEXC Spot v3 | `VERIFIED` REST; WS host `RESEARCH_REQUIRED` | `VERIFIED` | `VERIFIED` documented; not approved | `UNVERIFIED` | Analytics-only until secure WS host is confirmed |

## 3. Public analytics detail

| Capability group | Metadata / identity | Ticker / prices | Funding | Order book | Integrity status |
|---|---|---|---|---|---|
| Binance USDⓈ-M | `VERIFIED`; multiplier/linear flag gaps | `VERIFIED` mark/index | Current/history/next `VERIFIED`; interval/predicted gaps | Snapshot/delta `VERIFIED` | `U/u/pu`; no verified checksum; cadence/mixed-stream research |
| Binance Spot | `VERIFIED` | Ticker `VERIFIED`; derivative prices `UNSUPPORTED` | `UNSUPPORTED` | Snapshot/delta `VERIFIED` | `lastUpdateId/U/u`; resync verified |
| Binance Alpha | Token/chain identity `VERIFIED` | Ticker `VERIFIED`; mark/index unverified | `UNVERIFIED` | Snapshot/delta `VERIFIED` | Full resync `RESEARCH_REQUIRED` |
| OKX Exchange | `VERIFIED`, including settlement/contract values | Derivative mark/index `VERIFIED` | Current/predicted/history/next `VERIFIED`; fixed interval field absent | Multiple snapshot/delta tiers `VERIFIED` | `seqId/prevSeqId`; checksum `UNSUPPORTED` |
| OKX DEX | Chain + token address `VERIFIED` | Route quotes `VERIFIED` | `UNSUPPORTED` | `UNSUPPORTED` | Transaction/finality model, not book integrity |
| Bitget UTA | `VERIFIED`; settlement/multiplier/type gaps | Futures mark/index `VERIFIED` | Current/history/interval/next `VERIFIED`; predicted unverified | Snapshot/delta `VERIFIED` | `seq/pseq`; checksum `UNSUPPORTED`; gap action research |
| Gate | Spot/contract metadata `VERIFIED` with precision gaps | Mark/index `VERIFIED` | Current/next/history/interval `VERIFIED` | Snapshot/delta `VERIFIED` | `U/u`; checksum unverified; decimal-size opt-in |
| KuCoin Classic | Spot/Futures `VERIFIED` | Mark/index `VERIFIED` | Current/predicted/history/time `VERIFIED` | Classic snapshot; replacement feed documented | Legacy shutdown and new-feed gap recovery `RESEARCH_REQUIRED` |
| Aster V3 | `VERIFIED`; multiplier/type gaps | Mark/index `VERIFIED` | Current/history/interval/next `VERIFIED`; predicted ambiguous | V3/legacy path conflict | `U/u/pu` documented on legacy-family page |
| Variational | Partial identity | Mark `VERIFIED` | Current/interval `VERIFIED`; other fields unverified | `UNSUPPORTED` | RFQ stats may be cached 600 s |
| Lighter | IDs/precision/minimums `VERIFIED` | Current mark/index mapping research | Funding aggregator/history `VERIFIED`; semantics research | Snapshot/changes `VERIFIED` | `begin_nonce/nonce`; new snapshot after reconnect |
| Bitunix Futures | Partial metadata | Mark/index `VERIFIED` | Current/history/interval/next `VERIFIED` | Snapshot/channels exist | Sequence/checksum/resync/cadence `RESEARCH_REQUIRED` |
| BloFin SWAP | `VERIFIED` including multiplier/type | Mark/index `VERIFIED` | Current/history/interval/time `VERIFIED` | Snapshot/delta `VERIFIED` | `prevSeqId/seqId`; gap action research |
| Bybit linear | `VERIFIED`; multiplier absent | Mark/index `VERIFIED` | Current/history/interval/next `VERIFIED` | Snapshot/delta `VERIFIED` | `u/seq`; snapshot replacement; checksum unverified |
| Hyperliquid | Meta index/token ID `VERIFIED` | `markPx/oraclePx` `VERIFIED` | Current/predicted/history/hourly/next `VERIFIED` | Repeated snapshots `VERIFIED` | Incremental/sequence/checksum `UNSUPPORTED` |
| MEXC Futures | `VERIFIED`; linear flag/min notional gaps | Index/fair `VERIFIED`; mark mapping research | Current/history/cycle/next `VERIFIED` | Snapshot/delta/commits `VERIFIED` | Version continuity and commits recovery verified |
| MEXC Spot | Partial metadata; filters research | Ticker `VERIFIED` | `UNSUPPORTED` | REST/Protobuf delta `VERIFIED` | Continuity verified; secure WS host research |

## 4. Operational readiness gates

| Capability group | Rate limits / weights | Server time | Reconnect / resync | Primary unresolved blocker |
|---|---|---|---|---|
| Binance USDⓈ-M | `VERIFIED` dynamic/weighted | `VERIFIED` | `VERIFIED` | Mixed UM/CM stream filtering and cadence |
| Binance Spot | `VERIFIED` dynamic/weighted | `VERIFIED` | `VERIFIED` | Jurisdiction/data rights |
| Binance Alpha | `RESEARCH_REQUIRED` | `RESEARCH_REQUIRED` | `RESEARCH_REQUIRED` | Incomplete operational docs |
| OKX Exchange | `VERIFIED` endpoint/user/tier | `VERIFIED` | Continuity verified; exact gap action research | Regional/VIP/product access |
| OKX DEX | `VERIFIED` tiered | `UNVERIFIED` | Not a persistent book | V5/V6 contradiction and no sandbox |
| Bitget UTA | `VERIFIED` | `VERIFIED` via common V2 | Gap action research | Jurisdiction/account mode |
| Gate | Current canonical limits `VERIFIED`; stale mirror conflict | Endpoint verified; access conflict | Snapshot/replay verified | Decimal size and canonical limit policy |
| KuCoin | Weighted pools verified; Pro WS contradiction | `VERIFIED` | Legacy/new-feed behavior differs | Post-2026-07-15 stream status |
| Aster | Dynamic/example limits verified | `VERIFIED` V3 | V1/V3 conflict | Production V3 host/book procedure |
| Variational | `VERIFIED` | `UNVERIFIED` | REST only | 600-second cache / no book |
| Lighter | `VERIFIED` tiered/weighted | `UNVERIFIED` | `VERIFIED` new snapshot | Funding numeric/semantic model |
| Bitunix Futures | Partial limits verified | `UNVERIFIED` | `RESEARCH_REQUIRED` | No integrity contract |
| BloFin SWAP | `VERIFIED` | `UNVERIFIED` | Heartbeat verified; gap action research | Unknown-state/geography |
| Bybit | `VERIFIED` tier/category | `VERIFIED` | `VERIFIED` | Category/account/region |
| Hyperliquid | `VERIFIED` IP/address/WS | `UNVERIFIED` | Fresh snapshot | On-chain/quanto identity model |
| MEXC Futures | `VERIFIED` endpoint-specific | `VERIFIED` | `VERIFIED` | Recent relaunch/source stability |
| MEXC Spot | Documented | `VERIFIED` | Continuity documented | Secure WS endpoint inconsistency |

## 5. First pilot recommendation

The recommended Phase 2A implementation tranche is:

1. OKX Exchange V5 — public Swap/Futures analytics;
2. Binance USDⓈ-M Futures — public derivatives analytics only;
3. Bybit V5 `linear` — public derivatives analytics only.

Bitget UTA V3 is the reserve/fourth venue. The first pilot excludes Spot,
authenticated endpoints and every trading feature to keep the canonical model
and order-book integrity work independently testable.

## 6. Analytics-only / deferred groups

- Binance Alpha: public analytics only.
- OKX DEX: separate token-address-aware quote analytics only.
- KuCoin Classic: analytics only until stream deprecation is resolved; UTA
  excluded from production.
- Aster: analytics research only until V3 contradictions close.
- Variational: cached funding/mark/RFQ analytics only.
- Lighter: analytics only until numeric funding and on-chain operations are
  modeled.
- Bitunix Futures: ticker/funding only; exclude its book from trusted spreads.
- Hyperliquid: separate on-chain snapshot-book analytics only.
- MEXC Spot/Futures: analytics only after targeted current-schema probes.
- BloFin and Gate: later public-analytics candidates, not first tranche.

## 7. Approval boundary

This matrix supports approval of a **mock-first, unauthenticated public
analytics Phase 2A** after the product-owner decisions in
[`PHASE_0_DECISIONS.md`](PHASE_0_DECISIONS.md) are accepted.

It does not approve:

- authenticated read-only calls;
- credential storage;
- paper trading;
- private streams;
- order entry;
- Risk Engine or Execution Engine;
- live trading.
