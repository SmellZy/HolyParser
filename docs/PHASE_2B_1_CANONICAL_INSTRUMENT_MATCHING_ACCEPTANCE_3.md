# Phase 2B.1 — Canonical Instrument Matching Foundation third acceptance

Review date: **2026-09-22**  
Repository: `/Volumes/M2 ssd/HolyParser`  
HEAD: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3`  
Branch: `main`  
Tag at HEAD: `phase-2b-d055-instrument-matching`

Final status: **FAIL**  
BLOCKER findings: **1**  
Unresolved HIGH findings: **1**

Phase 2B.1 may freeze: **NO**.  
Phase 2B.2 is eligible for separate authorization: **NO**.

This is a fresh independent review after the second remediation. It does not
modify implementation, either previous failed acceptance report, implementation
evidence, D-055, D-064, manifests, lockfile, dependencies, or any frozen scope.
Implementation-produced reports and tests were treated as evidence and checked
against source plus independent adversarial probes.

## 1. Normative gate and review baseline

The immutable decision values were reproduced exactly:

| Gate                            | Required                                                           | Reproduced | Verdict |
| ------------------------------- | ------------------------------------------------------------------ | ---------- | ------- |
| D-055 snapshot SHA-256          | `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931` | same       | PASS    |
| policy                          | `instrument-matching-pilot/v1`                                     | same       | PASS    |
| D-064 scope                     | `instrument-matching-resources/v1`                                 | same       | PASS    |
| `package.json` SHA-256          | `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` | same       | PASS    |
| `package-lock.json` SHA-256     | `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59` | same       | PASS    |
| first failed acceptance SHA-256 | `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0` | same       | PASS    |
| failed re-acceptance SHA-256    | `22bb95806e7e8cd300e6ef49e87654528c6fbb775df344b1335c5e61baf028c4` | same       | PASS    |

`git diff --check` and `git fsck --full` passed before review. The known
Phase 2B.1 transaction remains isolated to the new spread-analytics workspace,
its implementation evidence, its two prior acceptance reports, and the already
authorized root manifest/lock integration. No unrelated authoritative-checkout
change was found. This review creates only this report.

## 2. Reviewed implementation scope

The complete `packages/spread-analytics` source, tests, manifest, generated
`dist` output, D-055, D-064, ADR-0009, both prior failed acceptance reports,
the implementation report, the Phase 2B plan/architecture acceptance, and the
relevant domain, API, security, risk, decision and acceptance records were
reviewed. The package remains confined to Phase 2B.1 matching concepts and has
no Phase 2B.2 spread, VWAP, fee, funding, opportunity, history, ranking, trading,
UI, persistence, or infrastructure behavior.

## 3. Finding verdicts

| Finding                                            | Independent verdict        | Evidence                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 — full-history provenance admission           | **NOT RESOLVED — BLOCKER** | Exact old forged-history case is rejected, but an approved v1 can have only `status`, `reasonCode`, and `supersededBy` caller-mutated while retaining the same approval-command digest. The aggregate is admitted `VALID`; `evaluateMatch` returns `MATCHED / COMPATIBLE_APPROVED`.                            |
| B-02 — replay/runtime immutability                 | **RESOLVED**               | Admitted history is runtime-authenticated, defensively copied and deeply frozen. Mutating caller history after admission leaves replay byte-identical; a structural clone is rejected with `INPUT_INVALID`.                                                                                                    |
| H-01 — product scope before identity               | **RESOLVED**               | SPOT, dated, unsupported, unknown, option-like and inverse diagnostic candidates do not receive a final exposure key or unproven identity fields. Supported linear-perpetual control retains the accepted key.                                                                                                 |
| H-02 — public API closure                          | **RESOLVED**               | Source and built root expose exactly 22 runtime names. No wildcard, deep export, admitted-history constructor, budget, raw validator, serializer, transition validator, mutable policy state or fixture leaks.                                                                                                 |
| H-03 — operation-wide work/cancellation accounting | **NOT RESOLVED — HIGH**    | Multiple authoritative string-validation/canonicalization paths omit the parent `WorkBudget`. A one-character and a 160-code-unit command ID both charge exactly 14 steps. Accepted composite IDs can execute a 4,096-code-unit scan between budget checks. The observed 128 gap applies only to charged work. |

## 4. B-01 — forged history and transition authority

The exact prior counterexample with forged policy, registry and evidence
revisions, missing approvals and `supersededBy = 999` is rejected before
admission. That focused remediation is real but incomplete.

An independent JavaScript-runtime probe then used a genuinely approved v1 and
changed only:

- `status: APPROVED -> SUPERSEDED`;
- `reasonCode: COMPATIBLE_APPROVED -> MAPPING_SUPERSEDED`;
- `supersededBy: 2`.

The original v1 approval command and digest were retained byte-for-byte. The
probe reproduced:

```text
sameCommandDigest = true
admission = VALID
evaluateMatch = MATCHED
reasons = [COMPATIBLE_APPROVED]
```

The cause is architectural. `mapping-command/v1` does not bind mapping status,
reason code, supersession reference, or invalidation reference. Admission
validates those fields structurally and then creates a new internal
`admitted-mapping-version/v1` digest itself. That newly calculated digest is not
an independent signed/approved transition event. Therefore a caller can
fabricate a closure/supersession transition while reusing authentic approval
provenance.

D-055 requires signed records and append-only closure/correction events; it
explicitly forbids editing the original approved record in place. The current
representation cannot distinguish an authoritative supersession from the
caller mutation above. Full per-version provenance and the transition graph
therefore do not form an authoritative admitted aggregate. This is a direct
path to `MATCHED` and remains a BLOCKER.

Other independently inspected protections do work: wrong policy/evidence/
registry revisions, missing approvals, malformed command digest, reviewer
collision, discontinuous versions, unknown successor, identity change and
overlapping approved intervals are rejected. They do not close the unbound
transition-event path.

## 5. Admitted-history and B-02 immutability

`AdmittedMappingHistory` uses a module-private `WeakSet` runtime authenticity
check in addition to its TypeScript brand. Its ordered records, versions,
candidates, reviews, commands and approval arrays are copied and frozen.
Replay accepts only the admitted handle.

The independent mutation sequence changed caller-owned prior/current status,
review actors, revisions and linkage after admission. Replaying the same
admitted handle produced byte-identical output and the same aggregate digest.
A shape-equivalent spread copy failed `INPUT_INVALID`. Returned mapping and
approval views are frozen values and do not expose mutable internal Map/Set
state. Verdict: **B-02 RESOLVED**.

This result does not cure B-01: immutability faithfully preserves whatever
history admission accepted, including a fabricated transition.

## 6. Transition-graph verdict

The graph validator correctly checks version continuity, mapping/exposure
identity, `priorVersion`, forward successor existence, terminal successors and
approved-interval overlap. Skipped/duplicate versions, backward/missing targets,
terminal successors, identity changes and overlapping approved intervals fail
closed in the authored suites.

Verdict: **FAIL as an authority graph**. Topology is checked, but transition
authority is not cryptographically/provenance-bound. The graph accepts the
caller-created `SUPERSEDED` edge described in section 4.

## 7. H-01 product gating and canonical identity

Independent runtime cases produced the following pre-evaluator candidate state:

| Product case       | Final exposure key | Unproven product/economics fields                                     |
| ------------------ | ------------------ | --------------------------------------------------------------------- |
| SPOT               | absent             | absent                                                                |
| dated future       | absent             | absent                                                                |
| unsupported family | absent             | absent                                                                |
| unknown product    | absent             | absent                                                                |
| option-like        | absent             | absent                                                                |
| inverse            | absent             | `LINEAR` and `BASE_UNIT` absent; proven derivative/perpetual retained |

The supported synthetic control retained:

```text
instrument-exposure-pilot/v1|10:DERIVATIVE7:asset:A10:asset:USDT10:asset:USDT9:PERPETUAL6:LINEAR9:BASE_UNIT
```

Verdict: **H-01 RESOLVED**. Product scope is proven before final canonical
identity is materialized.

## 8. H-02 public API and package boundary

The source barrel and rebuilt `dist/index.js` expose exactly these 22 runtime
names:

`CuratedAssetRegistry`, `EXPOSURE_KEY_VERSION`, `MATCHING_LIMITS`,
`MATCHING_POLICY_VERSION`, `MATCHING_RESOURCE_SCOPE`, `MATCH_REASON_CODES`,
`MappingLedger`, `MatchingFailure`, `admitMappingCommand`,
`admitMaterializedMapping`, `admitRegistryRevision`, `approveCommand`,
`candidateProvenanceDigest`, `canonicalExposureKey`, `evaluateBatch`,
`evaluateMatch`, `generateCandidates`, `invalidateCommand`,
`normalizeBaseExposure`, `normalizeQuoteNotional`, `replayMapping`, and
`validateEvidenceBundle`.

The package export map contains only `.` and the sole dependency is public
`@arbitrage/market-data@0.1.0`. Type-only admitted-history declarations do not
create a runtime constructor. Internal subpaths are not package exports.
Verdict: **H-02 RESOLVED**.

## 9. H-03 operation-wide accounting inventory

| Authoritative repeated work                                         | Parent budget coverage                                                            | Verdict                                         |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| top-level schema/key traversal                                      | charged in bounded chunks                                                         | PASS                                            |
| metadata/context/sidecar traversal                                  | charged for records/keys                                                          | PASS, except reason-text scan call omits budget |
| registry assets/bindings/aliases/indexes                            | parent budget propagated                                                          | PASS                                            |
| candidate enumeration, grouping, partner count and sort comparisons | parent budget propagated                                                          | PASS                                            |
| candidate fixed-schema canonicalization/hash preparation            | `makeCandidate` calls canonical/hash helpers without parent budget                | FAIL                                            |
| evidence records and references                                     | record/reference loops charged; atomic/reason scans omit parent budget            | FAIL                                            |
| mapping-record/history/transition loops                             | record and graph loops charged; many atomic/composite scans omit parent budget    | FAIL                                            |
| approval/command validation                                         | approval records charged; atomic/composite/reason scans omit parent budget        | FAIL                                            |
| ledger history                                                      | principal scans charged; snapshot sort/map and some text scans are outside budget | FAIL                                            |
| replay version/filter/sort/materialization                          | principal loops charged; replay ID scans omit parent budget                       | FAIL                                            |
| canonical serialization with supplied budget                        | node/key/text meter and hash blocks charged                                       | PASS                                            |
| diagnostic bounded sort                                             | helper has no budget parameter                                                    | FAIL if used in an authoritative operation      |
| result/output serialization and pre-publication check               | charged                                                                           | PASS                                            |

Direct source examples include `assertAtomicId`, `assertCompositeId` and
`assertReasonText` calls without the operation budget in admission, commands,
evidence and replay. Those functions perform `hasUnpairedSurrogate` loops. The
independent command probe observed equal charged work for a one-character and a
160-code-unit command ID: **14 steps in both cases**.

The WorkBudget observer still reports a maximum gap of **128 among charged
steps** and `step(count)` chunks correctly. That measurement is not the
operation-wide invariant. An accepted 4,096-byte ASCII composite identifier can
be scanned through 4,096 loop iterations without a cancellation check when the
budget is omitted. Therefore the true operation-wide maximum is not bounded by
128 and H-03 remains unresolved.

The direct WorkBudget accepts exactly 100,000 charged steps and rejects the next
step. The cumulative operation cap nevertheless fails because distributed work
can occur without being charged. Helpers do not reset a supplied budget, but
some helpers never receive it. Verdict: **100,000-step operation cap FAIL**.

## 10. Cancellation atomicity

Covered cancellation paths stage candidate/evaluation results, preserve prior
ledger/history state and check immediately before publication. Authored tests
for validation, candidates, admission, replay, serialization and publication
remain green. No partial publication was observed.

Verdict: **PASS for instrumented cancellation paths; overall D-064 cancellation
FAIL** because callers cannot cancel within unaccounted scans described in
section 9.

## 11. Canonical serialization, economics and freshness

Canonical serialization remains deterministic, UTF-8 ordered, LF terminated
and domain separated. The exposure vector above is unchanged. History uses the
separate `admitted-mapping-history/v1` domain and per-version
`admitted-mapping-version/v1` domain; no namespace collision was found.

Independent exact-decimal reproduction returned:

| Quantity | Factor | Exact result |
| -------: | -----: | -----------: |
|        1 |      1 |            1 |
|     1000 |  0.001 |            1 |
|     0.01 |    100 |            1 |

No `Number`/epsilon financial equality or multiplier fallback was found.
Invalid multiplier, unit mismatch and decimal overflow fail closed.

Lifecycle remains ACTIVE-only. Metadata age is inclusive `[0, 60s]`, negative
age is invalid, `60s + 1ms` is stale, mapping validity is at most 30 days and
effective intervals are `[effectiveFrom, effectiveTo)`. No `Date.now()` or
ambient time authority is used.

## 12. Twenty-nine D-055 scenario groups

The authored numbered scenario file has 37 numbered cases plus three real-venue
cases: **40/40 passed**. Governance cases for group 26 are in the governance and
remediation suites. The table below assesses the complete policy invariant,
including independent adversarial probes rather than only authored assertions.

|   # | Scenario / expected primary result                                    | Independent verdict                                                           |
| --: | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
|   1 | supported A/USDT perpetual → `MATCHED / COMPATIBLE_APPROVED`          | PASS                                                                          |
|   2 | same ticker/different asset → `BASE_ASSET_MISMATCH`                   | PASS                                                                          |
|   3 | USDT/USDC → `SETTLEMENT_ASSET_MISMATCH`                               | PASS                                                                          |
|   4 | linear/inverse → `VALUE_CONVENTION_MISMATCH`                          | PASS                                                                          |
|   5 | perpetual/dated and dated/dated → `DATED_PRODUCT_EXCLUDED`            | PASS; H-01 gating verified before evaluator                                   |
|   6 | factors 1/0.001/100 → exact compatible exposure                       | PASS                                                                          |
|   7 | missing multiplier → `MULTIPLIER_UNKNOWN`                             | PASS                                                                          |
|   8 | unknown lifecycle → `LIFECYCLE_UNKNOWN`                               | PASS                                                                          |
|   9 | reviewed direct alias → compatible/reviewed manual                    | PASS                                                                          |
|  10 | conflicting binding → `ASSET_BINDING_CONFLICT`                        | PASS                                                                          |
|  11 | superseded current / historical AS_KNOWN                              | PASS for valid authored record; B-01 separately rejects authority model       |
|  12 | reviewed rebrand with historical identity                             | PASS                                                                          |
|  13 | ticker-only collision → `ASSET_IDENTITY_UNKNOWN`                      | PASS                                                                          |
|  14 | unsupported family → `PRODUCT_UNSUPPORTED`                            | PASS; no final exposure key                                                   |
|  15 | 60s accepted, 60s+1ms → `EVIDENCE_STALE`                              | PASS                                                                          |
|  16 | zero/negative multiplier → `MULTIPLIER_INVALID`                       | PASS                                                                          |
|  17 | incompatible unit → `CONTRACT_UNIT_MISMATCH`                          | PASS                                                                          |
|  18 | unapproved candidate → `MAPPING_UNAPPROVED`                           | PASS                                                                          |
|  19 | quarantine/invalidation → typed non-actionable result                 | PASS for outcome; transition authority still covered by B-01                  |
|  20 | unknown convention/capability → typed unavailable                     | PASS                                                                          |
|  21 | alias chain/cycle → `ALIAS_CHAIN_FORBIDDEN`                           | PASS                                                                          |
|  22 | economics contradiction → `METADATA_EVIDENCE_CONFLICT`                | PASS                                                                          |
|  23 | overlapping intervals → `MAPPING_INTERVAL_CONFLICT`                   | PASS                                                                          |
|  24 | inactive lifecycle → `LIFECYCLE_NOT_ACTIVE`                           | PASS                                                                          |
|  25 | expiry/>30-day validity → `MAPPING_EXPIRED` / `EVIDENCE_TIME_INVALID` | PASS                                                                          |
|  26 | digest/reviewer/revision failures reject without mutation             | **FAIL: transition fields bypass command/digest authority and reach MATCHED** |
|  27 | OKX special family → `SPECIAL_PRODUCT_EXCLUDED`                       | PASS                                                                          |
|  28 | AS_KNOWN/CORRECTED replay                                             | PASS for immutable admitted input; caller mutation no longer affects replay   |
|  29 | resource bound/permutation                                            | **FAIL: operation-wide work/cancellation bound is incomplete**                |

Policy-level result: **27/29 groups PASS**. Authored runtime result remains
**40/40 PASS**, demonstrating why authored green tests are not acceptance proof.

## 13. Reason-code catalogue

Runtime enumeration produced exactly **44 values, 44 unique**, in deterministic
raw UTF-8 order. No second-remediation code was added, no free-form generator
exists and no caller/exchange string becomes a reason code. Verdict: **44/44
PASS**.

## 14. D-064 limits

| Limit                        |               Approved | Independent verdict                                      |
| ---------------------------- | ---------------------: | -------------------------------------------------------- |
| instruments                  |                  1,024 | PASS                                                     |
| partners/instrument          |                     32 | PASS                                                     |
| candidate pairs              |                  8,192 | PASS                                                     |
| bindings                     |                  4,096 | PASS                                                     |
| alias depth                  |                      1 | PASS                                                     |
| mapping versions/mapping     |                     64 | PASS                                                     |
| mapping/events               |                  4,096 | PASS                                                     |
| evidence refs/entity/version |                     32 | PASS                                                     |
| total evidence refs          |                 32,768 | PASS                                                     |
| evidence record              |                  8 KiB | PASS                                                     |
| conflicts                    |                    128 | PASS                                                     |
| diagnostics                  |                    200 | PASS                                                     |
| atomic ID                    | 160 UTF-16 / 640 UTF-8 | PASS size rejection; cancellation accounting FAIL        |
| composite ID                 |            4,096 UTF-8 | PASS size rejection; cancellation accounting FAIL        |
| reason/description           |              512 UTF-8 | PASS size rejection; cancellation accounting FAIL        |
| input/output                 |                 16 MiB | PASS                                                     |
| JSON depth                   |                     16 | PASS                                                     |
| JSON nodes                   |                100,000 | PASS                                                     |
| object keys                  |                     64 | PASS                                                     |
| generic array                |                 32,768 | PASS                                                     |
| decimal wire                 |         256 characters | PASS                                                     |
| coefficient digits           |                     78 | PASS                                                     |
| wire/domain scale            |                36 / 78 | PASS                                                     |
| cumulative logical work      |                100,000 | **FAIL operation-wide; direct charged counter passes**   |
| cancellation interval        |                  <=128 | **FAIL operation-wide; charged observer maximum is 128** |

Numeric boundary and one-over tests remain green, but the D-064 aggregate
verdict is **FAIL** because its work and cancellation rules are normative.

## 15. Hostile input, determinism and real-venue result

Malformed UTF-8/Unicode, controls, ID/description overflow, JSON depth/node/key/
array overflow, decimal overflow, alias cycle/depth, evidence/history/conflict/
diagnostic floods and candidate explosion fail closed in the reviewed suite.
Forged shape-only admitted handles are rejected. The unbound transition mutation
is the hostile-input exception classified as B-01.

Instrument, registry, evidence, alias, candidate, mapping-history, conflict and
replay permutations remain deterministic for histories accepted by admission.
AS_KNOWN and CORRECTED replay select explicit revisions and remain byte-stable
after caller mutation. Determinism verdict: **PASS for admitted values; overall
authority verdict fails B-01**.

Current frozen-evidence results remain unchanged:

| Pair            | Outcome       | Reasons                                                                   |
| --------------- | ------------- | ------------------------------------------------------------------------- |
| OKX ↔ Binance   | `UNAVAILABLE` | `MULTIPLIER_UNKNOWN`, `VALUE_CONVENTION_UNVERIFIED`                       |
| OKX ↔ Bybit     | `UNAVAILABLE` | `MULTIPLIER_UNKNOWN`                                                      |
| Binance ↔ Bybit | `UNAVAILABLE` | both applicable multiplier gaps and Binance `VALUE_CONVENTION_UNVERIFIED` |

No multiplier, `BASE_UNIT` or convention is inferred for live venue evidence.
Zero real approved pairs remains intentional fail-closed behavior.

## 16. Workspace, dependency and build artifacts

- workspaces: **8**;
- package-query entries: **452**;
- package dependency: only public `@arbitrage/market-data@0.1.0`;
- adapter imports: **0**;
- market-data deep imports: **0**;
- third-party additions/removals/changes: **0/0/0**;
- integrity/resolved URL changes: **0/0**;
- lock semantic additions: `packages/spread-analytics`, its local workspace
  link and the local market-data edge;
- other lock change: only the previously authorized
  `packages/design-tokens.engines` synchronization.

A fresh rebuild produced `dist` byte-for-byte equal to the authoritative
reviewed package output. Runtime exports remained 22 and no new runtime
dependency appeared. Verdict: **PASS**.

## 17. Fresh pinned verification

Authoritative verification used disposable materialization
`/tmp/holyparser-2b1-accept3.kEPw7d/repo`, exact Node `v24.18.1` and npm
`11.16.0`.

| Check                           | Exact result                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm ci`                        | PASS; 451 packages added, 460 audited; seven pre-existing advisories                               |
| `npm query '*'`                 | 452 entries                                                                                        |
| workspaces                      | 8                                                                                                  |
| format check                    | PASS                                                                                               |
| aggregate lint                  | PASS, all workspaces                                                                               |
| aggregate typecheck             | PASS, all workspaces                                                                               |
| second-remediation suite        | 1 file, 21 passed                                                                                  |
| complete spread-analytics suite | 14 files, 160 passed, 0 failed/skipped                                                             |
| numbered D-055 scenario file    | 1 file, 40 passed                                                                                  |
| aggregate default tests         | 50 files discovered; 47 passed, 3 live-canary files skipped; 424 passed tests, 3 skipped, 0 failed |
| independent adversarial harness | 10 cases: 8 passed, 2 intentionally failed, reproducing B-01 and H-03                              |
| production build                | PASS, all 8 workspaces                                                                             |
| web routes                      | 6 static routes: `/`, `/_not-found`, `/forgot-password`, `/login`, `/register`, `/verify-email`    |
| Markdown/local links            | PASS; 73 Markdown files, 87 links, 65 local links, 0 broken                                        |
| `git diff --check`              | PASS                                                                                               |
| `git fsck --full`               | PASS                                                                                               |

