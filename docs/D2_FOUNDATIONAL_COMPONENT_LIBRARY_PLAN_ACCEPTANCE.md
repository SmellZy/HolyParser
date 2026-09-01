# D2 Foundational Component Library Planning Acceptance

Status: **PASS_WITH_WARNINGS**  
Review date: **2026-09-01**  
Scope: independent documentation and architecture acceptance of the D2 planning package only  
Implementation authorization: **none**

## 1. Executive verdict

The D2 planning package is coherent, bounded, independently reviewable, and
ready to freeze after the documentation remediations recorded below. It keeps
D2 at the reusable presentation/component layer, preserves D1 as the only
token authority, separates D3/D5/D6 concerns, and makes component implementation
conditional on explicit D-089 through D-101 decisions.

No BLOCKER or unresolved HIGH finding remains. This review corrected HIGH
documentation contradictions concerning state preservation, tooltip semantics,
conditional portal ownership, Tabs review requirements, URL/ID policy ownership,
and the exact decision gates. No component code, dependency, manifest, lockfile,
application source, D1 artifact, frozen adapter, accepted analytics document,
brand reference, or infrastructure file was changed.

The package may freeze. The D-089 through D-101 decision task may begin. D2.1
implementation remains prohibited until every decision applicable to D2.1 is
approved and separately accepted.

## 2. Reviewed scope and evidence

### 2.1 Primary planning documents

- `D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN.md`;
- `D2_FOUNDATIONAL_COMPONENT_LIBRARY_ACCEPTANCE_PLAN.md`;
- `ROADMAP.md`;
- `DESIGN_SYSTEM.md`;
- `THEME_ARCHITECTURE.md`;
- `DOMAIN_MODEL.md`;
- `API_CONTRACTS_PLAN.md`;
- `SECURITY_MODEL.md`;
- `RISK_REGISTER.md`;
- `DECISIONS_REQUIRED.md`;
- `ACCEPTANCE_CRITERIA.md`.

### 2.2 Frozen inputs checked

- `MASTER_SPEC.md`, `ARCHITECTURE.md`, and
  `PRODUCT_INFORMATION_ARCHITECTURE.md`;
- the complete D1 plan, acceptance plan, planning acceptance, decisions,
  decision acceptance, implementation report, formal acceptance, ADR-0013,
  package, generated artifacts, scripts, tests, evidence, and accepted
  `apps/web/src/app/globals.css` bridge;
- Phase 2A.1 through Phase 2A.4 implementation/acceptance documents and all four
  frozen adapter packages;
- `PHASE_2B_SPREAD_ANALYTICS_PLAN.md`,
  `PHASE_2B_ARCHITECTURE_ACCEPTANCE.md`, and ADR-0009;
- Product/Commerce/Admin architecture documents, acceptance report, and
  ADR-0010 through ADR-0012;
- all three files under `docs/brand/references`.

### 2.3 Phase 1 source inspected as evidence only

The existing Next.js application shell, sidebar/navigation, authentication
cards and fields, icon helper, page routes, tests, layout, and global styling
were inspected to validate the pattern inventory. They are evidence of current
usage, not normative D2 APIs, and were not modified.

## 3. Scope-isolation verdict

**PASS.** D2 owns reusable, presentation-only component contracts. It does not
own page shells, route composition, navigation, dashboards, financial
calculations or formatting, analytics, trading actions, authentication,
commerce, administration, persistence, events, charts, order-book rendering,
or virtualization.

D1 remains the sole token authority. D2 cannot create token values, reinterpret
financial/data-quality/capability meaning, or treat a visual value change as
permission to change markup, copy, layout, route behavior, or interaction.
Phase 1 migration is proof-first, separately approved, named, bounded, and
checkpoint-atomic; this planning package authorizes no consumer migration.

## 4. Component-classification verdict

**PASS.** The taxonomy is intentionally finite and semantically differentiated:

- D2 REQUIRED contains core actions, links, form controls, status/presentation,
  simple composition, overlays/composites, and presentation-only table
  foundations.
- D2 OPTIONAL limits Custom Select/Listbox and Toast/notification viewport to a
  measured need and explicit scope decision.
