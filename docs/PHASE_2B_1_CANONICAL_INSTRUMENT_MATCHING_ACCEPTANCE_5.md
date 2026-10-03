# Phase 2B.1 — fifth independent acceptance review

- Review date: 2026-10-02.
- Reviewed state: GitHub `SmellZy/HolyParser`, branch `claude/stoic-lovelace-uxfohy`,
  exact commit `018593dd5002b2e9003ed67a5a5584a5f5ff6116` (tree
  `8bb608246a512eec9d13b4120a4d04e3432b9e18`). Parent `e3aa20ec2f733f60e456a2e85eed6d683d3435d5`
  (`handoff/phase-2b1-h03`); D-055 baseline `9dacc824aa375f4f14b60ec91ccbdc69624f23a3`
  (`main`, tag `phase-2b-d055-instrument-matching`). Both branch commits are WIP
  transport commits, not acceptance or freeze commits.
- Execution: a disposable detached worktree plus two fresh blob-identical
  materializations (authoritative quality run; separate probe copy) and one
  disposable materialization of `e3aa20e` for the non-vacuity check. No existing
  checkout was reset, cleaned, stashed or restored.
- Final status: **FAIL**. BLOCKER: **0**. Unresolved HIGH: **2** (H-03, H-04).
- Phase 2B.1 may freeze: **NO**. Phase 2B.2 eligible for separate authorization: **NO**.
- This review created only this report. No implementation, test, manifest,
  lockfile, dependency, D-055, D-064, prior report, implementation evidence or
  frozen scope was changed. Nothing was committed, pushed or tagged.

## 1. Governing baseline and hashes

Pre-review checks in the worktree at `018593d`: `git status` clean,
`git diff --check` clean, `git fsck --full` exit 0, `HEAD == 018593d`
(`git log --oneline --decorate -10` shows `018593d` → `e3aa20e` → `9dacc82`).
Read completely: `AGENTS.md`, `MASTER_SPEC.md`, the Phase 2B plan and
architecture acceptance, ADR-0009, D-055 and its formal acceptance, D-064, the
four prior Phase 2B.1 reports, the implementation evidence (section 19 is the
claim set under review), every runtime and test module under
`packages/spread-analytics/**`, and `git diff e3aa20e 018593d` in full.
Author-produced evidence, test names and green tests were treated as claims.

| Artifact                                             | SHA-256 (recomputed)                                               | Status                           |
| ---------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------- |
| D-055 decision                                       | `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931` | matches mandated value           |
| D-064 matching approval                              | `85fb7792cf66a9443da60bdcdbbe07daab5dce159bcda82ebaffe032b5e8fbe8` | unchanged since `9dacc82`        |
| D-055 formal acceptance                              | `18d1cbb38c2db218cc11b25f3a89279be76b7f335703881e688f887864df3495` | unchanged since `9dacc82`        |
| First acceptance                                     | `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0` | matches acceptance-4 record      |
| Re-acceptance                                        | `22bb95806e7e8cd300e6ef49e87654528c6fbb775df344b1335c5e61baf028c4` | matches acceptance-4 record      |
| Third acceptance                                     | `bd5fa6a38404e9d40e35513176f94a752025fd7152653dc5d4b64811592295e0` | matches acceptance-4 record      |
| Fourth acceptance                                    | `a54dd81821332cce15db3ce57be121eb7875bd02e87da1b20e4c537d3062b3ee` | byte-identical to `e3aa20e`      |
| Implementation evidence                              | `f3a448278601309e0d16e5b4c1e2ee9f9fb1efb65ebece31628b13a691cc0204` | changed vs `e3aa20e` only in §19 |
| Root `package.json`                                  | `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` | matches mandated value           |
| `package-lock.json`                                  | `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59` | matches mandated value           |
| `docs/brand/references/holyparser-dark.png`          | `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08` | matches `e4a53ef9…0dbe08`        |
| `docs/brand/references/holyparser-design-system.png` | `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54` | matches `459f2354…68c54`         |
| `docs/brand/references/holyparser-logo-system.png`   | `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c` | matches `5050e13e…82a8c`         |

`git diff e3aa20e 018593d` touches only the eleven runtime modules named in
§19.9, `work-oracle.ts` (new, build-excluded), two test files
(`fourth-acceptance-remediation.test.ts`, new `work-accounting-oracle.test.ts`),
`tsconfig.json` (oracle exclusion only) and §19 of the evidence document.
`serialization.test.ts`, `d055-scenarios.test.ts`,
`third-acceptance-remediation.test.ts`, `reasons.ts`, `policy.ts`, `model.ts`,
`economics.ts`, `validation.ts`, `diagnostics.ts` and `index.ts` are
byte-identical to `e3aa20e`.

