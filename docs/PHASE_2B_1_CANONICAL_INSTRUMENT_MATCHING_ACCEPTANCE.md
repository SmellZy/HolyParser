# Phase 2B.1 — Canonical Instrument Matching Foundation formal acceptance

- Review date: 2026-09-15
- Review type: independent implementation acceptance
- Final status: **FAIL**
- Phase 2B.1 freeze: **NOT PERMITTED**
- Phase 2B.2 eligibility: **BLOCKED**
- Reviewed baseline: `9dacc824aa375f4f14b60ec91ccbdc69624f23a3`
- D-055 snapshot SHA-256:
  `60d00b8ef38cbbf08baa8c2248aaf1fd9d62e4d923816232c2ffe600b6d97931`
- Policy: `instrument-matching-pilot/v1`
- D-064 scope: `instrument-matching-resources/v1`

This report treats the implementation report, its hashes, tests and rollback
statement as author-produced evidence. It independently reproduces repository,
runtime, dependency and rollback behavior. No Phase 2B.1 source, normative
decision, dependency or frozen boundary was changed during this review.

## 1. Accepted review scope and repository integrity

The implementation diff is isolated to the authorized transaction:

- new `packages/spread-analytics/**`;
- new
  `docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_IMPLEMENTATION.md`;
- root `package.json` aggregate build/lint/typecheck/test integration;
- `package-lock.json` local workspace records and the separately authorized
  `packages/design-tokens.engines` synchronization.

Before this report, `git status --short` contained exactly those implementation
entries. `git diff --check` and `git fsck --full` passed. The recalculated D-055
digest, runtime policy constant and D-064 scope constant match the required values.
There is no unrelated implementation diff.

Reviewed package files comprise the manifest, TypeScript configuration, all 15
runtime modules, 12 test modules and `test-fixtures.ts`. Governing evidence read
for this review includes AGENTS, MASTER_SPEC, frozen Phase 2A.1–2A.4 plans and
acceptances, Phase 2B plan/architecture acceptance/ADR-0009, D-055 decision,
attestations and acceptance, D-064 matching approval, the implementation report,
and the applicable domain/API/security/risk/decision/acceptance registers.

## 2. Package, workspace and dependency verdict

**PASS.** `packages/spread-analytics/package.json` defines private ESM package
`@arbitrage/spread-analytics@0.1.0`, one root package export and one dependency:
public `@arbitrage/market-data@0.1.0`. Static import inspection finds no adapter or
market-data deep import. No Phase 2B.2–2B.7 concept is implemented.

The root manifest only inserts the workspace into aggregate `build`, `lint`,
`typecheck` and `test`. Semantic comparison of the lockfile against HEAD finds:

1. new local link `node_modules/@arbitrage/spread-analytics`;
2. new local record `packages/spread-analytics` with the single market-data edge;
3. the authorized `packages/design-tokens.engines.node` addition, exactly
   `>=24.18.0 <25`.

Third-party additions, removals, version changes, integrity changes and resolved
URL changes are all zero. Workspaces increase from seven to eight. Existing audit
debt remains seven advisories and is not caused or modified by Phase 2B.1.

## 3. Public API verdict

**HIGH — FAIL.** The package manifest has only a root path, but `src/index.ts`
wildcard-exports every module. This makes implementation machinery public,
including `WorkBudget`, `assertCount`, `epoch`, `isEffective`,
`assertClosedKeys`, raw serialization/validation helpers and the mutable
`specialNativeFamilies` set. The package-boundary test checks only the manifest
path/dependency; it does not enforce an approved symbol allowlist.

No speculative spread/VWAP/fees/funding/opportunity/ranking exports exist, but the
required public/internal distinction is not satisfied. The mutable policy export
also contributes directly to BLOCKER B-02.

## 4. Canonical identity and serialization verdict

The serialization format itself **passes**:

- exact `instrument-exposure-pilot/v1|` prefix;
- approved field order;
- UTF-8 byte-length prefixes;
- deterministic UTF-8 object-key ordering;
- domain-separated SHA-256;
- no locale, clock or random input.