- REJECT keeps Spinner out as a duplicate public loading primitive, Cluster out
  as redundant composition vocabulary, and generic Dropdown out because it
  hides whether the interaction is a menu, selection control, or popover.
- DEFER assigns shells/navigation to D3, virtualization/financial grids/charts
  and order books to D5, and admin-specific confirmation/bulk workflows to D6.

Button and Link remain semantically distinct; Menu and Select remain distinct;
StatusBadge consumes an explicit D1 presentation record and never derives a
domain state. D-096 may reduce the initial set. Expansion requires new scope
approval.

## 5. API and state verdict

**PASS.** Every applicable component must define purpose, non-goals, semantic
element/role, accessible relationships, finite public props and states,
interaction behavior, controlled/uncontrolled rules, responsive/localization
behavior, theme/forced-colour/motion behavior, bounds, security, test duties,
API version, and migration notes.

Public vocabulary is semantic (`intent`, `variant`, `size`, `density`,
`emphasis`, `state`); raw names such as `blue`, `radius12`, `shadow3`, and
`zIndex70` are prohibited. D-090 now explicitly owns class/style hooks,
polymorphism, composition, slots/render props, stable data attributes, and URL
handling. D-089 owns deterministic ID and SSR/client-boundary policy.

The state precedence is presentation precedence only and cannot erase lower
semantic attributes. Required combinations have deterministic outcomes,
including preservation of `aria-pressed` meaning when a pressed control becomes
disabled. Checked plus indeterminate and hidden plus focused are rejected.
CSS selector order is not accepted as the state machine. Finite diagnostic
codes cannot contain user content.

## 6. Accessibility verdict

**PASS.** Accessibility is a component invariant, not deferred polish. The
contract covers native-first semantics, names, labels, descriptions, errors,
announcements, keyboard operation, focus visibility and order, disabled versus
`aria-disabled`, read-only/busy/invalid/composite states, 44 by 44 hit targets,
non-colour encoding, reduced motion, both themes, forced colours, zoom/reflow,
text scaling, localization, and approved RTL behavior.

Tooltip is supplemental, available from a focusable trigger and pointer, and
cannot own the only label or error. Interactive tooltip content is prohibited
and belongs in Popover or Dialog. Overlay contracts include initial and
contained focus where appropriate, Escape/outside policy, restoration,
background inertness and scroll lock only for approved modal behavior, nesting,
and deterministic cleanup. Static ARIA review is explicitly insufficient for
browser, keyboard, screen-reader, zoom, touch, portal, hydration, or
forced-colour evidence.

## 7. D1, theme, forced-colour, responsive, and localization verdict

**PASS.** Components consume D1 semantic tokens without creating a competing
system. DARK and LIGHT preserve meaning; SYSTEM remains outside D2. The closed
D1 `systemColor` contract applies, and `forced-color-adjust: none` requires the
governed exception path.

D2 owns intrinsic sizing, wrapping, hit areas, component-local stacking,
approved densities, and overflow. D3 retains shell/page breakpoints and layout;
D5 retains dense-grid performance and virtualization. Required content cannot
be silently clipped. D2 accepts already formatted financial strings and never
guesses precision, unit, sign, date, or time. Unknown is distinct from zero, and
RTL does not reverse identifiers or financial signs by assumption.

## 8. Table verdict

**PASS.** Table primitives are limited to semantic structure, caption, rows and
cells, sorting-state presentation and intent, selectable-row presentation,
loading/empty/error/degraded/unavailable presentation, sticky compatibility,
overflow/focus, tabular-number hooks, and decimal-alignment hooks.

Fetching, calculation, rounding, ranking, market sorting, financial formatting,
virtualization, live-update batching, and trading actions are prohibited.
Financially relevant text must remain fully available rather than existing only
behind ellipsis or hover. D-100 blocks D2.4 and retains virtualization in D5
unless a later measured, accessible decision changes ownership.

## 9. Overlay verdict

**PASS.** Dialog, Popover, Tooltip, Menu/MenuButton, and Tabs retain separate
semantics. D-093 must decide whether portals are used; if approved, the root is
singular, governed, and not user-controlled. D-094 must approve any headless
dependency before dependency or D2.3 work begins.

