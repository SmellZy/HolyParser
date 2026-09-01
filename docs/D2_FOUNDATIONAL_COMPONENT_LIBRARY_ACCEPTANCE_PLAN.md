# D2 Foundational Component Library Acceptance Plan

Status: **PLANNED — NOT FORMAL ACCEPTANCE**  
Applies to: D2 planning review and later checkpoint/formal implementation reviews

## 1. Purpose

This document defines how an independent reviewer distinguishes a valid D2
foundation from component implementation evidence, a page redesign, D3/D5/D6
scope leakage, or a token-system fork. It authorizes no implementation.

The reviewer must treat implementation reports, snapshots, accessibility
reports, component inventories, and generated evidence as claims to reproduce,
not proof.

## 2. Finding classes

- `BLOCKER`: violates frozen D1 or another frozen boundary; introduces hidden
  business/authorization/financial behavior; creates an inaccessible critical
  path; requires an unapproved dependency/scope; or makes deterministic review
  impossible.
- `HIGH`: a required component state, keyboard/focus behavior, security bound,
  theme/forced-colour contract, API compatibility rule, or migration invariant
  is missing or fails.
- `MEDIUM`: bounded defect with a safe fallback that does not invalidate the
  checkpoint but needs tracked remediation.
- `LOW`: evidence hygiene, documentation clarity, or noncritical consistency
  defect.
- `ACCEPTED_LIMITATION`: explicitly deferred D3/D4/D5/D6 or browser/tooling
  evidence whose absence cannot be misrepresented as passing behavior.

Only BLOCKER/HIGH defects inside the reviewed D2 checkpoint may be remediated
during a formal review, using the smallest change and a focused regression test.

## 3. Planning-package acceptance

Before any implementation decision task, independently verify that the plan:

- classifies every candidate as required, optional, deferred, or rejected;
- keeps D1, pages, shells, financial visualization, admin, auth, commerce,
  analytics, and infrastructure out of D2;
- defines common semantic/API/accessibility/theme/forced-colour/state contracts;
- separates intrinsic responsiveness from D3 and financial data presentation
  from D5;
- defines table and overlay boundaries without silently selecting a dependency;
- compares evidence tooling and records all unresolved choices;
- decomposes D2 into independently testable/freezable checkpoints;
- defines security/resource boundaries, migration, rollback, risks, and freeze
  gates;
- assigns every blocker to a named authority and implementation checkpoint;
- contains no source code, dependency, route, token, or frozen-boundary change.

Planning acceptance creates a dedicated
`D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN_ACCEPTANCE.md` with `PASS`,
`PASS_WITH_WARNINGS`, or `FAIL`. It does not authorize D2.1.

## 4. Decision gate

Before D2.1, the reviewer must confirm approved normative records exist for the
applicable D-089 through D-101 decisions. At minimum D-089, D-090, D-091,
D-092, D-095, D-096, D-097, D-098, D-099, and D-101 block any D2.1
implementation. D-093/D-094 block D2.3; D-100 blocks D2.4 and fixes
virtualization ownership without authorizing it.

An implementation convenience, existing package, current Phase 1 markup, or
prior D1 tool is not an implicit decision.

## 5. Checkpoint acceptance matrix

| Checkpoint             | Required review evidence                                                                                                                                    | Specific stop conditions                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| D2.1 core              | semantics, names, actions/links, status redundancy, hit areas, themes, forced colours, motion, localization, hostile content, bounds, deterministic harness | raw token/value API, unsafe icon/HTML/URL, inaccessible action, dependency or consumer migration not approved    |
| D2.2 forms             | label/error relationships, native behavior, controlled/uncontrolled, autofill, keyboard, read-only/disabled/invalid, selection groups, touch, long content  | guessed validation/business behavior, unlabeled control, custom listbox hidden in native Select scope            |
| D2.3 overlays          | modal/nonmodal semantics, focus lifecycle, Escape/outside, inertness, portal, nesting, collision, touch, hydration, cleanup, dependency evidence            | focus trap/loss, unbounded portals/listeners, SSR mismatch, unapproved headless dependency                       |
| D2.4 data              | semantic table, sortable intent, exact-text access, zero/unknown, quality presentation, overflow, density, pagination, screen reader                        | formatting/calculation/domain sorting, financial truncation, virtualization or D5 behavior                       |
| D2.5 evidence/adoption | complete catalog, compatibility, authoritative browser/AT matrix, named consumer migrations, rollback, frozen diffs                                         | site-wide migration, page/shell redesign, mixed legacy/component rollback, unexplained route/DOM/business change |

Every checkpoint is accepted and frozen separately. A later checkpoint may
consume but not redefine a frozen earlier API or semantic meaning without an
approved compatibility/version change.

## 6. Component contract review

For every component inspect:

- semantic element/role and normative DOM shape;
- public props, enum closure, invalid-combination behavior, and version;
- accessible name, label, description, error, and status relations;
- keyboard, pointer, touch, focus-visible, focus return, and tab order;
- disabled, read-only, invalid, loading, selected, expanded, pressed, checked,
  and indeterminate behavior where applicable;
