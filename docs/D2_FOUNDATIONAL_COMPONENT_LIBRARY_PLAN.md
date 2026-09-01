# D2 Foundational Component Library Plan

Status: **PLANNING COMPLETE — FORMAL DOCUMENTATION ACCEPTANCE REQUIRED**  
Implementation authority: **NONE**  
Planning date: 2026-08-25

## 1. Purpose and frozen boundaries

D2 defines the smallest reusable presentation layer that can replace repeated
Phase 1 patterns without redesigning pages or owning product behavior. D1 is the
only token authority. D2 consumes its semantic tokens and presentation records;
it does not alter their IDs, values, generated artifacts, validation, governance,
compatibility bridge, or domain meanings.

Frozen and out of scope:

- D1 canonical sources, schema, generated files, scripts, tests, evidence, and
  `apps/web/src/app/globals.css`;
- application pages, `layout.tsx`, routes, DOM, navigation, sidebar behavior,
  shell composition, and page information architecture;
- financial charts, order-book rendering, virtualized analytics grids, and
  market-specific cells;
- authentication, identity, billing, admin workflows, analytics, persistence,
  providers, event infrastructure, and trading;
- D3 through D6, I1, C1, Phase 2B.1, or any other implementation phase;
- dependencies, manifests, lockfiles, and infrastructure in this planning task.

A component-value change does not authorize a markup, route, copy, layout,
navigation, business-rule, or interaction redesign. Each implementation
checkpoint needs separate Product Owner approval and independent acceptance.

## 2. Planning principles

1. Native semantic HTML is the default implementation strategy; ARIA repairs
   semantics only where a native element cannot express the required contract.
2. D1 semantic tokens are the only visual contract exposed to components.
3. Component APIs describe intent, emphasis, size, and state, never raw colour,
   radius, shadow, layer, or spacing values.
4. Accessibility behavior is part of the component contract, not later polish.
5. Component state is bounded. Invalid combinations reject during development
   or return a typed, deterministic diagnostic in the evidence harness.
6. D2 formats no domain financial value and guesses no unit, precision,
   availability, quality, or sign.
7. D2 provides intrinsic responsive behavior; D3 owns route and shell layout.
8. User-visible content is text by default. Raw HTML, arbitrary CSS, arbitrary
   SVG, and unsafe URLs are not extension mechanisms.
9. Dependency, workbench, accessibility-tool, overlay, and icon choices remain
   explicit decisions rather than implementation defaults.
10. Frozen component semantics change only through a versioned compatibility
    decision.

## 3. Current Phase 1 inventory

### 3.1 Inspected consumers

- `apps/web/src/components/app-shell.tsx`;
- `apps/web/src/components/auth-card.tsx`;
- `apps/web/src/components/auth-fields.tsx`;
- `apps/web/src/components/icon.tsx`;
- root, authentication, loading, error, and not-found routes;
- `apps/web/src/app/globals.css` as a frozen D1 bridge;
- current web tests as evidence of existing behavior.

### 3.2 Pattern classification