The plan covers stable IDs, layers, SSR/hydration, collision, touch/pointer and
keyboard parity, finite close reasons, focus restoration, cleanup, finite
nesting, modal-only inertness/scroll locking, and denial of arbitrary portal
targets, layers, HTML, CSS, or URLs. Tabs is correctly reviewed as a non-overlay
composite and is not subjected to portal, outside-interaction, inertness, or
scroll-lock requirements.

## 10. Evidence/tooling and test-strategy verdict

**PASS.** The plan compares repository-native evidence, a non-shipping route
harness, Storybook, and another isolated workbench across accessibility,
keyboard/focus, themes, forced colours, widths, pseudo-localization,
determinism, CI cost, dependency/supply-chain impact, and maintenance. No tool
or dependency is silently selected; D-091 and D-092 own the choices, and
production route leakage is prohibited.

Later checkpoint acceptance requires semantic/render, name/relationship,
state, invalid-combination, theme, token/raw-value, forced-colour, motion,
localization, Unicode/RTL, overflow, hostile-input, resource, deterministic,
compatibility, and API tests. Browser-level evidence is mandatory where unit
tests cannot establish keyboard/focus, composite widgets, pointer/touch,
portals, collision, scroll lock, nested overlays, hydration, zoom, forced
colours, or screen-reader behavior.

## 11. Security and resource verdict

**PASS.** D-099 owns exact finite limits for children, DOM nodes, options, menu
depth, tabs, non-virtual table rows/cells, overlay nesting, portal roots,
content, diagnostics, animation, listeners, timers, and cleanup. Limits and
failure modes block implementation of each affected checkpoint.

Text is escaped by default. Raw HTML, arbitrary SVG, unconstrained URL schemes
or origins, untrusted class/style/token/layer/portal targets, recursive overlay
growth, user-content diagnostics, runaway animation, and leaked listeners or
timers are prohibited. Failed focus containment must fail safe rather than trap
the user.

## 12. Migration and rollback verdict

**PASS.** D2 can begin with zero production adoption. A component is proven and
accepted before a separately approved exact consumer allowlist may use it.
Routes, page structure, copy, business behavior, D1 artifacts, and the D1
`globals.css` bridge remain frozen. Legacy removal is a separate scope.

Rollback is checkpoint-atomic and restores the prior accepted export/evidence
and every explicitly migrated consumer together. A mixed legacy/component
state is not an acceptable rollback.

## 13. Checkpoint-decomposition verdict

**PASS_WITH_WARNING.** The sequence is coherent:

1. D2.1 — core non-overlay primitives;
2. D2.2 — forms and selection;
3. D2.3 — overlays and composite interaction;
4. D2.4 — data-presentation primitives;
5. D2.5 — aggregate evidence and only separately approved bounded adoption.

Each checkpoint has explicit scope, non-goals, decision/test/evidence gates,
and an independent freeze. Later checkpoints may consume but cannot redefine
earlier frozen APIs without D-101 compatibility governance. D2.1 and D2.3 are
large enough to require bounded internal work batches, but D-096 may reduce the
set and formal acceptance remains checkpoint-level; this is not a reason to add
artificial phases.

## 14. D-089 through D-101 completeness

**PASS for decision readiness; all remain unresolved and implementation
blocking.** Each record names the question, authority, recommendation,
rejected/deferred alternatives, implementation gate, production gate, and
affected checkpoint.