## 2. Required finding verdicts

| Finding                                               | Verdict                            | Independent basis                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 — forged history/transition authority            | **RESOLVED (no regression)**       | Forged v1 `SUPERSEDED`/`supersededBy`, forged v1 `INVALIDATED`, forged v2 reason, `supersededBy` on an APPROVED record, dropped transitions and a flipped transition type all fail admission (`DIGEST_MISMATCH`, `INVALID_PROVENANCE`, `CONFLICTING`); the valid control is `VALID`. SUPERSEDE and CORRECT records with identical fields get different command digests.                             |
| B-02 — immutable admitted replay                      | **RESOLVED (no regression)**       | After admission from a fully mutable deep copy, mutating the caller's history, statuses and transition array leaves the history digest and replay revision unchanged; returned versions are frozen; a spread copy of the admitted handle is rejected with `INPUT_INVALID`.                                                                                                                          |
| H-01 — product scope before identity                  | **RESOLVED (no regression)**       | SPOT, dated, unsupported, unknown, option and inverse pairs all generate candidates with no exposure key. SPOT, dated, unsupported, unknown and option also carry no product class. Evaluation gives `NOT_MATCHED` with `SPOT_DERIVATIVE_MISMATCH`, `DATED_PRODUCT_EXCLUDED`, `PRODUCT_UNSUPPORTED`, `PRODUCT_ENUM_UNVERIFIED`, `PRODUCT_UNSUPPORTED` and `VALUE_CONVENTION_MISMATCH` respectively. |
| H-02 — public API closure                             | **RESOLVED (no regression)**       | A freshly built `dist/index.js` has exactly **22** runtime exports with unchanged names, no wildcard in source or dist, no oracle in `dist`, and deep imports return `ERR_PACKAGE_PATH_NOT_EXPORTED`. Public signatures that accept a budget are a new, separate finding (M-02).                                                                                                                    |
| H-03 — cumulative logical-work/cancellation authority | **NOT RESOLVED — HIGH (narrowed)** | The acceptance-4 counterexample and the candidate path are fixed. However, uncharged unbounded string comparisons and missing final checks remain in public operations, and the oracle cannot detect either. Section 3 gives the measurements.                                                                                                                                                      |
| H-04 — runtime timestamp validation (new)             | **NEW — HIGH**                     | Caller timestamps are validated only by `Date.parse` being finite. Non-RFC 3339, local-time and 100,000-character legacy strings are accepted, so identical inputs give `MATCHED`, `UNAVAILABLE` or `AMBIGUOUS` depending on the host time zone (§4.1).                                                                                                                                             |

## 3. H-03 analysis with independent measurements

