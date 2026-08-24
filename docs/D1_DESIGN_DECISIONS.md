# D1 Design Decisions

## 1. Decision record

- Scope: D-079 through D-088 for D1 — Brand and Semantic Design Tokens.
- Status: `APPROVED`.
- Approval date: 2026-08-16.
- Approval authority: Product Owner, acting on the frozen Product Design,
  Commerce and Administration Architecture Amendment and the accepted D1
  planning package.
- Accountable reviewers: Design, Accessibility, Frontend Architecture,
  Security and QA in the combinations named for each decision below.
- Effective scope: D1 only. This record does not authorize D1 implementation,
  D2, D4, D5, page or component redesign, font installation, application
  routes, commerce, analytics or any runtime service.

The values and policies below are normative. A later implementation must not
replace them with a convenient default. A change to an approved choice requires
an explicit decision amendment, affected acceptance evidence and the version
change required by D-085.

## 2. D-079 — Canonical source and artifact policy

### Approved choice

The canonical source is a data-only, ordered JSON source set at exactly these
paths:

```text
packages/design-tokens/
  schema/design-tokens.schema.json
  src/token-set.meta.json
  src/tokens.source.json
  src/contrast-pairs.source.json
  src/status-presentations.source.json
  src/chart-encodings.source.json
  generated/tokens.css
  generated/tokens.generated.ts
  generated/tokens.manifest.json
```

`src/token-set.meta.json` is the only source-set metadata authority. It records
the namespace, `schemaVersion`, `tokenSetVersion`, generator contract version,
artifact policy and canonical source paths. The initial accepted D1 source and
schema versions are both `1.0.0`. The JSON Schema `$id` identifies the schema
but does not create a second version authority.

`tokens.source.json` uses an ordered array of records. Canonical token IDs are
unique ASCII lowercase dot-separated IDs. Records and support records are
stored in ascending Unicode code-point order by their stable ID. Object fields
use the schema-defined order. Aliases are complete-value references in the
exact form `{canonical.token.id}`; interpolation, partial aliases and runtime
alias evaluation are prohibited.

Generated CSS, generated TypeScript metadata and the manifest are committed.
The manifest records lowercase 64-character hexadecimal SHA-256 digests over
the exact committed bytes of the schema, every canonical source file,
`generated/tokens.css` and `generated/tokens.generated.ts`, along with the
schema, token-set and generator-contract versions. Digest entries use
repository-relative POSIX paths in ascending Unicode code-point order. The
manifest never records a digest of itself: recursive self-digests are
prohibited. Its own bytes are protected by clean regeneration and repository
integrity. Generated artifacts are read-only outputs: direct edits or a
clean-regeneration diff fail CI.

Canonical serialization is UTF-8 without BOM, LF newlines, two-space
indentation, no trailing whitespace and exactly one final newline. Generation
contains no current time, machine path, locale-dependent ordering, environment
value or network result. CSS custom properties and TypeScript records follow
the same canonical token-ID order. JSON property order is schema-defined and
stable.

D1 implementation may use the pinned Node 24 standard library and already
present repository test tooling only. Adding a token dependency, external
generator or hosted token platform requires a separate supply-chain review and
ADR amendment. Exact resource limits are owned by D-083; D-079 makes them
mandatory schema and generator inputs rather than runtime configuration.

### Rationale and rejected alternatives

Ordered data-only JSON is reviewable, non-executable, language-neutral and can
represent duplicate-ID rejection before object-key collapse. Committed outputs
give local consumers deterministic artifacts without adding generation to
runtime startup.

Rejected:

- executable TypeScript as authority, because it expands the code-execution and
  supply-chain boundary;
- object-keyed JSON, because parsers can obscure duplicate keys and ordering;
- handwritten CSS, because it cannot prove theme parity or artifact drift;
- build-only generated artifacts, because clean checkout and rollback evidence
  would depend on an implicit generation step;
- remote/runtime token loading, because it violates CSP, determinism and the D1
  trust boundary.

### Governance

- Responsible authority roles: Product Owner, Design owner, Frontend
  Architecture and Security.
- Implementation gate: exact paths, schema, bounds, generator and digest tests
  must implement this record byte-for-byte.
- Production gate: any third-party tooling or artifact distribution change
  requires a new supply-chain review and ADR change.
- Acceptance evidence: single-source scan, schema rejection fixtures, clean
  regeneration, stable ordering, digest/drift checks, output bounds and atomic
  rollback.
- ADR-0013 interaction: this decision accepts its source/artifact direction.
- Revisit trigger: a repository language/toolchain change that cannot consume
  the committed artifacts, or measured source size beyond D-083 limits.

## 3. D-080 — Typography

### Approved choice

