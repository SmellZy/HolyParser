# HolyParser Design System

Status: architecture amendment; documentation only. No UI implementation is
authorized by this document.

## 1. Brand source and product character

The approved visual evidence is preserved, unmodified, under
`docs/brand/references/`:

- `holyparser-logo-system.png` — bracket/H/P/node-flow mark and monochrome use;
- `holyparser-design-system.png` — palette, typography, icon and component
  direction;
- `holyparser-dark.png` — dark analytical workspace direction.

HolyParser is precise, technical, trustworthy, modern, premium, data-centric and
professional: a calm analytics product suitable for financial data. The brand
uses a deep-navy foundation, primary blue, cyan and violet accents, restrained
depth, clean line icons and high-density financial data. It must not look like a
casino, meme-token product or flashing trading terminal. Glow is reserved for
focus, selected data and rare informational emphasis; it is never ambient
decoration across a whole page.

The logo remains the approved bracket/H/P/node-flow construction. Product
surfaces may use the full-gradient or monochrome asset according to contrast;
they must not redraw, stretch, recolor individual paths or use the symbol as an
unlabelled financial status.

## 2. Foundations

### 2.1 Reference palette

The reference palette is:

| Role         | Reference |
| ------------ | --------- |
| Deep navy    | `#0A0F2C` |
| Primary blue | `#126BFF` |
| Cyan         | `#00D4FF` |
| Violet       | `#6B5CFF` |
| Light canvas | `#F6F8FC` |
| Neutral ink  | `#111827` |
| Neutral 700  | `#374151` |
| Neutral 500  | `#6B7280` |
| Neutral 400  | `#9CA3AF` |
| Neutral 200  | `#E5E7EB` |
| Neutral 100  | `#F1F5F9` |

Components consume semantic tokens, never raw palette names. Brand blue is not
automatically an informational state, and cyan/violet never imply profit.

### 2.2 Typography and financial numerals

- Display and compact product headings: **Space Grotesk**, then an approved
  metric-compatible sans-serif fallback.
- Body, controls and tables: **Inter**, then an approved metric-compatible
  system sans-serif fallback.
- Code, identifiers and payload examples: an approved monospace family.
- Financial columns use tabular numerals, stable glyph widths, right alignment
  and explicit decimal alignment. Loading states reserve the final column width
  to prevent value jitter.
- Units, signs and semantic labels remain visible. Colour alone never expresses
  long/short, gain/loss, quality or payment state.

Font loading must be self-hosted or governed by an approved privacy/security
policy. A fallback must not cause controls to overflow or decimal columns to
shift materially.

### 2.3 Spacing, radii and elevation