Independent shell hashing of exact bytes
`test/v1\n{"a":"b"}\n` reproduces
`786dc0d4cb92c23193e62d6f6ef1b0ad5c15d8c47eae0745c7b352fc2e1407ef`.
The synthetic A/USDT key reproduces the documented byte string.

Identity resolution as a whole **fails**. An independent Node 24 probe supplied
PERPETUAL metadata with known multiplier but `UNVERIFIED` native convention and
payoff. `generateCandidates` emitted an empty reason list and this key:

```text
instrument-exposure-pilot/v1|10:DERIVATIVE1:A4:USDT4:USDT9:PERPETUAL6:LINEAR9:BASE_UNIT
```

`resolveExposureIdentity` hardcodes `PERPETUAL`, `LINEAR` and `BASE_UNIT` after
asset binding alone. This promotes unknown economics into canonical identity and
contradicts the D-055 fail-closed rule. Ticker and venue are correctly excluded,
and opaque venue IDs remain separate.

## 5. Asset-registry verdict

Direct-alias, depth-one, cycle, collision, USDT/USDC separation and rebrand tests
pass. There is no network lookup or ticker-only binding.

Runtime immutability **fails**. `CuratedAssetRegistry` copies and freezes only its
arrays, not contained asset/binding/alias records. In an independent probe,
mutating the caller-owned first binding after construction changed `resolve()`
from canonical asset `A` to `USDT`. The registry also exposes its revision and
mutable nested records. Consequently registry revision input is not an immutable
deterministic snapshot.

## 6. Exact economics verdict

**PASS for implemented exact arithmetic; identity gate fails as above.** All
financial operations use frozen `ExactDecimal`, with no `number` or epsilon
comparison. Independent vectors reproduce:

| Quantity | Factor | Exact base exposure |
| -------- | ------ | ------------------- |
| 1        | 1      | 1                   |
| 1000     | 0.001  | 1                   |
| 0.01     | 100    | 1                   |

The quote-notional vector `0.001 × 12345.67` yields `12.34567`. Unknown, zero,
negative, unit mismatch, convention mismatch and coefficient overflow paths are
typed and tested. No multiplier defaults to one. D-055 states that price-unit
division is dimensional evidence and unnecessary for 2B.1 candidate eligibility;
its absence as a division API is therefore not a defect.

## 7. Lifecycle and freshness verdict

**PASS.** Frozen lifecycle equivalents cover ACTIVE, PRE_LAUNCH, SUSPENDED,
SETTLING, EXPIRED, DELISTED and UNKNOWN. The decision maps native HALTED and
pre-listing labels into these frozen values and treats delisting notice as separate
veto evidence; Phase 2B.1 does not invent frozen enums.

Age zero and exactly 60 seconds pass; negative age returns
`EVIDENCE_TIME_INVALID`; 60 seconds plus 1 ms returns `EVIDENCE_STALE`.
Intervals are half-open and reject duration greater than 30 days. Evaluation time
is explicit and source scans find no `Date.now()`.

## 8. Candidate, evidence, governance and current eligibility verdict

The TypeScript model declares separate Candidate, Evidence, Completeness, Review,
MappingVersion/Status, CurrentEligibility, ConflictRecord and ReplayResult types.
The ordinary no-mapping path correctly leaves a candidate unavailable.

The authoritative transition is not closed, producing **BLOCKER B-01**. An
independent black-box probe passed `evaluateMatch` a plain `APPROVED` mapping with:

- `policyRevision: unapproved-policy/v999`;
- an arbitrary evidence revision;
- unrelated, unverified approval digests;
- an `INCOMPLETE` candidate.

The evaluator returned `MATCHED / COMPATIBLE_APPROVED`. It checks reviewer role
names and actor difference but does not validate the mapping schema, accepted
policy revision, command/evidence digest, approval digest binding or complete
approved provenance. The safe `approveCommand` path does not compensate for a
public evaluator that accepts untrusted materialized mapping objects directly.

Command-helper tests for idempotence, changed digest, expected revision and actor
separation pass, but they do not establish end-to-end approval authority.

## 9. Immutable history and replay verdict