No font is installed, bundled or fetched in D1. The canonical preference stacks
are:

| Role    | Ordered family stack                                                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Heading | `"Space Grotesk", "Geist", "Geist Fallback", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| UI      | `Inter, "Geist", "Geist Fallback", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`                  |
| Data    | `"Geist Mono", "Geist Mono Fallback", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace`                     |

Space Grotesk and Inter remain preferred family names, not D1 dependencies.
The existing installed Geist variables remain an allowed Phase 1 compatibility
fallback through D1. D1 neither removes the `geist` package nor changes its
loading in `layout.tsx`; removal or actual Space Grotesk/Inter delivery belongs
to a separately approved D2/D4 typography task.

The approved type scale is finite:

| Token | Size / line height |
| ----- | ------------------ |
| `xs`  | `12px / 16px`      |
| `sm`  | `14px / 20px`      |
| `md`  | `16px / 24px`      |
| `lg`  | `18px / 28px`      |
| `xl`  | `20px / 28px`      |
| `2xl` | `24px / 32px`      |
| `3xl` | `30px / 36px`      |
| `4xl` | `36px / 44px`      |
| `5xl` | `48px / 56px`      |

D1 may generate responsive aliases only between adjacent approved steps. It may
not introduce a value below 12px or above 48px. Dense financial/table content
uses at least 12px with 16px line height; ordinary body and interactive text
uses at least 14px with 20px line height. Approved weights are 400, 500, 600 and 700. Heading tracking may use `-0.02em`; ordinary UI/data text uses `0`; compact
uppercase labels may use `0.08em` but are not financial values.

Changing financial values require `font-variant-numeric: tabular-nums` and a
data or UI stack. Decimal alignment uses structured integer/fraction columns or
tabular layout, never inserted spaces. Countdowns and changing values reserve a
documented width envelope. The fallback font is valid first-paint output: no
layout, amount, decimal point, sign or unit may depend on a preferred font
loading.

### Rationale and rejected alternatives

The stacks preserve the approved visual direction while keeping the current
shell stable and offline-safe. A system-only stack would discard the accepted
brand direction; installing or remotely loading fonts would exceed D1; removing
Geist would require manifest and application changes outside the migration need.

### Governance

- Responsible authority roles: Design, Accessibility, Frontend Architecture
  and Product Owner.
- Implementation gate: structured font-family grammar, exact scale, tabular
  numeral and fallback/width evidence.
- Production gate: any delivered font files, subsetting or remote service needs
  a separate D2/D4 approval and CSP/privacy/performance evidence.
- Acceptance evidence: schema tests, fallback screenshots, zoom/localization,
  metric-width envelope and no dependency/manifest diff.
- ADR-0013 interaction: typography remains data-only structured values; it does
  not alter the source decision.
- Revisit trigger: approved font delivery, a demonstrated fallback regression,
  or localization requiring a reviewed script-specific fallback.

## 4. D-081 — Semantic palette and contrast

### Approved values

Canonical semantic IDs use the `semantic.color.*` namespace. The shortened
names below are normative role names; `background.surface` and
`background.elevated` are compatibility-facing names for `surface.base` and
`surface.elevated`, not additional authorities.

| Role                           | LIGHT       | DARK        |
| ------------------------------ | ----------- | ----------- |
| `background.base`              | `#F6F8FC`   | `#060B18`   |
| `background.surface`           | `#FFFFFF`   | `#0A1324`   |
| `background.elevated`          | `#FFFFFF`   | `#101C31`   |
| `background.subtle`            | `#F1F5F9`   | `#0D1728`   |
| `surface.interactive`          | `#F8FAFC`   | `#121F35`   |
| `surface.selected`             | `#E8F1FF`   | `#18365F`   |
| `border.default`               | `#E5E7EB`   | `#24334A`   |
| `border.emphasis`              | `#7B8494`   | `#536A8A`   |
| `text.primary`                 | `#111827`   | `#F7FAFF`   |
| `text.secondary`               | `#374151`   | `#C3CEDD`   |
| `text.muted`                   | `#6B7280`   | `#8291A8`   |
| `text.disabled`                | `#9CA3AF`   | `#526178`   |
| `text.inverse`                 | `#FFFFFF`   | `#06101F`   |
| `text.link`                    | `#0A5CD6`   | `#66A3FF`   |
| `action.primary`               | `#126BFF`   | `#3384FF`   |
| `action.primary.hover`         | `#0B5DE6`   | `#5B9CFF`   |
| `action.primary.active`        | `#084CC2`   | `#7DB1FF`   |
| `action.secondary`             | `#5948D6`   | `#A99CFF`   |
| `focus.ring`                   | `#006EE6`   | `#00D4FF`   |
| `financial.positive`           | `#087A55`   | `#38D39F`   |
| `financial.negative`           | `#B4233C`   | `#FF718A`   |
| `financial.neutral`            | `#5F6B7A`   | `#A6B2C2`   |
| `status.healthy`               | `#0F766E`   | `#2DD4BF`   |
| `status.active`                | `#0A5CD6`   | `#66A3FF`   |
| `status.warning`               | `#985B00`   | `#F5B942`   |
| `status.critical`              | `#A61B1B`   | `#FF5B5B`   |
| `status.informational`         | `#0A5CD6`   | `#66A3FF`   |
| `status.unknown`               | `#5F6B7A`   | `#A6B2C2`   |
| `quality.stale`                | `#8A5A00`   | `#E9A928`   |
| `quality.gapped`               | `#A33252`   | `#FF7AA2`   |
| `quality.reconnecting`         | `#006B8F`   | `#4BD9F5`   |
| `quality.invalid`              | `#A61B1B`   | `#FF5B5B`   |
| `quality.locked`               | `#7C4D00`   | `#F2C14E`   |
| `quality.crossed`              | `#B4233C`   | `#FF718A`   |
| `capability.unsupported`       | `#5F6B7A`   | `#A6B2C2`   |
| `capability.unverified`        | `#5E6472`   | `#95A3B8`   |
| `capability.research-required` | `#5948D6`   | `#A99CFF`   |
| `status.disabled`              | `#7D8795`   | `#68768A`   |
| `overlay.scrim`                | `#0F172A73` | `#000000A6` |

