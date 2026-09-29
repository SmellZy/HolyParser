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

Remediation date: 2026-09-24. The fourth independent review
`PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE_4.md` failed with H-03
HIGH, zero BLOCKERs: candidate materialization charged one fixed step while
building exposure/provisional keys, canonical candidate provenance, two SHA-256
inputs and its immutable copy without the parent operation budget. This section
is implementation-produced evidence, not formal acceptance. B-01, B-02, H-01,
and H-02 were not reopened; no normative decision, reason code, or matching
semantic changed.

### 19.1 Architecture and byte stability

`generateCandidatesWithBudget` passes its one `WorkBudget` into `makeCandidate`
and every reached canonical/key/hash/copy helper. Candidate materialization
precharges the closed-schema copied-field upper bound, each leg/revision/reason traversal, comparator,
provisional-field construction, exposure-key field and byte-length preparation,
canonical array/object/key/string traversal and join preparation, deterministic
ID source preparation, evidence digest preparation, and the final candidate
copy. Native SHA-256 rounds remain a primitive boundary; preparing and passing
their byte input is charged. The output array is frozen and charged **before**
the final `beforePublication` cancellation check. No repeated transformation
remains after that check on the candidate path.

The same canonical functions still accept no budget for isolated vector/test
use, but every authoritative candidate call supplies the parent budget. Budget
plumbing changes no canonical bytes or SHA-256 values: the focused regression
compares budgeted and unbudgeted serialization and ID output byte-for-byte;
existing serialization, mapping, transition and replay vector suites pass.
`makeCandidate` is exported only from its internal module for exact accounting
regressions; the package export map remains root-only and its root runtime API
remains the approved 22-name allowlist.

### 19.2 Static H-03 accounting inventory

| Site / function                                                              | Repeated-work family                                                                       | Parent authority and charge / cancellation coverage                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `candidates.ts` `generateCandidatesWithBudget`                               | instrument validation, ordering, grouping, pair/partner enumeration, batch materialization | one operation `WorkBudget`; each traversal/comparison/pair and final freeze charged; final check                                                               |
| `candidates.ts` `resolveExposureIdentity`, `provisionalKey`, `makeCandidate` | registry resolution, provisional fields, leg arrays, reasons, final key, evidence fields   | same passed budget; per field/element and budgeted comparator/serialization                                                                                    |
| `serialization.ts` `canonicalExposureKey`                                    | seven ordered fields, UTF-8 byte-length preparation and output join                        | same passed budget; deterministic conservative UTF-16-to-UTF-8 upper-bound charge before native byte scan, per field and joined length                         |
| `serialization.ts` `canonicalSerialize`                                      | nested arrays/objects, key sort, strings and joins                                         | same passed budget through `SerializationMeter`; text charged before native byte scan, each item/key/comparator and join length charged                        |
| `serialization.ts` `deterministicId`, `sha256`                               | canonical hash-input and domain concatenation preparation                                  | same passed budget; proportional input length charged before concatenation/native hash; no digest-byte change                                                  |
| `immutable.ts` `immutableCandidate`                                          | top-level fields, provisional nested fields and reasons copy/freeze                        | same passed budget; conservative 32-field and seven-field precharge plus each reason before materialization                                                    |
| `bounds.ts` `assertEvidenceRecord`                                           | bounded evidence JSON traversal and serialization                                          | caller's evidence-operation budget passed through preflight `walk`; native JSON serialization follows charged traversal; byte block charged before bound check |
| `evaluator.ts`, `evidence.ts` comparator call sites                          | sorting bounded opaque IDs                                                                 | same existing operation budget via length-proportional UTF-8 comparator                                                                                        |
| `registry.ts` constructor and `resolve`                                      | binding-key join and asset/binding/alias traversal                                         | existing operation budget; ID lengths additionally charged before key join                                                                                     |
| `commands.ts` `MappingLedger.apply` / digest snapshot                        | old versions/transitions/digest-map copy and ordered ID comparison                         | same command-operation budget; per entry copied and length-proportional comparator                                                                             |
| admission, transitions, replay and output helpers                            | per-version/approval/transition/replay traversal and canonical digests                     | their pre-existing passed operation budget; audited call sites all pass it to canonical/digest helpers                                                         |
| `diagnostics.ts` `boundedDiagnostics`                                        | bounded diagnostic sort                                                                    | standalone operation with its own budget; no authoritative caller from matching operation                                                                      |

The audit searched all runtime `canonicalSerialize`, `canonicalExposureKey`,
`deterministicId`, `sha256`, `immutableCandidate`, comparator, text-scan,
`map`/`filter`/`reduce`, sort and copy call sites. Test-fixture builders are
excluded from production authority. No further production candidate or
analogous canonical/hash path omits the supplied operation budget. The
deterministic logical-work model charges proportional bounded chunks before
native UTF-8/JSON/hash primitives; it is not a wall-clock deadline.

### 19.3 Focused regressions and resource result

