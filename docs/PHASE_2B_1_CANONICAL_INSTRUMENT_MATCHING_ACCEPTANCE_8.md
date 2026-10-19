# Phase 2B.1 — eighth independent acceptance review

- Review date: 2026-10-19.
- Reviewer: an independent technical AI reviewer, a separate actor from the
  implementing session and from the authors of the seven earlier reports. This
  is a technical attestation, not a human professional signature.
- Reviewed state: branch `claude/stoic-lovelace-uxfohy`, exact commit
  `5aa2fdff95e74d419d38109e6899444717830b45` (tree
  `abd20be9a9e8263e882b9ba0f3dfe1cc31bf5e64`), "fix: close Phase 2B.1
  authority-boundary findings".
  - Parent: `8d17682027e0469a4500196f0de3ecbdd95ab57a` (carries ACCEPTANCE_7 =
    FAIL).
  - D-055 baseline: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3` (`origin/main`).
- Scope: ACCEPTANCE_8, a focused, adversarial re-acceptance of N-01, L-03,
  N-02, N-03, L-05 and L-06 from
  [ACCEPTANCE_7](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_7.md)
  section 15, plus regression checks of B-01, B-02, H-01 to H-04, M-01, M-02,
  L-02 and L-04.
- Execution: three disposable `git archive` materializations, each with its
  own `npm ci`:
  - `q`, the authoritative quality run of `5aa2fdf`, never touched by probes;
  - `p`, the probe copy of `5aa2fdf`;
  - `old`, a copy of `8d17682` for cross-version comparison.

  Every probe was written for this review and run identically on `p` and
  `old` where the API allowed. All probes and copies were deleted afterwards.

- Final status: **FAIL**. BLOCKER: **0**. Unresolved HIGH: **0**.
- **N-02, N-03 and L-06 are resolved, and with them N-01 and L-03.** Both
  trusted handles are now immutable, the registry revision is read once from
  private state, the idempotent command path returns internal state, decimals
  are gated before reconstruction, and the reason catalogue is frozen.
- **L-05 is not resolved.** Every named-property pollution vector is closed,
  including the ACCEPTANCE_7 `Object.prototype.mapping` exploit. But
  `CuratedAssetRegistry#resolve` still reads index `0` of possibly empty
  internal arrays. Polluting `Object.prototype["0"]` turns
  `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN` into `MATCHED/COMPATIBLE_APPROVED`, and
  collapses USDT and USDC legs onto one identity (new finding L-07, LOW). The
  implementation evidence §22.15 says that array reads are "length-gated
  first"; that statement is false for these reads.
- Phase 2B.1 may freeze: **NO**. Phase 2B.2 eligible for separate
  authorization: **NO**.
- This review created only this report. No implementation, test, manifest,
  lockfile, dependency, D-055, D-064, capacity decision, prior report,
  implementation evidence or frozen scope was changed. Nothing was committed,
  pushed or tagged. Phase 2B.2 was not begun.

## 1. Governing baseline and integrity

Checks run in `/home/user/HolyParser` before any other work:

- `git rev-parse HEAD` and `git rev-parse origin/claude/stoic-lovelace-uxfohy`
  are both `5aa2fdf…`, and `git status --short` is empty.
- `git diff --check` is clean, and `git fsck --full` exits 0.
- `git log --oneline -6` shows `5aa2fdf` → `8d17682` → `18e2772` → `4becf10`
  → `1e091f9` → `8f35571`.
- Node is **v24.18.1** and npm **11.16.0**. The archive
  `node-v24.18.1-linux-x64.tar.xz` was re-hashed as `d6c664df…d15a0`, which
  matches its line in the supplied `SHASUMS256.txt`.

Read: `AGENTS.md`; the relevant parts of `MASTER_SPEC`; D-055 and its
acceptance; D-064; the capacity-semantics decision (Option A); ACCEPTANCE_6
and ACCEPTANCE_7 (sections 3–7 and 15 are the controlling evidence);
implementation evidence §21 and §22 (§22 is the claim set under review); the
relevant parts of `DOMAIN_MODEL`, `API_CONTRACTS_PLAN`, `SECURITY_MODEL`,
`RISK_REGISTER`, `DECISIONS_REQUIRED` and `ACCEPTANCE_CRITERIA`; every runtime
and test module under `packages/spread-analytics/**`; and the full
`git diff 8d17682 5aa2fdf`.

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
| [Seventh acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_7.md)        | `175573a3762623766e5b5b54038e7ce937848b520b4f73c78e2441c3a9767705` | unchanged since `8d17682`             |
| [Implementation evidence](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_IMPLEMENTATION.md) | `3a5cebc7b84b28fb7d10c0f5fff3b7c53f79a959ff5d72c8392ce6d317afc98c` | 458 lines appended (§22), no removals |
| Root `package.json`                                                                   | `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` | matches the mandated value            |
| `package-lock.json`                                                                   | `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59` | matches the mandated value            |

`git diff --stat 8d17682 5aa2fdf` lists 14 files, all inside the permitted
scope:

- the implementation evidence (458 insertions, 0 deletions);
- twelve runtime modules: `admission`, `candidates`, `commands`, `evaluator`,
  `evidence`, `immutable`, `reasons`, `registry`, `replay`, `snapshot`,
  `transitions`, `validation`;
- the new `seventh-acceptance-hardening.test.ts`.

`index.ts`, `policy.ts`, `bounds.ts`, `time.ts`, `model.ts`,
`serialization.ts`, `economics.ts`, `diagnostics.ts`, `work-oracle.ts`,
`test-fixtures.ts`, every earlier test file, and the package `package.json` and
`tsconfig.json` are byte-identical to `8d17682`.

## 2. Required finding verdicts

