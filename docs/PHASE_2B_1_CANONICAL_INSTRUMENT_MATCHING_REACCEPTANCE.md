# Phase 2B.1 — Canonical Instrument Matching Foundation re-acceptance

- Review date: 2026-09-21.
- Repository: `/Volumes/M2 ssd/HolyParser`.
- Baseline HEAD: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3` on `main` (`phase-2b-d055-instrument-matching-dirty`).
- Review type: new independent formal acceptance after remediation.
- Final status: **FAIL**.
- BLOCKER findings: **2**.
- Unresolved HIGH findings: **2**.
- Prior failed review: `docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE.md`.
- Prior failed report SHA-256: `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0`.

The prior failed report remained byte-for-byte unchanged. This review did not
modify implementation, manifests, lockfiles, frozen contracts, or accepted
policy. The only repository file created by this review is this report.

## 1. Normative gate and reviewed scope

The mandatory normative gate passed:

| Gate                   | Required                                                           | Independently observed                     | Verdict |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------ | ------- |
| D-055 snapshot SHA-256 | `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931` | exact match                                | PASS    |
| Policy version         | `instrument-matching-pilot/v1`                                     | exact match in decision and runtime policy | PASS    |
| D-064 resource scope   | `instrument-matching-resources/v1`                                 | exact match in approval and runtime policy | PASS    |

The review covered all 84 non-`node_modules` files under
`packages/spread-analytics`: 18 runtime TypeScript files, 13 source test files,
51 generated `dist` files, `package.json`, and `tsconfig.json`. It also read the
governing D-055/D-064 records, prior implementation and acceptance evidence,
accepted Phase 2B architecture and ADR-0009, the relevant domain/API/security/
risk/decision/acceptance documents, and the frozen Phase 2A evidence named by
the review request.

## 2. Repository and review baseline

Pre-review checks passed:

- `git diff --check`: PASS.
- `git fsck --full`: PASS.
- repeated HEAD/index/status/diff reads: PASS.
- exact expected tracked changes: `package.json`, `package-lock.json`.
- exact expected untracked implementation transaction:
  `packages/spread-analytics/**`, the implementation report, and the prior
  failed acceptance report.
- unrelated changes: none found.

The root manifest and lockfile matched the post-implementation,
pre-remediation state:

| File                | SHA-256                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `package.json`      | `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` |
| `package-lock.json` | `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59` |

## 3. Findings and remediation verdicts

### B-01 — NOT RESOLVED — BLOCKER

The shallow raw-record bypass is fixed: a caller cannot obtain `MATCHED` by
passing a `MappingVersion` whose `status` merely says `APPROVED`. Current
mapping/candidate/review/command policy, digest, reviewer separation,
completeness, interval, and revision checks are materially stronger.

The required immutable-history consistency boundary is still bypassable.
`admitMaterializedMapping` validates prior history entries only for object
presence, mapping ID, unique/sequential version number, current-record
presence, and overlapping `APPROVED` intervals. It does not fully validate each
prior version's closed schema, policy revision, registry/evidence revisions,
approvals, digest provenance, transition linkage, or `supersededBy` chain.

An independent temporary adversarial test constructed a valid current version
2 plus a forged version 1 with:

- `status = SUPERSEDED`;
- `policyRevision = forged-policy/v999`;
- forged registry and evidence revisions;
- no approvals;
- invalid `supersededBy = 999`.

The admission result was `VALID`, and `evaluateMatch` returned `MATCHED`. The
test ran against JavaScript runtime objects, not only TypeScript types. Thus a
raw caller can still obtain `MATCHED` through fabricated history provenance.
Every production path that constructs `MATCHED` calls admission, but the one
admission path remains insufficient.

Required next remediation: validate/materialize every history version and its
transition chain under the same provenance contract before current admission;
bind the resulting immutable history digest to the admitted state.

### B-02 — NOT RESOLVED — BLOCKER

Several parts are correctly remediated:

- registry inputs and returned records are defensively copied and deeply
  frozen;
- policy families are private immutable values;
- mapping/review/candidate outputs are copied and frozen;
- `MappingLedger` copies versions and encapsulates its command-digest map;
- command-digest snapshots cannot delete or replace internal entries.

The replay boundary still consumes caller-owned raw `MappingAdmissionInput[]`
and re-admits it on every call. There is no immutable admitted provenance/
history object that replay can consume. An independent runtime probe:

1. successfully admitted a mutable raw mapping history;
2. replayed it as `MATCHED`;
3. mutated the retained caller mapping to `INVALIDATED` and added an
   invalidation reference;
4. replayed the same caller-owned history again;
5. observed `UNAVAILABLE / MAPPING_UNAPPROVED`.

The previously returned admitted mapping remained frozen, but replay did not
use it. Therefore caller mutation after admission can still change historical
replay behavior, contrary to the remediation requirement.

Required next remediation: introduce an encapsulated, deeply immutable admitted
history/provenance aggregate; replay and current eligibility must consume that
aggregate rather than caller-owned raw admission inputs.

### H-01 — NOT RESOLVED — HIGH

The direct remediation cases pass: unknown multiplier does not write
`BASE_UNIT`, unverified convention does not write `LINEAR`, and such candidates
have no final exposure key.

The candidate generator has no pilot-scope gate before identity
materialization. `resolveExposureIdentity` unconditionally creates
`productClass: DERIVATIVE`, and when economics are otherwise complete it
unconditionally appends `contractType: PERPETUAL`, regardless of the frozen
metadata market/contract type. An independent SPOT-versus-perpetual probe
produced a diagnostic candidate with:

- provisional `productClass = DERIVATIVE`;
- a final `instrument-exposure-pilot/v1` key;
- `PERPETUAL` embedded in that key.

The evaluator later rejects SPOT or dated products, but the candidate model has
already asserted an unproven canonical identity. The same structural defect
applies to dated or unsupported product types with otherwise known economics.

Required next remediation: scope product/contract evidence before constructing
provisional or final identity. Unsupported, SPOT, dated, or unknown product
types may be diagnostic candidates only without asserted
`DERIVATIVE/PERPETUAL` identity.

### H-02 — RESOLVED

The source barrel uses explicit exports and the runtime root exposes exactly 22
names. `WorkBudget`, raw validators, time helpers, serializer/hash internals,
mutable policy collections, test builders, and private materializers are not
root exports. The package export map contains only `.`; an attempted
`@arbitrage/spread-analytics/bounds` import failed with
`ERR_PACKAGE_PATH_NOT_EXPORTED`. No wildcard export remains and no legitimate
consumer requires a deep import.

### H-03 — NOT RESOLVED — HIGH

`WorkBudget.step(count)` now chunks charged work correctly. Its observer
reported a maximum gap of 128 charged steps for counts 1, 127, 128, 129, 256,
1,000, and the maximum remaining budget.

That measurement is not operation-wide proof because repeated bounded work
still occurs outside the operation budget:

- `validateKnowledge` and nested metadata/context/sidecar closed-key loops do
  not receive the operation `WorkBudget`;
- canonical serialization recursively maps and sorts arrays/object keys
  without a budget or cancellation authority;
- batch publication charges one step per staged result, then serializes the
  full nested output without charged traversal;
- some registry `map`/`Set` and descriptive traversal work is uncharged;
- command/digest canonicalization and several nested approval comparisons are
  outside complete logical accounting.

Consequently, the maximum observer-reported gap is **128 accounted steps**, but
the maximum gap across all approved logical work is **not established and not
guaranteed**. The remediation suite measures only units already passed to
`WorkBudget`; it cannot reveal omitted work. This fails the D-064 requirement
that validation, candidate/evidence/history/conflict/replay/canonicalization
work share one operation-level authority with a check interval no greater than
128 logical steps.

## 4. Dedicated remediation-suite review

The retained remediation suite consists of one file and 36 tests:

| Finding          | Retained cases | Independent assessment                                                |
| ---------------- | -------------: | --------------------------------------------------------------------- |
| B-01             |             19 | useful current-record cases, but no forged prior-history chain case   |
| B-02             |              6 | useful freeze/copy cases, but no replay-after-caller-mutation case    |
| H-01             |              3 | covers unknown economics, not SPOT/dated/unsupported product defaults |
| H-02             |              1 | adequate and independently reproduced                                 |
| H-03             |              6 | proves charged-step chunking, not all logical work accounting         |
| Policy invariant |              1 | passes                                                                |

Independent temporary probes added only to the disposable review copy comprised
two files and five tests. All five passed their assertions: one reproduced the
raw shallow-record rejection, one reproduced forged-history admission to
`MATCHED`, one reproduced SPOT identity over-assertion, one retained a valid
synthetic `MATCHED` control, and one reproduced replay mutation. The temporary
files were removed before the authoritative quality run and were not added to
the repository.

## 5. Canonical serialization, economics, and lifecycle

### Canonical serialization — PASS

- exposure domain/version: `instrument-exposure-pilot/v1`;
- fixed field order and UTF-8 byte-length prefixes: PASS;
- known exposure key vector: PASS;
- SHA-256 `test/v1` vector:
  `786dc0d4cb92c23193e62d6f6ef1b0ad5c15d8c47eae0745c7b352fc2e1407ef`;
- no locale sort, randomness, or wall-clock component: PASS.

### Exact-decimal economics — PASS

All normalization uses the frozen public exact-decimal API. No `Number` or
epsilon equality path was introduced. Independent focused execution reproduced:

- `1 × 1 = 1`;
- `1000 × 0.001 = 1`;
- `0.01 × 100 = 1`;
- quote notional `0.001 × 12345.67 = 12.34567`;
- zero/negative factor and coefficient overflow fail closed.

### Lifecycle/freshness — PASS

ACTIVE-only actionability, metadata age `[0, 60s]`, negative-age rejection,
60-second inclusion, `60s + 1ms` staleness, 30-day maximum validity, and
half-open effective intervals remain enforced. No `Date.now()` or other ambient
clock participates in matching semantics.

## 6. Governance, history, replay, conflict, and cardinality

| Area                                           | Verdict                      | Evidence                                                   |
| ---------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Command idempotency and digest conflict        | PASS                         | retained governance tests and encapsulated digest map      |
| Reviewer separation on the current command     | PASS                         | Product/Quant/Market Data separation enforced              |
| Full materialized history provenance           | FAIL                         | B-01 forged prior-history bypass                           |
| Runtime history immutability                   | FAIL                         | B-02 raw replay-input mutation                             |
| AS_KNOWN/CORRECTED on valid immutable fixtures | PASS                         | deterministic valid-fixture tests                          |
| Replay trust boundary overall                  | FAIL                         | raw mutable history is re-read and incompletely validated  |
| Conflict/quarantine on covered conflicts       | PASS                         | no best-match winner observed                              |
| One active exposure per venue instrument       | PASS on covered valid inputs | interval/duplicate conflict tests pass; does not cure B-01 |

## 7. D-055 scenario table

The authored D-055 scenario file ran 40 runtime cases successfully. Formal
scenario acceptance is **24/29 PASS** because five groups have independently
demonstrated architectural counterexamples not exercised by those green tests.

|   # | Normative scenario and expected result                                        | Runtime evidence                 | Independent verdict                                                               |
| --: | ----------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
|   1 | compatible A/USDT linear perpetual → `MATCHED / COMPATIBLE_APPROVED`          | explicit                         | PASS                                                                              |
|   2 | same ticker, different asset → `NOT_MATCHED / BASE_ASSET_MISMATCH`            | explicit                         | PASS                                                                              |
|   3 | USDT versus USDC → `NOT_MATCHED / SETTLEMENT_ASSET_MISMATCH`                  | explicit                         | PASS                                                                              |
|   4 | linear versus inverse → `NOT_MATCHED / VALUE_CONVENTION_MISMATCH`             | explicit                         | PASS                                                                              |
|   5 | perpetual/dated and dated/dated → `NOT_MATCHED / DATED_PRODUCT_EXCLUDED`      | 2 evaluator cases pass           | **FAIL:** candidate generation can materialize `PERPETUAL` before scope rejection |
|   6 | exact factors 1, 0.001, 100 → `MATCHED / COMPATIBLE_APPROVED`                 | 3 cases                          | PASS                                                                              |
|   7 | missing multiplier → `UNAVAILABLE / MULTIPLIER_UNKNOWN`                       | explicit                         | PASS                                                                              |
|   8 | unknown lifecycle → `UNAVAILABLE / LIFECYCLE_UNKNOWN`                         | explicit                         | PASS                                                                              |
|   9 | reviewed direct alias → `MATCHED / COMPATIBLE_APPROVED`                       | explicit                         | PASS                                                                              |
|  10 | conflicting manual identity → `QUARANTINED / ASSET_BINDING_CONFLICT`          | explicit                         | PASS                                                                              |
|  11 | superseded current; historical AS_KNOWN old version                           | explicit                         | PASS on valid history                                                             |
|  12 | reviewed rebrand preserves historical identity/revision                       | explicit                         | PASS                                                                              |
|  13 | duplicate ticker without bindings → `AMBIGUOUS / ASSET_IDENTITY_UNKNOWN`      | explicit                         | PASS                                                                              |
|  14 | unsupported family → `NOT_MATCHED / PRODUCT_UNSUPPORTED`                      | evaluator case passes            | **FAIL:** candidate generation can materialize canonical exposure first           |
|  15 | age 60s accepted; 60s+1ms → `EVIDENCE_STALE`                                  | 2 assertions                     | PASS                                                                              |
|  16 | multiplier 0/-1 → `UNAVAILABLE / MULTIPLIER_INVALID`                          | 2 cases                          | PASS                                                                              |
|  17 | incompatible unit → `NOT_MATCHED / CONTRACT_UNIT_MISMATCH`                    | explicit                         | PASS                                                                              |
|  18 | unapproved candidate → `UNAVAILABLE / MAPPING_UNAPPROVED`                     | explicit                         | PASS                                                                              |
|  19 | quarantine/invalidation → typed non-actionable results                        | 2 cases                          | PASS                                                                              |
|  20 | unknown convention/capability → typed `UNAVAILABLE`                           | 2 assertions                     | PASS                                                                              |
|  21 | alias chain/cycle → `ALIAS_CHAIN_FORBIDDEN`                                   | explicit                         | PASS                                                                              |
|  22 | metadata/economics contradiction → `QUARANTINED / METADATA_EVIDENCE_CONFLICT` | explicit                         | PASS                                                                              |
|  23 | interval overlap → `MAPPING_INTERVAL_CONFLICT`                                | explicit                         | PASS                                                                              |
|  24 | inactive lifecycle states → `UNAVAILABLE / LIFECYCLE_NOT_ACTIVE`              | 5 cases                          | PASS                                                                              |
|  25 | exclusive expiry and >30-day validity rejection                               | 2 assertions                     | PASS                                                                              |
|  26 | digest/reviewer/revision failures                                             | 6 governance cases pass          | **FAIL:** forged prior history escapes equivalent revision/provenance validation  |
|  27 | OKX special product → `NOT_MATCHED / SPECIAL_PRODUCT_EXCLUDED`                | explicit                         | PASS                                                                              |
|  28 | AS_KNOWN versus CORRECTED replay                                              | valid fixture passes             | **FAIL:** caller mutation/forged history changes replay authority                 |
|  29 | resource-bound/permutation behavior                                           | authored permutation/bounds pass | **FAIL:** operation-wide cancellation accounting is incomplete                    |

## 8. Reason-code catalogue

The catalogue contains exactly 44 unique, fixed string values in deterministic
UTF-8 order. No remediation-added semantic code, free-form generation, or
caller/exchange text was found. Verdict: **44/44 PASS**.

## 9. D-064 resource-bound table

| Bound                                   |                 Approved value | Boundary/one-over verdict                                                               |
| --------------------------------------- | -----------------------------: | --------------------------------------------------------------------------------------- |
| instruments                             |                          1,024 | PASS                                                                                    |
| partners per instrument                 |                             32 | PASS                                                                                    |
| candidate pairs                         |                          8,192 | PASS                                                                                    |
| bindings                                |                          4,096 | PASS                                                                                    |
| alias depth                             |                              1 | PASS                                                                                    |
| mapping versions per mapping            |                             64 | PASS                                                                                    |
| mapping/event records                   |                          4,096 | PASS                                                                                    |
| evidence references per entity/version  |                             32 | PASS                                                                                    |
| total evidence references               |                         32,768 | PASS                                                                                    |
| evidence record                         |                          8 KiB | PASS                                                                                    |
| conflicts                               |                            128 | PASS                                                                                    |
| diagnostics including truncation marker |                            200 | PASS                                                                                    |
| atomic ID                               |         160 UTF-16 / 640 UTF-8 | PASS                                                                                    |
| composite ID                            |              4,096 UTF-8 bytes | PASS                                                                                    |
| reason/description                      |                512 UTF-8 bytes | PASS                                                                                    |
| input/output                            |                         16 MiB | PASS                                                                                    |
| JSON depth                              |                             16 | PASS                                                                                    |
| JSON nodes                              |                        100,000 | PASS                                                                                    |
| object keys                             |                             64 | PASS                                                                                    |
| generic arrays                          |                         32,768 | PASS                                                                                    |
| decimal wire                            |                 256 characters | PASS                                                                                    |
| coefficient digits                      |                             78 | PASS                                                                                    |
| wire/domain scale                       |                        36 / 78 | PASS                                                                                    |
| logical work                            |          100,000 charged steps | PASS for charged counter                                                                |
| cancellation interval                   | no more than 128 logical steps | **FAIL:** 128 measured only among charged steps; complete operation gap not established |

No silent top-N or partial candidate publication was observed in the covered
numeric-bound cases. The D-064 aggregate verdict is **FAIL** because the
cancellation invariant is normative, not optional.

## 10. Cancellation, atomicity, hostile input, and determinism

### Cancellation

- before-work check: PASS;
- `step(count)` internal chunking: PASS;
- observer maximum among accounted work: **128**;
- operation-wide logical maximum: **not established**;
- immediate pre-publication check: PASS;
- overall verdict: **FAIL (H-03)**.

### Atomicity

The covered preflight, candidate-generation, admission, replay, conflict, and
pre-publication failure paths publish no partial result and mutate no prior
ledger. Verdict: **PASS for covered paths**. This does not repair omitted
cancellation accounting.

### Hostile input

Malformed JSON/UTF-8, financial JSON numbers, control characters, invalid
Unicode, ID/composite/reason overflows, JSON depth/node/key/array overflows,
decimal bounds, alias chains, evidence/history/candidate/conflict/diagnostic
floods all fail closed in the focused suite. Verdict: **PASS**.

### Property and permutation determinism

Valid-input instrument, registry binding, alias, leg, candidate, mapping
history, conflict, and replay permutations were deterministic. Canonical bytes
and digests were stable. Verdict: **PASS on valid admitted inputs**; B-01/B-02
prevent an overall replay-integrity pass.

## 11. Current real-venue fail-closed behavior

The required synthetic representation of frozen venue evidence remains:

| Venue pair      | Outcome       | Reasons                                             | Verdict |
| --------------- | ------------- | --------------------------------------------------- | ------- |
| OKX ↔ Binance   | `UNAVAILABLE` | `MULTIPLIER_UNKNOWN`, `VALUE_CONVENTION_UNVERIFIED` | PASS    |
| OKX ↔ Bybit     | `UNAVAILABLE` | `MULTIPLIER_UNKNOWN`                                | PASS    |
| Binance ↔ Bybit | `UNAVAILABLE` | `MULTIPLIER_UNKNOWN`, `VALUE_CONVENTION_UNVERIFIED` | PASS    |

No multiplier, `BASE_UNIT`, or value convention is fabricated for these real
evidence gaps. Synthetic compatible fixtures remain distinct from live approved
mappings. Zero approved real pairs remains intentional fail-closed behavior.

## 12. Public API, package, dependency, and build artifacts

### Public API

Runtime exports: **22**, exactly:

`CuratedAssetRegistry`, `EXPOSURE_KEY_VERSION`, `MATCHING_LIMITS`,
`MATCHING_POLICY_VERSION`, `MATCHING_RESOURCE_SCOPE`, `MATCH_REASON_CODES`,
`MappingLedger`, `MatchingFailure`, `admitMappingCommand`,
`admitMaterializedMapping`, `admitRegistryRevision`, `approveCommand`,
`candidateProvenanceDigest`, `canonicalExposureKey`, `evaluateBatch`,
`evaluateMatch`, `generateCandidates`, `invalidateCommand`,
`normalizeBaseExposure`, `normalizeQuoteNotional`, `replayMapping`, and
`validateEvidenceBundle`.

Verdict: **PASS (H-02 resolved)**.

### Workspace/dependency integrity

- workspaces: 8; root plus workspaces package query: 9;
- package install: 450 packages added, 459 audited;
- spread-analytics dependency: only public `@arbitrage/market-data@0.1.0`;
- adapter imports: 0;
- market-data deep imports: 0;
- new/removed/changed third-party versions: 0/0/0;
- changed integrity/resolved URLs: 0/0;
- lock delta: one workspace record, one local link, one local dependency edge,
  and the previously authorized `packages/design-tokens.engines` sync only.

Verdict: **PASS**.

### Built artifacts

A clean build regenerated 51 `dist` files byte-for-byte equal to the reviewed
repository artifacts. The built root exposed the same 22-name allowlist;
internal subpaths remained blocked and no runtime dependency was added.
Verdict: **PASS**.

## 13. Network, secret, and ambient-authority scan

No Phase 2B.1 semantic use of `fetch`, WebSocket/HTTP clients, filesystem,
environment variables, credentials, `Date.now`, `Math.random`, `randomUUID`,
locale-dependent sort, uptime, or performance timing was found. Explicit input
timestamps remain the only time authority. Verdict: **PASS**.

## 14. Fresh pinned quality verification

The clean materialized review copy used exactly Node `v24.18.1` and npm
`11.16.0`.

| Command/check                                       | Exact result                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm ci`                                            | PASS; 450 added, 459 audited; pre-existing 7 advisories (2 moderate, 4 high, 1 critical)        |
| `npm run format:check`                              | PASS                                                                                            |
| `npm run lint`                                      | PASS for all 8 workspaces                                                                       |
| `npm run typecheck`                                 | PASS for all 8 workspaces                                                                       |
| focused remediation suite                           | PASS; 1 file, 36 tests                                                                          |
| focused spread-analytics suite                      | PASS; 13 source test files, 139 tests, 0 failed/skipped                                         |
| full `npm test`                                     | PASS; 45 passed files, 3 skipped live-canary files; 399 passed tests, 3 skipped, 0 failed       |
| `npm run build`                                     | PASS; all 8 workspaces                                                                          |
| Next production routes                              | 6 static routes: `/`, `/_not-found`, `/forgot-password`, `/login`, `/register`, `/verify-email` |
| Markdown/local-link validator including this report | PASS; 72 Markdown files, 87 links, 65 local links, 1 anchor, 0 broken                           |
| `git diff --check`                                  | PASS                                                                                            |
| `git fsck --full`                                   | PASS                                                                                            |

The build in the disposable copy mechanically updated tracked
`apps/web/next-env.d.ts` to the current Next-generated form. The authoritative
repository file was not modified. This is recorded as LOW L-01 because a clean
production build is not byte-clean with respect to that generated application
file; it is pre-existing web-tooling behavior, not a Phase 2B.1 source or
dependency change.

## 15. Frozen-boundary evidence

Targeted diffs were empty for:

- `packages/market-data`;
- OKX, Binance USDⓈ-M, and Bybit Linear adapters;
- frozen Phase 2A documents;
- D-055 and D-064;
- accepted Phase 2B formulas and ADR-0009;
- D1 source/generated/tests/evidence and accepted bridge;
- D2 documents/artifacts;
- Product/Commerce/Admin architecture;
- application source/routes/layout/navigation in the authoritative checkout;
- infrastructure and brand assets.

Brand-reference SHA-256 values remained:

| File                           | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `holyparser-dark.png`          | `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08` |
| `holyparser-logo-system.png`   | `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c` |
| `holyparser-design-system.png` | `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54` |

The only D1-associated repository delta remains the explicitly authorized
lockfile `engines.node` synchronization. Verdict: **PASS**.

## 16. Findings summary

| ID   | Severity   | Finding                                                                            | Status                                  |
| ---- | ---------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| B-01 | BLOCKER    | forged prior history can be admitted and reach `MATCHED`                           | unresolved                              |
| B-02 | BLOCKER    | replay re-reads mutable caller-owned raw history after admission                   | unresolved                              |
| H-01 | HIGH       | candidate generation asserts `DERIVATIVE/PERPETUAL` before product scope is proven | unresolved                              |
| H-02 | prior HIGH | public API wildcard/internal leakage                                               | resolved                                |
| H-03 | HIGH       | cancellation budget omits bounded nested validation/canonicalization work          | unresolved                              |
| L-01 | LOW        | clean web build updates generated `apps/web/next-env.d.ts` in disposable copy      | open, unrelated to Phase 2B.1 semantics |

MEDIUM findings: none.

Accepted limitations:

- public exchange live canaries were not run, as explicitly excluded from this
  acceptance review;
- the seven existing npm advisories were observed but not remediated or
  attributed to Phase 2B.1;
- no production authentication, persistence, or live mapping administration is
  in Phase 2B.1 scope.

## 17. Freeze and next-phase recommendation

- Phase 2B.1 may freeze: **NO**.
- Phase 2B.2 is eligible for separate authorization: **NO**.
- A second, narrowly scoped Phase 2B.1 acceptance-remediation task is required.
- D-055 and D-064 themselves are not rejected or changed by these findings.

Exact recommended next task:

> Perform a second Phase 2B.1 acceptance-remediation task only in
> `packages/spread-analytics/**` and the Phase 2B.1 implementation evidence.
> Preserve D-055, D-064, the 44-code catalogue, dependencies, manifests,
> lockfile, frozen Phase 2A/Phase 2B/D1/D2 boundaries, and all zero-real-pair
> outcomes. Fix B-01 by validating and immutably materializing every mapping
> history version and transition before `MATCHED`; fix B-02 by making replay
> consume an immutable admitted provenance/history aggregate rather than raw
> caller-owned inputs; fix H-01 by gating product/contract scope before any
> `DERIVATIVE/PERPETUAL/LINEAR/BASE_UNIT` identity is asserted; and fix H-03 by
> propagating one operation-level work/cancellation authority through all
> nested validation, registry, evidence, history, conflict, replay, sorting,
> hashing, and canonical-serialization loops. Add focused regression tests for
> the exact adversarial cases documented in
> `docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_REACCEPTANCE.md`, rerun the
> pinned Node 24.18.1/npm 11.16.0 full suite, do not create a commit, and do not
> begin Phase 2B.2.