The disposable production build rewrote `apps/web/next-env.d.ts`, as in the
previous review. The authoritative checkout was not changed. This remains LOW
L-01 and is unrelated to Phase 2B.1 semantics.

## 18. Frozen-boundary evidence

Targeted authoritative-checkout diffs were empty for market-data, OKX, Binance,
Bybit, frozen Phase 2A documents, D-055, D-064, accepted Phase 2B formulas and
ADR-0009, D1 source/generated/tests/evidence, D2, Product/Commerce/Admin,
application/UI/routes/layout/navigation, infrastructure and brand assets.

Brand-reference SHA-256 values remain:

| File                           | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `holyparser-dark.png`          | `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08` |
| `holyparser-design-system.png` | `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54` |
| `holyparser-logo-system.png`   | `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c` |

Verdict: **PASS**.

## 19. Findings and limitations

| ID   | Severity | Finding                                                                                                                                                           | Status          |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| B-01 | BLOCKER  | supersession/invalidation transition fields are not bound to an independently approved append-only transition command; caller-forged supersession reaches MATCHED | unresolved      |
| H-03 | HIGH     | authoritative repeated scans/canonicalization remain outside the operation WorkBudget                                                                             | unresolved      |
| L-01 | LOW      | disposable clean web build rewrites generated `next-env.d.ts`                                                                                                     | open, unrelated |

