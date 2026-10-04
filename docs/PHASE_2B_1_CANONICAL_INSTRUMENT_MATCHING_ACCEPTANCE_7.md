# Phase 2B.1 — seventh independent acceptance review

- Review date: 2026-10-04.
- Reviewer: an independent technical AI reviewer, a separate actor from the
  implementing session and from the authors of the six earlier reports. This
  is a technical attestation, not a human professional signature.
- Reviewed state: branch `claude/stoic-lovelace-uxfohy`, exact commit
  `18e2772df006c533124b7c98a0647a63a5dd03e5` (tree
  `1f8a2168368c69edda9d030f99b5299bfa1f4305`), "fix: harden Phase 2B.1 caller
  input boundaries".
  - Parent: `4becf10741eadba0ffffc996f651aa21e8b0b179` (carries ACCEPTANCE_6).
  - Prior remediation baseline: `1e091f9752af5896bfe21784de3d1048e6bdd63a`.
  - D-055 baseline: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3` (`origin/main`).
- Scope: a focused re-acceptance of the pre-freeze hardening for N-01, L-02,
  L-03 and L-04 from
  [ACCEPTANCE_6](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_6.md)
  section 15, plus regression checks of B-01 to M-02.
- Execution: a clean detached review worktree plus three disposable
  materializations made with `git archive`:
  - `q`, the authoritative quality run, never touched by probes;
  - `p`, the probe copy of `18e2772`;
  - `old1e`, a copy of `1e091f9` for cross-version comparison.

  All probes were written for this review, and all were deleted afterwards.
  The review worktree contains only this report as a change.

- Final status: **FAIL**. BLOCKER: **0**. Unresolved HIGH: **0**.
- **N-01 is not resolved.** The ACCEPTANCE_6 material exploit is closed. The
  same defect class remains reachable through the two brand-checked "trusted
  handles", whose public fields are still mutable and are re-read (N-02). The
  hardening also adds a new uncharged, superlinear work path (N-03).
- Phase 2B.1 may freeze: **NO**. Phase 2B.2 eligible for separate
  authorization: **NO**.
- This review created only this report. No implementation, test, manifest,
  lockfile, dependency, D-055, D-064, capacity decision, prior report,
  implementation evidence or frozen scope was changed. Nothing was committed,
  pushed or tagged. Phase 2B.2 was not begun.

## 1. Governing baseline and integrity

Checks run in the review worktree before any other work:

- `git rev-parse HEAD` is `18e2772…`, and `git status --short` is empty.
- `git diff --check` is clean, and `git fsck --full` exits 0.
- `git log --oneline --decorate -6` shows `18e2772` → `4becf10` → `1e091f9` →
  `8f35571` → `872db41` → `018593d`.
- Node is **v24.18.1** and npm **11.16.0**, from the checksum-verified
  toolchain supplied for the review.

Read: `AGENTS.md`; D-055 and its acceptance; D-064; the capacity-semantics
decision (Option A); ACCEPTANCE_5 and ACCEPTANCE_6 (section 15 defines N-01
and L-02 to L-04); implementation evidence §20 and §21 (§21 is the claim set
under review); the relevant parts of `SECURITY_MODEL`, `DOMAIN_MODEL`,
`API_CONTRACTS_PLAN`, `RISK_REGISTER`, `DECISIONS_REQUIRED` and
`ACCEPTANCE_CRITERIA`; every runtime and test module under
`packages/spread-analytics/**`; and the full `git diff 4becf10 18e2772`.

The authors' tests and §21 claims were treated as claims to falsify. Every
verdict below rests on probes written for this review.

| Artifact                                                                              | SHA-256 (recomputed)                                               | Status                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| [D-055 decision](PHASE_2B_D055_INSTRUMENT_MATCHING_DECISION.md)                       | `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931` | matches the mandated value            |
| [D-064 approval](PHASE_2B_D064_MATCHING_APPROVAL.md)                                  | `85fb7792cf66a9443da60bdcdbbe07daab5dce159bcda82ebaffe032b5e8fbe8` | matches the mandated value            |
| [Capacity-semantics decision](PHASE_2B_D064_CAPACITY_SEMANTICS_DECISION.md)           | `98552f5d837e291e8d02bbb5525b2bb17caa47bab4ee41c1e38372fa42ebfbe1` | unchanged                             |
| [D-055 acceptance](PHASE_2B_D055_ACCEPTANCE.md)                                       | `18d1cbb38c2db218cc11b25f3a89279be76b7f335703881e688f887864df3495` | unchanged                             |
| [First acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE.md)            | `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0` | unchanged                             |
| [Re-acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_REACCEPTANCE.md)             | `22bb95806e7e8cd300e6ef49e87654528c6fbb775df344b1335c5e61baf028c4` | unchanged                             |
| [Third acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_3.md)          | `bd5fa6a38404e9d40e35513176f94a752025fd7152653dc5d4b64811592295e0` | unchanged                             |
| [Fourth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_4.md)         | `a54dd81821332cce15db3ce57be121eb7875bd02e87da1b20e4c537d3062b3ee` | unchanged                             |
| [Fifth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_5.md)          | `4505f418820b43d9d44ad2528f52371450cb7550fcf17ceb22ee35b9e4d67d51` | unchanged                             |
| [Sixth acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_6.md)          | `7d4d8773054200c98069c13d473b9fab48ee59f745d4b7faf84cec1d84b15f55` | unchanged since `4becf10`             |
| [Implementation evidence](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_IMPLEMENTATION.md) | `b13a5b7f639897b5e272c1d3b3c2e1c81b753fc8604360fc2b4a084bf6598676` | 281 lines appended (§21), no removals |
| Root `package.json`                                                                   | `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` | matches the mandated value            |
| `package-lock.json`                                                                   | `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59` | matches the mandated value            |

`git diff --stat 4becf10 18e2772` lists 14 files:

- the implementation evidence;
- nine runtime modules (`admission`, `candidates`, `commands`, `economics`,
  `evaluator`, `evidence`, `registry`, `replay`, `serialization`) and the new
  `snapshot.ts`;
- the new `sixth-acceptance-hardening.test.ts`, plus updates to the fifth and
  fourth remediation tests.

`index.ts`, `reasons.ts`, `policy.ts`, `bounds.ts`, `time.ts`, `model.ts`,
`test-fixtures.ts`, `d055-scenarios.test.ts`, `serialization.test.ts`, and the
package `package.json` and `tsconfig.json` are byte-identical to `4becf10`.

## 2. Required finding verdicts

| Finding                                         | Verdict                                                               | Independent basis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N-01** — validated vs published divergence    | **UNRESOLVED** (material case closed; class still reachable)          | The ACCEPTANCE_6 exploit, reproduced at `1e091f9` (3 `MATCHED` results for an unapproved pair, 33 forged `VALID` admissions), is fully closed at `18e2772`: 0 of about 4,000 runs, 0 getter invocations (section 3). All 16 caller-data public entries refuse accessors with 0 reads (section 4). **But** genuine `CuratedAssetRegistry` and `MappingLedger` instances keep writable, configurable public fields that are re-read after the brand check, and getters on them execute. A `MATCHED` result can publish `registryRevision` `"registry-FORGED"` while its `mappingVersion.registryRevision` is `"registry-v1"` (N-02, section 5). |
| **L-02** — replay mode                          | **RESOLVED**                                                          | `AS_KNOWN` and `CORRECTED` replay normally. 13 forged values all throw `INPUT_INVALID`: `"BOGUS"`, `"as_known"`, `7`, `null`, `undefined`, an object, an array, `new String("AS_KNOWN")`, padded, NUL-suffixed, a symbol, a bigint, `true`. So do a missing mode, an inherited mode, an extra key and an accessor-backed mode (0 getter reads). A Proxy is read once, and the validated value is the one used (section 6).                                                                                                                                                                                                                    |
| **L-03** — echoed candidate / fake registry     | **UNRESOLVED** (enumerated vectors closed; outcome still reachable)   | The echoed candidate is a frozen copy, not the caller object, and is unaffected by later mutation. Eight kinds of malformed candidate are refused. Plain, prototype-spoof, Proxy and `null` registries and ledgers are refused on every exit, including the earliest `NOT_MATCHED`. **But** assigning `registry.revision = { revision: "X".repeat(100000) }` on a genuine instance publishes the unvalidated 100,000-character revision, from `evaluateMatch` (including `NOT_MATCHED/SAME_VENUE_EXCLUDED`) and from `generateCandidates`. `admitMappingCommand` can also echo a caller object by reference (N-02).                           |
| **L-04** — untyped exceptions                   | **RESOLVED**                                                          | 495 malformed-input calls (37 entry and argument positions × 13 hostile values = 481, plus 14 nested shapes) produced **0** raw `TypeError`/`RangeError`. Cancellation (`EVALUATION_CANCELLED`) and budget exhaustion (`MATCHING_BOUND_EXCEEDED`) still propagate on all paths probed (section 6). The masking concern is accepted as A-05.                                                                                                                                                                                                                                                                                                   |
| B-01 — forged history/transition authority      | **RESOLVED (no regression)**                                          | Dropped transitions → `CONFLICTING`; forged reason → `INVALID_PROVENANCE`; forged command digest and forged `SUPERSEDED`/`supersededBy` → `DIGEST_MISMATCH`; spread fake history handle and Proxy of a genuine handle → `INPUT_INVALID`.                                                                                                                                                                                                                                                                                                                                                                                                      |
| B-02 — immutable admitted replay                | **RESOLVED (no regression)**                                          | Admission ran from a fully mutable deep copy. Afterwards, mutating status, exposure key and transitions and truncating the history left the history digest and replay output byte-identical. The result, handle, versions and version records are frozen, and redefining `current` throws.                                                                                                                                                                                                                                                                                                                                                    |
| H-01 — product scope before identity            | **RESOLVED (no regression)**                                          | SPOT, dated, unknown, option and inverse partners never yield an exposure key or product class; results are identical to `1e091f9`. A valid perpetual gives the golden key `instrument-exposure-pilot/v1\|10:DERIVATIVE7:asset:A…9:BASE_UNIT` with no reasons.                                                                                                                                                                                                                                                                                                                                                                                |
| H-02 — public API closure                       | **RESOLVED (no regression)**                                          | A fresh `dist/index.js` has exactly **22** runtime exports with unchanged names, and no `export *`. No oracle or fixture is in `dist`. Deep imports of `dist/snapshot.js`, `dist/time.js`, `dist/bounds.js`, `dist/work-oracle.js`, `dist/registry.js`, `dist/index.js` and `./bounds` all return `ERR_PACKAGE_PATH_NOT_EXPORTED`.                                                                                                                                                                                                                                                                                                            |
| H-03 — cumulative logical work and cancellation | **RESOLVED for data inputs; regression for non-data decimals (N-03)** | 48 typed outcomes: 2,165 of 2,165 abort placements throw `EVALUATION_CANCELLED`, the maximum charged gap is 128, and the publication tail is 0. Charged units are strictly higher than at `1e091f9` in all 48. **But** the new decimal snapshot runs uncharged, superlinear `ExactDecimal.fromParts` normalization: a 100,000-digit spoof costs 3,053 ms for 8 charged steps and 1 poll (section 7).                                                                                                                                                                                                                                          |
| H-04 — runtime timestamp validation             | **RESOLVED (no regression)**                                          | `time.ts` is byte-identical. In separate `TZ=UTC`, `America/New_York` and `Asia/Tokyo` processes (offsets 0, 240 and −540 minutes in September), the authoritative digest is identical (`a4ff3f42…ed85e0`). Eight malformed forms give identical `EVIDENCE_TIME_INVALID` throws and `INVALID_INTERVAL` admissions. The full suite passes in each zone.                                                                                                                                                                                                                                                                                        |
| M-01 — capacity semantics                       | **RESOLVED — accepted semantics (no regression)**                     | Option A holds: 1,024 instruments fail with typed `MATCHING_BOUND_EXCEEDED` at the 100,000-step budget (12,819,236 charged units, 782 of 782 abort placements throw). No bound or rate was widened, and every rate is stricter than `1e091f9` (section 8).                                                                                                                                                                                                                                                                                                                                                                                    |
| M-02 — caller-supplied budget authority         | **RESOLVED (no regression)**                                          | Seven public callables were each given three extra permissive fake budgets, and three throwing tripwire proxies. Results were identical to baseline, and the tripwire was read **0** times. An always-aborted signal throws `EVALUATION_CANCELLED` on all eight signal-taking operations.                                                                                                                                                                                                                                                                                                                                                     |

## 3. N-01 exploit reproduction (independent probes)

**Construction.** This probe is independent of the authored regression and
uses its own fixtures:

- approved pair `R7AAA↔R7BBB`, with a genuine admission input;
- evaluated pair `R7BBB↔R7CCC`, which is unapproved;
- enumerable accessors on `mapping.leftInstrumentId` and
  `mapping.rightInstrumentId`, and on six candidate fields
  (`left`/`rightMetadataRevision`, `left`/`rightMetadataDigest`,
  `left`/`rightEconomicsRevision`).

Each accessor returns the approved pair's value except at chosen read indices,
where it returns the unapproved pair's value. Two aliasing modes were run:

- the fixture's real aliasing, where the selected record and the last history
  record share the same mapping and candidate objects;
- a de-aliased deep copy.

**Search.** Four sweeps, each against both `evaluateMatch` and
`admitMaterializedMapping`:

- uniform monotone switch thresholds;
- a 10 × 10 threshold grid;
- 15 × 15 single-read switch points;
- 7 mapping read sets × 78 candidate read sets, giving 1,092 runs.

| Version   | `evaluateMatch` → `MATCHED/COMPATIBLE_APPROVED` for the unapproved pair                                                                                              | Admission `VALID` with a version naming `R7BBB↔R7CCC`         | Getter invocations            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------- |
| `1e091f9` | **3 of 546** set-sweep runs (mapping switch at read {4}, {4,8} or {4,5}; candidate fields at reads {4,8}). Honest control: `QUARANTINED/DUPLICATE_EXPOSURE_CONFLICT` | **33 of 546** set-sweep runs, plus 7 in the single-read sweep | 34,800 in the set sweep alone |
| `18e2772` | **0** in every sweep and in both aliasing modes (about 2,000 runs per mode)                                                                                          | **0**                                                         | **0**                         |

At `18e2772`, every forged input ends the same way:

- `evaluateMatch` throws `INPUT_INVALID`;
- `admitMaterializedMapping` returns `INVALID_PROVENANCE/INPUT_INVALID` with
  no history.

**The exploit is reproduced on the old code and closed on the new code.**

## 4. Boundary and public-entry inventory

**Exports.** All 22 exports were enumerated, along with every callable public
method and constructor:

- 14 functions;
- `MatchingFailure`;
- `CuratedAssetRegistry`: constructor, `resolve`, `describe`;
- `MappingLedger`: constructor, `apply`, `commandDigest`,
  `commandDigestSnapshot`;
- five constants.

**Accessor probe.** A single counting getter was placed on a nested field of
each caller-data input:

| Entry                                                 | Result                               | Getter reads |
| ----------------------------------------------------- | ------------------------------------ | -----------: |
| `generateCandidates`                                  | throws `INPUT_INVALID`               |            0 |
| `evaluateMatch` (top level)                           | throws `INPUT_INVALID`               |            0 |
| `evaluateBatch` (element)                             | throws `INPUT_INVALID`               |            0 |
| `admitMaterializedMapping`                            | `INVALID_PROVENANCE/INPUT_INVALID`   |            0 |
| `candidateProvenanceDigest`                           | throws `INPUT_INVALID`               |            0 |
| `approveCommand` (nested approval)                    | throws `INPUT_INVALID`               |            0 |
| `invalidateCommand`                                   | throws `INPUT_INVALID`               |            0 |
| `admitMappingCommand` (command)                       | `REJECTED/INPUT_INVALID`             |            0 |
| `MappingLedger#apply`                                 | throws `INPUT_INVALID`               |            0 |
| `new MappingLedger(versions)`                         | throws `INPUT_INVALID`               |            0 |
| `admitRegistryRevision` (nested asset)                | throws `INPUT_INVALID`               |            0 |
| `new CuratedAssetRegistry`                            | throws `INPUT_INVALID`               |            0 |
| `canonicalExposureKey`                                | throws `INPUT_INVALID`               |            0 |
| `replayMapping`                                       | throws `INPUT_INVALID`               |            0 |
| `validateEvidenceBundle` (4 MB `sourceDigest` getter) | throws `INPUT_INVALID`, no stringify |            0 |
| `normalizeBaseExposure` (decimal getter)              | throws `INPUT_INVALID`               |            0 |

`resolve`, `describe` and `commandDigest` with object arguments (custom
`toString`/`valueOf`) throw `INPUT_INVALID`.

**Other hostile shapes (`18e2772`):**

- **Arrays.** These are all refused with `INPUT_INVALID`, and an own iterator
  is never invoked (0 iterations):
  - an own `Symbol.iterator` on the instrument list or the batch;
  - holes, and holes combined with an extra key;
  - an extra key;
  - an `Array` subclass, a null-prototype array, an array-like object;
  - a non-enumerable index.
- **Cycles and shared references.** A cycle, a 2¹⁴ shared DAG and a 64-wide,
  14-deep shared DAG each end in `MATCHING_BOUND_EXCEEDED` (depth or budget)
  in under 1 ms.
- **Decimals.** These are all refused: a duck-typed object; a prototype spoof
  with accessors (0 reads), with extra behaviour or with non-normalized parts;
  a genuine instance with an extra own key or mutated to non-normalized parts;
  an out-of-domain spoof; strings and numbers. A spoof carrying normalized data
  parts is rebuilt into a genuine frozen decimal. That is data, not a bypass. A
  genuine instance mutated to `0` gives `UNAVAILABLE/MULTIPLIER_INVALID`, as it
  should.
- **Proxies.** The `getOwnPropertyDescriptor` trap is called once per key, and
  `get` and `has` are never called. A trap that answers `right` with another
  instrument on a later read does not change the result: the result ID equals
  the honest one. A Proxy that lies about its array keys, or about the
  prototype of a class instance, only causes its own data to be read once.
- **Mid-operation caller mutation.** The signal getter rewrote the legs,
  mapping, candidate and history at poll 2. The result ID still equals the
  honest run, and the published mapping is frozen. Frozen and plain-cloned
  inputs give identical result IDs.

**Inputs that are not snapshotted** are a genuine registry, a genuine ledger,
an admitted history and the cancellation signal. They are taken by reference.
The admitted history is frozen and sound. The registry and ledger are not
frozen: see section 5.

## 5. Trusted-handle residual (N-02) — why N-01 and L-03 stay open

Measured at `18e2772`:

- `Object.isFrozen(registry)` is `false`. `registry.revision` is an own data
  property that is writable, configurable and enumerable.
- `Object.isFrozen(ledger)` is `false`. `ledger.versions` and `transitions` are
  writable and configurable.
- The brand checks (`#bindingsByKey in value`, `#commandDigests in value`)
  authenticate the object, not the integrity of its public fields.
- `evaluateMatch` reads `registry.revision.revision` three times: once at the
  binding check (`evaluator.ts:343`), once for the result-ID hash and once for
  publication (`evaluator.ts:111`, `119`). `generateCandidates` reads it twice
  (`candidates.ts:277`, `299`).
- `MappingLedger#apply` reads `this.versions` and `this.transitions`
  repeatedly, and returns `mapping` elements found in `this.versions` by
  reference.

| Probe                                                                                                      | Result at `18e2772`                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Getter on a genuine registry's `revision`: real value at read 1, forged value afterwards                   | **`MATCHED/COMPATIBLE_APPROVED`**, getter read 3 times. Published `registryRevision` is `"registry-FORGED"`, but `mappingVersion.registryRevision` is `"registry-v1"`. The result ID differs from the honest one. |
| Plain assignment `registry.revision = { revision: "X".repeat(100000) }`                                    | Published `registryRevision` of 100,000 characters, both on `QUARANTINED/DUPLICATE_EXPOSURE_CONFLICT` and on the earliest exit, `NOT_MATCHED/SAME_VENUE_EXCLUDED`. `generateCandidates` publishes it too.         |
| Getter on `revision` during `generateCandidates`                                                           | `candidateId` and `evidenceSetDigest` are computed from `"registry-v1"`, but the published `registryRevision` is `"registry-FORGED"`.                                                                             |
| Mutating `registry.revision` from inside the signal getter at poll 3                                       | Published `"registry-MIDOP"`; the result ID differs from the honest one.                                                                                                                                          |
| `ledger.versions` replaced by `[fake]`, where `fake` has a `mappingId` getter, then an idempotent re-apply | `APPLIED`. The returned `mapping` **is the caller object** (unfrozen, unvalidated), and its getter ran once.                                                                                                      |
| `ledger.versions` as a getter                                                                              | `APPLIED`; the getter ran 5 times.                                                                                                                                                                                |
| Equivalence control                                                                                        | A registry with `registry-v2` content and the `registry-v1` revision object assigned gives `MATCHED`. An honest registry constructed with the same bindings and ID `registry-v1` also gives `MATCHED`.            |

**Assessment.**

- No probe produced a `MATCHED` for a pair whose admitted mapping differs from
  the snapshotted legs. The outcome-level authority equals what an honest
  constructor call can already achieve.
- However, a `MATCHED` result whose `registryRevision` differs from
  `mappingVersion.registryRevision` cannot be produced honestly, because the
  binding check exists to prevent exactly that. It is a published value that
  diverges from the validated one, made by an executing getter on a
  caller-held object. That is N-01's mechanism.
- The plain-assignment vector is L-03's outcome: unvalidated fake registry
  provenance published, including on early `NOT_MATCHED` exits.
- The same probes give identical results at `1e091f9`, so the defect is
  pre-existing. It nonetheless falsifies these §21 claims:
  - §21.3: "Getters are never executed".
  - §21.4: "A forged revision can therefore never be published, including on
    the earliest `NOT_MATCHED` exit".
  - §21.2: trusted handles are "authenticated with private brand checks".

## 6. L-02, L-03 and L-04 detail

**L-02.** The verdict and evidence are in section 2. The published `mode` echo
is only ever `AS_KNOWN` or `CORRECTED`.

**L-03.**

- An unapproved evaluation with a supplied candidate returns
  `UNAVAILABLE/MAPPING_UNAPPROVED`. The echoed candidate is not the caller
  object (`sameRef: false`), and both it and its `reasons` are frozen. Mutating
  the caller's candidate afterwards leaves the published `candidateId`
  unchanged.
- These candidates throw `INPUT_INVALID`: a bad policy, a non-catalogue reason,
  a 1,000-character ID, an extra key, a missing key, a numeric ID and
  non-array reasons. A local-time timestamp throws `EVIDENCE_TIME_INVALID`.
- These registries are refused with `INPUT_INVALID` on the earliest
  `NOT_MATCHED` path, on the full path and in `generateCandidates`: plain,
  `Object.create(CuratedAssetRegistry.prototype)`, a Proxy of a genuine
  registry, and `null`.
- These ledgers are refused with `INPUT_INVALID`: plain, prototype spoof,
  Proxy and `null`.
- A subclass instance is a genuine instance and is accepted. It carries the
  same N-02 exposure.
- The open part is N-02 (section 5).

**L-04.**

- **Coverage:** 37 operation and argument positions × 13 hostile values
  (`null`, `undefined`, `0`, `"x"`, `true`, `{}`, `[]`, a symbol, a bigint, a
  function, `Date`, `Map`, a custom-prototype object). That gives 481 calls,
  plus 14 nested malformed shapes such as a missing `metadata`, a `null`
  payoff, a missing multiplier value, a string multiplier, a `null` history
  item, non-array transitions, `null` approvals, a non-iterable batch and depth 30.
- **Result:** 0 raw errors. The outcomes are typed throws or typed results:
  - `INPUT_INVALID`: 375 throws;
  - `EVIDENCE_TIME_INVALID`: 20 throws;
  - `MATCHING_BOUND_EXCEEDED`: 3 throws;
  - `INVALID_PROVENANCE`: 39 results;
  - `REJECTED`: 13 results;
  - `INVALID_INTERVAL`: 13 results;
  - benign valid results for values that are legitimate, such as an omitted
    optional field.
- **Propagation.** These all throw `EVALUATION_CANCELLED`:
  - always-aborted signals on `evaluateMatch`, `generateCandidates`, replay,
    evidence, batch and registry admission;
  - mid-operation aborts in evaluation, admission and command admission;
  - a malformed input combined with an aborted signal.

  `MATCHING_BOUND_EXCEEDED` propagates for 1,024 instruments and for a
  snapshot-heavy input.

- **Masking judgment.** `inputBoundary` and the admission and command catches
  turn every `TypeError`/`RangeError` into `INPUT_INVALID`. That includes a
  genuine internal defect, and a stack-overflow `RangeError`. The effect is
  fail-closed (no publication, typed non-success) but it loses diagnostics.
  `MatchingFailure` extends `Error` rather than `TypeError`, so cancellation
  and bound failures cannot be masked. This is accepted as limitation A-05.

## 7. Work-accounting and final-check verdicts

**Method.**

- Independent instrumentation wrapped `WorkBudget.prototype.step` (128 units
  per step), `units` (1:1, nested calls not double counted) and `check`
  (per-budget charged gap and post-check tail).
- Polls were counted on the signal getter.
- Each outcome was then re-run with the abort set from poll k + 1, for every k.
- An identical probe ran on `18e2772` and `1e091f9`. It used short names and
  about 66-character long names.

**Results:**

- **Outcomes:** 48 typed outcomes covering every public operation and outcome
  class, as success and non-success. They include all eight admission states,
  six evaluation outcomes, batch, both replay modes, `APPLIED`, idempotent
  `APPLIED`, `REJECTED`, registry `READY` and `QUARANTINED`, candidates,
  evidence and the 1,024-instrument cap.
- **Abort sweep:** **2,165 of 2,165** placements throw `EVALUATION_CANCELLED`.
  No placement published a result.
- **Cancellation interval:** the maximum charged gap is **128** steps.
- **Final check:** the publication tail is **0** units and 0 steps on every
  outcome. In every public operation the snapshot precedes the final
  `beforePublication()`, and nothing follows it except `return`
  (source-checked in `evaluator`, `replay`, `serialization`, `commands`,
  `registry`, `evidence`, `candidates` and `admission`).
- **No budget reset:** snapshots charge the operation's own budget.
  `bounds.ts` and `policy.ts` are byte-identical, so the 100,000 cap and the
  interval are unchanged.
- **Conservatism against `1e091f9`:** charged units are strictly higher in
  **48 of 48** measurements. Examples:
  - candidates (20): 2,050,951 → 2,062,377;
  - 16-version admission: 1,507,156 → 1,528,612;
  - batch (19, long names): 4,399,188 → 4,493,909;
  - registry: 144,676 → 151,189;
  - command: 12,370 → 12,968;
  - 1,024-instrument cap: 12,818,421 → 12,819,236.

**N-03 (MEDIUM, introduced by `18e2772`).** `snapshotDecimal` calls
`ExactDecimal.fromParts(coefficient, scale)` on caller-supplied parts after
charging a flat 8 units. `fromParts` normalizes by repeated bigint division
while `scale > 0` and the coefficient ends in 0. Only after that does it check
the 78-digit and 78-scale domain bounds, using `toString().length`. With a
prototype spoof, or a mutated genuine instance (genuine instances are not
frozen), passed as `baseUnitsPerNativeQuantity`:

| Coefficient / scale  | `evaluateMatch` at `18e2772`                      | Same input at `1e091f9` |
| -------------------- | ------------------------------------------------- | ----------------------- |
| 10^5,000 / 5,000     | 12 ms, `INPUT_INVALID`, 8 steps, 1 poll           | 4 ms                    |
| 10^20,000 / 20,000   | 118 ms, 8 steps, 1 poll                           | 3 ms                    |
| 10^40,000 / 40,000   | 473 ms, 8 steps, 1 poll (mutated genuine: 483 ms) | 3 ms                    |
| 10^100,000 / 100,000 | **3,053 ms**, 8 steps, 1 poll                     | —                       |
| 10^1,000,000 + 1 / 0 | 135 ms (`toString`), 8 steps, 1 poll              | 1 ms                    |

The growth is quadratic, so about 12 s is extrapolated at 200,000 digits. The
work is uncancellable (one poll, the constructor check) and charged as 8
units. This is an uncharged, superlinear path in a budgeted operation,
contrary to the D-064 charge-before-work rule and to the §21.5 claim. It needs
a bigint-bearing, non-data object, so it is outside the data-only threat model,
as N-01 was. The standalone budget-free helpers (`normalizeBaseExposure`) were
already slow at `1e091f9`: 471 ms through arithmetic.

**Verdict:** work accounting and final checks **PASS for data inputs**. **FAIL
for the non-data decimal path (N-03).**

## 8. Capacity semantics (Option A)

- The structural ceilings, the 100,000-step budget and the ≤128 interval are
  unchanged (`policy.ts` and `bounds.ts` are byte-identical).
- 1,024 instruments fail with typed `MATCHING_BOUND_EXCEEDED`, with no
  publication. All 782 abort placements throw.
- No minimum capacity is claimed; §21.5's figures are informational.
- Every measured rate is stricter than `1e091f9` (section 7).

**Verdict: PASS. M-01 reliance conditions are met** (§19.10 is unchanged,
fail-closed typed failure, internal and stricter rates). H-03 for data inputs
is section 7.

## 9. D-055 policy groups (29) — independent probe

The probe used its own instrument names and constructions through the public
modules. All 29 rows are also byte-identical to `1e091f9`. The authored
`d055-scenarios.test.ts` passes **40/40**.

|   # | Expected                            | Independent result                                                                             | Verdict |
| --: | ----------------------------------- | ---------------------------------------------------------------------------------------------- | ------- |
|   1 | Reviewed A/USDT linear perpetual    | `MATCHED/COMPATIBLE_APPROVED`                                                                  | PASS    |
|   2 | Same ticker, different base         | `NOT_MATCHED/BASE_ASSET_MISMATCH`                                                              | PASS    |
|   3 | USDT vs USDC                        | `NOT_MATCHED/SETTLEMENT_ASSET_MISMATCH`                                                        | PASS    |
|   4 | Linear vs inverse                   | `NOT_MATCHED/VALUE_CONVENTION_MISMATCH`                                                        | PASS    |
|   5 | Perpetual/dated, dated/dated        | `DATED_PRODUCT_EXCLUDED` ×2                                                                    | PASS    |
|   6 | Exact 1 / 0.001 / 100 normalization | `MATCHED` ×3; `normalizeBaseExposure(3, 0.001) = 0.003`                                        | PASS    |
|   7 | Missing multiplier                  | `UNAVAILABLE/MULTIPLIER_UNKNOWN`                                                               | PASS    |
|   8 | Unknown lifecycle                   | `UNAVAILABLE/LIFECYCLE_UNKNOWN`                                                                | PASS    |
|   9 | Reviewed direct alias               | `MATCHED`; candidate `REVIEWED_MANUAL`; no mapping → `MAPPING_UNAPPROVED`                      | PASS    |
|  10 | Conflicting binding                 | `QUARANTINED/ASSET_BINDING_CONFLICT`                                                           | PASS    |
|  11 | Superseded current vs historical    | evaluation `MAPPING_SUPERSEDED`; admission `SUPERSEDED`; AS_KNOWN replay `MATCHED` v1          | PASS    |
|  12 | Reviewed rebrand keeps identity     | `MATCHED`; display name `asset:A` → `New Name 7`; exposure keys equal                          | PASS    |
|  13 | Ticker-only collision               | `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN`                                                             | PASS    |
|  14 | Unsupported family                  | `PRODUCT_UNSUPPORTED` (OTHER, OPTION)                                                          | PASS    |
|  15 | 60 s / 60 s + 1 ms                  | `MATCHED` / `UNAVAILABLE/EVIDENCE_STALE`                                                       | PASS    |
|  16 | Zero / negative multiplier          | `UNAVAILABLE/MULTIPLIER_INVALID` ×2                                                            | PASS    |
|  17 | Incompatible unit                   | `NOT_MATCHED/CONTRACT_UNIT_MISMATCH`                                                           | PASS    |
|  18 | Unapproved candidate                | `INCOMPLETE`; evaluation `MAPPING_UNAPPROVED`                                                  | PASS    |
|  19 | Quarantine / invalidation           | `QUARANTINED/MAPPING_QUARANTINED`; `UNAVAILABLE/MAPPING_INVALIDATED`                           | PASS    |
|  20 | Unknown convention / capability     | `VALUE_CONVENTION_UNVERIFIED`; `CAPABILITY_UNAVAILABLE`                                        | PASS    |
|  21 | Alias cycle / chain / self          | `QUARANTINED/ALIAS_CHAIN_FORBIDDEN` ×3                                                         | PASS    |
|  22 | Economics contradiction             | `QUARANTINED/METADATA_EVIDENCE_CONFLICT`                                                       | PASS    |
|  23 | Overlapping intervals               | command `QUARANTINED/MAPPING_INTERVAL_CONFLICT` (data inputs; see N-02 for the mutable ledger) | PASS    |
|  24 | Inactive lifecycle                  | `LIFECYCLE_NOT_ACTIVE` ×5 (SUSPENDED, DELISTED, PRE_LAUNCH, SETTLING, EXPIRED)                 | PASS    |
|  25 | Expired / over 30 days              | `UNAVAILABLE/MAPPING_EXPIRED`; 30-day + 1 ms binding → `EVIDENCE_TIME_INVALID`                 | PASS    |
|  26 | Forged authority                    | forged digest and forged `supersededBy` → `DIGEST_MISMATCH`; spread handle → `INPUT_INVALID`   | PASS    |
|  27 | OKX special families                | `SPECIAL_PRODUCT_EXCLUDED` (`OKX_PRE_MARKET`, `OKX_XPERP`)                                     | PASS    |
|  28 | AS_KNOWN / CORRECTED                | AS_KNOWN `MATCHED`; CORRECTED `UNAVAILABLE/MAPPING_INVALIDATED`; versions frozen               | PASS    |
|  29 | Permutation stability               | 9 instruments, three permutations, 36 byte-identical candidate IDs                             | PASS    |

**29/29 PASS; 40/40 authored cases pass.**

## 10. Reason catalogue

- `MATCH_REASON_CODES` has **44** entries at load, all unique. The list is
  identical to `1e091f9`, and `reasons.ts` is byte-identical, so no code was
  added.
- Every observed outcome uses a catalogue code.
- **Verdict: 44/44 PASS.**
- Separately, the exported array is not frozen (L-06, section 15).

## 11. D-064 limits

| Limit                                  |                  Value | Evidence (this review)                                                                                | Verdict  |
| -------------------------------------- | ---------------------: | ----------------------------------------------------------------------------------------------------- | -------- |
| Instruments                            |                  1,024 | 1,024 → typed work bound, no publication; authored boundary and one-over tests pass                   | PASS     |
| Partners / pairs                       |             32 / 8,192 | authored boundary and one-over tests pass; `policy.ts` unchanged                                      | PASS     |
| Bindings / alias depth                 |              4,096 / 1 | authored tests; alias cycle, chain and self → `QUARANTINED`                                           | PASS     |
| Versions / events                      |             64 / 4,096 | authored one-over tests; 16-version admission and replay measured                                     | PASS     |
| Evidence                               |    32 / 32,768 / 8 KiB | authored tests; 4 MB accessor `sourceDigest` refused with no stringify                                | PASS     |
| Atomic / composite / reason            |      160 / 4,096 / 512 | candidate 1,000-character ID refused; gates unchanged (`bounds.ts` identical)                         | PASS     |
| Timestamps                             | strict UTC millisecond | section 2 (H-04)                                                                                      | PASS     |
| JSON depth / nodes / keys              |      16 / 100,000 / 64 | depth 30 and cycles → `MATCHING_BOUND_EXCEEDED`; snapshot enforces 64 keys and the 32,768 array bound | PASS     |
| Cumulative logical work                |                100,000 | 12,819,236 units then typed failure; single budget, no reset                                          | PASS     |
| Cancellation interval                  |            ≤ 128 steps | maximum charged gap 128 over 48 outcomes and 2,165 polls                                              | PASS     |
| Charge before work (non-data decimals) |                      — | N-03: up to 3,053 ms of normalization for 8 charged steps                                             | **FAIL** |

**Aggregate D-064 assessment:**

- **PASS** for the data-only boundary that D-055 declares.
- **Qualified by N-03** for the non-data decimal path that this commit
  introduced.

## 12. Serialization and digest verdict

A cross-version material probe ran identically on `1e091f9` and `18e2772`. It
covered:

- the golden vector;
- 15 candidate IDs, exposure keys, evidence-set and provenance digests;
- command digests for a 4-version history;
- supersede and invalidate transition records;
- the history digests of the APPROVED and INVALIDATED histories;
- four replay results (AS_KNOWN and CORRECTED for both histories);
- batch result IDs and a single result ID;
- a standalone exposure key, an approve-command digest and an evidence bundle.

Both versions give the same combined SHA-256:
**`5b5269fad4c119d00647ef9b525ce397289acb5f6acb78548cbf6a5e3cdbbbc7`**.

The golden vector is
`786dc0d4cb92c23193e62d6f6ef1b0ad5c15d8c47eae0745c7b352fc2e1407ef`, and
`serialization.test.ts` is unchanged. The probe in section 4 also found that
frozen and plain-cloned passive inputs give identical result IDs.

**Verdict: PASS (stable for passive inputs).**

## 13. Real-venue verdict

The fixtures follow the frozen adapters:

- OKX: `known(ctVal)` multiplier and a known convention;
- Binance: an `unverified` multiplier and a `researchRequired` convention;
- Bybit: an `unverified` multiplier and `known("LINEAR")`.

Results, both without a mapping and with a fixture mapping:

- OKX↔Binance: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
  `VALUE_CONVENTION_UNVERIFIED`].
- OKX↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`].
- Binance↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN` (gaps on both legs),
  `VALUE_CONVENTION_UNVERIFIED` (Binance)].

The adapters are unchanged, and the package holds no registry or approved
mapping data. There are **zero approved real pairs**. **Verdict: PASS.**

## 14. Exact test and build results (fresh copy `q`)

The verification ran in a fresh `git archive` materialization of `18e2772`
with no `node_modules` or `dist`, on Node v24.18.1 and npm 11.16.0.

**Install:**

- `npm ci` exit 0: **450 added / 459 audited**.
- `npm audit`: 13 advisories (2 moderate, 10 high, 1 critical). The lockfile is
  byte-identical, so this is audit-database drift, not a dependency change.
- `npm query`: 451 packages.

**Quality, tests and build:**

- `npm run format:check`, `lint`, `typecheck`, `test` and `build`: **all exit
  0**.
- Full `npm test`: **55 test files** (52 passed, 3 opt-in live-canary files
  skipped); **541 passed, 0 failed, 3 skipped**.
  - contracts 4;
  - market-data 57;
  - spread-analytics **281 (20 files)**;
  - OKX 52 (+1 skipped);
  - Binance 72 (+1 skipped);
  - Bybit 69 (+1 skipped);
  - web 6.
- Build: six static routes (`/`, `/_not-found`, `/forgot-password`, `/login`,
  `/register`, `/verify-email`).

**Focused and matrix runs:**

- Focused run (sixth hardening, fifth and third remediation, source audit,
  oracle, D-055 scenarios, bounds, candidate bounds, governance, reasons,
  serialization): **11 files, 181/181**.
- `sixth-acceptance-hardening` alone: **15/15**; `d055-scenarios`: **40/40**.
- Host-time-zone matrix (separate processes, `TZ=UTC`, `America/New_York`,
  `Asia/Tokyo`): **20/20 files, 281/281 tests** each. The separate-process
  digest probe is in section 2 (H-04).

**Repository checks:**

- Markdown local links: before this report, 77 files, 107 links, 85 local, **0
  broken**.
- `git diff --check`: clean in the worktree and for `4becf10..18e2772`. The
  `9dacc82..18e2772` range still reports the 18 pre-existing hard-break spaces
  (L-01, unchanged).
- `git fsck --full`: exit 0.

## 15. Findings table

| ID   | Severity            | State                                      | Evidence                                                                                                                                                                                                                                                             | Required resolution                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 | BLOCKER (historic)  | RESOLVED                                   | section 2                                                                                                                                                                                                                                                            | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| B-02 | BLOCKER (historic)  | RESOLVED                                   | section 2                                                                                                                                                                                                                                                            | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| H-01 | HIGH (historic)     | RESOLVED                                   | section 2                                                                                                                                                                                                                                                            | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| H-02 | HIGH (historic)     | RESOLVED                                   | section 2                                                                                                                                                                                                                                                            | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| H-03 | HIGH                | RESOLVED (data inputs)                     | section 7; N-03 tracks the non-data decimal regression                                                                                                                                                                                                               | none beyond N-03                                                                                                                                                                                                                                                                                                                                                                                                                   |
| H-04 | HIGH                | RESOLVED                                   | section 2                                                                                                                                                                                                                                                            | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| M-01 | MEDIUM              | RESOLVED — accepted semantics              | section 8                                                                                                                                                                                                                                                            | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| M-02 | MEDIUM              | RESOLVED                                   | section 2                                                                                                                                                                                                                                                            | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| N-01 | MEDIUM              | **UNRESOLVED** (material case closed)      | sections 3–5                                                                                                                                                                                                                                                         | resolve N-02                                                                                                                                                                                                                                                                                                                                                                                                                       |
| N-02 | MEDIUM              | NEW, open (pre-existing at `1e091f9`)      | section 5: a `MATCHED` result carrying registry revision `registry-FORGED` against a mapping revision of `registry-v1`; a 100,000-character revision published on early exits; a caller object echoed by reference in `APPLIED`                                      | Make trusted handles immutable after construction: `Object.freeze(this)` at the end of the `CuratedAssetRegistry` and `MappingLedger` constructors, or private slots behind accessor-free getters. Read `registry.revision.revision` once per operation into a local. Return idempotent and invalidate `mapping` values only from internal frozen state. Add regressions for each section 5 probe. Correct the §21.2–§21.4 claims. |
| N-03 | MEDIUM              | NEW, open (introduced by `18e2772`)        | section 7: 3,053 ms of uncharged, uncancellable normalization for 8 charged steps (10^100,000 / 100,000); quadratic growth                                                                                                                                           | Before `ExactDecimal.fromParts` in `snapshotDecimal`, add O(1) gates: `0 ≤ scale ≤ 78`, and a coefficient magnitude below 10^78 checked by bigint comparison, not `toString`. Charge the rebuild. Add a regression with a large spoof and with a mutated genuine instance. Correct the §21.5 claim.                                                                                                                                |
| L-01 | LOW                 | Informational (carried)                    | 18 hard-break spaces in the `9dacc82` range                                                                                                                                                                                                                          | normalize at the next authorized documentation edit                                                                                                                                                                                                                                                                                                                                                                                |
| L-02 | LOW                 | RESOLVED                                   | sections 2 and 6                                                                                                                                                                                                                                                     | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| L-03 | LOW                 | **UNRESOLVED** (enumerated vectors closed) | sections 5 and 6                                                                                                                                                                                                                                                     | resolve N-02                                                                                                                                                                                                                                                                                                                                                                                                                       |
| L-04 | LOW                 | RESOLVED                                   | section 6                                                                                                                                                                                                                                                            | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| L-05 | LOW                 | NEW, open (pre-existing)                   | Snapshot objects inherit `Object.prototype`. With `Object.prototype.mapping` set to an approved admission input, `evaluateMatch` without a `mapping` returns `MATCHED` (same at `1e091f9`). A polluted `candidate` bypasses the snapshot and is echoed by reference. | Build snapshot objects with a null prototype, or read optional fields with `Object.hasOwn`. Add a regression. The precondition is environment-level, the same class as A-04.                                                                                                                                                                                                                                                       |
| L-06 | LOW                 | NEW, open (pre-existing)                   | `MATCH_REASON_CODES` is not frozen (`Object.isFrozen` is `false`). After `push("BOGUS_CODE")`, a candidate carrying that reason passes the L-03 candidate validation and is echoed; before the push it throws `INPUT_INVALID`.                                       | Freeze the exported catalogue (and any other exported arrays), without changing the 44 codes. Add a regression.                                                                                                                                                                                                                                                                                                                    |
| A-01 | ACCEPTED_LIMITATION | carried                                    | cooperative cancellation; one precharged atomic native call is not interruptible                                                                                                                                                                                     | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A-02 | ACCEPTED_LIMITATION | carried                                    | own-key enumeration charged immediately after its single native pass (also used by `snapshot.ts`)                                                                                                                                                                    | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A-03 | ACCEPTED_LIMITATION | carried                                    | zero approved real venue pairs                                                                                                                                                                                                                                       | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A-04 | ACCEPTED_LIMITATION | carried (§21.7)                            | Proxies are not detected, but are neutralized by single descriptor reads. Globally patched built-ins are out of scope.                                                                                                                                               | none                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A-05 | ACCEPTED_LIMITATION | new                                        | `TypeError`/`RangeError` → `INPUT_INVALID` normalization also maps internal defects. The effect is fail-closed, but diagnostics are lost, and cancellation and bound failures are unaffected.                                                                        | none (consider structured internal-error logging later)                                                                                                                                                                                                                                                                                                                                                                            |

Informational: `evaluateMatch` and `replayMapping` read the `signal` property
twice: once by `readOwnData` for the budget, and once in the record snapshot.
A Proxy could answer differently, but only the first value is used, so no
authority is affected.

## 16. Frozen-boundary evidence

`git diff 4becf10 18e2772` is **empty** for all of the following:

- `packages/market-data`, `packages/contracts` and `packages/design-tokens`;
- the OKX, Binance and Bybit adapters;
- `apps`, `infra` and `docs/brand`;
- the root `package.json` and `package-lock.json`;
- D-055, the D-055 acceptance, D-064 and the capacity decision;
- acceptance reports 1–6 and the re-acceptance;
- the package manifest and `tsconfig`;
- `index.ts`, `reasons.ts`, `policy.ts`, `bounds.ts`, `time.ts`, `model.ts`
  and `test-fixtures.ts`.

The diff from `9dacc82` for the frozen packages, `apps`, `infra`,
`docs/brand`, D-055, its acceptance and D-064 is also empty. All mandated
hashes match (section 1).

After this report was added:

- the Markdown link check gives 78 files and **0 broken** local links;
- `git status --short` in the review worktree lists only
  `?? docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_7.md`.

## 17. Freeze recommendation

**What passes:**

- The hardening closes the ACCEPTANCE_6 material exploit completely
  (section 3).
- It closes every enumerated caller-data accessor, iterator, Proxy and
  fake-decimal vector, with 0 getter invocations.
- It resolves L-02 and L-04.
- It keeps every regression area green: B-01, B-02, H-01, H-02, H-03 for data
  inputs, H-04, M-01 and M-02.
- 29/29 D-055 groups, 40/40 authored cases, 44 codes, 22 exports, stable
  digests, zero real pairs and unchanged frozen boundaries.
- Charged work is strictly higher than `1e091f9` in all 48 measurements.

**Why the result is FAIL:**

- **N-01 is not resolved.** The two brand-checked handles keep mutable public
  fields that are re-read after the check (N-02). A getter on a genuine
  registry still executes and yields a `MATCHED` result whose published
  `registryRevision` diverges from the value validated against the approved
  mapping. A one-line assignment still publishes an unvalidated,
  100,000-character registry revision on the earliest `NOT_MATCHED` exit,
  which also leaves L-03 open.
- The hardening's own decimal snapshot introduces an uncharged, uncancellable,
  quadratic path (N-03).
- §21's claims that "getters are never executed", that a forged revision
  "can never be published" and that snapshot work is charged are therefore
  falsified.

There is no BLOCKER and no unresolved HIGH. All open defects lie outside the
data-only D-055 boundary. N-02 and N-03 are MEDIUM, consistent with
ACCEPTANCE_6's calibration of N-01. The fixes are small and local.

**Final status: FAIL. BLOCKER 0. Unresolved HIGH 0.**
**Phase 2B.1 may freeze: NO. Phase 2B.2 eligible for separate authorization:
NO.**

**Exact recommended next task.** Run one bounded hardening pass inside
`packages/spread-analytics/**` only. It must not change D-055, D-064, the 44
codes, the 22 exports, any digest, rate or bound, or any frozen scope. It
needs to:

1. **N-02:** freeze `CuratedAssetRegistry` and `MappingLedger` instances at the
   end of their constructors, or move `revision`, `versions` and `transitions`
   behind private slots. Read the registry revision once per operation.
   Return `mapping` values only from internal frozen state. Add regressions
   for every probe in section 5.
2. **N-03:** add O(1) scale and coefficient-magnitude gates before
   `ExactDecimal.fromParts` in `snapshotDecimal`, and charge the rebuild. Add
   regressions with large spoofed and mutated-genuine decimals.
3. **L-05 and L-06:** use null-prototype snapshot objects, or `Object.hasOwn`
   reads, and freeze `MATCH_REASON_CODES`. Add regressions.
4. Correct §21.2–§21.5 in the implementation evidence and append a §22
   evidence record.
5. Request ACCEPTANCE_8, a focused re-acceptance of N-01, N-02, N-03, L-03,
   L-05 and L-06 with the regression set of this report.

Only after a passing ACCEPTANCE_8 should the Phase 2B.1 authority record the
freeze and separately consider Phase 2B.2 authorization. This review does not
begin Phase 2B.2.

Final status: FAIL
BLOCKER count: 0
Unresolved HIGH count: 0
N-01: UNRESOLVED
L-02: RESOLVED
L-03: UNRESOLVED
L-04: RESOLVED
Phase 2B.1 may freeze: NO
Phase 2B.2 eligible for separate authorization: NO
