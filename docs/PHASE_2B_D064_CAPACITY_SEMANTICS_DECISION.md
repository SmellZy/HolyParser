# D-064 — Matching capacity-semantics decision (M-01)

- Decision date: **2026-10-03**.
- Applies to: D-064 matching scope `instrument-matching-resources/v1` only, under
  D-055 decision version `instrument-matching-pilot/v1`.
- Exact complete D-055 snapshot SHA-256:
  `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`.
- D-064 matching approval record SHA-256 (unchanged by this decision):
  `85fb7792cf66a9443da60bdcdbbe07daab5dce159bcda82ebaffe032b5e8fbe8`.
- Evidence that raised the question:
  [fifth Phase 2B.1 acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_5.md),
  finding M-01, SHA-256
  `4505f418820b43d9d44ad2528f52371450cb7550fcf17ceb22ee35b9e4d67d51`, at commit
  `872db41006198e84cf4f29b125191abe21e672a2`.
- Selected interpretation: **OPTION A — independent hard ceilings with
  stricter-bound precedence**.
- Authority status: **APPROVED by Product, Market Data and SRE**.
- New D-064 numeric version: **NONE**. No number, rate, unit, scope or
  execution model changes.
- M-01 disposition: **RESOLVED — ACCEPTED SEMANTICS**, with the reliance
  conditions in section 5.

This record interprets the existing
[D-064 matching approval](PHASE_2B_D064_MATCHING_APPROVAL.md). It does not edit
it. The D-055 snapshot, the D-064 approval record and every prior acceptance
report stay byte-identical. This record is not Phase 2B.1 acceptance or freeze.
It authorizes no remediation, no live pair, no registry entry and no Phase 2B.2
work.

## 1. Question decided

Acceptance #5 independently measured that the cumulative D-064 logical-work
budget rejects operations well below some structural maxima. All of these
rejections are fail-closed:

- 1,023 instruments (and 1,024) fail even with zero candidate pairs;
- the largest fully matchable three-venue fixture is about 507 instruments /
  507 pairs;
- 8,192 valid pairs fail on the work budget, with nothing published;
- the earlier author estimate of about 1,100–1,250 pairs was too high.

The question was what D-064 means when approved limits interact. It was not
whether to weaken any limit. The two options put to each authority were:

- **Option A.** Each listed value is an independent maximum accepted input
  dimension. Whichever bound is reached first wins. There is no guarantee that
  all maxima, or any structural maximum on its own, can be reached when another
  normative bound, such as the 100,000 logical-work limit, triggers earlier.
- **Option B.** The listed maxima imply that the implementation must be able to
  process inputs at those limits under a defined reference workload. That would
  need a new, separately reviewed work-budget or capacity version.

No hybrid was proposed or recorded.

## 2. Authority ledger

| Authority role | Actor / nature of evidence                                                                                                                                                     | Date       | Decision | Interpretation | Blocking conditions on the decision |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | -------------- | ----------------------------------- |
| Product        | Task owner, by explicit answer in this session to a question stating both options: "APPROVE Option A"; step unit: "Implementation detail". Not inferred from the task request. | 2026-10-03 | APPROVE  | A              | NONE                                |
| Market Data    | Independent technical AI reviewer, Market Data role. Read-only review, distinct from the proposer and the SRE reviewer. Not a human professional signature.                    | 2026-10-03 | APPROVE  | A              | NONE (reliance conditions, §5)      |
| SRE            | Independent technical AI reviewer, SRE role. Read-only review, distinct from the proposer and the Market Data reviewer. Not a human professional signature.                    | 2026-10-03 | APPROVE  | A              | NONE (reliance conditions, §5)      |

The two AI reviewers each recomputed the D-055 and D-064 digests above. Each
read D-055 §13, D-055 acceptance §8, D-064 §2–§4, R-088 and acceptance #5 before
deciding. Their AI role markers follow the convention already used for D-055 and
D-064. They are technical attestations, not human operational credentials.

Each authority answered the required points identically:

| Point                                 | Product                            | Market Data                        | SRE                                |
| ------------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- |
| Decision                              | APPROVE                            | APPROVE                            | APPROVE                            |
| Interpretation                        | A                                  | A                                  | A                                  |
| Scope/version                         | `instrument-matching-resources/v1` | `instrument-matching-resources/v1` | `instrument-matching-resources/v1` |
| Minimum guaranteed capacity intended  | No                                 | No                                 | No                                 |
| 8,192 pairs / 1,024 instruments       | Ceilings only                      | Ceilings only                      | Ceilings only                      |
| 100,000 logical-work budget unchanged | Yes                                | Yes                                | Yes                                |
| 128-units-per-step accounting         | Implementation detail              | Implementation detail              | Implementation detail              |
| New D-064 numeric version required    | No                                 | No                                 | No                                 |

