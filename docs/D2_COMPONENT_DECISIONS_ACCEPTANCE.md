# D2 Component Decisions — Formal Independent Acceptance

Status: **PASS_WITH_WARNINGS**

Architecture review: **2026-09-07**  
Final verification: **2026-09-13**  
Reviewed baseline: `236e4a307d4d5d5af77ba022608a5e8275df8975`

This report is the formal independent documentation and architecture acceptance
review of D-089 through D-101 only. It accepts no component implementation,
dependency, consumer migration, route, shell, later D2 checkpoint, or later
phase. The author-produced decision document and prior planning reports were
treated as evidence to reproduce, not as proof.

## 1. Final verdict and authority

The D2 decision package is internally consistent, bounded, deterministic, and
implementable after the remediations recorded below. It is compatible with the
frozen D1 token authority and the accepted D2 planning architecture.

- **BLOCKER:** 0.
- **Unresolved HIGH:** 0.
- **Remediated HIGH:** 7.
- **MEDIUM:** 1 pre-existing worktree-baseline warning.
- **LOW:** 1 evidence-version maintenance warning.
- **ACCEPTED_LIMITATION:** 2.

D-089 through D-101 may freeze. D2.1 is now **eligible for a separate, explicit
Product Owner implementation-authorization task**; it is not authorized by this
report. D2.2 through D2.5 and all later phases remain unauthorized.

## 2. Scope reviewed

### Primary decision and planning evidence

- `docs/D2_COMPONENT_DECISIONS.md`
- `docs/D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN.md`
- `docs/D2_FOUNDATIONAL_COMPONENT_LIBRARY_ACCEPTANCE_PLAN.md`
- `docs/D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN_ACCEPTANCE.md`
- `docs/DECISIONS_REQUIRED.md`
- `docs/RISK_REGISTER.md`
- `docs/ACCEPTANCE_CRITERIA.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/THEME_ARCHITECTURE.md`
- `docs/SECURITY_MODEL.md`
- `docs/DOMAIN_MODEL.md`
- `docs/API_CONTRACTS_PLAN.md`
- `docs/ROADMAP.md`

### Frozen authorities checked

- all D1 planning, decision, implementation, formal-acceptance, evidence, and
  ADR-0013 documents;
- `packages/design-tokens` and the accepted
  `apps/web/src/app/globals.css` bridge;
- Phase 2A.1 through Phase 2A.4 packages, documents, and ADRs;
- `docs/PHASE_2B_SPREAD_ANALYTICS_PLAN.md`,
  `docs/PHASE_2B_ARCHITECTURE_ACCEPTANCE.md`, and ADR-0009;
- Product/Commerce/Admin architecture and acceptance documents and ADR-0010
  through ADR-0012;
- all three files under `docs/brand/references`;
- application TSX, layout, routes, navigation sources, lockfile, and
  infrastructure.

The complete repository tree and initial Git diff were inspected before the
acceptance edits. The 11 modified D2/cross-cutting documents and the untracked
decision document were the author-produced decision package. The root
`package.json` change was already present, had an older filesystem modification
time, and was copied unchanged into the isolated review baseline. It was not
created or modified by this review.

## 3. Decision-by-decision verdict

