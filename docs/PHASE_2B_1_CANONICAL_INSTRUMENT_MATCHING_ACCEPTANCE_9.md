# Phase 2B.1 — ninth independent acceptance review

- Review date: 2026-11-08 (work began 2026-10-19 and resumed after an
  interruption; the reviewed commit did not change in between).
- Reviewer: an independent technical AI reviewer, a separate actor from the
  implementing session and from the authors of the eight earlier reports. This
  is a technical attestation, not a human professional signature.
- Reviewed state: branch `claude/stoic-lovelace-uxfohy`, exact commit
  `715243cc6daa202c1a968e54d9c0c247b629b7aa` (tree
  `7d6820b3ad84b882a3e23f6d598f4fac1d30d7ec`), "fix: close Phase 2B.1 numeric
  prototype pollution".
  - Parent: `b9176d1248ccb72d0382a6c5a58e5431cca617a8` (carries ACCEPTANCE_8 =
    FAIL; its code equals `5aa2fdf`).
  - D-055 baseline: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3` (`origin/main`).
- Scope: ACCEPTANCE_9, a focused, adversarial re-acceptance of L-07 and L-05
  from [ACCEPTANCE_8](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_8.md)
  section 14, the new public-output layer (implementation evidence §23.6), and
  regression checks of N-01, N-02, N-03, L-03, L-06, B-01, B-02, H-01 to H-04,
  M-01, M-02, L-02 and L-04.
- Execution: four disposable `git archive` materializations, each with its
  own `npm ci`:
  - `q`, the authoritative quality run of `715243c`, never touched by probes;
  - `p`, the probe copy of `715243c`;
  - `old`, a copy of `b9176d1` for cross-version comparison;
  - `a7`, a copy of `8d17682` (the ACCEPTANCE_7 state), used only to confirm
    the earlier accepted public-output shape.

  Every probe was written for this review and run identically on `p` and
  `old` where the API allowed. Every prototype that a probe polluted was
  restored in `finally`, and a clean re-run afterwards was byte-identical with
  no leftover keys. All probes and copies were deleted afterwards.

- Final status: **PASS_WITH_WARNINGS**. BLOCKER: **0**. Unresolved HIGH:
  **0**.
- **L-07 is resolved, and with it L-05.** The exact ACCEPTANCE_8 exploit
  reproduces at `b9176d1` and is closed at `715243c`. A 412-run numeric
  pollution sweep (indices `0`, `1`, `2`, `3`, `-1`, `12`, alone and together,
  on `Object.prototype`, `Array.prototype` and both at once, plus string
  indices on `String.prototype`) over 48 operations is byte-identical to the
  clean run at `715243c`; 230 of the same 412 runs differ at `b9176d1`.
- **Independent numeric-index audit:** 70 explicit index-read sites, 63 safe
  by length, own-property or dense-internal proof, 7 changed, **0
  uncovered**. The implementer's 56-site inventory is confirmed exactly; the
  other 14 are array-destructuring sites that it did not list, all over dense
  internal tuples.
- **Public-output prototype contract: PASS.** Every public output is again an
  ordinary frozen plain object, as at `8d17682`. Shared identities hold, and no
  forged history handle authenticates.
- Warnings (informational, no severity change): under the `get`/`set`
  descriptor-name pollution already accepted as A-04, seven operations now
  fail closed with a raw `TypeError` instead of one (O-1). Non-data numeric
  pollution (non-writable or accessor) degrades every operation fail-closed
  but is outside the data-pollution class (O-2). L-01 is carried.
- Phase 2B.1 may freeze: **YES**. Phase 2B.2 eligible for separate
  authorization: **YES** (eligibility only; it is not an authorization).
- This review created only this report. No implementation, test, manifest,
  lockfile, dependency, D-055, D-064, capacity decision, prior report,
  implementation evidence or frozen scope was changed. Nothing was committed,
  pushed or tagged. Phase 2B.2 was not begun.

## 1. Governing baseline and integrity

Checks run in `/home/user/HolyParser` before any other work:

- `git rev-parse HEAD` and `git rev-parse origin/claude/stoic-lovelace-uxfohy`
  are both `715243c…`, and `git status --short` is empty.
- `git diff --check` is clean, and `git fsck --full` exits 0.
- `git log --oneline -7` shows `715243c` → `b9176d1` → `5aa2fdf` → `8d17682`
  → `18e2772` → `4becf10` → `1e091f9`.
- Node is **v24.18.1** and npm **11.16.0**. The archive
  `node-v24.18.1-linux-x64.tar.xz` was re-hashed as `d6c664df…d15a0`, which
  matches its line in the supplied `SHASUMS256.txt`.

Read: `AGENTS.md`; the relevant parts of `MASTER_SPEC`; D-055 and its
acceptance; D-064; the capacity-semantics decision (Option A); ACCEPTANCE_7
and ACCEPTANCE_8 (section 5 of ACCEPTANCE_8 is the controlling evidence);
implementation evidence §22 and §23 (§23 is the claim set under review,
including the §23.1 correction of §22.15); the relevant parts of
`DOMAIN_MODEL`, `API_CONTRACTS_PLAN`, `SECURITY_MODEL`, `RISK_REGISTER`,
`DECISIONS_REQUIRED` and `ACCEPTANCE_CRITERIA`; every runtime and test module
under `packages/spread-analytics/**`; and the full `git diff b9176d1 715243c`.

| Artifact                                                                              | SHA-256 (recomputed)                                               | Status                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| [D-055 decision](PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION.md)                       | `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931` | matches the mandated value            |
| [D-064 approval](PHASE_2B_D064_MATCHING_APPROVAL.md)                                  | `85fb7792cf66a9443da60bdcdbbe07daab5dce159bcda82ebaffe032b5e8fbe8` | matches the mandated value            |
| [Capacity-semantics decision](PHASE_2B_D064_CAPACITY_SEMANTICS_DECISION.md)           | `98552f5d837e291e8d02bbb5525b2bb17caa47bab4ee41c1e38372fa42ebfbe1` | matches the mandated value            |
| [D-055 acceptance](PHASE_2B_D055_ACCEPTANCE.md)                                       | `18d1cbb38c2db218cc11b25f3a89279be76b7f335703881e688f887864df3495` | unchanged                             |
| [First acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE.md)            | `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0` | unchanged                             |
| [Re-acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_REACCEPTANCE.md)             | `22bb95806e7e8cd300e6ef49e87654528c6fbb775df344b1335c5e61baf028c4` | unchanged                             |
| [Third acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_3.md)          | `bd5fa6a38404e9d40e35513176f94a752025fd7152653dc5d4b64811592295e0` | unchanged                             |
| [Fourth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_4.md)         | `a54dd81821332cce15db3ce57be121eb7875bd02e87da1b20e4c537d3062b3ee` | unchanged                             |
| [Fifth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_5.md)          | `4505f418820b43d9d44ad2528f52371450cb7550fcf17ceb22ee35b9e4d67d51` | unchanged                             |
| [Sixth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_6.md)          | `7d4d8773054200c98069c13d473b9fab48ee59f745d4b7faf84cec1d84b15f55` | unchanged                             |
| [Seventh acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_7.md)        | `175573a3762623766e5b5b54038e7ce937848b520b4f73c78e2441c3a9767705` | unchanged                             |
| [Eighth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_8.md)         | `4af4c4859104b7ad98592e53ca5d1ee188bd4044501ef99fc05e71b042596481` | unchanged since `b9176d1`             |
| [Implementation evidence](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_IMPLEMENTATION.md) | `596576c012c5ba0f645d767dafb2def07775ab2bfc0517f3b3b78279407c29f2` | 376 lines appended (§23), no removals |
| Root `package.json`                                                                   | `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` | matches the mandated value            |
| `package-lock.json`                                                                   | `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59` | matches the mandated value            |

`git diff --stat b9176d1 715243c` lists 13 files, all inside the permitted
scope:

- the implementation evidence (376 insertions, 0 deletions);
- nine runtime modules: `admission`, `candidates`, `commands`, `evaluator`,
  `evidence`, `immutable`, `registry`, `replay`, `time`;
- the new runtime module `publication.ts`;
- the new `eighth-acceptance-hardening.test.ts`;
- `seventh-acceptance-hardening.test.ts`, where exactly two assertions change
  from `toBeNull()` to `toBe(Object.prototype)` for the published prototype.

`index.ts`, `policy.ts`, `bounds.ts`, `reasons.ts`, `model.ts`,
`serialization.ts`, `snapshot.ts`, `transitions.ts`, `validation.ts`,
`economics.ts`, `diagnostics.ts`, `work-oracle.ts`, `test-fixtures.ts`, every
other earlier test file, and the package `package.json` and `tsconfig.json`
are byte-identical to `b9176d1`.

## 2. Required finding verdicts

| Finding                                         | Verdict                                           | Independent basis                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L-07** — numeric index reads inherit          | **RESOLVED**                                      | The ACCEPTANCE_8 exploit reproduces exactly at `b9176d1` (`AMBIGUOUS` → `MATCHED`, USDT↔USDC → `UNAVAILABLE/MAPPING_UNAPPROVED` or `QUARANTINED`, 0 → 3 candidates with identity `asset:A/asset:A/asset:A`). At `715243c` every probe is identical to the clean run, with identical result IDs. 412 polluted runs × 48 operations: 0 differ (230 differ at `b9176d1`). The `-1` and `12` reads (history continuity, month table) are closed as well (section 3). |
| **L-05** — prototype pollution                  | **RESOLVED**                                      | It was open only because of L-07. The named-property sweep (71 names × 5 values = 355 runs) is again inert for all names except the accepted A-04 descriptor names `get`/`set`, which fail closed. Numeric names are now inert too. Matching, approval, replay, serialization and publication are unchanged by data pollution of any tested name or index (sections 3 and 6).                                                                                    |
| N-01 — validated vs published divergence        | **PASS (no regression)**                          | Accessor sweep over 8 entry points: 0 getter reads, typed refusals. Every `MATCHED` has `registryRevision === mappingVersion.registryRevision` (`registry-v1`).                                                                                                                                                                                                                                                                                                  |
| N-02 — trusted-handle mutability                | **PASS (no regression)**                          | Instances, prototypes and classes of both handles frozen; 9 registry and 11 ledger mutation attempts all throw `TypeError`. The idempotent result's `mapping` is `ledger.versions.at(-1)` and frozen.                                                                                                                                                                                                                                                            |
| N-03 — decimal pre-validation and charging      | **PASS (no regression)**                          | A 10^100,000 / 100,000 spoof is refused in 3.2 ms; `ExactDecimal.fromParts` only ever saw genuine parts (`1/0`, a 78-digit coefficient, `1/78`, `1/3`), never a rejected one. Every `fromParts` call is preceded by the 624-unit charge.                                                                                                                                                                                                                         |
| L-03 — echoed candidate / fake registry         | **PASS (no regression)**                          | 100,000-, 161- and 0-character revisions → `INPUT_INVALID`; 160 accepted. Proxy, plain, prototype-spoof and `null` registries, and a Proxy ledger, → `INPUT_INVALID`. Every exit publishes `registry-v1`.                                                                                                                                                                                                                                                        |
| L-06 — mutable reason catalogue                 | **PASS (no regression)**                          | Frozen, 44 unique codes; 5 mutation forms throw `TypeError`; a `BOGUS_CODE` candidate → `INPUT_INVALID`.                                                                                                                                                                                                                                                                                                                                                         |
| B-01 — forged history/transition authority      | **RESOLVED (no regression)**                      | Dropped supersede transition and forged reason → `CONFLICTING`; forged status → `DIGEST_MISMATCH`; forged `supersededBy` → `DIGEST_MISMATCH`; spread history handle → `INPUT_INVALID`.                                                                                                                                                                                                                                                                           |
| B-02 — immutable admitted replay                | **RESOLVED (no regression)**                      | The published history is deep-frozen; assignment and `defineProperty` throw. Replay reads only the internal history behind the authenticated handle (section 5).                                                                                                                                                                                                                                                                                                 |
| H-01 — product scope before identity            | **RESOLVED (no regression)**                      | SPOT, dated, unknown, option and inverse partners: `SPOT_DERIVATIVE_MISMATCH`, `DATED_PRODUCT_EXCLUDED`, `PRODUCT_ENUM_UNVERIFIED`, `PRODUCT_UNSUPPORTED`, `VALUE_CONVENTION_MISMATCH`, 0 candidates each.                                                                                                                                                                                                                                                       |
| H-02 — public API closure                       | **RESOLVED (no regression)**                      | A fresh `dist/index.js` has exactly **22** runtime exports, unchanged names, no `export *`. No test or fixture file is in `dist`. Eleven deep imports, including the new `dist/publication.js`, return `ERR_PACKAGE_PATH_NOT_EXPORTED`.                                                                                                                                                                                                                          |
| H-03 — cumulative logical work and cancellation | **RESOLVED (no regression)**                      | 29 typed outcomes; **1,171 of 1,171** abort placements throw `EVALUATION_CANCELLED`; maximum charged gap 128; publication tail 0 on all 28 published outcomes; charged units strictly higher than `b9176d1` in 28 of 28 (section 7).                                                                                                                                                                                                                             |
| H-04 — runtime timestamp validation             | **RESOLVED (no regression)**                      | `time.ts` changes only by the month range check. In separate `UTC`, `America/New_York` and `Asia/Tokyo` processes (offsets 0, 240 and −540) the package suite passes 312/312 and the material digest is identical.                                                                                                                                                                                                                                               |
| M-01 — capacity semantics                       | **RESOLVED — accepted semantics (no regression)** | 1,024 instruments → typed `MATCHING_BOUND_EXCEEDED`, no publication, 782 of 782 abort placements throw; `policy.ts` and `bounds.ts` byte-identical (section 8).                                                                                                                                                                                                                                                                                                  |
| M-02 — caller-supplied budget authority         | **RESOLVED (no regression)**                      | Extra trailing tripwire Proxy arguments on three callables are read **0** times; an always-aborted signal throws `EVALUATION_CANCELLED` on all eight signal-taking operations.                                                                                                                                                                                                                                                                                   |
| L-02 — replay mode                              | **RESOLVED (no regression)**                      | `AS_KNOWN` and `CORRECTED` replay; all 13 forged modes throw `INPUT_INVALID`.                                                                                                                                                                                                                                                                                                                                                                                    |
| L-04 — untyped exceptions                       | **RESOLVED (no regression)**                      | 22 entry positions × 13 hostile values = **286** calls, **0** raw errors: 210 `INPUT_INVALID`, 22 `EVIDENCE_TIME_INVALID`, 54 benign. (Raw errors under `get`/`set` pollution are A-04, see O-1.)                                                                                                                                                                                                                                                                |

## 3. L-07 / L-05 probe evidence

**Exact ACCEPTANCE_8 reproduction.** `Object.prototype["0"]` and
`Array.prototype["0"]` defined as writable, non-enumerable data properties,
and `Object.prototype["1"]` as a control. Result IDs are the first 12 hex
characters.

| Probe (clean result)                                                                               | Pollution value           | `b9176d1`                                                           | `715243c`                                   |
| -------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| A/USDT ↔ unbound base, valid approved mapping (`AMBIGUOUS/ASSET_IDENTITY_UNKNOWN`, `07e651b70289`) | `{ canonicalAssetId: A }` | **`MATCHED/COMPATIBLE_APPROVED`** (`f214d655a659`), both prototypes | `AMBIGUOUS` `07e651b70289`, both prototypes |
| A/USDT ↔ A/USDC unmapped (`NOT_MATCHED/SETTLEMENT_ASSET_MISMATCH`, `217a133ea52e`)                 | `{ targetAssetId: A }`    | `UNAVAILABLE/MAPPING_UNAPPROVED`                                    | unchanged, identical ID                     |
| A/USDT ↔ A/USDC with the A/USDT mapping (same)                                                     | `{ targetAssetId: A }`    | `QUARANTINED/DUPLICATE_EXPOSURE_CONFLICT`                           | unchanged, identical ID                     |
| A/USDT ↔ B/USDT (`NOT_MATCHED/BASE_ASSET_MISMATCH`)                                                | `{ targetAssetId: A }`    | `NOT_MATCHED/CONTRACT_UNIT_MISMATCH`                                | unchanged, identical ID                     |
| candidates over A/USDT, B/USDT, A/USDC, unbound (0)                                                | `{ targetAssetId: A }`    | 3 candidates, identity `asset:A/asset:A/asset:A`, `REVIEWED_MANUAL` | 0                                           |
| same (0)                                                                                           | `{ canonicalAssetId: A }` | 1 candidate `asset:A/asset:USDT/asset:USDT`, `REVIEWED_MANUAL`      | 0                                           |
| every row with `Object.prototype["1"]`                                                             | as above                  | unchanged                                                           | unchanged                                   |

**Per-index attribution at `b9176d1`** (single key on `Object.prototype`,
workflow of 48 operations):

- `"0"` (`{ canonicalAssetId: A, targetAssetId: A }`): 13 operations change,
  including `MATCHED` → `QUARANTINED`, unbound and USDC cases → `UNAVAILABLE`
  or `QUARANTINED`, `resolve` of an unbound reference → `KNOWN`, and 0 → 6
  candidates.
- `"-1"` (an admission record): admission `VALID`/`INVALIDATED`/`SUPERSEDED`
  → `REVISION_MISMATCH`, all replays → `INPUT_INVALID`.
- `"-1"` (the number 31): an evaluation at month `00` that is
  `EVIDENCE_TIME_INVALID` clean is **accepted** and returns `AMBIGUOUS`.
- `"12"` (31 or a string): the month-13 admission changes its published
  record.

At `715243c` all six of these produce **0** changed operations.

**Full sweep.** 48 operations per run: 13 evaluations (`MATCHED`, unmapped
`UNAVAILABLE`, three unbound `AMBIGUOUS` variants, three USDT↔USDC variants,
different base, same venue, `MULTIPLIER_UNKNOWN`, invalidated, superseded),
four candidate generations (mismatched set, normal set, 0 and 1 instruments),
two batches (3 items and empty), three admissions (`VALID`, `INVALIDATED`,
`SUPERSEDED`), five replays, seven command paths (`APPLIED`, idempotent,
genuine invalidation, forged-provenance invalidation, zero-approval ledger and
its invalidation, zero- and one-approval `approveCommand`), registry admission,
bound and unbound `resolve`, two `describe` calls, two evidence bundles,
exposure key, provenance digest, months `00` and `13`, and two normalizations.

- 14 values: `{ canonicalAssetId: A }`, `{ canonicalAssetId: USDT }`, a full
  binding-shaped record, `{ targetAssetId: USDC, aliasAssetId: USDT }`,
  `{ targetAssetId: USDT, canonicalAssetId: USDT }`, a genuine mapping, a
  genuine admission record, a genuine candidate, an approval carrying a
  forged digest, a genuine supersede transition, `"POLLUTED"`,
  `"COMPATIBLE_APPROVED"`, `31` and `true`.
- Keys `0`, `1`, `2`, `3`, `-1`, `12` singly and all six at once; targets
  `Object.prototype` and `Array.prototype`; descriptor forms "assigned"
  (writable, enumerable) and "defined" (writable, non-enumerable): 392 runs.
- 14 runs with all six keys on both prototypes at once, and 6 runs of string
  index pollution on `String.prototype` (`0`, `1`, `5`, `23`, `24`, `30`).
- Total **412 runs**. Output rendered from own properties only and hashed.

| Version   | Runs | Runs differing from clean | Leftover keys | Clean re-run identical |
| --------- | ---: | ------------------------: | ------------- | ---------------------- |
| `b9176d1` |  412 |                   **230** | none          | yes                    |
| `715243c` |  412 |                     **0** | none          | yes                    |

At `b9176d1` the differences spread over 27 of the 48 operations, including
`MATCHED`, every `AMBIGUOUS` and USDT↔USDC case, both candidate sets, batch,
every admission and replay, the zero-approval invalidation and both month
probes.

No run at `715243c` turned `AMBIGUOUS`, `NOT_MATCHED` or `UNAVAILABLE` into
`MATCHED` or `COMPATIBLE_APPROVED`, collapsed USDT and USDC, created a
candidate for a mismatched pair, accepted forged invalidation provenance, or
changed a timestamp decision, replay, result ID or digest.

**Input-boundary array shapes** (clean, and under `Object.prototype` and
`Array.prototype` pollution of `0`, `1`, `2` with a genuine instrument, an
approval and a second instrument). Identical in all three runs at `715243c`:

| Shape                                                                              | Result                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| Instruments: sparse `[x, , y]`; length 2 with only `[1]`                           | `INPUT_INVALID`                                    |
| Instruments: 0 / 1 / 2 elements                                                    | 0 / 0 / 1 candidate (`EXACT_METADATA`)             |
| Batch: sparse; empty                                                               | `INPUT_INVALID`; empty result                      |
| Approvals: 0, 1, 2 elements                                                        | command created (admission enforces the reviewers) |
| Approvals: sparse; missing index inside the length                                 | `INPUT_INVALID`                                    |
| History: empty; sparse; missing index                                              | `INVALID_PROVENANCE/INPUT_INVALID`                 |
| Candidate reasons sparse; evidence sparse; ledger sparse; registry bindings sparse | `INPUT_INVALID`                                    |
| Ledger: empty                                                                      | constructed                                        |

At `b9176d1` the same matrix differs under pollution: the 2-instrument
candidate's confidence becomes `REVIEWED_MANUAL` (inherited alias).

**Exploratory, outside the data-pollution class (O-2).** With numeric names
installed as non-writable data properties, every evaluation and candidate
generation throws `INPUT_INVALID` in both versions. With accessor
(getter/setter) properties, 60 runs (`0`, `1`, `2` × 5 values × both
prototypes × registry built before or under pollution) produce **no**
promotion at `715243c`: `MATCHED` degrades to `UNAVAILABLE`, other operations
throw typed errors, and building a registry under pollution fails. At
`b9176d1`, accessor `"0"` turned an unbound `resolve` into `KNOWN` in 4 runs.
Installing accessors on a built-in prototype is the "globally patched
built-ins" case of A-04.

**Assessment.** The fix removes every inherited numeric read on authoritative
paths, and the §23.1 correction of §22.15 is accurate. **L-07: RESOLVED.
L-05: RESOLVED.**

## 4. Independent numeric-index audit

**Method.** A separate TypeScript-AST scanner, written for this review, walks
the 21 runtime modules (all non-test modules except `test-fixtures.ts`, and
`work-oracle.ts`, a test oracle that no runtime module imports and the package
does not export). It lists every `ElementAccessExpression`, every `.at()`
call, every `ownElement(...)` call and every array-destructuring pattern, and
tallies implicit iteration (`for…of`, spread, `map`, `filter`, `find`,
`some`, `includes`, `sort`, `reduce`, `slice`, `join`, `reverse`). Each
explicit site was classified by reading its dominating code.

| Class                                                               | Sites | Where                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SAFE_BY_LENGTH`                                                    |    24 | `admission` `a[index]`/`b[index]` (equal lengths checked, loop bound), `quant[0]`/`marketData[0]` (`length === 1` short circuit), `records[index]`, `versions.at(-1)`; `candidates` `ordered[index − 1]`/`ordered[index]` (loop from 1), `group[i]`/`group[j]`; `commands` `#versions.at(-1)`, `quant[0]` ×2, `md[0]` ×2 (after the `length === 1` throw), `transition.approvals[index]` ×3 (equal lengths checked first); `registry` `records[0]` (`length === 1 ?`); `replay` `.filter(…).at(-1)`; `transitions` `quant[0]`/`marketData[0]`; `validation` `keys[index]`/`allowed[index]` |
| `SAFE_BY_DENSE_INTERNAL_INVARIANT`                                  |    20 | `candidates` `ids`, `revisions`, `metadataDigests`, `economicsRevisions` `[0]`/`[1]` (maps of the local 2-element sorted `legs`); `evaluator` `legs[0..1]`, `expectedPair[0..1]`, `mappingPair[0..1]`, `expectedLegs[0..1]` ×3 (local 2-element literals or maps)                                                                                                                                                                                                                                                                                                                          |
| `SAFE_BY_OWN_PROPERTY`                                              |     5 | `bounds`, `serialization` and `publication` `record[key]` (keys from `Object.keys`); `immutable` `list[index]` (inside `ownElement`, behind `Object.hasOwn`); `publication` `ownElement(list, index)`                                                                                                                                                                                                                                                                                                                                                                                      |
| `FIXED`                                                             |     7 | `ownElement(found, 0)`, `ownElement(aliases, 0)` (registry); `ownElement(target.approvals, 0)` (commands); `ownElement(records, 0)`, `ownElement(records, index − 1)` behind `index > 0`, `ownElement(versions, 0)` (admission); the month table read after the 1–12 range check (time)                                                                                                                                                                                                                                                                                                    |
| Array destructuring (dense internal), not in the authored inventory |    14 | `[count, limit, label]` over a local literal (`bounds`); `[a, b]` over pushed literal pairs (`candidates`); `[value, label]` over local literals (`commands` ×2, `registry`, `transitions`); `[key, value]` over a literal (`commands`); `[left]`/`[right]`/`[commandId, digest]` over `Map` entries (`commands` ×3, plus one `for…of` over the `Map`); `[key, values]` over `Map` entries (`registry` ×3)                                                                                                                                                                                 |
| **Uncovered authoritative index reads**                             | **0** | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**Totals: 70 sites, 63 safe, 7 changed, 0 uncovered.** The 56 element,
`.at()` and `ownElement` sites, and the class split 24 / 20 / 5 / 7, match the
implementer's §23.5 inventory exactly (the same scanner finds 53
element/`.at()` sites at `b9176d1`, as §23.5 states). Destructuring reads
through the array iterator, which visits only indices below `length`; every
destructured value here is an engine-built `Map` entry or an internal literal
tuple.

**Dense-array invariant (§23.4).** Checked independently:

- Caller arrays enter only through `snapshot.ts`. It requires prototype
  `Array.prototype`, requires the own keys to be exactly the indices plus
  `length`, and reads each index with an own-descriptor check that throws on
  a missing index. A hole hidden by an extra own key (`[x, , y]` plus `foo`)
  therefore still fails at the missing index.
- No runtime module writes an array index, assigns `length`, or uses
  `new Array`, `Array(n)` or `Array.from({ length })`. Internal arrays come
  from literals, `push`, `map`, `filter`, spread and sorted copies, so they
  are dense.
- Implicit iteration (60 `for…of`, 33 spreads and 115 iteration-method
  calls, counted with `work-oracle.ts` included) visits only `0…length − 1`, which on a dense array are own elements.
- `charCodeAt` (11 sites) returns `NaN` out of range and never consults a
  prototype.
- The boundary matrix in section 3 confirms that sparse and short arrays are
  refused or handled identically under pollution.

**Claim check.** The §23.4 invariant and the §23.5 counts are confirmed. The
authored scanner's omission of destructuring is a coverage gap in the audit
test, not a defect: every such site is safe (informational O-3).

## 5. Public-output prototype verdict

**Contract review.** No normative contract (D-055, D-064, `API_CONTRACTS_PLAN`,
`DOMAIN_MODEL`) specifies or permits a null-prototype public result. The
`a7` copy (`8d17682`) publishes ordinary objects: 0 null-prototype nodes over
the workflow. `b9176d1` publishes 139 null-prototype objects where `String()`
and `hasOwnProperty` fail. Restoring ordinary objects is a correction toward
the accepted shape.

**Recursive check of every output of the 48-operation workflow**, plus
`ledger.versions`, `ledger.transitions` and `registry.revision`:

| Property                                                  |                       `8d17682` | `b9176d1` | `715243c` |
| --------------------------------------------------------- | ------------------------------: | --------: | --------: |
| Object nodes with `Object.prototype`                      |                             142 |         0 |   **139** |
| Null-prototype nodes                                      |                               0 |       139 |     **0** |
| Unfrozen nodes (excluding the probe's own error wrapper)  | 18 (`evidenceRevisions` arrays) |        16 |     **0** |
| `String(x)` or `x.hasOwnProperty` failures                |                               0 |       139 |     **0** |
| `JSON.stringify` failures                                 |                               0 |         0 |     **0** |
| `Object.keys` ≠ own string keys, or `Object.hasOwn` false |                               0 |         0 |     **0** |
| Holes in published arrays                                 |                               0 |         0 |     **0** |

All counts exclude the probe's own `{ thrown }` wrapper for the month-00
error. `String(registry.revision)` is `"[object Object]"` at `715243c` and throws at
`b9176d1`.

**Shared identities** (all `true` at `715243c` and at `b9176d1`):

- the `APPLIED` command's `mapping` is `ledger.versions.at(-1)` (this was
  `false` at `8d17682`);
- the idempotent command's `mapping` is `ledger.versions.at(-1)`;
- the `AS_KNOWN` replay's `mapping` is an element of the published
  `history.versions` and is `history.current`;
- `history.current` is `history.versions.at(-1)`, and `ledger.versions`
  returns the same object on every read.

**No public copy is read as authority.** Source check: `publicView` is
called only on the value an operation returns, after every decision, and on
the `revision`, `versions` and `transitions` views. No runtime module reads
those views or a returned copy. The ledger reads `#versions`,
`#transitions` and `#commandDigests`; the registry reads `#revisionId` and
its private indices; replay reads the internal history through
`trustedAdmittedHistory`. The `publicView` cache is keyed by internal records,
which are frozen, so a cached copy cannot go stale.

**Admitted-history handle.** The published history copy is a key of a
private `WeakMap` that maps it to the internal history.

| Handle passed to `replayMapping`                                 | Result                          |
| ---------------------------------------------------------------- | ------------------------------- |
| the genuine published history                                    | `MATCHED`                       |
| spread, `Object.assign({}, h)`, JSON clone, `structuredClone`    | `INPUT_INVALID`                 |
| `Object.create(h)`, `new Proxy(h, {})`, Proxy with a `get` trap  | `INPUT_INVALID`                 |
| null-prototype copy; the nested `versions` array                 | `INPUT_INVALID`                 |
| another admission's genuine history with a mismatched mapping ID | `MAPPING_REVISION_CONFLICT`     |
| the invalidated admission's genuine history                      | `UNAVAILABLE`                   |
| assignment or `defineProperty` on the genuine handle             | `TypeError`; handle deep-frozen |

A public copy passed back as input is re-snapshotted and re-validated:
`new MappingLedger(ledger.versions)` builds a fresh ledger whose arrays and
records are new objects, and a published mapping placed in an admission input
is re-validated from scratch like any caller record (being genuine content,
it yields the same `MATCHED` as the original input). A published history
passed as an evaluation `mapping` is rejected as `UNAVAILABLE`
[`INPUT_INVALID`]. No public copy influenced any decision.

**Consumer note (§23.6) confirmed:** optional keys stay absent, so a
consumer in its own polluted environment reading an absent key sees that
environment. Nothing the package decides depends on it.

**Verdict: PASS.**

## 6. Regression spot-checks

**Named-property sweep (ACCEPTANCE_8 method).** 71 names × 5 values
(`"POLLUTED"`, a genuine admission input, a forged candidate, `true`, a
function) = **355 runs** on `Object.prototype`, each over the 48-operation
workflow, rendered from own properties.

| Polluted name                                                           | `b9176d1`                                | `715243c`                                          |
| ----------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------- |
| 68 names (including `mapping`, `candidate`, `reason`, `toJSON`, `then`) | inert                                    | inert                                              |
| `0`                                                                     | **changes outcomes** (L-07)              | **inert**                                          |
| `get`, `set` (A-04)                                                     | fail closed: 34 typed, 1 raw `TypeError` | fail closed: 34 typed, **7 raw `TypeError`** (O-1) |

No leftover keys; the clean re-run is byte-identical in both versions.

**N-02, N-03, N-01, L-03 and L-06** are covered in section 2. Additional
detail:

- **N-02.** `Object.isFrozen` is `true` for both instances, both prototypes
  and both classes. Registry attacks: assigning a 100,000-character revision,
  a getter, `delete`, `setPrototypeOf`, writing the nested revision, pushing
  an asset, replacing `resolve`, adding a key and adding a static member.
  Ledger attacks: replacing `versions` and `transitions`, a getter, `push`, an
  element write, a field write, pushing an approval, `setPrototypeOf`, and
  replacing `apply` on the instance and the prototype, plus mutating a
  returned mapping. All 20 throw `TypeError`. Afterwards `MATCHED` and
  same-venue results publish `registry-v1`, and candidates publish
  `["registry-v1"]`.
- **N-03.** ±(10^78 − 1) / 0, 1 / 78 and 1 / 3 are accepted; 10^78 / 0,
  1 / 79, 10 / 1, 0 / 1 and scale −1 are `INPUT_INVALID`. In every case the
  624-unit rebuild charge precedes the first `fromParts`. The budget-free
  helper `normalizeBaseExposure` refuses the 10^100,000 spoof in 3.0 ms.

## 7. Work accounting

**Method** (ACCEPTANCE_7/8, re-implemented for this review):

- `WorkBudget.prototype.step` (128 units per step), `units` (1:1, nested
  `step` not double counted) and `check` were wrapped per budget instance.
- The charged gap is the step difference between consecutive checks, read
  from the budget's own `steps`. The publication tail is the units charged
  after the final check.
- Polls were counted on the signal getter. Each outcome was then re-run with
  the abort set from poll k + 1, for every k.
- The identical probe ran on `715243c` and `b9176d1`.

| Outcome                                                                               | `b9176d1` → `715243c` charged units                                   | Polls         | Max gap | Tail | Abort sweep  |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------- | ------: | ---: | ------------ |
| eval `MATCHED`                                                                        | 201,703 → 201,967                                                     | 14            |     128 |    0 | 14/14        |
| eval unmapped / `AMBIGUOUS` / USDC / base B                                           | 36,255 / 37,096 / 36,089 / 36,098 → +49 each                          | 4 each        |     128 |    0 | 4/4 each     |
| eval same venue                                                                       | 29,892 → 29,941                                                       | 3             |     128 |    0 | 3/3          |
| eval `MULTIPLIER_UNKNOWN`                                                             | 34,882 → 34,931                                                       | 4             |     128 |    0 | 4/4          |
| eval invalidated / superseded mapping                                                 | 219,971 / 293,253 → +49 each                                          | 15 / 19       |     128 |    0 | 15/15, 19/19 |
| batch (3 items)                                                                       | 276,109 → 276,474                                                     | 18            |     128 |    0 | 18/18        |
| admission `VALID` / 16 versions                                                       | 162,247 → 162,716 / 1,547,323 → 1,555,802                             | 11 / 96       |     128 |    0 | 11/11, 96/96 |
| admission `INVALIDATED` / `SUPERSEDED`                                                | 181,894 → 182,481 / 254,337 → 255,340                                 | 13 / 17       |     128 |    0 | 13/13, 17/17 |
| replay `AS_KNOWN` / `CORRECTED`                                                       | 5,139 → 5,180 / 7,234 → 7,275                                         | 2 / 2         | 40 / 56 |    0 | 2/2 each     |
| command `APPLIED` / idempotent / invalidate / `REJECTED`                              | 17,671 / 11,932 / 14,806 / 11,869 → 17,906 / 12,061 / 15,045 / 11,994 | 2 each        |   ≤ 117 |    0 | 2/2 each     |
| candidates (5) / (20)                                                                 | 123,432 → 123,796 / 2,092,975 → 2,115,966                             | 9 / 129 → 131 |     128 |    0 | 9/9, 131/131 |
| registry `READY`                                                                      | 60,807 → 62,067                                                       | 5             |     128 |    0 | 5/5          |
| evidence (8 records)                                                                  | 71,840 → 72,249                                                       | 6             |     128 |    0 | 6/6          |
| `approveCommand`, `ledger.apply`, `new MappingLedger`, `registry.resolve` (no signal) | 7,217 / 19,137 / 1,098 / 1,387 → 7,329 / 19,468 / 1,202 / 1,400       | —             |    ≤ 94 |    0 | —            |
| 1,024-instrument cap                                                                  | typed `MATCHING_BOUND_EXCEEDED` in both                               | 782 → 782     |     128 |    — | 782/782      |

**Results:**

- **Outcomes:** 29 typed outcomes (28 published, plus the cap failure).
- **Abort sweep:** **1,171 of 1,171** placements (389 published-outcome
  placements plus 782 at the cap) throw `EVALUATION_CANCELLED`. None
  published a result.
- **Cancellation interval:** the maximum charged gap is **128** steps.
- **Final check:** the publication tail is **0** on all 28 published
  outcomes. Source check: in every public operation `publicView(result, work)`
  runs, and charges `2n + 1` units per array and `4k + 1` per record, before
  `work.beforePublication()`. Nothing follows the final check except
  `return`. The `ledger.versions`/`transitions` and `registry.revision` views
  are copied in the constructors, also before the final check.
- **No budget reset:** every measured public call creates exactly one budget
  of its own. The internal ledger built inside a command uses the parent
  budget (the probe counts 3 budgets for `new MappingLedger()` +
  `approveCommand` + `admitMappingCommand`, one per public call, as at
  `b9176d1`). `ownElement` and the month gate are constant work on the same
  budget.
- **Conservatism against `b9176d1`:** charged units are strictly higher in 28
  of 28 published outcomes. The cap run fails at the same charge
  (12,800,196 units) and the same poll count in both, because the public copy
  is never reached. A cache hit in `publicView` charges nothing, but only
  returns a copy that was charged when it was built.

**Verdict: PASS.** H-03 has no regression.

## 8. Capacity

- The structural ceilings, the 100,000-step budget and the ≤128 interval are
  unchanged (`policy.ts` and `bounds.ts` are byte-identical).
- 1,024 instruments fail with typed `MATCHING_BOUND_EXCEEDED`, with no
  publication, and all 782 abort placements throw `EVALUATION_CANCELLED`.
- No minimum capacity is claimed. The only new work, the public copy, runs
  after all decisions, so it cannot move the point where the cap fails.
- 20-instrument candidate generation polls 131 times instead of 129, a
  stricter rate.

**Verdict: PASS. M-01 reliance conditions are met.**

## 9. D-055 policy groups (29) — independent probe

The probe used its own instrument names (`Q9X_…`) and constructions through
the public modules. All 29 rows are byte-identical to `b9176d1`. The authored
`d055-scenarios.test.ts` passes **40/40**.

|   # | Expected                            | Independent result                                                                                                      | Verdict |
| --: | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------- |
|   1 | Reviewed A/USDT linear perpetual    | `MATCHED/COMPATIBLE_APPROVED`                                                                                           | PASS    |
|   2 | Same ticker, different base         | `NOT_MATCHED/BASE_ASSET_MISMATCH`                                                                                       | PASS    |
|   3 | USDT vs USDC                        | `NOT_MATCHED/SETTLEMENT_ASSET_MISMATCH`                                                                                 | PASS    |
|   4 | Linear vs inverse                   | `NOT_MATCHED/VALUE_CONVENTION_MISMATCH`                                                                                 | PASS    |
|   5 | Perpetual/dated, dated/dated        | `DATED_PRODUCT_EXCLUDED` ×2                                                                                             | PASS    |
|   6 | Exact 1 / 0.001 / 100 normalization | `MATCHED` ×3; `normalizeBaseExposure(3, 0.001) = 0.003`                                                                 | PASS    |
|   7 | Missing multiplier                  | `UNAVAILABLE/MULTIPLIER_UNKNOWN`                                                                                        | PASS    |
|   8 | Unknown lifecycle                   | `UNAVAILABLE/LIFECYCLE_UNKNOWN`                                                                                         | PASS    |
|   9 | Reviewed direct alias               | `MATCHED`; candidate `REVIEWED_MANUAL`; no mapping → `MAPPING_UNAPPROVED`                                               | PASS    |
|  10 | Conflicting binding                 | `QUARANTINED/ASSET_BINDING_CONFLICT`                                                                                    | PASS    |
|  11 | Superseded current vs historical    | evaluation `MAPPING_SUPERSEDED`; admission `SUPERSEDED`; `AS_KNOWN` replay `MATCHED` v1                                 | PASS    |
|  12 | Reviewed rebrand keeps identity     | `MATCHED` ×2; display name `asset:A` → `New Name 9`; exposure keys equal                                                | PASS    |
|  13 | Ticker-only collision               | `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN`                                                                                      | PASS    |
|  14 | Unsupported family                  | `PRODUCT_UNSUPPORTED` (OTHER, OPTION)                                                                                   | PASS    |
|  15 | 60 s / 60 s + 1 ms                  | `MATCHED` / `UNAVAILABLE/EVIDENCE_STALE`                                                                                | PASS    |
|  16 | Zero / negative multiplier          | `UNAVAILABLE/MULTIPLIER_INVALID` ×2                                                                                     | PASS    |
|  17 | Incompatible unit                   | `NOT_MATCHED/CONTRACT_UNIT_MISMATCH`                                                                                    | PASS    |
|  18 | Unapproved candidate                | `INCOMPLETE`; evaluation `MAPPING_UNAPPROVED`                                                                           | PASS    |
|  19 | Quarantine / invalidation           | `QUARANTINED/MAPPING_QUARANTINED`; `UNAVAILABLE/MAPPING_INVALIDATED`                                                    | PASS    |
|  20 | Unknown convention / capability     | `VALUE_CONVENTION_UNVERIFIED`; `CAPABILITY_UNAVAILABLE`                                                                 | PASS    |
|  21 | Alias cycle / chain / self          | `QUARANTINED/ALIAS_CHAIN_FORBIDDEN` ×3                                                                                  | PASS    |
|  22 | Economics contradiction             | `QUARANTINED/METADATA_EVIDENCE_CONFLICT`                                                                                | PASS    |
|  23 | Overlapping intervals               | command `QUARANTINED/MAPPING_INTERVAL_CONFLICT`                                                                         | PASS    |
|  24 | Inactive lifecycle                  | `LIFECYCLE_NOT_ACTIVE` ×5 (SUSPENDED, DELISTED, PRE_LAUNCH, SETTLING, EXPIRED)                                          | PASS    |
|  25 | Expired / over 30 days              | `UNAVAILABLE/MAPPING_EXPIRED`; 30-day + 1 ms binding → `EVIDENCE_TIME_INVALID`                                          | PASS    |
|  26 | Forged authority                    | forged review digest → `INVALID_PROVENANCE`; forged `supersededBy` → `DIGEST_MISMATCH`; spread handle → `INPUT_INVALID` | PASS    |
|  27 | OKX special families                | `SPECIAL_PRODUCT_EXCLUDED` (`OKX_PRE_MARKET`, `OKX_XPERP`)                                                              | PASS    |
|  28 | AS_KNOWN / CORRECTED                | `AS_KNOWN` `MATCHED`; `CORRECTED` `UNAVAILABLE/MAPPING_INVALIDATED`; versions frozen                                    | PASS    |
|  29 | Permutation stability               | 9 instruments, three permutations, 36 byte-identical candidates                                                         | PASS    |

**29/29 PASS; 40/40 authored cases pass.** Unlike ACCEPTANCE_8, groups 3 and
13 also hold under numeric index pollution (section 3).

## 10. Reason catalogue

- `MATCH_REASON_CODES` is frozen with **44** unique entries; `reasons.ts` is
  byte-identical to `b9176d1`.
- `push`, an index write, `length = 0`, `sort` and `setPrototypeOf` throw
  `TypeError`, and the list is unchanged afterwards.
- A candidate with `["BOGUS_CODE"]` throws `INPUT_INVALID`.
- Every outcome observed in this review uses a catalogue code.
- **Verdict: 44/44 PASS; L-06 has no regression.**

## 11. D-064 limits

| Limit                            |                  Value | Evidence (this review)                                                                       | Verdict |
| -------------------------------- | ---------------------: | -------------------------------------------------------------------------------------------- | ------- |
| Instruments                      |                  1,024 | 1,024 → typed work bound, no publication; authored boundary and one-over tests pass          | PASS    |
| Partners / pairs                 |             32 / 8,192 | authored boundary and one-over tests pass; `policy.ts` unchanged                             | PASS    |
| Bindings / alias depth           |              4,096 / 1 | authored tests; alias cycle, chain and self → `QUARANTINED`                                  | PASS    |
| Versions / events                |             64 / 4,096 | authored one-over tests; 16-version admission measured                                       | PASS    |
| Evidence                         |    32 / 32,768 / 8 KiB | authored tests; 8-record bundle measured                                                     | PASS    |
| Atomic / composite / reason      |      160 / 4,096 / 512 | registry revision of 160 characters accepted, 161 and 100,000 refused; `bounds.ts` identical | PASS    |
| Timestamps                       | strict UTC millisecond | months `00`/`13`/`99` refused, also under `-1`/`12`/`98` pollution; TZ matrix (H-04)         | PASS    |
| JSON depth / nodes / keys        |      16 / 100,000 / 64 | snapshot gates unchanged; L-04 sweep includes nested hostile shapes                          | PASS    |
| Decimal domain                   |   78 digits / scale 78 | ±(10^78 − 1) and scale 78 accepted; 10^78 and scale 79 refused before reconstruction         | PASS    |
| Cumulative logical work          |                100,000 | 1,024 instruments → typed failure; single budget, no reset                                   | PASS    |
| Cancellation interval            |            ≤ 128 steps | maximum charged gap 128 over 29 outcomes and 1,171 placements                                | PASS    |
| Charge before work (public copy) |                      — | `publicView` charged per node before the final check; tail 0                                 | PASS    |

**Aggregate D-064 assessment: PASS.**

## 12. Serialization and digest

A cross-version material probe ran identically on `b9176d1` and `715243c`. It
renders own properties only, so the prototype change does not count. It
covers all 48 workflow operations: every evaluation outcome class,
candidates, batches, three admissions, five replays, seven command paths,
registry admission and resolution, evidence, an exposure key, a provenance
digest, timestamps and normalizations.

Both versions give the same combined SHA-256,
**`946529fbbac10825ca4606bc12aac046311dc9080ce0bbd8bdfe287257e6c83a`**, in
separate `UTC`, `America/New_York` and `Asia/Tokyo` processes (six runs, one
value). `serialization.ts` and `serialization.test.ts` are unchanged; the
exposure key is `instrument-exposure-pilot/v1|10:DERIVATIVE7:asset:A…9:BASE_UNIT`
in both.

**Verdict: PASS (digest stability).**

## 13. Real venues

The fixtures follow the frozen adapters, as confirmed in the adapter sources:

- OKX (`mapping.ts:193`): `known(contractMultiplier(ctVal))` (0.01 in the
  fixture) and a known `LINEAR` convention;
- Binance (`mapping.ts:197`, `200`): an `unverified` multiplier and a
  `researchRequired` convention (state `RESEARCH_REQUIRED`);
- Bybit (`mapping.ts:162`, `165`): an `unverified` multiplier and
  `known("LINEAR")`.

Results, identical with and without a fixture mapping, and identical to
`b9176d1`:

- OKX↔Binance: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
  `VALUE_CONVENTION_UNVERIFIED`].
- OKX↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`].
- Binance↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
  `VALUE_CONVENTION_UNVERIFIED`].

`generateCandidates` over the three venues gives one `INCOMPLETE` candidate
and 0 complete ones. The adapters are unchanged, and the package holds no
registry or approved mapping data. There are **zero approved real pairs**.
**Verdict: PASS.**

## 14. Exact test and build results (fresh copy `q`)

The verification ran in a fresh `git archive` materialization of `715243c`
with no `node_modules` or `dist`, on Node v24.18.1 and npm 11.16.0.

**Install:** `npm ci` (run with `--no-audit --no-fund`) exit 0, **450
packages added**. The lockfile is byte-identical to the mandated hash.

**Quality, tests and build:**

- `npm run format:check`, `lint`, `typecheck`, `test` and `build`: **all exit
  0**.
- Full `npm test`: **57 test files** (54 passed, 3 opt-in live-canary files
  skipped); **572 passed, 0 failed, 3 skipped**.
  - contracts 4;
  - market-data 57;
  - spread-analytics **312 (22 files)**;
  - OKX 52 (+1 skipped);
  - Binance 72 (+1 skipped);
  - Bybit 69 (+1 skipped);
  - web 6.
- Build: six static routes (`/`, `/_not-found`, `/forgot-password`, `/login`,
  `/register`, `/verify-email`).

**Focused and matrix runs:**

- Focused run (eighth and seventh hardening; sixth, fifth, fourth, third and
  second remediation; first remediation; work-accounting oracle and source
  audit; D-055 scenarios; reasons; serialization; determinism; governance;
  bounds; candidate bounds; validation): **18 files, 298/298**.
- Per file:
  - eighth hardening **12/12**, seventh 19/19, sixth 15/15;
  - fifth 40/40, fourth 21/21, third 23/23, second 21/21, first 36/36;
  - oracle 15/15 and source audit 7/7;
  - `d055-scenarios` **40/40**;
  - reasons 1/1, serialization 3/3, determinism 1/1;
  - governance 7/7, bounds 24/24, candidate bounds 6/6, validation 7/7.
- Cancellation and atomicity coverage is inside the remediation, bounds,
  governance and oracle suites, and in the independent sweeps (section 7).
- Host-time-zone matrix (separate processes, `TZ=UTC`, `America/New_York`,
  `Asia/Tokyo`): **22/22 files, 312/312 tests** each.
- Public surface: 22 runtime exports from a fresh `dist/index.js`; 11 deep
  imports refused (section 2, H-02).

**Repository checks:**

- Markdown local links: 0 broken, including this report (section 16).
- `git diff --check`: clean in the repository and for `b9176d1..715243c`.
- `git fsck --full`: exit 0.

## 15. Findings table

| ID   | Severity            | State                         | Evidence                                                                                                                                                                                                                                                                                                                             | Required resolution                                                                          |
| ---- | ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| B-01 | BLOCKER (historic)  | RESOLVED                      | section 2                                                                                                                                                                                                                                                                                                                            | none                                                                                         |
| B-02 | BLOCKER (historic)  | RESOLVED                      | sections 2 and 5                                                                                                                                                                                                                                                                                                                     | none                                                                                         |
| H-01 | HIGH (historic)     | RESOLVED                      | section 2                                                                                                                                                                                                                                                                                                                            | none                                                                                         |
| H-02 | HIGH (historic)     | RESOLVED                      | section 2: 22 exports, 11 deep imports refused                                                                                                                                                                                                                                                                                       | none                                                                                         |
| H-03 | HIGH                | RESOLVED                      | section 7: gap 128, tail 0, 1,171/1,171 placements, 28/28 more conservative                                                                                                                                                                                                                                                          | none                                                                                         |
| H-04 | HIGH                | RESOLVED                      | section 2; TZ matrix 312/312 ×3                                                                                                                                                                                                                                                                                                      | none                                                                                         |
| M-01 | MEDIUM              | RESOLVED — accepted semantics | section 8                                                                                                                                                                                                                                                                                                                            | none                                                                                         |
| M-02 | MEDIUM              | RESOLVED                      | section 2                                                                                                                                                                                                                                                                                                                            | none                                                                                         |
| N-01 | MEDIUM              | RESOLVED (no regression)      | section 2: 0 getter reads                                                                                                                                                                                                                                                                                                            | none                                                                                         |
| N-02 | MEDIUM              | RESOLVED (no regression)      | sections 2 and 6: 20/20 mutations throw                                                                                                                                                                                                                                                                                              | none                                                                                         |
| N-03 | MEDIUM              | RESOLVED (no regression)      | sections 2 and 6: 3.2 ms; `fromParts` never sees rejected parts                                                                                                                                                                                                                                                                      | none                                                                                         |
| L-01 | LOW                 | Informational (carried)       | 18 hard-break spaces in the `9dacc82` range                                                                                                                                                                                                                                                                                          | normalize at the next authorized documentation edit                                          |
| L-02 | LOW                 | RESOLVED                      | section 2                                                                                                                                                                                                                                                                                                                            | none                                                                                         |
| L-03 | LOW                 | RESOLVED (no regression)      | section 2                                                                                                                                                                                                                                                                                                                            | none                                                                                         |
| L-04 | LOW                 | RESOLVED                      | section 2: 286 hostile calls, 0 raw errors                                                                                                                                                                                                                                                                                           | none                                                                                         |
| L-05 | LOW                 | **RESOLVED**                  | sections 3 and 6: numeric and named data pollution inert across 412 + 355 runs                                                                                                                                                                                                                                                       | none                                                                                         |
| L-06 | LOW                 | RESOLVED (no regression)      | section 10                                                                                                                                                                                                                                                                                                                           | none                                                                                         |
| L-07 | LOW                 | **RESOLVED**                  | section 3: exploit reproduced at `b9176d1`, closed at `715243c`; 0 of 412 runs differ; audit 0 uncovered (section 4)                                                                                                                                                                                                                 | none                                                                                         |
| A-01 | ACCEPTED_LIMITATION | carried                       | cooperative cancellation; one precharged atomic native call is not interruptible                                                                                                                                                                                                                                                     | none                                                                                         |
| A-02 | ACCEPTED_LIMITATION | carried                       | own-key enumeration charged immediately after its single native pass                                                                                                                                                                                                                                                                 | none                                                                                         |
| A-03 | ACCEPTED_LIMITATION | carried                       | zero approved real venue pairs                                                                                                                                                                                                                                                                                                       | none                                                                                         |
| A-04 | ACCEPTED_LIMITATION | carried (see O-1, O-2)        | Proxies neutralized by single reads; globally patched built-ins and `get`/`set` descriptor-name pollution out of scope; every operation fails closed under them                                                                                                                                                                      | none                                                                                         |
| A-05 | ACCEPTED_LIMITATION | carried                       | `TypeError`/`RangeError` → `INPUT_INVALID` normalization                                                                                                                                                                                                                                                                             | none                                                                                         |
| O-1  | Informational       | new observation (A-04 class)  | Under `get`/`set` pollution of `Object.prototype`, `publicView`'s descriptor literal throws a raw `TypeError` outside `inputBoundary`: admission ×3, `APPLIED` command, `resolve` ×2 and the month-13 admission (7 operations; 1 at `b9176d1`, which returned typed or fail-closed results for the other 6). No result is published. | optional: use a null-prototype descriptor in `publicView`, or call it inside `inputBoundary` |
| O-2  | Informational       | new observation (A-04 class)  | Numeric names installed as non-writable data or as accessors: every operation fails closed or degrades (no promotion in 60 accessor runs at `715243c`). Accessor pollution leaves holes in published `reasons` arrays because `push` invokes the inherited setter.                                                                   | none                                                                                         |
| O-3  | Informational       | new observation               | The authored AST audit omits array-destructuring patterns (14 sites); all are safe dense internal tuples.                                                                                                                                                                                                                            | optional: extend the audit test to `ArrayBindingPattern`                                     |

**There is no new BLOCKER, HIGH, MEDIUM or LOW finding.** The warnings in the
status are O-1 to O-3 and the carried L-01.

## 16. Frozen-boundary evidence

`git diff b9176d1 715243c` is **empty** for all of the following:

- `packages/market-data`, `packages/contracts` and `packages/design-tokens`;
- the OKX, Binance and Bybit adapters;
- `apps`, `infra` and `docs/brand`;
- the root `package.json` and `package-lock.json`;
- D-055, the D-055 acceptance, D-064 and the capacity decision;
- acceptance reports 1–8 and the re-acceptance;
- the package manifest and `tsconfig`;
- `index.ts`, `policy.ts`, `bounds.ts`, `reasons.ts`, `model.ts`,
  `serialization.ts`, `snapshot.ts`, `test-fixtures.ts` and every earlier
  test file except the two documented assertions in
  `seventh-acceptance-hardening.test.ts`.

Every changed path is under `packages/spread-analytics/**` or is
`docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_IMPLEMENTATION.md`. The diff
from `9dacc82` for the frozen packages, `apps`, `infra`, `docs/brand`, D-055,
its acceptance and D-064 is also empty. All mandated hashes match
(section 1).

After this report was added:

- the Markdown link check gives **0 broken** local links, this report
  included;
- `git status --short` lists only
  `?? docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_9.md`.

**Verdict: PASS.**

## 17. Freeze recommendation

**What passes:**

- L-07 is closed. The exact ACCEPTANCE_8 exploit reproduces at `b9176d1` and
  is inert at `715243c`, and so are the `-1` and `12` reads the implementer
  found. A 412-run numeric sweep over 48 operations is byte-identical to the
  clean run (230 of 412 differ at `b9176d1`).
- L-05 is closed. Named and numeric data pollution no longer influence
  matching, approval, replay, serialization or publication.
- The independent audit finds 70 explicit index-read sites, 0 uncovered,
  and confirms the dense-array invariant.
- Public outputs are ordinary frozen plain objects again, as accepted up to
  ACCEPTANCE_7. Shared identities hold, no public copy is read as authority,
  and no forged history handle authenticates.
- Every regression area stays green: N-01, N-02, N-03, L-03, L-06, B-01,
  B-02, H-01 to H-04, M-01, M-02, L-02 and L-04.
- 29/29 D-055 groups, 40/40 authored cases, 44 codes, 22 exports, a stable
  cross-version digest, zero approved real pairs and unchanged frozen
  boundaries.
- Charged work is higher than `b9176d1` in every published outcome, with a
  maximum charged gap of 128, a tail of 0 and 1,171/1,171 abort placements.

**Warnings:** O-1 (more raw `TypeError` exits under the accepted A-04
`get`/`set` pollution, still fail-closed), O-2 (non-data numeric pollution,
fail-closed), O-3 (audit-test coverage gap, no defect) and the carried L-01.
None of them meets the LOW calibration of ACCEPTANCE_6 to 8, because none
changes a decision or publishes an incorrect result under any in-scope
condition.

**Final status: PASS_WITH_WARNINGS. BLOCKER 0. Unresolved HIGH 0.**
**Phase 2B.1 may freeze: YES. Phase 2B.2 eligible for separate
authorization: YES.**

**Exact recommended next task.** The Phase 2B.1 authority records the freeze
of `715243c` on the basis of this report, optionally after one small hardening
of O-1 and O-3 that changes no decision, digest, rate, bound or export. Phase
2B.2 then needs its own separate authorization. Eligibility is not
authorization, and this review does not begin Phase 2B.2.

Final status: PASS_WITH_WARNINGS
BLOCKER count: 0
Unresolved HIGH count: 0
L-07: RESOLVED
L-05: RESOLVED
N-01 regression: PASS
N-02 regression: PASS
N-03 regression: PASS
L-03 regression: PASS
L-06 regression: PASS
Numeric-index audit: 70 sites, 63 safe, 7 changed, 0 uncovered
Public-output prototype compatibility: PASS
D-055: 29/29
Scenarios: 40/40
Reason codes: 44
D-064: PASS
Runtime exports: 22
Digest stability: PASS
Real venues: PASS (approved real pairs: 0)
Frozen boundaries: PASS
Phase 2B.1 may freeze: YES
Phase 2B.2 eligible for separate authorization: YES