| Current pattern                                                | Classification                               | Future boundary                              | D2 migration authority                                              |
| -------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `.primary-button`, `.button-link`                              | reusable action/link                         | Button and Link                              | bounded usage only after component proof and separate approval      |
| `.icon-button`, collapse/mobile-close buttons                  | reusable icon action inside shell            | IconButton                                   | component may be D2; shell adoption is D3 unless separately allowed |
| `.field` label plus input                                      | reusable field anatomy                       | Label, TextInput, FieldMessage               | auth migration is not automatic                                     |
| `.checkbox-field`                                              | reusable native selection control            | Checkbox                                     | bounded auth usage only if explicitly approved                      |
| `.auth-card`, `.state-card`, `.status-card`, `.boundary-panel` | shared surface traits plus page compositions | Surface/Card; compositions remain page-owned | no wholesale card replacement                                       |
| `.status-pill`, tone icons                                     | reusable status presentation                 | Badge/StatusBadge                            | must consume D1 status presentation records                         |
| `.skeleton*`                                                   | reusable loading presentation                | Skeleton                                     | page loading composition remains page-owned                         |
| error/loading/not-found wrappers                               | page-specific compositions using primitives  | EmptyState/feedback primitives               | routes and copy remain unchanged                                    |
| repeated flex/grid/gap rules                                   | limited composition need                     | Stack/Inline                                 | D2 may provide intrinsic composition only                           |
| sidebar groups, collapse, mobile drawer, focus trap            | shell/navigation behavior                    | D3                                           | no D2 migration                                                     |
| dashboard grids and boundary list                              | page composition                             | D3                                           | no D2 migration                                                     |
| future exact-value tables/charts/books                         | financial visualization                      | D5                                           | no D2 implementation                                                |
| future admin approvals/bulk previews                           | privileged workflow                          | D6                                           | no D2 implementation                                                |

The inventory identifies candidates only. Existing Phase 1 markup is not a
component specification and must not be copied without accessibility review.

## 4. Component taxonomy and classification

### 4.1 Classification meanings

- `D2 REQUIRED`: part of the first frozen foundational contract.
- `D2 OPTIONAL`: implement only after required scope is accepted and measured
  use justifies it.
- `DEFER D3`: shell, navigation, or page-layout concern.
- `DEFER D5`: financial data/visualization or measured performance concern.
- `DEFER D6`: admin-specific interaction or authorization presentation.
- `REJECT`: duplicates another primitive or leaks presentation/behavior.

### 4.2 Initial classification

| Candidate                        | Classification                      | Rationale/boundary                                                                                      |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Button                           | D2 REQUIRED                         | semantic action with intent, size, loading, disabled, and focus states                                  |
| IconButton                       | D2 REQUIRED                         | accessible-name-required action; icon-only hit target                                                   |
| Link                             | D2 REQUIRED                         | navigation semantics remain distinct from Button                                                        |
| TextInput                        | D2 REQUIRED                         | native input wrapper with label/description/error contract                                              |
| TextArea                         | D2 REQUIRED                         | multi-line native input; bounded resize/overflow contract                                               |
| Label                            | D2 REQUIRED                         | explicit association and required/optional presentation                                                 |
| FieldMessage                     | D2 REQUIRED                         | description, error, warning, or success message with stable association                                 |
| Checkbox                         | D2 REQUIRED                         | native binary/indeterminate control                                                                     |
| Radio/RadioGroup                 | D2 REQUIRED                         | native exclusive choice and group naming contract                                                       |
| Switch                           | D2 REQUIRED                         | boolean immediate-setting control; never substitutes for submit                                         |
| Native Select                    | D2 REQUIRED                         | native single selection until a custom listbox is separately approved                                   |
| Custom Select/Listbox            | D2 OPTIONAL                         | requires keyboard/virtualization/overlay decision and measured need                                     |
| Badge                            | D2 REQUIRED                         | neutral categorical metadata, not status authority                                                      |
| StatusBadge                      | D2 REQUIRED                         | D1 status/quality/capability presentation with redundant label/icon/shape                               |
| Tooltip                          | D2 REQUIRED                         | supplemental description only; never sole required information                                          |
| Separator                        | D2 REQUIRED                         | semantic/decorative distinction                                                                         |
| ProgressIndicator                | D2 REQUIRED                         | determinate/indeterminate progress with accessible name/value semantics                                 |
| Spinner                          | REJECT as public primitive          | indeterminate ProgressIndicator covers the contract                                                     |
| Skeleton                         | D2 REQUIRED                         | non-interactive loading placeholder; hidden from assistive technology unless accompanied by status text |
| Surface                          | D2 REQUIRED                         | token-governed visual containment without page semantics                                                |
| Card                             | D2 REQUIRED                         | semantic composition over Surface with optional heading relationship                                    |
| Stack                            | D2 REQUIRED                         | vertical intrinsic spacing only                                                                         |
| Inline                           | D2 REQUIRED                         | horizontal/wrapping intrinsic spacing only                                                              |
| Cluster                          | REJECT as separate public primitive | Inline with wrapping covers it without API duplication                                                  |
| Dialog                           | D2 REQUIRED                         | modal interaction contract; implementation blocked by overlay decision                                  |
| Popover                          | D2 REQUIRED                         | non-modal contextual surface; implementation blocked by overlay decision                                |
| Menu/MenuButton                  | D2 REQUIRED                         | action menu with roving focus/typeahead contract                                                        |
| Dropdown                         | REJECT as separate component        | ambiguous duplicate; compose Menu or Select according to semantics                                      |
| Tabs                             | D2 REQUIRED                         | in-page view selection, not route navigation                                                            |
| Table primitives                 | D2 REQUIRED                         | semantic table anatomy, overflow, focus, quality/unavailable presentation hooks                         |
| SortableHeader presentation      | D2 REQUIRED                         | presents current sort and emits intent; domain sorting stays outside D2                                 |
| EmptyState                       | D2 REQUIRED                         | bounded title/description/actions; no product-specific copy                                             |
| Pagination presentation          | D2 REQUIRED                         | navigation/command presentation; data fetching stays outside D2                                         |
| Toast/notification viewport      | D2 OPTIONAL                         | delivery and interruption policy need a separate decision/use case                                      |
| App shell/sidebar/nav groups     | DEFER D3                            | route/shell information architecture                                                                    |
| Virtualized table/grid           | DEFER D5                            | performance and financial keyboard semantics need measured requirements                                 |
| Chart/order-book primitives      | DEFER D5                            | renderer and financial visualization contract                                                           |
| Admin confirmation/bulk workflow | DEFER D6                            | permission, step-up, audit, and privileged command semantics                                            |