AS_KNOWN/CORRECTED selection, half-open effective time and ordering tests pass for
well-formed frozen fixture objects. Replay contains no network, clock or random
input and reports mapping/registry/evidence/policy revisions.

Runtime history immutability **fails** under BLOCKER B-02. `MappingLedger` freezes
only its versions array. Mutating a caller-owned version after construction changed
the ledger-visible status from APPROVED to INVALIDATED. Its public
`commandDigests` is a real mutable `Map`; a caller can insert an arbitrary command
digest. The same shallow-mutability problem affects replay histories supplied by
reference. Append-only TypeScript declarations are not runtime immutability.

## 10. Conflict, quarantine and cardinality verdict

Known fixture paths cover binding conflict, alias cycle, metadata/economics
conflict, settlement mismatch, interval overlap, quarantined mappings and
multiple-exposure overlap. No score or best-match function exists, and
same-exposure venue instruments remain separate.

Overall verdict is **FAIL** because arbitrary materialized `APPROVED` mappings can
bypass conflict/governance validation and mutable registry/ledger state can change
the identity or history after admission. The intended one-active-identity rule is
implemented only in `MappingLedger.approve`; it is not enforced on externally
supplied mapping values consumed by `evaluateMatch` or replay.

## 11. Twenty-nine-scenario acceptance table

Vitest independently enumerates 37 expanded cases in the numbered scenario block
plus six scenario-26 governance cases: **29 normative groups / 43 explicit runtime
cases**. Three additional current-real-pair cases are separate. The table assesses
both the authored fixture and the complete invariant exposed by independent
probes.

|   # | Scenario                            | Verdict  | Independent assessment                                                                          |
| --: | ----------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
|   1 | Same asset/USDT supported perpetual | PASS     | exact MATCHED result asserted                                                                   |
|   2 | Same ticker, different asset        | PASS     | base mismatch asserted; ticker unused                                                           |
|   3 | USDT versus USDC                    | PASS     | settlement mismatch asserted                                                                    |
|   4 | Linear versus inverse               | PASS     | convention mismatch asserted                                                                    |
|   5 | Perpetual/dated and dated/dated     | PASS     | two explicit cases                                                                              |
|   6 | Factors 1, 0.001 and 100            | PASS     | three cases plus independent exact vectors                                                      |
|   7 | Missing multiplier                  | PASS     | unavailable, no default                                                                         |
|   8 | Unknown lifecycle                   | PASS     | typed unavailable                                                                               |
|   9 | Approved direct alias               | PASS     | reviewed-manual confidence asserted                                                             |
|  10 | Conflicting identity binding        | PASS     | quarantine asserted                                                                             |
|  11 | Superseded historical replay        | PASS     | current unavailable; old AS_KNOWN selected                                                      |
|  12 | Rebrand                             | PASS     | asset ID retained across registry versions                                                      |
|  13 | Duplicate ticker without binding    | PASS     | ambiguous/no ticker inference                                                                   |
|  14 | Unsupported family                  | PASS     | typed NOT_MATCHED                                                                               |
|  15 | 60-second freshness                 | PASS     | exact bound and +1 ms                                                                           |
|  16 | Zero/negative multiplier            | PASS     | two explicit cases                                                                              |
|  17 | Contract-unit mismatch              | PASS     | typed NOT_MATCHED                                                                               |
|  18 | Unapproved candidate                | **FAIL** | fixture passes, but arbitrary APPROVED mapping bypasses completeness                            |
|  19 | Quarantine and invalidation         | PASS     | two explicit cases for well-formed fixtures                                                     |
|  20 | Unknown convention/capability       | **FAIL** | evaluator is unavailable, but candidate generator fabricates LINEAR/BASE_UNIT key               |
|  21 | Alias chain/cycle                   | PASS     | direct policy rejects chain/cycle                                                               |
|  22 | Metadata/economics conflict         | PASS     | quarantine asserted                                                                             |
|  23 | Mapping interval conflict           | PASS     | command path quarantines without replacement ledger                                             |
|  24 | Inactive lifecycles                 | PASS     | five frozen canonical values tested                                                             |
|  25 | Expiry and >30-day validity         | PASS     | exclusive end and one-over interval                                                             |
|  26 | Digest/reviewer/revision failures   | **FAIL** | helper paths pass; evaluator bypass accepts unbound approvals/policy                            |
|  27 | OKX special product                 | PASS     | family exclusion asserted for pristine policy state                                             |
|  28 | AS_KNOWN versus CORRECTED           | **FAIL** | selection test passes; caller mutation breaks immutable-history premise                         |
|  29 | Bounds/permutation                  | **FAIL** | selected permutations pass; mutable global policy/registry violates identical-input determinism |