| Finding                                         | Verdict                                                   | Independent basis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N-02** — trusted-handle mutability            | **RESOLVED**                                              | The ACCEPTANCE_7 getter exploit was reproduced at `8d17682` (`MATCHED` publishing `registry-FORGED` against a mapping revision `registry-v1`, getter read 3 times). At `5aa2fdf`, direct instances, both class prototypes and both classes are frozen. Every one of 15 registry and 11 ledger mutation attempts throws `TypeError`. Subclass, `Reflect.construct` and mid-operation vectors never change a published value. The idempotent path returns the ledger's internal frozen record (section 3).                                                   |
| **N-03** — decimal pre-validation and charging  | **RESOLVED**                                              | A 10^100,000 / 100,000 spoof costs **0.8 ms** (3,667 ms at `8d17682`). A spy shows `ExactDecimal.fromParts` is **never** called with rejected parts across 21 rejected forms. The ±10^78 − 1 and scale-78 boundaries are accepted; ±10^78, scale 79, −1, 10^9, 2^53, 1.5, `NaN`, strings and three non-normalized forms are rejected. The 624-unit rebuild charge precedes every reconstruction (section 4).                                                                                                                                               |
| **L-05** — prototype pollution                  | **UNRESOLVED** (named vectors closed; numeric index open) | 71 names × 5 values × 14 operations: the 68 names other than `0`, `get` and `set` are inert, including the ACCEPTANCE_7 `mapping` and `candidate` vectors (both reproduced at `8d17682`). `get`/`set` fail closed (accepted A-04). **But** `Object.prototype["0"]` changes the published outcome. Identical at `8d17682`, it turns `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN` into `MATCHED/COMPATIBLE_APPROVED`, makes a USDT↔USDC pair pass the identity gate, and creates candidates for pairs that have different bases. This is new finding L-07 (section 5). |
| **L-06** — mutable reason catalogue             | **RESOLVED**                                              | `Object.isFrozen` is `true`, and there are 44 unique codes in unchanged order. All 14 mutation forms throw `TypeError` and leave the list unchanged. A candidate carrying `BOGUS_CODE` stays `INPUT_INVALID`. At `8d17682` the push succeeded and the bogus candidate was accepted (section 7).                                                                                                                                                                                                                                                            |
| **N-01** — validated vs published divergence    | **RESOLVED**                                              | Its last open path was N-02, which is now closed. An accessor sweep over 18 public entry points gives 0 getter reads and typed refusals. Every `MATCHED` observed has `registryRevision === mappingVersion.registryRevision`, and mid-operation mutation leaves the result ID equal to the honest run. The L-07 pollution outcome is not a validated-versus-published divergence: the identity that is validated is the identity that is published. It is tracked under L-05.                                                                              |
| **L-03** — echoed candidate / fake registry     | **RESOLVED**                                              | The 100,000-character revision can no longer be assigned or constructed: assignment throws, and construction is `INPUT_INVALID` above 160 characters. Every exit, including `NOT_MATCHED/SAME_VENUE_EXCLUDED` and `generateCandidates`, publishes `registry-v1`. Plain, prototype-spoof, Proxy and `null` registries and ledgers are refused. The idempotent `mapping` is never the caller's object.                                                                                                                                                       |
| B-01 — forged history/transition authority      | **RESOLVED (no regression)**                              | Dropped supersede transition → `CONFLICTING/TRANSITION_REJECTED`; forged reason → `INVALID_PROVENANCE`; forged status or `supersededBy` → `DIGEST_MISMATCH`; a spread or Proxy history handle → `INPUT_INVALID`. All are identical to `8d17682`.                                                                                                                                                                                                                                                                                                           |
| B-02 — immutable admitted replay                | **RESOLVED (no regression)**                              | Admission from a fully mutable deep copy, followed by mutation of status, exposure key, transitions and history length, leaves the history digest and replay byte-identical. Result, history, versions and records are frozen, and redefining `current` throws.                                                                                                                                                                                                                                                                                            |
| H-01 — product scope before identity            | **RESOLVED (no regression)**                              | SPOT, dated, unknown, option and inverse partners yield 0 candidates and no exposure key (`SPOT_DERIVATIVE_MISMATCH`, `DATED_PRODUCT_EXCLUDED`, `PRODUCT_ENUM_UNVERIFIED`, `PRODUCT_UNSUPPORTED`, `VALUE_CONVENTION_MISMATCH`). A valid perpetual gives the golden key `instrument-exposure-pilot/v1\|10:DERIVATIVE7:asset:A…9:BASE_UNIT`.                                                                                                                                                                                                                 |
| H-02 — public API closure                       | **RESOLVED (no regression)**                              | A fresh `dist/index.js` has exactly **22** runtime exports with unchanged names, and no `export *`. No oracle, fixture or test file is in `dist`. Ten deep imports, including `dist/snapshot.js`, `dist/work-oracle.js`, `dist/index.js`, `./bounds`, `./test-fixtures` and `./package.json`, all return `ERR_PACKAGE_PATH_NOT_EXPORTED`.                                                                                                                                                                                                                  |
| H-03 — cumulative logical work and cancellation | **RESOLVED (no regression; N-03 regression closed)**      | 37 typed outcomes: **1,233 of 1,233** abort placements throw `EVALUATION_CANCELLED`. The maximum charged gap is 128, and the publication tail is 0 on all 36 published outcomes. Charged units are at least those of `8d17682` in 36 of 36 (29 higher, 7 equal). At the 1,024-instrument cap the budget is exhausted earlier in the work (section 6).                                                                                                                                                                                                      |
| H-04 — runtime timestamp validation             | **RESOLVED (no regression)**                              | `time.ts` is byte-identical. In separate `TZ=UTC`, `America/New_York` and `Asia/Tokyo` processes (offsets 0, 240 and −540), the material digest is identical (`3ed374b4…f997a`), and the package suite passes 300/300 in each zone.                                                                                                                                                                                                                                                                                                                        |
| M-01 — capacity semantics                       | **RESOLVED — accepted semantics (no regression)**         | Option A holds: 1,024 instruments fail with typed `MATCHING_BOUND_EXCEEDED` at the 100,000-step budget, with no publication, and 782 of 782 abort placements throw. `policy.ts` and `bounds.ts` are byte-identical (section 8).                                                                                                                                                                                                                                                                                                                            |
| M-02 — caller-supplied budget authority         | **RESOLVED (no regression)**                              | Seven public callables were each given three extra permissive fake budgets and three throwing tripwire proxies. Results were identical, and the tripwire was read **0** times. An always-aborted signal throws `EVALUATION_CANCELLED` on all eight signal-taking operations.                                                                                                                                                                                                                                                                               |
| L-02 — replay mode                              | **RESOLVED (no regression)**                              | `AS_KNOWN` and `CORRECTED` replay normally. All 13 forged modes throw `INPUT_INVALID`: `"BOGUS"`, `"as_known"`, `7`, `null`, `undefined`, `{}`, `[]`, `new String`, padded, NUL-suffixed, a symbol, a bigint and `true`.                                                                                                                                                                                                                                                                                                                                   |
| L-04 — untyped exceptions                       | **RESOLVED (no regression)**                              | 36 entry and argument positions × 13 hostile values = **468** calls, with **0** raw `TypeError`/`RangeError`: 372 `INPUT_INVALID`, 13 `EVIDENCE_TIME_INVALID`, and 83 benign results for legitimate values such as an omitted optional field. Under deliberate `get`/`set` pollution of `Object.prototype`, `new MappingLedger()` now throws a raw `TypeError` (see A-04).                                                                                                                                                                                 |

## 3. Trusted handles (N-02) — independent probes

**Shape at `5aa2fdf`** (it was `false`/writable/configurable in every row at
`8d17682`):

| Property                                                                     | Registry | Ledger  |
| ---------------------------------------------------------------------------- | -------- | ------- |
| `Object.isFrozen(instance)`                                                  | `true`   | `true`  |
| Public view (`revision` / `versions`, `transitions`) writable                | `false`  | `false` |
| Public view configurable                                                     | `false`  | `false` |
| Class prototype frozen                                                       | `true`   | `true`  |
| Class frozen                                                                 | `true`   | `true`  |
| Nested `revision` object, `assets` array and asset records frozen (registry) | `true`   | —       |
| `versions` array, version records and `approvals` frozen (ledger)            | —        | `true`  |

**Registry attacks (genuine direct instance).** All 15 throw `TypeError`:

- assigning `revision = { revision: "X".repeat(100000) }`;
- assigning a forged revision object;
- an instance getter, `delete`, and `setPrototypeOf`;
- writing the nested `revision`;
- `assets.push`, `assets[0] =`, `bindings.length = 0`, and writing an asset
  field;
- a prototype getter and replacing a prototype method;
- adding an own key, adding a static member, and `setPrototypeOf` on the class.

After all 15, `evaluateMatch` still gives honest results:
`MATCHED/COMPATIBLE_APPROVED` with result ID `fa4d4e17…`, and
`NOT_MATCHED/SAME_VENUE_EXCLUDED` with result ID `3f8fdefb…`. Both publish
`registry-v1`, and `generateCandidates` publishes `["registry-v1"]`.

| Vector                                                                                              | `8d17682`                                                                                                                 | `5aa2fdf`                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Instance getter on `revision`: real value at read 1, forged afterwards                              | **`MATCHED`**, published `registry-FORGED`, mapping revision `registry-v1`, 3 getter reads                                | getter cannot be installed (`Cannot redefine property`); `MATCHED`, published `registry-v1` = mapping revision, 0 reads                      |
| `revision = { revision: "X".repeat(100000) }`                                                       | published a 100,000-character revision on `QUARANTINED`, on `NOT_MATCHED/SAME_VENUE_EXCLUDED` and in `generateCandidates` | `TypeError`; every exit publishes `registry-v1`                                                                                              |
| Constructor with a 100,000-, 161- or 0-character revision                                           | —                                                                                                                         | `INPUT_INVALID`; 160 characters accepted                                                                                                     |
| Subclass whose prototype getter returns different revisions on successive reads                     | `INPUT_INVALID` (the base constructor's own field broke the subclass)                                                     | constructs; the own non-configurable field shadows the getter (**0 reads**); `MATCHED` and `SAME_VENUE` are honest, with the same result IDs |
| Subclass class field `revision = { … 100,000 … }`                                                   | —                                                                                                                         | the subclass constructor throws `Cannot redefine property` (caller code)                                                                     |
| Subclass instance: assign or define `revision`; replace `resolve` on the subclass prototype         | —                                                                                                                         | `TypeError` (the inherited `resolve` is read-only through the frozen prototype); `setPrototypeOf` succeeds but is inert; results honest      |
| `Reflect.construct(CuratedAssetRegistry, [rev], Fake)` with a `revision` getter on `Fake.prototype` | —                                                                                                                         | branded but unfrozen; the getter is shadowed; honest `MATCHED` and `SAME_VENUE`                                                              |
| Proxy of a genuine registry; `Object.create(prototype)`; plain object; `null`                       | refused                                                                                                                   | `INPUT_INVALID` on `MATCHED`, early `NOT_MATCHED` and `generateCandidates`                                                                   |
| Assign or define `revision` from inside the signal getter at poll 3                                 | published `registry-MIDOP`; result ID diverged                                                                            | each attempt throws; 14 polls; result ID equal to the honest run                                                                             |
| Assign from the signal getter during `generateCandidates`                                           | —                                                                                                                         | `["registry-v1"]`                                                                                                                            |
| `evaluateBatch` (`MATCHED` + same-venue)                                                            | —                                                                                                                         | honest pair, both `registry-v1`                                                                                                              |

**Read once from trusted state.** Source check: `trustedRegistryRevision`
authenticates the handle and reads `#revisionId` once. It then re-validates
the value with `assertAtomicId`, charged to the operation budget. It is called
exactly once per operation:

- in `snapshotEvaluationInput` (`evaluator.ts:174`), before any exit;
- in `generateCandidatesWithBudget` (`candidates.ts:387`).

No runtime module reads the public `revision`, `versions` or `transitions`
views. **A `MATCHED` result cannot publish a `registryRevision` that differs
from `mappingVersion.registryRevision`.** The binding check
(`evaluator.ts:350`) compares that same local string, and the string is
immutable. No probe produced such a divergence.

**Ledger attacks (genuine direct instance).** All 11 throw `TypeError`:

- replacing `versions` and replacing `transitions`;
- a `versions` getter, `push`, an element write, and writing an element field;
- `approvals.push` and `setPrototypeOf`;
- replacing `apply` on the instance, and replacing `apply` and
  `commandDigest` on the prototype.

| Ledger vector                                                                  | `8d17682`                                            | `5aa2fdf`                                                                                                                                                                            |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `versions` replaced by `[fake]` (`mappingId` getter), then idempotent re-apply | `APPLIED`; returned mapping **is** the caller object | replacement throws; idempotent `APPLIED` returns the ledger's internal record (`=== versions.at(-1)`), frozen, null prototype; never `fake`                                          |
| First `APPLIED`                                                                | —                                                    | the returned `mapping` is the new ledger's own last version, frozen, null prototype; result frozen                                                                                   |
| Caller mutation of the returned `mapping`, `status` or `approvals`             | —                                                    | `TypeError` ×3                                                                                                                                                                       |
| Construction input mutated after `new MappingLedger(input)`                    | —                                                    | ledger unchanged (`mapping-1`, 1 version, 2 approvals)                                                                                                                               |
| Accessor in the construction input                                             | —                                                    | `INPUT_INVALID`, 0 reads                                                                                                                                                             |
| Subclass with a `versions` getter and an overriding `apply`                    | —                                                    | `admitMappingCommand` uses the private `#apply`: `APPLIED`, then idempotent `APPLIED`, never `fake`; the new ledger is a base-class instance; 0 getter reads; `setPrototypeOf` inert |
| `Reflect.construct(MappingLedger, [], FakeL)`                                  | —                                                    | unfrozen but branded; `APPLIED`, never `fake`                                                                                                                                        |
| Proxy, prototype spoof, plain object; `apply.call(proxy)`                      | refused                                              | `INPUT_INVALID`                                                                                                                                                                      |

**Assessment.** No authoritative value is read from a caller-mutable location
after the brand check. The one caller-supplied object that is still echoed is
the authenticated ledger handle itself, on idempotent and `REJECTED` results.
Its authority is private and immutable. For a caller-defined subclass instance
it may carry the caller's own non-authoritative fields, which §22.15 discloses.
This is informational. The §22.2–§22.4 and §22.11 claims are confirmed.
**N-02: RESOLVED.**

## 4. Decimal pre-validation (N-03) — independent probes

**Method.** A non-data decimal was placed as
`economics.baseUnitsPerNativeQuantity` and passed to `evaluateMatch`, once as
a prototype spoof and once as a mutated genuine `ExactDecimal`.

- `ExactDecimal.fromParts` was spied with a wrapper that records its
  arguments.
- `WorkBudget.prototype.units` was wrapped to record the order of charges.
- Polls were counted on the signal getter.

| Input (coefficient / scale)                                                  | `5aa2fdf`                                                                                | `8d17682`                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| spoof 10^100,000 / 100,000                                                   | **0.8 ms**, `INPUT_INVALID`, 1 poll, `fromParts` not called with it                      | **3,667 ms**, `fromParts(len 100,001, 100000)` |
| mutated genuine 10^100,000 / 100,000                                         | 0.2 ms, not called                                                                       | 3,484 ms                                       |
| spoof and mutated 10^1,000,000 + 1 / 0                                       | 0.4 ms, not called                                                                       | 470 ms / 477 ms                                |
| spoof 10^100,000 + 1 / 0                                                     | 0.2 ms, not called                                                                       | 30 ms                                          |
| as `metadata.contractMultiplier`, 10^100,000 / 100,000                       | 0.1 ms, not called                                                                       | 3,591 ms                                       |
| 10^78 − 1 / 0 and −(10^78 − 1) / 0                                           | accepted → `QUARANTINED/METADATA_EVIDENCE_CONFLICT` and `UNAVAILABLE/MULTIPLIER_INVALID` | same outcomes                                  |
| 10^78 / 0, −10^78 / 0, mutated 10^78 / 0                                     | `INPUT_INVALID`, not called                                                              | `fromParts` called, then rejected              |
| 1 / 78                                                                       | accepted                                                                                 | accepted                                       |
| 1 / 79, 1 / −1, 1 / 10^9, 1 / 2^53, 1 / 1.5, 1 / `NaN`, 1 / `"2"`, `"1"` / 0 | `INPUT_INVALID`, not called                                                              | `INPUT_INVALID`                                |
| 10 / 1, 100 / 2, 0 / 1, mutated 10 / 1 (non-normalized)                      | `INPUT_INVALID`, not called                                                              | `fromParts` called, then rejected              |
| 0 / 0, −5 / 0, 10 / 0, 1 / 3 (normal forms)                                  | accepted (`MULTIPLIER_INVALID` ×2, then `QUARANTINED`, `QUARANTINED`)                    | same outcomes                                  |

**Charge before work.** In every `5aa2fdf` run, each `fromParts` call is
immediately preceded by the 624-unit `DECIMAL_REBUILD_UNITS` charge
(4 × (78 + 78)). In every `8d17682` run it is not.

**Cancellation and budget before reconstruction.**

- With an abort from poll 1 on a 10^100,000 spoof, the operation throws
  `EVALUATION_CANCELLED` and `fromParts` never sees the spoof.
- A sweep on an in-domain spoof (abort from poll k + 1, k = 0…3) throws
  `EVALUATION_CANCELLED` 4 of 4 times. At poll 1, `fromParts` is called 0
  times.
- The gates are O(1). The scale range is checked first. The coefficient
  magnitude is compared against the bigint 10^78, a comparison V8 decides by
  operand length. The normal form is one `% 10n` on at most 78 digits. The
  cap, the cancellation interval and `bounds.ts` are unchanged.

**Budget-free helpers** (`normalizeBaseExposure`, `normalizeQuoteNotional`):

- 10^100,000 / 100,000 is refused in 0.1–0.2 ms with 0 `fromParts` calls on
  the rejected parts. At `8d17682` the same input took about 3,500 ms.
- 3 × 0.001 = 0.003.
- 10 / 1 and 1 / 79 → `INPUT_INVALID`.
- (10^78 − 1)² → `DECIMAL_BOUND_EXCEEDED`.

**`generateCandidates`** with the oversized spoof: 0.3 ms, `INPUT_INVALID`.
At `8d17682` it took 3,544 ms.

**Other paths in the diff.** No new uncharged superlinear path was found:

- `frozenRecord` (`Object.assign` into a null-prototype object) is applied to
  caller-sized records only after `chargeCopy`, now 4 units per key.
- Every other use of `frozenRecord` is a fixed internal shape.
- The constructor `defineProperty` and freeze calls are O(1).

The decimal own-key enumeration is still uncharged before its two-key check,
which is the A-02 class and unchanged from `8d17682`.

**N-03: RESOLVED.** The §22.8 claims are confirmed.

## 5. Prototype pollution (L-05) and the numeric-index residual (L-07)

**Sweep method.**

- 71 names were each polluted on `Object.prototype` as a non-enumerable,
  configurable data property.
- Each name took 5 values in turn: the string `"POLLUTED"`, a genuine
  approved admission input, a forged candidate, `true`, and a function. That
  gives **355 runs**.
- Each run executed 14 operations: `MATCHED`, unmapped, unapproved-pair and
  same-venue evaluation; batch; admission; both replays; `APPLIED` plus
  idempotent command; candidates; registry admission; exposure key;
  provenance digest; and normalization.
- Each output was rendered from own properties only and hashed after the
  polluted key had been deleted.
- Every polluted key was removed in `finally`. A clean re-run afterwards was
  byte-identical, with no leftover keys.

**Names.** `mapping`, `candidate`, `revision`, `reasonCode`, `status`,
`approval`, `approvals`, `transition`, `transitions`, `identity`,
`provenance`, `value`, `signal`, `aborted`, `state`, `reason`, `asset`,
`assetId`, `confidence`, `supersededBy`, `invalidationReference`,
`priorVersion`, `successorVersion`, `reasonText`, `reference`, `history`,
`provisionalIdentity`, `effectiveTo`, `effectiveFrom`, `mode`, `registry`,
`version`, `mappingId`, `exposureKey`, `kind`, `reasons`, `outcome`,
`productClass`, `contractType`, `valueConvention`, `exposureUnit`,
`canonicalAssetId`, `targetAssetId`, `role`, `transitionType`,
`registryRevision`, `evidenceRevision`, `recordedAt`, `approvedDigest`,
`actorId`, `commandDigest`, `idempotent`, `ledger`, `coefficient`, `scale`,
`economics`, `metadata`, `payoff`, `description`, `documentedUnit`,
`exchangeTimestamp`, `reviewerId`, `reviewedAt`, `toJSON`, `then`, `0`,
`writable`, `enumerable`, `configurable`, `get`, `set`.

| Polluted name                   | `8d17682`                                                                                                      | `5aa2fdf`                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mapping` (approved admission)  | unmapped evaluation → **`MATCHED/COMPATIBLE_APPROVED`**; unapproved pair and batch changed                     | inert: `UNAVAILABLE/MAPPING_UNAPPROVED`                                                                                                                 |
| `candidate` (forged)            | `forged-candidate` echoed on all five evaluation operations                                                    | inert: no candidate published                                                                                                                           |
| `reason`                        | four evaluations threw, candidates changed                                                                     | inert                                                                                                                                                   |
| 64 other non-index names        | inert                                                                                                          | inert                                                                                                                                                   |
| `toJSON`                        | inert (an earlier diff was an artefact of the probe's own `JSON.stringify`, removed by hashing after deletion) | inert                                                                                                                                                   |
| `get`, `set` (descriptor names) | everything fails closed, except the command path                                                               | everything fails closed (`INPUT_INVALID`, or `INVALID_PROVENANCE` from admission); `new MappingLedger()` throws a raw `TypeError` (A-04, informational) |
| **`0`** (numeric index)         | candidates changed                                                                                             | **candidates changed (identical to `8d17682`)**                                                                                                         |

**Root cause of the `"0"` difference.** `CuratedAssetRegistry#resolve`
(`registry.ts:418`, `431`) reads `found[0]?.canonicalAssetId` and
`aliases[0]` before checking that these internal arrays are non-empty. An
empty array inherits index `0` from `Object.prototype` through
`Array.prototype`:

- **Unbound reference.** An unbound native reference resolves to the polluted
  `canonicalAssetId`.
- **Truthy polluted value.** It becomes a "reviewed alias". Its `targetAssetId`
  then redirects every resolved role, and its presence sets the confidence to
  `REVIEWED_MANUAL`.

The same unguarded pattern appears in `commands.ts:674`
(`target.approvals[0]?.approvedDigest`).

**Targeted reproduction.** Run identically at `8d17682` and `5aa2fdf`, with
identical results:

| Probe                                                                                                                                 | Clean                                   | `Object.prototype["0"]` polluted                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A/USDT leg ↔ a leg whose base reference is unbound, with a structurally valid approved mapping (`admitMaterializedMapping` → `VALID`) | `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN`      | value `{ canonicalAssetId: A }`: **`MATCHED/COMPATIBLE_APPROVED`**                              |
| A/USDT ↔ A/USDC, unmapped                                                                                                             | `NOT_MATCHED/SETTLEMENT_ASSET_MISMATCH` | value `{ targetAssetId: A }`: `UNAVAILABLE/MAPPING_UNAPPROVED`                                  |
| A/USDT ↔ A/USDC with the A/USDT mapping                                                                                               | `NOT_MATCHED/SETTLEMENT_ASSET_MISMATCH` | `QUARANTINED/DUPLICATE_EXPOSURE_CONFLICT`                                                       |
| A/USDT ↔ B/USDT                                                                                                                       | `NOT_MATCHED/BASE_ASSET_MISMATCH`       | `NOT_MATCHED/CONTRACT_UNIT_MISMATCH`                                                            |
| `generateCandidates` over A/USDT, B/USDT, A/USDC and an unbound leg                                                                   | 0 candidates                            | 3 to 6 candidates, all with identity `asset:A/asset:A/asset:A` and confidence `REVIEWED_MANUAL` |

**Assessment.**

- The precondition is environment-level: code able to write
  `Object.prototype`. That is the same class, and the same LOW calibration,
  as ACCEPTANCE_7's L-05 `mapping` vector.
- The effect is the one L-05 forbids. Pollution influences matching, to the
  point of a `MATCHED` result, and defeats the USDT/USDC separation at the
  identity gate (AGENTS.md rule 17).
- §22.15 discloses "numeric-index pollution … is not separately defended" but
  justifies it with "array reads are length-gated first". That justification
  is false for `registry.ts:418` and `431`.
- An implementer limitation cannot accept a residual of the class that the
  finding requires closed.

The named-property part of L-05 is fully resolved. **L-05 remains UNRESOLVED
because of L-07 (LOW, new, pre-existing at `8d17682`).** The `get`/`set`
descriptor-name failure is fail-closed in every operation. It is accepted
under A-04, which §22.15 now explicitly extends.

**Informational: published records have a null prototype.** Evaluation
results are now null-prototype objects. `String(result)` and template
interpolation throw `TypeError`, and `result.hasOwnProperty` is not a
function. At `8d17682` all three worked. `JSON.stringify`, the digests and
every authored test are unaffected. This is a consumer-visible shape change,
consistent with the L-05 remediation. It should be documented for Phase 2B.2
consumers.

## 6. Work-accounting and final-check verdicts

**Method** (the ACCEPTANCE_7 method, re-implemented for this review):

- `WorkBudget.prototype.step` was wrapped at 128 units per step, and `units`
  at 1:1, with nested calls not double counted.
- The private `check` was wrapped to record each budget's charged gap and the
  units charged after its last check (the publication tail).
- Polls were counted on the signal getter.
- Each outcome was re-run with the abort set from poll k + 1, for every k.
- The identical probe ran on `5aa2fdf` and `8d17682`.

| Outcome                                                               | `8d17682` → `5aa2fdf` charged units                   | Polls            |  Max gap | Tail | Abort sweep  |
| --------------------------------------------------------------------- | ----------------------------------------------------- | ---------------- | -------: | ---: | ------------ |
| eval `MATCHED`                                                        | 197,092 → 199,944                                     | 14 → 14          |      128 |    0 | 14/14        |
| eval `MATCHED` (66-character names)                                   | 247,483 → 250,335                                     | 17 → 17          |      128 |    0 | 17/17        |
| eval `SAME_VENUE`, `DATED`, `OPTION`                                  | 25,384 / 25,402 / 25,381 → +2,624 each                | 3 → 3            |      128 |    0 | 3/3 each     |
| eval base / settlement mismatch, unapproved, lifecycle unknown, stale | about 33,200 → +2,624 each                            | 4 → 4            |      128 |    0 | 4/4 each     |
| eval `MULTIPLIER_UNKNOWN`                                             | 33,389 → 34,765                                       | 4 → 4            |      128 |    0 | 4/4          |
| eval superseded / invalidated / quarantined mapping                   | 287,940 / 215,402 / 38,619 → +3,020 / +2,906 / +2,624 | 19 / 15 / 4      |      128 |    0 | all          |
| eval forged mapping / expired / candidate echo                        | 144,893 / 32,349 / 42,619 → +2,760 / +2,624 / +2,624  | 10→11 / 3→4 / 4  |      128 |    0 | all          |
| batch (3 items)                                                       | 274,869 → 282,969                                     | 18 → 19          |      128 |    0 | 19/19        |
| admission `VALID` / 16 versions                                       | 160,654 → 160,882 / 1,533,760 → 1,536,508             | 11 / 95          |      128 |    0 | 11/11, 95/95 |
| admission `SUPERSEDED` / `INVALIDATED` / `INVALID_INTERVAL` / forged  | +396 / +282 / +228 / +136                             | 17 / 13 / 11 / 8 |      128 |    0 | all          |
| admission `QUARANTINED`                                               | 3,709 → 3,709                                         | 2                |       28 |    0 | 2/2          |
| replay `AS_KNOWN` / `CORRECTED`                                       | 5,143 → 5,143 / 7,238 → 7,238                         | 2 / 2            |  40 / 56 |    0 | 2/2 each     |
| command `APPLIED`                                                     | 13,501 → 13,547                                       | 2                |      104 |    0 | 2/2          |
| command idempotent / `REJECTED` / `QUARANTINED`                       | 5,692 / 5,626 / 11,177 unchanged                      | 2 each           |     ≤ 87 |    0 | 2/2 each     |
| candidates (3) / (20)                                                 | 61,299 → 65,200 / 1,934,591 → 1,964,638               | 5 / 120→121      |      128 |    0 | 5/5, 121/121 |
| registry `READY` / `QUARANTINED`                                      | 107,292 → 107,760 / 3,468 → 3,468                     | 8 / 2            | 128 / 27 |    0 | all          |
| evidence (8 records)                                                  | 75,052 → 75,148                                       | 6                |      128 |    0 | 6/6          |
| 1,024-instrument cap                                                  | typed `MATCHING_BOUND_EXCEEDED` in both               | 782 → 782        |      128 |    — | 782/782      |

**Results:**

- **Outcomes:** 37 typed outcomes covering every public signal-taking
  operation and outcome class.
- **Abort sweep:** **1,233 of 1,233** placements throw
  `EVALUATION_CANCELLED` (1,229 of 1,229 at `8d17682`). No placement
  published a result.
- **Cancellation interval:** the maximum charged gap is **128** steps.
- **Final check:** the publication tail is **0** units on all 36 published
  outcomes. Source check: nothing follows the final `beforePublication()`
  except `return`. The new `defineProperty`/freeze calls in both constructors
  precede it.
- **No budget reset:** `trustedRegistryRevision`, the decimal gates and the
  rebuild charge use the operation's own budget. The ledger hand-off passes
  the parent budget and the command map through module-level slots. Those
  slots are read and cleared at the start of the constructor, before any
  caller code can run.
- **Conservatism against `8d17682`:** in 36 of 36 published outcomes, charged
  units are at least those of `8d17682` (29 strictly higher, 7 equal).

**Capacity at the cap.** The 1,024-instrument run exhausts the same 100,000
steps in both versions. The final attempted charge differs by 8 units
(12,800,363 → 12,800,355), a granularity effect of where the overflowing call
lands. The progress measure shows that `5aa2fdf` is more conservative:

- it fails after 263,524 unit charges, against 264,624 at `8d17682`;
- at 256 and 512 instruments it charges 33,715 and 67,418 steps, against
  31,217 and 62,424.

**Verdict: PASS.** H-03 has no regression, and the N-03 regression is closed.

## 7. Reason catalogue (L-06)

- `MATCH_REASON_CODES` is `Object.freeze([...] as const)`. Its runtime value
  is frozen and holds **44** entries, all unique. The order and contents are
  identical to `8d17682`: the only diff lines are the `Object.freeze(` wrapper
  and a comment.
- `push`, `splice`, `pop`, `shift`, `unshift`, `[0] =`, `[44] =`,
  `length = 0`, `defineProperty("44")`, `sort`, `reverse`, `fill`,
  `copyWithin` and `setPrototypeOf` each throw `TypeError`. The list is
  unchanged afterwards.
- A candidate whose reasons are `["BOGUS_CODE"]` throws `INPUT_INVALID`. At
  `8d17682`, `push("BOGUS_CODE")` succeeded and the same candidate was
  accepted.
- Every outcome observed in this review uses a catalogue code.
- **Verdict: 44/44 PASS; L-06 RESOLVED.**

## 8. Capacity semantics (Option A)

- The structural ceilings, the 100,000-step budget and the ≤128 interval are
  unchanged (`policy.ts` and `bounds.ts` are byte-identical).
- 1,024 instruments fail with typed `MATCHING_BOUND_EXCEEDED`, with no
  publication, and all 782 abort placements throw.
- No minimum capacity is claimed; §22.13's figures are informational.
- The measured rates are equal or stricter than `8d17682` (section 6).

**Verdict: PASS. M-01 reliance conditions are met.**

## 9. D-055 policy groups (29) — independent probe

The probe used its own instrument names (`Q8…`) and constructions through the
public modules. All 29 rows are byte-identical to `8d17682`. The authored
`d055-scenarios.test.ts` passes **40/40**.

|   # | Expected                            | Independent result                                                                                                      | Verdict |
| --: | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------- |
|   1 | Reviewed A/USDT linear perpetual    | `MATCHED/COMPATIBLE_APPROVED`                                                                                           | PASS    |
|   2 | Same ticker, different base         | `NOT_MATCHED/BASE_ASSET_MISMATCH`                                                                                       | PASS    |
|   3 | USDT vs USDC                        | `NOT_MATCHED/SETTLEMENT_ASSET_MISMATCH`                                                                                 | PASS    |
|   4 | Linear vs inverse                   | `NOT_MATCHED/VALUE_CONVENTION_MISMATCH`                                                                                 | PASS    |
|   5 | Perpetual/dated, dated/dated        | `DATED_PRODUCT_EXCLUDED` ×2                                                                                             | PASS    |
|   6 | Exact 1 / 0.001 / 100 normalization | `MATCHED` ×3; `normalizeBaseExposure(3, 0.001) = 3e-3`                                                                  | PASS    |
|   7 | Missing multiplier                  | `UNAVAILABLE/MULTIPLIER_UNKNOWN`                                                                                        | PASS    |
|   8 | Unknown lifecycle                   | `UNAVAILABLE/LIFECYCLE_UNKNOWN`                                                                                         | PASS    |
|   9 | Reviewed direct alias               | `MATCHED`; candidate `REVIEWED_MANUAL`; no mapping → `MAPPING_UNAPPROVED`                                               | PASS    |
|  10 | Conflicting binding                 | `QUARANTINED/ASSET_BINDING_CONFLICT`                                                                                    | PASS    |
|  11 | Superseded current vs historical    | evaluation `MAPPING_SUPERSEDED`; admission `SUPERSEDED`; `AS_KNOWN` replay `MATCHED` v1                                 | PASS    |
|  12 | Reviewed rebrand keeps identity     | `MATCHED` ×2; display name `asset:A` → `New Name 8`; exposure keys equal                                                | PASS    |
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

**29/29 PASS; 40/40 authored cases pass.** These results hold on a clean
`Object.prototype`. Under `Object.prototype["0"]` pollution, groups 3 and 13
are defeated (L-07, section 5).

## 10. D-064 limits

| Limit                                  |                  Value | Evidence (this review)                                                                       | Verdict |
| -------------------------------------- | ---------------------: | -------------------------------------------------------------------------------------------- | ------- |
| Instruments                            |                  1,024 | 1,024 → typed work bound, no publication; authored boundary and one-over tests pass          | PASS    |
| Partners / pairs                       |             32 / 8,192 | authored boundary and one-over tests pass; `policy.ts` unchanged                             | PASS    |
| Bindings / alias depth                 |              4,096 / 1 | authored tests; alias cycle, chain and self → `QUARANTINED`                                  | PASS    |
| Versions / events                      |             64 / 4,096 | authored one-over tests; 16-version admission measured                                       | PASS    |
| Evidence                               |    32 / 32,768 / 8 KiB | authored tests; accessor `sourceDigest` refused with 0 reads                                 | PASS    |
| Atomic / composite / reason            |      160 / 4,096 / 512 | registry revision of 160 characters accepted, 161 and 100,000 refused; `bounds.ts` identical | PASS    |
| Timestamps                             | strict UTC millisecond | section 2 (H-04)                                                                             | PASS    |
| JSON depth / nodes / keys              |      16 / 100,000 / 64 | snapshot gates unchanged; L-04 sweep includes nested hostile shapes                          | PASS    |
| Decimal domain                         |   78 digits / scale 78 | ±(10^78 − 1) and scale 78 accepted; ±10^78 and scale 79 refused before reconstruction        | PASS    |
| Cumulative logical work                |                100,000 | 1,024 instruments → typed failure; single budget, no reset                                   | PASS    |
| Cancellation interval                  |            ≤ 128 steps | maximum charged gap 128 over 37 outcomes and 1,233 placements                                | PASS    |
| Charge before work (non-data decimals) |                      — | 624 units charged before every `fromParts`; oversized parts never reach it (N-03 closed)     | PASS    |

**Aggregate D-064 assessment: PASS.**

## 11. Serialization and digest verdict

A cross-version material probe ran identically on `8d17682` and `5aa2fdf`. It
renders own properties only, and covers:

- candidates over four instruments;
- `MATCHED`, unmapped, same-venue and echoed evaluations;
- batch;
- the `VALID` and `INVALIDATED` admissions;
- both replays and both history digests;
- `APPLIED`, idempotent and `REJECTED` commands, and a command digest;
- registry admission, an exposure key, a provenance digest, an evidence bundle
  and a quote-notional normalization.

Both versions give the same combined SHA-256:
**`3ed374b436366a6b85455940c8e9a1b7a3e4304bcbde269beed5ba38838f997a`**. The
`MATCHED` result ID is `844007cb…c319a` in both. The digest is identical in
separate `UTC`, `America/New_York` and `Asia/Tokyo` processes.
`serialization.ts` and `serialization.test.ts` are unchanged, and the
null-prototype change does not alter any digest.

**Verdict: PASS (digest stability).**

## 12. Real-venue verdict

The fixtures follow the frozen adapters, as confirmed in the adapter sources:

- OKX: `known(contractMultiplier(ctVal))` and a known convention;
- Binance: an `unverified` multiplier and a `researchRequired` convention;
- Bybit: an `unverified` multiplier and `known("LINEAR")`.

Results, identical with and without a fixture mapping, and identical to
`8d17682`:

- OKX↔Binance: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
  `VALUE_CONVENTION_UNVERIFIED`].