## 5. Common component contract

Every D2 component specification and later implementation evidence must record,
where applicable:

- purpose and non-goals;
- semantic element/role and DOM constraints;
- accessible-name, label, description, and error relationships;
- intent, variant, size, density, and emphasis enums;
- supported states and precedence;
- keyboard, pointer, touch, focus-visible, focus-return, and tab-order behavior;
- disabled versus `aria-disabled`, read-only, invalid, loading, selected,
  expanded, pressed, checked, and indeterminate behavior;
- controlled/uncontrolled policy and state-change callback semantics;
- composition, child-count, option-count, and nesting bounds;
- intrinsic sizing, wrapping, overflow, and minimum hit area;
- localization, Unicode, bidirectional text, and RTL implications;
- DARK/LIGHT consumption, inherited SYSTEM selection, forced colours, reduced
  motion, and non-colour redundancy;
- failure/unsupported behavior, security boundary, test obligations, API
  version, and migration notes.

The component contract cannot redefine domain states. `StatusBadge`, for
example, maps an explicit status-presentation ID to D1 presentation metadata;
it does not infer `STALE` from a timestamp or colour.

## 6. API principles and extension boundary

Preferred conceptual properties are `intent`, `variant`, `size`, `density`,
`emphasis`, `state`, `loading`, `disabled`, `readOnly`, and `invalid`.
Presentation-leaking names such as `blue`, `red`, `radius12`, `shadow3`, or
`zIndex70` are prohibited.

The following remain blocked by D-090:

- whether `className` is prohibited, package-private, or an audited escape;
- whether `style` is entirely prohibited or limited to typed CSS custom
  properties for measured values;
- whether polymorphic `as`/`asChild` exists and which semantics it may expose;
- whether slots, render props, or compound components form the composition API;
- which data attributes are stable public hooks versus internal state output.

Invariants independent of that decision:

- arbitrary class/style injection is not the normal variant mechanism;
- polymorphism cannot turn a Button into navigation or a Link into a mutation
  without explicit semantic API;