Brand blue is not aliased to financial positive. Equal raw values in a theme do
not merge semantic IDs: `status.active` and `status.informational`, for example,
retain different labels, roles and compatibility identities.

### Legal pairing allowlist

Only these pair families are legal; every concrete pair is validated in both
themes and alpha values are composited over the named actual background:

1. `text.primary` and `text.secondary` on all six background/surface roles.
2. `text.muted` on `background.base`, `background.surface`,
   `background.elevated` and `surface.interactive`; muted text is not legal on
   `background.subtle` or `surface.selected`.
3. `text.inverse` on `action.primary`, `action.primary.hover`,
   `action.primary.active` and `action.secondary`.
4. `text.link` and every non-disabled financial/status/quality/capability
   foreground on `background.base`, `background.surface` or
   `background.elevated`. `text.disabled` and `status.disabled` are allowed only
   for inactive decoration or redundant state; they are exempt from the text
   contrast minimum only when they convey no required information. The required
   disabled explanation uses an approved ordinary text pairing.
5. `border.emphasis` and `focus.ring` against `background.surface` and
   `background.elevated`. Focus on a similarly coloured control uses a 2px
   neutral offset so the ring remains adjacent to an approved background.
6. `border.default` is a decorative divider only. An essential boundary must
   use `border.emphasis` or a redundant shape/label.
7. Chart pairings are limited to the D-082 canvas/chrome/series matrix.
8. `overlay.scrim` may composite only over the six approved background/surface
   roles. Required overlay content sits on opaque `background.elevated`; its
   text and boundaries are checked against that surface, not against the scrim
   alone. No text is placed directly on the alpha scrim.

The baseline is WCAG 2.2 AA: normal text at least 4.5:1, large text at least
3:1, essential non-text graphics/boundaries at least 3:1 and focus indicators
at least 3:1. A status must also provide a localizable label and an icon,
shape, marker or pattern. Colour alone is never acceptance evidence.

### Rationale and rejected alternatives

The palette preserves the frozen deep-navy/electric-blue/cyan/violet direction,
uses neutral slate for dense surfaces and keeps glow out of ordinary status
communication. Algorithmic light-theme inversion, brand-blue-as-positive,
red/green-only meaning, arbitrary token pairings and a contrast target below
WCAG 2.2 AA are rejected.

### Governance

- Responsible authority roles: Design, Accessibility and Product Owner.
- Implementation gate: exact theme values, parity, allowlisted pair expansion,
  alpha compositing and semantic-misuse tests.
- Production gate: D2/D4/D5 rendered component and chart accessibility evidence.
- Acceptance evidence: machine contrast report, legal/illegal pairing tests,
  focus evidence, status redundancy and both-theme screenshots.
- ADR-0013 interaction: values live in the accepted data-only source; this
  decision does not change artifact/version policy.
- Revisit trigger: a failed accepted pairing, a domain semantic addition or
  documented brand-direction amendment.

## 5. D-082 — Chart palette and encodings

### Approved choice

The maximum simultaneously distinguishable categorical series is eight. The
ordered palettes are:

| Series | LIGHT     | DARK      | Marker        | Dash       |
| -----: | --------- | --------- | ------------- | ---------- |
|      1 | `#126BFF` | `#3384FF` | circle        | solid      |
|      2 | `#5948D6` | `#A99CFF` | square        | `6 3`      |
|      3 | `#007A99` | `#4BD9F5` | triangle-up   | `2 2`      |
|      4 | `#9C2C75` | `#FF7AC8` | diamond       | `10 3 2 3` |
|      5 | `#985B00` | `#F5B942` | triangle-down | `1 3`      |
|      6 | `#087A55` | `#38D39F` | hexagon       | `8 2`      |
|      7 | `#B4233C` | `#FF718A` | cross         | `4 2 1 2`  |
|      8 | `#5F6B7A` | `#A6B2C2` | star          | `12 3`     |

No colour, marker or full tuple may silently recycle within eight concurrent
series. A ninth series returns the typed presentation constraint
`CHART_SERIES_CAPACITY_EXCEEDED`; the consumer must select, paginate, facet or
otherwise reduce the visible set.

Sequential scales use five ordered stops:

- LIGHT: `#E8F1FF`, `#C5DAFF`, `#91BBFF`, `#4C8FFF`, `#084CC2`;
- DARK: `#102A4C`, `#164678`, `#1D63A8`, `#3384FF`, `#B5D8FF`.

Diverging scales are negative/neutral/positive with an explicit zero centre:

- LIGHT: `#B4233C`, `#F1F5F9`, `#087A55`;
- DARK: `#FF718A`, `#24334A`, `#38D39F`.

Sequential and diverging stops are ordered area/fill encodings, not legal
standalone required text, icons, lines, markers or essential boundaries. Their
support records must declare `AREA_FILL_ONLY` and `REQUIRES_LEGEND`; rendered
use requires a numeric or ordinal legend and an explicit value/bin label or
equivalent non-colour encoding. A stop or `chart.selection` fill below 3:1
against its adjacent canvas must use an approved essential boundary, direct
label or selected-series stroke/marker and cannot be the sole indication of a
value or selection. D1 does not claim that neighbouring scale stops each meet
3:1; D5 must prove the complete rendered scale remains understandable.

Semantic chart encodings are:

| Meaning            | Colour source        | Redundant encoding                         |
| ------------------ | -------------------- | ------------------------------------------ |
| bid                | financial positive   | upward triangle and `BID` label            |
| ask                | financial negative   | downward triangle and `ASK` label          |
| long               | categorical series 1 | solid line and `LONG` label                |
| short              | categorical series 2 | `6 3` dash and `SHORT` label               |
| last               | categorical series 1 | solid 2px line                             |
| mark               | categorical series 2 | `6 3` dash and diamond marker              |
| index/oracle       | categorical series 3 | `2 2` dash and square marker               |
| reference          | categorical series 8 | `8 2` dash and labelled endpoint           |
| warning threshold  | status warning       | `6 3` dash and label                       |
| critical threshold | status critical      | `2 2` dash, double marker and label        |
| stale interval     | quality stale        | diagonal hatch plus boundary labels        |
| gap                | quality gapped       | no connecting line, gap brackets and label |
| missing data       | transparent interval | explicit missing glyph and label           |
| uncertainty        | chart uncertainty    | dotted band boundary plus pattern          |
| anomaly            | status critical      | outlined triangle/exclamation and label    |

Selected series use full opacity plus a 3px stroke or halo; highlighted series
use 2px plus endpoint markers; muted non-critical series use 35% opacity while
retaining marker/dash identity. Critical information is never communicated by
opacity alone. Chart chrome values remain those in the accepted theme contract:
canvas `#FFFFFF/#0A1324`, grid `#E5E7EB/#24334A`, axis
`#6B7280/#8291A8`, label `#374151/#C3CEDD`, crosshair
`#126BFF/#00D4FF`, selection `#DCEAFF/#18365F`, gap
`#A33252/#FF7AA2`, uncertainty `#7D8795/#68768A` and invalid
`#A61B1B/#FF5B5B`.

### Rationale and rejected alternatives

Eight is sufficient for dense comparison while keeping colour-plus-marker/dash
tuples distinguishable. Unlimited reuse, colour-only series, positive/negative
as synonyms for long/short, bid/ask as synonyms for buy/sell and selecting a
chart library in D1 are rejected.

### Governance

- Responsible authority roles: Design, Accessibility, Product Owner and Quant.
- Implementation gate: exact palette/order, capacity type, encoding matrix and
  completeness/contrast/colour-vision checks.
- Production gate: D5 selects a chart renderer and supplies rendered assistive,
  interaction and dense-series evidence.
- Acceptance evidence: eight-series deterministic fixture, ninth-series failure,
  redundant encoding matrix, scale ordering and state-pattern tests.