`fourth-acceptance-remediation.test.ts` adds **9** H-03 cases. It directly
reproduces the fourth-review short-versus-long canonical asset ID counterexample:
the near-atomic-boundary valid ID now incurs more than ten additional logical
steps during `makeCandidate` and leaves the key/digest semantics unchanged.
Tests also cover a full candidate operation with observed check positions,
cancellation in key/serialization/ID/copy helpers and candidate generation,
evidence-JSON precharging, no partial result or accepted-state mutation, and
byte-identical budgeted/unbudgeted vectors. The 8,192-valid-pair batch
combines validation, registry resolution, enumeration and materialization on
one budget. It fails atomically with the existing `MATCHING_BOUND_EXCEEDED`
once distributed work reaches the 100,000-step ceiling; the 8,192 pair-count
ceiling does **not** override that tighter independent limit. The old
`candidate-bounds.test.ts` assumption of mandatory 8,192-pair success was
corrected to assert this precedence without removing the 8,193rd-pair and
partner-33 rejection cases.

The measured maximum adjacent cancellation-check gap on the large candidate
operation is **exactly 128 charged logical steps**; the static inventory above
identifies the previously omitted work now included in that counter. The
100,001st required unit is rejected by `WorkBudget` with
`MATCHING_BOUND_EXCEEDED`. Cancellation and work-cap failure publish no partial
candidate array and mutate no admitted mapping or registry. Existing D-064
boundary/one-over, hostile-input, replay, determinism, governance and atomicity
tests remain green. The authored D-055 scenario file remains **40/40 runtime
cases**, representing **29/29 normative groups**; the reason catalogue is
still **44/44 unique codes**. All three current real venue combinations remain
`UNAVAILABLE`: OKX/Binance has `MULTIPLIER_UNKNOWN` and
`VALUE_CONVENTION_UNVERIFIED`; OKX/Bybit has `MULTIPLIER_UNKNOWN`;
Binance/Bybit has both multiplier gaps and Binance's unverified convention.

### 19.4 Exact change and pinned verification record

Source changes in this fourth remediation are confined to
`packages/spread-analytics/src/{bounds,candidates,commands,evaluator,evidence,immutable,registry,serialization}.ts`.
The new test is `src/fourth-acceptance-remediation.test.ts`; the existing
`src/candidate-bounds.test.ts` changes only the rejected work-cap assumption.
`dist/**` is a generated rebuild, not independent source authority. This
implementation report is the only documentation change. Root `package.json`
and `package-lock.json` remain at their pre-remediation SHA-256 values
`6282c135e0f807d88afd59a11471756f5bad7f346769bab40db6e70658776ad5`
and `810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59`.

Verification materialization: `/Volumes/M2 ssd/holyparser-h03-verify.YLpd2P/repo`
on a volume with 766 GiB available before `npm ci`. Exact runtime is Node
**v24.18.1** and npm **11.16.0**. `npm ci` passed with 451 installed / 460
audited packages; `npm query '*'` returns 452 entries and the workspace query
returns eight workspaces. Seven pre-existing advisories were not remediated. Aggregate
format, lint and typecheck passed. Focused fourth-remediation: **1 file, 9/9**.
Complete spread analytics: **16 files, 192/192**. Aggregate default tests:
**51 source files** (48 passed, three opt-in live-canary files skipped),
**452 passed, zero failed, three skipped**. All-workspace production build
passed and emitted six static web routes: `/`, `/_not-found`,
`/forgot-password`, `/login`, `/register`, `/verify-email`.
A post-build rerun also passed, discovering 52 files and 456 passing tests
because the contracts build emits one compiled duplicate test file with four
duplicate cases; it is not counted as additional unique source coverage.
Markdown/local-link validation covers 74 Markdown files, 87 links, 65 local
links, one anchor and zero broken targets/anchors.

The verified boundary remains `packages/spread-analytics/**` plus this report;
the frozen market-data package, OKX/Binance/Bybit adapters, Phase 2A, D-055,
D-064, accepted Phase 2B formulas, D1/D2, Product/Commerce/Admin, application,
infrastructure and brand assets remain unchanged. This remediation is ready
for a **fifth formal independent acceptance review**, not a Phase 2B.1 freeze
or Phase 2B.2 authorization. The prior acceptance reports remain untouched.

Recommended next task:

> Perform a fifth formal independent Phase 2B.1 acceptance review in
> `/Volumes/M2 ssd/HolyParser`. Treat this fourth-remediation evidence as
> author-produced evidence, not proof. Reproduce the original H-03 short/long
> candidate-materialization counterexample; independently audit all candidate
> key/provenance/hash/copy paths and analogous canonical call sites for a single
> cumulative budget; measure the full-operation cancellation gap at no more
> than 128, the 100,000-step limit, 8,192-pair atomic failure and final
> pre-publication check. Reconfirm B-01/B-02/H-01/H-02, 22 runtime exports,
> 29 D-055 groups/40 authored cases, 44 reason codes, D-064 boundaries,
> serialization vectors, zero real approved pairs, replay and frozen boundaries.
> Use a fresh Node 24.18.1/npm 11.16.0 materialization with adequate disk;
> run npm ci, format, lint, typecheck, focused/full tests, production build,
> Markdown/local-link validation, git diff --check and git fsck --full. Create
> a new acceptance report without modifying implementation or prior reports.
> Do not commit or begin Phase 2B.2.