- `dangerouslySetInnerHTML` is absent from ordinary components;
- event callbacks receive safe component state, not DOM-derived business truth;
- controlled and uncontrolled modes cannot be mixed after initialization;
- development diagnostics use finite codes and no user content.

## 7. State and variant model

### 7.1 Precedence

When applicable, presentation precedence is:

1. unavailable/unsupported contract failure;
2. disabled;
3. loading/busy;
4. invalid;
5. read-only;
6. selected/pressed/checked/expanded;
7. focus-visible;
8. active;
9. hover;
10. default.

Precedence affects presentation only; it does not discard lower-level semantic
attributes. An invalid focused field remains `aria-invalid` while showing focus.

### 7.2 Required combination rules

| Combination             | Planned behavior                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| loading + disabled      | one non-interactive busy control; no duplicate submit; loading label remains announced                       |
| invalid + focused       | both states visible; error association retained; focus indicator wins boundary visibility                    |
| selected + disabled     | selection remains perceivable; no interaction; required meaning uses label/shape, not disabled colour        |
| read-only + invalid     | value remains focusable/selectable where native semantics allow; error remains associated                    |
| pressed + disabled      | pressed state remains perceivable while disabled prevents interaction; do not erase `aria-pressed` meaning   |
| loading + link          | prohibited unless the Link is actually an action component; navigation cannot claim mutation progress        |
| checked + indeterminate | indeterminate is the rendered/current state; underlying checked value is not exposed as simultaneous meaning |
| hidden + focused        | prohibited; hiding or unmounting an overlay must restore focus deterministically                             |

Each checkpoint must publish its exact finite matrix. Unsupported combinations
must not silently resolve by CSS selector order.

## 8. Accessibility foundation

D2 targets WCAG 2.2 AA and the accepted D1 legal-pair/forced-colour contracts.
Required evidence includes:

- native semantics, accessible names, labels, descriptions, errors, status
  announcements, and no duplicate IDs;
- full keyboard operation without pointer-only functions;
- visible D1 focus ring and offset, logical tab order, and no keyboard trap;
- 44 by 44 CSS-pixel hit target where D1 requires it, or documented spacing
  equivalent permitted by the approved accessibility decision;
- correct disabled, `aria-disabled`, read-only, busy, invalid, selected,
  expanded, pressed, checked, and indeterminate semantics;
- non-colour labels/icons/shapes for critical state;
- reduced-motion alternative that preserves state feedback;
- DARK/LIGHT, forced-colour, 200% zoom/reflow, text scaling, long content,
  pseudo-localization, and supported RTL evidence;
- browser-level keyboard/focus proof for overlays and composite widgets.

Overlay contracts additionally require initial focus, containment where modal,
Escape, outside-interaction policy, focus restoration, background inertness,
nested-overlay rules, scroll-lock ownership, and shutdown/unmount cleanup.
Tooltip must be invokable from a focusable trigger as well as by pointer; its
non-interactive content must be exposed to assistive technology, dismissible,
persistent enough to inspect, and never the sole source of a required label or
error. Interactive content belongs in Popover or Dialog, not Tooltip.

Automated checks do not replace manual keyboard, screen-reader, zoom, forced-
colour, or rendered state review.

## 9. Theme and forced-colour contract

- Components consume D1 semantic tokens only. Primitive token use needs a
  D1-governed exact exception or a separately approved component-level token.
- DARK and LIGHT expose identical component semantics. SYSTEM is inherited
  selection metadata and D2 stores no preference.
- Theme changes cannot change intent, financial outcome, data quality,
  capability, or error meaning.
- Forced colours use D1 `systemColor` roles; authored hex values are not assumed
  to survive.
- `forced-color-adjust:none` remains prohibited without an exact D-084
  Accessibility-approved exception.
- Disabled and read-only states must remain distinguishable in both themes and
  forced colours.
- `positive`, `negative`, `warning`, `stale`, `gapped`, and
  `research-required` retain their D1 meanings and cannot be repurposed as
  generic component variants.