- controlled/uncontrolled invariants and callback ordering;
- D1 token use, DARK/LIGHT parity, forced colours, reduced motion, and
  non-colour meaning;
- responsive overflow, localization, Unicode, RTL, exact-value access, and
  resource limits;
- user content/URL/icon/CSS trust boundary and deterministic cleanup;
- unit/component/browser/manual evidence and accepted limitations.

Unsupported combinations must have deterministic test evidence. CSS selector
order is not a state machine.

## 7. Accessibility evidence

Formal acceptance requires, to the approved D-092/D-098 matrix:

- machine semantic/name/state checks;
- keyboard-only use and visible focus for every interactive component;
- modal focus containment, Escape, restoration, and background inertness;
- screen-reader runs for action, form, selection, status, overlay, tabs, and
  table families;
- 44x44 target evidence where required;
- both themes, forced colours, reduced motion, 200% zoom/reflow, text scaling,
  long labels, pseudo-localization, and supported RTL;
- no colour-only status and no tooltip-only required information.

Static ARIA snapshots cannot substitute for browser focus, screen-reader, or
forced-colour behavior. If an approved environment is unavailable, acceptance
must fail or explicitly defer the affected component/checkpoint; it cannot claim
that evidence passed.

## 8. API and theme integrity

Verify:

- semantic prop names and finite variants;
- no public raw colour/spacing/radius/shadow/layer prop;
- extension APIs conform exactly to D-090;
- no Button/Link or Menu/Select semantic conflation;
- D1 generated artifacts and canonical sources are unchanged;
- all component CSS consumes allowed semantic tokens and passes the D1 scanner;
- DARK/LIGHT produce the same state meaning and SYSTEM is not implemented by
  D2;
- forced-colour mappings remain within D1's closed system-colour contract;
- status components consume explicit presentation records rather than derive
  domain state.

## 9. Security and resource review

Test at and above every D-099 bound:

- children, options, menu depth, tabs, table cells, overlays, portals, content
  bytes, diagnostics, listeners/timers, and animation lifecycle;
- HTML/script/event-handler strings, unsafe/oversized URLs, SVG payloads,
  arbitrary CSS/class/style, portal targets, and layer values;
- repeated mount/unmount, interrupted transitions, focus target removal,
  hydration mismatch, nested overlay failure, and cleanup;
- alternate representation/casing bypasses for raw-value and URL/icon policies.

User-visible text must remain escaped by default. Structured diagnostics and
metrics use finite reason codes and no user content.

## 10. Table-specific review

Verify semantic table structure, caption/headers, sorting state/intent,
focusability, selectable-row presentation, loading/empty/error/degraded states,
horizontal overflow, sticky compatibility, exact-value availability, tabular
numeric hooks, decimal-alignment hooks, and typed unknown/unavailable display.

D2 must not calculate, format, round, rank, fetch, virtualize, or infer quality.
A financially relevant value hidden only behind ellipsis or hover is HIGH.

## 11. Overlay-specific review

Verify Dialog, Popover, Tooltip, Menu, and Tabs independently. For Dialog,
Popover, Tooltip, and Menu, confirm semantic differences, stable IDs, approved
portal ownership, applicable modal inertness and scroll lock,
initial/contained/restored focus, Escape/outside reason, nesting, collision,
touch, reduced motion, forced colours, SSR/hydration, concurrent instances,
shutdown, and listener/timer/portal cleanup. Tabs is a non-overlay composite:
verify tab/tabpanel relationships, roving focus and activation behavior without
requiring portal, inertness, outside-interaction, or scroll-lock semantics.

No dependency is accepted merely because it is popular. If one is approved,
reproduce lockfile, license, provenance, vulnerability, bundle, SSR, maintenance,
and escape-hatch evidence.

## 12. Evidence strategy review

Confirm the approved harness/workbench:

- is non-shipping or explicitly inaccessible in production;
- generates deterministic component/state inventories;
- records runtime/tool/browser/theme/viewport/locale/forced-colour parameters;
- bounds screenshots and cases;
- hashes evidence or otherwise detects drift;
- distinguishes automated, manual, screen-reader, and static-contract evidence;
- does not include credentials, user data, financial data, machine paths, or
  unstable timestamps in deterministic artifacts;
- adds no dependency unless separately approved.

Implementation-produced screenshots are evidence inputs, not formal acceptance.

## 13. Migration and rollback review

Compare the implementation diff against its exact allowlist. Confirm:

- library proof precedes migration;
- only named usages move;
- route, page, DOM semantics, copy, navigation, responsive structure, and
  business behavior remain unchanged unless the explicit consumer-migration
  task says otherwise;
- legacy patterns remain until replacement evidence passes;
- rollback restores one complete prior component/export/evidence/consumer set;
- D1 source/artifacts/bridge are never part of D2 rollback;
- no broad CSS cleanup or site redesign is hidden in component adoption.

## 14. Authoritative verification

