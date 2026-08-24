# D1 Brand and Semantic Design Tokens — Formal Acceptance Review

Final status: **PASS_WITH_WARNINGS**  
Review date: 2026-08-17  
Reviewed phase: **D1 only**  
Freeze recommendation: **FREEZE D1**

This is the independent acceptance record. The implementation report and the
contents of `docs/evidence/d1` were treated as implementation-produced
evidence and were reproduced or independently checked before use.

## 1. Accepted scope and boundary verdict

D1 is accepted as the repository's bounded token foundation:

- ordered, data-only canonical token sources and closed metadata;
- bounded validation, complete-value aliases and deterministic generation;
- committed CSS, TypeScript metadata and integrity manifest;
- authored DARK and LIGHT token maps, with DARK as the safe resolved default;
- typography, foundation scales, status, financial, quality, capability,
  chart, contrast and forced-colour contracts;
- raw-value governance, compatibility/versioning and atomic rollback;
- the Phase 1 compatibility bridge in `apps/web/src/app/globals.css`;
- tests, synthetic fixtures and implementation evidence.

The implementation boundary passes. No application TSX, `layout.tsx`, route,
DOM, navigation, lockfile, dependency, infrastructure, frozen adapter,
accepted Phase 2B document or brand reference was modified. The CSS diff is a
token/compatibility bridge and contains no page redesign authority.

## 2. Reviewed files

The review covered:

- `docs/D1_BRAND_AND_SEMANTIC_TOKENS_IMPLEMENTATION.md`;
- all D1 planning, decision, decision-acceptance and ADR-0013 documents;
- all canonical, generated, fixture, script and test files under
  `packages/design-tokens`;
- `apps/web/src/app/globals.css` and all unchanged Phase 1 token/style
  consumers;
- all manifests, reports and 70 raster files under `docs/evidence/d1`;
- the frozen Phase 2A packages/documents, accepted Phase 2B plan/acceptance/
  ADR-0009, Product/Commerce/Admin architecture, application TSX, lockfile,
  infrastructure and all three brand references as boundary controls.

Inventory classification:

| Class                    | Count | Boundary                                                    |
| ------------------------ | ----: | ----------------------------------------------------------- |
| Canonical/schema files   |     6 | schema, metadata, token, contrast, status and chart sources |
| Generated artifacts      |     3 | CSS, TypeScript metadata and manifest                       |
| Phase 1 migration bridge |     1 | `apps/web/src/app/globals.css`                              |
| D1 scripts               |     5 | validation, generation, governance and evidence tooling     |
| D1 test/support files    |     5 | four test files and one helper                              |
| Synthetic fixture files  |     2 | fixture manifest and self-contained rollback bundle         |
| Evidence JSON            |     9 | inventory, three capture manifests and five reports         |
| Visual evidence rasters  |    70 | 12 baseline, 24 result and 34 additional                    |

## 3. D-079 through D-088 verdicts

| Decision | Verdict              | Independent evidence                                                                                                                                                                                                                                                                                                                                                |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-079    | PASS                 | `tokens.source.json` is the ordered canonical token source; `token-set.meta.json` is closed metadata authority. Source-to-artifact flow is one-way, generation is byte-stable, and the manifest verifies exact source and output bytes while excluding itself.                                                                                                      |
| D-080    | PASS                 | Approved heading, UI and data stacks are present in order; no font dependency or remote font was added. Geist remains compatible, tabular numerals are explicit, and decimal alignment is not implemented with whitespace.                                                                                                                                          |
| D-081    | PASS                 | Independent WCAG calculation passed all 162 legal DARK/LIGHT pair resolutions. Minimum ratio was `3.08029194656:1` for DARK `border.emphasis` on `background.elevated`, against a `3:1` requirement. Brand blue and financial positive remain separate tokens.                                                                                                      |
| D-082    | PASS                 | Eight deterministic and unique colour/marker/dash tuples exist. Series nine fails with `CHART_SERIES_CAPACITY_EXCEEDED`; 15 chart semantics exist and critical meanings have redundant encoding.                                                                                                                                                                    |
| D-083    | PASS                 | The accepted spacing, sizing, border, radius, opacity, motion, easing, elevation, semantic-layer and resource bounds are finite and validated. The 44x44 hit-target contract, 2px focus width and 2px focus offset are explicit.                                                                                                                                    |
| D-084    | PASS                 | The scanner is property-aware, bounded and closes tested colour, case, shadow, font, easing, governed-percentage and reduced-motion-constant bypasses. Findings: 0. Active exceptions: 0.                                                                                                                                                                           |
| D-085    | PASS                 | Independent SemVer, compatibility-alias, one-hop replacement, expiry and rollback tests pass. The initial compatibility cohort has version/date provenance and the initial rollback no longer depends on Git history.                                                                                                                                               |
| D-086    | PASS                 | DARK is the safe default. The bridge changes only `globals.css`; Geist, TSX, layout, routes, DOM, navigation, breakpoints and interaction structure remain unchanged. Legacy aliases are one-way and time/version bounded.                                                                                                                                          |
| D-087    | PASS_WITH_LIMITATION | The ten-value `systemColor` grammar and ten mappings are closed; arbitrary values and `forced-color-adjust:none` fail policy. OS-level forced-colours rendering was not available and is not claimed.                                                                                                                                                               |
| D-088    | PASS_WITH_LIMITATION | Inventory and hashes verify 12 baselines, 24 DARK/LIGHT results and 34 additional captures. A current production DARK view was independently reproduced. All 21 visible focusable elements across the six reference routes passed a current 2px ring/2px offset audit. Native browser 200% zoom and OS forced-colours remain explicitly limited as described below. |

