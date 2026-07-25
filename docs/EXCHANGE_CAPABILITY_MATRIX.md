# Exchange Capability Matrix

## 1. Status of this matrix

This is a **research backlog**, not a verified capability claim. No official
exchange documentation was audited during this planning task. API behavior is
volatile, and `MASTER_SPEC.md` itself identifies scheduled deprecations and
product-specific exceptions.

Legend:

- `R` — required or candidate for the planned product scope;
- `S` — statement/constraint reported by `MASTER_SPEC.md`, still requiring
  confirmation in current official documentation;
- `?` — unknown; official research required;
- `N/A` — outside that venue/product family's intended role;
- `BLOCKED` — the master specification says the capability is not currently
  available or is unsuitable; official recheck required before status changes.

Only a later `VERIFIED` status with an official URL, API/version, access date,
product/environment scope, and tests may enable an adapter capability.

## 2. Planning matrix

| Venue/product | Intended analytics scope | Public instruments/prices | Order book | Mark/index | Funding current/history | Private account/order data | Trading | Test environment | Special status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| Binance CEX | Spot/perpetual comparisons | R/? | R/? | R/? | R/? | ? | Later/? | ? | Candidate pilot |
| Binance Alpha | Alpha market data, separate identity mapping | S/? | ? | ? | ? | ? | Later/? | ? | Internal `ALPHA_*` IDs reported; never strip suffix to map |
| OKX CEX | Spot/perpetual comparisons | R/? | R/? | R/? | R/? | ? | Later/? | ? | Candidate pilot; separate from OKX DEX |
| OKX DEX | On-chain quote/swap analytics | R/? | N/A or ? | N/A | N/A | wallet/tx ? | Later/? | chain-specific ? | Separate venue; gas/approval/MEV/confirmation model |
| Bybit | Spot/perpetual comparisons | R/? | R/? | R/? | R/? | ? | Later/? | ? | Candidate pilot |
| Bitget | Spot/perpetual comparisons | R/? | R/? | R/? | R/? | ? | Later/? | ? | Candidate fourth pilot |
| Bitunix | Spot/perpetual comparisons | R/? | R/? | R/? | R/? | ? | Later/? | ? | Alternative fourth pilot; research maturity/support |
| Gate.io | Spot/perpetual comparisons | R/? | R/? | R/? | R/? | ? | Later/? | ? | Additional venue after pilot |
| KuCoin | Spot/perpetual comparisons | R/? | R/? | R/? | R/? | ? | Later/? | ? | Old incremental book stream reported sunset 2026-07-15; verify replacement |
| Aster | Perpetual analytics/execution candidate | R/? | R/? | R/? | R/? | ? | Later/? | ? | HTTP 503 order outcome reported potentially unknown; reconciliation mandatory |
| Variational | Read-only funding/analytics | S/? | ? | ? | S/? | N/A or ? | BLOCKED/S | ? | Public quotes reported cacheable up to 600s; trading API reported unavailable |
| Lighter | Spot/perpetual or venue-specific analytics | R/? | R/? | ? | ? | ? | Later/? | ? | Account index, API-key index, nonce model reported |
| BloFin | Perpetual analytics candidate | R/? | R/? | R/? | R/? | ? | Later/? | ? | Additional venue after pilot |
| Hyperliquid | Spot/perpetual/on-chain venue analytics | R/? | R/? | ? | R/? | ? | Later/? | ? | Wallet/API-agent signing model reported; separate custody review |
| MEXC | Spot/perpetual comparisons | R/? | R/? | R/? | R/? | ? | Later/? | ? | Additional venue after pilot |

“Trading” in this table is not authorization to implement trading. Private
capabilities receive a separate audit no earlier than Phase 9.

## 3. Capability checklist per venue

The researcher must record each item separately by product and environment:

### Identity and metadata

- official product/API name and base URLs;
- spot, linear perpetual, inverse perpetual, dated future, premarket, DEX scope;
- instrument list and stable external identifier;
- base, quote, settlement, margin asset semantics;
- contract multiplier, inverse flag, tick, step, min/max size/notional;
- lifecycle/delisting status and change stream if any;
- token chain/address metadata;
- server time and timestamp units.

### Public data