## 12. Reason-code catalogue verdict

**PASS.** Independent enumeration finds exactly 44 strings, 44 unique values,
already ordered by raw UTF-8 bytes. Codes are literals, not dynamically generated,
and diagnostic records use finite subject values. Current zero-pair codes match the
accepted catalogue. Gate precedence is not sufficient to cure B-01/H-01.

## 13. D-064 resource-bound table

| Resource/control             | Approved value            | Acceptance result                                      |
| ---------------------------- | ------------------------- | ------------------------------------------------------ |
| instruments                  | 1,024                     | constant and API count guard present                   |
| partners per instrument      | 32                        | exact/one-over candidate tests pass                    |
| candidate pairs              | 8,192                     | exact 8,192 and 8,193 tests pass                       |
| bindings/direct aliases      | 4,096                     | constructor guard present; helper boundary test passes |
| alias depth                  | 1                         | chain/cycle rejection passes                           |
| versions per mapping         | 64                        | ledger guard and helper boundary pass                  |
| mapping/event records        | 4,096                     | ledger/replay guards present                           |
| evidence per subject / total | 32 / 32,768               | exact subject one-over and total guard present         |
| evidence record              | 8 KiB                     | byte boundary/one-over pass                            |
| conflicts                    | 128                       | batch guard/helper bound present                       |
| diagnostics                  | 200                       | 200th truncation marker passes                         |
| atomic ID                    | 160 UTF-16 and 640 UTF-8  | bounded validation passes                              |
| composite ID                 | 4,096 UTF-8               | exact/one-over passes                                  |
| reason/description           | 512 UTF-8                 | exact/one-over and hostile text pass                   |
| input/output                 | 16 MiB each               | exact/one-over helpers pass                            |
| JSON depth/nodes/keys/array  | 16/100,000/64/32,768      | boundary/one-over tests pass                           |
| decimal wire/digits/scales   | 256/78/36/78              | frozen ExactDecimal plus overflow tests pass           |
| logical work                 | 100,000                   | bound test passes                                      |
| cancellation interval        | at most 128 logical steps | **FAIL; see H-03**                                     |

Named narrower bounds generally override generic bounds. No top-N or sampling
path exists. Several limits are proven through shared validators rather than
their largest production-path materialization; this is a MEDIUM evidence gap, not
the cause of FAIL.

## 14. Cancellation and atomicity verdict

`WorkBudget` checks at construction, when its accumulated delta reaches 128 and
before publication. Candidate/batch functions stage output and do not return a
partial array on a thrown error. Command admission returns the prior ledger on
typed rejection.

The advertised at-most-128 guarantee is not established end to end:

- `generateCandidates` validates the full instrument input array before calling
  `work.step()` for each item;
- registry/evidence validation loops have no cancellation signal;
- public `WorkBudget.step(count)` permits a single count much larger than 128 and
  performs only one check after adding it.

Therefore cancellation is **HIGH — FAIL**. Atomic staging passes ordinary tests,
but runtime mutation of prior registry/ledger state means the stronger “prior
accepted state remains unchanged” invariant also fails under B-02.

## 15. Hostile-input and determinism verdict

Malformed UTF-8/JSON, financial JSON numbers, controls, unpaired surrogates,
unknown fields/enums/reason codes, oversized IDs/text/records/structures,
decimal overflow, alias cycles, evidence/reference bounds, diagnostics overflow,
candidate explosion and command conflicts have focused tests and typed failures.

Static scans find no fetch, HTTP client, WebSocket, filesystem authority,
environment access, credentials, `Date.now`, `Math.random`, `randomUUID` or locale
sort in runtime modules. Canonical ordering uses `Buffer.compare`.