ADR-0013 remains consistent and legitimately **Accepted**: the implemented
source set, metadata authority, committed artifacts, independent SemVer and
drift policy match D-079 and D-085.

## 4. Schema, resource bounds and hostile input

Verdict: **PASS after remediation**.

The validator rejects malformed JSON/UTF-8, unknown fields and categories,
duplicate or unsorted IDs, missing theme values, unknown/circular/deep/
cross-type aliases, duplicate CSS names, invalid structured values, hostile
CSS/URL/import/control characters, excessive record counts and weakened
bounds. Diagnostics stop at 200 and do not echo full hostile payloads.

An independent adversarial review found that early file/diagnostic work could
consult untrusted metadata bounds and that an unknown top-level
`tokens.source.json` field was accepted. Both were HIGH because hostile input
could weaken fail-closed validation. Security bounds now come from immutable
approved constants before metadata validation, the top-level source is closed,
and focused regression tests pass.

## 5. Alias, compatibility and rollback verdict

Alias resolution is deterministic over sorted canonical records. Unknown,
circular, type-incompatible and depth-nine aliases fail. Deprecated tokens
require complete migration metadata; replacement type/family compatibility and
the one-hop maximum are enforced.

The initial compatibility alias cohort records introduction/deprecation
version, creation date, version/date removal floor and migration note. The
two-subsequent-minor-release **and** 90-day minimum remains binding.

Initial rollback was independently rehearsed from
`packages/design-tokens/fixtures/initial-rollback.bundle.json`. It restores
the prior CSS export, legacy token file and pre-D1 `globals.css` bytes in an
independent tree and verifies their hashes. Git history is not required. Later
rollback remains an atomic canonical source/artifact/manifest/alias revision.

## 6. Deterministic generation and integrity

Verdict: **PASS**.

Repeated same-directory generation and clean independent-directory generation
were byte-identical. Stable ordering, exact LF serialization, manifest digest
verification and self-hash exclusion passed. Generated output contains no
timestamps, host paths, machine IDs, locale/environment values, randomness,
network-derived values or secrets.

Independent current artifact SHA-256 values:

