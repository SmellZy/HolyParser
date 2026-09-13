# D2 Foundational Component Library Decisions

Status: **PRODUCT / DESIGN / ACCESSIBILITY / FRONTEND-ARCHITECTURE / SECURITY DECISIONS APPROVED — FORMAL INDEPENDENT DECISION ACCEPTANCE REQUIRED**

Approval date: **2026-09-07**

Applies to: D2.1 through D2.5 planning contracts only
Implementation authority: **NONE**

## 1. Authority and interpretation

The Product Owner, Design, Accessibility, Frontend Architecture, Security, and
QA authorities named below approve D-089 through D-101 as normative inputs to a
future D2 implementation task. This document does not approve components,
dependencies, package or lockfile changes, application adoption, or any D2
checkpoint.

The accepted D1 token system remains the only visual-token authority. The
accepted D2 plan remains the scope and checkpoint authority. Where this document
selects among alternatives that the plan intentionally left open, this document
is authoritative. A future implementation may make local mechanical choices
only when they do not alter an approved public API, semantic behavior,
accessibility behavior, security boundary, evidence obligation, or resource
limit.

Every decision requires a separate formal independent decision-acceptance
review before D2.1 may be authorized. D2.3 also retains the package-specific
dependency gate in D-094. D-100 assigns future ownership without authorizing D5.

## 2. Common approval record

- **Approval date:** 2026-09-07.
- **Approval basis:** accepted HolyParser design direction, frozen D1 contracts,
  accepted D2 plan and planning acceptance, current Phase 1 evidence, security
  model, risk register, and repository conventions.
- **Change control:** no implementation convenience overrides these decisions.
- **Rollback:** before a checkpoint freezes, remove its complete provisional
  package/evidence set; after freeze, restore the complete immediately previous
  accepted package, stylesheet, exports, evidence, and explicitly migrated
  consumers atomically.
- **Revisit:** a revisit is a new documentation decision with the same affected
  authorities and a compatibility classification under D-101. It cannot occur
  silently in source.

## 3. D-089 — Package, API, export, CSS, and React boundary

### Alternatives and criteria

Evaluated alternatives were components inside `apps/web`, an isolated workspace
with one barrel, component-only subpaths, a controlled barrel plus subpaths,
public deep imports, CSS copied into consumers, CSS-in-JS, and a component-owned
stylesheet. Criteria were boundary isolation, tree shaking, server/client
clarity, D1 compliance, discoverability, compatibility testing, rollback, and
absence of page-specific authority.

### Recommendation and approved choice

Approve a controlled combination in one workspace:

- repository path: `packages/ui`;
- package name: `@arbitrage/ui`;
- stable public root: `@arbitrage/ui`;
- stable component subpaths: one documented lowercase subpath per frozen public
  component, for example `@arbitrage/ui/button`;
- stable stylesheet subpath: `@arbitrage/ui/styles.css`;
- no other public paths and no public wildcard export;
- no consumer import from `src`, `internal`, tests, evidence, stylesheets other
  than the public stylesheet, or file-system paths.

Documentation examples:

```ts
import { Button, StatusBadge } from "@arbitrage/ui";
import { Button } from "@arbitrage/ui/button";
import "@arbitrage/ui/styles.css";
```

The source boundary is:

```text
packages/ui/
  src/components/<component-family>/
  src/internal/
  src/styles.css
  test/
  evidence/
```

The exact implementation files inside a component family are private. Public
exports are explicit in the package export map and root barrel. Root and
subpath exports must resolve to the same public symbols and types.

The package owns one component-scoped stylesheet. Component selectors use an
internal `hp-ui-` prefix and consume D1 semantic CSS variables. No page-,
route-, shell-, market-, billing-, admin-, or domain-specific style belongs in
the package. The committed `src/styles.css` file is the sole component-style
source, and `exports["./styles.css"]` resolves to that exact file. JavaScript and
TypeScript entry points never import the stylesheet implicitly; an approved
consumer integration imports `@arbitrage/ui/styles.css` once at its named style
boundary. The future package manifest declares exactly
`"sideEffects": ["./src/styles.css"]`; code entry points are side-effect-free,
and no wildcard side-effect declaration is allowed. This makes stylesheet
retention explicit without preventing tree-shaking of unused code.

There is no CSS-in-JS, runtime style generator, runtime token generation, or
second token source. D2 produces no committed generated package source.
TypeScript build output and any mechanically copied distribution CSS are
deterministic, ephemeral, ignored by Git, regenerated in clean builds, and
never an input to source generation. Evidence manifests under D-091 are
committed evidence, not package authority.

A React-specific public API is approved because the only current UI application
is the frozen React/Next.js web application. The initial package manifest owns
required `react` and `react-dom` peer ranges of `>=19.2.8 <20`, matching the
approved current web major/minimum without bundling duplicate runtimes. A range
widening requires compatibility evidence; narrowing the range or raising its
minimum is MAJOR under D-101. No component source may declare another React
version authority.

Modules remain server-compatible unless interaction, effects, or DOM APIs
require an explicit client boundary at the component leaf. The root barrel
itself has no client directive, browser-global access, stylesheet import, or
other side effect; it re-exports the same leaf symbol/type exposed by the
corresponding subpath without absorbing the leaf's client boundary. Adding a
new documented component subpath is MINOR; renaming/removing a subpath or
changing its observable server/client boundary is MAJOR under D-101.

Native focusable wrappers expose the installed React version's typed DOM `ref`
contract. D2.1/D2.2 expose no custom imperative handle. Overlay focus handles,
if any, are limited by D-093 and require public-contract evidence. Server-safe
components do not read browser globals at import or render time.

### Rejected alternatives

- Components in pages or `apps/web/src/components`: couples the foundation to a
  consumer and weakens package/freeze boundaries.
- One root barrel without stable subpaths: unnecessarily expands bundle and
  compatibility coupling.
- Component subpaths without a root: harms discoverability and simple adoption.
- Wildcard/deep imports: make private modules accidental API.
- CSS copied into consumers, CSS-in-JS, or runtime token generation: forks D1
  governance and complicates CSP/determinism.
- Always-client modules: enlarge hydration and SSR risk without need.

### Implementation, security, accessibility, and evidence implications

Implementation must test export-map closure, root/subpath equivalence, rejected
deep imports, server-safe import/render, explicit client boundaries, peer
singleton behavior, CSS selector prefixing, D1 semantic-variable consumption,
raw-value scanning, and absence of consumer/page imports. The package must not
accept runtime CSS, remote assets, secrets, or environment-controlled output.

- **Authorities:** Frontend Architecture + Product Owner + Design; Security and
  Accessibility concur on the boundary controls.
- **Implementation gate:** formal decision acceptance, exact D2.1 file
  allowlist, package-boundary tests, and separate Product Owner implementation
  authorization.
- **Production gate:** D2 checkpoint SSR/hydration, bundle, browser,
  accessibility, compatibility, and rollback evidence.
- **Rollback/revisit trigger:** a second UI framework, proven bundle regression,
  server/client incompatibility, or an accepted component that cannot be
  expressed through controlled exports.

## 4. D-090 — Extension hooks, DOM forwarding, and URL policy

### Alternatives and criteria

Evaluated alternatives were unrestricted `className`/`style`, audited escape
hatches, no visual escapes, polymorphic `as`, `asChild`, named slots, render
props, compound components, unrestricted DOM forwarding, and caller-only versus
component-enforced URL validation. Criteria were semantic preservation, D1/raw-
value governance, XSS/phishing resistance, accessibility, API finiteness,
consumer ergonomics, and compatibility.

