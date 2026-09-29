# Phase 2B.1 — fourth independent acceptance review

- Review date: 2026-09-23.
- Repository: `/Volumes/M2 ssd/HolyParser`; review execution used a fresh materialized copy under `/tmp/holyparser-accept4.j2qAsA/repo`.
- HEAD: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3`; branch: `main`; HEAD tag: `phase-2b-d055-instrument-matching`.
- Final status: **FAIL**. BLOCKER: **0**. Unresolved HIGH: **1**.
- Phase 2B.1 may freeze: **NO**. Phase 2B.2 is eligible for separate authorization: **NO**.
- This review created only this report. No implementation, normative decision, manifest, lockfile, prior acceptance report or evidence report was changed.

## 1. Governing baseline and scope

The accepted D-055 decision file independently hashes to
`60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`.
The runtime policy is `instrument-matching-pilot/v1`; the approved D-064 matching
resource scope is `instrument-matching-resources/v1`. All three mandatory gate
values match. The three earlier failed acceptance reports independently retain
their SHA-256 values:

| Report           | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| First acceptance | `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0` |
| Re-acceptance    | `22bb95806e7e8cd300e6ef49e87654528c6fbb775df344b1335c5e61baf028c4` |
| Third acceptance | `bd5fa6a38404e9d40e35513176f94a752025fd7152653dc5d4b64811592295e0` |

The review used `AGENTS.md`, `MASTER_SPEC.md`, the D-055 decision and formal
acceptance, D-064 matching approval, Phase 2B plan and architecture acceptance,
ADR-0009, the three prior Phase 2B.1 acceptance reports, Phase 2B.1
implementation evidence, applicable domain/API/security/risk/decision/acceptance
records, frozen Phase 2A evidence, and all current Phase 2B.1 runtime and test
modules. Author-produced reports and green tests were not treated as proof.

Pre-review `git status --short`, `git diff --check` and `git fsck --full` passed.
Tracked changes are precisely the already-authorized Phase 2B.1 workspace
integration in root `package.json` and `package-lock.json`; the package and prior
reports/evidence remain untracked in this no-commit transaction. No unrelated
worktree change was found. Manifest SHA-256 is
`6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5`;
lockfile SHA-256 is
`810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59`.

## 2. Required finding verdicts

| Finding                                               | Verdict                 | Independent basis                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 — forged history/transition authority            | **RESOLVED**            | The exact former forged `SUPERSEDED` v1 plus valid v2 is rejected. A base mapping must stay `APPROVED / COMPATIBLE_APPROVED`; status effects require separately digest-bound, reviewed, append-only transitions. Twelve independent one-field transition mutations and a fake admitted handle were rejected in disposable JavaScript-level probes.                     |
| B-02 — immutable admitted replay                      | **RESOLVED**            | Admission materializes copied/frozen versions and transitions behind a runtime WeakSet authenticity check. Replay takes the admitted aggregate, not mutable caller history. Existing mutation regressions and structural inspection pass.                                                                                                                              |
| H-01 — product scope before identity                  | **RESOLVED**            | Product classification precedes final exposure-key construction. SPOT, dated, unsupported, unknown, option-like and inverse diagnostic candidates do not materialize an unproved pilot exposure; valid synthetic linear perpetual vectors remain stable.                                                                                                               |
| H-02 — public API closure                             | **RESOLVED**            | Explicit source barrel and root-only package export map; exactly 22 runtime exports from fresh `dist/index.js`. No wildcard, WorkBudget, raw validator, transition constructor or deep-import path is public.                                                                                                                                                          |
| H-03 — cumulative logical-work/cancellation authority | **NOT RESOLVED — HIGH** | Candidate materialization performs canonical serialization, key construction and hash-input preparation without passing its operation WorkBudget. Its single charged step hides repeated authoritative work. Therefore the observed 128-step gap is only a gap between _charged_ steps; the D-064 operation-wide guarantee and 100,000-step cap cannot be established. |

### B-01/B-02 and transition graph

`admission.ts` validates every base version's closed schema, policy, registry and
evidence revisions, candidate/command/approval digests, reviewer separation,
identity, interval and approval state. `transitions.ts` uses distinct digest
domains for supersession, invalidation and correction. The transition graph
checks target existence, expected revision/state, successor linkage, duplicate
or contradictory transitions and immutable prior approval. The admitted
aggregate binds ordered version and transition digests and is runtime-authentic,
not merely structurally typed. The exact prior bypass—changing v1 to
`SUPERSEDED`, forging its reason and successor while retaining the approval
digest—now fails admission and cannot yield `MATCHED`. The same applies to
forged invalidation. A valid reviewed v1 → supersession → approved v2 control
continues to work. AS_KNOWN and CORRECTED replay consume the admitted aggregate;
mutation of original caller records or returned views does not change historical
selection or the aggregate digest.

### H-03 counterexample and accounting inventory

In `packages/spread-analytics/src/candidates.ts`, `makeCandidate` at lines
200–277 calls `work.step()` once at line 208. The calls at lines 221–234 and
245–263 then perform `canonicalExposureKey`, `canonicalSerialize`,
`deterministicId`, SHA-256 input preparation, and candidate copying without the
`work` argument. This helper is called for generated pairs by the production
candidate path, so the omission is not test-only.

An independent disposable-copy probe temporarily exposed this private helper,
then compared a short and a 150-character canonical base asset ID. Both consumed
**exactly one** charged step, while the generated canonical key grew by more
than 100 bytes. The probe ran successfully; its temporary source export and
test were removed, and the source SHA-256 was checked against the original
before authoritative quality verification. A single helper can be used for up
to 8,192 permitted candidate pairs. This is an independently reproduced
operation-budget bypass even though `WorkBudget.step(count)` itself chunks
charged work and checks every 128 charged units.

| Repeated-work family                                                                                               | Review result                                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Bounded JSON, ID/text scanning with a passed budget                                                                | Charged and checked in tested paths.                                                     |
| Registry, evidence, history, transition and replay loops                                                           | Generally charge the passed operation budget; authored tests cover representative paths. |
| Comparator and canonical serializer when passed a budget                                                           | Charge traversal/comparison work.                                                        |
| Candidate materialization: exposure/provisional key serialization, ID/evidence hashing preparation, immutable copy | **Uncharged under the parent budget; H-03 fails.**                                       |
| Final `WorkBudget.beforePublication`                                                                               | Present, but cannot account retroactively for omitted candidate work.                    |

The independently observable maximum gap between **charged** cancellation checks
is 128. The maximum gap over **all actual authoritative logical work** is **not
measurable from the current counter** because work is omitted; it is not proven
to be ≤128. The direct `WorkBudget` boundary accepts 100,000 charged steps and
rejects 100,001, but this does not prove the cumulative real operation cap.
Do not report the charged observer's 128 as an operation-wide pass. No partial
publication or accepted-state mutation was observed in the authored cancellation
and atomicity tests; the omitted-work defect still makes the D-064 aggregate
verdict FAIL.

## 3. Other architecture verdicts

- Canonical serialization: **PASS**. `instrument-exposure-pilot/v1` domain,
  seven fixed fields, UTF-8 byte-length prefixes and known SHA-256 vectors are
  unchanged; admitted-history/transition digest namespaces are separate.
- Economics: **PASS**. Public exact-decimal arithmetic reproduces `1 × 1 = 1`,
  `1000 × 0.001 = 1` and `0.01 × 100 = 1`; no multiplier-one fallback, float
  equality, or inferred BASE_UNIT convention appears.
- Lifecycle/freshness: **PASS**. ACTIVE only; metadata `[0,60s]` inclusive,
  negative age invalid, greater than 60s stale; mapping validity at most 30
  days; half-open effective intervals; no ambient `Date.now()` semantics.
- Governance/replay/conflict/cardinality: **PASS except the H-03 resource
  consequence**. Independent reviewers and digest/revision binding remain;
  replay is immutable, conflict/quarantine is fail-closed, and no native venue
  instrument is destructively merged.
- Hostile inputs and publication: **PASS for tested typed rejection and
  atomicity**, subject to H-03's uncharged-work exposure.
- Public API/package boundary: **PASS**. Only Phase 2B.1 root exports;
  `@arbitrage/market-data` is imported through its public package API, with
  no adapter or private market-data import and no new third-party dependency.
- Current real pair readiness: **PASS**. OKX ↔ Binance is UNAVAILABLE with
  `MULTIPLIER_UNKNOWN` and `VALUE_CONVENTION_UNVERIFIED`; OKX ↔ Bybit is
  UNAVAILABLE with `MULTIPLIER_UNKNOWN`; Binance ↔ Bybit is UNAVAILABLE with
  multiplier gaps on both legs and Binance's unverified convention. Synthetic
  controls are not real approved mappings.

## 4. D-055 scenario review

The numbered source scenario suite contains **37 synthetic cases plus three
real-venue cases = 40/40 passing authored runtime cases**. The table judges
policy invariants rather than merely test labels. Each numbered row maps to
the same-number case or parametrized cases in
`packages/spread-analytics/src/d055-scenarios.test.ts`, except group 26, which
maps to `governance.test.ts` plus the append-only transition cases in
`third-acceptance-remediation.test.ts`; group 29 additionally maps to the
resource/cancellation suites and the independent H-03 probe.

|   # | Expected scenario/status or exact primary code                            | Independent verdict                      |
| --: | ------------------------------------------------------------------------- | ---------------------------------------- |
|   1 | Same reviewed A/USDT linear perpetual → `MATCHED / COMPATIBLE_APPROVED`   | PASS                                     |
|   2 | Same ticker, different canonical base → `BASE_ASSET_MISMATCH`             | PASS                                     |
|   3 | USDT vs USDC → `SETTLEMENT_ASSET_MISMATCH`                                | PASS                                     |
|   4 | Linear vs inverse → `VALUE_CONVENTION_MISMATCH`                           | PASS                                     |
|   5 | Perpetual/dated and dated/dated → `DATED_PRODUCT_EXCLUDED`                | PASS                                     |
|   6 | Exactly normalizable 1, 0.001, 100 factors → compatible                   | PASS                                     |
|   7 | Missing multiplier → `MULTIPLIER_UNKNOWN`                                 | PASS                                     |
|   8 | Unknown lifecycle → `LIFECYCLE_UNKNOWN`                                   | PASS                                     |
|   9 | Reviewed direct alias → compatible, reviewed manual                       | PASS                                     |
|  10 | Conflicting binding → `ASSET_BINDING_CONFLICT`                            | PASS                                     |
|  11 | Superseded current vs historical AS_KNOWN                                 | PASS                                     |
|  12 | Reviewed historical rebrand                                               | PASS                                     |
|  13 | Ticker-only collision → `ASSET_IDENTITY_UNKNOWN`                          | PASS                                     |
|  14 | Unsupported family → `PRODUCT_UNSUPPORTED`                                | PASS                                     |
|  15 | 60s accepted, 60s+1ms → `EVIDENCE_STALE`                                  | PASS                                     |
|  16 | Zero/negative multiplier → `MULTIPLIER_INVALID`                           | PASS                                     |
|  17 | Incompatible unit → `CONTRACT_UNIT_MISMATCH`                              | PASS                                     |
|  18 | Unapproved candidate → `MAPPING_UNAPPROVED`                               | PASS                                     |
|  19 | Quarantine/invalidation → typed non-actionable                            | PASS                                     |
|  20 | Unknown convention/capability → typed unavailable                         | PASS                                     |
|  21 | Alias chain/cycle → `ALIAS_CHAIN_FORBIDDEN`                               | PASS                                     |
|  22 | Economics contradiction → `METADATA_EVIDENCE_CONFLICT`                    | PASS                                     |
|  23 | Overlapping intervals → `MAPPING_INTERVAL_CONFLICT`                       | PASS                                     |
|  24 | Inactive lifecycle → `LIFECYCLE_NOT_ACTIVE`                               | PASS                                     |
|  25 | Expired or >30-day validity → `MAPPING_EXPIRED` / `EVIDENCE_TIME_INVALID` | PASS                                     |
|  26 | Digest, reviewer and revision authority reject forged state               | PASS; append-only transition probes pass |
|  27 | OKX special family → `SPECIAL_PRODUCT_EXCLUDED`                           | PASS                                     |
|  28 | AS_KNOWN/CORRECTED replay and historical immutability                     | PASS                                     |
|  29 | Resource/cancellation bound and permutation                               | **FAIL — H-03 uncharged candidate work** |

Result: **28/29 policy groups PASS**, while all **40/40 authored runtime cases
PASS**. Exactly 44 reason-code values are exported; all 44 are unique and no
new semantic code was introduced by the remediation.

## 5. D-064 resource-limit review

All named numeric boundary and one-over tests pass as written. The two
operation-wide work guarantees fail despite the directly tested counter.

| Limit                                  |         Approved value | Verdict                                             |
| -------------------------------------- | ---------------------: | --------------------------------------------------- |
| Instruments                            |                  1,024 | PASS                                                |
| Partners per instrument                |                     32 | PASS                                                |
| Candidate pairs                        |                  8,192 | PASS                                                |
| Registry bindings                      |                  4,096 | PASS                                                |
| Alias depth                            |                      1 | PASS                                                |
| Mapping versions per mapping           |                     64 | PASS                                                |
| Mapping/event records per operation    |                  4,096 | PASS                                                |
| Evidence references per entity/version |                     32 | PASS                                                |
| Total evidence references              |                 32,768 | PASS                                                |
| Evidence record                        |                  8 KiB | PASS                                                |
| Conflicts                              |                    128 | PASS                                                |
| Diagnostics                            |                    200 | PASS                                                |
| Atomic ID                              | 160 UTF-16 / 640 UTF-8 | PASS                                                |
| Composite ID                           |            4,096 UTF-8 | PASS                                                |
| Reason/description                     |              512 UTF-8 | PASS                                                |
| Input/output                           |            16 MiB each | PASS                                                |
| JSON depth                             |                     16 | PASS                                                |
| JSON nodes                             |                100,000 | PASS                                                |
| Object keys                            |                     64 | PASS                                                |
| Generic array                          |                 32,768 | PASS                                                |
| Decimal wire                           |         256 characters | PASS                                                |
| Coefficient digits                     |                     78 | PASS                                                |
| Wire/domain scale                      |                36 / 78 | PASS                                                |
| Cumulative logical work                |                100,000 | **FAIL operation-wide; direct counter only passes** |
| Cancellation interval                  |     ≤128 logical steps | **FAIL operation-wide; charged gap = 128**          |

D-064 aggregate verdict: **FAIL**. The missing accounting may allow work beyond
the authorized operation cap and more actual work than the approved interval
between cancellation opportunities. H-03 is therefore HIGH, not a test-only
observation.

## 6. Verification and frozen boundaries

The fresh copy used exactly Node **v24.18.1** and npm **11.16.0**. Its first
`npm ci` completed (451 packages added, 460 audited, seven pre-existing audit
advisories). `npm run format:check`, `npm run lint`, `npm run typecheck`, focused
spread tests and full `npm test` all exited 0. The focused package had **15/15
source test files, 183/183 tests** passing. The third-remediation and numbered
D-055 files together had **2/2 files, 63/63 tests** passing (23 remediation plus
40 scenario cases). Full default tests: **50 source test files** (47 passed,
three skipped); **443 passed, zero failed, three skipped**. No compiled duplicate
test was counted as unique source coverage. `npm run build` exited 0 and
generated **six static web routes**: `/`, `/_not-found`, `/forgot-password`,
`/login`, `/register`, `/verify-email`. Package query returned **452** packages;
there are **eight** workspaces.

Repository Markdown/local-link validation counted **74 Markdown files, 87
Markdown links, 65 local links, one anchor and zero broken local links**.

Independent disposable probes comprised **15 passing assertions**: the exact
old forged history case, twelve transition-field mutations, a fake admitted
handle, and the H-03 candidate accounting counterexample. These temporary
source/test edits were removed before the authoritative quality run and were
never introduced into the healthy repository.

A _second_ `npm ci` attempted after the completed quality/build run failed with
`ENOSPC` in the disposable copy. This is an environmental disk-space warning,
not a product test failure; it does not erase the earlier successful clean
install and verification. Only that disposable copy's `node_modules` and
`.next` contents were then deleted to recover local disk space. The healthy
repository was not affected. The second install is not counted as a pass.
The disposable Next.js build also regenerated `apps/web/next-env.d.ts`; the
healthy repository's application file remains unchanged. Fresh-copy
`git diff --check` and `git fsck --full` passed after the build.

`git diff --check` and `git fsck --full` pass in the healthy repository. The
root manifest and lockfile retain the exact expected SHA-256 values above. The
lock semantic delta contains only the approved workspace record/link, local
`spread-analytics → market-data` edge, and the authorized pre-existing D1
`design-tokens.engines` sync; no third-party addition, removal, version,
integrity or resolved-URL change is present. All new source remains confined
to `packages/spread-analytics`.

No diff was found in frozen `packages/market-data`, the OKX/Binance/Bybit
adapters, frozen Phase 2A docs, D-055, D-064, accepted Phase 2B formulas,
D1/D2, Product/Commerce/Admin, application source/routes/layout/navigation,
infrastructure or brand assets. Brand SHA-256 values match their accepted
baselines: dark `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08`,
design system `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54`,
logo `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c`.

## 7. Findings, limitations and freeze decision

| ID   | Severity | State         | Required resolution                                                                                                                                                                                                                                                                                           |
| ---- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-03 | HIGH     | Unresolved    | Thread the same operation WorkBudget through candidate materialization, including exposure/provisional key serialization, deterministic ID/evidence hash preparation and copying/traversal; add an end-to-end count/cancellation regression. Audit analogous omitted call sites without changing D-055/D-064. |
| E-01 | LOW      | Environmental | A later repeated `npm ci` failed with local `ENOSPC`; the first clean install and subsequent quality/build checks passed. Re-run from a fresh copy with sufficient disk space in the next acceptance cycle.                                                                                                   |
| E-02 | LOW      | Environmental | The disposable production build regenerated `apps/web/next-env.d.ts`; the authoritative checkout did not change.                                                                                                                                                                                              |

Accepted limitations remain: real venue economics evidence currently supports
zero approved pairs; production mappings and live exchange canaries are outside
this phase. There is no accepted waiver for H-03. **FAIL**, no Phase 2B.1 freeze,
and no Phase 2B.2 authorization eligibility. This report does not change
normative policy or remediate implementation.

**Exact recommended next task:** authorize a fourth Phase 2B.1
acceptance-remediation limited to H-03 in `packages/spread-analytics/**` and
the implementation evidence document. Require one cumulative budget across
candidate key serialization, ID/hash preparation, copy/publication and every
remaining authoritative repeated-work path; independently test near-boundary
valid IDs, 8,192 candidate pairs, distributed work crossing 100,000 steps,
cancellation inside materialization, ≤128 actual-step gaps, and atomic
nonpublication. Keep D-055, D-064, 44 codes, manifests, lockfile, frozen
boundaries and the four acceptance reports unchanged. Then request a new
independent formal acceptance; do not begin Phase 2B.2.