## 10. Responsive, localization, and content boundary

D2 owns intrinsic behavior only:

- content-sized and bounded-width variants;
- wrapping, minimum hit areas, compact/default density after approval;
- safe text overflow and horizontal overflow containers;
- component-local stacking when its semantics remain unchanged.

D3 owns page/sidebar/dashboard breakpoints and route-level composition. D5 owns
data-grid virtualization and financial dense-layout performance.

Rules:

- controls and messages expand for long labels rather than clipping required
  text;
- badges may wrap or expose a full accessible label; critical meaning cannot
  exist only in truncated text or tooltip;
- financial strings are never silently rounded, reformatted, or truncated by a
  component; overflow must preserve access to the exact value;
- components accept already formatted display strings plus explicit semantic
  availability/quality presentation; domain formatters own decimals, units,
  dates, times, and locale rules;
- Unicode text is rendered as text. Direction-sensitive icon/keyboard behavior
  follows the approved RTL policy; identifiers and financial signs are not
  reversed by guessing;
- pseudo-localization uses at least the approved expansion threshold from
  D-098 and exercises errors, loading labels, badges, menus, tabs, tables, and
  overlays.

## 11. Data-table foundation

D2 table scope is limited to semantic presentation primitives:

- table, caption, head, body, row, header, and cell contracts;
- sortable-header state and activation intent;
- selectable-row presentation without owning selection/business state;
- loading, empty, error, degraded, and typed unavailable presentation;
- sticky-header compatibility, horizontal overflow, and focus-visible rules;
- tabular-numeral and decimal-alignment hooks that do not format values.

Non-goals are virtualization, server queries, domain sorting, ranking,
market-specific columns, calculations, live update batching, trading actions,
and exact-value formatting. Virtualization belongs to D5 or a later measured
performance increment and must preserve semantic/keyboard behavior.

Table cells containing financial data must expose exact complete text to users
and assistive technology, distinguish unknown/unavailable from zero, and carry
quality presentation supplied by the caller. Ellipsis alone is not acceptable
for a financially relevant value.

## 12. Overlay foundation

D2 plans Dialog, Popover, Tooltip, and Menu as distinct semantics. A custom
Select/Listbox may reuse lower-level overlay mechanics only after its own
decision and behavior contract.

Common requirements:

- finite semantic D1 layers; if D-093 approves portals, their root ownership is
  singular and governed rather than page- or user-selected;
- deterministic SSR/hydration behavior and stable IDs;
- bounded viewport collision handling without moving content off-screen;
- pointer, touch, keyboard, and screen-reader parity;
- governed controlled/uncontrolled open state under D-090/D-093, one close
  reason enum, focus restoration, cleanup of listeners/timers/portals, and
  duplicate-root prevention where a portal is approved;
- bounded nesting and no cyclic overlay ownership;
- scroll lock only for approved modal behavior, with background inertness only
  where the approved modality contract requires it;
- no user-controlled portal target, arbitrary layer, HTML, CSS, or URL.

Implementation is blocked by D-093 and D-094. The plan does not select Radix,
Floating UI, Headless UI, or a custom implementation. If safe implementation
requires a dependency, that dependency must be approved before any manifest or
lockfile change.

## 13. Evidence and tooling options

| Option                                  | Strengths                                                            | Costs/risks                                                                  | Planning recommendation                                              |
| --------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| repository-native deterministic harness | no new dependency; exact states; can use current app/browser tooling | more local harness code; must avoid shipping routes                          | preferred baseline pending D-091/D-092                               |
| non-shipping route-based evidence page  | realistic Next.js/CSS/hydration and screenshots                      | route leakage risk; page/source change boundary must be explicit             | acceptable only as build-time/test harness, never a production route |
| Storybook                               | mature state catalog and ecosystem                                   | substantial dependency, configuration, security, CI, and maintenance surface | do not adopt without separate approval                               |
| another isolated workbench              | may fit required browser/a11y tooling                                | same supply-chain and upkeep questions                                       | evaluate only against approved evidence requirements                 |