| Artifact                                                | SHA-256                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/design-tokens/generated/tokens.css`           | `be350659e42dde66a96b00f4715865d100b16536e062f463da4b566c00650a43` |
| `packages/design-tokens/generated/tokens.generated.ts`  | `a2a9ab120a6f9705612033f36f2c2c57ee2a94787229188e4ca6ca81a8287fae` |
| `packages/design-tokens/generated/tokens.manifest.json` | `c27dffb821cd97ed637eb7f6a4f6e47d38dd626626119f978bc631f5fdc37989` |

The generated TypeScript declaration was remediated during review because its
chart and forced-colour types did not match emitted runtime objects. The
generated contract now matches the emitted shape and has a regression test.

## 7. Theme, typography, status and chart evidence

- 141 canonical tokens, including 137 semantic tokens, resolve with identical
  DARK/LIGHT IDs and types.
- SYSTEM remains preference metadata and does not produce a third resolved
  map. DARK is `:root`; explicit dark and light selectors are emitted.
- Light values are authored rather than inverted, and theme selection cannot
  change financial, capability or data-quality meaning.
- All approved typography stacks, finite sizes, line heights, weights and
  tracking pass. No new or remote font is required.
- All 18 presentation records contain colour token, localizable label key,
  icon, marker/shape, accessible description and pattern/dash where relevant.
- Eight categorical tuples are unique; 15 semantic chart encodings, fill-only
  restrictions and the typed ninth-series failure pass.
- All 162 legal contrast checks pass independently; arbitrary pairings receive
  no accessibility claim.

## 8. Raw-value governance

Verdict: **PASS after remediation**.

The repository scan reports zero findings and zero active exceptions for the
governed `globals.css` boundary. Narrow source/generated/test/evidence
exclusions are explicit. An exception requires exact file/property/value,
reason, owner, approver, dates and cleanup information; broad, expired,
orphaned, widened and unused records fail.

Focused hostile fixtures were added after the review demonstrated bypasses for
named/case-variant colours, shadows whose colour was a token, font families and
weights, raw easing, governed percentages and misplaced `0.01ms`. All are now
rejected. The property-specific `border-radius:50%` geometry and approved
reduced-motion safety constant remain narrow technical exclusions rather than
general bypasses.

## 9. Phase 1 migration and current rendering

Verdict: **PASS**.

Only the approved CSS bridge changed. Legacy variables are mapped or retained
under policy; component/page geometry stays local. The production application
builds and statically generates `/`, `/_not-found`, `/forgot-password`,
`/login`, `/register` and `/verify-email`.

The current production DARK `/login` route was independently loaded at
1440x900, DPR 1. It resolved `--hp-semantic-color-action-primary` to
`#3384ff` and loaded the generated canonical CSS. A route-wide keyboard audit
found 21 visible focusable elements across the six D-088 reference routes;
21/21 exposed a solid focus ring at least 2px wide with a 2px offset.

## 10. Visual evidence verdict

All three visual manifests parse and every recorded file hash verifies:

- baseline manifest: 12 captures, 0 hash failures;
- result manifest: 24 captures, 0 hash failures;
- additional manifest: 34 captures, 0 hash failures;
- total primary captures: 36; total raster evidence: 70.

Representative baseline, DARK result, LIGHT result, focus, fallback-font,
pseudo-localized, reflow-equivalent and static forced-colour images were
inspected. The capture inventory correctly describes implementation-produced
evidence, not formal proof.

The raster files use JPEG encoding despite their historical `.png` filenames.
Their dimensions and hashes are valid and deterministic, but the extension/
encoding mismatch is recorded as LOW evidence hygiene debt; renaming all
evidence would add no D1 correctness value.

## 11. Security and supply-chain verdict

Verdict: **PASS_WITH_WARNING**.

- generation is local, bounded, deterministic and network-free;
- token values cannot contain remote loads, arbitrary declarations, `url()`,
  `@import`, control characters or environment-controlled CSS;
- generated files contain no credentials, secrets, host paths or environment
  values;
- no dependency, lockfile, remote font or CSP change was introduced;
- package source/output and alias graphs are bounded;
- repository secret and forbidden-scope scans found no D1 violation.

`npm audit --omit=dev` reports one current HIGH-severity advisory for the
pre-existing transitive `nanoid <3.3.18` (GHSA-2v37-7h3g-55p8; CVSS 5.9).
D1 did not change dependencies or `package-lock.json`, and this acceptance task
forbids doing so. It is therefore a repository dependency warning, not an
unresolved D1 HIGH finding, and requires a separately authorized dependency
maintenance task.

## 12. Findings and remediations

### BLOCKER and unresolved HIGH

None.

### Remediated HIGH findings

1. **Untrusted metadata could influence validation resource bounds.** Fixed by
   using immutable D-083 security bounds before metadata validation; hostile
   metadata regression added.
2. **Top-level source/schema closure was incomplete.** Fixed by rejecting
   unknown source fields and validating namespace/artifact policy/output set.
3. **Generated TypeScript chart/forced-colour types disagreed with runtime
   values.** Fixed at generation and covered by a focused artifact test.
4. **Raw-value scanner had representation/property bypasses.** Fixed with
   property-aware coverage and adversarial regression tests.
5. **Compatibility aliases lacked complete lifecycle metadata.** Fixed with a
   bounded initial cohort and deprecated-token migration validation.
6. **Initial rollback depended on baseline Git objects.** Fixed with a
   self-contained, hashed rollback bundle and independent-tree rehearsal.

### MEDIUM/LOW findings

- MEDIUM: the production dependency audit advisory described above remains
  open outside D1 authority.
- LOW: evidence raster extensions say `.png` while bytes are JPEG.
- LOW: visual manifests contain file hashes and capture parameters but do not
  cryptographically bind a browser binary/version to each raster.

## 13. Accepted limitations

