# D-064 — Matching-only scope and authority approvals

- Scope version: `instrument-matching-resources/v1`.
- D-055 decision version: `instrument-matching-pilot/v1`.
- Exact complete reviewed D-055 snapshot SHA-256:
  `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`.
- Approval date: **2026-09-14**.
- Authority status: **APPROVED — MATCHING SCOPE ONLY**.
- Blocking approval conditions: **NONE within this scope**.
- Formal acceptance / implementation authority: **NONE**.

This resolves only the matching-related portion of the complete authoritative
[D-064 register record](DECISIONS_REQUIRED.md#d-064--analytics-freshness-skew-and-bounded-load-policies).
The immutable [D-055 review snapshot](PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION.md)
is retained unchanged. All approvals below refer to that exact complete digest,
not to a generated report, partial policy hash or another revision.

## 1. Explicit approval ledger

Every row approves `instrument-matching-resources/v1`, the exact D-055 digest
above and decision version `instrument-matching-pilot/v1`.

| Authority role | Actor / authority evidence                                                                                                        | Date       | Status  | Blocking conditions | Rationale                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Product        | Task-owner Product authority; explicit user question reply: “APPROVE — matching-only Product scope, без implementation authority” | 2026-09-14 | APPROVE | NONE                | Conservative metadata/resource scope is appropriate; no later analytics or implementation is authorized        |
| Market Data    | Independent technical AI actor /root/d055_market_data; completed explicit scoped review in the separate Market Data attestation   | 2026-09-14 | APPROVE | NONE                | Freshness and bounds preserve native evidence/unknowns; no financial book-skew claim or economics upgrade      |
| SRE            | Independent technical AI actor /root/d064_scope; completed explicit scoped review, recorded in section 4                          | 2026-09-14 | APPROVE | NONE                | Deterministic offline computation guard is feasible; wall-clock and production scheduling are separately gated |

Product approval was requested explicitly against the exact snapshot digest,
scope version, [0,60s] metadata age, ≤30-day evidence/mapping validity, all
section-13 limits, ≤100,000 logical steps, cancellation checks every ≤128
steps, no wall-clock SLO, and deferred production/2B.2–2B.7 gates. A task request
alone was not treated as Product approval.

AI reviewers are separately identifiable technical role markers, not fabricated
human operational credentials or production authority. The proposer is /root;
Quant, Market Data and SRE reviewers are distinct. Product's actual explicit
reply, not an AI inference, supplies the Product approval.

## 2. Exact matching scope and limits

Applies only to pure candidate generation, instrument compatibility evaluation,
registry/evidence checking and effective mapping-version resolution for the
ordinary linear-perpetual pilot. The D-055 snapshot's section-6 and section-13
rules are adopted unchanged:

| Control                          | Approved exact maximum / policy                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Metadata freshness               | Age [0,60 seconds] at supplied evaluationAt from metadataObservedAt; negative age rejects; required quality HEALTHY             |
| Structural/registry revalidation | At most 30 days; reviewed valid intervals required                                                                              |
| Mapping validity                 | At most 30 days; [effectiveFrom,effectiveTo); earliest evidence/mapping end controls eligibility; refresh cannot renew approval |
| Instruments                      | 1,024 total across the three pilot groups; conflicting duplicate revisions reject                                               |
| Asset bindings / aliases         | 4,096 bindings; direct alias depth 1; cycles and alias-to-alias rejected                                                        |
| Candidate partners               | 32 per instrument, counting both legs; no silent top-N                                                                          |
| Candidate pairs                  | 8,192 per operation; preflight before materialization                                                                           |
| Historical mapping versions      | 64 per mapping loaded; incomplete required history UNAVAILABLE                                                                  |
| Mapping/event records            | 4,096 per operation                                                                                                             |
| Evidence                         | 32 per instrument/mapping version; 32,768 total references                                                                      |
| Conflicts                        | 128; overflow rejects batch                                                                                                     |
| Diagnostics                      | 200 including final DIAGNOSTICS_TRUNCATED summary; no hostile payload dump                                                      |
| Atomic IDs                       | Frozen 160 UTF-16 code units plus 640 UTF-8 bytes; preserve official bytes, no case/NFC rewrite                                 |
| Composite references             | 4,096 UTF-8 bytes; exact frozen encoding                                                                                        |
| Reason/description               | 512 UTF-8 bytes each; no controls or executable markup                                                                          |
| Timestamps                       | Frozen validated UTC millisecond/calendar range; required receive/processing/evaluation/recorded times explicit                 |
| Evidence-record bytes            | 8 KiB; no raw payload attachment                                                                                                |
| Serialized input                 | 16 MiB; fatal UTF-8, closed schema, JSON depth 16, 100,000 nodes, 64 keys/object                                                |
| Array cardinality                | Each named collection limit wins; generic maximum 32,768 cannot widen a narrower limit                                          |
| Serialized output                | 16 MiB; fail before publication                                                                                                 |
| Exact decimals                   | Frozen wire length 256, coefficient digits 78, wire scale 36, domain scale 78; overflow fails                                   |
| Processing budget                | At most 100,000 explicit record/pair/evidence validation steps; exhaustion fails the whole batch                                |
| Cancellation                     | Check before work, at chunks of at most 128 logical steps, and before publication; cancellation means no result publication     |

Failures are typed and whole-batch: no silent sampling, truncation into an
approved candidate subset or partial accepted-state update. Existing D-055
reason codes and finite observability remain unchanged. No new numeric limit
is introduced by this approval.

## 3. Operational assumptions, gates and deferrals

The matching core is pure, bounded and offline: no asynchronous I/O, exchange
calls, persistence, timer-driven retry, credentials, account mode or runtime
authorization. Evaluation and knowledge time are explicit replay inputs.

The processing guard is a **logical computation budget, not a wall-clock
deadline/SLO**. Cancellation is cooperative. Polling a signal within 128 steps
does not promise that an event-loop abort callback runs during a synchronous
blocked operation, nor does it promise a millisecond cancellation latency.
Implementation evidence must verify its execution model and pre-publication
checks without overstating those guarantees.

The same evaluation-time metadata-age interval bounds metadata-observation
skew to at most 60 seconds. This is not approval of financial cross-leg
receive-time simultaneity or executable book freshness.

- **Implementation gate:** this scoped authority decision is complete;
  independent formal D-055 acceptance and a separate Product Owner Phase 2B.1
  implementation task are still required. No implementation follows from this
  record.
- **Production gate:** measured workload/hardware, wall-clock watchdog/latency
  and scheduling policy, operational owners, complete economics/registry
  evidence and market-data-use rights require their separate approvals before
  production use. Those are not invented millisecond defaults for the pure
  2B.1 core.
- **Deferred D-064 scope:** 2B.2–2B.7 price/book/funding freshness and cross-leg
  receive-time skew, depth, anomaly/lifecycle windows, history/replay/export,
  ranking and their processing/resource policies remain BLOCKING before each
  affected implementation. Matching approval neither resolves nor widens them.
- **Revisit:** measured budget exhaustion, larger universes, longer required
  history, input/schema change, production execution-model requirements,
  changed freshness needs or pilot expansion requires a new scoped version and
  the same Product/Market Data/SRE review.

Rejected alternatives: one global analytics timeout; unmeasured millisecond
SLO; silent candidate sampling/partial publication; using metadata-age limits
as financial book-skew guarantees; deciding later windows/ranking limits now;
raising bounds or promoting unknown economics through manual review.

## 4. Completed independent SRE attestation

- Authority role: **SRE Reviewer** (SRE authority for this documentation scope).
- Independent actor: `/root/d064_scope`, technical AI reviewer, distinct from
  proposer /root, Quant /root/d055_quant and Market Data /root/d055_market_data.
- Review/approval date: **2026-09-14**.
- D-055 complete snapshot SHA-256:
  `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`.
- D-055 decision version: `instrument-matching-pilot/v1`.
- D-064 matching-scope version: `instrument-matching-resources/v1`.
- Status: **APPROVE**.
- Decision-blocking technical conditions: **NONE**.

The reviewer independently recomputed the complete snapshot digest in the
healthy clone and reviewed AGENTS, MASTER_SPEC, complete D-055, Phase 2B plan
and architecture acceptance, ADR-0009, security model, acceptance criteria,
the exact D-055/D-064 register records and applicable risk controls. No files
were edited by the reviewer.

Rationale: finite input/graph/byte/decimal/provenance bounds, preflight pair
counts, bounded diagnostics and all-or-nothing publication make the offline
core feasible. The deterministic work budget is its exact acceptance guard;
unmeasured wall-clock targets are not justified. Cancellation must remain
explicitly cooperative. Finite telemetry and digest-bound local evidence do
not create an authorization or network path. Zero current approved live pairs
is intentional; resource approval cannot upgrade Binance/Bybit economics or
authorize adapter/research work.

Non-blocking notes: future workload measurement, scheduling/watchdogs,
production latency and later analytics policies remain their explicit separate
gates. This technical attestation is not a human production-operational
credential, formal acceptance or permission to implement Phase 2B.1.

The separate [Market Data attestation](PHASE_2B_D055_MARKET_DATA_ATTESTATION.md)
contains the completed scoped Market Data approval. All three explicit
authorities have approved the same matching-scope version and D-055 snapshot;
no approval condition remains implementation-blocking within this scope.