The selected strategy must support semantic assertions, keyboard/focus,
DARK/LIGHT, forced colours, reduced motion, responsive widths,
pseudo-localization, deterministic screenshots, and bounded CI execution.
External accessibility or visual tooling requires an explicit decision and
supply-chain review; no dependency is implied by this plan.

## 14. Test strategy

### 14.1 All components

- render and semantic role/element tests;
- accessible name/description/error association tests;
- state, variant, precedence, and invalid-combination tests;
- DARK/LIGHT token-use and raw-token/raw-value misuse scans;
- forced-colour static contract and reduced-motion tests;
- long-content, Unicode, pseudo-localization, overflow, zoom/reflow, and
  approved RTL tests;
- hostile children/content/URL/icon/style tests and resource-bound tests;
- deterministic evidence and compatibility/API snapshot tests.

### 14.2 Browser-required evidence

- actual keyboard sequences, tab order, focus-visible, focus return, and no
  focus traps;
- Dialog/Menu/Popover/Tabs composite-widget behavior;
- pointer/touch outside interaction and Escape;
- portal, scroll lock, nested overlay, viewport collision, hydration, and
  cleanup;
- forced-colour browser evidence on the approved platform matrix;
- 200% zoom/text scaling and both-theme visual state matrix;
- representative screen-reader runs for each semantic control family.

Tests assert public behavior and accessibility output, not internal class names,
hook calls, or incidental DOM wrappers except where DOM shape is normative.

## 15. Security and resource limits

All exact limits are blocked by D-099; implementation may not guess them.
The approved decision must cover at least:

- child/node count per evidence case and component subtree;
- option count, menu depth, tab count, table rows/cells for non-virtual D2 use,
  overlay nesting, portal roots, label/description/tooltip bytes, and diagnostic
  count;
- animation duration and concurrent animated element limits;
- cleanup deadline for portals/listeners/timers.

Mandatory invariant behavior:

- text is escaped; HTML injection is unavailable by default;
- URLs use approved schemes/origins and external-link safety policy;
- icon inputs are a closed registry or reviewed local component, not arbitrary
  SVG/markup strings;
- no arbitrary class/style/token/layer/portal target from untrusted content;
- excessive content is rejected, bounded, or rendered through a documented
  safe overflow path; it never creates unbounded DOM;
- menus/overlays cannot recurse without a finite policy;
- failed focus containment closes or disables the unsafe overlay rather than
  trapping the user;
- animations stop on unmount and respect reduced motion.

## 16. Migration policy

1. Record the existing usage and behavior without changing it.
2. Implement one checkpoint in a new isolated component boundary.
3. Prove semantics, accessibility, themes, forced colours, hostile input, and
   resource bounds in the approved harness.
4. Freeze the checkpoint after independent acceptance.
5. Migrate only a named existing usage under a separate explicit allowlist.
6. Verify no route, DOM semantics, copy, navigation, responsive layout, or
   business behavior regression.
7. Keep the legacy pattern until replacement evidence and rollback pass.
8. Remove legacy CSS only in a separately scoped migration compatible with D1
   raw-value governance.

D2 does not migrate every Phase 1 page. Initial implementation may create the
library and evidence with zero production consumer migration. Any use of
`apps/web/src/components/**`, pages, `layout.tsx`, or `globals.css` requires an
explicitly approved implementation allowlist; this plan alone grants none.

## 17. Implementation decomposition

### D2.1 — Core non-overlay primitives

Components: Button, IconButton, Link, Badge, StatusBadge, Separator,
ProgressIndicator, Skeleton, Surface, Card, Stack, Inline, and EmptyState.

Non-goals: forms, selection, overlays, tables, app adoption, routes, or D1
changes.