- OKX↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`].
- Binance↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
  `VALUE_CONVENTION_UNVERIFIED`].

`generateCandidates` over the three venues gives 0 complete candidates. The
adapters are unchanged, and the package holds no registry or approved mapping
data. There are **zero approved real pairs**. **Verdict: PASS.**

## 13. Exact test and build results (fresh copy `q`)

The verification ran in a fresh `git archive` materialization of `5aa2fdf`
with no `node_modules` or `dist`, on Node v24.18.1 and npm 11.16.0.

**Install:**

- `npm ci` exit 0: **450 added / 459 audited**.
- `npm audit`: 14 advisories (2 moderate, 11 high, 1 critical). The lockfile
  is byte-identical, so this is audit-database drift, not a dependency change.
- `npm query '*'`: 451 packages.

**Quality, tests and build:**

- `npm run format:check`, `lint`, `typecheck`, `test` and `build`: **all exit
  0**.
- Full `npm test`: **56 test files** (53 passed, 3 opt-in live-canary files
  skipped); **560 passed, 0 failed, 3 skipped**.
  - contracts 4;
  - market-data 57;
  - spread-analytics **300 (21 files)**;
  - OKX 52 (+1 skipped);
  - Binance 72 (+1 skipped);
  - Bybit 69 (+1 skipped);
  - web 6.
- Build: six static routes (`/`, `/_not-found`, `/forgot-password`, `/login`,
  `/register`, `/verify-email`).

**Focused and matrix runs:**

- Focused run (seventh hardening; sixth, fifth, fourth, third and second
  remediation; first remediation; work-accounting oracle and source audit;
  D-055 scenarios; reasons; serialization; determinism; governance; bounds;
  candidate bounds): **16 files, 279/279**.
- Per file:
  - seventh hardening 19/19 and sixth 15/15;
  - fifth 40/40, fourth 21/21, third 23/23, second 21/21, first 36/36;
  - oracle 15/15 and source audit 7/7;
  - `d055-scenarios` **40/40**;
  - reasons 1/1, serialization 3/3, determinism 1/1;
  - governance 7/7, bounds 24/24, candidate bounds 6/6.
- Cancellation coverage is inside the remediation, bounds and oracle suites,
  and in the independent sweeps (section 6).
- Host-time-zone matrix (separate processes, `TZ=UTC`, `America/New_York`,
  `Asia/Tokyo`): **21/21 files, 300/300 tests** each.

**Repository checks:**

- Markdown local links: before this report, 78 files, 120 links, 98 local,
  **0 broken**.
- `git diff --check`: clean in the repository and for `8d17682..5aa2fdf`. The
  `9dacc82..5aa2fdf` range still reports the 18 pre-existing hard-break
  spaces (L-01, unchanged).
- `git fsck --full`: exit 0.

## 14. Findings table

| ID   | Severity            | State                                     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Required resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 | BLOCKER (historic)  | RESOLVED                                  | section 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| B-02 | BLOCKER (historic)  | RESOLVED                                  | section 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| H-01 | HIGH (historic)     | RESOLVED                                  | section 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| H-02 | HIGH (historic)     | RESOLVED                                  | section 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| H-03 | HIGH                | RESOLVED                                  | section 6; the N-03 regression is closed                                                                                                                                                                                                                                                                                                                                                                                                                                         | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| H-04 | HIGH                | RESOLVED                                  | section 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| M-01 | MEDIUM              | RESOLVED — accepted semantics             | section 8                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| M-02 | MEDIUM              | RESOLVED                                  | section 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| N-01 | MEDIUM              | **RESOLVED**                              | sections 2 and 3: 0 getter reads over 18 entries; revision equality on every `MATCHED`                                                                                                                                                                                                                                                                                                                                                                                           | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| N-02 | MEDIUM              | **RESOLVED**                              | section 3: frozen instances, prototypes and classes; private revision read once; idempotent path returns internal state                                                                                                                                                                                                                                                                                                                                                          | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| N-03 | MEDIUM              | **RESOLVED**                              | section 4: 0.8 ms vs 3,667 ms; `fromParts` never sees rejected parts; 624-unit charge first                                                                                                                                                                                                                                                                                                                                                                                      | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| L-01 | LOW                 | Informational (carried)                   | 18 hard-break spaces in the `9dacc82` range                                                                                                                                                                                                                                                                                                                                                                                                                                      | normalize at the next authorized documentation edit                                                                                                                                                                                                                                                                                                                                                                                                                               |
| L-02 | LOW                 | RESOLVED                                  | section 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| L-03 | LOW                 | **RESOLVED**                              | sections 2 and 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| L-04 | LOW                 | RESOLVED                                  | section 2: 468 hostile calls, 0 raw errors                                                                                                                                                                                                                                                                                                                                                                                                                                       | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| L-05 | LOW                 | **UNRESOLVED** (named vectors closed)     | section 5: 68 of 71 names inert, including `mapping` and `candidate`; numeric index `"0"` still changes outcomes (L-07)                                                                                                                                                                                                                                                                                                                                                          | resolve L-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| L-06 | LOW                 | **RESOLVED**                              | section 7                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| L-07 | LOW                 | **NEW, open** (pre-existing at `8d17682`) | `registry.ts:418` `found[0]?.canonicalAssetId` and `registry.ts:431` `aliases[0]` read inherited index `0` from empty internal arrays. With `Object.prototype["0"] = { canonicalAssetId: A }`, `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN` becomes `MATCHED/COMPATIBLE_APPROVED`. With `{ targetAssetId: A }`, a USDT↔USDC pair passes the identity gate and candidates are generated for mismatched pairs. Falsifies the §22.15 "length-gated" claim. Same pattern at `commands.ts:674`. | Gate every internal index read by length or own-property semantics. For example: `found.length === 1 ? found[0] : undefined` (keeping the existing conflict checks); `aliases.length === 1 ? aliases[0] : undefined`; `Object.hasOwn(target.approvals, 0)`. Audit every `[n]`/`.at()` read in the package. Add regressions polluting `Object.prototype["0"]` (and `"1"`) with `{ canonicalAssetId }`, `{ targetAssetId }` and a string, across the full workflow. Correct §22.15. |
| A-01 | ACCEPTED_LIMITATION | carried                                   | cooperative cancellation; one precharged atomic native call is not interruptible                                                                                                                                                                                                                                                                                                                                                                                                 | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| A-02 | ACCEPTED_LIMITATION | carried                                   | own-key enumeration charged immediately after its single native pass, including the decimal two-key check                                                                                                                                                                                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| A-03 | ACCEPTED_LIMITATION | carried                                   | zero approved real venue pairs                                                                                                                                                                                                                                                                                                                                                                                                                                                   | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| A-04 | ACCEPTED_LIMITATION | carried (extended by §22.15)              | Proxies are neutralized by single reads. Globally patched built-ins and `get`/`set` descriptor-name pollution are out of scope. Under `get`/`set` pollution every operation fails closed, and `new MappingLedger()` throws a raw `TypeError`, where it returned at `8d17682`.                                                                                                                                                                                                    | none (optionally use null-prototype descriptor literals)                                                                                                                                                                                                                                                                                                                                                                                                                          |
| A-05 | ACCEPTED_LIMITATION | carried                                   | `TypeError`/`RangeError` → `INPUT_INVALID` normalization                                                                                                                                                                                                                                                                                                                                                                                                                         | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

**Informational:**

- **Unfrozen subclass instances.** Subclass and `Reflect.construct` instances
  of both classes are branded but not frozen. Their authoritative views are
  non-redefinable and no operation reads them (§22.15).
- **Caller handle echoed.** Idempotent and `REJECTED` command results echo the
  caller's authenticated ledger handle.
- **Null-prototype results.** Published records have a null prototype
  (section 5).
- **Omitted invalidation transition.** Dropping a trailing invalidation
  transition from a materialized history gives `VALID`. This is identical at
  `8d17682`, and equivalent to the honest pre-invalidation history.

## 15. Frozen-boundary evidence

`git diff 8d17682 5aa2fdf` is **empty** for all of the following:

- `packages/market-data`, `packages/contracts` and `packages/design-tokens`;
- the OKX, Binance and Bybit adapters;
- `apps`, `infra` and `docs/brand`;
- the root `package.json` and `package-lock.json`;
- D-055, the D-055 acceptance, D-064 and the capacity decision;
- acceptance reports 1–7 and the re-acceptance;
- the package manifest and `tsconfig`;
- `index.ts`, `policy.ts`, `bounds.ts`, `time.ts`, `model.ts`,
  `serialization.ts`, `economics.ts`, `test-fixtures.ts` and every earlier
  test file.

Every changed path is under `packages/spread-analytics/**` or is
`docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_IMPLEMENTATION.md`. The diff
from `9dacc82` for the frozen packages, `apps`, `infra`, `docs/brand`, D-055,
its acceptance and D-064 is also empty. All mandated hashes match
(section 1).

After this report was added:

- the Markdown link check gives 79 files and **0 broken** local links;
- `git status --short` lists only
  `?? docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_8.md`.

**Verdict: PASS.**

## 16. Freeze recommendation

**What passes:**

- The commit closes N-02 completely. Both trusted handles are immutable, the
  registry revision is read once from private state and validated before any
  exit, and the idempotent command path returns internal frozen state. N-01
  and L-03 are therefore closed (section 3).
- It closes N-03. Oversized, out-of-domain and non-normalized decimals are
  rejected in O(1) before reconstruction, and the rebuild is charged first
  (section 4).
- It closes L-06, and every named-property pollution vector of L-05,
  including the ACCEPTANCE_7 `mapping` exploit.
- Every regression area stays green: B-01, B-02, H-01 to H-04, M-01, M-02,
  L-02 and L-04.
- 29/29 D-055 groups, 40/40 authored cases, 44 codes, 22 exports, a stable
  cross-version digest, zero real pairs and unchanged frozen boundaries.
- Charged work is equal or higher than `8d17682` everywhere, with a maximum
  charged gap of 128, a tail of 0 and 1,233/1,233 abort placements.

**Why the result is FAIL:**

- **L-05 is not resolved.** Pollution of the numeric index name `"0"` on
  `Object.prototype` still influences matching (L-07). It produces a
  `MATCHED/COMPATIBLE_APPROVED` from an otherwise
  `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN` pair, and collapses USDT and USDC legs
  onto one identity.
- The implementer's §22.15 limitation rests on a factually incorrect
  mitigation ("array reads are length-gated first").
- Freezing requires L-05 RESOLVED.

There is no BLOCKER and no unresolved HIGH. L-07 has an environment-level
precondition and is calibrated LOW, as ACCEPTANCE_7 calibrated L-05. The fix
is small and local.

**Final status: FAIL. BLOCKER 0. Unresolved HIGH 0.**
**Phase 2B.1 may freeze: NO. Phase 2B.2 eligible for separate authorization:
NO.**

**Exact recommended next task.** Run one bounded hardening pass inside
`packages/spread-analytics/**` only. It must not change D-055, D-064, the 44
codes, the 22 exports, any digest, rate or bound, or any frozen scope. It
needs to:

1. **L-07:** gate the inherited index reads at `registry.ts:418`, `431` and
   `commands.ts:674` by length or own-property checks. Audit every other
   index or `.at()` read. Add full-workflow regressions for pollution of
   `Object.prototype["0"]` and `"1"`.
2. Correct §22.15 and append a §23 evidence record.
3. Request ACCEPTANCE_9, a focused re-acceptance of L-05 and L-07 with the
   regression set of this report.

Only after a passing ACCEPTANCE_9 should the Phase 2B.1 authority record the
freeze and separately consider Phase 2B.2 authorization. This review does not
begin Phase 2B.2.

Final status: FAIL
BLOCKER count: 0
Unresolved HIGH count: 0
N-01: RESOLVED
L-03: RESOLVED
N-02: RESOLVED
N-03: RESOLVED
L-05: UNRESOLVED
L-06: RESOLVED
D-055: 29/29
Scenarios: 40/40
Reason codes: 44
D-064: PASS
Runtime exports: 22
Digest stability: PASS
Real venues: PASS (approved real pairs: 0)
Frozen boundaries: PASS
Phase 2B.1 may freeze: NO
Phase 2B.2 eligible for separate authorization: NO