| Decision | Verdict                    | Independently verified result                                                                                                                                                                                             |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-089    | **PASS after remediation** | `packages/ui` / `@arbitrage/ui`; controlled root, component subpath and stylesheet exports; no deep imports; one explicit stylesheet authority; leaf client boundaries; exact React peer policy; no D1 fork.              |
| D-090    | **PASS after remediation** | no ordinary `className`, `style`, arbitrary variables, unrestricted polymorphism, generic DOM forwarding or raw HTML; finite composition hooks; closed, original-string URL validation with fixed external-link behavior. |
| D-091    | **PASS**                   | repository-native, non-shipping, bounded and deterministic evidence harness; no Storybook or production route; hashed evidence manifests; explicit reconsideration gate.                                                  |
| D-092    | **PASS after remediation** | exact checkpoint browser/AT matrix; automation, browser, manual and static evidence remain distinct; reviewer environments do not authorize dependencies or network installation.                                         |
| D-093    | **PASS after remediation** | one governed portal root; deterministic IDs; SSR-safe closed state; finite focus/inertness/scroll/escape/outside/cleanup contracts; Tabs excluded; no unapproved dismissible Dialog variant.                              |
| D-094    | **PASS**                   | conditional Choice B; no dependency for D2.1, D2.2 or D2.4; D2.3 starts with a separately authorized feasibility task and stops before any package/lockfile change if dependency evidence is required.                    |
| D-095    | **PASS**                   | closed local typed icon registry; no arbitrary SVG, URLs or raw markup; currentColor, finite D1 sizes, AT ownership, provenance, forced-colour and explicit RTL-direction metadata.                                       |
| D-096    | **PASS**                   | five independently reviewable checkpoints; D2.1 reduced to ten core primitives; optional Select/Listbox and Toast remain unselected; Spinner, Cluster and generic Dropdown remain rejected.                               |
| D-097    | **PASS**                   | exact `sm`/`md`/`lg` controls, default/compact density only where approved, 44px hit areas, normative presentation precedence and deterministic invalid-combination behavior.                                             |
| D-098    | **PASS**                   | 50% deterministic pseudo-localization, representative inherited RTL, three-layer forced-colour evidence, bounded pairwise visual matrix, no mirrored financial signs/IDs by inference.                                    |
| D-099    | **PASS after remediation** | HARD_API/HARNESS/RECOMMENDED limits are distinguishable; finite errors and cleanup; user content absent from diagnostics; table input bounds no longer contradict rendered DOM bounds.                                    |
| D-100    | **PASS after remediation** | D2.4 owns semantic non-virtual tables only; D5 owns future virtualization after measured workload evidence; no arbitrary threshold and no D5 authority.                                                                   |
| D-101    | **PASS after remediation** | single package SemVer authority; public output/default/ARIA/focus/export/client-boundary changes classified; bounded deprecation; atomic rollback; no semantic change disguised as a visual patch.                        |

## 4. Exact approved architecture

### Package, API and extension boundary

The package is `packages/ui`, published internally as `@arbitrage/ui`. The root
barrel and explicit lowercase component subpaths expose the same symbols and
types; `src`, internal modules, filesystem imports, tests and evidence are not
public. The exact public stylesheet is `@arbitrage/ui/styles.css`, backed by the
committed `src/styles.css`. Code entry points do not import it. D1 remains the
only token source.

The stable API is semantic and finite. Arbitrary style/class/token/layer/portal
injection, unrestricted `as`/`asChild`, render props, SVG/HTML strings, generic
DOM spreading and caller-defined state attributes are absent. Component-
specific compound composition is permitted only where the accepted semantics
require it.

Link validates presentation safety without claiming destination authorization.
Relative, fragment, query, HTTPS-external, `mailto:` and `tel:` forms are
explicitly bounded. HTTP, protocol-relative, credential-bearing, command/data
schemes, malformed encoding, controls, backslashes and normalization bypasses
fail closed. New-window output is only fixed `_blank` plus
`noopener noreferrer` for external HTTPS.

### Accessibility, state and theme boundary

Native semantics are primary. Names, descriptions, error relationships,
keyboard behavior, focus visibility/return/containment, disabled/read-only/
busy/invalid state, 44px hit targets, non-colour meaning, reduced motion,
DARK/LIGHT, forced colours, reflow, Unicode, pseudo-localization and
representative RTL are acceptance obligations, not later polish.

D2 consumes D1 semantic tokens and its closed forced-colour contract. SYSTEM
selection remains outside D2. Presentation precedence never erases underlying
ARIA or semantic state. Components receive already formatted exact financial
text and never infer precision, units, dates, quality or domain state.

### Checkpoints

1. **D2.1 Core:** Button, IconButton, Link, Badge, StatusBadge, Separator,
   Surface, Card, Stack, Inline.
2. **D2.2 Forms:** Label, FieldMessage, TextInput, TextArea, Checkbox,
   Radio/RadioGroup, Switch, Native Select.
3. **D2.3 Composite/overlay:** Tooltip, Dialog, Popover, Menu/MenuButton, Tabs.
4. **D2.4 Data/feedback:** ProgressIndicator, Skeleton, EmptyState, semantic
   Table primitives, SortableHeader presentation, Pagination presentation.
5. **D2.5 Evidence/adoption:** no new component and no implicit site-wide
   migration.

Each checkpoint freezes independently. A later checkpoint cannot silently
redefine an earlier public, DOM-normative, semantic, accessibility, stylesheet
or evidence contract.