### Recommendation and approved choice

Approve the conservative initial policy:

- `className` is not a stable public prop on D2 components;
- `style` is prohibited, including caller-supplied CSS custom properties;
- unrestricted `as` and `asChild` are prohibited;
- a semantic element may change only through a component-specific finite prop
  whose complete element/role/keyboard matrix is documented and accepted;
- compound components are allowed only where semantics require coordinated
  ownership: RadioGroup, Tabs, Menu, Dialog/Popover composition, and Table;
- named slots are component-specific typed props, not arbitrary slot-name maps;
- render props are absent from the stable initial API;
- stable `data-*` attributes are output-only and limited to the documented
  finite state vocabulary; callers cannot inject arbitrary data attributes;
- DOM props are allowlisted per component. No generic `{...rest}` forwarding is
  part of the public contract;
- explicit accessibility props such as `id`, naming references, and native
  form attributes are allowed only on components whose contract names them;
- events return documented component state and finite reasons, never DOM-
  derived business truth.

The initial output state attributes are limited to applicable values from
`data-state`, `data-disabled`, `data-readonly`, `data-invalid`, `data-loading`,
`data-selected`, `data-expanded`, `data-pressed`, `data-checked`, `data-size`,
`data-density`, and `data-intent`. Adding or changing a public attribute follows
D-101.

When a later measured use cannot be expressed without an escape hatch, the
consumer must first receive a scoped decision naming the exact component, prop,
allowed values, trusted caller boundary, owner, D1 D-084 scan/exception impact,
expiry, and compatibility status. There is no universal escape hatch.

### URL policy

`Link` accepts a caller-supplied string but validates it through one internal,
presentation-safe URL policy before rendering. This protects presentation; it
does not authorize destinations or replace product/business authorization.

Allowed baseline forms are:

- same-document fragment beginning `#`;
- query-relative URL beginning `?`;
- root-relative `/path`, dot-relative `./path`, or parent-relative `../path`;
- absolute `https:` URL when the caller explicitly marks it external;
- `mailto:` and `tel:` with no automatic new-window behavior.

Denied forms are:

- protocol-relative `//host`;
- absolute `http:`;
- `javascript:`, `data:`, `blob:`, `file:`, custom schemes, embedded
  credentials, control characters, malformed percent encoding, or invalid URL
  syntax;
- an absolute external URL presented as an internal link.

Origin authorization remains with the caller/domain layer. D2 permits any
syntactically valid `https:` origin only when `external=true`; it neither keeps
a product-origin allowlist nor decides whether a user may visit it. A new-window
external link is allowed only for `https:` and always emits
`target="_blank" rel="noopener noreferrer"`; callers cannot weaken `rel`.
`mailto:` and `tel:` remain same-context external actions. Link never treats a
URL as a command or authorization signal.

Validation operates on the original, untrimmed string. Leading or trailing
ASCII/Unicode whitespace, any C0/DEL control, any backslash, malformed percent
escape, and an empty string are rejected before classification. Scheme matching
is ASCII case-insensitive. Classification uses the original spelling before
percent decoding, so an encoded scheme cannot become an allowed absolute URL;
percent escapes may remain only inside an already allowed relative, fragment,
query, `https:`, `mailto:`, or `tel:` form.

Validation also decodes percent escapes into a separate inspection value and
rejects invalid UTF-8 or any decoded C0/DEL control or backslash. The inspected
value is never substituted as the rendered URL, and decoding cannot widen the
allowed-form classification.

Absolute URLs are parsed with the platform WHATWG URL contract. A valid Unicode
domain is canonicalized by that parser and remains an explicitly external
`https:` destination; D2 makes no trust claim about the resulting IDN/punycode
origin. Even an absolute `https:` URL that later proves same-origin still
requires `external=true`, because D2 does not read runtime origin policy.
Relative forms cannot contain an authority component.

The public Link contract may expose only finite `external` and
`openInNewWindow` navigation options. `openInNewWindow=true` is valid only with
an absolute external `https:` URL and produces the fixed `_blank`/`noopener
noreferrer` output. Otherwise target is the current context. Caller-supplied
`target`, `rel`, `download`, and `referrerPolicy` are not public props. `id` and
ARIA references remain available only through the explicit per-component
accessibility allowlist described above.

### Rejected alternatives

- Public arbitrary class/style/token/CSS-variable injection: bypasses D1 and
  makes component evidence non-exhaustive.
- Universal polymorphism: can convert actions to navigation or destroy native
  semantics.
- Arbitrary DOM forwarding: creates unreviewed ARIA, event, URL, and data hooks.
- Caller-only URL validation: allows an unsafe string to become rendered
  navigation through a presentation component.
- D2 origin authorization: would incorrectly import business/security policy
  into a component.

### Implementation, security, accessibility, and evidence implications

Tests must cover every allowed and denied URL form, Unicode/control characters,
mixed-case schemes, encoded bypasses, external target/rel behavior, prop
closure, absence of style/class/as/asChild, state-attribute closure, native
semantics, and callback finiteness. User content remains text, never HTML.

- **Authorities:** Frontend Architecture + Security + Accessibility; Product
  Owner approves the baseline URL forms.
- **Implementation gate:** formal decision acceptance and API/URL misuse tests.
- **Production gate:** governed-consumer scan finds no bypass or unsafe URL
  path.
- **Rollback/revisit trigger:** an accepted component cannot support a measured
  consumer without wrapper churn, a browser URL semantic changes, or a security
  review tightens allowed forms.

## 5. D-091 — Component evidence and workbench strategy

### Alternatives and criteria

Evaluated alternatives were a repository-native deterministic harness, a
shipping or non-shipping application route, Storybook, and another isolated
workbench. Criteria were behavior coverage, accessibility and browser support,
determinism, CI cost, dependency and supply-chain surface, production leakage,
maintenance, and rollback.

### Recommendation and approved choice

Approve a repository-native, non-shipping harness under the `packages/ui`
evidence boundary. It uses only repository-approved tooling already present at
the time of implementation. It is absent from package exports and production
application routes, builds, route manifests, navigation, and bundles. A
temporary browser server or build output may exist only inside the test/evidence
command and its bounded temporary directory.

The harness must provide:

- a sorted finite component/state case registry;
- D-097 state combinations and D-098 theme/localization/RTL/forced-colour
  cases;
- keyboard/focus scripts and browser-readable assertions;
- deterministic viewports, device scale, motion preference, locale, direction,
  font availability, browser/tool versions, and case IDs;
- immutable case/request/time bounds;
- synthetic content only, with no credentials, production data, user data, or
  financial payloads.

The sorted case registry, build, semantic/unit checks, manifest generation, and
production-exclusion scan run in CI for every checkpoint. The same built harness
must be consumable by an approved browser runner in CI without source changes.
Until such a runner is available without a new dependency, Chromium/Firefox/
WebKit captures and AT work are reproducible formal-review steps under D-092;
they cannot be reported as automated CI evidence.

Commit only:

- the source case registry and tests inside the future package;
- bounded selected screenshots required by D-098;
- canonical two-space UTF-8/LF evidence manifests and SHA-256 files under
  `docs/evidence/d2/<checkpoint>/`;
- formal reports that cite exact browser/runtime versions and manual evidence.

Do not commit transient browser profiles, caches, raw videos, trace archives,
host paths, random ports, timestamps inside deterministic manifests, or an
unbounded screenshot Cartesian product. A manifest hashes evidence but never
hashes itself. File paths are repository-relative POSIX paths, sorted.