- The six 720x450 captures are explicitly 200% reflow equivalents for a
  1440x900 viewport, not native browser zoom evidence.
- Forced-colour evidence is static D-087 contract evidence from a non-shipping
  harness, not OS-level browser emulation.
- Rendered component/chart forced-colour, responsive component and full visual
  regression evidence remain D2/D4/D5 responsibilities.
- Preferred font packages were not installed; correctness relies on the
  accepted fallback contract as required.

## 14. Authoritative verification

Fresh isolated tree: `/private/tmp/holyparser-d1-final3.YTBZfX`  
Runtime: Node `v24.18.1`, npm `11.16.0`  
Install: `npm ci`, 450 packages installed, 458 audited  
Workspaces: 7

Commands and results:

```text
npm ci                                      PASS
npm run format:check                        PASS
npm run lint                                PASS (7 workspaces)
npm run typecheck                           PASS (7 workspaces)
npm test                                    PASS
npm run build                               PASS (7 workspaces)
node packages/design-tokens/scripts/generate.mjs --check
                                            PASS
node packages/design-tokens/scripts/scan-raw-values.mjs
                                            PASS, 0 findings / 0 exceptions
npm audit --omit=dev --json                  WARNING, 1 pre-existing HIGH
git diff --check                            PASS
Markdown/local-link validation              PASS, 57 files / 27 links / 0 missing
manifest/source/evidence SHA-256 verification
                                            PASS
```

Exact test results:

| Workspace                     | Test files |  Passed | Failed | Skipped |
| ----------------------------- | ---------: | ------: | -----: | ------: |
| design-tokens                 |          4 |      74 |      0 |       0 |
| contracts                     |          1 |       4 |      0 |       0 |
| market-data                   |          4 |      57 |      0 |       0 |
| OKX public adapter            |          9 |      52 |      0 |       1 |
| Binance USDⓈ-M public adapter |          9 |      72 |      0 |       1 |
| Bybit linear public adapter   |         10 |      69 |      0 |       1 |
| web                           |          2 |       6 |      0 |       0 |
| **Total**                     |     **39** | **334** |  **0** |   **3** |

The three skipped files are the existing default-off public venue canaries.
The Next.js 16.2.11 production build compiled, type-checked and generated all
six application routes successfully.

## 15. Frozen-boundary evidence

The review found no unauthorized change in:

- `packages/market-data`, `packages/okx-public-adapter`,
  `packages/binance-usdm-public-adapter` or
  `packages/bybit-linear-public-adapter`;
- frozen Phase 2A documents;
- `docs/PHASE_2B_SPREAD_ANALYTICS_PLAN.md`,
  `docs/PHASE_2B_ARCHITECTURE_ACCEPTANCE.md` or ADR-0009;
- frozen Product/Commerce/Admin architecture documents;
- application TSX, `layout.tsx`, routes, DOM/navigation, package lock or
  infrastructure.

Brand-reference SHA-256 values remain:

- `holyparser-dark.png`:
  `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08`;
- `holyparser-design-system.png`:
  `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54`;
- `holyparser-logo-system.png`:
  `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c`.

## 16. Freeze recommendation and next task

D1 has zero BLOCKER findings and zero unresolved D1 HIGH findings. The
authoritative Node 24 suite, generation/integrity checks, contrast/chart/raw
governance, migration, rollback and frozen-boundary checks pass. D1 **can be
frozen** with the accepted limitations above.

Do not start another implementation phase from this acceptance record alone.
The exact recommended next task is:

> Read AGENTS.md and all frozen design, theme, security, roadmap, D1 planning,
> D1 decision, D1 implementation and D1 formal acceptance documents
> completely. Treat D1 as frozen and approved. Perform a documentation-only
> architecture, implementation-plan and formal acceptance decomposition for
> D2 — Foundational Component Library only. Do not modify D1 tokens or the
> Phase 1 bridge, do not implement components, do not add dependencies, and do
> not begin D4, D5, I1, C1 or Phase 2B.1. Define the component taxonomy,
> accessibility and forced-colour obligations, state/variant contracts,
> responsive and localization boundaries, test/Storybook-or-equivalent
> evidence options without selecting new tooling by assumption, migration
> boundary, security/resource limits, independently testable checkpoints,
> acceptance criteria, freeze requirements, unresolved product/design/
> accessibility decisions, and the exact recommended D2 implementation prompt.
> Create the D2 planning and acceptance-plan documents, update only relevant
> roadmap/design/security/risk/decision/acceptance documents, run
> documentation-focused verification, do not create a commit, and do not begin
> implementation without separate Product Owner approval.