| Decision | Completeness verdict                                                                | Earliest gate                                |
| -------- | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| D-089    | complete: package/API/export, CSS, server/client and deterministic ID boundary      | before D2.1 implementation                   |
| D-090    | complete: extension, polymorphism, composition, data attributes and URL contract    | before D2.1 implementation                   |
| D-091    | complete: evidence/workbench and non-shipping boundary                              | before D2.1 implementation                   |
| D-092    | complete: automated accessibility plus browser/AT matrix                            | before D2.1 implementation                   |
| D-093    | complete: overlay, portal, SSR, focus and collision strategy                        | before D2.3 implementation                   |
| D-094    | complete: external headless dependency and supply-chain permission                  | before any dependency or D2.3 implementation |
| D-095    | complete: closed icon/SVG policy                                                    | before D2.1 implementation                   |
| D-096    | complete: initial component set and checkpoint freeze policy                        | before D2.1 implementation                   |
| D-097    | complete: sizes, densities, precedence and invalid combinations                     | before D2.1/D2.2 as applicable               |
| D-098    | complete: localization, RTL, forced-colour and visual matrix                        | before D2.1 implementation                   |
| D-099    | complete: exact bounds and accessible failure behavior                              | before each affected checkpoint              |
| D-100    | complete: virtualization ownership and measured trigger                             | before D2.4 implementation                   |
| D-101    | complete: API SemVer, experimental exports, deprecation, compatibility and rollback | before D2.1 implementation                   |

No recommendation is an approved answer. Planning acceptance can freeze with
these questions unresolved; D2.1 cannot begin.

## 15. R-131 through R-146 completeness

**PASS.** All 16 records contain impact, trigger, prevention, detection,
recovery, residual risk, and owner/checkpoint. Together they cover inaccessible
controls and insufficient AT evidence, focus traps, keyboard regressions, D1
token bypass, API/variant explosion, style escapes, dependency growth, overlay
stacking, SSR/hydration, localization overflow, financial truncation, unsafe
HTML/URL/icon input, brittle evidence, D3/D5/D6 leakage, migration redesign,
and unbounded DOM/overlays. R-131 was clarified to make insufficient AT
evidence an explicit trigger and forced-colour testing an explicit detection
control.

## 16. Acceptance-plan verdict

**PASS.** The plan distinguishes planning acceptance, unresolved decisions,
checkpoint acceptance, and aggregate D2 freeze. It defines severities,
component-contract and accessibility review, API/theme/security/table/overlay
review, migration and rollback, authoritative verification, frozen-boundary
checks, checkpoint-specific failure, and the formal report shape.

Author-produced plans, reports, screenshots, or harness results are evidence to
reproduce, not proof. A failed checkpoint does not authorize or force later
checkpoint acceptance.

## 17. Findings and remediations

### 17.1 BLOCKER and unresolved HIGH

None.

### 17.2 Remediated HIGH documentation findings

| ID        | Defect                                                                                              | Minimal remediation                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| D2-PA-H01 | `pressed + disabled` erased a simultaneous semantic state despite the plan's preservation invariant | preserve perceivable pressed state/`aria-pressed` while disabling interaction                                         |
| D2-PA-H02 | Tooltip wording allowed ambiguous trigger/content semantics                                         | require focusable and pointer invocation; keep content non-interactive and supplemental                               |
| D2-PA-H03 | portal ownership and controlled overlay state appeared selected before D-090/D-093                  | make portal use and state model conditional on approved decisions; retain singular governance if portals are selected |
| D2-PA-H04 | overlay acceptance applied portal/inertness/outside/scroll-lock duties to Tabs                      | define Tabs as a non-overlay composite with tab/tabpanel, roving-focus, and activation evidence only                  |
| D2-PA-H05 | deterministic IDs and safe Link URLs lacked explicit decision ownership                             | add ID/SSR ownership to D-089 and URL/extension ownership to D-090                                                    |
| D2-PA-H06 | D-091, D-097–D-101 timing could permit implementation before normative decisions                    | make applicable decisions block D2.1; D-100 blocks D2.4; align the D-101 plan summary                                 |
| D2-PA-H07 | insufficient AT evidence was described in prose but not explicit in R-131's trigger                 | add insufficient AT evidence and forced-colour detection to R-131                                                     |

### 17.3 MEDIUM and LOW findings

- **MEDIUM — uncommitted baseline:** the D2 planning package and cross-cutting
  edits are worktree changes. They should be committed/frozen together only
  after product-owner approval; this review intentionally creates no commit.
- **LOW — checkpoint breadth:** D2.1 and D2.3 contain several component
  families. D-096 should approve the smallest initial set and implementation
  should use bounded internal batches without inventing additional public
  phases.
- **LOW — sequential conservatism:** D2.3 waits for D2.2 although not every
  overlay consumes forms. This simplifies freeze governance and is safe; D-096
  may change dependency order only through an explicit decision.