Storybook and other external workbenches are deferred. Reconsider only when a
formal checkpoint review records a BLOCKER/HIGH evidence requirement that the
repository-native harness cannot satisfy, or when the same non-domain browser
orchestration must be independently maintained in three accepted checkpoints.
Any reconsideration requires D-094-equivalent supply-chain review and a new
D-091 decision before dependency or configuration changes.

### Rejected alternatives

- A production evidence route: creates route leakage and enlarges attack and
  support surface.
- Storybook now: adds disproportionate dependency/configuration/maintenance
  surface before a measured gap.
- Screenshots without machine-readable inventory/provenance: cannot prove
  completeness or deterministic reproduction.

### Implementation, security, accessibility, and evidence implications

The harness must prove production exclusion, clean regeneration, repeated
hashes, bounded cases, keyboard/focus behavior, and the D-092 matrix. It must
fail if a route/export/bundle contains evidence code. Evidence text is escaped
and hostile cases never become raw markup.

- **Authorities:** QA + Frontend Architecture + Product Owner; Security and
  Accessibility concur.
- **Implementation gate:** formal decision acceptance and an exact evidence
  file/command allowlist.
- **Production gate:** clean deterministic generation and D-092/D-098 evidence
  pass.
- **Rollback/revisit trigger:** production leakage, irreproducible evidence,
  CI cost exceeding the approved checkpoint budget, or the measured gap above.

## 6. D-092 — Accessibility tooling and browser/AT matrix

### Alternatives and criteria

Evaluated alternatives were automated DOM checks alone, automated browser
checks, manual keyboard and screen-reader review, one browser family, three
desktop browser engines, and mobile/touch evidence. Criteria were reproducible
semantic coverage, real focus/interaction behavior, forced-colour support,
platform representativeness, finite cost, and honest limitations.

### Recommendation and approved choice

No single evidence type is sufficient. The authoritative matrix is:

| Evidence                                             | D2.1                                                | D2.2                                 | D2.3                                                                     | D2.4                                        | Aggregate D2                                                 |
| ---------------------------------------------------- | --------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------ |
| repository-native semantic/name/state tests          | every component                                     | every component                      | every component                                                          | every component                             | rerun all                                                    |
| Chromium current stable, desktop browser-driven      | required                                            | required                             | required                                                                 | required                                    | required                                                     |
| Firefox current stable, desktop browser-driven       | required for interactive families                   | required                             | required                                                                 | required                                    | required                                                     |
| WebKit/Safari current stable, desktop browser-driven | required for interactive families                   | required                             | required                                                                 | required                                    | required                                                     |
| keyboard-only and focus-visible/return               | every interactive component                         | every control                        | every composite/overlay                                                  | sorting/pagination/focusable table behavior | rerun representative paths                                   |
| VoiceOver + Safari on current supported macOS        | action/link/status family                           | form and selection family            | Dialog, Menu, Tabs plus representative Tooltip/Popover                   | table/sort/pagination family                | required                                                     |
| NVDA + Firefox on current supported Windows          | action/link/status family                           | form and selection family            | Dialog, Menu, Tabs plus representative Tooltip/Popover                   | table/sort/pagination family                | required                                                     |
| touch/pointer                                        | Chromium emulation for D2.1; native mobile deferred | representative native control checks | Safari/iOS and Chrome/Android required for overlay/composite interaction | pagination/overflow representative          | required                                                     |
| forced colours                                       | static D1 plus Chromium emulation                   | same                                 | same                                                                     | same                                        | native Windows High Contrast + NVDA for each semantic family |
| 200% zoom/reflow and text scaling                    | required                                            | required                             | required                                                                 | required                                    | representative rerun                                         |
| reduced motion                                       | automated preference plus rendered state            | same                                 | all animated overlays                                                    | all animated/loading states                 | representative native preference                             |

“Current supported” means the current stable browser/OS/AT release available at
the formal review; the report records exact versions. The previous stable
desktop browser version is a production-compatibility check before aggregate D2
freeze, not a per-commit gate.

The required platforms are exact by family: Chromium and Firefox run on the
pinned Linux x86_64 CI/browser environment; Safari runs on Apple Silicon macOS;
VoiceOver is paired with Safari on that macOS host; NVDA is paired with Firefox
on Windows 11; mobile touch uses Safari on the current stable iOS reference
device/simulator and Chrome on the current stable Android reference device/
emulator. The formal report records the exact OS/browser/AT/device versions.
WebKit automation is supplemental and cannot replace the required Safari run.

Automated evidence covers DOM semantics, accessible-name inputs, finite state,
focus order where reliable, contrast/token contracts, raw-value policy, motion,
and deterministic case completion. Browser-driven evidence covers actual key,
focus, pointer/touch, portal, collision, hydration, zoom, and forced-colour
behavior. Manual evidence covers screen-reader announcements and navigation,
native Windows High Contrast, platform-specific touch, and behavior automation
cannot faithfully assert.

Missing required platform evidence blocks the affected checkpoint; it is not a
passing accepted limitation. A transient unavailable environment may pause the
review, but the checkpoint cannot freeze. Screen-reader evidence uses bounded
representative semantic families rather than every cosmetic variant.

No new automated accessibility dependency is approved here. Existing
repository tests plus the D-091 harness are the initial tooling. A formal review
may require a separate tool decision if a semantic requirement cannot be
reproduced.

Browser, operating-system, and assistive-technology binaries are supplied by
the formal-review environment; they are not package dependencies or permission
to edit a manifest. The reviewer verifies exact installed versions before the
run and performs no network installation during evidence capture. If the
required environment is absent, the affected checkpoint remains blocked until
an approved environment or separate tooling decision exists.

### Rejected alternatives

- Automated lint or static ARIA snapshots alone: cannot prove keyboard, focus,
  announcements, portals, or forced colours.
- Screenshots as AT proof: contain no accessibility-tree interaction evidence.
- A single browser/AT pairing: misses engine and platform behavior.
- An unbounded all-version matrix: cannot be maintained or reproduced.

### Implementation, security, accessibility, and evidence implications

Evidence contains only bounded scripts, finite result codes, versions, and
synthetic labels. Manual evidence records operator role and steps without names,
credentials, user data, or raw AT transcripts containing hostile content.

- **Authorities:** Accessibility + QA + Security + Product Owner.
- **Implementation gate:** formal decision acceptance and reproducible access to
  the D2.1 rows before D2.1 formal acceptance.
- **Production gate:** every applicable row passes and previous-stable desktop
  compatibility is reviewed before aggregate freeze.
- **Rollback/revisit trigger:** supported browser/AT behavior changes, a required
  environment becomes unavailable, or evidence shows matrix redundancy/gap.

## 7. D-093 — Overlay, portal, deterministic ID, and SSR/hydration strategy

### Alternatives and criteria

Evaluated alternatives were no portals, one governed portal root, per-overlay
roots, native browser primitives, repository-owned behavior, and a reviewed
headless dependency. ID alternatives were React/framework deterministic IDs,
caller IDs, a package-global counter, and random IDs. Criteria were semantics,
focus safety, SSR/hydration determinism, nesting, cleanup, collision behavior,
testability, and D1 layers.

### Recommendation and approved choice

Approve one governed portal root per document for Dialog, Popover, Tooltip, and
Menu when portalling is required. The root has the fixed package-owned marker
`data-hp-ui-portal-root`; the application/harness supplies it through an
approved host boundary. Consumers cannot choose arbitrary targets or layers.
The package never creates multiple roots. Absence or duplication fails closed
with a finite diagnostic and does not open a focus-trapping overlay.

