# Position Management Architecture

## 1. Status and scope

This document defines approved future position-management capabilities. It is an
architecture contract, not implementation authority. Phase 1 and Phase 2A.1
remain frozen. No position storage, exchange synchronization, paper execution,
Risk Engine, Execution Engine, credential handling, or live action is introduced
by this amendment.

The position workspace is delivered progressively:

- Phase 4: manually entered and watch-only positions with public-data valuation;
- Phase 5: paper positions and simulated actions;
- Phase 6: authenticated read-only exchange synchronization;
- Phase 7: manual and semi-automatic system execution;
- Phase 8: separately approved automatic farming.

## 2. Aggregate boundaries

### 2.1 SpreadPosition

`SpreadPosition` is the aggregate root for one economic spread thesis. It owns:

- `positionId`;
- `userId` or an explicit system owner;
- position origin and authority mode;
- two or more `PositionLeg` values;
- lifecycle state and immutable state-transition history;
- entry and exit targets;
- current valuation reference;
- reconciliation state;
- manual notes;
- alert subscriptions;
- creation, update, and terminal timestamps;
- optimistic concurrency version.

A position may begin as a watch-only opportunity and later create a distinct
paper or execution position. Changing authority mode must not silently mutate a
watch object into a financially authoritative position. The conversion creates
an audited relation between the old and new aggregates.

### 2.2 PositionLeg

Every leg contains:

- canonical `InstrumentId`, including venue, product group, official instrument
  ID, market type, and settlement asset;
- long or short direction;
- exact entry price and quantity, when applicable;
- current executable price and valuated quantity;
- leg role and stable leg ID;
- fee, funding, and slippage components with currency, provenance, and quality;
- exchange position/order references only in later authorized phases;
- per-leg data quality and reconciliation status.

Display symbols are presentation data. A leg is never identified by concatenated
symbol text. USDT and USDC legs remain distinct and are not aggregated without a
separately approved, provenance-bearing conversion view.

Two-leg positions are the first supported shape. The aggregate is extensible to
multi-leg positions, but maximum leg count, strategy eligibility, valuation
policy, and execution coordination require product-owner approval.

### 2.3 PositionValuation

Valuation is a versioned observation, not an overwrite of entry facts. It
contains:

- executable bid/ask valuation for the configured quantity of every leg;
- valuation time and input market-data revisions;
- entry spread and current spread;
- spread PnL;
- funding PnL;
- trading fees;
- estimated and realized slippage;
- net PnL;
- residual delta;
- liquidation buffer when supported and verified;
- reporting assets and any explicit conversion assumptions;
- formula version, provenance, freshness, and quality.

Every financial value uses the exact-decimal rules from Phase 2A.1. Unknown fee,
funding, liquidation, conversion, or slippage inputs remain unknown. A required
unknown component makes the affected aggregate result unavailable rather than
zero.

“Current” means executable at the configured size, not a midpoint-only estimate.
If a trusted executable book is unavailable, executable valuation is unavailable
and the position becomes degraded according to policy. A separately labeled
indicative valuation may exist, but it cannot be represented as executable.

### 2.4 Targets, notes, and subscriptions

`PositionTarget` represents versioned entry or exit conditions. It records the
metric, direction, threshold, minimum duration, expiry, size, required quality,
and author. It is not an order.

`PositionNote` is user-authored text with author and timestamp. It is untrusted
content, must be escaped at presentation boundaries, and must never enter metric
labels or execution instructions.

`PositionAlertSubscription` links a position to an `AlertRule`. It does not
duplicate alert policy inside the position aggregate.

## 3. Position origins and authority modes

Origin records how the aggregate was created:

- `MANUAL_ENTRY`;
- `WATCH_ONLY`;
- `PAPER_SIMULATION`;
- `EXCHANGE_SYNCHRONIZATION`;
- `SYSTEM_EXECUTION`.

Authority records what the platform may do:

- `TRACKING_ONLY`: value and notify; no action;
- `PAPER_ONLY`: mutate simulated state only;
- `SYNCHRONIZED_READ_ONLY`: reconcile authenticated observations; no orders;
- `MANUAL_LIVE`: user confirms every material live action;
- `SEMI_AUTOMATIC`: a future short-lived, parameter-bound delegation;
- `AUTOMATIC`: a future separately approved persistent policy within immutable
  system limits.

Origin and authority are independent, immutable audit facts. Authority may only
be elevated through a separately approved security flow that creates a new
version and audit event. A Telegram interaction cannot elevate authority.