## 5. Cross-decision consistency

**PASS after remediation.** The following dependency edges were reproduced:

- D-089 exports, peers, CSS authority and server/client boundary are fully
  classifiable under D-101.
- D-090 cannot bypass D1 D-084, and its URL filter does not become business
  authorization.
- D-091 can carry the D-092 matrix without a shipping route or implicit package.
- D-093 defines behavior while D-094 deliberately approves no dependency.
- deterministic IDs and one portal root remain within D-099 bounds.
- D-095 supplies the forced-colour and RTL metadata consumed by D-098.
- D-096 checkpoint ownership agrees with the plan and D-100's D5 deferral.
- D-097 preserves rather than redefines D1 state semantics.
- D-098's evidence caps fit D-099; table render cases now fit its DOM cap.
- D-101 aligns package freeze, compatibility, deprecation and rollback with
  D-089 and D-096.

No decision requires a frozen D1 change. No implementation convenience is
allowed to override a normative decision.

## 6. Findings and remediations

### BLOCKER and unresolved HIGH

None.

### Remediated HIGH findings

| ID        | Defect                                                                                                                                                              | Smallest documentation correction                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D2-DA-H01 | D-089 did not uniquely define committed CSS authority, import direction or side-effect retention, allowing generated/distribution CSS to become a competing source. | Declared committed `src/styles.css` the sole source, exact stylesheet export, explicit one-time consumer import, code-side-effect freedom, exact `sideEffects` entry, and ephemeral non-authoritative build output. |
| D2-DA-H02 | React peer ownership and root/subpath server-client behavior lacked exact ranges and compatibility classification.                                                  | Fixed peers to `>=19.2.8 <20`, prohibited a second authority, kept client boundaries at leaves, constrained the root barrel, and classified peer/export/client-boundary changes under D-101.                        |
| D2-DA-H03 | D-090 could accept whitespace/control/backslash/percent-normalization URL bypasses and caller navigation props with ambiguous security behavior.                    | Required validation of the original untrimmed value, separate decoded inspection, WHATWG absolute parsing, finite public flags, fixed target/rel, and rejection of caller target/rel/download/referrer policy.      |
| D2-DA-H04 | The mandatory D-092 browser/AT matrix could be read as permission to install new repository tooling or fetch binaries during evidence capture.                      | Assigned binaries to the formal-review environment, prohibited manifest authority and network installation, and made missing required environments a blocking evidence condition.                                   |
| D2-DA-H05 | D-093 permitted an unspecified outside-dismissible Dialog and conflicted with D-090's input-side `data-*` prohibition for the portal host.                          | Removed that Dialog variant from the initial contract pending a new decision and named the single portal-root marker as the sole non-style host-only exception.                                                     |
| D2-DA-H06 | D-099 simultaneously implied a rendered 500-by-50 table and a 5,000-node evidence ceiling, an impossible acceptance case.                                           | Separated row, column, structured-cell and rendered-DOM bounds; boundary render tests use a small other dimension; 25,000 cells are validated without rendering. D-100 now says the same.                           |
| D2-DA-H07 | D-101 did not deterministically classify public defaults/data attributes, peer ranges, private selectors, internal wrappers and ARIA/focus changes.                 | Added explicit SemVer rows and compatibility conditions; observable semantic/accessibility behavior is MAJOR unless a patch restores an already documented contract.                                                |

All remediations are documentation-only in `docs/D2_COMPONENT_DECISIONS.md`.
Runtime regression tests would violate this task's prohibition on D2
implementation; the required future tests are now explicit normative acceptance
gates.

### MEDIUM and LOW

- **MEDIUM — unrelated dirty baseline:** root `package.json` differs from HEAD
  by adding the already implemented D1 workspace to aggregate commands. Its
  bytes were unchanged during this review, it adds no dependency, and D2 does
  not rely on it. It should be committed or otherwise reconciled with its own
  owning work before a clean D2.1 implementation baseline is declared.
- **LOW — moving external version labels:** D-092 intentionally uses current
  stable browser/OS/AT releases. Reproducibility therefore depends on every
  formal report recording exact versions. This is explicit and does not weaken
  the required matrix.

### Accepted limitations

- This documentation review does not and cannot supply future component,
  rendered browser, screen-reader, touch or native forced-colour evidence. The
  affected checkpoint cannot freeze without that evidence; absence is not
  represented as a pass.