Tabs is not an overlay, uses no portal, inertness, focus trap, outside-click, or
scroll-lock behavior.

Overlay modules are explicit client boundaries. Triggers and closed state may
server-render. Portal content does not render on the server and remains absent
on the first hydration render. Initially open SSR overlays are prohibited; an
overlay may open only after hydration. No browser global is read during module
import or server render.

IDs use React/framework deterministic IDs as the default. A caller may provide
one base ID matching lowercase ASCII `[a-z][a-z0-9-]{0,63}`. The component
derives fixed suffixes for trigger/content/label/description. Caller IDs must be
unique within the document. Evidence and development builds detect duplicates
and return `UI_DUPLICATE_ID`; runtime random IDs, timestamps, package-global
counters, and user-content-derived IDs are prohibited.

### Interaction contract

- The component owning an overlay owns its open state contract, focus lifecycle,
  listeners, timers, collision observation, and cleanup. Controlled and
  uncontrolled modes cannot switch after initialization.
- Dialog initial focus order is explicit approved focus target, first enabled
  focusable descendant, then the dialog container. Modal Dialog contains focus.
- Modal Dialog alone owns background inertness and scroll lock. The overlay
  manager reference-counts and restores the exact prior document state.
- One modal may be open at a time. Non-modal Tooltip/Popover/Menu may nest within
  it up to D-099's total overlay depth.
- Only the topmost dismissible overlay handles Escape or outside interaction.
- Dialog does not close on outside pointer by default. A separately documented
  noncritical dismissible variant is not part of the initial D2.3 contract and
  requires a new D-093/D-101 decision before it can exist. Popover and Menu
  close on outside pointer/focus. Tooltip follows its supplemental hover/focus/
  Escape contract.
- Public close reasons are the applicable subset of `ESCAPE`,
  `OUTSIDE_POINTER`, `OUTSIDE_FOCUS`, `TRIGGER_TOGGLE`, `ITEM_ACTION`,
  `PROGRAMMATIC`, `FOCUS_TARGET_REMOVED`, and `VIEWPORT_INVALIDATED`.
- Positioning may flip once and then clamp to the viewport safe area. Content
  that cannot fit receives bounded internal overflow; repositioning cannot loop.
- On close, focus returns to the still-connected trigger, else an explicit
  validated fallback ref, else a captured still-connected focusable ancestor,
  else the document body. Failure closes the overlay and emits a finite
  diagnostic; it never retains a trap.
- Unmount/shutdown cancels timers and observers, removes listeners, restores
  inert/scroll state, removes portal content, and completes focus restoration
  within D-099's deadline.

### Rejected alternatives

- Per-overlay/ad hoc portal roots and caller targets: create unbounded DOM and
  layer conflicts.
- SSR of open portal content or undocumented client-only fallback: risks
  hydration mismatch and inaccessible transient state.
- Random IDs or counters: make SSR and evidence order-dependent.
- Page-owned focus traps/scroll lock: split ownership and break atomic cleanup.

### Implementation, security, accessibility, and evidence implications

D2.3 must test host absence/duplication, SSR/first hydration, duplicate IDs,
initially-open rejection, modal focus and inertness, restoration target removal,
nested overlays, topmost Escape, outside behavior, collision, touch, cleanup,
shutdown, and every close reason across D-092.

The fixed `data-hp-ui-portal-root` marker is the sole host-owned input-side
`data-*` exception to D-090. It is not a component prop or styling hook and may
appear only once on the approved application/harness portal host.

- **Authorities:** Frontend Architecture + Accessibility + QA; Security concurs
  on portal/ID/content boundaries.
- **Implementation gate:** formal decision acceptance, D-094 feasibility result,
  D-099 bounds, and separate D2.3 authorization.
- **Production gate:** browser/AT/hydration/fault/cleanup matrix passes.
- **Rollback/revisit trigger:** native/browser matrix cannot meet the contract,
  portal host integration conflicts with D3, or nested consumer evidence needs a
  different policy.

## 8. D-094 — External headless dependency policy

### Alternatives and criteria

Evaluated choices were: A, no external dependency; B, conditional permission
for D2.3 after evidence; and C, approving a package now. Criteria were safe
accessibility, browser/SSR support, supply-chain exposure, bundle size,
maintenance, replacement cost, and checkpoint isolation.

### Recommendation and approved choice

Approve **Choice B**:

- D2.1 and D2.2 add no headless interaction dependency.
- D2.4 adds no headless dependency for tables or pagination.
- D2.3 begins with a bounded native/repository-owned feasibility task only after
  separate authorization.
- If that evidence cannot meet D-092/D-093 without a dependency, D2.3 stops and
  requests a package-specific approval before any manifest or lockfile change.
- This decision permits consideration; it approves no package, version, or
  lockfile change.

Package-specific approval must record current official documentation, exact
version and integrity/provenance, license, maintainer/activity status,
vulnerabilities and transitive graph, bundle cost, SSR/hydration and browser
support, accessibility behavior, styling/escape requirements, update owner and
cadence, pinned range, removal/rollback plan, and a proof that D1/D-090 remain
enforceable.

### Rejected alternatives

- Choice A as an unconditional lifetime ban: could force unsafe custom overlay
  behavior if native support is insufficient.
- Choice C now: no measured D2.3 feasibility evidence or package-specific
  review exists.
- Adding a dependency during implementation: bypasses scope and supply-chain
  authority.

### Implementation, security, accessibility, and evidence implications

The feasibility task must compare native/repository-owned behavior to the exact
D-092/D-093 contract and record unsupported cases. A package-specific decision
is independently accepted before source can depend on it.

- **Authorities:** Security + Frontend Architecture + Product Owner +
  Accessibility.
- **Implementation gate:** no dependency for D2.1/D2.2/D2.4; separately approved
  feasibility and package decision before dependency-based D2.3.
- **Production gate:** supply-chain, license, bundle, SSR, accessibility,
  browser, update, and rollback evidence.
- **Rollback/revisit trigger:** feasibility failure, upstream abandonment or
  advisory, bundle/SSR regression, or an approved native capability removes the
  need.

## 9. D-095 — Closed icon and SVG policy

### Alternatives and criteria

Evaluated alternatives were the current local icon approach, a typed closed
registry, an external dependency, remote icons, and arbitrary SVG/markup input.
Criteria were security, provenance, accessibility ownership, D1 integration,
forced colours, RTL, bundle control, and API finiteness.

### Recommendation and approved choice

Approve a package-private, closed, typed local registry under the future
`packages/ui/src/icons` internal boundary. Public components accept a finite
`IconId`; they do not accept SVG strings, raw markup, URLs, arbitrary React
nodes, or caller components as icon input. No standalone generic public Icon is
part of the initial D2 set.

Reviewed local React SVG components use a normalized `viewBox`, path geometry
only, `fill="currentColor"` or `stroke="currentColor"`, and D1 component colour.
They contain no script, style block, event handler, URL, external reference,
embedded image/font, foreign object, animation, arbitrary ID, or raw HTML.

Approved semantic sizes map exactly to D1 icon sizes `12`, `16`, `20`, `24`,
and `32` CSS pixels. Each component contract restricts the subset it uses;
callers cannot pass arbitrary dimensions. The owning component supplies the
accessible name and state. Decorative SVG is `aria-hidden`; an icon-only action
requires an independent accessible name. A semantic icon never substitutes for
required text/status redundancy.

Icons inherit forced-colour system roles through `currentColor`. Only icons
whose registry metadata is `directional: true` may mirror in RTL. Inline
start/end chevrons may mirror; financial trend, status, playback, brand, ticker,
and physical-direction icons do not mirror by assumption.