- ADR-0013 interaction: chart records are a committed canonical support source.
- Revisit trigger: D5 evidence proves eight cannot be distinguished or requires
  a renderer-specific encoding that preserves these meanings.

## 6. D-083 — Foundation scales and validator bounds

### Approved foundation scales

- Spacing: `0`, `2`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`,
  `64` pixels.
- Global icon sizes: `12`, `16`, `20`, `24`, `32` pixels.
- Global control heights: `32`, `40`, `48` pixels; the minimum touch target is
  `44 × 44` pixels even where the visible control is smaller.
- Border widths: `0`, `1`, `2` pixels. One pixel is default; two pixels is
  focus/critical emphasis.
- Radii: `none 0`, `sm 4`, `md 8`, `lg 12`, `xl 16`, `pill 9999` pixels.
- Opacity: `0`, `0.08`, `0.12`, `0.20`, `0.35`, `0.50`, `0.65`, `0.80`, `1`.
- Motion durations: `instant 0ms`, `fast 120ms`, `standard 160ms`,
  `emphasis 200ms`, `panel 280ms`.
- Easing: standard `cubic-bezier(0.2, 0, 0, 1)`, enter
  `cubic-bezier(0, 0, 0.2, 1)`, exit
  `cubic-bezier(0.4, 0, 1, 1)`.
- Reduced motion resolves nonessential motion to `0ms`; the existing `0.01ms`
  browser-safety constant remains a scanner-excluded technical constant.

Elevation is a structured token, not arbitrary CSS:

| Level   | LIGHT                                           | DARK                                             |
| ------- | ----------------------------------------------- | ------------------------------------------------ |
| flat    | none                                            | none                                             |
| raised  | `0 1px 2px #0F172A14`, `0 8px 24px #0F172A14`   | `0 1px 2px #00000066`, `0 12px 28px #00000059`   |
| overlay | `0 8px 24px #0F172A1F`, `0 24px 64px #0F172A1A` | `0 12px 32px #00000080`, `0 32px 80px #00000073` |

Semantic layers are: `base 0`, `raised 10`, `sticky 20`, `dropdown 30`,
`overlay 40`, `modal 50`, `toast 60`, `tooltip 70`, `focus 80`. Arbitrary
z-index values and page-specific layer names are prohibited. Page widths,
sidebar dimensions, grids, breakpoints, content geometry and component-specific
sizes remain D3/layout-owned and are not D1 tokens.

### Approved resource bounds

| Resource                            |           Maximum |
| ----------------------------------- | ----------------: |
| canonical tokens                    |             2,048 |
| records in any support source       |             4,096 |
| JSON nesting depth                  |                16 |
| parsed JSON nodes across source set |            50,000 |
| object keys                         |     64 per object |
| alias depth                         |                 8 |
| canonical ID length                 |   128 ASCII bytes |
| ordinary string                     |   512 UTF-8 bytes |
| description                         | 1,024 UTF-8 bytes |
| font-family entries                 |                12 |
| one font-family name                |    64 UTF-8 bytes |
| complete font-family stack          |   512 UTF-8 bytes |
| shadow layers                       |                 4 |
| one canonical source file           |   1,048,576 bytes |
| aggregate canonical source set      |   4,194,304 bytes |
| one generated artifact              |   2,097,152 bytes |
| aggregate generated artifacts       |   6,291,456 bytes |
| bounded diagnostic findings         |       200 per run |

Limit exhaustion fails closed before artifact publication; diagnostics report a
finite code and location, not the complete hostile value.

### Rationale and rejected alternatives

The scales cover the accepted dense analytics foundation without creating a
second page-layout system. Arbitrary one-pixel spacing series, component
geometry in global tokens, free-form shadows/easing, unlimited aliases and
unbounded source/output are rejected.

### Governance

- Responsible authority roles: Design, Frontend Architecture, Accessibility
  and Security.
- Implementation gate: exact enums/grammars/bounds, layer invariants and
  reduced-motion tests.
- Production gate: component composition of layers, touch targets and motion is
  proved in D2–D6.
- Acceptance evidence: boundary and over-bound fixtures, shadow/easing grammar,
  semantic-layer scan, reduced-motion and bounded-diagnostic tests.
- ADR-0013 interaction: these are the mandatory source/generator bounds
  referenced by D-079.
- Revisit trigger: measured legitimate source growth beyond 75% of a limit or a
  component architecture need that cannot fit the finite scale.

## 7. D-084 — Raw-value exception governance

### Approved choice

Frontend Architecture owns the registry. Design approves visual-token
exceptions; Accessibility additionally approves contrast, focus, status or
motion exceptions; Security additionally approves parser, arbitrary-CSS,
font/URL or scanner-boundary exceptions. The Product Owner is not an ordinary
escape-hatch approver.