### 17.4 Accepted limitations

- No component runtime, browser, screen-reader, forced-colour, visual, or
  migration evidence exists yet; that is correct for a documentation-only plan.
- Exact component APIs, tooling, browsers/AT, overlay implementation, icons,
  state matrices, bounds, localization matrix, and versioning await D-089
  through D-101.
- Host timestamps establish that the root `package.json` change predates the D2
  files, but timestamps are not a cryptographic authorship record. The semantic
  diff independently establishes that it is D1 quality-script inclusion, not a
  D2 dependency or workspace change.

## 18. Pre-existing `package.json` and dependency-audit findings

### 18.1 `package.json`

The root `package.json` modification predates D2 planning: its filesystem mtime
is 2026-08-16 22:54:43 +0300; the D2 planning files existed from 2026-08-25
before this review. Its only diff adds `@arbitrage/design-tokens` to the root
`build`, `lint`, `test`, and `typecheck` chains. It changes no dependency,
workspace, application authority, or D2 contract. D2 documentation does not
depend on the modification.

It was excluded from this review's write allowlist and left untouched. It should
be reconciled and committed separately as D1 housekeeping before establishing a
clean D2 implementation baseline; it must not be folded silently into a D2
implementation change.

### 18.2 Production dependency audit

`npm audit --omit=dev --audit-level=high` reports one pre-existing HIGH advisory:
`nanoid@3.3.16` (`GHSA-2v37-7h3g-55p8`), reached through the already pinned
`postcss@8.5.23` chain. D2 planning changed neither `package-lock.json` nor any
dependency. This remains separate dependency-maintenance/security debt and is
not a D2 architecture defect. This review did not remediate it.

## 19. Verification results

### 19.1 Clean authoritative Node environment

- isolated copy: `/tmp/holyparser-d2-accept.t2OvBB`;
- Node: `v24.18.1` from `/opt/homebrew/opt/node@24/bin`;
- npm: `11.16.0`;
- workspaces: 7 (`apps/web` plus six packages);
- `npm ci`: PASS, 450 packages added and 458 audited;
- test files: 39;
- tests: 334 passed, 0 failed, 3 skipped, 337 total;
- skipped tests: the three default-off public exchange live-canary tests;
- no exchange canary was run.

### 19.2 Commands

| Command                                                                                    | Result                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `PATH=/opt/homebrew/opt/node@24/bin:/usr/bin:/bin npm ci`                                  | PASS; 450 added, 458 audited                                              |
| `PATH=/opt/homebrew/opt/node@24/bin:/usr/bin:/bin npm run format:check`                    | PASS                                                                      |
| `PATH=/opt/homebrew/opt/node@24/bin:/usr/bin:/bin npm run lint`                            | PASS; D1 validation and raw-value scan also pass with 0 active exceptions |
| `PATH=/opt/homebrew/opt/node@24/bin:/usr/bin:/bin npm run typecheck`                       | PASS; D1 artifact drift check passes                                      |
| `PATH=/opt/homebrew/opt/node@24/bin:/usr/bin:/bin npm test`                                | PASS; 334 passed, 3 skipped, 0 failed across 39 files                     |
| `PATH=/opt/homebrew/opt/node@24/bin:/usr/bin:/bin npm audit --omit=dev --audit-level=high` | expected warning; one pre-existing HIGH `nanoid` advisory                 |
| repository-native Markdown/local-link check                                                | PASS; 62 Markdown files, 56 links, 34 local targets, 0 broken             |
| `git diff --check`                                                                         | PASS                                                                      |
| documentation allowlist and frozen-boundary checks                                         | PASS, excluding the declared pre-existing `package.json` change           |
| brand-reference SHA-256 comparison                                                         | PASS, all three accepted hashes match                                     |

Non-authoritative runs under Codex's bundled Node 26 and a concurrent
format/build race were discarded. They are not acceptance evidence and did not
change the repository.

### 19.3 Test breakdown