A new icon requires Design, Accessibility, and Security review; recorded source
and license/provenance; normalized local geometry; direction metadata; unique
typed ID; visual/theme/forced-colour/RTL evidence; and hostile SVG/static scans.

### Rejected alternatives

- External dependency now: no measured registry gap justifies supply-chain and
  bundle expansion.
- Remote icons or URLs: create runtime integrity and privacy risk.
- Arbitrary SVG/React-node icon input: bypasses sanitization, size, semantics,
  and forced-colour evidence.
- Universal RTL mirroring: corrupts non-directional meaning.

### Implementation, security, accessibility, and evidence implications

Tests must close the IconId union, reject unknown IDs and hostile markup, verify
size subsets, accessible-name ownership, decoration hiding, currentColor,
forced-colour visibility, direction metadata, and new-icon provenance.

- **Authorities:** Design + Accessibility + Security + Frontend Architecture.
- **Implementation gate:** formal decision acceptance and registry/hostile-input
  tests before IconButton or StatusBadge.
- **Production gate:** rendered theme, forced-colour, zoom, and RTL evidence.
- **Rollback/revisit trigger:** the reviewed local set cannot meet a measured
  product need, licensing changes, or a separately reviewed dependency offers a
  material security/accessibility benefit.

## 10. D-096 — Selected component set and checkpoint freeze policy

### Alternatives and criteria

Evaluated alternatives were the planned five checkpoints unchanged, one large
library, a smaller D2.1, optional components now, and artificial per-component
phases. Criteria were acceptance risk, semantic dependency, evidence cost,
usefulness, rollback isolation, and avoidance of later-phase leakage.

### Recommendation and approved choice

Approve five checkpoints with a smaller D2.1 and no optional components:

| Checkpoint             | Approved component scope                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| D2.1 Core              | Button, IconButton, Link, Badge, StatusBadge, Separator, Surface, Card, Stack, Inline                                    |
| D2.2 Forms             | Label, FieldMessage, TextInput, TextArea, Checkbox, Radio/RadioGroup, Switch, Native Select                              |
| D2.3 Composite/overlay | Tooltip, Dialog, Popover, Menu/MenuButton, Tabs                                                                          |
| D2.4 Data/feedback     | ProgressIndicator, Skeleton, EmptyState, semantic Table primitives, SortableHeader presentation, Pagination presentation |
| D2.5 Evidence/adoption | no new component; aggregate evidence and only separately approved named consumer adoption                                |

ProgressIndicator, Skeleton, and EmptyState move from D2.1 to D2.4 because they
are state/data-feedback presentation and do not need to enlarge the first API
freeze. The taxonomy remains `D2 REQUIRED`; only checkpoint ownership changes.

Custom Select/Listbox and Toast remain optional and unselected. Each requires a
measured need, exact scope, applicable overlay/accessibility/resource decisions,
and separate approval. Spinner, Cluster, and generic Dropdown remain rejected.
Shell/navigation, financial visualization/virtualization, and admin workflows
remain D3, D5, and D6 respectively.

Each checkpoint freezes only after independent formal acceptance. Its public
API, DOM where normative, semantic and accessibility behavior, stylesheet
contract, tests, evidence, and rollback bundle freeze together. A later
checkpoint may consume but cannot redefine it. Additions are versioned under
D-101; semantic changes require compatibility review. Internal implementation
batches are allowed, but none independently freezes or authorizes the next
checkpoint.

### Rejected alternatives

- One large library or every candidate: increases combinatorial and rollback
  risk.
- Per-component public phases: adds ceremony without a meaningful architecture
  boundary.
- Optional components now: no measured need exists.
- Keeping all feedback components in D2.1: needlessly enlarges the first freeze.

### Implementation, security, accessibility, and evidence implications

Every implementation and review uses the exact matrix. Exports outside the
current checkpoint fail the allowlist. D2.5 cannot defer evidence required to
freeze D2.1–D2.4 and cannot become a broad migration.

- **Authorities:** Product Owner + Design + Frontend Architecture + QA;
  Accessibility and Security concur on checkpoint gates.
- **Implementation gate:** formal decision acceptance and separate approval for
  the exact next checkpoint only.
- **Production gate:** aggregate D2 acceptance after all selected checkpoints.
- **Rollback/revisit trigger:** measured dependency/evidence proves a component
  is in the wrong checkpoint or a component lacks an approved consumer; moving
  or removing it requires a new scope decision before implementation.

## 11. D-097 — Sizes, density, state precedence, and invalid combinations

### Alternatives and criteria

Evaluated alternatives were one size, `sm/md/lg`, additional micro/extra-large
sizes, default/compact density, global density on every component, and CSS-order
state resolution. Criteria were D1 scale compatibility, hit targets, dense
analytics use, finite testing, state accessibility, and API stability.

### Recommendation and approved choice

Interactive control sizes are exactly:

| Size | Visible D1 control height | Minimum hit area | Use                                           |
| ---- | ------------------------: | ---------------: | --------------------------------------------- |
| `sm` |                      32px |       44 by 44px | dense visual control with expanded hit target |
| `md` |                      40px |       44 by 44px | default                                       |
| `lg` |                      48px |       48 by 48px | emphasized/touch-forward control              |

Components without a control-height concept expose no size prop or a finite
component-specific subset. Arbitrary pixels and additional size names are
prohibited. Icon mapping uses D-095 and D1.

Density values are exactly `default` and `compact`. Density is approved only for
Table primitives and intrinsic Stack/Inline spacing. It does not shrink an
interactive hit area, change semantic content, hide exact financial text, or
duplicate the size prop. Other components expose no density until a new D-097
decision proves need.

Presentation precedence remains:

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

Precedence selects visual emphasis only. Every simultaneous native/ARIA state,
label, description, and error remains present unless the combination is
explicitly invalid.

| Combination                | Approved behavior                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| loading + disabled         | one disabled, non-interactive, `aria-busy` control; busy label remains available; no duplicate action                                        |
| invalid + focused          | focus boundary is visually primary; `aria-invalid` and error association remain                                                              |
| selected + disabled        | selection and redundant meaning remain perceivable; interaction is disabled                                                                  |
| read-only + invalid        | value remains focusable/selectable where native; error remains associated                                                                    |
| pressed + disabled         | `aria-pressed` and pressed meaning remain; activation is disabled                                                                            |
| loading + Link             | invalid; return `UI_INVALID_STATE_COMBINATION`; navigation never claims mutation progress                                                    |
| checked + indeterminate    | Checkbox exposes `aria-checked="mixed"`; checked is not simultaneously presented                                                             |
| hidden/unmounted + focused | invalid; restore focus using the owning contract before hiding/removing                                                                      |
| loading + invalid          | loading presentation leads; invalid semantics/error remain; submission/activation is unavailable                                             |
| busy + pressed             | busy disables new activation; existing pressed semantic state remains                                                                        |
| disabled + expanded        | non-overlay disclosure retains expanded state/content but cannot toggle; an overlay trigger closes programmatically before becoming disabled |

Component-family matrices may mark an otherwise irrelevant combination
unsupported, but cannot reverse these rules or D1 meaning. Controlled and
uncontrolled state cannot switch after initialization. CSS selector order is
never the state machine.

### Rejected alternatives

- Additional size/density values without measured need: expand variants and
  evidence without semantic benefit.
- Compact hit targets: violate the accepted D1 interaction minimum.
- Erasing simultaneous semantic state because a higher visual state wins:
  misrepresents controls to assistive technology.