Property/determinism acceptance nevertheless **fails** because
`specialNativeFamilies` is a mutable `Set` used directly by evaluation, registry
records are mutable after admission and ledger/map state is mutable. A Node 24
probe successfully added `ORDINARY_LINEAR_PERPETUAL` to the policy set. Hidden
mutable singleton/input state can therefore change output for otherwise identical
logical inputs.

## 16. Current zero-real-pair verdict

**PASS for the frozen fixture evidence.** Three explicit cases reproduce:

- OKX/Binance: UNAVAILABLE with `MULTIPLIER_UNKNOWN` and
  `VALUE_CONVENTION_UNVERIFIED`;
- OKX/Bybit: UNAVAILABLE with `MULTIPLIER_UNKNOWN`;
- Binance/Bybit: UNAVAILABLE with the multiplier gap and Binance convention gap.

The evaluator checks unavailable economics before mapping approval, so these
specific cases remain fail-closed. Synthetic complete fixtures are visibly
separate. H-01 still prohibits accepting the candidate identity implementation:
it assigns an asserted LINEAR key to unknown-convention diagnostic input even
though final eligibility remains unavailable.

## 17. Rollback verdict

**PASS.** Independent rehearsal used
`/tmp/holyparser-2b1-acceptance-rollback.7mbwW0/repo`. Removing the workspace and
implementation report and restoring root manifest/lock produced empty status and
`git diff --exit-code` success. Hashes returned to:

- pre-2B.1 `package.json`:
  `a2854915f47c075ec3ea8dc5e4d2a0ca997f12bf65b7ab6eac232b06d80fb17c`;
- pre-2B.1 `package-lock.json`:
  `490609469b0fb2bb5075a1c902cbb6eef262cf39e1cfb3be5aef37aac55c6de5`.

This also removed the transaction-local design-token engines lock metadata; no D1
file was edited.

## 18. Findings

| ID   | Severity | Finding                                                                                                                                                                                           | Status / required remediation                                                                                                        |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| B-01 | BLOCKER  | `evaluateMatch` accepts an externally supplied APPROVED mapping with wrong policy revision, arbitrary evidence revision, unbound approval digests and incomplete candidate, then returns MATCHED. | UNRESOLVED. Add closed mapping/provenance validation and require the accepted policy/evidence/command authority before eligibility.  |
| B-02 | BLOCKER  | Authoritative policy, registry and ledger/history state is externally mutable (`specialNativeFamilies`, nested registry records, mapping versions, command digest Map).                           | UNRESOLVED. Remove mutable policy export/state and defensively freeze/copy or canonicalize admitted immutable records/maps.          |
| H-01 | HIGH     | Candidate identity hardcodes LINEAR/BASE_UNIT before known convention/unit evidence and emits no reason for unknown economics.                                                                    | UNRESOLVED. Separate asset diagnostic identity from complete canonical exposure identity and fail closed without asserted economics. |
| H-02 | HIGH     | Root wildcard barrel exports internal validation, clock, budget, serialization and mutable policy machinery.                                                                                      | UNRESOLVED. Define and test an explicit Phase 2B.1 symbol allowlist; keep internals private.                                         |
| H-03 | HIGH     | Cancellation checks are not guaranteed every ≤128 logical steps through real validation paths; `step(count)` can jump arbitrarily.                                                                | UNRESOLVED. Budget every bounded loop and prevent unchecked multi-step jumps, with instrumented algorithm-level tests.               |
| M-01 | MEDIUM   | Some D-064 one-over evidence exercises generic guards instead of each public operation at its actual maximum.                                                                                     | Add focused integration boundary tests during remediation.                                                                           |
| M-02 | MEDIUM   | Permutation coverage is representative, not exhaustive for non-empty alias/conflict/evidence arrangements.                                                                                        | Add deterministic permutations for every named collection.                                                                           |

BLOCKER count: **2**. Unresolved HIGH count: **3**. Remediated findings: **none**;
source changes were expressly prohibited by this review.

## 19. Clean quality/build verification

Fresh acceptance materialization:
`/tmp/holyparser-2b1-acceptance.SWivAp/repo`.