| Workspace                     | Test files |  Passed | Skipped | Failed |
| ----------------------------- | ---------: | ------: | ------: | -----: |
| design tokens                 |          4 |      74 |       0 |      0 |
| contracts                     |          1 |       4 |       0 |      0 |
| market data                   |          4 |      57 |       0 |      0 |
| OKX public adapter            |          9 |      52 |       1 |      0 |
| Binance USDⓈ-M public adapter |          9 |      72 |       1 |      0 |
| Bybit linear public adapter   |         10 |      69 |       1 |      0 |
| web                           |          2 |       6 |       0 |      0 |
| **Total**                     |     **39** | **334** |   **3** |  **0** |

## 20. Frozen-boundary evidence

Targeted `git` comparisons against `HEAD` show no changes in:

- `packages/design-tokens`, D1 generated artifacts/scripts/tests/evidence, or
  the accepted Phase 1 `globals.css` bridge;
- `packages/market-data`, `packages/okx-public-adapter`,
  `packages/binance-usdm-public-adapter`, and
  `packages/bybit-linear-public-adapter`;
- frozen Phase 2A documents;
- Phase 2B plan, acceptance, formulas, or ADR-0009;
- Product/Commerce/Admin frozen architecture and ADR-0010 through ADR-0012;
- application TSX, `layout.tsx`, routes, navigation, shell, lockfile, or
  infrastructure;
- all brand-reference bytes.

Accepted brand SHA-256 values reproduced:

- `holyparser-dark.png`:
  `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08`;
- `holyparser-design-system.png`:
  `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54`;
- `holyparser-logo-system.png`:
  `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c`.

## 21. Freeze recommendation

Freeze the D2 planning package with status **PASS_WITH_WARNINGS**. The warnings
are worktree hygiene, an external dependency advisory, checkpoint breadth, and
expected absence of implementation evidence; none invalidates the architecture.

The D-089 through D-101 decision task may begin. D2.1 implementation may not
begin until the applicable decisions are approved, their consistency is
independently accepted, and a separate product-owner implementation approval is
issued.

## 22. Exact recommended next task

> Read `AGENTS.md` and all frozen architecture, Product/Commerce/Admin, D1, D2
> planning, D2 planning-acceptance, security, roadmap, decision, risk,
> acceptance, and brand-reference documents completely. Treat the D2 planning
> package as frozen and accepted. Perform a documentation-only
> product/design/accessibility/frontend-architecture/security decision task for
> D-089 through D-101 only. Do not implement D2 or components, add dependencies,
> change application source, D1, frozen adapters, accepted Phase 2B documents,
> Product/Commerce/Admin architecture, brand references, manifests, lockfiles,
> or infrastructure, and do not create a commit.
>
> For every decision, evaluate the recorded alternatives and record the exact
> approved choice, rejected alternatives and reasons, authority roles, approval
> date, effective scope, implementation gate, production gate, affected
> checkpoints and acceptance evidence, compatibility/rollback rule, and revisit
> trigger. Resolve: D-089 package/API/export/server-client/ID policy; D-090
> class/style/polymorphism/composition/data-attribute/URL policy; D-091 evidence
> workbench; D-092 accessibility tooling and browser/AT matrix; D-093
> overlay/portal/SSR/focus/collision strategy; D-094 dependency permission;
> D-095 icon/SVG contract; D-096 initial component set and checkpoint policy;
> D-097 sizes/densities/state combinations; D-098 localization/RTL/forced-colour
> and visual matrix; D-099 exact resource limits and safe failures; D-100
> virtualization ownership; and D-101 API versioning/deprecation. Do not hide an
> unresolved choice behind a default or recommendation.
>
> Create `docs/D2_COMPONENT_DECISIONS.md`; update only the relevant D2 plan,
> acceptance plan, decision, risk, roadmap, design/theme, security, and
> acceptance cross-references; create an ADR only for an actual approved
> architecture decision. Run pinned Node 24 documentation verification,
> Markdown/local-link validation, `git diff --check`, dependency/lockfile and
> application-source scope scans, all frozen-boundary checks, and brand hash
> verification. Report every decision, any remaining blocker, whether the
> decision package can freeze, and whether D2.1 is eligible for a separate
> implementation-approval task. Do not begin D2.1.