| Family    | Tokens / rule                                                                     |
| --------- | --------------------------------------------------------------------------------- |
| Spacing   | `0`, `2`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64` px             |
| Radius    | `none=0`, `sm=4`, `md=8`, `lg=12`, `xl=16`, `pill=9999` px                        |
| Border    | one-pixel semantic border by default; two pixels only for focus/critical emphasis |
| Elevation | `flat`, `raised`, `overlay`; dark and light shadows are resolved separately       |
| Density   | `comfortable`, `compact`, `data`; nominal desktop row heights 48/40/32 px         |

Touch targets remain at least 44 by 44 CSS pixels even when the visible table
row is denser. Elevation communicates containment, not financial importance.

## 3. Required semantic tokens

Every token below must resolve in both themes. `THEME_ARCHITECTURE.md` owns the
initial values and resolution rules.

| Family             | Required tokens                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Background/surface | `background.base`, `background.surface`, `background.elevated`, `background.subtle`, `surface.interactive`, `surface.selected`      |
| Border             | `border.default`, `border.emphasis`                                                                                                 |
| Text               | `text.primary`, `text.secondary`, `text.muted`, `text.disabled`, `text.inverse`, `text.link`                                        |
| Action/focus       | `action.primary`, `action.primary.hover`, `action.primary.active`, `action.secondary`, `focus.ring`                                 |
| Financial outcome  | `financial.positive`, `financial.negative`, `financial.neutral`                                                                     |
| System status      | `status.healthy`, `status.active`, `status.warning`, `status.critical`, `status.informational`, `status.unknown`, `status.disabled` |
| Data quality       | `quality.stale`, `quality.gapped`, `quality.reconnecting`, `quality.invalid`, `quality.locked`, `quality.crossed`                   |
| Capability         | `capability.unsupported`, `capability.unverified`, `capability.research-required`                                                   |

Each status also has icon, short label and accessible description tokens.
`positive` and `negative` are not synonyms for buy and sell. `unknown`, `stale`,
`gapped`, `research-required` and `disabled` remain distinct meanings even if a
theme reuses a primitive value; none may be rendered as zero, neutral success or
an empty string.

## 4. Components and interaction states

All interactive components define `default`, `hover`, `active`, `focus-visible`,
`selected`, `disabled`, `loading`, `error` and, where relevant, `read-only`
states. Keyboard focus is always visible and is not removed on dark surfaces.
Disabled controls remain legible but cannot be the only explanation for denied
access; a reason or entitlement requirement is available nearby.

Required foundational patterns are buttons, links, inputs, selects, segmented
controls, tabs, tables, data grids, cards, dialogs, drawers, tooltips, banners,
toasts, badges, skeletons, empty states, error states and status chips. Loading
and error states never reuse a valid financial value. Destructive admin actions
use explicit verbs and a confirmation summary.

### 4.1 Accessibility

- Normal text targets WCAG 2.2 AA contrast of at least 4.5:1; large text and
  essential UI graphics target at least 3:1.
- Focus indicators target at least 3:1 against adjacent colours.
- Tables have programmatic headers, logical reading order and keyboard access.
- Status is expressed with text/icon/shape in addition to colour.
- Charts provide a table or textual summary and do not use red/green as the only
  distinction.
- Zoom to 200%, text spacing and reflow must not hide primary actions.
- Motion respects `prefers-reduced-motion`; no flashing or market-tick animation
  is required to understand state.

### 4.2 Motion

Use motion only for orientation and feedback. Standard transitions are 120–200
ms; large panel transitions may use up to 280 ms. Price changes may receive a
brief non-looping highlight, but not movement, flashing or celebratory effects.
Reduced-motion mode removes transforms and nonessential interpolation while
preserving state-change annunciation.

### 4.3 Icons

Use a consistent, optically balanced line-icon set. Icons have accessible names
when acting alone and are decorative when paired with equivalent text. Provider,
venue and asset logos are never used as canonical identity or entitlement
evidence.

## 5. Data visualization and density

Charts consume semantic series tokens, not status colours by default. The chart
contract includes `chart.canvas`, `chart.grid`, `chart.axis`, `chart.label`,
`chart.crosshair`, `chart.selection`, `chart.series.primary`,
`chart.series.comparison`, `chart.gap`, `chart.uncertainty` and `chart.invalid`.
Missing ranges are explicit gaps; interpolation must not imply observed data.

Loading uses geometry-preserving skeletons without fake values. Empty states
identify whether there is no configured input, no result or no access. `STALE`,
`DEGRADED`, `GAPPED` and error remain separately labelled; degraded data never
inherits a positive/negative market colour.

Order books and spread tables preserve exact text representation, visible units,
bid/ask labels and source quality. Locked, crossed, stale and gapped inputs have
named non-actionable treatments. Dense mode cannot hide provenance, freshness,
settlement asset or the difference between USDT and USDC.

## 6. Responsive layout

Breakpoints are layout decisions, not device identities:

| Range         | Behaviour                                                                |
| ------------- | ------------------------------------------------------------------------ |
| `<640px`      | single-column compact shell; drawers replace persistent secondary panels |
| `640–767px`   | mobile landscape / small tablet; two-column content only when readable   |
| `768–1023px`  | tablet; collapsible navigation and constrained data panes                |
| `1024–1439px` | desktop; persistent primary navigation and multi-pane analytics          |
| `>=1440px`    | wide data workspace; maximum reading widths still apply to prose         |

Horizontal scrolling is allowed for irreducibly dense tables with pinned
identity columns and an accessible alternative; the whole page must not scroll
horizontally. Public, authenticated and admin shells share tokens but may use
different density defaults.

## 7. Governance and acceptance

Token and component changes are versioned and reviewed in both themes at all
supported breakpoints. Visual regression, keyboard-only, contrast, reduced
motion, data-density and long-localized-copy checks are required before a design
track freezes. Financial meaning, entitlement, authorization and quality state
remain backend/domain facts; the design system only presents them.

## 8. D1 token-foundation boundary

`D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md` defines this document's token foundation,
and `D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE.md` formally freezes its accepted
implementation. The reference palette and scales are now represented by that
canonical source; they remain no permission to create competing component
values or reinterpret status/chart semantics.

D1 is limited to a canonical data-only token source, validation, deterministic
artifacts, semantic DARK/LIGHT resolution, typography/scales, status and chart
presentation contracts, raw-value governance and a token-only Phase 1 migration
bridge. Component behavior, page layout, chart rendering, full theme selection
and font installation belong to later approved tracks. Semantic tokens are the
only supported component-facing interface; primitives cannot become component
API, and brand emphasis cannot substitute for a positive financial outcome.

Exact values, scales, bounds, chart encodings, governance and evidence are now
approved in [`D1_DESIGN_DECISIONS.md`](D1_DESIGN_DECISIONS.md); D-079 through
D-088 are closed, ADR-0013 is `Accepted`, and D1 is frozen.

## 9. D2 component-foundation boundary

[`D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN.md`](D2_FOUNDATIONAL_COMPONENT_LIBRARY_PLAN.md)
classifies the initial reusable layer and
[`D2_FOUNDATIONAL_COMPONENT_LIBRARY_ACCEPTANCE_PLAN.md`](D2_FOUNDATIONAL_COMPONENT_LIBRARY_ACCEPTANCE_PLAN.md)
defines its independent review. D2 consumes D1 semantic tokens and provides
bounded presentation primitives only.

D2 may define actions, links, fields, native selections, feedback, surfaces,
simple intrinsic composition, overlays, tabs, and semantic table presentation.
It does not own shells/sidebar/navigation, page composition, financial charts,
virtualization, business/domain formatting, authorization, admin workflows, or
product routes. A generic `Dropdown` is rejected in favor of the correct Menu,
Select, or Popover semantic contract.

Every component contract covers semantic HTML, accessible naming, keyboard and
focus, finite state precedence, DARK/LIGHT, forced colours, reduced motion,
localization/RTL, overflow, hostile content, resource bounds, tests, API
compatibility, and rollback. No raw colour/spacing/radius/shadow/layer API or
unapproved class/style escape may compete with D1. D-089 through D-101 remain
blocking decisions; this planning package authorizes no component.