Acceptance gate: approved D-089 through D-092, D-095 through D-099, and D-101
as they apply; semantic/token/state tests; accessible names; hit targets; theme,
forced-colour, motion, localization, hostile-input, resource-bound, deterministic
evidence, and zero dependency/consumer change unless separately approved.

Freeze gate: zero BLOCKER/unresolved HIGH; public APIs versioned; authoritative
tests pass; no out-of-scope diff. Later checkpoints cannot redefine these
semantics without compatibility approval.

### D2.2 — Form and selection primitives

Components: Label, FieldMessage, TextInput, TextArea, Checkbox, RadioGroup,
Switch, and native Select.

Non-goals: validation/business rules, form submission, authentication, custom
listbox, autocomplete, date/amount input, or page migration.

Acceptance gate: D2.1 frozen; controlled/uncontrolled, labels/errors,
disabled/read-only/invalid, autofill, keyboard, focus, touch, localization,
forced-colour, hostile-value, and native-browser matrix pass.

Freeze gate: same aggregate quality gate, plus no guessed formatting/unit and
no auth behavior.

### D2.3 — Overlay and composite interaction primitives

Components: Tooltip, Dialog, Popover, Menu/MenuButton, and Tabs. Custom Select
remains optional and needs its own approved scope.

Non-goals: shell navigation, command palette, notifications, admin approval,
route modal, or business action confirmation.

Acceptance gate: D2.1–D2.2 frozen; overlay/dependency decision approved; focus,
Escape, outside interaction, inertness, restoration, nesting, portal, hydration,
collision, touch, reduced-motion, forced-colour, cleanup, and browser evidence
pass.

Freeze gate: no focus-trap, hydration, unbounded portal, or dependency-security
HIGH remains.

### D2.4 — Data-presentation primitives

Components: semantic Table primitives, SortableHeader presentation, table state
presentations, and Pagination presentation.

Non-goals: virtualization, fetching, ranking, financial formatting, live data,
domain sorting, charts, or trading actions.

Acceptance gate: D2.1 frozen, applicable D2.2/D2.3 primitives consumed, and
D-100 approved; semantic table, keyboard/focus, overflow, exact text
availability, unknown/zero, quality/status, localization, density, and
screen-reader evidence pass.

Freeze gate: no financial truncation, inferred unit/precision, or D5 scope leak.

### D2.5 — Evidence and bounded adoption completion

Scope: authoritative component matrix, deterministic browser evidence, API
compatibility inventory, and only separately approved Phase 1 usage migrations.

Non-goals: site redesign, D3 shell conversion, D4 runtime theme, D5 financial
presentation, or D6 admin workflows.

Acceptance gate: D2.1–D2.4 frozen; all approved browser/assistive technology,
theme, forced-colour, localization, resource, security, migration, and rollback
evidence passes.

Freeze gate: aggregate D2 formal acceptance with zero BLOCKER/unresolved HIGH,
no D1/frozen-boundary change, and explicit deferrals.

The checkpoints are independently implementable and acceptable, but none is
authorized by this plan. D2 remains one aggregate design foundation only after
all selected checkpoints freeze.

## 18. Decisions required before implementation

Normative decision IDs and owners are in `DECISIONS_REQUIRED.md`:

