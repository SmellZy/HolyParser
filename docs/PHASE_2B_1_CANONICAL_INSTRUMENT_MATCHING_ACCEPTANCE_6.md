# Phase 2B.1 — sixth independent acceptance review

- Review date: 2026-10-04.
- Reviewer: an independent technical AI reviewer, a separate actor from the
  implementing session and from the authors of the five earlier reports. This
  is a technical attestation, not a human professional signature.
- Reviewed state: branch `claude/stoic-lovelace-uxfohy`, exact commit
  `1e091f9752af5896bfe21784de3d1048e6bdd63a` (tree
  `5b1412a0237a09e1c9e2478d4b246ffcd6febc68`).
  - Parent governance commit: `8f35571cb9c65f6179465bfd0de83f362bf0d729`
    (D-064 capacity-semantics decision).
  - Prior remediation baseline: `018593dd5002b2e9003ed67a5a5584a5f5ff6116`.
  - D-055 baseline: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3` (`origin/main`).
- Execution: a clean detached review worktree plus three disposable
  materializations made with `git archive`:
  - `q`, the authoritative quality run, never touched by probes;
  - `p`, the probe copy;
  - `old`, a copy of `018593d` used for cross-version comparison.

  All probes were deleted afterwards. The review worktree contains only this
  report as a change.

- Final status: **PASS_WITH_WARNINGS**. BLOCKER: **0**. Unresolved HIGH: **0**.
- Phase 2B.1 may freeze: **YES**. The freeze record must carry the open
  warnings N-01 (MEDIUM) and L-01 to L-04 (LOW) from section 15.
- Phase 2B.2 eligible for separate authorization: **YES**. This review does not
  authorize Phase 2B.2 and begins none of its work.
- This review created only this report. No implementation, test, manifest,
  lockfile, dependency, D-055, D-064, capacity decision, prior report,
  implementation evidence or frozen scope was changed. Nothing was committed,
  pushed or tagged.

## 1. Governing baseline and integrity

Checks run in the review worktree before any other work:

- `git rev-parse HEAD` is `1e091f9…`, and `git status --short` is empty.
- `git diff --check` is clean, and `git fsck --full` exits 0.
- `git log --oneline --decorate -10` shows `1e091f9` → `8f35571` → `872db41` →
  `018593d` → `e3aa20e` → `9dacc82`.
- Node is **v24.18.1** and npm **11.16.0**, from the checksum-verified
  toolchain supplied for the review.

Read completely: `AGENTS.md`; `MASTER_SPEC.md`; the Phase 2B plan and its
architecture acceptance; ADR-0009; D-055 and its acceptance; D-064; the
capacity-semantics decision; the implementation evidence (section 20 is the
claim set under review, and §19.10 is the corrected statement); all five prior
reports; the relevant parts of `DOMAIN_MODEL`, `API_CONTRACTS_PLAN`,
`SECURITY_MODEL`, `RISK_REGISTER`, `DECISIONS_REQUIRED` and
`ACCEPTANCE_CRITERIA`; every runtime and test module under
`packages/spread-analytics/**`; and the full `git diff 8f35571 1e091f9`.

The authors' green tests, oracle results and evidence were treated as claims
to falsify. Every verdict below rests on probes written for this review.

| Artifact                                                                              | SHA-256 (recomputed)                                               | Status                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| [D-055 decision](PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION.md)                       | `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931` | matches the mandated value                         |
| [D-064 approval](PHASE_2B_D064_MATCHING_APPROVAL.md)                                  | `85fb7792cf66a9443da60bdcdbbe07daab5dce159bcda82ebaffe032b5e8fbe8` | matches the mandated value                         |
| [Capacity-semantics decision](PHASE_2B_D064_CAPACITY_SEMANTICS_DECISION.md)           | `98552f5d837e291e8d02bbb5525b2bb17caa47bab4ee41c1e38372fa42ebfbe1` | unchanged since `8f35571`                          |
| [D-055 acceptance](PHASE_2B_D055_ACCEPTANCE.md)                                       | `18d1cbb38c2db218cc11b25f3a89279be76b7f335703881e688f887864df3495` | unchanged                                          |
| [First acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE.md)            | `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0` | unchanged since `8f35571`                          |
| [Re-acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_REACCEPTANCE.md)             | `22bb95806e7e8cd300e6ef49e87654528c6fbb775df344b1335c5e61baf028c4` | unchanged                                          |
| [Third acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_3.md)          | `bd5fa6a38404e9d40e35513176f94a752025fd7152653dc5d4b64811592295e0` | unchanged                                          |
| [Fourth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_4.md)         | `a54dd81821332cce15db3ce57be121eb7875bd02e87da1b20e4c537d3062b3ee` | unchanged                                          |
| [Fifth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_5.md)          | `4505f418820b43d9d44ad2528f52371450cb7550fcf17ceb22ee35b9e4d67d51` | matches the hash recorded in the capacity decision |
| [Implementation evidence](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_IMPLEMENTATION.md) | `36c247fb70667e8e2a1f93ed4cdf328342935df38f570f1231acdd6e385168b2` | changed only in §19.10 and the new §20             |
| Root `package.json`                                                                   | `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` | matches the mandated value                         |
| `package-lock.json`                                                                   | `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59` | matches the mandated value                         |
| Brand references: dark, design system, logo                                           | `e4a53ef9…0dbe08`, `459f2354…68c54`, `5050e13e…82a8c`              | match the mandated values                          |

`git diff --name-only 8f35571 1e091f9` lists:

- the implementation evidence;
- 13 runtime modules plus the new `time.ts`;
- the test-only `work-oracle.ts`;
- five test files (two new: `fifth-acceptance-remediation` and
  `work-accounting-source-audit`).

`index.ts`, `policy.ts`, `reasons.ts`, `model.ts`, the package `package.json`
and `tsconfig.json`, `d055-scenarios.test.ts`, `serialization.test.ts` and
`test-fixtures.ts` are byte-identical to `018593d`.

## 2. Required finding verdicts

| Finding                                         | Verdict                                                                   | Independent basis                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 — forged history/transition authority      | **RESOLVED (no regression) for data inputs**                              | These all fail admission: dropped transitions and a flipped transition type (`CONFLICTING`/`TRANSITION_REJECTED`); forged v1 `SUPERSEDED` + `supersededBy` and a forged `invalidationReference` (`DIGEST_MISMATCH`); a forged reason (`INVALID_PROVENANCE`); a forged command digest. A spread fake handle is rejected by replay (`INPUT_INVALID`). SUPERSEDE and CORRECT records with identical fields get different digests. Non-data accessor inputs are a new class: see N-01, section 15. |
| B-02 — immutable admitted replay                | **RESOLVED (no regression)**                                              | Admission ran from a fully mutable `JSON` deep copy. Afterwards, mutating the caller's statuses, exposure key and transitions and the input mapping left the history digest and replay revision unchanged. The handle, versions, approvals and result are frozen, and assigning to a frozen version throws `TypeError`.                                                                                                                                                                        |
| H-01 — product scope before identity            | **RESOLVED (no regression)**                                              | SPOT, dated, unsupported, unknown, option and inverse partners produce candidates with no exposure key and no product class. A valid perpetual produces the golden exposure key `instrument-exposure-pilot/v1\|10:DERIVATIVE7:asset:A…9:BASE_UNIT` with no reasons.                                                                                                                                                                                                                            |
| H-02 — public API closure                       | **RESOLVED (no regression)**                                              | A fresh `dist/index.js` exposes exactly **22** runtime exports with unchanged names. There is no `export *` in source or `dist`, and no oracle in `dist`. Deep imports of `dist/time.js`, `dist/bounds.js`, `dist/work-oracle.js` and `./bounds` all return `ERR_PACKAGE_PATH_NOT_EXPORTED`.                                                                                                                                                                                                   |
| H-03 — cumulative logical work and cancellation | **RESOLVED**                                                              | All eight acceptance-5 counterexamples are closed (section 3). The charge-before-work audit and the independent per-native-call precharge probe found no uncharged proportional path for data inputs (sections 6–7). Every abort placement in 23 typed outcomes throws, with tail 0 (section 8). The documented key-enumeration exception is accepted as a limitation (A-02).                                                                                                                  |
| H-04 — runtime timestamp validation             | **RESOLVED**                                                              | One strict grammar is enforced in O(1)-gated, charged integer arithmetic. 207,346 cases match an independent reference with zero mismatches. Three separate host-time-zone processes give identical digests and identical rejections (section 4).                                                                                                                                                                                                                                              |
| M-01 — capacity semantics                       | **RESOLVED — accepted semantics (all four reliance conditions verified)** | 1. §19.10 is corrected and makes no reachable-maximum claim. 2. 1,024 instruments, and 1,023 with zero pairs, both fail with typed `MATCHING_BOUND_EXCEEDED`: no publication, inputs and registry revision unchanged. 3. Rates are internal and stricter than `018593d` in all 14 measured operations (section 12). 4. H-03 is resolved.                                                                                                                                                       |
| M-02 — caller-supplied budget authority         | **RESOLVED**                                                              | 18 public callables were each run with three extra fake-budget arguments (permissive, never-cancel, counter-reset) and a throwing tripwire proxy. All results were identical to baseline, and the proxy was never read. An always-aborted signal plus fake budgets throws `EVALUATION_CANCELLED` on all 8 signal-taking operations (section 5).                                                                                                                                                |

## 3. Acceptance-5 counterexamples (independent probes)

Every probe below was written for this review and run in the disposable copy
`p`. Steps were read from a `WorkBudget` observer, and polls by counting reads
of the signal's `aborted` getter.

| #   | Counterexample                                                                                                               | Result now                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Verdict    |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A   | Forged `INVALIDATE_MAPPING` with seven ~8,000,000-character, equal but distinct fields                                       | `INPUT_INVALID` at the first oversized field's O(1) length gate. 8 charged steps at both 1,000,000 and 8,000,000 characters. A proxy recorded **0** reads of the transition, so no comparison, hash or lookup ran. 0.11 ms internally; public `admitMappingCommand` returns `REJECTED/INPUT_INVALID` with 2 polls (constructor and final) in 0.044 ms. Variant: with bounded command fields and 8,000,000-character transition copies, 19 steps at both sizes (`COMMAND_DIGEST_CONFLICT`); the length gates make the comparisons O(1). | **CLOSED** |
| B   | `admitRegistryRevision` QUARANTINED, cancellation requested after the first check                                            | Plain run: `QUARANTINED/ALIAS_CHAIN_FORBIDDEN` with 2 polls. Aborting at poll 2 throws `EVALUATION_CANCELLED`, and nothing is returned.                                                                                                                                                                                                                                                                                                                                                                                                | **CLOSED** |
| C   | `admitMappingCommand` REJECTED, cancellation requested after the first check                                                 | Plain run: `REJECTED/MAPPING_REVISION_CONFLICT` with 2 polls. Aborting at poll 2 throws `EVALUATION_CANCELLED`.                                                                                                                                                                                                                                                                                                                                                                                                                        | **CLOSED** |
| D   | Mid-operation cancellation must propagate, never return `REJECTED/EVALUATION_CANCELLED`                                      | A valid approve command on a 300-version ledger: `APPLIED` with 28 polls. All **27/27** abort placements throw `EVALUATION_CANCELLED`, and none returns a typed result. On a 4,096-version ledger the command throws `MATCHING_BOUND_EXCEEDED` (never `REJECTED`), and the source ledger is unchanged.                                                                                                                                                                                                                                 | **CLOSED** |
| E   | Evidence record with a 4,000,000-character field                                                                             | `MATCHING_BOUND_EXCEEDED` with **0** `JSON.stringify` calls, a 2-unit largest native call (`Object.keys`), 5 charged steps and 1 poll, in 0.08 ms. Earlier this was one 4,000,387-unit call. A 160-character control is accepted with one stringify of 564 characters. An accessor-based variant is a new class: see N-01.                                                                                                                                                                                                             | **CLOSED** |
| F   | `"2026-09-15 00:00:30"` gave MATCHED/UTC, UNAVAILABLE/New York, AMBIGUOUS/Tokyo                                              | In separate `TZ=UTC`, `TZ=America/New_York` and `TZ=Asia/Tokyo` processes (offsets 0, 300 and −540 minutes):<br>• `evaluateMatch`, `generateCandidates` and `replayMapping` throw `EVIDENCE_TIME_INVALID`;<br>• admission returns `INVALID_INTERVAL/EVIDENCE_TIME_INVALID`;<br>• the same holds for `"2026-09-15T00:00:30"`, `+09:00` offsets and the legacy form;<br>• the canonical authoritative digest is identical in all three (section 4).                                                                                      | **CLOSED** |
| G   | 100,023-character legacy `"Sep 15 2026 00:00:30 (ccc…)"`                                                                     | Rejected by the length gate with **0** charged steps. `evaluateMatch` throws `EVIDENCE_TIME_INVALID`.                                                                                                                                                                                                                                                                                                                                                                                                                                  | **CLOSED** |
| H   | Fake budget `{step(){},units(){},beforePublication(){},steps:0}` plus an always-aborted signal to `admitMaterializedMapping` | Throws `EVALUATION_CANCELLED`. The abort getter was read once, at the constructor check, so the fake budget had no effect. The control without abort returns `VALID`.                                                                                                                                                                                                                                                                                                                                                                  | **CLOSED** |

## 4. Timestamp and host-time-zone verdict (H-04)

The grammar is `YYYY-MM-DDTHH:mm:ss.sssZ`: exactly 24 code units, UTC,
milliseconds, years 0000–9999.

- **Order of work:** `epoch` rejects any non-string or wrong-length value
  before any scan. It then charges 25 units and validates fixed separators,
  ASCII digits and the calendar.
- **No host clock:** it computes the instant with integer days-from-civil
  arithmetic. There is no `Date` in any runtime source.
- **Exhaustive checks against an independent reference** (regex plus a
  `setUTCFullYear` round trip):
  - a calendar sweep of 15 years × months 00–13 × days 00–32 (6,930 cases),
    including the 1900, 2000, 2100 and 2400 leap rules and the 0000 and 9999
    boundaries;
  - 416 time-of-day cases (hour 24, minute and second 60/61/99).

  Both sweeps have **0 mismatches**.

- **Fuzz:** 200,000 mutations with lowercase `t`/`z`, `+`, space, NUL, tab,
  newline, NBSP, U+0660 and U+FF10 digits; 51,019 were accepted. **0
  mismatches.**
- **Specific rejections:** 2023-02-29, 1900-02-29, month 00 and 13, April 31,
  24:00, :60 minutes and seconds, `.00Z`, `.0000Z`, lowercase `z`, `+00:00`, a
  space separator, lowercase `t`, leading or trailing NUL, a NUL inside the
  fraction, fullwidth and Arabic-Indic digits, `+`/`-00` year prefixes, the
  local and zone-less forms, and the 100,023-character legacy string.
- **Accepted:** 0000-01-01 (−62,167,219,200,000 ms) and 9999-12-31T23:59:59.999Z
  (253,402,300,799,999 ms).

**Separate-process host-time-zone matrix.** A probe ran admission, candidates,
`evaluateMatch`, a two-item batch, AS_KNOWN and CORRECTED replay, and evidence
validation, and hashed every authoritative output:

| Host `TZ`          | Offset (min) | Authoritative digest                                               | Outcomes                                                            | Local, zone-less, `+09:00` and legacy inputs                           |
| ------------------ | -----------: | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `UTC`              |            0 | `d63697e2e09cea461b1361b1c4c2d96bb8b9af3901d153a0318ef678a3402c38` | VALID, MATCHED, [MATCHED, NOT_MATCHED], [MATCHED, MATCHED], 2 cands | identical `EVIDENCE_TIME_INVALID` throws; admission `INVALID_INTERVAL` |
| `America/New_York` |          300 | identical                                                          | identical                                                           | identical                                                              |
| `Asia/Tokyo`       |         −540 | identical                                                          | identical                                                           | identical                                                              |

The full spread-analytics suite was also run in `q` under each of the three
zones: 19/19 files and 266/266 tests each. **Verdict: PASS.**

## 5. Public budget authority verdict (M-02)

- **Exports.** The fresh `dist/index.js` exports exactly 22 names:
  - two classes: `CuratedAssetRegistry` (constructor length 1, `resolve` 6,
    `describe` 3) and `MappingLedger` (constructor 0, `apply` 1,
    `commandDigest` 1, `commandDigestSnapshot` 0);
  - `MatchingFailure`;
  - 14 functions;
  - five constants, including the 44-entry `MATCH_REASON_CODES`.

  No public signature has a budget parameter. Budgeted entry points such as
  `registryWithBudget`, `ledgerWithBudget`, `applyWithBudget`,
  `resolveWithBudget` and the `…WithBudget` helpers are module-internal and
  absent from the root.

- **Constructor hand-off.** Constructors read the module-private hand-off and
  clear it on entry.
- **Fake-budget probe.** Each of 18 public callables was called with
  `[fake, fake, fake]` extra arguments, for four kinds of fake:
  - a permissive budget;
  - a never-cancel budget;
  - a counter-reset budget;
  - a proxy that throws on any property access.

  Every result was byte-identical to the baseline, and the throwing proxy was
  never touched.

- **Aborted signal.** With an always-aborted signal plus fake budgets,
  `admitMaterializedMapping`, `admitMappingCommand`, `admitRegistryRevision`,
  `generateCandidates`, `evaluateMatch`, `evaluateBatch`, `replayMapping` and
  `validateEvidenceBundle` all throw `EVALUATION_CANCELLED`.
- **`new WorkBudget(` sites: exactly 23** in runtime modules.
  - Each is either a public operation root or a `parent ?? new WorkBudget()` /
    `operationBudget ?? new WorkBudget()` fallback for a standalone call.
  - No operation creates a nested root budget: the internal paths pass `work`
    to `createTransitionRecord`, `registryWithBudget` and `ledgerWithBudget`.
  - No helper resets a parent budget. `#units` is cleared only in
    `beforePublication`, after a full step has been charged for the remainder
    (a round-up).

**Verdict: PASS.**

## 6. Work-accounting audit (own charge-before-work source review)

Classification of every authoritative repeated-work path, for data inputs:

| Path class                                                    | Sites (examples)                                                                                                                          | Classification                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equality of two open strings                                  | `sameText` everywhere (admission chains, ledger binding, registry and evaluator identity, economics units, replay ID)                     | **Charged incrementally**: length + 1 for equal lengths, before the native compare. The remaining native `===`/`!==` compares are against fixed literals or between `inVocabulary`-bounded enums (`payoff.value`, `role`, `reasonCode`): **bounded constant**.                                                                                                                     |
| Map/Set hashing of strings                                    | `chargeKey` and `inVocabulary` in every module                                                                                            | **Charged incrementally** before hashing. Construction of fixed-vocabulary sets (`new Set(allowed)`): **bounded constant**, at most about 40 units, measured.                                                                                                                                                                                                                      |
| Length and shape gates                                        | `assertAtomicId` (160), `assertCompositeId` (4,096), `assertReasonText` (512), `epoch` (24), `MAXIMUM_SCHEMA_TOKEN` (64)                  | **O(1) before work**, then the scan is **precharged** (atomic: 4 units per code unit; composite: 2n + 1 units plus the 256 per step scan; reason: scan plus n·(angles + 1) for the regex worst case).                                                                                                                                                                              |
| Canonical encoding and hash input preparation                 | `quote`, `encode`, `canonicalSerialize`, `deterministicId`, `sha256`, `lp`/`canonicalExposureKeyWithBudget`                               | **Precharged**: length + 2 before `JSON.stringify`, escape expansion immediately after, join length before `join`, domain + canonical before concatenation, input length before `update`. Ropes are flattened by charged consumers.                                                                                                                                                |
| UTF-8 comparison and sort                                     | `compareUtf8WithBudget` (two encodes + 3·min compare); every `sort` uses a charged comparator, or a numeric comparator with `work.step()` | **Charged incrementally** per comparison.                                                                                                                                                                                                                                                                                                                                          |
| Copies, spreads, freezes                                      | `chargeCopy` (3 × own keys + 1) before each caller-object spread; array copies charged n + 1 first                                        | Charged immediately after the single own-key pass and before the spread and freeze. Fixed-shape internal spreads are annotated: **bounded constant**.                                                                                                                                                                                                                              |
| Evidence `JSON.stringify` and `Buffer.byteLength`             | `assertEvidenceRecord`                                                                                                                    | Rejected before serialization when the O(1) lower bound exceeds 8 KiB. Accepted records are **precharged** at the six-character escape worst case.                                                                                                                                                                                                                                 |
| Regexes                                                       | reason markup (charged worst case); evidence `retrievalDate` (anchored, at most 8 KiB, already scanned)                                   | **Precharged** / **bounded constant**.                                                                                                                                                                                                                                                                                                                                             |
| Traversal, filter, find, map                                  | every loop carries `work.step()`                                                                                                          | **Charged incrementally**.                                                                                                                                                                                                                                                                                                                                                         |
| Registry, command and admission; history, replay, publication | as above; final freezes charged (`work.step(result.length)`, `work.units(staged.length + 1)`)                                             | **Charged**; publication tail 0 (section 8).                                                                                                                                                                                                                                                                                                                                       |
| `Object.keys` / `Reflect.ownKeys` on caller objects           | `walk`, `assertClosedKeys`, `assertShape`, `chargeCopy`                                                                                   | **Documented exception**: one native pass, charged immediately after. Accepted as limitation A-02: no JavaScript primitive bounds own-key count in O(1), and the pass is proportional to a structure the caller already built. `chargeCopy`'s `Reflect.ownKeys` also counts non-enumerable and symbol keys that the earlier 64-key gate does not see (a non-data input; see N-01). |
| UNACCEPTABLE uncharged path                                   | —                                                                                                                                         | **None found for data inputs.**                                                                                                                                                                                                                                                                                                                                                    |

Runtime validation of TypeScript-only guarantees was checked separately:

- Atomic, composite and reason strings, enums, roles, timestamps, closed key
  sets, counts and policy versions are validated at runtime.
- **Not runtime-validated:**
  - replay `mode` (L-02);
  - the identity of `evaluateMatch`'s `registry` and `candidate` before early
    non-actionable exits (L-03);
  - `ExactDecimal` instances in economics knowledge (N-01);
  - accessor-free plain-data shape (N-01).

The authors' TypeScript-checker source audit, with its non-vacuous control, is
consistent with this review. It is syntactic, so it cannot see the
validation-to-copy divergence that N-01 exploits.

## 7. Independent actual-versus-charged probe

**Method.** This instrumentation is independent of `src/work-oracle.ts`:

- It wraps `WorkBudget.prototype.step` and `units`, counting step = 128 units
  and units 1:1, with nested calls and the publication round-up not counted.
- It wraps these natives at 1 unit per code unit:
  - `JSON.stringify`, `Buffer.byteLength`, `Buffer.from`, `Buffer.compare`;
  - `Hash.update`, `Array.prototype.join`, `RegExp.prototype.test`;
  - `Map.get`, `Map.set`, `Map.has`, `Set.has`, `Set.add`;
  - `Object.keys` and `Reflect.ownKeys`, reported separately.

**Pass condition.** For every native call, `charged-before-call −
actual-before-call − cost(call) ≥ 0`. That is, each atomic call is
conservatively charged before it executes. This is stronger than
"subtract the largest call from a gap".

**Inputs.** "Short" uses 2–4 character names; "long" uses about 66 characters
(the atomic and binding-ID maximum allowed by the fixture), composite IDs and
exposure keys of 4,000 code units, 160-unit atomic IDs and 512-byte reasons.

| Operation (short / long)                    | Charged steps   | Actual native units   | Worst pre-call credit | Key-enum post-charge | Largest native call            | Max native units between polls | Outcome                   |
| ------------------------------------------- | --------------- | --------------------- | --------------------: | -------------------: | ------------------------------ | -----------------------------: | ------------------------- |
| `generateCandidates`, 20 instruments        | 15,618 / 27,895 | 1,127,518 / 2,381,242 |               40 / 40 |                    0 | `Hash.update` 573 / 1,335      |                11,684 / 14,700 | 190 candidates            |
| `admitRegistryRevision`, 60 bindings        | 1,121 / 2,047   | 32,946 / 97,206       |    −39 / −39 (note 1) |                  −44 | `Array.join` 35 / 224          |                 4,452 / 13,121 | READY                     |
| Admission, 64 versions                      | 45,237 / 53,653 | 2,098,755 / 2,843,991 |             235 / 235 |                    0 | `Hash.update` 8,568            |                13,731 / 13,571 | VALID                     |
| Admission, 64 versions, non-success         | 35,598 / 42,440 | 1,282,408 / 1,876,768 |             235 / 235 |                    0 | `Hash.update` 1,107 / 1,869    |                10,498 / 12,613 | INVALID_PROVENANCE        |
| `replayMapping`, 64 versions                | 6,774 / 6,774   | 201,085 / 201,085     |             247 / 247 |                    0 | `Hash.update` 34,753 (note 2)  |                         34,753 | MATCHED                   |
| `evaluateBatch`, 19 inputs                  | 50,100 / 61,221 | 2,239,394 / 3,150,626 |             168 / 168 |                    0 | `Hash.update` 8,568            |                12,741 / 13,557 | 19 results                |
| `admitMappingCommand` over 50 versions      | 553 / 4,803     | 4,567 / 85,342        |             381 / 736 |                    0 | `Hash.update` 394 / 13,991     |                 2,539 / 14,471 | APPLIED                   |
| `admitMappingCommand`, non-success          | 83 / 434        | 234 / 14,816          |             381 / 736 |                    0 | `Buffer.byteLength` 64 / 4,000 |                    234 / 5,696 | REJECTED                  |
| `validateEvidenceBundle`, 100 records       | 7,201 / 20,898  | 120,961 / 729,680     |        5,309 / 12,362 |                    0 | `JSON.stringify` 364 / 1,652   |                 2,458 / 10,080 | 100 records               |
| Evidence rejection, 4,000,000 / 8,190 chars | 5 / 5           | 2 / 2                 |                     — |                    0 | `Object.keys` 2                |                              0 | `MATCHING_BOUND_EXCEEDED` |

Notes:

1. The only negative pre-call credit is −39 units, at registry construction. It
   comes from hashing the fixed five-field vocabulary in `assertClosedKeys`
   (`new Set(allowed)`) before the first charge. That is a bounded constant,
   independent of input size. The −44 is the documented `Object.keys`
   exception.
2. The 34,753-unit replay call is the single atomic history-digest hash. It was
   charged in full (positive credit) before it ran, and the step charges that
   paid for it polled cancellation. That fits the one-atomic-native-call model.

**Native-call and precharge verdict: PASS.**

- Every non-exception native call was charged before it executed, apart from a
  bounded constant.
- Interruptible native work between polls never exceeded 14,700 units (below
  128 × 128 = 16,384) outside one precharged atomic call.
- Long identifiers raise charged steps in proportion: candidates
  actual/charged-units ratio 0.56 short versus 0.67 long, with charged units
  ≥ actual throughout.
- For comparison, the authors' oracle publication-tail metric was also 0 on
  all 23 outcomes (section 8).

## 8. Final-check outcome table

**Method.** For each typed outcome:

- the plain run counts polls P;
- the operation is then repeated with the signal aborted from poll k + 1, for
  every k in 0…P − 1, so each placement including the final pre-publication
  check is exercised;
- "tail" is the authors' oracle units after the last check, shown for
  comparison only.

| Outcome                                         | Polls | Abort sweep                | Tail |
| ----------------------------------------------- | ----: | -------------------------- | ---: |
| registry READY                                  |     3 | 3/3 `EVALUATION_CANCELLED` |    0 |
| registry QUARANTINED / ALIAS_CHAIN_FORBIDDEN    |     2 | 2/2                        |    0 |
| command APPLIED                                 |     2 | 2/2                        |    0 |
| command REJECTED / MAPPING_REVISION_CONFLICT    |     2 | 2/2                        |    0 |
| command QUARANTINED / MAPPING_INTERVAL_CONFLICT |     2 | 2/2                        |    0 |
| admission VALID                                 |    22 | 22/22                      |    0 |
| admission REVISION_MISMATCH                     |    16 | 16/16                      |    0 |
| admission INVALID_INTERVAL / MAPPING_EXPIRED    |    22 | 22/22                      |    0 |
| admission QUARANTINED                           |     2 | 2/2                        |    0 |
| admission INVALIDATED                           |    12 | 12/12                      |    0 |
| admission SUPERSEDED                            |    22 | 22/22                      |    0 |
| admission DIGEST_MISMATCH                       |    16 | 16/16                      |    0 |
| admission INVALID_PROVENANCE                    |     2 | 2/2                        |    0 |
| evaluation MATCHED                              |    24 | 24/24                      |    0 |
| evaluation NOT_MATCHED                          |     3 | 3/3                        |    0 |
| evaluation UNAVAILABLE (unapproved)             |     3 | 3/3                        |    0 |
| evaluation UNAVAILABLE (convention)             |     3 | 3/3                        |    0 |
| evaluation AMBIGUOUS                            |     3 | 3/3                        |    0 |
| batch                                           |    26 | 26/26                      |    0 |
| replay MATCHED                                  |     3 | 3/3                        |    0 |
| replay UNAVAILABLE                              |     3 | 3/3                        |    0 |
| candidates                                      |     6 | 6/6                        |    0 |
| evidence                                        |     2 | 2/2                        |    0 |

The authors' 18 outcomes are a subset of these 23.

- No placement published a result.
- In every public operation, the final `beforePublication()` is followed only
  by `return` (source-checked).
- Cancellation and budget exhaustion always propagate as operation failures,
  never as domain results. This was confirmed for command admission (D),
  admission (rethrow) and registry admission (only `ALIAS_CHAIN_FORBIDDEN`
  becomes QUARANTINED).
- Atomicity: the inputs, the source ledger and the registry revision were
  unchanged after every cancelled and exhausted run measured in sections 3, 11
  and 13.

**Verdict: PASS.**

## 9. D-055 policy groups (29) — independent probe

The probe used its own fixtures and the public API, not the authored scenario
file. The authored `d055-scenarios.test.ts` (byte-identical to `018593d`) also
passes **40/40**.

|   # | Expected                                      | Independent result                                                                                                                                     | Verdict |
| --: | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
|   1 | Reviewed A/USDT linear perpetual matches      | `MATCHED/COMPATIBLE_APPROVED`                                                                                                                          | PASS    |
|   2 | Same ticker, different base                   | `NOT_MATCHED/BASE_ASSET_MISMATCH`                                                                                                                      | PASS    |
|   3 | USDT vs USDC                                  | `NOT_MATCHED/SETTLEMENT_ASSET_MISMATCH`                                                                                                                | PASS    |
|   4 | Linear vs inverse                             | `NOT_MATCHED/VALUE_CONVENTION_MISMATCH`                                                                                                                | PASS    |
|   5 | Perpetual/dated and dated/dated               | `DATED_PRODUCT_EXCLUDED` both                                                                                                                          | PASS    |
|   6 | Exact 1 / 0.001 / 100 normalization           | `MATCHED` ×3; `normalizeBaseExposure(3, 0.001) = 0.003`                                                                                                | PASS    |
|   7 | Missing multiplier                            | `UNAVAILABLE/MULTIPLIER_UNKNOWN`                                                                                                                       | PASS    |
|   8 | Unknown lifecycle                             | `UNAVAILABLE/LIFECYCLE_UNKNOWN`                                                                                                                        | PASS    |
|   9 | Reviewed direct alias                         | resolves; candidate confidence `REVIEWED_MANUAL`; unapproved → `MAPPING_UNAPPROVED`                                                                    | PASS    |
|  10 | Conflicting binding                           | `QUARANTINED/ASSET_BINDING_CONFLICT`                                                                                                                   | PASS    |
|  11 | Superseded current vs historical replay       | admission of v1 → `SUPERSEDED`; replay → `MATCHED` v2                                                                                                  | PASS    |
|  12 | Reviewed rebrand keeps identity               | display name `asset:A` → `New Brand`; resolution still `KNOWN`                                                                                         | PASS    |
|  13 | Ticker-only collision                         | `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN`                                                                                                                     | PASS    |
|  14 | Unsupported family                            | `PRODUCT_UNSUPPORTED` (OTHER, OPTION)                                                                                                                  | PASS    |
|  15 | 60 s accepted, 60 s + 1 ms stale              | `MATCHED` / `UNAVAILABLE/EVIDENCE_STALE`                                                                                                               | PASS    |
|  16 | Zero / negative multiplier                    | `UNAVAILABLE/MULTIPLIER_INVALID` ×2 (genuine `ExactDecimal`; fake-decimal objects are N-01)                                                            | PASS    |
|  17 | Incompatible unit                             | `NOT_MATCHED/CONTRACT_UNIT_MISMATCH`                                                                                                                   | PASS    |
|  18 | Unapproved candidate                          | candidate `INCOMPLETE`; evaluation `MAPPING_UNAPPROVED`                                                                                                | PASS    |
|  19 | Quarantine / invalidation                     | `QUARANTINED/MAPPING_QUARANTINED`; `UNAVAILABLE/MAPPING_INVALIDATED`                                                                                   | PASS    |
|  20 | Unknown convention / capability               | `VALUE_CONVENTION_UNVERIFIED`; `CAPABILITY_UNAVAILABLE`                                                                                                | PASS    |
|  21 | Alias chain / cycle / self                    | `QUARANTINED/ALIAS_CHAIN_FORBIDDEN` ×3                                                                                                                 | PASS    |
|  22 | Economics contradiction                       | `QUARANTINED/METADATA_EVIDENCE_CONFLICT`                                                                                                               | PASS    |
|  23 | Overlapping intervals                         | command `QUARANTINED/MAPPING_INTERVAL_CONFLICT`                                                                                                        | PASS    |
|  24 | Inactive lifecycle                            | `LIFECYCLE_NOT_ACTIVE` (SUSPENDED, DELISTED, PRE_LAUNCH)                                                                                               | PASS    |
|  25 | Expired / over 30 days                        | `INVALID_INTERVAL/MAPPING_EXPIRED`; a 31-day interval is rejected `EVIDENCE_TIME_INVALID`                                                              | PASS    |
|  26 | Forged authority rejected                     | forged digest, status, `supersededBy` and approvals → `DIGEST_MISMATCH`; fake handle → `INPUT_INVALID` (data inputs; see N-01)                         | PASS    |
|  27 | OKX special families                          | `SPECIAL_PRODUCT_EXCLUDED` (`OKX_PRE_MARKET`, `OKX_XPERP`)                                                                                             | PASS    |
|  28 | AS_KNOWN / CORRECTED replay                   | AS_KNOWN (cutoff T30) `MATCHED`; CORRECTED (cutoff T+1d) `UNAVAILABLE/MAPPING_INVALIDATED`; versions frozen                                            | PASS    |
|  29 | Resource / cancellation bound and permutation | three permutations of 9 instruments give byte-identical candidate IDs (18 pairs); every bound, cap and cancellation result in sections 3, 8, 11 and 13 | PASS    |

**29/29 groups PASS. 40/40 authored cases pass.**

## 10. Reason catalogue

`MATCH_REASON_CODES` has **44** entries, all unique. `reasons.ts` is
byte-identical to `018593d`, so no code was added. Every outcome observed in
this review uses a catalogue code. **Verdict: 44/44 PASS.**

## 11. D-064 limits (boundary and one-over) and aggregate assessment

The authored boundary tests all pass (`bounds` and `candidate-bounds` are part
of the 132/132 focused run). Independent checks:

| Limit                        |                     Value | Independent evidence                                                                                                                                                                                                                     | Verdict |
| ---------------------------- | ------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Instruments                  |                     1,024 | 1,025 → `Instrument bound exceeded.` (1 poll); 1,024 and 1,023 (zero pairs) → work bound, no publication; 60-pair universe publishes                                                                                                     | PASS    |
| Partners / pairs             |                32 / 8,192 | authored boundary and one-over tests pass; the pair cap is unchanged in source                                                                                                                                                           | PASS    |
| Bindings / alias depth       |                 4,096 / 1 | authored tests; alias chain, cycle and self → QUARANTINED                                                                                                                                                                                | PASS    |
| Mapping versions / events    |                64 / 4,096 | 64-version admission and replay measured; authored one-over tests                                                                                                                                                                        | PASS    |
| Evidence per subject / total |               32 / 32,768 | authored tests                                                                                                                                                                                                                           | PASS    |
| Evidence record              |                     8 KiB | ASCII 8,192 accepted / 8,193 rejected; 3-byte `€` 8,192 accepted / 8,193 rejected; escape-heavy (8,359) rejected; 4,000,000 rejected before stringify                                                                                    | PASS    |
| Conflicts / diagnostics      |                 128 / 200 | authored tests                                                                                                                                                                                                                           | PASS    |
| Atomic / composite / reason  | 160 (640 B) / 4,096 / 512 | O(1) gates measured (sections 3 and 6)                                                                                                                                                                                                   | PASS    |
| Timestamps                   |    strict UTC millisecond | section 4                                                                                                                                                                                                                                | PASS    |
| JSON depth / nodes / keys    |         16 / 100,000 / 64 | depth-20 and 65-key evidence rejected; 9,000-element array over the byte bound rejected                                                                                                                                                  | PASS    |
| Cumulative logical work      |                   100,000 | `step(99,999)` and `step(100,000)` OK; `step(100,001)` and 100,000 + 1 fail; 99,999 + 127 units + publication OK, + 1 more unit fails; distributed three-phase operation (34,992 steps) succeeds at exactly 100,000 and fails at 100,001 | PASS    |
| Cancellation interval        |               ≤ 128 steps | maximum observed charged gap **128** over 276 checks; maximum interruptible native work between polls 14,700 units (section 7)                                                                                                           | PASS    |

**Aggregate D-064 assessment: PASS.**

- **Cumulative work:** one budget per operation, with distributed exactness
  proven.
- **≤128 interval:** measured, not inferred.
- **Charge before work:** section 7.
- **Final checks:** section 8.
- **Budget authority:** public budget authority is absent (section 5).
- **Atomic publication:** no partial publication in any cancelled or exhausted
  run.
- **Option A:** section 12.

This holds for the data-only input boundary that D-055 declares. N-01 records
the non-data qualification.

## 12. Capacity semantics (Option A) verdict and accounting conservatism

Option A holds:

- Structural ceilings keep their own preflight and one-over checks (1,025
  instruments fail structurally).
- The 100,000 budget fails closed below the ceilings (1,023 with zero pairs and
  1,024), with typed `MATCHING_BOUND_EXCEEDED`, no publication, unchanged inputs
  and an unchanged registry revision.
- No minimum capacity is claimed. §20.9's figures are labelled informational.
- No bound or rate was widened.

**Rates are no less conservative than `018593d`.** An identical cross-version
probe ran on the byte-identical fixtures, counting charged units the same way:

| Operation                    |     `018593d` steps |     `1e091f9` steps | Result   |
| ---------------------------- | ------------------: | ------------------: | -------- |
| candidates, 20, short / long | 14,747.7 / 25,336.1 | 15,617.6 / 27,894.5 | stricter |
| registry, short / long       |     993.4 / 1,653.4 |   1,120.8 / 2,046.6 | stricter |
| admission 16, short / long   | 10,990.4 / 12,852.9 | 11,699.6 / 13,916.1 | stricter |
| replay 16, short / long      |       915.0 / 915.0 |       915.5 / 915.5 | stricter |
| batch 19, short / long       | 15,134.1 / 18,784.5 | 16,562.7 / 21,484.2 | stricter |
| command, short / long        |         56.9 / 72.8 |        97.2 / 130.6 | stricter |
| evidence 50, short / long    |   2,597.2 / 3,504.7 |   3,630.8 / 5,104.4 | stricter |

All 14 measurements are equal or stricter, and every rate is internal.
**Capacity verdict: PASS. M-01 reliance conditions 1–4: all met.**

## 13. Serialization and digest verdict

A cross-version material probe ran identically on `018593d` and `1e091f9`. It
covered:

- the golden vector;
- candidate IDs, exposure keys and evidence-set digests;
- command digests for a 4-version history;
- transition digests for the supersede chain, an invalidation and a standalone
  record;
- the admitted-history digests of the APPROVED and INVALIDATED histories;
- four replay revisions (AS_KNOWN and CORRECTED for both histories);
- batch result IDs;
- the candidate provenance digest.

Both versions give the same combined SHA-256:
**`80029f7e98392ea91f06cd6e2300f47eeeb6eb80110ee348ab3de78b9b985850`**. The
golden vector is
`786dc0d4cb92c23193e62d6f6ef1b0ad5c15d8c47eae0745c7b352fc2e1407ef`, and
`serialization.test.ts` is unchanged. **Verdict: PASS (stable).**

## 14. Real-venue verdict

The economics fixtures match the frozen adapters:

| Venue   | Contract multiplier (adapter) | Value convention (adapter)                |
| ------- | ----------------------------- | ----------------------------------------- |
| OKX     | `known(ctVal)`                | known                                     |
| Binance | `unverified`                  | `researchRequired` (`mapping.ts:197–200`) |
| Bybit   | `unverified`                  | `known("LINEAR")` (`mapping.ts:162–165`)  |

Results:

- OKX↔Binance: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`, `VALUE_CONVENTION_UNVERIFIED`].
- OKX↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`].
- Binance↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN` (gaps on both legs),
  `VALUE_CONVENTION_UNVERIFIED` (Binance)].

The package holds no registry data or approved mapping data. There are **zero
approved real venue pairs**. **Verdict: PASS (fail-closed, unchanged).**

## 15. Hostile-input and atomicity sweep — new findings

The data-input sweep passed. It covered oversized, Unicode-heavy,
escape-heavy, nested, many-key, array, number, lone-surrogate, control-character,
`toJSON`, custom-prototype, extra-key, forged-digest and fake-handle inputs
(sections 3, 9 and 11).

A sweep of **non-data JavaScript objects** found one class of defect not reported
by any earlier review. **The defect is pre-existing.** The same probes give the
same results at `018593d`.

**N-01 (MEDIUM): published values can diverge from validated values for
non-data caller objects.** Validation reads caller properties. The published
frozen copy is then made by spreads, index-based `map` or later reads that
re-read the caller object. An object with accessor properties, an array with an
own `Symbol.iterator`, or a duck-typed decimal can therefore return different
values to validation and to the copy. Probes:

- **Evidence: uncharged stringify.** An enumerable `sourceDigest` getter
  returns `"digest"` to the walk and a 4,000,000-character string to
  `JSON.stringify`. The result is one uncharged 4,000,404-code-unit stringify,
  followed by `MATCHING_BOUND_EXCEEDED`.
- **Evidence: unvalidated publication.** If the getter switches at the final
  copy instead, `validateEvidenceBundle` publishes a frozen record with a
  **4,000,000-character** `sourceDigest`.
- **Public exposure key.** `canonicalExposureKey` with a `baseAssetId` getter
  returns a **2,000,106-character** key. A direct 2,000,000-character field is
  correctly rejected with `INPUT_INVALID`.
- **Registry.** An `assets` array whose own iterator yields a valid record,
  while index 0 holds a 500,000-character `displayName` and an empty
  `reviewedBy`, makes `admitRegistryRevision` return `READY` with the
  unvalidated record.
- **Admission and evaluation (the material case).** Accessors on
  `mapping.left/rightInstrumentId` and six candidate revision and digest fields
  switch only at their final read. Then:
  - `admitMaterializedMapping` returns `VALID` with an admitted history whose
    version names an instrument that the command never approved;
  - `evaluateMatch` returns **`MATCHED/COMPATIBLE_APPROVED` for an unapproved
    pair**, reusing an approval for a different pair. The honest control is
    `QUARANTINED/DUPLICATE_EXPOSURE_CONFLICT`.
- **Fake decimals.** Duck-typed objects in place of `ExactDecimal`
  (`isZero`/`isNegative`/`equals`) are not runtime-checked. Fakes on both
  multiplier fields reach `MATCHED`.

**Severity rationale: MEDIUM, not BLOCKER or HIGH.**

- D-055 and `SECURITY_MODEL` define a **data-only** matching boundary: untrusted
  metadata and mapping references arrive as data. JSON-parsed or frozen
  market-data objects cannot carry accessors, custom iterators or fake decimal
  classes.
- Every vector requires deliberately hostile code inside the same process.
  Such code can defeat any in-library control directly. For example,
  replacing `WeakSet.prototype.has` makes a spread fake history handle replay
  as `MATCHED` (probe result: `INPUT_INVALID` before the patch, `MATCHED`
  after). The accepted B-01 design already relies on a non-hostile process.

On the other hand, the defect refutes the evidence claim that §20.4 makes
("plain data only") and the invariant "published equals validated". Its
outcome class is the same as the original B-01. It should therefore be fixed,
or explicitly scoped by the authority, before any Phase 2B.2 component passes
non-adapter-produced objects into these APIs.

**Required resolution.** Before validation, snapshot every caller input into
own data properties. Either reject accessor descriptors, non-plain arrays and
non-enumerable or symbol keys, or copy each field exactly once. Then validate
and publish only that snapshot. Add an `instanceof ExactDecimal` check, or a
bounded decimal re-parse, for economics knowledge values. Add regressions for
each probe above. Alternatively, record an explicit authority decision that
non-data inputs are out of contract.

Other new LOW findings, all pre-existing at `018593d`, all fail-safe or
non-actionable:

- **L-02 (replay mode).** Replay `mode` is not runtime-validated. `"BOGUS"`,
  `7` or `{nested}` replay with AS_KNOWN semantics and are echoed into the
  published result and the `replayRevision` input.
- **L-03 (caller objects published unvalidated).**
  - `evaluateMatch` publishes the caller's unvalidated, mutable `candidate`
    object by reference in non-VALID results (for example
    `UNAVAILABLE/MAPPING_UNAPPROVED`).
  - It reads `registry.revision.revision` from an object that is not a
    `CuratedAssetRegistry` before early `NOT_MATCHED` exits. The probe
    published a 1,016-character forged `registryRevision`; other paths throw
    `TypeError`.
- **L-04 (untyped exceptions).** Some malformed inputs escape as untyped
  `TypeError` rather than a typed `MatchingFailure`. Examples: an explicitly
  `undefined` candidate field in admission, a string multiplier, a
  non-iterable batch, and a missing field in `candidateProvenanceDigest`.
  These fail closed with no publication.

## 16. Exact test and build results (fresh copy `q`)

The verification ran in a fresh `git archive` materialization of `1e091f9`
with no `node_modules` or `dist`, on Node v24.18.1 and npm 11.16.0.

**Install:**

- `npm ci` exit 0: **450 added / 459 audited**.
- `npm audit`: 13 advisories (2 moderate, 10 high, 1 critical). The lockfile is
  byte-identical (`810aaa67…ee3d59`), so this is audit-database drift, not a
  dependency change.
- `npm query`: 451 packages, 8 workspaces.

**Quality, tests and build:**

- `npm run format:check`, `lint`, `typecheck`, `test` and `build`: **all exit
  0**.
- Full `npm test`: **54 test files** (51 passed, 3 opt-in live-canary files
  skipped); **526 passed, 0 failed, 3 skipped**.
  - contracts 4;
  - market-data 57;
  - spread-analytics **266 (19 files)**;
  - OKX 52 (+1 skipped);
  - Binance 72 (+1 skipped);
  - Bybit 69 (+1 skipped);
  - web 6.
- Build: six static routes (`/`, `/_not-found`, `/forgot-password`, `/login`,
  `/register`, `/verify-email`). The build regenerated `apps/web/next-env.d.ts`
  in the disposable copy only (E-02, environmental).

**Focused and matrix runs:**

- Focused run (fifth remediation, source audit, oracle, D-055 scenarios,
  bounds, candidate bounds): **6 files, 132/132**. `d055-scenarios` alone:
  **40/40**.
- Host-time-zone matrix: the spread-analytics suite under `TZ=UTC`,
  `America/New_York` and `Asia/Tokyo` gave **19/19 files, 266/266 tests**
  each.

**Repository checks:**

- Markdown local links: before this report, 76 files, 96 links, 74 local, **0
  broken**. Section 17 gives the result after adding this report.
- `git diff --check`: clean in the worktree and for `8f35571..1e091f9`. The
  `9dacc82..1e091f9` range still reports the 18 pre-existing Markdown
  hard-break spaces (7 in `…ACCEPTANCE_3.md`, 11 in `…IMPLEMENTATION.md`;
  L-01, unchanged).
- `git fsck --full`: exit 0.

## 17. Frozen-boundary evidence

`git diff 8f35571 1e091f9` is **empty** for all of the following:

- `packages/market-data` and `packages/contracts`;
- `packages/design-tokens`;
- the OKX, Binance and Bybit adapters;
- `apps`, `infra` and `docs/brand`;
- the root `package.json` and `package-lock.json`;
- D-055, the D-055 acceptance, D-064 and the capacity decision;
- all five prior reports;
- the D1 and D2 documents.

The diff from `9dacc82` for the frozen packages, `apps`, `infra`,
`docs/brand`, D-055, its acceptance, D-064 and the D1/D2 documents is also
empty. All mandated hashes match (section 1).

After this report was added, the Markdown link check gives 77 files and **0
broken** local links, and `git status --short` in the review worktree lists only
`?? docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_6.md`.

## 18. Findings table

| ID   | Severity            | State                         | Evidence                                                                                                                         | Required resolution                                                                                                                                                                                                |
| ---- | ------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B-01 | BLOCKER (historic)  | RESOLVED                      | section 2; section 9, groups 26 and 28                                                                                           | none; N-01 tracks the non-data class                                                                                                                                                                               |
| B-02 | BLOCKER (historic)  | RESOLVED                      | section 2                                                                                                                        | none                                                                                                                                                                                                               |
| H-01 | HIGH (historic)     | RESOLVED                      | section 2                                                                                                                        | none                                                                                                                                                                                                               |
| H-02 | HIGH (historic)     | RESOLVED                      | sections 2 and 5                                                                                                                 | none                                                                                                                                                                                                               |
| H-03 | HIGH                | RESOLVED                      | sections 3 and 6–8, 11                                                                                                           | none                                                                                                                                                                                                               |
| H-04 | HIGH                | RESOLVED                      | section 4                                                                                                                        | none                                                                                                                                                                                                               |
| M-01 | MEDIUM              | RESOLVED — accepted semantics | section 12; capacity decision §5 conditions 1–4 met                                                                              | none                                                                                                                                                                                                               |
| M-02 | MEDIUM              | RESOLVED                      | section 5                                                                                                                        | none                                                                                                                                                                                                               |
| N-01 | MEDIUM              | NEW, open (pre-existing)      | section 15: accessor, iterator and duck-decimal divergence; uncharged 4,000,404-unit stringify; `MATCHED` for an unapproved pair | Snapshot caller inputs to own data properties once, then validate and publish only the snapshot; runtime-check decimals; add regressions. Or record an authority decision scoping non-data inputs out of contract. |
| L-01 | LOW                 | Informational (carried)       | 18 hard-break spaces in the `9dacc82` range                                                                                      | normalize at the next authorized documentation edit                                                                                                                                                                |
| L-02 | LOW                 | NEW, open (pre-existing)      | replay `mode` not runtime-validated                                                                                              | validate `mode` ∈ {AS_KNOWN, CORRECTED} before work                                                                                                                                                                |
| L-03 | LOW                 | NEW, open (pre-existing)      | unvalidated caller `candidate` / `registry` echoed in non-actionable evaluation results                                          | validate or omit caller candidates; brand-check the registry before any exit                                                                                                                                       |
| L-04 | LOW                 | NEW, open (pre-existing)      | untyped `TypeError` escapes for some malformed inputs                                                                            | map to typed `INPUT_INVALID`                                                                                                                                                                                       |
| A-01 | ACCEPTED_LIMITATION | carried                       | cooperative cancellation; one precharged atomic native call is not interruptible; no wall-clock claim                            | none                                                                                                                                                                                                               |
| A-02 | ACCEPTED_LIMITATION | carried                       | own-key enumeration charged immediately after its single native pass                                                             | none                                                                                                                                                                                                               |
| A-03 | ACCEPTED_LIMITATION | carried                       | zero approved real venue pairs; no production mappings or live canaries                                                          | none                                                                                                                                                                                                               |
| E-02 | LOW                 | Environmental                 | the build regenerates `apps/web/next-env.d.ts` in disposable copies                                                              | none                                                                                                                                                                                                               |

## 19. Freeze recommendation

Every reviewed finding is resolved: B-01, B-02, H-01, H-02, H-03, H-04, M-01
(accepted semantics, all reliance conditions met) and M-02. In addition:

- all eight acceptance-5 counterexamples are closed;
- 29/29 D-055 groups pass, with 40/40 authored cases;
- 44/44 reason codes, none new;
- the D-064 aggregate, Option A, the host-TZ matrix and the final checks all
  pass;
- there is no caller budget authority;
- digests are stable against `018593d`;
- zero real pairs are preserved;
- the frozen boundaries are unchanged.

There is no BLOCKER and no unresolved HIGH.

The new MEDIUM N-01 lies outside the declared data-only threat model and is
pre-existing, so it does not block the freeze. It is nonetheless a real
divergence between validated and published values, and its worst case is a
`MATCHED` result for an unapproved pair. The freeze record must therefore list
N-01 and L-01 to L-04 as open warnings, with an owner.

**Final status: PASS_WITH_WARNINGS. BLOCKER 0. Unresolved HIGH 0.**
**Phase 2B.1 may freeze: YES. Phase 2B.2 eligible for separate authorization: YES.**

**Exact recommended next task:**

1. Have the Phase 2B.1 authority record the freeze decision for commit
   `1e091f9`.
   - Cite this report and its SHA-256.
   - List N-01 (MEDIUM) and L-01 to L-04 (LOW) as open warnings, with an owner.
2. As a separately authorized, bounded hardening task inside
   `packages/spread-analytics/**` (not Phase 2B.2), resolve N-01, L-02, L-03
   and L-04:
   - take a one-pass own-data-property snapshot of every caller input before
     validation, rejecting accessors, custom iterators, and non-enumerable or
     symbol keys;
   - add runtime `ExactDecimal` checks;
   - validate replay `mode`;
   - brand-check `registry` and validate or omit echoed candidates;
   - map untyped errors to typed codes;
   - add regressions for every probe in section 15;
   - keep D-055, D-064, the 44 codes, the 22 exports, the digests, every rate
     and every frozen scope unchanged.

   Complete that hardening, or record an explicit authority decision scoping
   non-data inputs out of contract, before any Phase 2B.2 component passes
   objects not produced by adapters or market-data into these APIs.

3. Only then request separate authorization for Phase 2B.2. This review does
   not begin it.