All probes ran in the disposable probe copy with test-only harnesses (including
the authors' `work-oracle.ts`, used as an instrument and judged separately). All
probe files were deleted afterwards; every `packages/spread-analytics` file in
the probe copy then hashed identically to the commit index. The authoritative
quality run (section 7) used a separate pristine copy.

### 3.1 Acceptance-4 counterexample — fixed

`makeCandidate` on one operation budget (including the final remainder flush),
three repetitions each:

| Canonical base asset ID length | Charged steps (×3) |
| -----------------------------: | ------------------ |
|                             10 | 69, 69, 69         |
|                            150 | 86, 86, 86         |
|                            160 | 87, 87, 87         |

Acceptance 4 measured 1 versus 1. The cost is now deterministic and grows with
identifier length. The authors' own figures (75 versus 93 steps for 10 versus 155) use a different fixture and are consistent with this. Budgeted and
unbudgeted outputs match exactly. A cross-version probe on the same fixture
universe gave identical candidate IDs, evidence digests, exposure keys, an
INVALIDATED-history digest, a CORRECTED replay revision and batch result IDs on
`e3aa20e` and `018593d`: combined SHA-256
`abba05409b74fb53d3d87d99db66c71c85b0a2fcdbcbe58e862accaf2c871f90` on both.

### 3.2 Propagation audit (charge-before-work on one budget)

The candidate path from `generateCandidates` through `makeCandidate` now charges
every listed operation to the single operation budget before the work runs:
exposure key, provisional and candidate serialization, UTF-8 comparators, ID and
SHA input preparation, copy and freeze. Registry resolution and timestamp
parsing are charged the same way. There are 20 `new WorkBudget(` sites, each
either an operation root or an `operationBudget ?? new WorkBudget()` fallback.
No helper resets a parent budget. These claims are confirmed.

They are not complete. Independently found uncovered paths:

1. **Uncharged native string equality on unvalidated caller strings
   (refutes "Uncovered authoritative repeated-work paths: 0").**
   `MappingLedger.assertInvalidateCommandBinding` (`commands.ts:484–519`) runs
   first in `apply`. It compares eleven caller-supplied command and transition string fields
   with `!==` before any of them is validated or bounded, and charges only
   `work.step()`. The `#commandDigests.get(commandId)` hash is likewise
   uncharged. The authors' own model charges equal-length string equality per
   code unit (`sameText`). Probe: `admitMappingCommand` on an empty ledger with
   a forged `INVALIDATE_MAPPING` command, where seven fields are equal but
   distinct strings:

   | Field length | Outcome                          | Charged steps | Signal reads | Uncharged comparison work |  Elapsed |
   | -----------: | -------------------------------- | ------------: | -----------: | ------------------------: | -------: |
   |           10 | `REJECTED`/`TRANSITION_REJECTED` |             3 |            1 |                negligible |  0.05 ms |
   |    1,000,000 | `REJECTED`/`TRANSITION_REJECTED` |             3 |            1 |     ≥7,000,007 code units |  1.47 ms |
   |    8,000,000 | `REJECTED`/`TRANSITION_REJECTED` |             3 |            1 |    ≥56,000,007 code units | 10.86 ms |

   The work grows without bound while the charge stays at 3 steps, and the
   signal is polled only once, by the constructor. The same uncharged-equality
   pattern exists over validated but long values in `admission.ts`
   (`validateRecord`, `validateBaseHistory`, `sameApproval`), with
   4,096-byte composites and timestamps of unbounded legal length (see H-04).

2. **Typed non-success outcomes published without the final check (refutes
   "every public operation's actual-work tail after its final check is 0").**
   Section 19 fixed this for standalone `admitMaterializedMapping` (confirmed:
   `REVISION_MISMATCH` tail 0). The same defect remains in two other public
   operations:

   | Operation                                       | Outcome                                      | Checks | Tail (oracle units) | Cancellation requested from the 2nd poll |
   | ----------------------------------------------- | -------------------------------------------- | -----: | ------------------: | ---------------------------------------- |
   | `admitRegistryRevision` (alias chain)           | `QUARANTINED` / `ALIAS_CHAIN_FORBIDDEN`      |      1 |                 424 | ignored; `QUARANTINED` published         |
   | `admitMappingCommand` (stale revision)          | `REJECTED` / `MAPPING_REVISION_CONFLICT`     |      1 |                   2 | ignored; `REJECTED` published            |
   | `admitMappingCommand` (cancelled mid-operation) | returned `REJECTED` / `EVALUATION_CANCELLED` |      2 |                   — | turned into a published typed result     |

   `admitMappingCommand`'s `catch` returns every `MatchingFailure`, including
   `EVALUATION_CANCELLED` and `MATCHING_BOUND_EXCEEDED`, as a result. It never
   calls `beforePublication()` on the non-APPLIED paths. Admission, by
   contrast, rethrows both codes. D-055 §13 requires "no result publication
   after cancellation". The authors' oracle suite measures only the READY and
   APPLIED paths of these two operations, which is why it missed this.

3. **Atomic native calls that are not fully precharged and are not bounded by
   D-064 before they run.** In `assertEvidenceRecord`, `JSON.stringify` runs
   before the 8 KiB check. It is precharged only by the JSON walk, at 256 code
   units per step (about 0.5 units per code unit). With a 4,000,000-character
   `sourceDigest`, one native call cost **4,000,387** units, about 2.0M of them
   precharged, before the typed `MATCHING_BOUND_EXCEEDED`. The walk would allow
   a single call of about 25M code units within the cap. In `assertShape`
   (admission), `Object.keys` runs before any charge: 1,000,000 extra keys gave
   **1,000,007** units after the last check against **2** charged steps (it
   rejects, so nothing is published). This contradicts §19.3's "fully charged
   before it starts" and "the D-064 byte limits bound each such call".

### 3.3 The oracle: sound, complete, non-vacuous?

- **Non-vacuous: confirmed.** Run against the real transferred source
  (`e3aa20e`), not only its synthetic negative control, the oracle reproduces
  the claimed defects: replay of 64 versions has an interruptible gap of
  **69,507** units (claimed 69,531), standalone admission of 64 versions
  **17,109**, and the forged-admission publication tail **1,134**.
- **Not complete.** It does not see `===`/`!==` string comparison, string
  hashing in `Map`/`Set`, object spread, or template and rope concatenation,
  so the uncharged path in 3.2(1) cannot be seen. Its scenarios cover only
  success paths of registry and command admission, so 3.2(2) cannot be seen.
- **Not sound for its key premise.** `maximumInterruptibleGap` subtracts the
  largest single native call in each gap without checking that the call was
  precharged. An uncharged or underpaid atomic call (3.2(3)) is therefore
  excluded from the very metric meant to bound it. The fixed 16,384-unit
  ceiling also assumes one unit per charged unit, but the accepted sub-rates
  (JSON walk at 256 code units per step, evidence JSON at 512) break that
  equivalence.

With valid near-limit inputs, my own measurements agree with the authors':
for example, 300 evidence records at maximum valid field lengths gave a maximum
raw gap of 15,619 units, an interruptible gap of 13,561 and tail 0. The defects
above are on paths the oracle does not instrument or exercise.

### 3.4 Execution model: acceptable reading or reinterpretation?

The declared model is at most 128 charged steps of interruptible work between
checks, plus one fully precharged atomic native call. In principle this is an
acceptable reading of D-064 §3, which itself says polling within 128 steps
"does not promise that an event-loop abort callback runs during a synchronous
blocked operation". Two qualifications stand:

1. The code does not fully implement the model (3.2(1)–(3)).
2. Converting byte-proportional work into steps at 128 units per step is an
   implementation choice. D-055 §13 and D-064 define the budget as "explicit
   record/pair/evidence validation steps", and no authority approved this
   conversion. Its capacity effect is material (M-01). Accounting for repeated
   work is required, as acceptance 4 established, but its unit and capacity
   are a D-064 authority question, not an implementation default.

### 3.5 Caps, 8,192 pairs, cancellation phases, atomicity

- **Direct cap:** `step(100,000)` succeeds and the next step fails with
  `MATCHING_BOUND_EXCEEDED`. Also, 99,999 steps plus 127 units flushes to
  exactly 100,000; one more unit fails. The authors' distributed six-stage test
  (success at exactly 100,000, failure at the 100,001st required step) passes.
- **8,192 valid pairs:** built independently from 529 instruments (15 groups of
  33 and 2 of 17). The operation fails with `MATCHING_BOUND_EXCEEDED`, nothing
  is published, and caller instruments and the registry revision are
  unchanged. 8,193 pairs give `Pair bound exceeded.`
- **Cancellation inside materialization:** 1,024 abort placements were made
  (128 step offsets × 8 unit offsets) around one `makeCandidate`. Every one
  cancelled with nothing published. The throw frames covered
  `canonicalExposureKey` (98), `quote`/`encode` (99/172), the UTF-8 comparator
  (159), `sameText` (38), `provisionalValue` (1), `deterministicId` (49),
  `sha256` (63), `chargeCopy` in `immutableCandidate` (6), `makeCandidate` (10)
  and anonymous frames (329).
- **Atomicity:** 496-pair generation (293 checks) cancelled at 73 placements
  with no partial publication and inputs unchanged. Admission of 8 versions
  cancelled at all 45/45 placements; the input, the admitted-history digest and
  replay (`MATCHED`) were unchanged.
- **Zero tail:** holds for `generateCandidates`, `evaluateMatch`,
  `evaluateBatch`, `replayMapping`, `validateEvidenceBundle`, standalone
  admission (all outcomes), the READY registry outcome and the APPLIED command
  outcome. It fails for registry QUARANTINED and command REJECTED/QUARANTINED
  (3.2(2)).

### 3.6 Capacity consequence (assessed without widening any bound)

| Universe (fixture IDs unless noted)                       | Result                                         |
| --------------------------------------------------------- | ---------------------------------------------- |
| 1,023 instruments, 3 venues, distinct assets (zero pairs) | **fails** `MATCHING_BOUND_EXCEEDED` at 100,000 |
| 1,024 instruments, 4 venues, distinct assets (zero pairs) | **fails** at 100,000                           |
| 1,023 instruments / 1,023 pairs (341 assets × 3 venues)   | **fails** (fixture and near-maximum IDs)       |
| Largest fully matchable 3-venue universe                  | 507 instruments / 507 pairs, 99,678 steps      |
| Same with 510 instruments                                 | fails                                          |

Each instrument costs about 98 steps of validation and resolution, so the
approved **1,024-instrument** maximum cannot be processed in one candidate
operation even with zero pairs. The transferred `e3aa20e` state already failed
1,023 instruments. Section 19.10's "about 1,100–1,250 pairs" reflects dense
33-instrument groups and understates the effect for the three-venue pilot. The
"1,024 instruments" boundary test exercises only the generic count guard.

Verdict: fail-closed and never widening, so not a violation of any maximum.
But the approved instrument and pair maxima cannot be reached under an
unapproved step-unit reinterpretation. Per D-064 §3 (measured budget
exhaustion is a revisit trigger), this needs an explicit Product / Market Data /
SRE decision. Recorded as M-01; not waived by this review.

### 3.7 Withdrawn-claims account (§19.1): accurate

`e3aa20e` re-run here: **191/192** spread-analytics tests. The one failure is
"observes a maximum gap of 128 through validation and candidate loops", failing
with `MatchingFailure: Work bound exceeded.` Its unreviewed draft §19 claimed
192/192 and "No further production candidate … path omits the supplied
budget"; both were false, and the withdrawal is accurate. The new §19's
replacement claims "Uncovered authoritative repeated-work paths: 0", "tail 0
for every public operation" and "D-064 byte limits bound each such call" are
refuted above.

## 4. Other verdicts

### 4.1 H-04 — timestamp validation (new, HIGH)

D-055 §13 and D-064 require timestamps in a "Frozen validated UTC
millisecond/calendar range … invalid or missing required time rejects input".
The matching core accepts any string for which `Date.parse` is finite
(`registry.ts` `epoch`, and the replay and command `parse` helpers). The
market-data `timestamp()` RFC 3339 validator is only a compile-time brand here.
Probe with identical inputs and `evaluationAt = knowledgeCutoff =
"2026-09-15 00:00:30"`:

| Host `TZ`          | Outcome / reason                       | Result ID prefix   |
| ------------------ | -------------------------------------- | ------------------ |
| `UTC`              | `MATCHED` / `COMPATIBLE_APPROVED`      | `8cdd1e23a303377b` |
| `America/New_York` | `UNAVAILABLE` / `EVIDENCE_STALE`       | `da2b01db4aa0c9f6` |
| `Asia/Tokyo`       | `AMBIGUOUS` / `ASSET_IDENTITY_UNKNOWN` | `862037e329779b93` |

A 100,023-character `"Sep 15 2026 00:00:30 (ccc…)"` is also accepted and
yields `MATCHED`. Invalid input therefore fails open (to `MATCHED` on a UTC
host) and replay is host-dependent. Long valid-by-`Date.parse` strings also feed
the uncharged comparisons in 3.2(1).

### 4.2 Remaining architecture checks

- **Canonical serialization and digests: PASS (unchanged).**
  `instrument-exposure-pilot/v1`, the seven length-prefixed fields, the golden
  vector `786dc0d4cb92c23193e62d6f6ef1b0ad5c15d8c47eae0745c7b352fc2e1407ef`,
  the separate transition and history digest domains, and the cross-version
  output identity in 3.1 are all unchanged.
- **Economics, lifecycle/freshness, governance and conflict: PASS for valid
  RFC 3339 UTC inputs.** These are unchanged modules, and their authored suites
  pass. H-04 qualifies freshness and replay for invalid timestamps.
- **Real venues: PASS, unchanged.** OKX↔Binance is `UNAVAILABLE` with
  `MULTIPLIER_UNKNOWN` and `VALUE_CONVENTION_UNVERIFIED`. OKX↔Bybit is
  `UNAVAILABLE` with `MULTIPLIER_UNKNOWN`. Binance↔Bybit is `UNAVAILABLE` with
  `MULTIPLIER_UNKNOWN` (multiplier gaps on both legs) and Binance's
  `VALUE_CONVENTION_UNVERIFIED`. There are zero approved real pairs.
- **Reason catalogue: PASS.** `MATCH_REASON_CODES` has exactly **44** values,
  all unique. `reasons.ts` is byte-identical to `e3aa20e`, so no new code was
  added.

## 5. D-055 scenario review (29 policy groups)

All **40/40** authored runtime cases pass (37 synthetic plus 3 real-venue). Each
row maps to the same-numbered case in
`packages/spread-analytics/src/d055-scenarios.test.ts`, with these additions:
group 26 also maps to `governance.test.ts`, the append-only cases in
`third-acceptance-remediation.test.ts` and probe R1; group 28 also maps to
probe R2; group 29 also maps to `fourth-acceptance-remediation.test.ts`,
`work-accounting-oracle.test.ts` and probes P1–P9 and Q1–Q6.

|   # | Expected scenario / primary code                                        | Verdict                                       |
| --: | ----------------------------------------------------------------------- | --------------------------------------------- |
|   1 | Same reviewed A/USDT linear perpetual → `MATCHED / COMPATIBLE_APPROVED` | PASS                                          |
|   2 | Same ticker, different canonical base → `BASE_ASSET_MISMATCH`           | PASS                                          |
|   3 | USDT vs USDC → `SETTLEMENT_ASSET_MISMATCH`                              | PASS                                          |
|   4 | Linear vs inverse → `VALUE_CONVENTION_MISMATCH`                         | PASS                                          |
|   5 | Perpetual/dated, dated/dated → `DATED_PRODUCT_EXCLUDED`                 | PASS                                          |
|   6 | Exact 1, 0.001, 100 normalization → compatible                          | PASS                                          |
|   7 | Missing multiplier → `MULTIPLIER_UNKNOWN`                               | PASS                                          |
|   8 | Unknown lifecycle → `LIFECYCLE_UNKNOWN`                                 | PASS                                          |
|   9 | Reviewed direct alias → compatible, reviewed manual                     | PASS                                          |
|  10 | Conflicting binding → `ASSET_BINDING_CONFLICT`                          | PASS                                          |
|  11 | Superseded current vs historical AS_KNOWN                               | PASS                                          |
|  12 | Reviewed historical rebrand                                             | PASS                                          |
|  13 | Ticker-only collision → `ASSET_IDENTITY_UNKNOWN`                        | PASS                                          |
|  14 | Unsupported family → `PRODUCT_UNSUPPORTED`                              | PASS                                          |
|  15 | 60 s accepted, 60 s + 1 ms → `EVIDENCE_STALE`                           | PASS for RFC 3339 UTC input; see H-04         |
|  16 | Zero/negative multiplier → `MULTIPLIER_INVALID`                         | PASS                                          |
|  17 | Incompatible unit → `CONTRACT_UNIT_MISMATCH`                            | PASS                                          |
|  18 | Unapproved candidate → `MAPPING_UNAPPROVED`                             | PASS                                          |
|  19 | Quarantine/invalidation → typed non-actionable                          | PASS                                          |
|  20 | Unknown convention/capability → typed unavailable                       | PASS                                          |
|  21 | Alias chain/cycle → `ALIAS_CHAIN_FORBIDDEN`                             | PASS (outcome); final-check gap under H-03    |
|  22 | Economics contradiction → `METADATA_EVIDENCE_CONFLICT`                  | PASS                                          |
|  23 | Overlapping intervals → `MAPPING_INTERVAL_CONFLICT`                     | PASS (outcome); final-check gap under H-03    |
|  24 | Inactive lifecycle → `LIFECYCLE_NOT_ACTIVE`                             | PASS                                          |
|  25 | Expired / >30-day → `MAPPING_EXPIRED` / `EVIDENCE_TIME_INVALID`         | PASS for RFC 3339 UTC input; see H-04         |
|  26 | Digest, reviewer and revision authority reject forged state             | PASS; append-only probes pass                 |
|  27 | OKX special family → `SPECIAL_PRODUCT_EXCLUDED`                         | PASS                                          |
|  28 | AS_KNOWN/CORRECTED replay and historical immutability                   | PASS for RFC 3339 UTC input; see H-04         |
|  29 | Resource/cancellation bound and permutation                             | **FAIL — H-03 residual (3.2); M-01 capacity** |

Result: **28/29 policy groups PASS** (group 29 FAIL; groups 15, 25 and 28 carry
the H-04 qualification). **40/40** authored cases pass. **44** unique reason
codes, none new.

## 6. D-064 limits (boundary and one-over)

| Limit                                  |         Approved value | Verdict                                                                                                                           |
| -------------------------------------- | ---------------------: | --------------------------------------------------------------------------------------------------------------------------------- |
| Instruments                            |                  1,024 | Guard PASS (1,024 / 1,025); operation cannot process 1,023 even with zero pairs (M-01)                                            |
| Partners per instrument                |                     32 | PASS (33rd rejected)                                                                                                              |
| Candidate pairs                        |                  8,192 | Preflight PASS; 8,193 rejected; 8,192 valid fails closed on the budget, nothing published (M-01)                                  |
| Registry bindings / aliases            |        4,096 / depth 1 | PASS                                                                                                                              |
| Mapping versions per mapping           |                     64 | PASS                                                                                                                              |
| Mapping/event records                  |                  4,096 | PASS                                                                                                                              |
| Evidence per subject / total           |            32 / 32,768 | PASS                                                                                                                              |
| Evidence record                        |                  8 KiB | Bound enforced, but only after an unbounded atomic `JSON.stringify` (3.2(3))                                                      |
| Conflicts / diagnostics                |              128 / 200 | PASS                                                                                                                              |
| Atomic ID                              | 160 UTF-16 / 640 UTF-8 | PASS                                                                                                                              |
| Composite ID                           |            4,096 UTF-8 | PASS                                                                                                                              |
| Reason/description                     |              512 UTF-8 | PASS                                                                                                                              |
| Timestamps                             |   frozen validated UTC | **FAIL — H-04**                                                                                                                   |
| Input / output                         |            16 MiB each | PASS                                                                                                                              |
| JSON depth / nodes / keys              |      16 / 100,000 / 64 | PASS                                                                                                                              |
| Generic array                          |                 32,768 | PASS                                                                                                                              |
| Decimal wire / digits / scales         |     256 / 78 / 36 / 78 | PASS                                                                                                                              |
| Cumulative logical work                |                100,000 | Direct and distributed 100,000 / 100,001 PASS; **operation-wide FAIL** (uncharged unbounded work, 3.2(1))                         |
| Cancellation interval / no publication |     ≤128 logical steps | Candidate, evaluation, replay, evidence and admission paths PASS; **FAIL** for registry and command non-success outcomes (3.2(2)) |

D-064 aggregate verdict: **FAIL** (H-03 residual, H-04). The capacity
consequence (M-01) is compliant fail-closed behaviour that needs an authority
decision.

## 7. Verification and frozen boundaries

- **Runtime:** official `node-v24.18.1-linux-x64.tar.xz` downloaded over HTTPS,
  SHA-256 `d6c664df3f3f61458e8c277585571328522d705166723a7c7823a9253a4d15a0`,
  matching nodejs.org `SHASUMS256.txt` (the signature on that file was not
  GPG-verified). Node **v24.18.1**, npm **11.16.0**. Disk: 30 GB available
  before the run, no `ENOSPC`.
- **Authoritative fresh copy:** a blob-identical materialization of tree
  `8bb60824…`, never touched by probes.
  - `npm ci` exit 0: 450 added / 459 audited, with eight pre-existing advisories
    (2 moderate, 5 high, 1 critical). Neither the lockfile nor any dependency
    changed.
  - `npm run format:check`, `lint` and `typecheck`: exit 0.
  - Full `npm test`: exit 0. **52 source test files** (49 passed, 3 opt-in
    live-canary files skipped); **479 passed, 0 failed, 3 skipped**.
    Per package: contracts 4, market-data 57, spread-analytics 219, OKX 52 (+1
    skipped), Binance 72 (+1), Bybit 69 (+1), web 6.
  - Focused spread-analytics: **17/17 files, 219/219 tests**, including
    `d055-scenarios` 40, `third-acceptance-remediation` 23,
    `fourth-acceptance-remediation` 21 and `work-accounting-oracle` 15.
  - `npm run build`: exit 0, six static routes (`/`, `/_not-found`,
    `/forgot-password`, `/login`, `/register`, `/verify-email`).
  - `npm query`: 451 packages (452 on the earlier macOS run; platform optional
    packages) and 8 workspaces.
- **Markdown local links:** 74 files, 88 links, 66 local, 1 anchor, **0
  broken**.
- **`git diff --check`:** the worktree is clean, and so is the
  `e3aa20e..018593d` range. The `9dacc82..018593d` range reports 18 Markdown
  hard-break double spaces, introduced in `e3aa20e` and unchanged since: 7 in
  `…ACCEPTANCE_3.md` and 11 in `…IMPLEMENTATION.md` (L-01). `git fsck --full`:
  exit 0.
- **Frozen scopes:** no diff from `9dacc82` in `packages/market-data`, the
  OKX/Binance/Bybit adapters, `packages/contracts`, `packages/design-tokens`,
  `apps`, `infra`, `docs/brand`, D-055, its acceptance or D-064. Since
  `9dacc82`, only `packages/spread-analytics/**`, the five Phase 2B.1 reports,
  the evidence document and the two root manifests (mandated hashes) changed.
- **Housekeeping:** the build regenerated `apps/web/next-env.d.ts` in the
  disposable copy only (E-02 recurrence). All probes were removed, and the
  probe copy's sources were re-verified identical to the commit.

## 8. Findings, limitations and freeze decision

| ID   | Severity | State                    | Required resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-03 | HIGH     | Unresolved (narrowed)    | (a) Charge or bound every native comparison and hash of caller strings before it runs. Start with `assertInvalidateCommandBinding` and the `#commandDigests` lookup (validate and bound first), then the admission equality chains. (b) Make `admitRegistryRevision` QUARANTINED and `admitMappingCommand` REJECTED/QUARANTINED pass `beforePublication()`, and rethrow `EVALUATION_CANCELLED`/`MATCHING_BOUND_EXCEEDED` instead of returning them. (c) Bound or fully precharge `JSON.stringify` in `assertEvidenceRecord` before it runs, and state the caller-object key-enumeration exception explicitly. (d) Extend the oracle to string equality, `Map`/`Set` hashing, spreads and concatenation; verify precharge of the excluded atomic call; cover every non-success outcome. Add regressions for each counterexample in section 3. |
| H-04 | HIGH     | New                      | Validate every caller timestamp at runtime against the frozen RFC 3339 UTC millisecond/calendar rule (the market-data `timestamp()` contract), charged before parsing, rejecting with `EVIDENCE_TIME_INVALID` before any comparison or serialization. Add regressions for local-time, legacy and long timestamps across a host-`TZ` matrix, and for replay determinism. Do not change D-055.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| M-01 | MEDIUM   | New — authority decision | The implementation-chosen 128-units-per-step conversion makes the approved 1,024-instrument and 8,192-pair maxima unreachable (1,023 instruments fail with zero pairs; the largest fully matchable three-venue universe is 507). Correct §19.10's capacity statement and add a public-operation test at the instrument maximum. Obtain an explicit Product/Market Data/SRE D-064 scoped decision on the step unit and capacity before freeze. No bound may be widened without it.                                                                                                                                                                                                                                                                                                                                                            |
| M-02 | MEDIUM   | New                      | Public signatures accept an optional duck-typed operation budget (`admitMaterializedMapping`, `approveCommand`, `MappingLedger` constructor and `apply`, `CuratedAssetRegistry` constructor, `resolve` and `describe`, `candidateProvenanceDigest`, `canonicalExposureKey`). A fake budget plus an always-aborted signal yields a published `VALID` 64-version admission. Public helpers run fully unbudgeted; for example, a 5,000,000-character field yields a 5,000,102-character exposure key. Move budget parameters to internal entry points, and validate and budget public helpers or make them internal.                                                                                                                                                                                                                            |
| L-01 | LOW      | Informational            | 18 Markdown hard-break trailing spaces flagged by range `git diff --check` in two documents (introduced in `e3aa20e`). No action is required for acceptance; normalize at the next authorized documentation edit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| E-01 | LOW      | Closed this cycle        | The acceptance-4 `ENOSPC` warning did not recur. Fresh installs in two copies succeeded with adequate disk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| E-02 | LOW      | Environmental            | The disposable build regenerated `apps/web/next-env.d.ts`; the reviewed tree is unaffected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Accepted limitations remain: cooperative (not wall-clock) cancellation, zero
approved real venue pairs, and no production mappings or live canaries in this
phase. There is no waiver for H-03, H-04 or M-01.

**Final status: FAIL. BLOCKER 0. Unresolved HIGH 2 (H-03, H-04).**
**Phase 2B.1 may freeze: NO. Phase 2B.2 eligible for separate authorization: NO.**

**Exact recommended next task:**

Authorize a fifth Phase 2B.1 acceptance remediation limited to H-03 (residual),
H-04 and M-02, in `packages/spread-analytics/**` and a new section 20 of the
implementation evidence. It should:

1. Validate and bound caller strings before any native comparison or hash, and
   charge any remaining comparison per code unit.
2. Apply the final pre-publication check to every typed outcome of
   `admitRegistryRevision` and `admitMappingCommand`, and rethrow
   cancellation and budget exhaustion instead of returning them.
3. Bound `assertEvidenceRecord` before `JSON.stringify`.
4. Enforce runtime RFC 3339 UTC timestamp validation at every caller-timestamp
   entry, with a host-`TZ` regression matrix.
5. Remove public operation-budget parameters.
6. Extend the actual-work oracle to string equality, hashing, spreads,
   concatenation and precharge verification, and to every non-success public
   outcome, with regressions reproducing each counterexample in this report.

In parallel, route M-01 to Product, Market Data and SRE as a D-064 scoped
revisit: decide the logical-step unit and the required instrument/pair capacity
under the current maxima. Do not widen any bound without that approval, and
correct §19.10.

Keep D-055, D-064, the 44 codes, manifests, lockfile, frozen scopes and all five
acceptance reports unchanged. Then request a sixth independent formal
acceptance. Do not begin Phase 2B.2.