- The unchanged dependency graph has production advisories as of 2026-09-13:
  `nanoid` HIGH, `sharp` HIGH, and `next` CRITICAL. The last includes reported
  Windows-hosted and AVIF Image Optimization attack paths; applicability and
  remediation need a separate security-maintenance review. D2 decisions
  introduced no dependency or lockfile change. This architecture acceptance
  grants no production-readiness approval.

## 7. Acceptance-plan verdict

**PASS.** The acceptance plan distinguishes author evidence from reproduced
proof, planning freeze from implementation authority, and checkpoint acceptance
from aggregate D2 freeze. It has component-contract, accessibility, browser/AT,
theme, forced-colour, security/resource, table, overlay, evidence,
migration/rollback and frozen-boundary gates. A checkpoint may fail without
accepting a later checkpoint. BLOCKER must be zero and unresolved HIGH must be
zero before any freeze.

The accepted decisions close the D-089 through D-101 decision gate. They do not
waive the separate implementation and formal checkpoint reviews.

## 8. Verification evidence

### Isolated authoritative environment

A fresh shallow clone at the reviewed commit was created outside the workspace;
the author decision-package documents and the pre-existing `package.json` bytes
were overlaid before verification. No result below came from a contaminated
build directory.

- Node: `v24.18.1`.
- npm: `11.16.0`.
- npm workspaces: 7.
- `npm ci`: PASS; 450 packages added, 458 packages audited.
- Dependency audit during the 2026-09-13 install: 7 advisories (2 MODERATE,
  4 HIGH, 1 CRITICAL) in the unchanged graph.
- Production audit on 2026-09-13: 3 advisories (2 HIGH: `nanoid`, `sharp`;
  1 CRITICAL: `next`), nonzero as expected for this separate dependency debt.

### Commands and exact results

| Command/check                                       | Result                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `npm ci`                                            | PASS; 450 added / 458 audited                                               |
| `npm run format:check`                              | PASS                                                                        |
| `npm run lint`                                      | PASS across all 7 workspaces                                                |
| `npm run typecheck`                                 | PASS across all 7 workspaces                                                |
| `npm test`                                          | PASS; 39 test files, 337 tests total, 334 passed, 3 skipped, 0 failed       |
| `npm audit --omit=dev --json`                       | nonzero; unchanged production graph has 2 HIGH and 1 CRITICAL               |
| Markdown/local-link validator                       | PASS; 64 Markdown files, 58 links, 36 local links, 0 broken                 |
| `git diff --check`                                  | PASS in the isolated reviewed snapshot; workspace also passed on 2026-09-07 |
| documentation-only allowlist                        | PASS                                                                        |
| D1 freeze check                                     | PASS; no diff                                                               |
| Phase 2A package/document freeze check              | PASS; no diff                                                               |
| accepted Phase 2B/ADR-0009 check                    | PASS; no diff                                                               |
| Product/Commerce/Admin frozen-document check        | PASS; no diff                                                               |
| application TSX/layout/routes/navigation check      | PASS; no diff                                                               |
| `apps/web/src/app/globals.css` check                | PASS; no diff                                                               |
| infrastructure and `package-lock.json` check        | PASS; no diff                                                               |
| D2 plan/acceptance baseline byte comparison         | PASS                                                                        |
| root `package.json` review-baseline byte comparison | PASS; unchanged by review                                                   |

Test totals comprise 74 D1 Node tests plus 263 Vitest tests. The three skipped
tests are the existing opt-in public exchange canaries; running them is neither
required nor appropriate for this documentation-only review.

The aggregate commands used the pinned executable directory
`/opt/homebrew/opt/node@24/bin` ahead of system executables. The two changed
documents also passed an explicit Prettier check, because the repository's
aggregate formatting script does not include every top-level document.

The documentation completeness check found exactly 13 decision records,
D-089 through D-101, each with alternatives, approved choice, rejected
alternatives, authorities, implementation gate, production gate and revisit
rule; missing fields: 0. The local-link check traversed `docs/**/*.md`,
`README.md` and `AGENTS.md`, excluded fenced examples, and checked relative
destinations after fragment removal against the local filesystem.

### Brand-reference integrity