### Implementation, security, accessibility, and evidence implications

Tests cover all applicable pairs, development diagnostics, pointer and keyboard
suppression, focus, 44px targets, zoom, and D-098 matrices. Diagnostics are
finite and contain no labels/content.

- **Authorities:** Design + Accessibility + Frontend Architecture; Product
  Owner approves dense/default usage.
- **Implementation gate:** formal decision acceptance and per-component finite
  state matrices.
- **Production gate:** browser keyboard/touch/zoom evidence.
- **Rollback/revisit trigger:** measured dense-table needs or accessibility
  evidence shows a size/state cannot meet the contract.

## 12. D-098 — Localization, RTL, forced-colour, and visual evidence matrix

### Alternatives and criteria

Evaluated alternatives were 30% and 50% pseudo-expansion, English/LTR-only,
representative versus exhaustive RTL, static versus emulated/native forced
colours, pixel identity, and full Cartesian screenshots. Criteria were overflow
discovery, semantic correctness, accessibility, reproducibility, and bounded
review cost.

### Recommendation and approved choice

Use deterministic **50% pseudo-localization expansion**, with accented Unicode
and visible delimiters while preserving placeholders, markup boundaries, and
identifier/financial strings. Every text-bearing component has long-label and
long-description evidence; FieldMessage, Badge/StatusBadge, Menu, Tabs, Table,
Dialog, and EmptyState receive representative maximum-bound cases.

D2 supports inherited `dir="ltr"` and `dir="rtl"` from D2.1 onward. Required RTL
evidence is representative, not a claim that product content is localized:

- D2.1: actions, Link, Badge/StatusBadge, Stack/Inline, Card;
- D2.2: labels/messages, text fields, RadioGroup, Switch, Native Select;
- D2.3: every composite/overlay;
- D2.4: feedback, Table/SortableHeader, Pagination.

Only icons marked directional under D-095 mirror. Horizontal Tabs/Menu keyboard
direction follows the approved ARIA pattern and document direction; vertical
movement does not reverse. Progress follows document direction only when it
represents reading-order progress. Financial signs, tickers, instrument IDs,
codes, trend/status icons, and physical direction are never mirrored or reordered
by inference. Caller/domain metadata supplies explicit isolation; components
preserve `<bdi>`/direction boundaries and exact strings.

Forced-colour evidence has three layers:

1. D1 closed `systemColor` static-contract tests for every checkpoint;
2. automated Chromium forced-colours emulation for every exported component and
   applicable state;
3. native Windows High Contrast with NVDA for each semantic family before that
   checkpoint freezes.

The visual matrix is pairwise and applicability-based, not Cartesian:

- DARK and LIGHT default for every component;
- hover, active, focus-visible, disabled, invalid, loading, selected/checked/
  expanded only where applicable;
- forced colours, reduced motion, 50% pseudo-localization, representative RTL,
  200% zoom/reflow, and preferred-font-unavailable for each checkpoint's
  representative semantic families;
- viewports `390x844` and `1440x900` at device scale factor 1, plus component-
  local overflow evidence.

Each component has at most 48 registered evidence cases and 24 committed primary
screenshots. Each checkpoint has at most 240 committed primary screenshots.
Machine semantic/keyboard cases may exceed screenshot count but remain within
D-099's DOM/diagnostic limits. No screenshot is screen-reader proof. Pixel
identity is not required; semantic, focus, overflow, token, and layout-boundary
regressions are reviewed.

### Rejected alternatives

- 30% only: insufficiently stresses short control labels in the dense shell.
- English/LTR-only or universal mirroring: misses real overflow and corrupts
  identifiers/financial meaning.
- Static forced-colour mapping alone: does not prove browser behavior.
- Full Cartesian screenshots or pixel identity: unbounded and brittle.

### Implementation, security, accessibility, and evidence implications

Evidence generators escape pseudo/RTL strings, preserve placeholders, and use
synthetic text. Manifests record case IDs, not unbounded labels. Native/manual
evidence follows D-092.

- **Authorities:** Product Owner + Accessibility + QA + Design; Security concurs
  on synthetic/bounded evidence.
- **Implementation gate:** formal decision acceptance and D-091 harness support
  for the exact matrix.
- **Production gate:** applicable matrix passes before each checkpoint and
  aggregate D2 freeze.
- **Rollback/revisit trigger:** localization evidence exceeds bounds, a target
  locale exposes a semantic error, or native forced-colour/browser behavior
  changes.

## 13. D-099 — Security, resource, DOM, and diagnostic bounds

### Alternatives and criteria

Evaluated alternatives were unlimited children/content, universal runtime DOM
counting, structured public-input bounds, harness-only limits, and recommended
consumer limits. Criteria were enforceability, denial-of-service resistance,
accessible failure, React ownership, deterministic diagnostics, evidence cost,
and avoidance of false security claims.

### Recommendation and approved choice

Bounds are classified as `HARD_API`, `HARNESS`, or `RECOMMENDED`. A component
must not claim to enforce descendant DOM it does not own.

| Resource                                               |                              Approved maximum | Class and behavior                                                        |
| ------------------------------------------------------ | --------------------------------------------: | ------------------------------------------------------------------------- |
| ordinary label                                         | 256 Unicode code points and 1,024 UTF-8 bytes | HARD_API; reject before render                                            |
| description/field/empty-state text                     |             2,048 code points and 8,192 bytes | HARD_API; reject before render                                            |
| Tooltip text                                           |               512 code points and 2,048 bytes | HARD_API; reject before render; text only                                 |
| Native Select options                                  |                                           500 | HARD_API; reject structured list above limit                              |
| RadioGroup options                                     |                                            24 | HARD_API                                                                  |
| Menu items                                             |                                     100 total | HARD_API                                                                  |
| submenu depth                                          |                                             2 | HARD_API                                                                  |
| Tabs                                                   |                                            20 | HARD_API                                                                  |
| Stack/Inline/Card/Surface direct child records         |                                           100 | RECOMMENDED plus development diagnostic; no descendant-DOM security claim |
| non-virtual Table rows                                 |                                           500 | RECOMMENDED/HARNESS; larger measured need routes to D5 review             |
| Table columns                                          |                                            50 | RECOMMENDED/HARNESS                                                       |
| structured Table cells admitted per harness case       |                                        25,000 | HARNESS pre-render validation bound                                       |
| DOM nodes per evidence case                            |                                         5,000 | HARNESS; abort capture above limit                                        |
| total registered evidence cases per component          |                                            48 | HARD harness registry bound from D-098                                    |
| committed primary screenshots per component/checkpoint |                                      24 / 240 | HARD evidence bound from D-098                                            |
| total open overlays                                    |                                             8 | HARD_API                                                                  |
| overlay nesting depth                                  |                                             3 | HARD_API                                                                  |
| simultaneous modal Dialogs                             |                                             1 | HARD_API                                                                  |
| portal roots per document                              |                                             1 | HARD invariant                                                            |
| listeners per overlay / evidence case                  |                                       12 / 96 | HARD internal/harness invariant                                           |
| timers per overlay / evidence case                     |                                        4 / 32 | HARD internal/harness invariant                                           |
| simultaneous animated elements per evidence case       |                                            32 | HARNESS                                                                   |
| animation duration                                     |                                         280ms | HARD; D1 maximum; reduced motion resolves nonessential motion to 0ms      |
| diagnostics per run                                    |                                           200 | HARD; then one finite truncation diagnostic                               |