An exception lives for at most 30 calendar days or until the next token-set
minor release, whichever occurs first. It may be renewed once for at most 30
additional days with a new reason and all required approvals. No exception is
permanent. Continuing beyond 60 aggregate days requires a new explicit product,
architecture and relevant specialist decision; it is not an extension of the
old record.

Every exception contains: stable ID, exact repository-relative file, exact CSS
property or source field, exact normalized literal value, reason, owner,
owner role, stable approver identity and approver roles, issue/reference,
creation date, expiry date or target version, cleanup criterion and affected
token candidate. Globs, directories,
unanchored/variable regular expressions, `*`, generated code and free-form
allowlists are prohibited.

Renewal creates a new reviewed revision. Expired, orphaned, widened and
no-longer-used records fail default and production CI. A matching rule that
covers more than one exact declaration fails. Removal of the underlying
violation requires removal of the exception in the same change. Production CI
always rejects expired exceptions.

Technical constants excluded from token governance are limited to SVG path
geometry, percentages, grid counts, media-query thresholds, content-specific
layout dimensions and the approved reduced-motion `0.01ms` safety constant.
Their CSS property context must match the scanner's finite exclusion table;
their numeric spelling alone does not exempt them.

### Rationale and rejected alternatives

Short-lived exact records make debt visible without creating a broad bypass.
Permanent exceptions, directory exemptions, manual-only review, ownerless
records and a dependency-heavy lint plugin are rejected.

### Governance

- Responsible authority roles: Frontend Architecture, Security and Design;
  Accessibility joins for its affected semantics.
- Implementation gate: property-aware repository-native scanner and exception
  lifecycle tests.
- Production gate: every later frontend package enters enforcement through an
  explicit scope change; no inherited blanket exemption.
- Acceptance evidence: raw syntax variants, exact-match, expiry, renewal,
  orphan, widened and unused-record tests.
- ADR-0013 interaction: exceptions never modify canonical source authority or
  generated artifacts directly.
- Revisit trigger: false-positive rate above the accepted QA threshold or an
  approved future scanner tool with a separate supply-chain review.

## 8. D-085 — Versioning, deprecation and rollback

### Approved choice

Both `schemaVersion` and `tokenSetVersion` are SemVer 2.0.0 strings without a
`v` prefix or build metadata. The initial D1 values are `1.0.0` and `1.0.0`.

Schema versioning:

- patch: clarification or stricter rejection of input that was already invalid;
- minor: backward-compatible optional structure or additional understood enum;
- major: any required-field, grammar, type or interpretation break.

Token-set versioning:

- patch: theme raw-value correction that preserves the token's exact semantic
  meaning and passes all existing pairings;
- minor: additive token, new nonbreaking alias or deprecation;
- major: rename/removal, type change, alias target meaning change, theme
  contract removal or any semantic meaning change.

A meaning change is major even when the raw value is identical. A generated
byte change without the required source and version change fails. Theme-only
value changes may be patch changes only when semantic meaning, legal pairing
and supported consumers remain compatible; otherwise they are major.

Compatibility aliases are one-way and point directly to the current canonical
token. Replacement chains have maximum length one. An alias remains for at
least two subsequent token-set minor releases and at least 90 calendar days,
whichever is later. The normal maximum is 180 days; extension requires a new
Product Owner, Design and Frontend Architecture approval with a removal date.
The minimum release-and-time gate always takes precedence: reaching 180 days
never permits removal before both minima pass. If 180 days is reached without
both minima or an approved extension, the alias remains, and publication of a
new token-set candidate is blocked until the named authorities approve an
extension or the removal prerequisites are satisfied.

Removal occurs only in a major token-set release after the window, after every
known governed consumer has migrated, after no exception references the alias
and with migration and rollback notes. The immediately previous accepted token
set must remain buildable for the entire compatibility window. Git history alone
is not acceptance evidence: the accepted source, artifacts and manifest must
reproduce under the supported pinned toolchain.

Rollback is atomic across metadata, source records, support records, all
generated artifacts, manifest and compatibility aliases. Partial rollback or
manual artifact reversion is prohibited.

### Rationale and rejected alternatives

Independent versions separate parser compatibility from visual contract
evolution. Calendar-only versions, a single shared version, silent rename,
unbounded replacement chains and immediate removal are rejected.

### Governance

- Responsible authority roles: Product Owner, Design and Frontend Architecture.
- Implementation gate: SemVer parser, compatibility classifier, direct alias,
  window/removal and version-bump tests.
- Production gate: removals require consumer inventory evidence and the full
  elapsed compatibility window.
- Acceptance evidence: additive/deprecated/breaking fixtures, unchanged-version
  failure, prior-set build, alias expiry and atomic rollback replay.