| File                                                 | SHA-256                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/brand/references/holyparser-dark.png`          | `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08` |
| `docs/brand/references/holyparser-design-system.png` | `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54` |
| `docs/brand/references/holyparser-logo-system.png`   | `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c` |

These equal the accepted D1/Product-Design baselines.

## 9. Frozen-boundary and change inventory

Final direct byte comparisons on 2026-09-13 reproduced the frozen checks
without relying on a delayed iCloud/Git index refresh:

| Protected group                                 | Tracked files checked | Changed |
| ----------------------------------------------- | --------------------: | ------: |
| D1 package and Phase 1 CSS bridge               |                    24 |       0 |
| D1 documents and ADR-0013                       |                     8 |       0 |
| D1 evidence                                     |                    79 |       0 |
| Phase 2A packages                               |                   125 |       0 |
| frozen Phase 2A/2B documents and ADRs           |                    16 |       0 |
| Product/Commerce/Admin documents and ADRs       |                    10 |       0 |
| application source, infrastructure and lockfile |                    20 |       0 |

The protected-directory untracked-file check also returned no extra files.
The root `package.json` digest remains
`41f156d410cb2db2b6c73479c82bae8b705778dd41eed090284b39c69243823e`;
`package-lock.json` remains
`490609469b0fb2bb5075a1c902cbb6eef262cf39e1cfb3be5aef37aac55c6de5`.

Files changed by this independent review only:

- `docs/D2_COMPONENT_DECISIONS.md` — seven HIGH documentation remediations;
- `docs/D2_COMPONENT_DECISIONS_ACCEPTANCE.md` — this formal report.

No source, test, manifest, lockfile, infrastructure, application, D1, adapter,
Phase 2B, Product/Commerce/Admin frozen document, or brand-reference file was
modified. The pre-existing author decision-package and unrelated
`package.json` changes remain visible in the worktree and were preserved.

## 10. Freeze recommendation and next task

Freeze the D-089 through D-101 decision package together with this report and
the accepted D2 planning package. Do not infer implementation authority from
the freeze.

Exact recommended next task:

```text
Read AGENTS.md and all frozen architecture, design, theme, security, roadmap,
decision, risk, acceptance, frozen D1, frozen D2 planning, and formally accepted
D-089 through D-101 documents completely. Treat D1, the D2 planning package,
and docs/D2_COMPONENT_DECISIONS.md as frozen normative authorities.

Implement D2.1 — Core Foundational Components only in a new packages/ui
workspace: Button, IconButton, Link, Badge, StatusBadge, Separator, Surface,
Card, Stack, and Inline. Apply only the D-089 through D-101 contracts applicable
to D2.1. Use D1 semantic tokens exclusively. Add no external dependency. Create
no production evidence route and perform no consumer migration.

Before changing files, inspect the complete repository and git diff; require a
clean committed baseline or explicitly isolate all pre-existing changes;
confirm frozen D1, Phase 2A, Phase 2B, Product/Commerce/Admin and brand
boundaries; present the exact implementation/evidence/configuration allowlist,
migration exclusion and atomic rollback boundary; and stop if implementation
requires application TSX, layout.tsx, routes, navigation, DOM, globals.css,
infrastructure, a D1 change, another component/checkpoint, or a third-party
dependency.

Implement the controlled @arbitrage/ui exports and explicit stylesheet from
D-089; conservative extension and Link URL policy from D-090; non-shipping
repository-native evidence harness from D-091; D2.1 accessibility matrix from
D-092; closed icon registry required by IconButton/StatusBadge from D-095; exact
D2.1 scope from D-096; applicable size/state contracts from D-097; localization,
RTL, forced-colour and bounded visual evidence from D-098; D-099 resource and
diagnostic bounds; and D-101 versioning/rollback. Do not implement D2.2, D2.3,
D2.4, D2.5 adoption, D3, D4, D5, D6, I1, C1 or Phase 2B.1.

Add focused semantic, API-closure, keyboard/focus, theme, forced-colour,
localization/RTL, hostile-input, resource-bound, deterministic-evidence,
package-boundary, versioning and rollback tests. Reproduce the approved D2.1
browser/AT evidence. Run the full pinned Node 24 repository verification and
create an implementation-produced D2.1 pre-acceptance report. Do not create a
commit. End with whether D2.1 is ready for a separate formal independent
acceptance review and provide that exact recommended review prompt.
```