String limits apply whichever code-point or byte maximum is reached first.
Control characters, raw HTML, invalid Unicode, and unsafe URLs fail separately
under schema/content policy; reaching the length limit does not make them valid.

The row, column, cell, and rendered-DOM limits are independent. The 25,000-cell
limit bounds structured input before rendering; it does not require or permit a
25,000-cell browser capture that exceeds the 5,000-node harness cap. Boundary
evidence therefore tests 500 rows with a small bounded column count, 50 columns
with a small bounded row count, and the 25,000-cell input limit through
non-rendering validation. Every rendered accessibility case remains below
5,000 DOM nodes. No result may describe a simultaneous 500-by-50 rendered table
as accepted evidence.

Component-owned listener and timer handles are cancelled before unmount returns.
Document inertness, scroll-lock, and portal content are restored synchronously.
Focus restoration completes by the next animation frame and no later than
100ms in the deterministic harness. Missing/removed targets follow D-093 rather
than waiting indefinitely.

Hard structured-input violation uses finite code
`UI_RESOURCE_LIMIT_EXCEEDED`. In development/evidence it rejects deterministically
before creating the repeated DOM. Production fails closed: it omits the unsafe
interactive structure and uses the component's required bounded, localized
unavailable fallback contract. If the required fallback is absent, it renders
no interactive element and emits the finite diagnostic. It never truncates
options into a different choice set or hides financial precision.

Other finite codes include `UI_INVALID_CONTENT`, `UI_UNSAFE_URL`,
`UI_DUPLICATE_ID`, and `UI_INVALID_STATE_COMBINATION`. Diagnostics contain
component family and code only—never user content, URL, label, instrument,
DOM snapshot, or free-form reason. Repeated identical diagnostics are deduped
after five occurrences per family/code before the 200-record cap.

### Rejected alternatives

- Unlimited structured inputs or recursive overlays: unbounded DOM and
  accessibility denial.
- Universal descendant DOM counting: React components cannot reliably own or
  secure arbitrary consumer descendants.
- Silent truncation: changes options, meaning, and exact financial content.
- Raw content in diagnostics: creates privacy, injection, and cardinality risk.

### Implementation, security, accessibility, and evidence implications

Boundary and one-over tests are required for every hard/harness limit. Fault
tests cover partial mount, unmount, missing focus targets, diagnostic overflow,
and repeated overlays. Recommended bounds trigger measured D5/consumer review,
not false runtime enforcement.

- **Authorities:** Security + Frontend Architecture + Accessibility + QA;
  Product Owner approves consumer/evidence limits.
- **Implementation gate:** formal decision acceptance and exact boundary/fault
  fixtures for the affected checkpoint.
- **Production gate:** memory, cleanup, accessible fallback, and no-user-content
  diagnostic evidence.
- **Rollback/revisit trigger:** accepted production-like evidence proves a bound
  excludes a legitimate use, or security/performance evidence requires a lower
  limit. Changes follow D-101.

## 14. D-100 — Table virtualization ownership

### Alternatives and criteria

Evaluated alternatives were virtualization inside D2, D5 ownership, a new
performance phase, and enabling virtualization at an arbitrary row count.
Criteria were semantic table integrity, focus and screen-reader behavior,
measured performance, domain/live-update needs, and phase isolation.

### Recommendation and approved choice

D2.4 owns semantic, non-virtual Table primitives only. D5 owns any future
virtualized financial grid or table-performance behavior. D2 never switches to
virtualization automatically and exposes no virtualization prop, adapter, or
placeholder implementation.

A future D5 planning task may begin virtualization research only after a
reproducible production-like benchmark shows the accepted non-virtual D2 table
fails a separately approved performance budget for initial render, update/frame
cost, input latency, memory, or update frequency. D-100 intentionally does not
invent those budgets without workload evidence.

Any future solution must preserve table/header relationships, row identity,
exact-value access, keyboard navigation, screen-reader usability, focus across
window changes, selection/sort presentation, data-quality meaning, zoom,
forced-colour behavior, and deterministic fallback when virtualization is
disabled.

### Rejected alternatives

- Hidden D2 virtualization or a generic grid: leaks D5 performance and financial
  behavior.
- A fixed row-count trigger without benchmark evidence: mistakes volume for
  actual performance/accessibility cost.
- Treating the master specification as implementation authority: bypasses phase
  acceptance.

### Implementation, security, accessibility, and evidence implications

D2.4 tests prove no virtualization path/export exists. Separate row-boundary
and column-boundary rendered cases remain semantic, accessible, and below the
5,000-node harness cap; the simultaneous 500-by-50 product is exercised only by
pre-render validation as required by D-099. Larger use produces guidance/
diagnostic, not automatic behavior.

- **Authorities:** Product Owner + Frontend Architecture + Accessibility + D5
  owner.
- **Implementation gate:** D2.4 explicitly excludes virtualization; D-100 does
  not authorize D2.4 or D5.
- **Production gate:** any future D5 implementation needs separately approved
  performance and accessibility criteria.
- **Rollback/revisit trigger:** measured production-like evidence and a separately
  approved D5 architecture task.

## 15. D-101 — Component API versioning, deprecation, and rollback

### Alternatives and criteria

Evaluated alternatives were no version contract, package SemVer, per-component
runtime versions, indefinite compatibility aliases, immediate breaking changes,
and D1-aligned deprecation windows. Criteria were consumer predictability,
checkpoint freeze, TypeScript union behavior, accessibility/DOM compatibility,
rollback, and governance cost.

### Recommendation and approved choice

The `@arbitrage/ui` package version is the sole runtime/package version
authority and follows SemVer. Component documentation maintains `since`,
`deprecatedSince`, replacement, and removal-target metadata; components do not
expose runtime version props.

The provisional package may use `0.x` only inside an authorized, unfrozen
implementation task. The first formally accepted D2.1 public export is
`1.0.0`. Every later checkpoint/addition increments the package version under
this matrix:

| Change                                                                                                    | Required classification                                                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| compatible defect fix with unchanged documented semantics/API/DOM                                         | PATCH                                                                                                                                      |
| compatible CSS implementation or D1-approved token-value change with unchanged meaning/pairings           | PATCH                                                                                                                                      |
| new component or optional prop with unchanged defaults                                                    | MINOR                                                                                                                                      |
| caller-selected input-only enum value with unchanged default/output domain                                | MINOR                                                                                                                                      |
| new emitted enum/state/callback value observable by consumers                                             | MAJOR                                                                                                                                      |
| deprecating a prop/export and introducing a compatible alias                                              | MINOR                                                                                                                                      |
| removing a prop/export/component                                                                          | MAJOR after window and migration                                                                                                           |
| prop rename without compatibility alias                                                                   | MAJOR                                                                                                                                      |
| public type narrowing or new required prop                                                                | MAJOR                                                                                                                                      |
| semantic element/role, normative DOM relationship, keyboard, focus, announcement, or state-meaning change | MAJOR                                                                                                                                      |
| accessibility defect correction to the already documented contract                                        | PATCH when it restores, rather than changes, the contract; otherwise MAJOR                                                                 |
| theme-value-only change                                                                                   | follows D1 classification; PATCH only when D2 meaning/contrast/legal pairings remain compatible                                            |
| package export path change or server/client boundary change observable to consumers                       | MAJOR                                                                                                                                      |
| new, renamed, removed, or newly emitted documented `data-*` output or value                               | MAJOR because consumer selectors and exhaustive state handling observe it                                                                  |
| change to a public prop default or implicit state/element/behavior default                                | MAJOR                                                                                                                                      |
| peer-range widening that preserves every previously supported version                                     | MINOR after compatibility evidence                                                                                                         |
| peer-range narrowing or increased minimum                                                                 | MAJOR                                                                                                                                      |
| private `hp-ui-` selector rename with unchanged public CSS import, rendering, semantics, and evidence     | PATCH; private selectors are not consumer API                                                                                              |
| non-normative internal wrapper change                                                                     | PATCH only when semantics, ARIA relations, focus/event order, layout contract, hydration, and snapshots remain compatible; otherwise MAJOR |