- ADR-0013 interaction: this decision accepts and completes its independent
  version and committed-manifest policy.
- Revisit trigger: more than one supported consuming release train or a proven
  need for a longer compatibility window.

## 9. D-086 — Phase 1 migration, safe default and Geist

### Approved choice

Until D4 implements theme selection, DARK is the only safe default. Generated
CSS resolves DARK in `:root` and `[data-theme="dark"]`; LIGHT is an explicitly
complete `[data-theme="light"]` map for tests and later consumers. SYSTEM is not
resolved by D1. D1 adds no theme storage, picker, bootstrap script or hydration
policy.

Migration order is fixed:

1. capture the D-088 baseline and current raw-value inventory;
2. add canonical metadata, schema and source records;
3. generate and verify complete DARK/LIGHT artifacts;
4. add one direct compatibility-alias layer for safely equivalent legacy names;
5. replace overloaded legacy uses, such as the orange `--color-accent`, with
   the approved semantic role in `globals.css` only;
6. retain layout-owned values, media queries, sidebar/content geometry and
   approved temporary exceptions unchanged;
7. switch the CSS package export only after every D1 gate passes;
8. remove an alias only under D-085 and the criteria below.

Geist remains the installed Phase 1 compatibility font. D1 does not change
`apps/web/src/app/layout.tsx`, remove the package or install another font. A
minimal `layout.tsx` change is not approved because the current architecture
does not require one; discovering such a requirement stops D1-I4 for a new
scope decision.

The consumer-switch gate requires: canonical validation, deterministic clean
generation, manifest drift, DARK/LIGHT parity, approved contrast pairs,
status/chart completeness, raw-value enforcement, all existing web tests/build,
D-088 evidence and an exact scope diff. Alias removal additionally requires the
D-085 window, zero governed consumer references, zero exceptions and a passing
rollback rehearsal.

Rollback is one atomic foundation revision restoring the previous token source,
CSS export, compatibility aliases, manifest and `globals.css` bridge. For the
initial D1 adoption, the previous canonical source, generated artifacts,
manifest and aliases do not exist: rollback removes those newly introduced
files and restores the accepted hand-maintained `tokens.css`, its package
export, and the pre-D1 `globals.css`. After D1 has an accepted predecessor,
rollback restores that predecessor's complete canonical set. The shell must
remain usable throughout migration.

Explicitly prohibited are TSX/DOM/copy/route/navigation changes, page or
component redesign, responsive/breakpoint changes, sidebar or content geometry,
new interactions, animation behavior beyond token substitution, theme runtime,
font/package changes and any non-web application or infrastructure change.

### Rationale and rejected alternatives

DARK matches the accepted brand direction and current shell, making the bridge
fail-safe. Immediate legacy deletion, LIGHT default, a hidden SYSTEM resolver,
Geist removal, layout changes and using migration to redesign the shell are
rejected.

### Governance

- Responsible authority roles: Product Owner, Design, Frontend owner and QA.
- Implementation gate: exact migration allowlist, safe-default and consumer
  switch evidence.
- Production gate: D4 owns SYSTEM/device/account preference and no-flash runtime;
  D2/D4 own any later font delivery/removal.
- Acceptance evidence: source-scope diff, legacy map, both-theme route captures,
  unchanged DOM/routes, existing tests/build and atomic rollback.
- ADR-0013 interaction: uses its committed CSS artifact; does not alter source
  authority.
- Revisit trigger: an unavoidable `layout.tsx`/manifest change or an inaccessible
  legacy consumer that cannot be bridged without redesign.

## 10. D-087 — Forced colours and high contrast

### Approved responsibility split

D1 defines and validates a closed `systemColor` value type with this allowlist:
`Canvas`, `CanvasText`, `ButtonFace`, `ButtonText`, `Highlight`,
`HighlightText`, `GrayText`, `LinkText`, `Mark` and `MarkText`. These values are
valid only in the forced-colour support source; ordinary LIGHT/DARK colours
remain the D-081 hex values.

D1 provides these required forced-colour role mappings:

| Semantic role             | System colour / presentation                     |
| ------------------------- | ------------------------------------------------ |
| base and surface          | `Canvas`                                         |
| primary/secondary text    | `CanvasText`                                     |
| link                      | `LinkText` plus underline                        |
| action surface/text       | `ButtonFace` / `ButtonText`                      |
| selected surface/text     | `Highlight` / `HighlightText`                    |
| focus                     | 2px `Highlight` ring plus 2px `Canvas` offset    |
| essential boundary        | `ButtonText`                                     |
| disabled                  | `GrayText` plus disabled label/state             |
| warning/critical          | `Mark` / `MarkText` plus required icon and label |
| quality/capability states | `CanvasText` plus distinct icon/shape and label  |