MEDIUM findings: none.

Accepted limitations:

- no live exchange canary was run, as required;
- seven pre-existing npm advisories were observed but not remediated or
  attributed to Phase 2B.1;
- production authentication, persistence and live mapping administration remain
  outside Phase 2B.1;
- the independent adversarial harness existed only in the disposable review
  copy and was removed before authoritative suite/build verification.

## 20. Freeze and recommended next task

Phase 2B.1 does **not** meet the acceptance success criteria:

- final status: **FAIL**;
- BLOCKER: **1**;
- unresolved HIGH: **1**;
- B-01: **NOT RESOLVED**;
- B-02: **RESOLVED**;
- H-01: **RESOLVED**;
- H-02: **RESOLVED**;
- H-03: **NOT RESOLVED**;
- policy-level D-055 groups: **27/29 PASS**;
- authored runtime scenario cases: **40/40 PASS**;
- reason codes: **44/44 PASS**;
- D-064 aggregate: **FAIL**;
- Phase 2B.1 may freeze: **NO**;
- Phase 2B.2 eligible: **NO**.

Exact recommended next task:

> Authorize a third Phase 2B.1 acceptance-remediation task only. Preserve
> D-055, D-064, the 44-code catalogue, manifests, lockfile, dependencies,
> frozen Phase 2A/Phase 2B/D1/D2 boundaries and zero-real-pair outcomes. Fix
> B-01 by representing supersession, invalidation and correction as immutable
> append-only transition records whose exact status/reason/linkage/affected
> version/effective interval are bound to an independently reviewed command and
> digest; admission must reject a caller that changes an approved mapping's
> `status`, `reasonCode`, `supersededBy` or `invalidationReference` while
> retaining the original approval digest. Fix H-03 by propagating one cumulative
> operation WorkBudget through every authoritative atomic/composite/reason-text
> scan, evidence/admission/command/replay validator, candidate canonicalization,
> sorting, serialization and hashing path; prove no repeated loop is uncharged,
> the true maximum cancellation gap is at most 128, and distributed work cannot
> exceed 100,000 without deterministic atomic failure. Add regressions for the
> exact `APPROVED v1 -> caller-forged SUPERSEDED v1 -> valid v2 -> MATCHED`
> counterexample and for long accepted IDs producing additional charged work.
> Do not modify either prior acceptance report or this third report, do not
> create a commit and do not begin Phase 2B.2.