- ticker field semantics;
- mark and index source/meaning;
- current, predicted, next, settled, and historical funding distinctions;
- funding interval and next settlement source per instrument;
- order-book snapshot depth and update channel;
- exact sequence, checksum, buffering, resnapshot, and reconnect algorithm;
- trade side semantics;
- open interest/volume availability and units;
- published update cadence and rate limits.

### Operational constraints

- REST weights and quotas;
- WebSocket connection/subscription/message limits;
- IP/account/product-specific limits;
- 429/418/403/5xx semantics and backoff guidance;
- maintenance/status endpoint or announcements;
- schema/version/deprecation policy;
- redistribution, retention, attribution, and commercial-use terms.

### Private and trading capabilities (deferred)

- credential types and permission inspection;
- IP allowlisting and withdrawal-permission detection;
- official testnet/sandbox parity;
- account/position mode and leverage APIs;
- balance, margin, orders, fills, and positions;
- private WebSocket semantics and recovery;
- supported order types, time in force, post-only/IOC/FOK;
- client order ID support, uniqueness, length, charset, and queryability;
- batch behavior and atomicity;
- timeout/5xx/unknown-status guidance;
- cancel/query/reconciliation sources and retention windows;
- nonce/signature/time-drift requirements.

### DEX/on-chain additions

- supported chains, canonical token identifiers, routers/contracts;
- quote expiry and slippage/price-impact semantics;
- approval and permit model;
- transaction construction, simulation, signing, submission, replacement;
- gas estimation and failed-transaction cost;
- confirmations, reorg handling, finality, and status;
- MEV protection and routing trust;
- bridge assumptions and smart-contract audit status.

## 4. Mandatory targeted research

### Binance Alpha

Confirm the official token-list/instrument discovery flow and the meaning of
internal IDs such as `ALPHA_173USDT`. Document asset identity, USDT/USDC
distinction, chain metadata, and symbol-change behavior. Generic Binance symbol
parsing must not be reused.

### Variational

Confirm whether public access remains read-only, quote caching/freshness behavior,
funding semantics, terms of use, and whether any official trading/test environment
has become available. Until verified otherwise, keep trading `BLOCKED` and treat
quotes according to their actual freshness, potentially unsuitable for live
spread decisions.

### OKX DEX

Research as a separate on-chain integration, not an OKX futures feature. No common
CEX order-book or order contract may be assumed.

### KuCoin

The specification says the old incremental order-book stream was scheduled to end
on 2026-07-15, which is before the current repository date. Verify the current
official replacement (the specification mentions “Increment Best 500” as a
candidate), its reconstruction algorithm, and migration/deprecation status before
writing an adapter.

### Aster

Verify official 503 and timeout semantics, client order identity, query/open
order/fill/position sources, and a safe reconciliation algorithm. Unknown outcome
must be a first-class state.

### Lighter

Verify account index, API-key index, nonce allocation/concurrency, signing,
recovery after restart, and official environment support before any private
integration.

### Hyperliquid

Verify spot/perpetual instrument identity, wallet versus API-agent authority,
nonce/signing model, key rotation/revocation, and the boundary between on-chain
and venue-managed state.

### Bitunix and BloFin

Assess official API completeness, documentation/versioning quality, sequence
semantics, rate limits, test environment, private recovery sources, terms, and
operational maturity before choosing either for the pilot or execution scope.

## 5. Pilot selection gate

The master specification proposes Binance, OKX, Bybit, and either Bitget or
Bitunix. The roadmap reduces the first implementation to three venues; selection
must consider:

- verified public API completeness and unambiguous sequence semantics;
- funding/mark/index metadata quality;
- official documentation stability and deprecation policy;
- legal/redistribution terms;
- geographic/product availability for the intended deployment;
- observed reliability under a read-only canary;
- fixture/testnet support relevant to later phases;
- team capacity to own the adapter.

No schedule should force selection before this evidence exists.

## 6. Research record template

For every capability:

```text
Venue/product/environment:
Capability:
Status: VERIFIED | UNSUPPORTED | UNKNOWN | DEPRECATED | BLOCKED
Official documentation URL:
API/document version:
Accessed at:
Exact product scope:
Semantics and units:
Rate/update limits:
Known error/recovery behavior:
Terms/redistribution constraints:
Fixture/canary evidence:
Owner:
Revalidate by:
Notes:
```

Screenshots, blogs, SDK behavior, aggregator documentation, and old code examples
may be supporting evidence but cannot replace current official documentation.