D1 tests schema closure, role completeness, no transparent essential boundary,
focus visibility, status redundancy and the existing compatibility shell's
static forced-colour mapping. It must not assume authored RGB/hex values survive
forced-colour mode. `forced-color-adjust: none` is prohibited by default; an
exact Accessibility-approved D-084 exception is required and cannot remove
redundant encoding.

D2 owns rendered controls, focus, disabled and component-state evidence. D4
owns runtime theme/preference behavior and cross-theme first paint. D5 owns
rendered chart patterns, series interaction, tooltip and data-visualization
evidence. D1 does not claim those later results.

### Rationale and rejected alternatives

System colours preserve user agent high-contrast authority while keeping D1's
semantic roles explicit. Omitting forced-colour contracts, treating DARK as
high contrast and broadly disabling forced colour adjustment are rejected.

### Governance

- Responsible authority roles: Accessibility, Design and Frontend Architecture.
- Implementation gate: closed system-colour grammar and the D1 mapping/static
  tests above.
- Production gate: rendered D2/D4/D5 evidence for their owned surfaces.
- Acceptance evidence: complete mapping, prohibited-value fixtures, forced-
  colour shell captures, keyboard focus and non-colour status inspection.
- ADR-0013 interaction: system colours are a schema-enumerated value type, not
  arbitrary CSS.
- Revisit trigger: user-agent interoperability evidence requires an allowlist
  adjustment or D2/D5 cannot render a critical state accessibly.

## 11. D-088 — Visual evidence

### Approved scope

The exact existing Phase 1 reference routes are:

```text
/
/login
/register
/forgot-password
/verify-email
/d1-missing-route
```

The last route intentionally exercises the existing not-found presentation.
Reference viewports are mobile `390 × 844` CSS pixels and desktop
`1440 × 900` CSS pixels at device scale factor 1.

Before D1 implementation, capture the existing DARK shell for all six routes at
both viewports: 12 baseline screenshots. After the D1 bridge, capture every
route at both viewports in explicit DARK and explicit LIGHT: 24 result
screenshots. Record browser name/version, operating-system rendering context,
commit/worktree identity and token-set version. The three `docs/brand/references`
images are direction evidence only and are not sufficient D1 regression
evidence.

Additional evidence is required:

- 200% browser zoom on `/`, `/login` and `/register` at both viewports and both
  themes, with no clipped required content or hidden focus target;
- keyboard focus order and visible focus for every interactive element on all
  six routes in both themes;
- deterministic 30%-expanded pseudo-localized labels on `/login` and
  `/register`, applied by a non-shipping browser harness without source changes,
  at both viewports and themes;
- font-preference-unavailable captures for `/` and `/login` at both viewports;
- forced-colour captures for `/` and `/login` at both viewports, plus the D-087
  inspection checklist;
- machine-readable D-081 contrast results and D-082 completeness results linked
  to the screenshot evidence.

No new automated visual-regression dependency is required in D1. Deterministic
screenshots, hashes and side-by-side/overlay human review are sufficient. A
future pixel-diff platform needs separate approval in D2/D4.

Pixel identity is not the criterion because the brand palette intentionally
changes. Allowed visual changes are only token-driven colour, border, elevation,
focus and font-fallback presentation. DOM, copy, route behavior, layout,
breakpoints, geometry, navigation and interaction must be unchanged. Any
unexplained displacement, clipping, lost content, inaccessible contrast or
changed interaction is HIGH; a route/DOM/navigation redesign is BLOCKER.

### Rationale and rejected alternatives

The bounded matrix covers the existing shell without turning D1 into a page
redesign or introducing tooling. Existing screenshots alone, no visual evidence,
pixel-perfect equality and a broad new visual platform are rejected.

### Governance

- Responsible authority roles: Design, QA and Frontend owner.
- Implementation gate: baseline availability and exact route/viewport/theme
  capture plan.
- Production gate: D2/D4 add broader component, browser and theme-runtime
  regression evidence.
- Acceptance evidence: 36 route screenshots plus the bounded zoom,
  localization, fallback, forced-colour and accessibility records above.
- ADR-0013 interaction: captures record the committed artifact and token-set
  versions but do not change the canonical source decision.
- Revisit trigger: a route ceases to exist before D1 or the approved evidence
  harness cannot reproduce a capture without application changes.

## 12. Aggregate approval and implementation eligibility

D-079 through D-088 have no remaining BLOCKING choice. ADR-0013 is consistent
with D-079 and D-085 and may be `Accepted` on 2026-08-16.

This decision record makes D1 eligible for a **separate implementation
approval**. It is not that approval. Implementation must stop if it requires a
choice outside this record or a file outside the D1 allowlist.