| ID    | Decision                                                              | Primary owner(s)                                 | Gate                                         |
| ----- | --------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| D-089 | implementation/package style and export boundary                      | Frontend Architecture + Product Owner            | D2.1                                         |
| D-090 | `className`/`style`/polymorphism/slots/render-prop extension policy   | Frontend Architecture + Security + Accessibility | D2.1                                         |
| D-091 | evidence/workbench and screenshot strategy                            | QA + Frontend Architecture + Product Owner       | D2.1                                         |
| D-092 | accessibility tooling and supported browser/AT matrix                 | Accessibility + QA + Security                    | D2.1                                         |
| D-093 | overlay implementation/portal/SSR strategy                            | Frontend Architecture + Accessibility            | D2.3                                         |
| D-094 | external headless dependency permission and supply-chain gate         | Security + Frontend Architecture + Product Owner | before any dependency or D2.3 implementation |
| D-095 | closed icon system and SVG policy                                     | Design + Accessibility + Security                | D2.1                                         |
| D-096 | initial component set and checkpoint freeze policy                    | Product Owner + Design + Frontend Architecture   | D2.1                                         |
| D-097 | sizes, density, state precedence, and invalid-combination policy      | Design + Accessibility + Frontend Architecture   | D2.1/D2.2                                    |
| D-098 | RTL, localization expansion, forced-colour and visual evidence matrix | Accessibility + Product + QA                     | D2.1                                         |
| D-099 | resource/DOM/content/overlay bounds                                   | Security + Frontend Architecture + Accessibility | affected checkpoint                          |
| D-100 | table virtualization ownership and trigger                            | Frontend Architecture + Product + Accessibility  | before D2.4; implementation deferred to D5   |
| D-101 | component API versioning/deprecation policy                           | Frontend Architecture + Product Owner            | before D2.1 implementation                   |

No unresolved decision may be converted into a package default. A later
decision may reduce the selected D2 component set; expanding it requires a new
scope approval.

## 19. Risks and observability

R-131 through R-146 in `RISK_REGISTER.md` cover inaccessible custom controls,
focus/keyboard defects, token bypass, API/variant explosion, style escapes,
dependency growth, overlay stacking/hydration, localization/financial overflow,
unsafe HTML/icons/URLs, brittle evidence, scope leakage, migration redesign,
unbounded DOM, and insufficient assistive-technology evidence.

D2 has no production telemetry infrastructure. Later component evidence may
emit only finite structured diagnostics such as component family, state family,
test/evidence kind, result, and bounded reason code. Labels must not contain user
content, accessible labels, URLs, arbitrary component names, DOM snapshots,
financial values, or free-form errors.

## 20. D2 aggregate acceptance and rollback

D2 freezes only when:

- every selected checkpoint is formally accepted and frozen;
- all D-089 through D-101 decisions required by selected scope are approved;
- BLOCKER = 0 and unresolved HIGH = 0;
- authoritative render, semantic, keyboard, focus, theme, forced-colour,
  reduced-motion, localization, hostile-input, resource, compatibility, and
  deterministic evidence passes;
- D1 remains byte-for-byte frozen and raw-value governance passes;
- no unauthorized page, route, layout, DOM, navigation, business logic,
  dependency, or infrastructure change exists;
- any migration is named, bounded, reversible, and separately evidenced;
- frozen Phase 2A/2B/Product-Commerce-Admin and brand boundaries remain intact.

Rollback is checkpoint-atomic: restore the immediately previous accepted
component source/export/evidence set and any explicitly migrated consumer in
one reviewed change. D1 artifacts are never rolled back as part of D2. A
consumer migration cannot be rolled back by leaving mixed component and legacy
styles.

## 21. Documentation deliverables

Planning deliverables:

- this plan;
- `D2_FOUNDATIONAL_COMPONENT_LIBRARY_ACCEPTANCE_PLAN.md`;
- cross-references in roadmap, design/theme, domain/API/security, risk,
  decisions, and acceptance registers.

Later implementation evidence per checkpoint must include:

- exact source/test/evidence/consumer allowlist;
- component contract and state matrix;
- public API/version inventory;
- commands and exact test counts;
- accessibility/browser/AT/theme/forced-colour/localization evidence;
- resource/security/raw-value findings and active exceptions;
- dependency/lockfile evidence;
- migration and rollback inventory;
- frozen-boundary hashes/diffs;
- limitations and next acceptance prompt.

Implementation reports are pre-acceptance evidence only.

## 22. Readiness verdict

The decomposition is ready for formal documentation acceptance. D2
implementation is **not** ready or authorized until this planning package is
independently accepted and the decisions required by the first checkpoint are
approved.
