# Phase 2B.1 — Canonical Instrument Matching Foundation implementation evidence

Status: IMPLEMENTED — PRE-ACCEPTANCE EVIDENCE  
Date: 2026-09-15  
Implementation baseline: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3` (`main`, tag `phase-2b-d055-instrument-matching`)  
Decision snapshot SHA-256: `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`  
Policy: `instrument-matching-pilot/v1`  
Resource scope: `instrument-matching-resources/v1`

This report is implementation-produced evidence. It is not formal acceptance and
does not authorize Phase 2B.2.

## 1. Scope and files

The implementation adds the isolated private workspace
`@arbitrage/spread-analytics`. Its single public export is the package root. It
depends only on the public `@arbitrage/market-data` package; no deep import or
adapter import exists.

Created package/configuration files:

- `packages/spread-analytics/package.json`;
- `packages/spread-analytics/tsconfig.json`.

Created implementation modules:

- `bounds.ts`, `candidates.ts`, `commands.ts`, `diagnostics.ts`, `economics.ts`,
  `evidence.ts`;
- `evaluator.ts`, `model.ts`, `policy.ts`, `reasons.ts`, `registry.ts`;
- `replay.ts`, `serialization.ts`, `validation.ts`, and the public `index.ts`.

Created test/support modules:

- `test-fixtures.ts`;
- `bounds.test.ts`, `candidate-bounds.test.ts`, `d055-scenarios.test.ts`;
- `determinism.test.ts`, `economics.test.ts`, `evidence.test.ts`,
  `governance.test.ts`;
- `package-boundary.test.ts`, `reasons.test.ts`, `registry.test.ts`,
  `serialization.test.ts`, and `validation.test.ts`.

Modified existing files:

- root `package.json`, solely to insert the new workspace into the existing
  `build`, `lint`, `typecheck`, and `test` aggregates;
- `package-lock.json`, solely for the local workspace/link/dependency records and
  the separately authorized D1 `engines` metadata synchronization.

No adapter, frozen market-data source/contract, accepted formula, UI,
infrastructure, D1/D2, brand asset, or application source is modified.

## 2. Architecture and public contracts

The package is a synchronous, pure matching core. Inputs supply observations,
curated registry revision, economics evidence, evaluation time, knowledge cutoff,
mapping history, and cancellation signal. There is no network, persistence,
ambient clock, random ID, credential, environment, retry, or production mapping
path.

The public Phase 2B.1 surface contains only:

- opaque venue evidence and versioned curated asset bindings/direct aliases;
- canonical exposure identity and canonical serialization;
- candidate generation and current match evaluation;
- exact economics normalization;
- immutable mapping commands/ledger and review records;
- AS_KNOWN/CORRECTED replay;
- conflict/current-eligibility/evidence models;
- closed reason codes, bounded diagnostics, resource validation and cancellation.

There are no placeholder exports for spread mathematics, VWAP, fees, slippage,
funding, opportunities, history, anomalies, or ranking.

## 3. Canonical identity and serialization

Venue `instrumentId`, official ID and venue remain opaque evidence. The canonical
analytical exposure key contains exactly:

1. `DERIVATIVE` product class;
2. canonical base asset ID;
3. canonical quote asset ID;
4. canonical settlement asset ID;
5. `PERPETUAL`;
6. `LINEAR`;
7. `BASE_UNIT`.

Display symbol/ticker, lifecycle and mutable description are excluded. Key fields
use UTF-8 byte-length-prefix encoding under `instrument-exposure-pilot/v1`.
Canonical JSON uses UTF-8 key ordering, no whitespace except one terminal LF, and
forbids numbers in its financial canonical-value type. IDs use domain-separated
SHA-256.

Deterministic vectors:

- exposure key for synthetic A/USDT:
  `instrument-exposure-pilot/v1|10:DERIVATIVE7:asset:A10:asset:USDT10:asset:USDT9:PERPETUAL6:LINEAR9:BASE_UNIT`;
- `deterministicId("test/v1", {a:"b"})`:
  `786dc0d4cb92c23193e62d6f6ef1b0ad5c15d8c47eae0745c7b352fc2e1407ef`.

Permutation tests cover input order, registry order, evidence-revision leg order,
candidate order, venue-leg reversal, mapping-history order, replay and serialized
IDs/results.

## 4. Asset registry and candidate model

Registry revisions and bindings are immutable inputs. Identity resolution is
effective-time and recorded-knowledge-time aware. Aliases are reviewed direct
bindings only; depth greater than one, cycles, conflicting bindings and missing
bindings fail closed. `USDT` and `USDC` remain distinct canonical IDs. Ticker text
is never read for cross-venue resolution.

Candidates are deterministic, stable ordered, cross-venue, same-exposure
diagnostic records. Unknown identity does not produce a guessed candidate.
Candidate generation never approves a mapping. A direct reviewed alias produces
`REVIEWED_MANUAL` confidence; ordinary proven bindings produce `EXACT_METADATA`.
Candidate records retain the canonical leg order, both metadata revisions and
digests, both economics revisions, machine proposer, explicit creation/effective/
evaluation/knowledge times, registry/policy revisions, completeness and finite
reasons. Candidate digests bind instrument IDs, metadata digests/revisions,
economics revisions, registry revision, policy and exposure key.

Evidence records retain a closed evidence class, product scope, source revision
and digest, retrieval date, only actually supplied source/receive/processing
timestamps, recorded/effective times, optional paired reviewer/review time,
documented unit, quality and exact policy revision. URLs and attached external
payloads are not evidence references.

Preflight grouping prevents unrelated instruments from causing quadratic pair
materialization. Tests prove 8,192 pairs succeed, pair 8,193 fails, partner 33
fails, duplicates fail, and cancellation publishes nothing.

## 5. Economics, lifecycle and current eligibility

The exact-decimal functions use the frozen public `ExactDecimal` implementation:

```text
baseExposure = nativeQuantity × baseUnitsPerNativeQuantity
priceUnit = quoteAssetUnits / baseAssetUnit
quoteNotional = baseExposure × price
```

No `number`, epsilon, or default multiplier participates in financial equality.
Known factor must be positive and must agree with frozen normalized metadata.
Known native quantity units and equal canonical base units are required. Missing
factor, convention or collateral proof returns typed non-actionability;
contradiction quarantines. Different native factors remain valid only when their
per-leg exact base exposure and payoff semantics are proven.

Only `ACTIVE` plus `HEALTHY` evidence is actionable. Metadata age is inclusive
`[0,60s]`; negative time and `60s+1ms` fail. Mapping and registry intervals are
half-open and at most 30 days. Evaluation time and knowledge cutoff are explicit;
the core never calls `Date.now()`.

## 6. Governance, immutable history and replay

Mapping approval requires distinct proposer, Quant reviewer and Market Data
reviewer. Approvals bind the canonical command digest. Command ID/digest replay is
idempotent; changed digest, stale expected revision and role overlap reject without
mutation. Invalidation is itself digest-validated.

Mapping versions are append-only records with mapping/version ID, recorded
knowledge, half-open effective interval, registry/evidence/policy revisions,
reason, prior version and supersession/invalidation reference. An approved mapping
may become currently unavailable without rewriting its historical approval.

AS_KNOWN applies only records known by the supplied cutoff. CORRECTED applies a
later explicit invalidation/correction to the affected interval. Both include
mapping, registry, evidence, policy and replay revisions and are invariant to
history input order. Neither mode performs I/O.

Overlap, multiple active exposure identity, curated/native contradiction and
manual conflicts fail closed. There is no score, winner selection, sampling, top-N
or partial publication.

## 7. Closed reason-code catalogue

The exact 44-code catalogue is:

`ALIAS_CHAIN_FORBIDDEN`, `ASSET_BINDING_CONFLICT`, `ASSET_IDENTITY_UNKNOWN`,
`BASE_ASSET_MISMATCH`, `CAPABILITY_UNAVAILABLE`,
`COLLATERAL_ECONOMICS_UNVERIFIED`, `COMMAND_DIGEST_CONFLICT`,
`COMPATIBLE_APPROVED`, `CONTRACT_UNIT_MISMATCH`, `DATED_PRODUCT_EXCLUDED`,
`DECIMAL_BOUND_EXCEEDED`, `DIAGNOSTICS_TRUNCATED`,
`DUPLICATE_EXPOSURE_CONFLICT`, `EVALUATION_CANCELLED`, `EVIDENCE_STALE`,
`EVIDENCE_TIME_INVALID`, `INPUT_INVALID`, `LIFECYCLE_NOT_ACTIVE`,
`LIFECYCLE_UNKNOWN`, `MAPPING_EXPIRED`, `MAPPING_INTERVAL_CONFLICT`,
`MAPPING_INVALIDATED`, `MAPPING_QUARANTINED`, `MAPPING_REVISION_CONFLICT`,
`MAPPING_SUPERSEDED`, `MAPPING_UNAPPROVED`, `MATCHING_BOUND_EXCEEDED`,
`METADATA_EVIDENCE_CONFLICT`, `MULTIPLIER_INVALID`, `MULTIPLIER_UNKNOWN`,
`NATIVE_ASSET_REFERENCE_UNAVAILABLE`, `PAYOFF_MISMATCH`,
`PRODUCT_ENUM_UNVERIFIED`, `PRODUCT_UNSUPPORTED`, `QUOTE_ASSET_MISMATCH`,
`QUOTE_SETTLEMENT_MISMATCH`, `REVIEWER_SEPARATION_REQUIRED`,
`SAME_VENUE_EXCLUDED`, `SETTLEMENT_ASSET_MISMATCH`,
`SPECIAL_PRODUCT_EXCLUDED`, `SPOT_DERIVATIVE_MISMATCH`, `TRANSITION_REJECTED`,
`VALUE_CONVENTION_MISMATCH`, `VALUE_CONVENTION_UNVERIFIED`.

Diagnostics contain only finite code plus finite subject enum. They never copy
symbols, URLs, native errors, evidence text or financial strings. The 200th record
is reserved for `DIAGNOSTICS_TRUNCATED`.

## 8. Fixtures and tests

All 29 accepted D-055 scenarios are runtime tests. Multi-outcome scenarios are
split into explicit cases. Coverage includes:

1. compatible A/USDT linear perpetual;
2. same ticker/different asset;
3. USDT/USDC mismatch;
4. linear/inverse mismatch;
5. perpetual/dated and dated/dated exclusions;
6. exact factors 1, 0.001 and 100;
7. missing multiplier;
8. unknown lifecycle;
9. reviewed direct alias and confidence;
10. conflicting binding quarantine;
11. superseded current versus historical mapping;
12. reviewed rebrand identity continuity;
13. duplicate ticker without binding;
14. unsupported family;
15. 60-second boundary and one millisecond over;
16. zero and negative factor;
17. incompatible canonical quantity unit;
18. unapproved candidate;
19. quarantined and invalidated mappings;
20. unknown convention and unavailable capability;
21. alias chain/cycle;
22. metadata/economics conflict;
23. overlapping mapping interval;
24. every frozen inactive lifecycle;
25. effectiveTo and 30-day validity boundaries;
26. digest, reviewer and revision failures;
27. OKX special product exclusion;
28. AS_KNOWN versus CORRECTED;
29. bound and permutation behavior.

Additional tests cover closed runtime object schemas for venue observations,
sidecar economics, registry revisions, evidence records and governance commands;
malformed UTF-8/JSON; unknown fields/enums/reason codes; controls/surrogates;
executable reason text; exact-decimal overflow; byte/count/depth/node/key/array
limits; diagnostics; cancellation; atomic rejection; package exports; and the
44-code closure.

Focused result: 12 test files, 103 passed, 0 failed, 0 skipped.

## 9. D-064 bounds and atomicity

The implementation constants reproduce `instrument-matching-resources/v1`:

| Resource                                          |                                   Maximum |
| ------------------------------------------------- | ----------------------------------------: |
| instruments                                       |                                     1,024 |
| partners per instrument                           |                                        32 |
| candidate pairs                                   |                                     8,192 |
| bindings / direct aliases                         |                                     4,096 |
| mapping versions per mapping                      |                                        64 |
| mapping/event records                             |                                     4,096 |
| evidence references per subject / total           |                               32 / 32,768 |
| evidence record                                   |                                     8 KiB |
| conflicts                                         |                                       128 |
| diagnostics including truncation marker           |                                       200 |
| atomic ID                                         | 160 UTF-16 code units and 640 UTF-8 bytes |
| composite ID                                      |                         4,096 UTF-8 bytes |
| reason/description                                |                           512 UTF-8 bytes |
| serialized input / output                         |                           16 MiB / 16 MiB |
| JSON depth / nodes / keys per object              |                         16 / 100,000 / 64 |
| generic array                                     |                                    32,768 |
| decimal wire / digits / wire scale / domain scale |                        256 / 78 / 36 / 78 |
| logical work / cancellation interval              |               100,000 / at most 128 steps |

Named narrower limits win. Validation happens before publication. Fatal schema,
resource, cancellation or conflict-overflow failure throws a finite typed code and
returns no partial result. Mapping command failure returns no replacement ledger,
so the previous immutable ledger remains the only accepted state.

## 10. Current real-venue fail-closed evidence

Synthetic representations of the frozen evidence reproduce the required current
outcomes; they are not live mappings:

| Pair                          | Outcome     | Structured reasons                                                          |
| ----------------------------- | ----------- | --------------------------------------------------------------------------- |
| OKX ↔ Binance USDⓈ-M          | UNAVAILABLE | `MULTIPLIER_UNKNOWN`, `VALUE_CONVENTION_UNVERIFIED`                         |
| OKX ↔ Bybit Linear            | UNAVAILABLE | `MULTIPLIER_UNKNOWN`                                                        |
| Binance USDⓈ-M ↔ Bybit Linear | UNAVAILABLE | `MULTIPLIER_UNKNOWN` on both legs; `VALUE_CONVENTION_UNVERIFIED` on Binance |

Candidate identity evidence may be represented separately, but no actionable real
mapping is shipped. Unknown economics is never upgraded to multiplier one,
BASE_UNIT, equal settlement, or canonical identity.

## 11. Workspace and dependency integration

The workspace is required because ADR-0009 places analytics above frozen adapters
and allows consumption only of the public market-data boundary. Adding the new
package avoids placing Phase 2B policy inside an adapter, UI or frozen foundation.

Manifest contract: private ESM `0.1.0`, one root export, TypeScript build/lint/
typecheck, Vitest tests, and the sole dependency
`@arbitrage/market-data: 0.1.0`. Existing root tooling is reused; no third-party
dependency is declared.

Root `package.json` changes only insert
`npm run <gate> --workspace=@arbitrage/spread-analytics` after market-data in the
four aggregate quality scripts. Workspace glob semantics, engines and dependencies
are unchanged.

The npm 11.16.0 lockfile semantic delta is exactly:

1. local link `node_modules/@arbitrage/spread-analytics`;
2. local workspace record `packages/spread-analytics`;
3. its local `@arbitrage/market-data: 0.1.0` edge;
4. the explicitly authorized lock-only `packages/design-tokens.engines.node`
   synchronization to `>=24.18.0 <25`.

Workspaces: 7 before, 8 after. New/removed third-party packages, changed
third-party versions, integrity hashes, resolved URLs and audit delta attributable
to Phase 2B.1 are all zero. `npm ci` installed 451 packages and audited 460. The
reported 7 pre-existing advisories (2 moderate, 4 high, 1 critical) are unchanged
debt and were not remediated.

The frozen D1 manifest SHA-256 before and after is
`0d9ade7e225977e6293b7dfd6e3e90afb51b8a1555e35b67c6495b1b24fa3e7e`.
The synchronized lock value equals that unchanged manifest value exactly.

## 12. Verification evidence

Authoritative environment:

- Node `v24.18.1`;
- npm `11.16.0`;
- 8 workspaces;
- 452 packages reported by `npm query '*'`;
- `npm ci`: PASS, 451 installed / 460 audited;
- formatting: PASS;
- lint: PASS for all workspaces;
- typecheck: PASS for all workspaces;
- default tests: PASS, 47 files discovered, 44 passed and 3 live-canary files
  skipped; 363 tests passed, 3 skipped, 0 failed;
- production build: PASS, all workspace builds plus six static web routes.
- clean authoritative materialization:
  `/tmp/holyparser-2b1-authoritative.XWMBkP/repo`;
- Markdown/local-link validation: PASS, 69 Markdown files, 87 links, 65 local
  links, 0 broken;
- repeated `git diff --check` and `git fsck --full`: PASS.

The three adapter skips are the existing live-canary exclusions; no exchange
canary was run for Phase 2B.1.

Independent hashes before the final scope verification:

- new package manifest:
  `5702d3c561b151dd27a0700ed9987b8991b187267c4b252bcf0a99b4684549ab`;
- serialization source:
  `69a0795bfc500df328a63140f7e9e1ea47acb9f1a58d2b076a7164330bf77199`;
- generated build entry:
  `f767a2aa57681147c015eb1ea31a7c01d894d583970e0e58067c766d84328c45`;
- current lockfile:
  `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59`;
- pre-2B.1 lockfile:
  `490609469b0fb2bb5075a1c902cbb6eef262cf39e1cfb3be5aef37aac55c6de5`.

The Next build mechanically rewrote `apps/web/next-env.d.ts`; the exact frozen
HEAD content was restored immediately. It has no final diff.

## 13. Rollback boundary and rehearsal

Rollback is atomic across:

1. removal of `packages/spread-analytics`;
2. restoration of root `package.json` to HEAD;
3. restoration of `package-lock.json` to SHA-256
   `490609469b0fb2bb5075a1c902cbb6eef262cf39e1cfb3be5aef37aac55c6de5`,
   including removal of the transaction-local D1 lock metadata synchronization;
4. removal of this implementation report.

No frozen D1 file is changed during rollback. A clean temporary materialization
rehearses application of the workspace integration and the complete reverse
operation; success requires empty `git status`, baseline manifest/lock hashes and
absence of the new workspace/report. The final rehearsal result is recorded in the
closing verification section after this document is included.

Rehearsal result: PASS in
`/tmp/holyparser-2b1-rollback-authoritative.wZIuZq/repo`. The
post-rollback working tree was empty; root manifest SHA-256 returned to
`a2854915f47c075ec3ea8dc5e4d2a0ca997f12bf65b7ab6eac232b06d80fb17c`
and lockfile SHA-256 returned to
`490609469b0fb2bb5075a1c902cbb6eef262cf39e1cfb3be5aef37aac55c6de5`.
The workspace and report were absent from the rehearsed repository; no frozen
package was edited.

## 14. Security and limitations

Static scans find no fetch/network API, ambient time, randomness, environment
read, credential path, adapter dependency or deep market-data import. Runtime
validation closes the public evidence structures and rejects unknown fields,
unknown enums, malformed structured inputs, controls, invalid Unicode and bounded
text/IDs. Generated diagnostics contain finite codes only.

Accepted implementation limits:

- the ledger is an in-memory pure model; persistence/authentication/admin runtime
  is deliberately absent;
- frozen Binance and Bybit economics evidence is incomplete, so current real pair
  approval count remains zero;
- synthetic fixtures prove semantics but are not production asset or instrument
  mappings;
- future live evidence ingestion, mapping administration and all Phase 2B.2+
  analytics require separate authority.

## 15. Formal acceptance recommendation

Phase 2B.1 is ready to enter a separate formal independent acceptance review once
the final documented scope, hash, link, secret and rollback checks remain green.
The reviewer should independently reproduce all 29 scenario groups, the 44-code
catalogue, deterministic vectors, exact-decimal behavior, resource boundaries,
cancellation/atomicity, zero-real-pair results, clean npm install/build/test, strict
lockfile delta and every frozen-boundary hash. The reviewer must treat this report
as evidence rather than acceptance and must not begin Phase 2B.2.

Exact recommended next prompt:

> Read AGENTS.md, the accepted D-055/D-064 authority and acceptance records, and
> `docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_IMPLEMENTATION.md` completely.
> Perform a formal independent acceptance review of Phase 2B.1 only. Recalculate
> the D-055 snapshot digest; independently reproduce all 29 scenario groups, the
> exact 44-code catalogue, canonical serialization/SHA-256 vectors, exact-decimal
> economics, AS_KNOWN/CORRECTED replay, reviewer separation, conflict/quarantine,
> all D-064 boundary/one-over cases, cancellation and atomic rollback. Run a clean
> Node 24.18.1/npm 11.16.0 `npm ci`, formatting, lint, typecheck, default tests and
> production build. Independently verify the strict workspace/package-lock delta,
> zero third-party dependency changes, public-only market-data imports, current
> zero-real-pair fail-closed outcomes and every frozen boundary. Treat the
> implementation report as evidence, not acceptance. Create the Phase 2B.1 formal
> acceptance report only; do not modify normative implementation unless a verified
> BLOCKER/HIGH remediation is required, do not commit, and do not begin Phase 2B.2.

## 16. Acceptance remediation evidence

Remediation date: 2026-09-21  
Failed acceptance evidence:
`docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE.md` (`FAIL`)  
Authorized findings: `B-01`, `B-02`, `H-01`, `H-02`, and `H-03` only

The failed formal-acceptance report remains unchanged. This section records the
implementation-local remediation; it is not a replacement acceptance verdict.

### 16.1 B-01 — materialized mapping admission

`admission.ts` is now the single runtime trust boundary for mapping eligibility.
`evaluateMatch` and replay accept raw mapping material only through
`admitMaterializedMapping`; no public weaker evaluator exists. Admission closes
the mapping, candidate, review and approval schemas and independently verifies:

- mapping ID/version/state, accepted policy revision, registry/evidence
  revisions and the complete immutable history;
- candidate ID, evidence digest and candidate-provenance digest reproduction;
- command digest, expected revision, review binding and identical signed
  approvals;
- distinct proposer, Quant reviewer and Market Data reviewer;
- `COMPLETE_APPROVED`, an asserted exposure key and an empty fail-closed reason
  set;
- exact candidate/mapping exposure and evidence consistency;
- effective interval, current validity, overlap, supersession, invalidation,
  quarantine and conflict state;
- `COMPATIBLE_APPROVED` as the only admitted reason for an approved mapping.

Malformed, incomplete, fabricated, expired, superseded, invalidated,
quarantined, conflicting or digest/revision-mismatched records remain
non-actionable using the existing accepted reason-code catalogue. Static brands
support internal use, but runtime admission remains mandatory.

### 16.2 B-02 — runtime immutability

All admitted authoritative values are defensively copied and deeply frozen
within the D-064 bounds. The curated registry uses private indexed state and
returns immutable snapshots; it retains no caller-owned record or nested array.
Mapping ledger history is copied/frozen, and command digests are held in a
private map exposed only by finite queries and immutable snapshots. Materialized
candidate, review, approval, mapping and evidence records do not retain mutable
caller references. The special-native-family policy is an internal closed
constant queried through a private membership function rather than an exported
mutable `Set`.

Regression tests mutate original registry records, returned registry views,
caller mapping/approval objects, evidence objects and command-digest snapshots.
Later identity resolution, replay, eligibility, conflict detection and
idempotency remain unchanged.

### 16.3 H-01 — provisional diagnostic candidates

Candidate discovery now separates a provisional identity containing only proven
product/base/quote/settlement dimensions from the final canonical exposure.
`LINEAR` and `BASE_UNIT` are materialized only after payoff, multiplier,
quantity-unit and canonical-unit evidence are complete. Diagnostic candidates
with unknown economics remain observable with finite missing-evidence reasons
but have no canonical exposure key and cannot be admitted as `MATCHED`.

The current Binance diagnostic remains
`MULTIPLIER_UNKNOWN` plus `VALUE_CONVENTION_UNVERIFIED`; the current Bybit
diagnostic remains `MULTIPLIER_UNKNOWN`. Synthetic fully proven evidence still
materializes the accepted exposure key. Ticker text remains excluded from
identity discovery.

### 16.4 H-02 — explicit public API

The root barrel no longer uses wildcard exports. Its runtime allowlist is:

`EXPOSURE_KEY_VERSION`, `MATCHING_LIMITS`, `MATCHING_POLICY_VERSION`,
`MATCHING_RESOURCE_SCOPE`, `MATCH_REASON_CODES`, `MappingLedger`,
`MatchingFailure`, `CuratedAssetRegistry`, `admitMappingCommand`,
`admitMaterializedMapping`, `admitRegistryRevision`, `approveCommand`,
`candidateProvenanceDigest`, `canonicalExposureKey`, `evaluateBatch`,
`evaluateMatch`, `generateCandidates`, `invalidateCommand`,
`normalizeBaseExposure`, `normalizeQuoteNotional`, `replayMapping`, and
`validateEvidenceBundle`.

Raw validators, work-budget implementation, internal time helpers, mutable
policy collections, canonical serialization helpers, private materializers and
fixture builders are not root exports. The package export map still exposes only
`.`; legitimate consumers need no deep import.

### 16.5 H-03 — operation-wide cancellation accounting

One `WorkBudget` is propagated across validation, registry resolution,
candidate enumeration, evidence admission, mapping admission, batch evaluation
and replay. Every repeated bounded loop charges logical work. `step(count)`
chunks internally, so even a caller-supplied count greater than 128 cannot skip
the cancellation check interval. Checks occur before work, after at most 128
logical units and immediately before publication.

Deterministic observer instrumentation measured a maximum gap of exactly 128
logical steps across validation and candidate generation. Focused cancellation
tests cover validation, evidence iteration, mapping admission/replay and the
pre-publication boundary. Cancellation publishes no partial result and mutates
no prior accepted state.

### 16.6 Remediation files and regression coverage

New implementation modules:

- `packages/spread-analytics/src/admission.ts`;
- `packages/spread-analytics/src/immutable.ts`;
- `packages/spread-analytics/src/acceptance-remediation.test.ts`.

Updated implementation modules:

- `bounds.ts`, `candidates.ts`, `commands.ts`, `evaluator.ts`, `evidence.ts`;
- `index.ts`, `model.ts`, `policy.ts`, `registry.ts`, `replay.ts`;
- `test-fixtures.ts`, `validation.ts`;
- `d055-scenarios.test.ts`, `determinism.test.ts`, `governance.test.ts`.

Generated TypeScript build artifacts under `packages/spread-analytics/dist/`
were regenerated from the remediated source. Root `package.json`,
`package-lock.json`, dependencies, D-055, D-064 and frozen boundaries were not
changed by remediation.

The dedicated acceptance-remediation suite contains 36 tests mapped directly to
the five findings. The complete workspace suite now contains 13 test files and
139 passing tests. The original 29 normative D-055 scenario groups remain
materialized as 40 explicit runtime scenario cases. The accepted reason-code
catalogue remains exactly 44 unique codes. Boundary/one-over, hostile-input,
property/permutation, replay, atomicity and current zero-real-pair suites remain
green.

Authoritative post-remediation verification used the fresh materialization
`/tmp/holyparser-2b1-remediation-final.Lh4tyG/repo` with Node `v24.18.1` and npm
`11.16.0`. The counts below supersede the pre-remediation counts in section 12:

- `npm ci`: PASS; 450 packages added, 459 audited; the unchanged seven
  advisories were not remediated. An initial registry request ended with a
  transient `ECONNRESET`; the successful clean run used the same pinned image,
  lockfile and local npm cache and exited zero;
- installed inventory: 451 packages reported by `npm query '*'`; eight
  workspaces;
- formatting, aggregate lint and aggregate typecheck: PASS;
- dedicated remediation suite: one file, 36 passed, zero failed/skipped;
- complete Phase 2B.1 suite: 13 files, 139 passed, zero failed/skipped;
- aggregate default suite: 48 files discovered, 45 passed and three opt-in live
  canary files skipped; 399 tests passed, three skipped, zero failed;
- production build: PASS for every aggregate workspace and six generated web
  routes (`/`, `/_not-found`, `/forgot-password`, `/login`, `/register`, and
  `/verify-email`);
- Markdown/local-link scan: 71 Markdown files, 87 inline links, 65 local links,
  one checked heading anchor and zero broken targets;
- final `git diff --check` and `git fsck --full`: PASS.

A final aggregate re-run after the production build also passed. Because the
existing contracts build emits `dist/index.test.js`, that post-build discovery
contains one additional compiled duplicate test file: 49 files discovered, 46
passed and three skipped; 403 tests passed, three skipped, zero failed. This is
existing repository test-discovery behavior, not a Phase 2B.1 semantic change;
both the prescribed pre-build default run and the post-build confirmation are
reported explicitly.

The maximum measured cancellation-check gap is 128 logical steps. The 29
normative D-055 groups execute as 40 runtime scenario tests; current
OKX/Binance, OKX/Bybit and Binance/Bybit evaluations remain `UNAVAILABLE` with
their accepted exact reason codes. No exchange live canary was required or run.

Post-remediation integrity values remain:

- D-055 snapshot:
  `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`;
- unchanged failed formal-acceptance report:
  `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0`;
- unchanged root `package.json`:
  `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5`;
- unchanged `package-lock.json`:
  `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59`;
- unchanged frozen D1 manifest:
  `0d9ade7e225977e6293b7dfd6e3e90afb51b8a1555e35b67c6495b1b24fa3e7e`.

### 16.7 Remaining limitations and re-acceptance recommendation

No normative limitation was added. The previously accepted implementation
limits in section 14 remain: the package is an in-memory pure foundation,
production identity/persistence is absent by design, and frozen real-venue
economics still yields zero approved pairs. These are not bypassed by the
remediation.

All five failed findings are implementation-addressed and Phase 2B.1 is ready
for a new independent formal acceptance review once the final clean verification
below is green. Phase 2B.2 remains unauthorized.

Exact recommended re-acceptance prompt:

> Read AGENTS.md, D-055/D-064, the failed Phase 2B.1 acceptance report and the
> updated Phase 2B.1 implementation evidence completely. Perform a new formal
> independent acceptance review of Phase 2B.1 only. Reproduce B-01 mapping
> admission/provenance rejection, B-02 nested runtime immutability, H-01
> provisional-versus-canonical candidate behavior, H-02 explicit package export
> closure and H-03 operation-wide cancellation accounting with a measured
> logical-step gap no greater than 128. Independently rerun all 29 D-055 scenario
> groups, the exact 44-code catalogue, D-064 boundary/one-over cases, hostile
> inputs, replay, property/permutation determinism, atomic publication and the
> current zero-real-pair outcomes. Use a fresh Node 24.18.1/npm 11.16.0
> materialization; run npm ci, formatting, lint, typecheck, all default tests and
> production build; verify package/lock and every frozen boundary are unchanged.
> Treat prior reports as evidence, create a new formal acceptance report, do not
> commit and do not begin Phase 2B.2.

## 17. Second acceptance-remediation evidence

Remediation date: 2026-09-21  
Failed re-acceptance evidence:
`docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_REACCEPTANCE.md` (`FAIL`)  
Authorized findings: `B-01`, `B-02`, `H-01`, and `H-03` only

Both formal acceptance reports remain byte-for-byte unchanged. `H-02` remains
resolved: the root package has the same explicit 22-name runtime export
allowlist and no wildcard or internal subpath export was introduced.

### 17.1 B-01 — admitted full-history aggregate

`MappingAdmissionInput.history` now contains a complete
`MappingAdmissionRecord` for every version: mapping, candidate, review, and
approval command. Admission closes and validates every record independently;
historical records are never trusted merely because they are not current.

For every version, admission reproduces the candidate ID, evidence-set digest,
candidate-provenance digest, command digest, approval digests, reviewer-role
separation, policy revision, registry/evidence revisions, exposure binding,
effective interval, reason code, and immutable mapping fields. The history
graph then verifies mapping identity, contiguous versions, `priorVersion`,
`supersededBy`, terminal-state legality, successor existence, invalidation
provenance, and approved-interval overlap. Missing targets, skipped or duplicate
versions, changed exposure identity, forged prior provenance, and illegal
terminal successors fail closed using the existing 44-code catalogue.

Successful admission materializes one canonical deep-frozen history aggregate.
The aggregate binds ordered validated records, per-version canonical digests,
the complete transition chain, and an `admitted-mapping-history/v1` SHA-256
digest. A module-private `WeakSet` supplies runtime authenticity in addition to
the opaque TypeScript brand; a structurally forged JavaScript object is rejected.
`evaluateMatch` may accept convenience raw input only by running this complete
admission path before eligibility. There is no weaker path to `MATCHED`.

The exact re-acceptance counterexample—valid v2 plus a forged `SUPERSEDED` v1
with `forged-policy/v999`, forged evidence/registry revisions, missing approvals,
and `supersededBy = 999`—is rejected before evaluation. Separate regressions
cover each forged field, malformed digests, historical reviewer overlap, missing
targets, illegal transitions, and structurally forged records. A fully proven
two-version control remains `MATCHED`.

### 17.2 B-02 — replay trust and runtime immutability

`replayMapping` now accepts only an authentic `AdmittedMappingHistory`; it no
longer accepts or re-admits caller-owned `MappingAdmissionInput[]`. Replay reads
the same immutable records validated by current eligibility. Returned version,
approval, candidate, review, command, and history arrays are defensive deep
copies/frozen values; internal records are not exposed as writable authority.

The exact mutation regression admits a mutable two-version input, records replay
bytes, then changes the caller's prior status, `supersededBy`, effective interval,
registry/evidence revisions, and nested reviewer identity. Replaying the
previously admitted handle remains byte-for-byte identical. A copied structural
handle fails runtime authenticity validation.

### 17.3 H-01 — product scope before identity

Candidate resolution now runs deterministic product-scope classification before
asserting any canonical exposure semantics. Only a supported ordinary
`PERPETUAL` market whose contract type is independently known as `PERPETUAL`,
whose payoff is proven `LINEAR`, and whose quantity/base units and positive
multiplier are proven can materialize the final
`instrument-exposure-pilot/v1` key.

Provisional diagnostics may retain reviewed asset dimensions and only those
product/economics dimensions actually proven. SPOT, dated future, unsupported
family, unknown product type, option-like, and inverse fixtures remain
diagnostic/non-actionable and have no final exposure key. They do not default
`DERIVATIVE`, `PERPETUAL`, `LINEAR`, or `BASE_UNIT`. The supported synthetic
linear-perpetual control retains the accepted byte-exact exposure key. D-055
groups 5 and 14 pass without weakening their expected reasons.

### 17.4 H-03 — operation-wide logical-work authority

All authoritative operations use one propagated `WorkBudget`. `step(count)`
still chunks centrally and checks cancellation after at most 128 logical steps;
no helper resets a supplied parent budget. Cancellation and bound exhaustion are
fatal and are no longer converted by admission into ordinary provenance results.
The check before construction and the final pre-publication check remain
mandatory.

The deterministic accounting interpretation is:

| Repeated-work location                   | Logical-work accounting                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Closed-schema and nested validation      | bounded key chunks plus each nested record/knowledge branch                                                          |
| Atomic/composite text validation         | one charged scan chunk per at most 128 UTF-16 code units                                                             |
| Registry assets/bindings/aliases/indexes | each record, index insertion, resolution candidate, alias and definition                                             |
| Candidate generation                     | each instrument, ordering comparison, grouping item, pair, partner update and fixed-schema candidate materialization |
| Evidence                                 | each record, bounded byte block, subject, reference, copy and ordering comparison                                    |
| Mapping admission                        | each history record, key/approval/reason, ordering comparison, transition, overlap comparison and materialized copy  |
| Command governance                       | each approval, history scan/comparison, digest construction and ledger copy                                          |
| Canonical serialization                  | deterministic groups of at most 128 node/key/string serialization units; no byte output changes                      |
| Hash preparation                         | one logical unit per at most 4 KiB of prepared canonical bytes                                                       |
| Deterministic sorting                    | every comparator invocation charges the parent budget                                                                |
| Replay                                   | every version/filter/sort/materialization step and canonical replay digest                                           |
| Batch/output publication                 | every evaluation/conflict/result record and each bounded output byte block, then final check                         |

Fixed-schema candidate canonicalization is charged as one candidate
materialization unit; dynamically sized canonical structures use the bounded
serialization meter above. This preserves acceptance of the approved 8,192-pair
boundary within the 100,000-step maximum while accounting for every repeated
operation. Canonical bytes and existing SHA-256 vectors are unchanged.

Instrumentation observes both charged work and cancellation-check positions.
Nested validation, large canonical serialization, candidate traversal/sorting,
history admission, replay, and pre-publication paths all remain at a measured
maximum gap of exactly 128 logical steps. Cancellation during validation,
serialization, hashing preparation, sorting, history/replay, or final
publication releases no partial result and does not mutate an admitted history.

### 17.5 Exact changed files and regression coverage

Second-remediation runtime/source changes are confined to:

- `packages/spread-analytics/src/admission.ts`;
- `packages/spread-analytics/src/bounds.ts`;
- `packages/spread-analytics/src/candidates.ts`;
- `packages/spread-analytics/src/commands.ts`;
- `packages/spread-analytics/src/evaluator.ts`;
- `packages/spread-analytics/src/evidence.ts`;
- `packages/spread-analytics/src/index.ts` (type-only admitted-history exports;
  runtime allowlist unchanged);
- `packages/spread-analytics/src/model.ts`;
- `packages/spread-analytics/src/registry.ts`;
- `packages/spread-analytics/src/replay.ts`;
- `packages/spread-analytics/src/serialization.ts`;
- `packages/spread-analytics/src/validation.ts`;
- `packages/spread-analytics/src/test-fixtures.ts`.

Existing replay callers in `acceptance-remediation.test.ts`,
`d055-scenarios.test.ts`, and `governance.test.ts` were updated to consume an
admitted history handle. The new
`second-acceptance-remediation.test.ts` contains 21 focused cases mapped to
`B-01`, `B-02`, `H-01`, and `H-03`. It includes all exact adversarial
counterexamples named by the failed re-acceptance. Generated `dist/**` is rebuilt
from these sources.

The complete Phase 2B.1 suite now has 14 source test files and 160 passing tests.
All 29 normative D-055 groups remain represented by 40 explicit runtime cases;
all pass. The reason-code catalogue remains 44/44 unique and unchanged. D-064
boundary and one-over, hostile-input, replay, property/permutation, atomicity,
and current real-venue zero-pair tests remain green. The maximum measured
cancellation-check gap is 128.

### 17.6 Pinned clean verification and integrity

Verification used the fresh materialization
`/tmp/holyparser-2b1-second-final.SCpx4A/repo` with exact Node `v24.18.1`
and npm `11.16.0`:

- `npm ci`: PASS; 451 packages added and 460 audited; 452 packages reported by
  `npm query '*'`; eight workspaces;
- formatting, aggregate lint, and aggregate typecheck: PASS;
- focused second-remediation suite: one file, 21 passed, zero failed/skipped;
- complete Phase 2B.1 suite: 14 files, 160 passed, zero failed/skipped;
- aggregate default suite: 50 files discovered; 47 passed and three opt-in live
  canary files skipped; 424 tests passed, three skipped, zero failed;
- production build: PASS for every workspace and six static web routes (`/`,
  `/_not-found`, `/forgot-password`, `/login`, `/register`, `/verify-email`);
- Markdown/local-link validation: PASS across 72 Markdown files, 87 Markdown
  links and 65 local file links; zero broken local links;
- `git diff --check` and `git fsck --full`: PASS.

The seven pre-existing audit advisories remain separate debt and were not
remediated. No exchange canary was run. `package.json` and `package-lock.json`
remain unchanged by this remediation with SHA-256 values
`6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` and
`810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59`.
The old failed acceptance reports remain unchanged at
`f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0` and
`22bb95806e7e8cd300e6ef49e87654528c6fbb775df344b1335c5e61baf028c4`.
D-055 remains
`60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`.

Current real venue pairs remain fail closed: OKX/Binance is `UNAVAILABLE` with
`MULTIPLIER_UNKNOWN` and `VALUE_CONVENTION_UNVERIFIED`; OKX/Bybit is
`UNAVAILABLE` with `MULTIPLIER_UNKNOWN`; Binance/Bybit remains `UNAVAILABLE`
with both applicable multiplier gaps and Binance's unverified value convention.

### 17.7 Third independent acceptance recommendation

`B-01`, `B-02`, `H-01`, and `H-03` are technically remediated; `H-02` remains
resolved. Phase 2B.1 is ready for a third formal independent acceptance review.
This statement is implementation-produced evidence, not acceptance or freeze
authority. Phase 2B.2 remains unauthorized.

Exact recommended next prompt:

> Use `/Volumes/M2 ssd/HolyParser`. Read AGENTS.md, D-055, D-064, both prior
> failed Phase 2B.1 acceptance reports, and the complete updated implementation
> report. Perform a third formal independent acceptance review of Phase 2B.1
> only. Independently reproduce the exact forged historical-v1 counterexample
> and verify full per-version provenance plus transition-graph admission before
> any MATCHED result; verify replay accepts only a runtime-authentic immutable
> admitted-history aggregate and remains byte-stable after caller mutation;
> verify SPOT, dated, unknown, unsupported, option-like, and inverse diagnostics
> cannot materialize unproven canonical exposure fields; and independently audit
> operation-wide work accounting through validation, registry, evidence,
> history, serialization/hashing, sorting, replay, and publication with a maximum
> measured cancellation gap of 128. Confirm H-02 remains resolved with exactly
> 22 runtime exports. Re-run all 29 D-055 groups/40 cases, the unchanged 44-code
> catalogue, all D-064 boundary/one-over and hostile-input cases, atomicity,
> determinism, replay, and current zero-real-pair outcomes. Use a fresh exact
> Node 24.18.1/npm 11.16.0 materialization; run npm ci, format, lint, typecheck,
> focused and aggregate tests, production build, Markdown/local-link validation,
> git diff --check, git fsck, manifest/lock hashes, and all frozen-boundary
> checks. Do not modify either prior acceptance report, implementation, D-055,
> D-064, manifests, lockfile, dependencies, or frozen scopes; create a new third
> acceptance report, do not commit, and do not begin Phase 2B.2.

## 18. Third acceptance-remediation evidence

Remediation date: 2026-09-22  
Failed third-acceptance evidence:
`docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_3.md` (`FAIL`)  
Authorized findings: `B-01` and `H-03` only

The three formal acceptance reports remain byte-for-byte unchanged. `B-02`,
`H-01`, and `H-02` remain resolved. The package root still has exactly 22
explicit runtime exports; no transition constructor, `WorkBudget`, validator,
serialization helper, mutable policy state, test builder, or internal subpath
was added to the public surface.

### 18.1 B-01 — immutable approvals plus append-only transitions

An admitted base `MappingVersion` is now permanently the exact reviewed
`APPROVED` value. Admission rejects any base mapping record whose `status`,
`reasonCode`, `supersededBy`, or `invalidationReference` attempts to encode a
later lifecycle event. The original approval command remains responsible only
for the immutable approval; it cannot authorize a later lifecycle change.

Supersession, invalidation, and already-authorized correction semantics are
represented by separate immutable `MappingTransitionRecord` values. Each
transition binds:

- transition and mapping IDs;
- affected and expected mapping revisions/state;
- transition type and effective time;
- existing reason code and optional successor/reference;
- matching policy, registry, evidence, and base-provenance revisions/digests;
- proposer, independent Quant and Market Data approvals;
- recorded-knowledge time and the complete transition command digest.

Command domains are explicitly separated as
`mapping-transition-supersede/v1`,
`mapping-transition-invalidate/v1`, and
`mapping-transition-correct/v1`. A mapping-approval digest therefore cannot be
reused as a transition digest. All semantic transition fields participate in
the domain-separated digest. Reviewer separation, approval-digest equality,
target provenance, expected revision/state, policy revision, effective time,
and evidence/registry revisions are revalidated at runtime.

The admitted history aggregate now binds ordered immutable approval records and
ordered immutable transition records. Its `admitted-mapping-history/v1` digest
contains separate per-version and `admitted-mapping-transition/v1` digests.
Admission validates transition targets, mapping identity, contiguous versions,
successor existence, one successor per version, terminal-state conflicts,
missing transitions between versions, stale revisions, and duplicate or
contradictory transitions. Current state is derived from this aggregate; the
base approval is never rewritten.

The exact third-acceptance bypass is closed at JavaScript runtime: changing a
valid v1 approval to `SUPERSEDED` or `INVALIDATED`, modifying its reason or
successor/invalidation fields, and retaining the original approval digest now
returns `DIGEST_MISMATCH`/`COMMAND_DIGEST_CONFLICT`; no admitted handle is
created and neither evaluation nor replay can reach `MATCHED` through the forged
record. Further regressions cover wrong transition digest/policy/evidence/
registry revisions, stale expected revision, missing/wrong successor, reused
approval digest, missing reviewer, reviewer collision, and conflicting
invalidation plus supersession. Valid approved-to-superseded-to-new-approved and
approved-to-invalidated controls remain accepted.

`AS_KNOWN` replay applies only admitted transitions visible at its knowledge
cutoff. `CORRECTED` may apply later admitted correction/invalidation transitions
under its explicit replay revision. Both modes use the same immutable admitted
aggregate and never mutate a base approval. Mutating caller-owned transition
objects after admission leaves subsequent replay byte-identical.

### 18.2 H-03 — completed cumulative work accounting

Every authoritative operation continues to use one cumulative `WorkBudget`.
Supplied budgets are propagated through validation, registry resolution,
candidate generation, commands, admission, transition validation, replay,
canonical serialization/hash preparation, output materialization, and final
publication. Helpers do not reset either the 100,000-step total or the
128-step cancellation interval.

The deterministic work interpretation is now:

| Authoritative repeated work    | Accounting rule                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Atomic ID scan                 | one logical unit per at most 32 UTF-16 code units                                                                                      |
| Composite ID scan              | one logical unit per at most 256 UTF-16 code units                                                                                     |
| Reason/description scan        | one logical unit per at most 64 UTF-16 code units                                                                                      |
| General bounded JSON text scan | one logical unit per at most 4,096 code units, plus one per at most 128 JSON nodes                                                     |
| Closed object/array validation | every bounded key/element chunk and nested branch charges the shared budget                                                            |
| Registry/evidence traversal    | every record, binding, alias, subject/reference, index insertion, and resolution candidate charges the shared budget                   |
| Candidate generation           | every dynamic instrument/group/pair traversal and one unit per fixed-schema candidate materialization                                  |
| Mapping/transition admission   | every version, transition, approval, linkage, ordering comparison, digest preparation, and immutable copy charges the shared budget    |
| Deterministic sort             | comparator calls charge the shared budget, with bounded collection sizes validated before sorting                                      |
| Canonical serialization        | dynamic arrays, object keys, and bounded string/byte chunks charge one shared serialization meter                                      |
| Hash preparation               | one logical unit per at most 4 KiB of prepared canonical input; the cryptographic primitive itself is the trusted boundary             |
| Replay/output                  | every version/transition selection, replay materialization, bounded output block, and final publication path charges the shared budget |

This model distinguishes short and long valid inputs: a one-code-unit atomic ID
charges one scan unit, a 160-code-unit atomic ID charges five, a near-maximum
composite ID charges sixteen, and a near-maximum reason charges eight. Boundary
inputs remain accepted, while their complete validation work contributes to the
same cumulative cap. Serialization bytes and all accepted SHA-256 vectors are
unchanged.

Instrumentation observes cumulative steps and every cancellation-check
position. The independently exercised maximum gap remains exactly 128 logical
steps. A distributed test starts below the cap, consumes the balance through
100 long valid composite-ID scans, reaches exactly 100,000, then proves the
next validation operation fails deterministically with
`MATCHING_BOUND_EXCEEDED`. Cancellation/bound failure publishes no partial
result and mutates no admitted mapping or transition state. All authoritative
materialization is completed and budgeted before the final cancellation check;
no sorting, hashing preparation, serialization, or copying remains between that
check and publication.

### 18.3 Exact files and regressions

Third-remediation source changes are confined to:

- `packages/spread-analytics/src/admission.ts`;
- `packages/spread-analytics/src/bounds.ts`;
- `packages/spread-analytics/src/candidates.ts`;
- `packages/spread-analytics/src/commands.ts`;
- `packages/spread-analytics/src/diagnostics.ts`;
- `packages/spread-analytics/src/evidence.ts`;
- `packages/spread-analytics/src/immutable.ts`;
- `packages/spread-analytics/src/model.ts`;
- `packages/spread-analytics/src/registry.ts`;
- `packages/spread-analytics/src/replay.ts`;
- `packages/spread-analytics/src/serialization.ts`;
- `packages/spread-analytics/src/test-fixtures.ts`;
- `packages/spread-analytics/src/transitions.ts` (new internal module);
- `packages/spread-analytics/src/validation.ts`.

Test changes are confined to:

- `third-acceptance-remediation.test.ts` (new; 23 focused tests);
- `governance.test.ts` (append-only invalidation control);
- `d055-scenarios.test.ts` (explicit supersession knowledge time);
- `acceptance-remediation.test.ts` (mechanical transition-aware fixture
  rebinding with the original normative coverage retained).

Generated `packages/spread-analytics/dist/**` was rebuilt mechanically from the
current source. No root manifest, lockfile, dependency, reason code, D-055,
D-064, frozen contract, adapter, formula, application, infrastructure, or brand
file changed.

Final adversarial follow-up additionally closed three transition-admission
edges: an unknown transition type is rejected at JavaScript runtime; a
transition is not effective before its explicit `effectiveAt` in current
evaluation or replay; and the public invalidation command's outer fields,
including its bounded reason text, must match the separately digested
transition record. Duplicate terminal transitions on one affected version are
rejected. The three added focused tests raise this file's count from 20 to 23.
The text and canonical hash-preparation work model now charges long valid
strings in bounded chunks while preserving the 16 MiB input boundary and the
100,000-step cumulative cap.

### 18.4 Verification results

Authoritative clean verification used the fresh materialization
`/tmp/holyparser-third-final.33OUWW/repo`, exact Node `v24.18.1`, and
npm `11.16.0`:

- `npm ci`: PASS; 451 packages added and 460 audited; seven pre-existing
  advisories remain separate debt;
- package query: 452 entries; workspace query: eight workspaces;
- aggregate format check, lint, and typecheck: PASS;
- focused third-remediation suite: one file, 23 passed, zero failed/skipped;
- complete spread-analytics suite: 15 files, 183 passed, zero failed/skipped;
- all 29 normative D-055 groups: PASS as 40 authored runtime cases;
- reason catalogue: 44 entries, 44 unique, deterministic UTF-8 order, no
  additions;
- D-064 boundary/one-over, hostile input, replay, property/permutation,
  atomicity, governance, and zero-real-pair suites: PASS;
- aggregate default repository suite: 50 files discovered; 47 passed and three
  opt-in live-canary files skipped; 443 tests passed, three skipped, zero
  failed;
- a post-build rerun reports 51 discovered files, 48 passed and three skipped,
  with 447 passed tests because the contracts build also emits one compiled
  duplicate test file with four duplicate cases; unique source coverage remains
  443 passes across the 50 source test files above;
- production build: PASS for all eight workspaces and six static web routes
  (`/`, `/_not-found`, `/forgot-password`, `/login`, `/register`,
  `/verify-email`);
- Markdown/local-link validation: PASS across 73 Markdown files, 87 links, 65
  local links, and one checked anchor; zero broken targets/anchors;
- `git diff --check` and `git fsck --full`: PASS.

The clean production build again rewrote only disposable
`apps/web/next-env.d.ts`; the authoritative checkout's application tree remains
unchanged. No live exchange canary was run.

Integrity values remain:

- D-055 snapshot:
  `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`;
- root `package.json`:
  `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5`;
- `package-lock.json`:
  `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59`;
- first failed acceptance:
  `f897b1dcbfc19778f6c38cfc986a2b468410ce0b727e24627758e7153aa7a5f0`;
- second failed acceptance:
  `22bb95806e7e8cd300e6ef49e87654528c6fbb775df344b1335c5e61baf028c4`;
- third failed acceptance:
  `bd5fa6a38404e9d40e35513176f94a752025fd7152653dc5d4b64811592295e0`.

Current real venue results remain fail closed and unchanged: OKX/Binance is
`UNAVAILABLE` with `MULTIPLIER_UNKNOWN` and
`VALUE_CONVENTION_UNVERIFIED`; OKX/Bybit is `UNAVAILABLE` with
`MULTIPLIER_UNKNOWN`; Binance/Bybit is `UNAVAILABLE` with both applicable
multiplier gaps and Binance's `VALUE_CONVENTION_UNVERIFIED`.

### 18.5 Fourth independent acceptance recommendation

`B-01` and `H-03` are technically remediated. `B-02`, `H-01`, and `H-02`
remain resolved. This is implementation-produced evidence, not acceptance or
freeze authority. Phase 2B.1 is ready for a fourth formal independent acceptance
review; Phase 2B.2 remains unauthorized.

Exact recommended next prompt:

> Use `/Volumes/M2 ssd/HolyParser`. Perform a fourth formal independent
> acceptance review of Phase 2B.1 only after reading AGENTS.md, D-055, D-064,
> all three prior failed acceptance reports, and the complete updated
> implementation evidence. Reproduce the exact forged-status bypass at
> JavaScript runtime and verify that immutable approved MappingVersion records
> plus separately reviewed, domain-separated, append-only transition records
> are the only source of supersession/invalidation/correction authority. Audit
> every transition field, digest, reviewer, target, revision, linkage, conflict,
> AS_KNOWN/CORRECTED replay path, and admitted-history aggregate. Independently
> inventory all authoritative loops/scans/sorts/serialization/hash-preparation
> paths, verify long valid IDs consume the single cumulative operation budget,
> prove a maximum cancellation gap no greater than 128 and the cumulative
> 100,000-step cap without helper resets, and prove no repeated work occurs after
> the final cancellation check. Reconfirm B-02/H-01/H-02, exactly 22 runtime
> exports, all 29 D-055 groups/40 cases, the unchanged 44-code catalogue, every
> D-064 boundary/one-over and hostile-input case, atomicity, determinism, replay,
> and the three fail-closed real-venue results. Use a fresh exact Node
> 24.18.1/npm 11.16.0 materialization; run npm ci, format, lint, typecheck,
> focused and aggregate tests, production build, Markdown/local-link validation,
> git diff --check, git fsck, manifest/lock hashes, dependency checks, and all
> frozen-boundary checks. Do not modify implementation, prior acceptance
> reports, D-055, D-064, manifests, lockfile, dependencies, or frozen scopes;
> create a new fourth acceptance report, do not commit, and do not begin Phase
> 2B.2.

## 19. Fourth acceptance-remediation evidence — H-03 only

Remediation date: 2026-09-29. Governing finding:
[fourth independent acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_4.md)
— **FAIL**, BLOCKER 0, unresolved HIGH 1: H-03 (operation-wide D-064
logical-work/cancellation guarantee not proven; candidate materialization
performed key construction, canonical serialization, hash-input preparation
and copying outside the parent `WorkBudget`). B-01, B-02, H-01 and H-02 are
recorded there as RESOLVED and were not reopened or redesigned. This section is
implementation-produced evidence, not formal acceptance, not a Phase 2B.1
freeze and not Phase 2B.2 authorization. D-055, D-064, the 44-code catalogue,
policy/resource versions, manifests, lockfile, dependencies and all frozen
scopes are unchanged.

### 19.1 Transferred state and withdrawn claims

The work was continued from the WIP transport branch `handoff/phase-2b1-h03`
(commit `e3aa20ec2f733f60e456a2e85eed6d683d3435d5`, parent
`9dacc824aa375f4f14b60ec91ccbdc69624f23a3`). That commit is a transport
snapshot, not an acceptance or freeze commit. It already contained an earlier,
unreviewed draft of this section and a partial remediation. Re-verification of
that transferred state found:

- it was **red**: 191/192 package tests. The accepted regression "observes a
  maximum gap of 128 through validation and candidate loops" (32 instruments,
  496 valid pairs) failed with `MATCHING_BOUND_EXCEEDED`. The draft charged
  every canonical string at least one whole step (a ×4 UTF-8 upper bound
  rounded up per string) and every copied field one step, so one candidate cost
  about 195 steps and the approved 8,192-pair allowance collapsed to about 500
  pairs;
- its "no further production path omits the supplied budget" claim was false
  (section 19.2);
- its only cancellation evidence was the charged counter's gap of exactly 128.
  Acceptance-4 already rejected this as proof of operation-wide coverage.

The draft's test counts, audit conclusion and gap evidence are withdrawn and
replaced by the evidence below.

### 19.2 Exact H-03 root cause

1. **Acceptance-4 counterexample (candidate path).** `makeCandidate` charged a
   fixed amount while the work proportional to identifier length was not
   charged against the parent budget: exposure-key construction, provisional
   and candidate canonical serialization, deterministic-ID/evidence hash-input
   preparation, and the immutable copy.
2. **Unproven equivalence between charged and actual work.** Every earlier gap
   measurement read the budget's own counter. No independent measurement of
   actual work existed, so omitted work was invisible by construction.
3. **Analogous omissions found by the independent oracle (section 19.6) in the
   transferred source:**
   - Standalone `admitMaterializedMapping` published every non-`VALID` typed
     outcome without the final pre-publication check: 1,134 units of work were
     performed after the last check.
   - `Date.parse` ran on caller-supplied timestamp strings of unbounded length
     without a charge, in the registry, admission, transitions, commands,
     evidence, evaluator freshness and replay.
   - `sha256` measured its input with an uncharged `Buffer.byteLength` pass
     before charging.
   - `[...x]` array copies before sorts were not charged. This affected
     instruments, groups, history, transitions, versions and approvals.
   - Caller-object spreads were not charged by actual key count, in commands,
     transitions, the ledger and admission copies.
   - `evaluateBatch` froze its result array after the final check.
   - JSON escape expansion was not charged.

   Measured interruptible gaps in the transferred source were up to 69,531
   actual units (replay), 52,406 (batch evaluation), 21,461 (match evaluation),
   19,712 (evidence) and 17,109 (admission). The ceiling is 16,384.

### 19.3 Remediation architecture and work model

There is exactly one `WorkBudget` per authoritative operation. `WorkBudget` gains
an internal fine-grained accumulator, `units(n)`, which charges 128 units per
logical step (`WORK_UNITS_PER_STEP`, internal, not exported from the package
root). The sub-step remainder carries across every helper of the same operation.
Nothing is rounded away or reset. `beforePublication()` charges any non-zero
remainder as one step and then performs the final cancellation check. The
100,000-step cap and the 128-step check interval are enforced in `step()`
exactly as before. D-055 §13 defines the budget as "explicit
record/pair/evidence validation steps" and does not fix a bytes-per-step
quantum. The 128-unit quantum is the rate already used by the third
remediation's reviewed serialization meter; no new normative rate was invented.

One unit is one UTF-16 code unit, element or key processed by one native pass.
Each native pass is charged before it runs. The exception is JSON escape
expansion, whose size is only known after the atomic call; it is charged
immediately after that call and before any further work.

| Repeated work                              | Charge                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Canonical string quoting                   | length + 2 before; escape expansion (at most 5 × length) immediately after                     |
| Canonical array / object                   | 1 per value; array length; 64-key enumeration upper bound (plus any excess); joined length + 2 |
| Canonical key order and all UTF-8 sorts    | a + b + 3·min(a, b) + 1 per comparator call (two encodings plus the byte comparison)           |
| Exposure key                               | 7 + per field (2 × length + 12) + joined length + version prefix                               |
| Deterministic ID                           | 1 + canonical serialization + (domain + canonical) concatenation + SHA input preparation       |
| SHA-256 input preparation                  | input length + 1 (flatten/encode); the digest rounds are the trusted primitive                 |
| Candidate key / provisional equality       | compared length when lengths are equal, + 1                                                    |
| Caller-object copy and freeze              | 3 × own-key count + 1, after the one native enumeration needed to measure it                   |
| Array copies (`[...x]`) and result freezes | element count + 1 before the copy                                                              |
| Timestamp parsing                          | string length + 1 before `Date.parse` (parse semantics unchanged)                              |
| Output byte bound                          | output length before the byte-length pass                                                      |
| Reason/description markup check            | byte-length pass + `<` count pass + length × (`<` count + 1) before the bounded pattern scan   |

Unchanged accepted rates:

- atomic, composite and reason scans at 32, 64 and 256 code units per step;
- JSON walk at 128 nodes and 256 string code units per step;
- evidence JSON at 512 per step;
- the standalone 16 MiB input decode/parse at 4,096 bytes per step, which the
  accepted 16 MiB boundary test requires;
- every explicit per-record, per-pair, per-evidence and per-version step.

Execution model (D-064 §3): cancellation is cooperative. Between adjacent
checks there are at most 128 charged steps of interruptible work. A single
native primitive call (join, encode, hash feed, parse) is fully charged before
it starts and cannot be interrupted mid-call. The D-064 byte limits bound each
such call. No wall-clock latency is claimed.

### 19.4 Budget propagation path

`generateCandidates` → `generateCandidatesWithBudget` → per-instrument
validation (`assertClosedKeys`, `assertAtomicId`, `assertCompositeId`,
`assertReasonText`) → charged copy and UTF-8 sort → `resolveExposureIdentity`
→ `CuratedAssetRegistry.resolve` (budgeted `epoch`/`isEffective`) →
`provisionalKey` → `canonicalSerialize` → group/pair enumeration →
`makeCandidate` → `canonicalExposureKey`, candidate string equality,
`provisionalValue` + `canonicalSerialize`, `deterministicId` → `sha256`,
evidence `canonicalSerialize` → `sha256`, `immutableCandidate` → `chargeCopy`
→ charged final freeze → `beforePublication`.

The evaluation path is `evaluateMatch`/`evaluateBatch` → validation →
resolution → freshness (budgeted timestamps) → `admitMaterializedMapping(…,
work)` → `admitWithBudget` → record, command, transition and history
validation, digests and copies → evaluation result `deterministicId` →
(batch) canonical output serialization and output bound → charged freeze →
`beforePublication`. Replay, evidence, registry admission and command
admission follow the same pattern with their own single root budget.

A static source test (`instantiates WorkBudget only at approved operation
roots`) enumerates all 20 `new WorkBudget(` sites. Every one is a public or
standalone operation root, or an `operationBudget ?? new WorkBudget()`
fallback used only when no parent budget exists. No helper resets a parent
budget.

### 19.5 Static accounting inventory

All 205 runtime occurrences of `map`, `filter`, `sort`, `some`, `find`,
`every`, `includes`, `join`, spread copies, `Object.keys`, `JSON.stringify`,
`Buffer.*`, `Set`/`Map` construction, `for` loops, `reduce` and object spreads
in the 15 non-test modules were reviewed. Every occurrence is either charged to
the operation budget before its work, or bounded by a code-defined constant:

- fixed schema key lists;
- fixed enumerations;
- the two candidate legs;
- at most 44 reason codes;
- at most three approvals, after a count check.

Such constant-bounded work is covered by the enclosing explicit step.
**Uncovered authoritative repeated-work paths: 0.**

| Module                                                                                               | Remediated sites in this round                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bounds.ts`                                                                                          | unit accumulator and remainder flush; reason byte-length and markup-pattern worst case; output bound                                                                |
| `serialization.ts`                                                                                   | string quoting and escape expansion, array/object traversal, joins, key sort, exposure key, deterministic-ID concatenation, SHA preparation (no uncharged pre-scan) |
| `candidates.ts`                                                                                      | leg/revision/reason traversal, key and provisional equality, instrument and group copies, final freeze                                                              |
| `immutable.ts`                                                                                       | `chargeCopy` for mapping, review, candidate, approval, asset, binding and alias copies                                                                              |
| `registry.ts`                                                                                        | budgeted `epoch`, `isEffective` and `chargeTimestamp` in construction and resolution                                                                                |
| `admission.ts`                                                                                       | final check for every standalone outcome, history/transition/approval copies, command/transition copies, timestamps, provenance reason copy                         |
| `transitions.ts`                                                                                     | timestamps, record and approval copies                                                                                                                              |
| `commands.ts`                                                                                        | timestamps, overlap `Date.parse`, idempotent version copy, command/transition/approval copies                                                                       |
| `evaluator.ts`                                                                                       | freshness timestamps; batch freeze moved before the final check                                                                                                     |
| `evidence.ts`, `replay.ts`                                                                           | timestamps, record copies, replay version copy                                                                                                                      |
| `validation.ts`, `economics.ts`, `policy.ts`, `reasons.ts`, `model.ts`, `index.ts`, `diagnostics.ts` | no change required                                                                                                                                                  |

### 19.6 Independent actual-work oracle

`src/work-oracle.ts` is test-only: it is excluded from the build and never
imported by runtime code. It instruments the native primitives that perform
data-proportional work:

- string, JSON and `Buffer` operations;
- `Date.parse` and regular expressions;
- hash `update`;
- array traversal, copy, sort and iteration;
- `Map`/`Set` iteration;
- key enumeration, `Object.freeze` and `Reflect.ownKeys`.

It records the actual work performed at every cancellation check through the
signal's `aborted` getter, which `WorkBudget.check()` reads exactly once per
check. It therefore measures actual work, not charged steps. The
interruptible gap is each gap minus the one largest atomic native call inside
it. The ceiling is 128 × 128 = 16,384 units (one unit of charge per unit of
actual work).

| Operation (maximum inputs used)                       | Transferred source: interruptible gap / tail | Remediated: checks, interruptible gap, tail |
| ----------------------------------------------------- | -------------------------------------------- | ------------------------------------------- |
| Candidate generation, 24 instruments, 160-unit assets | within bound / 0                             | 218, 11,699, 0                              |
| Standalone admission, 64-version history, `VALID`     | **17,109** / 0                               | 342, 10,880, 0                              |
| Standalone admission, typed `REVISION_MISMATCH`       | within bound / **1,134**                     | 267, 10,796, 0                              |
| Match evaluation with admitted mapping                | **21,461** / 0                               | 343, 10,871, 0                              |
| Batch evaluation, 200                                 | **52,406** / 0                               | 360, 13,521, 0                              |
| Replay, 64 versions                                   | **69,531** / 0                               | 54, 14,464, 0                               |
| Evidence bundle, 300 near-limit records               | **19,712** / 0                               | 287, 10,010, 0                              |
| Registry admission                                    | within bound / 0                             | 12, 4,974, 0                                |
| Command admission, 4,096-byte composite IDs           | within bound / 0                             | 12, 9,707, 0                                |

**Maximum measured interruptible gap after remediation: 14,464 actual
units.** This is below the 16,384 ceiling, and the charged counter's maximum
gap is 128 steps. Across all operations:

- the first check precedes all work (0 units);
- no work occurs between the final check and publication (tail 0);
- total actual work never exceeds charged units.

The standalone `parseBoundedJson`, which no matching operation calls, stays
within 3 × 16,384 at its accepted 16 MiB-compatible rates. A negative control
emulates the acceptance-4 pattern (one charged step per candidate, with
helpers unbudgeted). The oracle flags it at more than four times the ceiling,
so the measurement is not vacuous. Hostile 200,000-character timestamps are
charged before `Date.parse` and fail with the typed `EVIDENCE_TIME_INVALID`.

### 19.7 Focused regressions and resource results

`fourth-acceptance-remediation.test.ts` (rewritten; **21** tests) and
`work-accounting-oracle.test.ts` (new; **15** tests) add:

- **Exact long-ID counterexample.** `makeCandidate` with a 10-unit versus a
  155-unit canonical base asset ID now costs **75 versus 93 logical steps**;
  acceptance-4 measured 1 versus 1. The cost is deterministic on repetition.
  The difference is at least the model's twelve charged passes. The exposure
  key grows by more than 100 bytes with identical canonical semantics.
  Provisional-only candidates are also charged proportionally.
- **Long valid near-boundary values.**
  - A 160-unit atomic ID costs 5 steps, and 80 astral characters cost more
    than one character.
  - A 4,096-byte composite ID costs more than a 1-byte one.
  - A 512-byte reason costs more than a short reason.
  - A `<`-dense bounded reason is charged its pattern worst case.
  - Hostile control-character text is charged its JSON escape expansion.
  - Long registry, evidence, transition and candidate identity fields all
    cost more than short ones, and every one of these valid values is still
    accepted.
- **8,192 candidate pairs.** The exact approved maximum of valid pairs fails
  with `MATCHING_BOUND_EXCEEDED` at 99,996 steps, inside `makeCandidate`, on
  the single operation budget. Nothing is published, and the maximum charged
  gap is 128. The stricter cumulative bound wins over the pair-count bound.
- **Measured capacity with fixture identifiers** (about 80 steps per pair):

  | Valid pairs | Result                                   |
  | ----------: | ---------------------------------------- |
  |         496 | published, 39,683 steps                  |
  |         992 | published, 79,496 steps                  |
  |       1,112 | published, 90,326 steps                  |
  |       1,268 | fails closed (`MATCHING_BOUND_EXCEEDED`) |

  The 8,193rd-pair and 33rd-partner rejections are unchanged.

- **Distributed cumulative work.** Six stages share one budget: registry
  construction, instrument validation, 200 evidence records, candidate
  generation and materialization, mapping admission, and a large
  serialization/hash. Each stage stays below 50,000 steps. With the budget
  prefilled so that the whole operation ends at exactly 100,000 steps, it
  succeeds, and the 100,001st step or unit block fails. With one more step of
  prefill, the operation itself fails at its 100,001st required step. Without
  prefill, repeating the stages crosses the cap cumulatively.
- **Cancellation.** Cancellation is shown to occur inside each of these:
  - long ID scanning;
  - exposure-key serialization;
  - provisional serialization;
  - candidate-string comparison;
  - provenance and deterministic-ID preparation;
  - SHA input preparation;
  - the immutable candidate copy;
  - deep inside a 496-pair batch;
  - at the final pre-publication check.

  A sweep of the abort point across every 4-unit offset of a whole
  `makeCandidate` reaches all seven materialization phases.

- **Final publication.** Every public operation's actual-work tail after its
  final check is 0 oracle units. Standalone admission now checks before
  publishing every typed outcome.
- **Atomicity.** Under cancellation and under budget exhaustion during
  materialization, no candidates are published. The frozen registry revision,
  caller instruments, admitted history digest and frozen versions, and the
  ledger versions are unchanged, and replay of the admitted history still
  yields `MATCHED`.

Budgeted and unbudgeted canonical serialization, deterministic IDs,
SHA-256 values and exposure keys are byte-identical, including escaped, astral
and nested values. The existing golden vectors
(`786dc0d4…07ef` in `serialization.test.ts`) and every mapping, transition and
replay digest suite pass unchanged. `serialization.test.ts`,
`d055-scenarios.test.ts`, `reasons.ts`, `policy.ts`, `model.ts`,
`economics.ts` and `index.ts` are byte-identical to the transferred state.

### 19.8 Regression gates

- B-01: the append-only transition, forged-status and digest-domain suites
  pass unchanged (`third-acceptance-remediation.test.ts` 23/23).
- B-02: the caller-mutation and forged-handle suites pass unchanged.
- H-01: the product-scope-before-identity suites pass unchanged.
- H-02: the built `dist/index.js` exposes exactly **22** runtime exports, with
  unchanged names. `WorkBudget`, `WORK_UNITS_PER_STEP`, `chargeCopy`,
  `chargeTimestamp`, `makeCandidate`, `generateCandidatesWithBudget`,
  serialization helpers and the oracle are not exported. A deep import
  returns `ERR_PACKAGE_PATH_NOT_EXPORTED`, and the oracle is absent from
  `dist`.
- D-055: the numbered scenario suite passes **40/40** authored runtime cases
  (37 synthetic plus 3 real-venue), representing **29/29** policy groups,
  where group 29 is now covered by the resource/cancellation suites above.
  The reason catalogue has **44/44** unique codes and no new code.
- D-064: every numeric boundary and one-over test passes, including 16 MiB
  input/output, 1,024 instruments, 8,193 pairs, partner 33, JSON depth/nodes/
  keys, decimal bounds and the exact 100,000-step test. Cumulative logical
  work, cancellation ≤128 and atomic publication now pass under the
  independent oracle.
- Real venues are unchanged, with zero approved real pairs:
  - OKX/Binance is `UNAVAILABLE` with `MULTIPLIER_UNKNOWN` and
    `VALUE_CONVENTION_UNVERIFIED`;
  - OKX/Bybit is `UNAVAILABLE` with `MULTIPLIER_UNKNOWN`;
  - Binance/Bybit is `UNAVAILABLE` with `MULTIPLIER_UNKNOWN` and
    `VALUE_CONVENTION_UNVERIFIED`.

### 19.9 Changed files and verification record

Changes relative to the transferred commit `e3aa20e`:

- Runtime: `packages/spread-analytics/src/{admission,bounds,candidates,commands,evaluator,evidence,immutable,registry,replay,serialization,transitions}.ts`.
- Test-only support (new, excluded from the build):
  `packages/spread-analytics/src/work-oracle.ts`.
- Tests:
  - `src/fourth-acceptance-remediation.test.ts` (rewritten);
  - `src/work-accounting-oracle.test.ts` (new).
- Configuration: `packages/spread-analytics/tsconfig.json` (build exclusion of
  the oracle only).
- Documentation: this section.

No other test file, and no root manifest, lockfile, dependency, D-055, D-064,
prior acceptance report, frozen package, adapter, formula, application,
infrastructure or brand file changed.

Verification ran in a fresh materialization of the exact working tree, with
tracked and new files but without `node_modules`/`dist`, under
Node **v24.18.1** and npm **11.16.0**. That runtime is the official
checksum-verified distribution.

- `npm ci` passed: 450 added / 459 audited.
  - 450/459 versus 451/460 on macOS is consistent with platform-specific
    optional packages; the lockfile is byte-identical.
  - The audit reports eight pre-existing advisories, against seven recorded
    earlier. The difference is audit-database drift, not a dependency change.
    No advisory was remediated.
- `format:check`, `lint` and `typecheck` passed.
- `spread-analytics`: **17 files, 219/219** tests.
- Aggregate default suite: **52 source test files** (49 passed, three opt-in
  live-canary files skipped); **479 passed, 0 failed, 3 skipped**. The
  non-spread workspaces are unchanged at 260 passed.
- The all-workspace production build passed and emitted six static web
  routes: `/`, `/_not-found`, `/forgot-password`, `/login`, `/register` and
  `/verify-email`.
- Root `package.json` SHA-256 is
  `6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5` and
  `package-lock.json` is
  `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59`,
  both unchanged.
- D-055 is `60d00b8e…6d97931`, unchanged. D-064 and the four prior
  acceptance reports are byte-identical to the transferred commit.
- The brand hashes are unchanged: dark `e4a53ef9…0dbe08`, design system
  `459f2354…68c54`, logo `5050e13e…82a8c`.
- `git diff --check` and `git fsck --full` pass.

### 19.10 Limitations and capacity observation

**Corrected in the fifth remediation (section 20.9).** The earlier
statement here ("about 1,100–1,250 valid pairs with fixture-sized
identifiers") is withdrawn. It was measured with dense 33-instrument groups,
and the fifth acceptance showed it overstated three-venue capacity. Under the
[D-064 capacity-semantics decision](PHASE_2B_D064_CAPACITY_SEMANTICS_DECISION.md)
(Option A):

- structural caps (1,024 instruments, 8,192 pairs and the others) are
  ceilings only;
- all limits compose, and the stricter cumulative 100,000-step work bound may
  reject an operation below any structural ceiling, fail-closed;
- there is no minimum guaranteed capacity;
- measured capacity depends on the implementation and the workload, and is
  not normative policy.

No bound, rate or policy was widened to compensate. Cancellation
remains cooperative: a single atomic native call is charged in full before it
starts but cannot be interrupted mid-call, and no wall-clock latency is
claimed. There is zero approved real venue pair.

### 19.11 Recommendation

H-03 is technically remediated in implementation. B-01, B-02, H-01 and H-02
remain resolved. Phase 2B.1 is ready for a **fifth formal independent
acceptance review**. It is not frozen, and Phase 2B.2 remains unauthorized.

Recommended next task:

> Perform a fifth formal independent Phase 2B.1 acceptance review in the
> authoritative repository, on the working-tree state of branch
> `claude/stoic-lovelace-uxfohy` (transport base `handoff/phase-2b1-h03`,
> `e3aa20e`; neither is an acceptance commit). Treat section 19 of the
> implementation evidence as author-produced, not proof. Read AGENTS.md, D-055,
> D-064 and all four prior acceptance reports. Reproduce the acceptance-4
> short/long candidate counterexample. Independently audit every runtime
> repeated-work path for charge-before-work on the single operation budget,
> including timestamps, copies, JSON escaping, UTF-8 comparison, hash
> preparation and standalone-admission publication. Independently confirm or
> refute the test-only actual-work oracle and its negative control, and measure
> actual (not charged) work between adjacent cancellation checks against 128
> steps. Verify the 100,000-step cap, the distributed 100,001st-step failure,
> 8,192-pair atomic failure, zero post-check publication work and atomicity.
> Assess the documented pair-capacity consequence against D-064 without
> widening it. Reconfirm B-01/B-02/H-01/H-02, 22 runtime exports, 29/29
> D-055 groups and 40/40 cases, 44 unique codes, every D-064
> boundary/one-over, unchanged serialization/digest vectors and the three
> fail-closed real-venue results. Use a fresh Node 24.18.1/npm 11.16.0
> materialization with adequate disk, and run npm ci, format, lint,
> typecheck, focused and full tests, production build, Markdown/local-link
> validation, git diff --check, git fsck --full, manifest/lock hashes and all
> frozen-boundary checks. Write a new fifth acceptance report without
> modifying implementation, D-055, D-064, manifests, the lockfile, frozen
> scopes or prior reports. Do not commit and do not begin Phase 2B.2.

## 20. Fifth acceptance-remediation evidence — H-03, H-04, M-02

Remediation date: 2026-10-03. Governing finding:
[fifth independent acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_5.md)
— **FAIL**, BLOCKER 0, unresolved HIGH 2 (H-03 residual, H-04), MEDIUM M-02.
M-01 was resolved separately as accepted semantics by the
[D-064 capacity-semantics decision](PHASE_2B_D064_CAPACITY_SEMANTICS_DECISION.md)
(Option A, commit `8f35571`). B-01, B-02, H-01 and H-02 were not reopened.

This section is implementation-produced evidence. It is not formal
acceptance, a Phase 2B.1 freeze or Phase 2B.2 authorization. The following are
all unchanged:

- D-055 (`60d00b8e…6d97931`), `instrument-matching-pilot/v1`,
  `instrument-matching-resources/v1` and every D-064 numeric limit;
- the 100,000-step budget and the ≤128-step cancellation interval;
- the 44 reason codes and the 22 runtime exports;
- the manifests, lockfile and dependencies;
- every frozen scope and every prior acceptance report.

### 20.1 H-03 residual: root causes and fixes

| Acceptance-5 defect                                                                                                                | Fix                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unvalidated caller strings compared with native `!==` in `MappingLedger` invalidation binding; uncharged `#commandDigests` hashing | `validateCommandFields` bounds every command field (atomic IDs, reason text, strict timestamps, approvals ≤3) before any comparison or lookup. Equality goes through the charged `sameText`; key hashing goes through `chargeKey`.                                                                 |
| Same pattern elsewhere (admission record and history chains, transitions, evaluator, registry, replay, economics unit labels)      | Every comparison of two open strings now uses `sameText(a, b, work)`, which charges length + 1 for equal lengths before comparing. Sidecar unit labels are bounded (atomic/composite). Transition IDs are bounded before they are sorted or hashed.                                                |
| Uncharged hashing of caller strings in `Map`/`Set` operations                                                                      | Every string key passes `chargeKey`. Fixed vocabularies use `inVocabulary`, which rejects non-strings and strings longer than 64 code units in O(1) before charging the hash.                                                                                                                      |
| Proportional scans before a size check                                                                                             | `assertAtomicId`, `assertCompositeId` and `assertReasonText` reject over-length values in O(1) before scanning. Composite scans add a fine-grained charge on top of the accepted 256-code-unit step rate (stricter).                                                                               |
| Post-measured key enumeration                                                                                                      | `Object.keys` of a caller object is the only native pass whose size cannot be known in advance (no JavaScript primitive bounds it). It is charged immediately (`units(n + 1)`), and the object is rejected at more than 64 keys before any further work. This exception is documented, not hidden. |
| Evidence `JSON.stringify` before the 8 KiB check                                                                                   | See 20.4.                                                                                                                                                                                                                                                                                          |

No rate was weakened. Accounting only became stricter. Measured with
identical fixtures on `018593d` against this remediation:

| Measurement                       | Before |  After |
| --------------------------------- | -----: | -----: |
| `makeCandidate`, 10-unit base ID  |     65 |     65 |
| `makeCandidate`, 155-unit base ID |     83 |     83 |
| 496-pair generation (steps)       | 39,906 | 42,233 |
| 64-version admission (checks)     |    333 |    355 |

### 20.2 Final pre-publication checks

Every public operation follows: authoritative work → cumulative accounting →
final check → return.

- `admitRegistryRevision` now applies `beforePublication()` to both READY and
  QUARANTINED, and freezes the result before the check.
- `admitMappingCommand` now applies it to APPLIED, REJECTED and QUARANTINED.
  `EVALUATION_CANCELLED` and `MATCHING_BOUND_EXCEEDED` are rethrown as
  operation failures and are never returned as `REJECTED` results.
- Public `MappingLedger.apply`, `CuratedAssetRegistry#resolve` and `#describe`,
  `candidateProvenanceDigest` and `canonicalExposureKey` create their own
  operation budget and check before returning.
- The new suite checks 18 typed outcomes. For each one it asserts a
  publication tail of 0 oracle units, and that cancellation requested at the
  final check throws `EVALUATION_CANCELLED` with nothing published. The
  outcomes are:
  - registry READY and QUARANTINED;
  - command APPLIED, REJECTED and QUARANTINED;
  - admission VALID, REVISION_MISMATCH, INVALID_INTERVAL and QUARANTINED;
  - evaluation MATCHED, NOT_MATCHED, UNAVAILABLE and AMBIGUOUS;
  - batch;
  - replay MATCHED and UNAVAILABLE;
  - candidates;
  - evidence.

### 20.3 M-02: no caller-supplied budget authority

**Before:** these public signatures accepted an optional duck-typed budget:

- `admitMaterializedMapping`, `approveCommand`;
- the `MappingLedger` constructor and `apply`;
- the `CuratedAssetRegistry` constructor, `resolve` and `describe`;
- `candidateProvenanceDigest`, `canonicalExposureKey`.

**After:**

- Public arities are:
  - `admitMaterializedMapping(input, at, signal?)`;
  - `approveCommand(input)`, `MappingLedger#apply(command)`,
    `candidateProvenanceDigest(candidate)`, `canonicalExposureKey(identity)`;
  - `new CuratedAssetRegistry(revision)`, `resolve` with 6 parameters and
    `describe` with 3.
- Internal budgeted entry points (`…WithBudget`, `registryWithBudget`,
  `ledgerWithBudget`, `applyWithBudget`) live in their modules only. The
  package root still exports exactly the same 22 names.
- Constructors receive a parent budget only through a module-private hand-off
  that is cleared on entry.
- Ledger internals are true private methods (`#apply`, `#approve`,
  `#invalidate`).
- A tripwire proxy passed as an extra argument to every public entry point is
  never read.
- The acceptance-5 regression is covered: a fake budget plus an always-aborted
  signal now throws `EVALUATION_CANCELLED` and cannot publish `VALID`.
- `canonicalExposureKey` validates the closed identity and bounds asset IDs:
  a 5,000,000-character field is rejected with `INPUT_INVALID`.

### 20.4 Evidence validation ordering

`assertEvidenceRecord` walks the record before serializing it:

1. The walk accepts plain data only: no custom prototype, no `toJSON`.
2. It accumulates a lower bound on the serialized UTF-8 size from O(1)
   lengths, before each proportional scan.
3. It throws `MATCHING_BOUND_EXCEEDED` as soon as that bound exceeds 8 KiB.
4. Evidence-mode string scans are additionally charged at the fine-grained
   rate.
5. Only a record within the bound is serialized. The atomic `JSON.stringify` is
   precharged at its six-character escape worst case, and every prior charge
   is kept.

Regression: the acceptance-5 record with a 4,000,000-character `sourceDigest`
is now rejected with a largest native call below 1,000 units and total work
below 10,000 units (previously one 4,000,387-unit call). It makes no
`JSON.stringify` call. A valid boundary record is still accepted. The 8 KiB
boundary and one-over tests pass.

### 20.5 H-04: strict deterministic timestamps

`time.ts` accepts exactly one grammar: canonical RFC 3339 UTC with
milliseconds, `YYYY-MM-DDTHH:mm:ss.sssZ` (24 code units, years 0000–9999). The
grammar follows D-055 §13 "validated UTC millisecond".

- The length is checked before any scan; the fixed scan is charged first.
- The calendar is validated (leap years, month and day ranges, hour ≤23,
  minute and second ≤59).
- The instant is computed with integer arithmetic. `Date.parse`, `new Date`
  and `Date.UTC` no longer appear in runtime sources; the source audit
  enforces this.

Rejected forms:

- offsets, including `+00:00`, and lowercase `z`;
- missing or different fractional digits;
- zone-less, date-only, space-separated and legacy forms;
- leading or trailing junk;
- invalid calendar dates and times;
- non-ASCII digits;
- the 100,023-character legacy string, which is rejected by length with 0
  oracle units.

Evaluation and knowledge times are validated up front in `generateCandidates`,
`evaluateMatch`/`evaluateBatch`, `replayMapping` and admission (as a typed
`INVALID_INTERVAL`).

TZ matrix:

- **In-process:** the tests switch `process.env.TZ` across UTC,
  `America/New_York` and `Asia/Tokyo` and verify three distinct local offsets.
  Each zone rejects `"2026-09-15 00:00:30"`, `"2026-09-15T00:00:30"` and the
  legacy string with `EVIDENCE_TIME_INVALID`. The canonical `T30` gives
  identical `MATCHED` result IDs in all three zones.
- **Separate processes:** the whole spread-analytics suite was additionally
  run as separate processes with `TZ=UTC`, `TZ=America/New_York` and
  `TZ=Asia/Tokyo`. All three were 19/19 files and 266/266 tests.

### 20.6 Work oracle and static audit

`work-oracle.ts` (test-only, build-excluded) now also instruments:

- `Map`/`Set` `get`/`has`/`set`/`add`/`delete`, costed by key length;
- traversing `String.prototype` methods;
- `Object.assign`.

Its own bookkeeping uses unpatched primitives. `traceBudgeted` and
`maximumDeficit` record charged steps alongside actual units at every check,
and assert that actual work never runs ahead of charges (deficit ≤ 0). This
holds for registry construction, candidate generation with 160-unit assets,
64→8-version admission, command application and 100 evidence records.

Native string equality, template concatenation and object spreads cannot be
patched. A new TypeScript-checker source audit
(`work-accounting-source-audit.test.ts`) therefore requires, across every
runtime module:

- zero comparisons of two open strings outside `sameText`;
- zero uncharged string-keyed `Map`/`Set` operations;
- every spread of a caller object preceded by `chargeCopy` (or annotated as a
  fixed-shape internal record);
- every template outside error messages justified by a `// work:` annotation;
- no host `Date`.

A control module containing one violation of each class is detected, so the
audit is not vacuous. The oracle and the audit are evidence, paired with the
direct adversarial and public-operation tests below. They are not authority.

### 20.7 Exact acceptance-5 regressions

1. Forged invalidate command, seven 8,000,000-character fields:
   `REJECTED/INPUT_INVALID`.
   - No transition field is read. A tripwire proxy proves no comparison ran,
     and a bounded control does read them.
   - Charged steps do not grow with field size.
   - Total oracle work is below 10,000 units, and there is a final check.
2. Registry admission with cancellation requested after the first check:
   throws `EVALUATION_CANCELLED`. Tail 0.
3. Command admission with cancellation requested after the first check:
   throws `EVALUATION_CANCELLED`. Tail 0.
4. Mid-operation cancellation (200-version ledger) propagates as
   `EVALUATION_CANCELLED`. Budget exhaustion propagates as
   `MATCHING_BOUND_EXCEEDED`, never as a `REJECTED` reason.
5. Oversized evidence record: rejected before `JSON.stringify` (20.4).
6. Local timestamp `"2026-09-15 00:00:30"`: rejected identically in all three
   zones. The canonical timestamp gives an identical result in all three.
7. 100,023-character legacy date: rejected in O(1).
8. Fake caller budget plus already-aborted signal: throws
   `EVALUATION_CANCELLED`, so no `VALID` is published.

### 20.8 Changed files

- **Runtime:** `packages/spread-analytics/src/{admission,bounds,candidates,commands,diagnostics,economics,evaluator,evidence,registry,replay,serialization,transitions,validation}.ts`
  and new `time.ts`. `diagnostics.ts` changed by comment annotation only.
  `index.ts`, `policy.ts`, `reasons.ts` and `model.ts` are unchanged.
- **Test-only support:** `work-oracle.ts`.
- **Tests:**
  - new `fifth-acceptance-remediation.test.ts` (40 tests);
  - new `work-accounting-source-audit.test.ts` (7 tests);
  - updated `fourth-acceptance-remediation.test.ts` and
    `work-accounting-oracle.test.ts`, to the internal budgeted entry points and
    the strict-timestamp behaviour;
  - updated `third-acceptance-remediation.test.ts`, whose exact cap test is
    re-derived from the stricter composite rate rather than a hard-coded
    prefill.
  - `d055-scenarios.test.ts` and `serialization.test.ts` are unchanged.
- **Documentation:** this section and the §19.10 correction.

### 20.9 Capacity (M-01 reliance conditions)

Measured after remediation with fixture identifiers, informational only and not
normative:

- 1,023 instruments with zero pairs fail at 100,000 steps;
- the largest fully matchable three-venue universe is 447 instruments / 447
  pairs (99,403 steps), and 450 fails;
- the largest zero-pair three-venue universe is 564 instruments;
- the 496-pair dense batch publishes at 42,233 steps.

The lower figures follow from the stricter accounting. This is permitted under
Option A, and no bound was widened.

Public-operation regressions assert typed `MATCHING_BOUND_EXCEEDED` with no
publication, and unchanged inputs and registry revision, for:

- 1,024 instruments;
- 1,023 instruments with zero pairs.

1,025 instruments remains a structural one-over rejection. A small 60-pair
universe still publishes completely.

The reliance conditions are met as follows:

1. §19.10 is corrected.
2. The regressions above are in place.
3. Rates are internal and no less conservative (20.1).
4. H-03 is technically remediated (20.1–20.7).

### 20.10 Regression gates and verification record

- **B-01, B-02, H-01:** the third-remediation, governance and
  second-remediation suites all pass.
- **H-02:** 22 runtime exports; no wildcard export.
- **D-055:** 40/40 scenario cases, covering 29/29 groups.
- **Reason codes:** 44 unique, none new.
- **Golden vectors:** the serialization golden vector is unchanged. A
  cross-version probe gives combined digest
  `abba05409b74fb53d3d87d99db66c71c85b0a2fcdbcbe58e862accaf2c871f90` for
  candidate IDs, evidence digests, exposure keys, history digest, replay
  revision and batch result IDs. That is identical to `018593d` and `e3aa20e`.
- **Real venues:**
  - OKX/Binance: `UNAVAILABLE` with `MULTIPLIER_UNKNOWN` and
    `VALUE_CONVENTION_UNVERIFIED`;
  - OKX/Bybit: `UNAVAILABLE` with `MULTIPLIER_UNKNOWN`;
  - Binance/Bybit: `UNAVAILABLE` with `MULTIPLIER_UNKNOWN` and
    `VALUE_CONVENTION_UNVERIFIED`;
  - zero approved real pairs.
- **spread-analytics:** **19 files, 266/266 tests**.

The full-repository verification record is section 20.12.

### 20.11 Limitations

- Cancellation is cooperative. One atomic native call cannot be interrupted
  mid-call, and no wall-clock latency is claimed.
- Caller-object own-key enumeration is charged immediately after its single
  native pass. It is the documented exception (20.1).
- The oracle and the source audit are evidence, not proof.
- Measured capacity is lower than before and is not guaranteed (Option A).
- Phase 2B.1 is ready for a sixth independent acceptance review. It is not
  frozen, and Phase 2B.2 is not authorized.

### 20.12 Verification record

The verification ran in a fresh copy of the exact working tree, with tracked
and new files byte-identical and without `node_modules` or `dist`. The runtime
was Node **v24.18.1** and npm **11.16.0**, checksum-verified against the
official `SHASUMS256.txt`.

**Install:**

- `npm ci` exit 0: 450 added / 459 audited.
- `npm audit` reports 13 pre-existing advisories (2 moderate, 10 high,
  1 critical), against 8 on 2026-10-02. The lockfile is byte-identical, so the
  difference is audit-database drift. No dependency changed.
- `npm query`: 451 packages; 8 workspaces.

**Quality and tests:**

- `format:check`, `lint`, `typecheck`, full `npm test` and `npm run build`:
  all exit 0.
- Full default suite: **54 source test files** (51 passed, 3 opt-in
  live-canary files skipped); **526 passed, 0 failed, 3 skipped**.
  - contracts 4;
  - market-data 57;
  - spread-analytics 266;
  - OKX 52 (+1 skipped);
  - Binance 72 (+1 skipped);
  - Bybit 69 (+1 skipped);
  - web 6.
- Build: six static routes (`/`, `/_not-found`, `/forgot-password`, `/login`,
  `/register`, `/verify-email`).
- Focused run: fifth-remediation, source audit, oracle, D-055 scenarios,
  bounds and candidate bounds give 6 files, **132/132** tests.
- TZ matrix as separate processes (`TZ=UTC`, `America/New_York`,
  `Asia/Tokyo`): 19/19 files and 266/266 tests each.

**Public surface (fresh `dist/index.js`):**

- 22 runtime exports and no wildcard;
- deep imports, including `dist/time.js`, return
  `ERR_PACKAGE_PATH_NOT_EXPORTED`;
- the oracle is absent from `dist`;
- 44 unique reason codes.

**Repository checks:**

- Markdown local links: 76 files, 96 links, 74 local, 1 anchor, 0 broken.
- `git diff --check` and `git fsck --full` pass.
- Root `package.json` is `6282c135…776ad5` and `package-lock.json` is
  `810aaa67…ee3d59`, both unchanged.
- D-055 (`60d00b8e…6d97931`), D-064 (`85fb7792…5e8fbe8`), the
  capacity-semantics decision (`98552f5d…aa47bab`) and acceptance reports 1–5
  are unchanged.
- Brand hashes are unchanged: dark `e4a53ef9…0dbe08`, design system
  `459f2354…68c54`, logo `5050e13e…82a8c`.
- The diff from `8f35571` is empty for every frozen package, `apps`, `infra`
  and `docs/brand`.

## 21. Pre-freeze hardening evidence — N-01, L-02, L-03, L-04

Hardening date: 2026-10-04. Governing review:
[sixth independent acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_6.md)
gave **PASS_WITH_WARNINGS**, BLOCKER 0 and unresolved HIGH 0. It said
Phase 2B.1 may freeze, with open warnings N-01 (MEDIUM) and L-01 to L-04 (LOW).
Product explicitly chose **HARDEN FIRST**: no freeze tag before this hardening
and a fresh independent re-acceptance (ACCEPTANCE_7).

This section is implementation evidence only. It is not acceptance and not a
freeze. The following are unchanged:

- D-055, D-064 and the capacity-semantics decision (Option A);
- the 100,000-step budget and the ≤128-step cancellation interval;
- the 44 reason codes and the 22 runtime exports;
- the manifests, lockfile and dependencies;
- every frozen scope and acceptance reports 1–6.

L-01 (historic Markdown hard-break spaces) is out of scope.

### 21.1 N-01 root cause

Validation read caller-owned properties. Later code then reread the same
caller objects: spreads for the frozen copies, index-based `map`, iterators
and repeated property access. An accessor property, an own
`Symbol.iterator` or a duck-typed decimal could therefore show one value to
validation and another to matching, hashing or publication. In the worst
case, admission returned `VALID` and `evaluateMatch` returned
`MATCHED/COMPATIBLE_APPROVED` for a pair that was never approved.

### 21.2 Snapshot boundary design

New module `snapshot.ts`. At every public operation, before any validation,
the caller input is turned into exactly one deep, passive, frozen snapshot.
All later authoritative work uses only that snapshot: validation, identity,
lookup, approvals, comparison, economics, serialization, hashing, evidence,
returned fields and publication.

| Public operation                                                   | Boundary                                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generateCandidates`                                               | Snapshot of the instrument list. Registry brand check.                                                                                                             |
| `evaluateMatch` / `evaluateBatch`                                  | `snapshotRecord` of each evaluation input; `snapshotList` of the batch, read by index. Registry brand check. A supplied candidate is validated before use or echo. |
| `admitMaterializedMapping` (and inside evaluation)                 | Snapshot of the whole admission input at the start of `admitWithBudget`.                                                                                           |
| `admitRegistryRevision` / `new CuratedAssetRegistry`               | Snapshot of the revision inside the constructor; state is built only from it.                                                                                      |
| `admitMappingCommand` / `MappingLedger#apply`, `new MappingLedger` | Ledger brand check; snapshot of the command, versions and transitions.                                                                                             |
| `approveCommand` / `invalidateCommand`                             | Snapshot of the input.                                                                                                                                             |
| `validateEvidenceBundle`                                           | Snapshot of records and subjects.                                                                                                                                  |
| `replayMapping`                                                    | `snapshotRecord`. The admitted history is a trusted, authenticated handle.                                                                                         |
| `candidateProvenanceDigest`, `canonicalExposureKey`, `normalize*`  | Snapshot, or authentic-decimal materialization.                                                                                                                    |

The trusted handles are a genuine registry, a genuine ledger, an admitted
history and a cancellation signal. They are taken by reference and
authenticated with private brand checks. A cancellation signal is read once as
an own data property. It remains the caller's live cancellation source by
design.

### 21.3 Descriptor, prototype, iterator and decimal policy

- **Accessors:** every own property is read once, through its descriptor.
  Accessor descriptors, non-enumerable keys and symbol keys are rejected with
  the existing typed `INPUT_INVALID`. Getters are never executed. Regressions
  record zero getter invocations.
- **Prototypes:** only plain objects (prototype `Object.prototype` or `null`),
  genuine arrays and genuine decimals are accepted. Class instances,
  functions, symbols, bigints and Map/Set/Date objects are rejected. The
  snapshot's own objects are created with non-writable, non-configurable,
  enumerable own properties and are frozen.
- **Arrays:** the array must have the `Array.prototype` prototype. Its own keys
  must be exactly its indices plus `length`, so an own iterator, extra keys or
  holes are rejected. It is copied by index through descriptors, and no
  caller iterator is ever invoked.
- **Decimals:** the value must have the exact `ExactDecimal.prototype` and
  exactly two own data fields: `coefficient` (bigint) and `scale` (safe
  integer).
  - It is rebuilt with `ExactDecimal.fromParts`, which re-validates the frozen
    domain bounds, and frozen.
  - Non-normalized parts are refused as forged, since genuine decimals are
    always normalized.
  - Duck-typed objects, prototype spoofs with accessors or extra behaviour,
    and strings are refused.
  - No floating point is introduced.
- **Proxies:** a Proxy is not detected. Correctness does not depend on
  detecting one, because its descriptor trap is consulted once per property
  and only the snapshot is used afterwards. The regression demonstrates this.
- **Depth:** depth is bounded at 16 with `MATCHING_BOUND_EXCEEDED`, which
  also bounds cycles. Arrays and objects keep their existing count limits.

### 21.4 L-02, L-03, L-04

- **L-02:** `replayMapping` validates `mode` at runtime against the closed set
  `AS_KNOWN` and `CORRECTED`. Any other string, number, object, array, `null`,
  `undefined` or accessor-backed mode fails with `INPUT_INVALID`. No new mode
  and no new code.
- **L-03:**
  - `evaluateMatch` validates a supplied candidate before using it: closed
    shape, bounded identifiers, strict timestamps, closed reasons, current
    policy. It echoes only the frozen snapshot, never the caller object.
  - A registry or ledger that is not a genuine instance (a plain object, a
    prototype spoof or a Proxy) is refused before any exit. A forged revision
    can therefore never be published, including on the earliest
    `NOT_MATCHED` exit.
- **L-04:** with passive snapshots in place, a `TypeError`/`RangeError` raised
  while consuming caller input comes only from a malformed caller shape. It
  becomes the existing typed `INPUT_INVALID`:
  - a thrown failure at throwing operations;
  - `INVALID_PROVENANCE/INPUT_INVALID` from admission;
  - `REJECTED/INPUT_INVALID` from command admission.

  `MatchingFailure`, including `EVALUATION_CANCELLED` and
  `MATCHING_BOUND_EXCEEDED`, and every other error propagate unchanged. A
  regression asserts that cancellation and budget exhaustion are not
  swallowed.

### 21.5 Work accounting

Snapshot work is charged to the operation budget as it happens:

- 4 units per node;
- 3 units per property or element, covering the descriptor read, definition
  and freeze;
- the own-key enumeration (accepted limitation A-02);
- 8 units per decimal.

There is no budget reset; snapshots use the parent operation budget. All
snapshot work precedes the final check: publication-tail and final-check
regressions pass for every typed outcome. Accounting only became stricter.
Measured with identical fixtures against `1e091f9`:

| Measurement                   | Before | After |
| ----------------------------- | -----: | ----: |
| 496-pair generation (checks)  |    331 |   333 |
| 64-version admission (checks) |    356 |   361 |

The precharge-deficit tests (actual work never ahead of charges) and the
source audit (which now covers `snapshot.ts`) pass.

### 21.6 Exact adversarial regressions

New `sixth-acceptance-hardening.test.ts` (15 tests) covers the following.

**N-01 vectors:**

- **The material case**, with accessors on mapping instrument IDs and six
  candidate revision/digest fields, swept over 7 switch points: evaluation
  throws `INPUT_INVALID`, admission returns `INVALID_PROVENANCE/INPUT_INVALID`
  with no history, and getter reads are 0. It can never be `MATCHED`.
- **A Proxy that answers differently on later descriptor reads:** each field
  is read exactly once, with no `get`-trap reads, and the result is not
  `MATCHED`.
- **Identity and canonical-asset getters:** refused, with 0 reads.
- **Mapping and approval identifier getters:** refused.
- **The exposure-key getter** (which used to give a 2,000,106-character key):
  refused, with 0 reads.
- **Economics:** a getter on the payoff and four fake decimals are refused:
  - a duck-typed object;
  - a prototype spoof with accessor fields;
  - a prototype spoof with forged non-normalized parts;
  - a prototype spoof with extra behaviour.
- **Registry getters and own custom iterators** (the acceptance-6 vector): 0
  getter reads and 0 iterations. Own iterators, holes and extra keys in
  candidate and batch lists are refused.
- **Caller mutation mid-operation** (rewriting every caller object at the
  second poll): the result ID is identical to the honest run, and the
  published candidate and mapping are frozen trusted copies.
- **Evidence and command getters**, including the 4,000,000-character
  `sourceDigest` switch: refused with 0 reads, so no stringify runs.

**L-02:** two valid modes; eight invalid modes; an accessor-backed mode.

**L-03:**

- the echoed candidate is a frozen copy that is not the caller object and
  cannot be changed by later mutation;
- malformed candidates are refused;
- candidate timestamps are strict;
- fake registries (plain object, prototype spoof, Proxy) and a fake ledger
  are refused.

**L-04:**

- 33 malformed-input calls across every public operation give typed
  `INPUT_INVALID`, never a raw `TypeError`;
- five typed-outcome cases return typed rejections;
- cancellation and budget exhaustion still propagate;
- passive frozen and plain-cloned inputs give identical result IDs.

**Updated authored tests:**

- `fifth-acceptance-remediation.test.ts`: the forged-command proxy now
  verifies exactly one descriptor read per field and zero `get` reads.
- `fourth-acceptance-remediation.test.ts`: the WorkBudget-root inventory text
  for the evaluator and replay entries.

### 21.7 Results, files and limitations

**Results:**

- spread-analytics: **20 files, 281/281 tests**.
- D-055: 40/40 cases, 29/29 groups.
- Reason codes: 44, none new.
- Exports: 22, with `index.ts` unchanged.
- The cross-version digest probe still gives `abba0540…1f90`, identical to
  `1e091f9`, `018593d` and `e3aa20e`. The golden vector is unchanged.
- Real venues are unchanged, with zero approved pairs.

**Changed files:**

- **Runtime:** `packages/spread-analytics/src/{admission,candidates,commands,economics,evaluator,evidence,registry,replay,serialization}.ts`
  and new `snapshot.ts`.
- **Tests:** new `sixth-acceptance-hardening.test.ts`; updated
  `fifth-acceptance-remediation.test.ts` and
  `fourth-acceptance-remediation.test.ts`.
- **Documentation:** this section.

**Remaining accepted limitations:**

- A-01: cooperative cancellation.
- A-02: own-key enumeration is charged immediately after its single native
  pass.
- A-03: zero approved real pairs.
- Proxies are not detected. They are neutralized by single reads.
- Globally patched built-ins (for example `WeakSet.prototype.has`) remain
  outside any in-library control.

The full-repository verification record is section 21.8.

### 21.8 Verification record

The verification ran in a fresh copy of the exact working tree, byte-identical
and without `node_modules` or `dist`. The runtime was Node **v24.18.1** and
npm **11.16.0** (checksum-verified official build).

**Install:**

- `npm ci` exit 0: 450 added / 459 audited.
- 13 pre-existing advisories (2 moderate, 10 high, 1 critical). The lockfile is
  byte-identical, so this is audit-database drift, not a dependency change.
- `npm query`: 451 packages.

**Quality and tests:**

- `format:check`, `lint`, `typecheck`, `npm test` and `npm run build`: all
  exit 0.
- Full default suite: **55 source test files** (52 passed, 3 opt-in
  live-canary files skipped); **541 passed, 0 failed, 3 skipped**.
  - contracts 4;
  - market-data 57;
  - spread-analytics 281;
  - OKX 52 (+1 skipped);
  - Binance 72 (+1 skipped);
  - Bybit 69 (+1 skipped);
  - web 6.
- Build: six static routes.
- TZ matrix as separate processes (`UTC`, `America/New_York`, `Asia/Tokyo`):
  281/281 each.
- Focused suites: 181/181. They cover:
  - sixth hardening, fifth remediation and third remediation;
  - the source audit and the oracle;
  - D-055 scenarios, bounds, candidate bounds, governance, reasons and
    serialization.

**Public surface (fresh `dist/index.js`):**

- 22 runtime exports;
- 44 unique reason codes;
- deep imports, including `dist/snapshot.js`, return
  `ERR_PACKAGE_PATH_NOT_EXPORTED`;
- the oracle is absent from `dist`.

**Repository checks:**

- Markdown local links: 77 files, 107 links, 85 local, 1 anchor, 0 broken.
- `git diff --check` and `git fsck --full` pass.
- These are unchanged:
  - `package.json` (`6282c135…`) and `package-lock.json` (`810aaa67…`);
  - D-055 (`60d00b8e…`), D-064 (`85fb7792…`) and the capacity decision
    (`98552f5d…`);
  - acceptance reports 1–6 (ACCEPTANCE_6 `7d4d8773…`);
  - the brand hashes.
- The diff from `4becf10` is empty for every frozen scope.

## 22. Authority-boundary hardening evidence — N-02, N-03, L-05, L-06

Hardening date: 2026-10-19. Governing review:
[seventh independent acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_7.md)
(review of `18e2772`, recorded at `8d17682`) gave **FAIL**, BLOCKER 0 and
unresolved HIGH 0. N-01 and L-03 stayed open because of N-02. It also opened
N-03 (MEDIUM), L-05 (LOW) and L-06 (LOW).

This section is implementation evidence only. It is not acceptance and not a
freeze. Its claims are to be tested by a fresh independent ACCEPTANCE_8. The
following are unchanged:

- D-055, D-064 and the capacity-semantics decision (Option A);
- the 100,000-step budget and the ≤128-step cancellation interval
  (`policy.ts` and `bounds.ts` are byte-identical);
- the 44 reason codes (same order and contents) and the 22 runtime exports
  (`index.ts` is byte-identical);
- the manifests, lockfile and dependencies;
- every frozen scope and acceptance reports 1–7.

### 22.1 Corrections to section 21

Section 21 is kept as written. ACCEPTANCE_7 disproved three of its claims:

- §21.3: "Getters are never executed."
- §21.4: "A forged revision can therefore never be published, including on
  the earliest `NOT_MATCHED` exit."
- §21.2: the trusted handles are "authenticated with private brand checks"
  (offered as if authentication were enough).

**Why they were incomplete.** The claims held for caller _data_, which is
snapshotted. They did not hold for the four trusted _handles_ taken by
reference: a genuine `CuratedAssetRegistry`, a genuine `MappingLedger`, an
admitted history and the cancellation signal. A private brand check proves
that an object is a genuine instance. It says nothing about that object's
public fields. The registry's `revision` and the ledger's `versions` and
`transitions` were ordinary writable, configurable own properties. Operations
read them again after the brand check: three times in `evaluateMatch`, twice
in `generateCandidates`, and repeatedly in `MappingLedger#apply`. So a getter
installed on a genuine registry did execute, and an assigned 100,000-character
revision was published, including on the earliest `NOT_MATCHED` exit.

§21.5 is also corrected. "Snapshot work is charged" did not hold for decimals:
`ExactDecimal.fromParts` ran its normalization before any bound and was
charged a flat 8 units (N-03).

### 22.2 N-02 root cause

Authority lived in mutable public state that operations read after the
boundary. Three things were missing:

1. immutability of the handle after construction;
2. one read of authoritative metadata per operation;
3. ownership of returned records. An idempotent re-apply returned whatever
   object it found in the public `versions` array, which could be a caller
   object.

### 22.3 Registry authority redesign (`registry.ts`)

- **Private state.** All authoritative state is private:
  - `#revisionId`, the validated revision string;
  - `#bindingsByKey`, `#aliasesByAsset` and `#assetsById`.

  Nothing outside the class can reach it.

- **Public view.** `revision` is a `declare`d field. The constructor defines it
  once with `Object.defineProperty`: enumerable, **non-writable,
  non-configurable**. Its value is the deeply frozen, null-prototype revision
  snapshot. No TypeScript-only `readonly` is relied on.
- **Freezing.**
  - A direct instance is frozen (`Object.freeze(this)`).
  - `CuratedAssetRegistry.prototype` and the class are frozen at module load,
    so no prototype getter or method replacement can be installed.
  - A subclass instance cannot be frozen by the base constructor, because its
    own fields are defined later. Its `revision` is still non-redefinable, and
    no operation reads it.
- **No operation reads the public field.** `trustedRegistryRevision(registry,
work)`:
  1. brand-checks the handle;
  2. reads `#revisionId` once;
  3. re-validates and bounds it as an atomic identifier, charged to the
     operation budget;
  4. returns the string.
- **Resolution results** from `#resolve` are frozen null-prototype records.

### 22.4 Ledger authority redesign (`commands.ts`)

- **Private state.** `#versions`, `#transitions` and `#commandDigests` are
  `readonly` private fields set once in the constructor.
- **Command-digest state.** The command-digest map of a derived ledger is
  handed to the constructor through the same internal hand-off as the budget
  (`ledgerWithBudget(…, commands)`). It is no longer assigned after
  construction.
- **Public views.** `versions` and `transitions` are `declare`d fields, defined
  once as non-writable, non-configurable own data properties over the same
  deeply frozen arrays.
- **Freezing.** A direct instance is frozen, and `MappingLedger.prototype` and
  the class are frozen.
- **No operation reads the public views.** `#apply` reads the three private
  fields once into locals and uses only those. `#approve` and `#invalidate`
  read only the private, immutable fields.

### 22.5 One-read authority snapshot

At the start of each operation:

```
trusted authority
→ brand check
→ read private authoritative metadata once
→ validate and bound (charged)
→ operation-local immutable value
→ used for every later comparison, hash and publication
```

- **`evaluateMatch` / `evaluateBatch`:** `snapshotEvaluationInput` returns a
  frozen `{ input, registryRevision }`. It does so before any exit can be
  formed. `result()` takes the revision string, not the registry. The mapping
  binding check compares against the same local.
- **`generateCandidates`:** `generateCandidatesWithBudget` reads the revision
  once and passes it to every candidate (`makeCandidateWithRevision`). The
  internal `makeCandidate(…, registry, …)` helper does its own single trusted
  read.
- **Ledger:** private state is read once per `#apply`.

So a getter, an assignment, a mid-operation mutation from inside the signal
poll, or a subclass prototype getter can neither change nor be published as
the registry revision.

### 22.6 Returned-mapping ownership

- **Idempotent re-apply.** It returns the ledger's own frozen, null-prototype
  record from `#versions`. That record was built by the ledger from its own
  snapshot. It is never the caller command or mapping object.
- **First approval.** It now returns the new ledger's own record:
  `result.mapping === result.ledger.versions.at(-1)`.
- **Invalidation.** It returns the ledger's internal approved record.
- **Caller mutation.** Mutating the caller's command, inputs or construction
  arrays after the call changes nothing.

### 22.7 N-03 decimal prevalidation (`snapshot.ts`)

`snapshotDecimal` runs these checks in order, and all of them happen before
`ExactDecimal.fromParts` or any other reconstruction:

1. **Authenticity.** The exact `ExactDecimal.prototype` is required (checked
   by `copy`/`trustedDecimal`). Exactly the two own keys are required, each
   read once through its descriptor as enumerable data.
2. **Types.** `coefficient` must be a bigint and `scale` a safe integer.
3. **Scale domain.** `0 ≤ scale ≤ 78`.
4. **Coefficient domain.** `-10^78 < coefficient < 10^78`, checked by bigint
   comparison with a precomputed bound. A comparison with a different-length
   operand is decided by its length, so a 100,000-digit coefficient is
   rejected without a digit pass, division or `toString`.
5. **Normal form.** `0` must have scale `0`. With `scale > 0`, the coefficient
   must not end in `0`. This is one remainder of an at most 78-digit value.
   `fromParts` therefore never runs its normalization loop.

Every rejection is the existing typed `INPUT_INVALID`. No new reason code is
added. The budget-free helpers (`normalizeBaseExposure`,
`normalizeQuoteNotional`, via `trustedDecimal`) use the same gates.

### 22.8 Decimal work accounting

- 8 units for the authenticity checks, as before but now inside
  `snapshotDecimal`.
- `DECIMAL_REBUILD_UNITS` = 4 × (78 + 78) = **624 units**, charged **before**
  the rebuild. This is the bounded maximum for 78 digits and scale 78: one
  remainder test, the digit-count pass, construction, the parts comparison
  and the freeze. Reconstruction cost scales with digits, and digits are
  bounded at 78 by step 4, so the charge is the maximum-digit charge. A huge
  digit count can never meet a small fixed charge, because it is rejected
  before reconstruction.
- **Cancellation and budget exhaustion come first.** With 127 steps spent and
  the signal aborted, the rebuild charge crosses the 128-step check and
  `EVALUATION_CANCELLED` is thrown. With 99,998 steps spent,
  `MATCHING_BOUND_EXCEEDED` is thrown. `fromParts` is not called in either
  case (regression).

| Probe (`evaluateMatch`, spoofed multiplier) | `8d17682`                            | This hardening              |
| ------------------------------------------- | ------------------------------------ | --------------------------- |
| 10^100,000 / scale 100,000                  | 3,649 ms, 1 poll, `INPUT_INVALID`    | **0.5 ms**, `INPUT_INVALID` |
| `fromParts` on the rejected parts           | yes (normalizes ~100,000 iterations) | **never**                   |

### 22.9 L-05 null-prototype policy

**Rule.** Every trusted plain-data record is a frozen own-property copy with a
**null prototype**, and every presence check uses own-property semantics.

- **Snapshots** (`snapshot.ts`). `copy` and `snapshotRecord` build
  `Object.create(null)` records, so an absent optional input field (`mapping`,
  `candidate`, `signal`, …) reads as `undefined`. It is never an inherited
  `Object.prototype` value.
- **Descriptors.** A property descriptor is an ordinary object. `descriptor()`
  and `readOwnData()` now require `Object.hasOwn(found, "value")`, so a
  polluted `Object.prototype.value` cannot disguise an accessor as data.
- **Internal and published records.** A new helper, `frozenRecord`
  (`immutable.ts`), copies into a frozen null-prototype object. It is used by:
  - every immutable copy (mapping, approval, review, candidate, provisional
    identity, registry assets, bindings, aliases and revision);
  - every transition record;
  - admitted histories;
  - command, admission, evaluation, replay and registry results;
  - candidate-resolution records (`role`, the resolved instrument, the
    exposure identity);
  - evidence records.

  `chargeCopy` now charges 4 units per key instead of 3, for the extra copy
  pass.

- **`createTransitionRecord`** copies its input into a null-prototype record
  first. Before this change, an internal literal without `successorVersion`
  let a polluted `Object.prototype.successorVersion` reject a valid
  invalidation. The new pollution sweep found this.
- **Shape checks.** `assertClosedKeys` (`validation.ts`) and `assertShape`
  (`admission.ts`) use `Object.hasOwn`, so an inherited key never satisfies a
  required field.

**Audited names.** These are polluted together in the regression: `mapping`,
`revision`, `reasonCode`, `status`, `candidate`, `approval`, `approvals`,
`transition`, `transitions`, `identity`, `provenance`, `provisionalIdentity`,
`priorVersion`, `supersededBy`, `invalidationReference`, `exposureKey`,
`successorVersion`, `reference`, `reasonText`, `reason`, `asset`,
`confidence`, `productClass`, `contractType`, `valueConvention`,
`exposureUnit`, `description`, the three optional timestamps, `history`,
`registry`, `signal`, `state`, `value`, `kind`, `mode`, `commandDigest`,
`registryRevision` and `mappingVersion` (40 names).

Under that pollution, the full workflow is byte-identical to the clean run.
It covers matching, approval, replay, serialization and publication. All
polluted names are deleted in `finally`.

### 22.10 L-06 frozen catalogue

`MATCH_REASON_CODES` is `Object.freeze([...] as const)`. Its 44 codes keep the
same order and contents, and the `MatchReasonCode` type is unchanged.

- `Object.isFrozen` is `true`.
- `push`, `splice`, `pop`, `sort`, index replacement, `length = 0` and
  `defineProperty` each throw `TypeError`, and leave the list unchanged.
- A candidate carrying `BOGUS_CODE` stays `INPUT_INVALID`.
- `MATCHING_LIMITS` and the special-family list were already frozen. No other
  array is exported.

### 22.11 N-01 / L-03 final closure (implementer's assessment)

The whole class was rechecked:

| Vector                                                       | Result                                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Caller getter changes the candidate / mapping                | refused `INPUT_INVALID`, 0 getter reads                                    |
| Registry getter changes the revision                         | getter cannot be installed (`TypeError`); 0 reads; honest result ID        |
| Subclass prototype getter on `revision`                      | shadowed by the own non-configurable field; 0 reads                        |
| 100,000-character revision assignment                        | `TypeError`; published revision `registry-v1` on every exit                |
| Mutation from inside the cancellation poll                   | refused on every poll; result ID identical to the honest run               |
| Ledger `versions` replaced / pushed / getter / element write | `TypeError`; idempotent re-apply returns the internal record               |
| Custom own iterator on the instrument list                   | refused, 0 iterations                                                      |
| Fake / oversized / non-normalized decimal                    | refused before any rebuild (N-03)                                          |
| Prototype pollution (40 names)                               | byte-identical workflow                                                    |
| Repeated command                                             | returns `ledger.versions[0]`, frozen, null prototype                       |
| Post-return caller mutation                                  | published candidate, mapping and ledger state unchanged                    |
| Fake registries (plain, prototype spoof, Proxy)              | refused `INPUT_INVALID` on the earliest exit                               |
| `MATCHED` publication                                        | `registryRevision === mappingVersion.registryRevision` in every regression |

No authoritative output derives from caller-owned mutable state after the
boundary snapshot. No result returns an authoritative caller object by
reference. N-01 and L-03 are therefore offered for closure. The verdict
belongs to ACCEPTANCE_8.

### 22.12 Exact adversarial regressions

New `seventh-acceptance-hardening.test.ts` (**19 tests**):

- **N-02 registry (6).**
  1. A getter cannot be installed on the instance or on the frozen prototype;
     0 reads, `MATCHED`, honest result ID.
  2. A subclass prototype getter that returns different revisions is never
     read, on `MATCHED`, early `NOT_MATCHED` and `generateCandidates`.
  3. A 100,000-character assignment is refused on direct and subclass
     instances, and every published revision is `registry-v1` and at most 160
     characters.
  4. The earliest `NOT_MATCHED` exit is honest, and fake registries carrying
     the oversized revision are refused.
  5. On `MATCHED`, a mid-operation mutation from the signal poll is refused,
     and the published revision equals the mapping's.
  6. Redefinition after construction is refused: `setPrototypeOf`, a new
     property, a method on the instance, a prototype method, and a static.
- **N-02 ledger (2).**
  - 6/10: ten mutation and redefinition attempts each throw `TypeError`. The
    idempotent re-apply returns the internal record, and the getter is read 0
    times.
  - 7/8: repeated commands (three paths) return `ledger.versions[0]`, frozen
    with a null prototype. Post-return mutation of the caller command, inputs
    and construction arrays has no effect. The invalidation returns the
    internal record.
- **N-03 (3).** Each of these is refused: 100,000-digit coefficient (scale
  100,000 and scale 0), mutated genuine 100,000 digits, ±10^78 (one over),
  scale 10^9, `MAX_SAFE_INTEGER`, 79, −1, 1.5, `NaN`, `"0"`, a number
  coefficient, an extra key, three non-normalized forms, and a duck-typed
  fake.
  - For each one, an isolated `snapshotInput` **never calls `fromParts`**
    (spy). The public `evaluateMatch` is refused in under 250 ms, and only
    in-domain normalized parts ever reach `fromParts`. The budget-free helper
    gives the same result.
  - The largest in-domain values (10^78 − 1 at scale 78, −(10^78 − 1), 1 at
    scale 78, and 0) are accepted. `fromParts` sees the 624-unit charge
    already applied.
  - Cancellation and budget exhaustion are thrown before reconstruction.
- **L-05 (5).**
  - `Object.prototype.mapping` cannot approve: the result is honest
    `UNAVAILABLE/MAPPING_UNAPPROVED`.
  - Polluted `candidate`, `revision`, `reasonCode` and `status` are inert.
  - An inherited key never satisfies a required field (admission and
    registry).
  - A polluted `value` cannot disguise an accessor.
  - The 40-name sweep leaves the workflow byte-identical.
- **L-06 (2).** The catalogue is frozen with 44 unique codes in order, and
  nine mutation attempts each throw. A bogus reason is refused, and there are
  exactly 22 exports.
- **N-01/L-03 class sweep (1).** It covers the getter, the iterator,
  post-return mutation, frozen null-prototype results and revision equality.

**Non-vacuity.** The same file was run against the unfixed baseline `8d17682`
in a disposable worktree. **18 of 19 tests fail there.** The one that passes
is the fake-registry guard, which was already closed at `18e2772`.

### 22.13 Results, digests and capacity

- **spread-analytics:** **21 files, 300/300 tests** (281 earlier plus 19 new).
  No earlier test was changed.
- **D-055:** 40/40 authored cases and 29/29 groups. **Reason codes:** 44.
  **Exports:** 22.
- **Material digest.** An identical cross-version probe was run on `8d17682`
  and on this tree. It renders own properties only. It covers:
  - candidates, and `MATCHED`, unmapped, same-venue and echoed evaluations;
  - batch, admission and both replays;
  - approve and invalidate commands, `APPLIED`, idempotent and `REJECTED`;
  - registry admission, exposure key, provenance digest, evidence and
    decimal normalization.

  Both give
  `0446650e7542ab427800c35d6bdb6a1d2b0464c5ce3612cf9761e9ccd11cddeb`. The
  golden vector and the serialization and determinism suites are unchanged.

- **Real venues.** The probe is identical to `8d17682`:
  - OKX↔Binance: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
    `VALUE_CONVENTION_UNVERIFIED`];
  - OKX↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`];
  - Binance↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
    `VALUE_CONVENTION_UNVERIFIED`].

  This holds with and without a fixture mapping. There are zero approved real
  pairs.

- **Work accounting (polls, `8d17682` → now).**
  - `MATCHED` evaluation: 14 → 14.
  - Early `NOT_MATCHED`: 3 → 3.
  - 20-instrument generation: 124 → 126.
  - Admission: 11 → 11.
  - 1,024 instruments: 782 → 782, then typed `MATCHING_BOUND_EXCEEDED`.

  Charges only increased: the trusted revision validation, 4 units per copied
  key, and 624 units per decimal. Every new pass is charged to the same
  operation budget, with no nested budget and no reset. The constructor
  `defineProperty` and freeze calls, and the fixed-shape `frozenRecord`
  copies, are O(1). Nothing new follows the final `beforePublication()`. The
  source audit, oracle, publication-tail and cancellation-interval suites
  pass unchanged. Under Option A, no minimum capacity is claimed.

### 22.14 Changed files

- **Runtime:** `packages/spread-analytics/src/{admission,candidates,commands,evaluator,evidence,immutable,reasons,registry,replay,snapshot,transitions,validation}.ts`.
- **Tests:** new `seventh-acceptance-hardening.test.ts`.
- **Documentation:** this section.

### 22.15 Remaining limitations

- A-01: cooperative cancellation.
- A-02: own-key enumeration is charged immediately after its single native
  pass.
- A-03: zero approved real pairs.
- A-04: Proxies are not detected; they are neutralized by single reads.
  Globally patched built-ins are out of scope. This includes `WeakSet`,
  `Array.prototype` methods, `Object.freeze`, and pollution of
  descriptor-control names (`get`/`set`) that breaks JavaScript property
  definition itself.
- A-05: `TypeError`/`RangeError` → `INPUT_INVALID` normalization.
- **Subclasses.** A subclass instance of `CuratedAssetRegistry` or
  `MappingLedger` is not frozen as a whole. Its authoritative views are
  non-redefinable and no operation reads them, but it may carry its own
  mutable, non-authoritative fields.
- **Numeric-index pollution.** Pollution of numeric index names on
  `Object.prototype` (for example `"3"`) is not separately defended. Array
  reads are length-gated first.
- **The cancellation signal** remains the caller's live source by design, and
  is read once per poll.

### 22.16 Verification record

The verification ran in a fresh copy of the exact working tree, without
`node_modules` or `dist`. The runtime was Node **v24.18.1** and npm
**11.16.0**: the official build, checked against `SHASUMS256.txt`.

**Install:**

- `npm ci` exit 0: 450 added / 459 audited.
- `npm audit` reports 14 advisories (2 moderate, 11 high, 1 critical). The
  lockfile is byte-identical (`810aaa67…`), so this is audit-database drift,
  not a dependency change.

**Quality and tests:**

- `format:check`, `lint`, `typecheck`, `npm test` and `npm run build`: all
  exit 0.
- Full default suite: **56 test files** (53 passed, 3 opt-in live-canary files
  skipped); **560 passed, 0 failed, 3 skipped**.
  - contracts 4;
  - market-data 57;
  - spread-analytics **300**;
  - OKX 52 (+1 skipped);
  - Binance 72 (+1 skipped);
  - Bybit 69 (+1 skipped);
  - web 6.
- Build: six static routes.
- TZ matrix as separate processes (`UTC`, `America/New_York`, `Asia/Tokyo`):
  300/300 each.
- Focused runs:
  - the seventh hardening suite: 19/19;
  - the ACCEPTANCE_1–7 regression set: **17 files, 280/280**. It covers all
    remediation and hardening suites, the source audit, the oracle, D-055
    scenarios, reasons, serialization, determinism, governance, bounds,
    candidate bounds and the package boundary;
  - D-055: 40/40.

**Public surface (fresh `dist/index.js`):**

- 22 runtime exports;
- 44 unique, frozen reason codes;
- frozen class prototypes;
- deep imports (`dist/snapshot.js`, `dist/registry.js`, `dist/commands.js`,
  `dist/work-oracle.js`) return `ERR_PACKAGE_PATH_NOT_EXPORTED`;
- no oracle or fixture in `dist`.

**Repository checks:**

- `git diff --check` and `git fsck --full` pass. Local Markdown links have 0
  broken.
- These are unchanged:
  - `package.json` (`6282c135…`) and `package-lock.json` (`810aaa67…`);
  - D-055 (`60d00b8e…`), D-064 (`85fb7792…`), the capacity decision
    (`98552f5d…`) and the D-055 acceptance (`18d1cbb3…`);
  - acceptance reports 1–7 (ACCEPTANCE_6 `7d4d8773…`, ACCEPTANCE_7
    `175573a3…`);
  - the frozen Phase 2A packages, `apps`, `infra`, `docs/brand` and the brand
    hashes.
- The diff from `8d17682` touches only `packages/spread-analytics/src/**` and
  this document.

## 23. Numeric-index hardening evidence — L-07 and the closure of L-05

Hardening date: 2026-10-19. Governing review:
[eighth independent acceptance](PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_8.md)
(review of `5aa2fdf`, recorded at `b9176d1`) gave **FAIL**, BLOCKER 0 and
unresolved HIGH 0. It confirmed N-01, L-03, N-02, N-03 and L-06 as resolved.
L-05 stayed open because of new finding L-07 (LOW): numeric index reads could
inherit polluted numeric properties.

This section is implementation evidence only. It is not acceptance and not a
freeze. Its claims are to be tested by a fresh independent ACCEPTANCE_9. The
following are unchanged:

- D-055, D-064 and the capacity-semantics decision (Option A);
- the 100,000-step budget and the ≤128-step cancellation interval
  (`policy.ts` and `bounds.ts` are byte-identical);
- the 44 reason codes and the 22 runtime exports (`index.ts` and `reasons.ts`
  are byte-identical);
- the manifests, lockfile and dependencies;
- every frozen scope and acceptance reports 1–8.

### 23.1 Corrections to section 22

Section 22 is kept as written. ACCEPTANCE_8 disproved one of its claims:

- **§22.15:** "Pollution of numeric index names on `Object.prototype` (for
  example `"3"`) is not separately defended. Array reads are length-gated
  first."

**Why it was incomplete.**

- **The claim was not true of every site.** These internal reads were not
  length-gated, and each could read past the end of an array:
  - `CuratedAssetRegistry#resolve` read `found[0]?.canonicalAssetId` and
    `aliases[0]` on possibly empty arrays;
  - `MappingLedger#invalidate` read `target.approvals[0]?.approvedDigest`;
  - `validateBaseHistory` read `records[0]` and, at index 0,
    `records[index - 1]`, which is the property `"-1"`;
  - `materializeHistory` read `versions[0]`;
  - `epoch` (`time.ts`) indexed its month table with `month - 1` before
    range-checking the month. A month of `00` or `13`–`99` read property
    `"-1"` or `"12"`–`"98"`.
- **What `Object.prototype["0"]` could do.** Under that pollution, `found[0]`
  on an empty array could answer as an asset binding and `aliases[0]` as a
  reviewed alias. That turned `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN` into
  `MATCHED/COMPATIBLE_APPROVED`, and collapsed USDT and USDC legs at the
  identity gate (ACCEPTANCE_8 section 5).
- **Why the §22 null-prototype policy did not help.** A null prototype
  protects named fields of snapshot _records_. A native array always inherits
  from `Array.prototype`, and that inherits from `Object.prototype`. An
  array element read whose index is out of range, negative or a hole
  therefore falls through to both prototypes. §22 never covered array index
  reads at all.
- **The §22 name sweep missed it** because it polluted only named fields,
  never numeric names.

### 23.2 L-07 root cause

An authoritative index read was treated as safe without an own-element
proof. JavaScript resolves `array[i]` through the prototype chain whenever
`i` is not an own property of the array. That happens:

- when `i ≥ length`, as for an empty result;
- when `i` is negative or not an integer;
- at a hole.

`?.` and `!== undefined` do not help, because an inherited value is neither
`undefined` nor nullish.

### 23.3 Array-index own-property policy

Every authoritative index read in runtime code is backed by one of these:

| Class                              | Proof                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SAFE_BY_LENGTH`                   | A length or range check that dominates the read, such as a loop bound, `length === 1 ? x[0]`, or a short-circuit after a length check. Native `.at()` is length-bounded. |
| `SAFE_BY_OWN_PROPERTY`             | `Object.hasOwn`, or a key that comes from `Object.keys`.                                                                                                                 |
| `SAFE_BY_DENSE_INTERNAL_INVARIANT` | A local array whose length is fixed by construction, such as the two sorted legs of a pair.                                                                              |
| `FIXED`                            | Rewritten to the new `ownElement(list, index)` helper, or range-checked before the read.                                                                                 |

`ownElement` lives in `immutable.ts`. It returns the element only when the
index is a safe integer within `0 ≤ index < length` **and** an own property
of the array. Otherwise it returns `undefined`, so it never answers from a
prototype. It is constant work.

**Fixed sites (7).**

- `registry.ts`: `found[0]` → `ownElement(found, 0)` and `aliases[0]` →
  `ownElement(aliases, 0)` (the ACCEPTANCE_8 sites).
- `commands.ts`: `target.approvals[0]` → `ownElement(target.approvals, 0)`.
- `admission.ts`:
  - `records[0]` → `ownElement(records, 0)`, with an explicit
    empty-history `INPUT_INVALID`;
  - `records[index - 1]` → `index > 0 ? ownElement(records, index - 1) :
undefined`;
  - `versions[0]` → `ownElement(versions, 0)`.
- `time.ts`: the month is range-checked (1–12) before the table is indexed.
  This keeps the existing typed `EVIDENCE_TIME_INVALID`.

### 23.4 Dense-array invariant

Every array used by authoritative logic has these properties:

- it is a genuine `Array`;
- it is dense, with no holes;
- it has no accessor indexes;
- it has no custom iterator semantics and no extra properties.

It gets them from one of two sources:

- **Caller arrays** are admitted only through `snapshot.ts`. The array must
  have prototype `Array.prototype`. Its own keys must be exactly its indices
  plus `length`, which rejects holes, extra keys and own iterators. Each
  element is read once through an own data descriptor and copied into a new
  frozen dense array.
- **Internal arrays** are built only with literals, `push`, `map`, `filter`,
  `sort` copies and `Object.freeze`. All of these produce dense arrays.

Implicit iteration (`for…of`, spread, `map`, `filter`, `some`, `find`,
`includes`) visits only `0…length − 1`. On a dense array every visited index
is an own element, so the invariant covers implicit reads too. Explicit reads
that can step outside the length are the audited sites in 23.5.

The regressions cover:

- sparse arrays and arrays missing an index inside their length, which are
  refused by the boundary;
- dense arrays with zero, one and two elements, which are admitted, with
  their own indices;
- `ownElement` on a zero-length array, a dense array, a hole, a missing index
  inside the length, a valid local element under pollution, and a negative or
  fractional index.

All of these run under `Object.prototype` and `Array.prototype` pollution of
`"0"` and `"1"`.

### 23.5 Static numeric-index audit

`eighth-acceptance-hardening.test.ts` uses the TypeScript AST to list every
`ElementAccessExpression`, every `.at()` call and every `ownElement(...)` call
in all runtime modules. It requires the found set, keyed by file and
normalized expression text with counts, to equal a committed classification
table exactly. A new unclassified read therefore fails the test, and a
control proves the check is non-vacuous.

| Result                                  |                                        Count |
| --------------------------------------- | -------------------------------------------: |
| Total numeric-index read sites          | **56** (49 element/`.at()` + 7 `ownElement`) |
| `SAFE_BY_LENGTH`                        |                                           24 |
| `SAFE_BY_DENSE_INTERNAL_INVARIANT`      |                                           20 |
| `SAFE_BY_OWN_PROPERTY`                  |                                            5 |
| `FIXED` (changed sites)                 |                                            7 |
| `NON_AUTHORITATIVE_CONSTANT`            |                                            0 |
| **Uncovered authoritative index reads** |                                        **0** |

The site counts break down as follows:

- Before this change, the same AST scan found 53 element/`.at()` sites. Six
  were rewritten to `ownElement`; the `time.ts` table read remains, now
  range-checked.
- The 7th `ownElement` call is the new public-copy loop in `publication.ts`.
  It is classified `SAFE_BY_OWN_PROPERTY`.
- `bounds.ts`, `serialization.ts` and `publication.ts` read named keys
  obtained from `Object.keys`. They are listed as `SAFE_BY_OWN_PROPERTY`.

### 23.6 Public-output prototype decision

**Review.** The question was whether public results may have a null
prototype.

- No normative contract (D-055, D-064, `API_CONTRACTS_PLAN`, `DOMAIN_MODEL`)
  permits null-prototype public results.
- Every accepted state up to ACCEPTANCE_7 published ordinary frozen plain
  objects.
- §22 changed that as a side effect. `String(result)` and
  `result.hasOwnProperty` stopped working (ACCEPTANCE_8, informational).

That was an unintended breaking change, so it is reverted.

**Design.** The new module `publication.ts` provides `publicView(value,
work)`. Each public operation calls it **after every authoritative decision
and before its final cancellation check**. Its work is charged to the same
operation budget: `2n + 1` units per array and `4k + 1` per record.

- **Records.** A frozen null-prototype or plain record becomes a frozen
  ordinary object with the same own enumerable data properties. They are
  defined, never assigned, so a `"__proto__"` key stays an own field.
- **Arrays.** An array becomes a frozen dense array, read by `ownElement`.
- **Other values** are returned as is. These are primitives, `ExactDecimal`,
  and the trusted class instances.
- **Caching.** The copy of each internal record is cached in a `WeakMap`.
  Internal records are immutable, so this is sound. Shared identities
  therefore hold across outputs. For example, a command's returned mapping is
  `ledger.versions.at(-1)`, and a replay's `mapping` is
  `history.versions.at(-1)`.

**Applied at.**

- `evaluateMatch` and `evaluateBatch`;
- `generateCandidates`;
- `admitMaterializedMapping`;
- `replayMapping`;
- `approveCommand`, `invalidateCommand`, `admitMappingCommand`,
  `MappingLedger#apply` and `#commandDigestSnapshot`;
- the `versions` and `transitions` views of `MappingLedger`;
- the `revision` view of `CuratedAssetRegistry`, and its `resolve` and
  `describe`;
- `admitRegistryRevision`;
- `validateEvidenceBundle`.

**Authority stays internal.**

- No operation reads a public copy. Values a caller passes back go through
  the input snapshot again and become null-prototype records.
- The admitted-history handle is now the published copy. A private `WeakMap`
  maps it to the internal history, and `replayMapping` reads only the
  internal one (`trustedAdmittedHistory`).
- A spread or deep clone of a published history is refused with
  `INPUT_INVALID`.

**Consumer-side note.** A public result omits optional keys exactly as
before. A consumer that reads an absent key in its own polluted environment
sees that environment. Nothing the package decides or publishes depends on
it.

**Contract tests.** They check every output of every public operation,
recursively:

- ordinary prototype, frozen;
- `String(result) === "[object Object]"`;
- `Object.keys`, `Object.hasOwn` and `result.hasOwnProperty` agree;
- `JSON.stringify` works.

They also check shared identity, and that a published handle authenticates
while copies of it are refused.

### 23.7 Adversarial prototype-pollution tests

New `eighth-acceptance-hardening.test.ts` (**12 tests**):

- **Exact ACCEPTANCE_8 exploits (5).**
  1. An unbound base leg with a structurally valid approved mapping stays
     `AMBIGUOUS/ASSET_IDENTITY_UNKNOWN` with an identical result ID, under
     `Object.prototype` and `Array.prototype` `"0"` = `{ canonicalAssetId:
A }` or `{ targetAssetId: A }`.
  2. USDT↔USDC (with and without a mapping) and A↔B stay `NOT_MATCHED` with
     identical result IDs, under `"0"` and `"1"`.
  3. Candidate generation for mismatched pairs stays at 0.
  4. An empty approval list cannot inherit invalidation provenance.
  5. Months `00`, `13` and `99` stay `EVIDENCE_TIME_INVALID` under polluted
     `"-1"`, `"12"` and `"98"`. History continuity is unchanged under a
     polluted `"-1"`.
- **Full sweep (1).** It runs 2 prototypes × 2 indices × 9 values (canonical
  asset, alias target, mapping, admission record, candidate, approval,
  transition, string, number), which is **36 runs**. Each run covers 27
  operations and outcome classes: evaluations including `AMBIGUOUS`,
  `NOT_MATCHED`, `UNAVAILABLE` and same venue; candidates; batch; admission;
  both replays; `APPLIED`, idempotent, invalidation and empty-approval
  commands; registry admission and `resolve`; evidence; timestamps; and
  decimals. Every run is byte-identical to the clean run, and no polluted key
  remains afterwards.
- **Array shapes (2).** `ownElement` semantics, and the snapshot dense-array
  invariant under pollution.
- **Static audit (2).** The classification table, and the non-vacuous
  control.
- **Public-output contract (2).** These are listed in 23.6.

**Non-vacuity.** The same file was run against the unfixed baseline
`b9176d1` in a disposable worktree, with `ownElement` defined locally. **9 of
12 tests fail there.** The three that pass are guards that already held:
helper semantics, the dense snapshot, and the audit control.

The two `seventh-acceptance-hardening.test.ts` assertions that pinned the
§22 null-prototype output now pin the ordinary prototype. No other earlier
test was changed.

### 23.8 Preserved invariants and results

- **spread-analytics:** **22 files, 312/312 tests** (300 earlier plus 12
  new).
- **D-055:** 40/40 authored cases and 29/29 groups. **Reason codes:** 44.
  **Exports:** 22.
- **Material digest.** The own-property cross-version probe from §22.13 gives
  `0446650e7542ab427800c35d6bdb6a1d2b0464c5ce3612cf9761e9ccd11cddeb` on
  `8d17682`, `b9176d1` and this tree.
- **Real venues.** The probe is identical to `b9176d1`:
  - OKX↔Binance: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
    `VALUE_CONVENTION_UNVERIFIED`];
  - OKX↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`];
  - Binance↔Bybit: `UNAVAILABLE` [`MULTIPLIER_UNKNOWN`,
    `VALUE_CONVENTION_UNVERIFIED`].

  This holds with and without a fixture mapping. There are zero approved real
  pairs.

- **Work accounting (polls, `b9176d1` → now).**
  - `MATCHED` evaluation: 14 → 14.
  - Early `NOT_MATCHED`: 3 → 3.
  - 20-instrument generation: 126 → 127.
  - Admission: 11 → 11.
  - 1,024 instruments: 782 → 782, then typed `MATCHING_BOUND_EXCEEDED`.

  The new work is all charged to the same budget, with no new budget and no
  reset: `ownElement` is constant work, the month gate is constant, and the
  public copy is charged per node before the final check. Nothing follows
  the final check except `return`. The source audit, oracle,
  publication-tail and cancellation suites pass unchanged.

- **Preserved findings.** The regression suites for B-01, B-02, H-01–H-04,
  M-01, M-02, N-01, N-02, N-03, L-02, L-03, L-04 and L-06 pass unchanged.
- **Test stability.** `fifth-acceptance-remediation` test 1 allocates about
  56 MB of strings. It timed out once (vitest's 5 s default) on the first
  parallel run after these edits, and also once on the untouched `8d17682`
  baseline at the start of the §22 session. It passed in every other run:
  4 isolated runs, 3 consecutive full runs and the fresh-copy runs. This is
  load sensitivity in an unchanged test, not a behaviour change.

### 23.9 Changed files

- **Runtime:** `packages/spread-analytics/src/{admission,candidates,commands,evaluator,evidence,immutable,registry,replay,time}.ts`
  and the new `publication.ts`.
- **Tests:** the new `eighth-acceptance-hardening.test.ts`, and two
  prototype assertions in `seventh-acceptance-hardening.test.ts`.
- **Documentation:** this section.

### 23.10 Remaining limitations

- A-01 to A-05 are carried. A-04 covers globally patched built-ins, including
  replacing `Array.prototype` or `Object.prototype` _methods_, `WeakMap`,
  `WeakSet` and `Object.hasOwn` itself, and pollution of the descriptor names
  `get` and `set`. Under that last one every operation fails closed;
  ACCEPTANCE_8 notes that `new MappingLedger()` throws a raw `TypeError`
  there.
- Numeric index pollution is now defended on every authoritative read by
  the policy in 23.3. The audit enforces this for new code.
- Unfrozen subclass instances and the live cancellation signal are as in
  §22.15.
- **Consumer polluted environments.** A consumer that reads an absent
  optional key from a public result in its own polluted environment sees
  that environment (23.6).

### 23.11 Verification record

The verification ran in a fresh copy of the exact working tree, without
`node_modules` or `dist`, on Node **v24.18.1** and npm **11.16.0**: the
official build, checked against `SHASUMS256.txt`. The exact results are
recorded in the hardening commit report and re-measured by ACCEPTANCE_9.
They are:

- **Install:** `npm ci` added 450 and audited 459. The lockfile is
  byte-identical (`810aaa67…`).
- **Checks:** `format:check`, `lint`, `typecheck`, `npm test` and
  `npm run build` all exit 0.
- **Full default suite:** **57 test files** (54 passed, 3 opt-in live-canary
  files skipped); **572 passed, 0 failed, 3 skipped**.
  - contracts 4;
  - market-data 57;
  - spread-analytics **312**;
  - OKX 52 (+1 skipped);
  - Binance 72 (+1 skipped);
  - Bybit 69 (+1 skipped);
  - web 6.
- **Build:** six static routes.
- **TZ matrix** as separate processes (`UTC`, `America/New_York`,
  `Asia/Tokyo`): 312/312 each.
- **Public surface:** 22 runtime exports and 44 frozen codes. Deep imports
  return `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- **Repository checks:**
  - `git diff --check` and `git fsck --full` pass, and local Markdown links
    have 0 broken.
  - These are unchanged: `package.json` (`6282c135…`), `package-lock.json`
    (`810aaa67…`), D-055, D-064, the capacity decision, ACCEPTANCE_1–8, the
    frozen Phase 2A packages, `apps`, `infra` and `docs/brand`.
- **Diff scope:** the diff from `b9176d1` touches only
  `packages/spread-analytics/**` and this document.