## 4. Lifecycle

The canonical states are:

```text
DRAFT
WATCHING
ENTRY_PROPOSED
ENTERING
PARTIALLY_HEDGED
HEDGED
HOLDING
EXIT_PROPOSED
EXITING
CLOSED
DEGRADED
EMERGENCY_HEDGE
RECONCILIATION_REQUIRED
FAILED
```

### 4.1 State meaning

| State                     | Meaning                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `DRAFT`                   | Incomplete position definition; no active monitoring or authority       |
| `WATCHING`                | Valid watch or target definition monitored with public data             |
| `ENTRY_PROPOSED`          | A versioned entry proposal or preview exists; no execution implied      |
| `ENTERING`                | One or more authorized entry actions are in progress                    |
| `PARTIALLY_HEDGED`        | Entry or exit leaves material unmatched exposure                        |
| `HEDGED`                  | Required legs satisfy the approved hedge tolerance                      |
| `HOLDING`                 | Open economic position is being valued and monitored                    |
| `EXIT_PROPOSED`           | A versioned exit proposal or preview exists                             |
| `EXITING`                 | One or more authorized exit actions are in progress                     |
| `CLOSED`                  | Position is terminal and no economic leg is expected to remain          |
| `DEGRADED`                | Valuation or operational evidence is insufficient; authority is reduced |
| `EMERGENCY_HEDGE`         | Approved emergency handling is active for residual exposure             |
| `RECONCILIATION_REQUIRED` | Local and authoritative external/simulated state disagree               |
| `FAILED`                  | Workflow cannot continue without explicit repair or a new position      |

`HEDGED` is an observed tolerance state; it is not a guarantee of zero risk.
`CLOSED` requires reconciliation in modes with authoritative external state.

### 4.2 Valid states by mode

`—` means the state is invalid, not merely hidden.

| State                     | Watch-only | Manual tracking |       Paper | Synced read-only | System execution |
| ------------------------- | ---------: | --------------: | ----------: | ---------------: | ---------------: |
| `DRAFT`                   |          ✓ |               ✓ |           ✓ |                — |                ✓ |
| `WATCHING`                |          ✓ |               ✓ |           ✓ |                — |                ✓ |
| `ENTRY_PROPOSED`          |          ✓ |               ✓ |           ✓ |                — |                ✓ |
| `ENTERING`                |          — |               — |           ✓ |       ✓ observed |                ✓ |
| `PARTIALLY_HEDGED`        |          — |               — |           ✓ |       ✓ observed |                ✓ |
| `HEDGED`                  |          — |      ✓ recorded |           ✓ |       ✓ observed |                ✓ |
| `HOLDING`                 |          — |               ✓ |           ✓ |                ✓ |                ✓ |
| `EXIT_PROPOSED`           |          — |               ✓ |           ✓ |                — |                ✓ |
| `EXITING`                 |          — |               — |           ✓ |       ✓ observed |                ✓ |
| `CLOSED`                  |          ✓ |               ✓ |           ✓ |                ✓ |                ✓ |
| `DEGRADED`                |          ✓ |               ✓ |           ✓ |                ✓ |                ✓ |
| `EMERGENCY_HEDGE`         |          — |               — | ✓ simulated |                — |                ✓ |
| `RECONCILIATION_REQUIRED` |          — |               — |           ✓ |                ✓ |                ✓ |
| `FAILED`                  |          ✓ |               ✓ |           ✓ |                ✓ |                ✓ |

“Observed” means imported from authenticated exchange evidence and does not grant
the platform execution authority. A manual position may record that a hedge
exists, but it cannot claim exchange reconciliation.

### 4.3 Principal transitions

```text
DRAFT -> WATCHING | ENTRY_PROPOSED | HOLDING
WATCHING -> ENTRY_PROPOSED | CLOSED | DEGRADED
ENTRY_PROPOSED -> ENTERING | WATCHING | FAILED
ENTERING -> PARTIALLY_HEDGED | HEDGED | RECONCILIATION_REQUIRED | FAILED
PARTIALLY_HEDGED -> HEDGED | EMERGENCY_HEDGE | RECONCILIATION_REQUIRED | FAILED
HEDGED -> HOLDING | DEGRADED
HOLDING -> EXIT_PROPOSED | DEGRADED | RECONCILIATION_REQUIRED
EXIT_PROPOSED -> EXITING | HOLDING | FAILED
EXITING -> PARTIALLY_HEDGED | CLOSED | EMERGENCY_HEDGE |
           RECONCILIATION_REQUIRED | FAILED
EMERGENCY_HEDGE -> HEDGED | CLOSED | RECONCILIATION_REQUIRED | FAILED
RECONCILIATION_REQUIRED -> a verified compatible state | CLOSED | FAILED
DEGRADED -> the recorded prior safe state | RECONCILIATION_REQUIRED | FAILED
```