Use the repository-pinned Node 24 environment and a clean isolated dependency
tree. Run, as applicable:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
checkpoint-specific unit/component/browser tests
accessibility semantic and approved browser/AT checks
DARK/LIGHT/forced-colour/reduced-motion/localization evidence
raw-value/token-contract scan
hostile-input and resource-bound tests
deterministic/repeated/clean evidence generation
API compatibility and artifact drift checks
Markdown/local-link validation
git diff --check
implementation allowlist and forbidden-scope scans
dependency/lockfile scan
D1 freeze check
frozen Phase 2A adapter/document check
accepted Phase 2B check
Product/Commerce/Admin freeze check
brand-reference SHA-256 check
secret and unsafe-HTML/URL/icon scans
```

Record exact Node/npm versions, package/workspace counts, test files, passed,
failed, skipped, browser/AT matrix, builds, routes, findings, active exceptions,
and evidence counts. Exchange canaries are not part of D2 acceptance.

## 15. Frozen-boundary checks

Formal acceptance must prove no unauthorized change in:

- `packages/design-tokens`, D1 evidence/governance, and
  `apps/web/src/app/globals.css`;
- Phase 2A packages and frozen documents;
- accepted Phase 2B plan, acceptance, ADR-0009, and formulas;
- Product/Commerce/Admin frozen architecture;
- brand reference images;
- application pages, routes, `layout.tsx`, navigation, shell, domain/business
  logic, manifests, lockfile, or infrastructure, except an exact separately
  approved D2 implementation/migration allowlist.

Pre-existing unrelated worktree changes must be identified before work and
excluded from the acceptance diff.

## 16. Checkpoint and aggregate freeze criteria

A checkpoint freezes only when:

- its decisions are approved;
- BLOCKER = 0 and unresolved HIGH = 0;
- authoritative tests and evidence pass;
- public API/version and rollback are documented;
- no scope leak or unapproved dependency exists;
- D1 and other frozen boundaries are unchanged.

Aggregate D2 freezes only after every selected checkpoint freezes and an
independent aggregate review confirms cross-component semantics, API
compatibility, evidence completeness, migration isolation, and all deferrals.
Passing one checkpoint does not authorize the next.

## 17. Formal report template

Every checkpoint and aggregate report contains:

- final status: `PASS`, `PASS_WITH_WARNINGS`, or `FAIL`;
- accepted scope and explicit non-goals;
- reviewed source/tests/evidence/consumer files;
- decision and dependency status;
- per-component API/state/accessibility verdict;
- theme/forced-colour/motion/localization verdict;
- security/resource and raw-value verdict;
- browser/AT and deterministic evidence inventory;
- BLOCKER/HIGH, remediated, MEDIUM/LOW, and accepted limitations;
- exact commands, versions, counts, build/runtime results;
- migration/rollback and frozen-boundary evidence;
- freeze recommendation and exact next task without starting it.

## 18. Planning-acceptance readiness

This package is ready for a separate formal documentation acceptance review.
It does not approve any D2 checkpoint, dependency, source file, component,
harness, or consumer migration.

## 19. Exact recommended planning-acceptance task

```text
Read AGENTS.md and all frozen architecture, design, theme, security, roadmap,
decision, risk, acceptance, D1 planning, decisions, implementation, formal
acceptance, and brand-reference documents completely.

Perform a formal independent documentation and architecture acceptance review
of the D2 — Foundational Component Library planning package only. Review
docs/D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN.md,
docs/D2_FOUNDATIONAL_COMPONENT_LIBRARY_ACCEPTANCE_PLAN.md and every updated
cross-cutting register. Treat them as author-produced planning evidence, not
proof.

Do not implement D2 or any component. Do not resolve D-089 through D-101 by
assumption. Do not add dependencies or modify application source, D1, frozen
adapters, accepted Phase 2B, Product/Commerce/Admin frozen architecture,
brand references, manifests, lockfiles, or infrastructure. Do not begin D3,
D4, D5, D6, I1, C1 or Phase 2B.1. Do not create a commit.

Independently verify scope isolation, component classification, common API and
state contracts, accessibility and overlay behavior, D1/theme/forced-colour
integrity, responsive/localization/table boundaries, evidence/tooling options,
security/resource limits, migration/rollback, the D2.1–D2.5 dependency and
freeze gates, completeness of D-089 through D-101, and R-131 through R-146.
Confirm no later-phase behavior leaks into D2 and no implementation choice is
hidden as a default.

Run pinned Node 24 documentation-focused formatting, lint, type checking,
default tests, Markdown/local-link validation, git diff --check,
documentation-only scope scan, D1 freeze check, frozen adapter/Phase 2B/
Product-Commerce-Admin checks, and brand hashes. Fix only documentation BLOCKER
or HIGH findings with the smallest change. Create
docs/D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN_ACCEPTANCE.md with final status,
findings, remediations, exact verification, freeze recommendation, whether the
planning package may freeze, whether decision review may begin, and the exact
recommended D-089 through D-101 decision task. Do not begin implementation.
```