## 3. Recorded semantics of `instrument-matching-resources/v1`

1. Structural limits are maxima, not throughput or capacity guarantees.
2. All resource limits compose. The strictest applicable bound wins.
3. 8,192 candidate pairs and 1,024 instruments stay structural upper bounds,
   each with its own preflight and one-over rejection.
4. The 100,000 cumulative logical-work limit is an independent global bound. It
   may reject inputs below any other structural maximum.
5. Fail-closed whole-batch rejection with typed `MATCHING_BOUND_EXCEEDED`, no
   publication and prior accepted state preserved is expected behaviour, not a
   defect.
6. D-064 guarantees no minimum pair, instrument or other capacity.
7. Measured operational capacity depends on the implementation and workload.
   It must not be elevated into normative policy or claimed in evidence as a
   reachable maximum.

This only states what the approved texts already provide:

- D-064 §2 approves each value as an exact maximum and introduces no new limit.
  It already applies narrower-bound precedence ("each named collection limit
  wins").
- D-055 §13 makes the work budget the acceptance invariant.
- [D-055 acceptance](PHASE_2B_D055_ACCEPTANCE.md) §8 calls the pair preflight
  "not a promise to materialize every partner-permitted pair", and says maxima
  "remain subject to byte, graph and work limits".
- R-088 accepts that legitimate larger universes may be unavailable.

## 4. Logical-step accounting granularity

The runtime's conversion of byte-proportional repeated work into logical steps
(currently 128 fine-grained units per step, plus the reviewed sub-rates) is an
**implementation detail, not normative capacity policy**. Independent
acceptance verifies only that it is:

- conservative and charged before the work runs;
- deterministic, with no host or time-zone dependence;
- internal, not exported and not supplied by callers;
- fail-closed.

A stricter rate is allowed. A rate less conservative than the one reviewed in
acceptance #5 widens the actual-work envelope and the work permitted between
cancellation polls. That is not an implementation detail: it requires a new
scoped D-064 version with Product, Market Data and SRE review.

## 5. Reliance conditions (carried to remediation and acceptance)

None of these blocks this decision. All must hold before any Phase 2B.1 freeze
relies on it:

1. The implementation evidence §19.10 capacity statement ("about 1,100–1,250
   pairs") must be corrected in the next authorized remediation. It should be
   replaced with the measured fail-closed figures above, or with no capacity
   claim. No document or test may claim that a listed maximum is reachable.
2. A public-operation regression at the instrument maximum (1,024, and 1,023
   with zero pairs) must assert:
   - typed `MATCHING_BOUND_EXCEEDED`;
   - no publication, partial or sampled candidate set, or top-N;
   - unchanged inputs and registry revision;
   - no diagnostic implying the universe was evaluated.
3. Work-unit rates must stay internal and must not be influenced by callers.
   This depends on M-02 removing the public caller-supplied budget parameters.
   Acceptance must confirm the rates are no less conservative than those
   reviewed in acceptance #5.
4. Interpretation A presumes honest charging. H-03 must still be resolved,
   because uncharged work makes the budget envelope unreliable.

## 6. Unchanged scope, gates and revisit

- Unchanged: D-055 and its snapshot hash, the D-064 approval record and its
  hash, every numeric limit, the 100,000 logical-work budget, cooperative
  cancellation at most every 128 steps with pre-publication checks, the 44
  reason codes and all prior acceptance reports.
- **Not resolved here:** H-03 and H-04 (HIGH) and M-02 (MEDIUM). Acceptance #5
  stays FAIL. Phase 2B.1 is not frozen. Phase 2B.2 is not authorized.
- **Out of scope:**
  - Splitting or partitioning a universe across operations needs separate
    approval and must be complete and asset-closed, never hidden sampling.
  - Batch sizing, measured workload and hardware, a wall-clock watchdog,
    scheduling and owners stay with the separate production gate.
- **Revisit:** a new scoped D-064 version with Product, Market Data and SRE
  review is required before any of these:
  - a capacity guarantee;
  - a changed 100,000 budget;
  - less conservative work rates;
  - a larger universe;
  - a response to budget exhaustion measured on real, production-gated pilot
    metadata (current HEALTHY, ACTIVE, approved bindings).

  Telemetry should keep budget-exhaustion rejections as a finite reason family,
  so that a future revisit has measured evidence.