Transitions are mode-gated and append-only. `DEGRADED` stores the prior state and
reason; recovery must revalidate data and authority. `FAILED` is terminal for the
workflow instance, although a separately audited repair may create a successor.

## 5. Reconciliation

Reconciliation state is separate from lifecycle:

- `NOT_APPLICABLE`;
- `PENDING`;
- `IN_SYNC`;
- `MISMATCH`;
- `UNKNOWN`;
- `BLOCKED`.

Reconciliation compares independently sourced orders, fills, positions, and
balances only in phases that are authorized to obtain them. A mismatch never
silently edits quantities or closes a position. It creates evidence, suppresses
unsafe actions, and moves the lifecycle to `RECONCILIATION_REQUIRED` when
material.

Manual notes are not reconciliation evidence. Telegram delivery state is not
reconciliation evidence.

## 6. Data quality and actionability

Every position and valuation exposes the worst material quality of its required
inputs. Phase 2A.1 quality semantics remain authoritative. In particular:

- stale or gapped executable books suppress executable valuation;
- unknown funding remains unknown;
- unsupported liquidation data does not become an infinite buffer;
- a degraded notification provider does not degrade position truth;
- read-only synchronization failure cannot create an assumed zero position;
- material data changes expire entry and exit previews.

Residual delta and liquidation buffer thresholds are versioned policy inputs.
They are not hardcoded globally.

## 7. Audit requirements

Audit events are required for:

- creation, conversion, and ownership changes;
- every lifecycle and reconciliation transition;
- leg, target, quantity, entry-price, and manual-mapping changes;
- authority elevation, reduction, expiry, and revocation;
- preview creation, expiry, confirmation, rejection, and execution result;
- imported external-state conflicts and operator resolutions;
- alert subscription changes;
- Telegram linking changes that affect notification or future command authority.

Events use internal IDs and redacted summaries. They contain no exchange secret,
Telegram bot token, callback secret, raw authentication payload, or unrestricted
free-form note.

## 8. Observability

Metrics use bounded dimensions such as mode, lifecycle state, reconciliation
state, quality, and transition outcome. User IDs, position IDs, instrument IDs,
Telegram IDs, notes, and provider error text are structured-event fields only
and must be access-controlled and redacted.

Required future signals include transition failures, degraded duration,
reconciliation backlog, residual-delta threshold breaches, preview expiry,
unknown valuation components, and state-machine invariant violations.

## 9. Acceptance criteria by delivery phase

### Phase 4

- manual and watch-only mode gates are enforced;
- two-leg canonical identity and USDT/USDC separation are tested;
- exact public executable valuation, spread/funding/PnL breakdown, quality, and
  notes work without credentials;
- no order or authenticated exchange path exists;
- read-only web, bot, and Mini App views show the same backend state.

### Phase 5

- paper state transitions, partial fills, funding, fees, slippage, residual
  delta, restart, reconciliation, and deterministic replay pass;
- Telegram paper actions create internal commands and confirmation records only;
- no real credential or real endpoint is reachable.

### Phase 6

- credentials are separately approved and protected;
- imported positions, orders, and fills reconcile without granting trading;
- missing or ambiguous external state fails closed;
- Telegram remains read-only for synchronized positions.

### Phase 7 and later

- Risk Engine and Execution Engine boundaries are independently accepted;
- previews are short-lived and bound to state, market revisions, risk decision,
  user, action, and idempotency key;
- partial hedge, unknown order, emergency handling, and reconciliation pass
  fault and restart tests;
- live authority remains disabled by default and cannot be elevated by Telegram.

## 10. Deferred decisions

- exact spread, PnL, residual-delta, liquidation-buffer, and reporting-currency
  definitions;
- maximum multi-leg count and eligible strategy shapes;
- accounting treatment for manually entered fees, funding, and corrections;
- adoption/merge policy when a manual position matches synchronized state;
- position retention, deletion, export, and legal record requirements;
- hedge tolerance and emergency-state thresholds;
- which live actions, if any, may later be confirmed through Telegram.