Adding an input enum value is MINOR only when the component never emits it and
existing behavior/defaults are unchanged. Otherwise exhaustive consumer logic
makes it MAJOR.

Adding an ARIA relationship or changing focus order is covered by the MAJOR
semantic/accessibility row even when intended as an improvement, unless it is a
PATCH that restores an already documented requirement. Stylesheet selector
names are private only when D-090 exposes no hook and package evidence proves
that no public output/behavior changed.

Deprecation requires a replacement where possible, migration documentation,
consumer inventory, compatibility tests, and development-only finite warning
code emitted once per deprecated API per session. There are no production
console warnings and no user content in warnings. If old and replacement props
are supplied together, the component returns a deterministic conflict
diagnostic rather than guessing precedence.

A compatibility alias remains for at least **two subsequent minor releases and
90 days, whichever is later**. It is reviewed at 180 days; 180 days never
shortens the minimum. Extension requires Product Owner + Frontend Architecture
approval. Removal requires a major release, all governed consumers migrated,
formal compatibility acceptance, and the previous accepted set still
reproducible.

Rollback restores the complete prior accepted package source, stylesheet,
export map, types, tests, evidence, and governed consumer migration atomically.
The immediately previous accepted release remains buildable for the longer of
the compatibility window or 180 days. Rollback never changes D1.

Experimental APIs, if separately approved, exist only under explicit
`@arbitrage/ui/experimental/*` exports, are absent from the root barrel, and may
change before promotion. No experimental export is approved by this decision or
counts toward a frozen checkpoint.

### Rejected alternatives

- Per-component runtime versions: create conflicting authorities.
- Silent behavior/DOM/accessibility changes as patches: violate frozen semantic
  contracts.
- Indefinite aliases: preserve debt and bypass removal decisions.
- Immediate removal: breaks governed consumers and rollback.

### Implementation, security, accessibility, and evidence implications

Compatibility fixtures cover every classification, public export/type surface,
enum input/output distinction, deprecation conflict, warning bound, alias
window, consumer inventory, and atomic rollback. Security/accessibility
behavior is part of the public API, not an implementation detail.

- **Authorities:** Product Owner + Frontend Architecture + QA; Accessibility and
  Security approve semantic/security change classification.
- **Implementation gate:** formal decision acceptance and version/compatibility
  test plan before D2.1.
- **Production gate:** governed consumers and previous accepted release remain
  reproducible through the window.
- **Rollback/revisit trigger:** multi-framework/package needs, release cadence
  makes the window impractical, or evidence shows a classification ambiguity.

## 16. Cross-decision consistency verdict

The decisions are internally consistent:

- D-089's controlled exports are versioned by D-101; no deep import can evade
  compatibility review.
- D-090 exposes no ordinary style escape and therefore preserves D1 D-084 raw-
  value governance. Its URL policy is syntax/presentation safety, while the
  Security/domain layer retains destination authorization.
- D-091's repository-native harness can execute D-092's matrix without a
  shipping route. Missing external environments block acceptance rather than
  silently adding a dependency.
- D-093 approves the overlay behavior/portal contract; D-094 approves no
  package. Failure of the feasibility task stops D2.3 for package-specific
  review.
- D-093 deterministic IDs are SSR-safe and bounded by D-099; random/global IDs
  are rejected.
- D-095 icon metadata supplies the non-colour/RTL/forced-colour behavior required
  by D-098.
- D-096 narrows D2.1 without removing any D2-required component and keeps D3,
  D5, and D6 outside.
- D-097 presentation precedence preserves D1 financial, quality, capability,
  and status semantics.
- D-098's 48-case/24-screenshot component bounds and 240-screenshot checkpoint
  bound are included in D-099.
- D-099 distinguishes enforceable structured inputs from React/consumer DOM it
  does not own.
- D-100 keeps virtualization outside D2.4 and grants no D5 authority.
- D-101 freezes each checkpoint's public semantic/accessibility contract and
  provides compatible addition, deprecation, migration, and atomic rollback.

No approved decision requires a frozen D1 change, application route or DOM
change, dependency, manifest/lockfile modification in this decision task,
consumer migration, or later-phase implementation.

## 17. Decision gates and next authority

All D-089 through D-101 product/design/accessibility/frontend/security questions
are answered. No product-owner decision remains blocking for a formal decision-
acceptance review.

D2.1 remains blocked until:

1. this decision package receives formal independent documentation acceptance;
2. the Product Owner separately authorizes D2.1 implementation with an exact
   file/dependency/migration allowlist;
3. the implementation task proves the authoritative D2.1 gates.

D2.2–D2.5 remain unauthorized. D2.3 additionally requires D-094's separately
approved feasibility/package gate if a dependency is proposed.

## 18. Exact recommended formal decision-acceptance task

```text
Read AGENTS.md and all frozen architecture, design, theme, security, roadmap,
decision, risk, acceptance, D1, frozen D2 planning/planning-acceptance,
Product/Commerce/Admin, accepted Phase 2B, and brand-reference documents
completely. Perform a formal independent documentation and architecture
acceptance review of D-089 through D-101 in docs/D2_COMPONENT_DECISIONS.md only.
Treat the decisions as Product/Design/Accessibility/Frontend-Architecture/
Security-approved normative inputs, but reproduce their internal consistency,
implementability, accessibility, determinism, security, resource bounds, and
compatibility with frozen D1 and the accepted D2 plan.

Do not implement D2, create components, add dependencies, change package.json or
package-lock.json, alter application source/routes/layout/DOM/globals.css,
modify D1/frozen adapters/accepted Phase 2B/Product-Commerce-Admin/brand files,
begin another phase, or create a commit. Do not approve a package-specific D2.3
dependency.

Independently verify: @arbitrage/ui package/export/CSS/server-client/ref closure;
extension, DOM-forwarding and URL allow/deny matrices; repository-native
non-shipping evidence and CI/manual boundary; exact browser/AT/forced-colour/
touch matrix; overlay portal/SSR/ID/focus/inertness/scroll/nesting/cleanup
contract; conditional dependency gate; closed icon/SVG/RTL policy; exact D2.1–
D2.5 component inventory; size/density/state-combination matrix; 50% pseudo-
localization and bounded visual matrix; every D-099 hard/harness/recommended
limit and failure code; D5 virtualization ownership without authorization; and
D-101 SemVer/deprecation/rollback classification. Test every cross-decision
relationship listed in the decision document and confirm no choice requires a
frozen D1 or application change.

Classify findings as BLOCKER, HIGH, MEDIUM, LOW, or ACCEPTED_LIMITATION. Fix only
documentation BLOCKER/HIGH defects with the smallest change. Create
docs/D2_COMPONENT_DECISIONS_ACCEPTANCE.md containing final status, per-decision
verdicts, corrected decisions, rejected alternatives, cross-decision verdict,
remaining blockers, exact pinned Node 24 documentation verification and frozen-
boundary evidence, freeze recommendation, whether D2.1 is eligible for a
separate implementation-approval task, and the exact next prompt. Do not begin
D2.1.
```