| Command/evidence                           | Exact result                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Node / npm                                 | `v24.18.1` / `11.16.0`                                                                             |
| `npm ci`                                   | exit 0; 451 installed, 460 audited; 7 pre-existing advisories                                      |
| workspaces / npm-query packages            | 8 / 452                                                                                            |
| `npm run format:check`                     | PASS                                                                                               |
| `npm run lint`                             | PASS, all aggregate workspaces                                                                     |
| `npm run typecheck`                        | PASS, all aggregate workspaces                                                                     |
| focused spread-analytics                   | 12 files, 103 passed, 0 failed/skipped                                                             |
| aggregate `npm test`                       | 47 files discovered; 44 passed, 3 live-canary files skipped; 363 tests passed, 3 skipped, 0 failed |
| `npm run build`                            | PASS; all workspaces and web production build                                                      |
| generated routes                           | `/`, `/_not-found`, `/forgot-password`, `/login`, `/register`, `/verify-email`                     |
| Markdown/local links including this report | 70 files, 87 links, 65 local, 0 broken                                                             |
| `git diff --check`; `git fsck --full`      | PASS                                                                                               |

The three skipped tests are the existing opt-in exchange live canaries, correctly
not run solely for this acceptance. A transient Node 26 shell invocation used only
for an initial non-authoritative exploratory hash command was discarded; all
authoritative quality suites and reproduced defect probes above used Node 24.18.1.

## 20. Frozen-boundary evidence

Diff checks confirm no change in market-data, OKX/Binance/Bybit adapters, Phase 2A
documents, Phase 2B formulas/ADR-0009, D1 sources/generated/tests/evidence and
globals bridge, D2, Product/Commerce/Admin, apps/TSX/layout/routes/navigation,
infrastructure or brand assets. The D1 manifest remains
`0d9ade7e225977e6293b7dfd6e3e90afb51b8a1555e35b67c6495b1b24fa3e7e`.

Recalculated brand hashes remain:

- `holyparser-dark.png`:
  `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08`;
- `holyparser-design-system.png`:
  `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54`;
- `holyparser-logo-system.png`:
  `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c`.

The only D1-associated delta remains the explicitly authorized lockfile metadata
sync. The implementation lockfile hash is
`810aaa67382f9b9687f8746e07d3f60f747274470df558f6c34dd98273ee3d59`.

## 21. Accepted limitations and freeze recommendation

Accepted limitations that are not acceptance defects:

- current approved real pair count is zero because frozen Binance/Bybit economics
  remains incomplete;
- the package is a pure in-memory model without persistence, authentication,
  admin runtime or live mappings;
- three live-canary files remain opt-in;
- the seven dependency advisories predate Phase 2B.1 and the dependency graph did
  not change beyond the approved workspace edge.

The implementation cannot freeze while B-01, B-02 and H-01–H-03 remain. Phase
2B.2 is not eligible. The next task must be a narrowly authorized Phase 2B.1
remediation followed by a fresh independent acceptance review; it must not change
D-055/D-064 or any frozen boundary.

Exact recommended next task:

> Authorize a Phase 2B.1 acceptance-remediation task limited to
> `packages/spread-analytics/**` and its implementation evidence. Correct only
> B-01, B-02 and H-01–H-03 from
> `docs/PHASE_2B_1_CANONICAL_INSTRUMENT_MATCHING_ACCEPTANCE.md`: close and validate
> materialized mapping/provenance input before MATCHED eligibility; make admitted
> registry, mapping history, command-digest and policy state runtime-immutable;
> separate incomplete asset diagnostic candidates from asserted
> LINEAR/BASE_UNIT exposure identity; replace the wildcard public barrel with an
> explicit Phase 2B.1 API allowlist; and enforce cancellation checks through every
> bounded loop with no step jump greater than 128. Add one focused regression test
> per finding plus actual-operation boundary and named permutation coverage. Do
> not alter D-055, D-064, frozen contracts/adapters, formulas, dependencies,
> lockfiles, UI or another phase. Run a fresh Node 24.18.1/npm 11.16.0 full suite,
> update implementation evidence, create no commit, and do not begin Phase 2B.2.
