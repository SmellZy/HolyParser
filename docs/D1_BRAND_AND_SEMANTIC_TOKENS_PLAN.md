# D1 — Brand and Semantic Design Tokens implementation plan

- Status: **DOCUMENTATION PLAN — IMPLEMENTATION NOT APPROVED**
- Scope date: 2026-08-16
- Depends on: frozen Product Design, Commerce and Administration Architecture
  Amendment and accepted Phase 1 foundation
- Decision gate: D-079 through D-088 approved on 2026-08-16; exact choices in
  [`D1_DESIGN_DECISIONS.md`](D1_DESIGN_DECISIONS.md)

## 1. Purpose and authority

D1 creates one repository-native, deterministic token foundation for every
future HolyParser surface. It is independently implementable, testable,
reviewable, reversible and freezable. This plan creates no token source, CSS,
component, theme picker or font dependency and authorizes no implementation.

The D1 implementation boundary is:

```text
reviewed canonical token data
  -> bounded schema and semantic validation
  -> deterministic alias resolution
  -> deterministic generated artifacts
  -> compatibility aliases for the frozen Phase 1 shell
```

Components consume semantic tokens. Primitive palette values, brand references
and generated files are not component APIs.

## 2. Scope

D1 later implements only:

- the canonical token source and schema;
- validation, alias resolution and deterministic generation;
- schema/token-set versions and compatibility metadata;
- independently resolved dark and light semantic values;
- typography, spacing, sizing, radius, border, elevation, opacity, motion and
  justified layer contracts;
- financial, status, capability and data-quality presentation tokens;
- chart tokens and critical non-colour encodings;
- contrast-pair allowlists and static accessibility checks;
- bounded raw-value scanning and governed exceptions;
- a compatibility bridge and bounded Phase 1 token migration;
- documentation examples, deterministic fixtures, tests and acceptance
  evidence.

### 2.1 Non-goals

D1 does not implement or redesign:

- pages, navigation, application/public/admin shells or information
  architecture;
- components, tables, charts, billing/admin/authentication UI or responsive
  flows;
- a runtime theme picker, account/device theme persistence or no-flash script
  beyond defining their token-facing contract;
- font download, installation, bundling or remote font loading;
- analytics, Phase 2B, positions, alerts, Telegram, commerce or administration;
- persistence, network clients, infrastructure or exchange adapters;
- visual-regression infrastructure for components or pages.

Changing a token-resolved colour is not permission to alter markup, layout,
copy, route structure or interaction behavior.

## 3. Current Phase 1 styling inventory

The accepted foundation currently consists of
`packages/design-tokens/tokens.css`, one package export, and
`apps/web/src/app/globals.css`.

### 3.1 Existing assumptions

- `:root` declares `color-scheme: dark`; there is no light resolved set.
- Legacy variables use `--color-*`, `--font-*`, `--space-*`, `--radius-*`,
  `--shadow-*`, `--transition-*` and a few component/layout names.
- The palette is near-black plus orange accent, not the accepted deep-navy,
  blue, cyan and violet direction.
- `layout.tsx` loads the already-present Geist package; headings and UI copy do
  not have separate contracts.
- Chart, capability, knowledge and complete data-quality families do not exist.
- Status presentation is limited to positive, negative, warning and info
  colours, plus local `data-tone` values.
- SYSTEM is absent and LIGHT is absent.

### 3.2 Raw-value inventory

The current bounded scan finds raw values in both the token source and feature
stylesheet. Expected canonical-source values are legitimate; feature raw values
need classification rather than blind replacement.

| Current pattern              | Examples                                                          | D1 migration class                                                                             |
| ---------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Raw feature colours          | gradients, alpha surfaces, overlay, focus halo, button foreground | conflicting; replace with semantic tokens or a temporary reviewed exception                    |
| Legacy colour variables      | `--color-canvas`, `--color-accent`, `--color-info`                | aliasable, then deprecated                                                                     |
| Legacy scale variables       | `--space-*`, `--radius-*`, `--transition-*`                       | directly mappable where values match the approved scale                                        |
| Component geometry           | sidebar widths, card widths, control heights                      | one-off/layout-owned; do not force into global semantics without D3 ownership                  |
| Media-query thresholds       | `48rem`, `62rem`                                                  | intentionally retained temporarily; CSS variables cannot safely replace media-query conditions |
| Raw stacking values          | `20`, `25`, `30`                                                  | conflicting; migrate to semantic layer tokens after D-083                                      |
| Reduced-motion safety values | `0.01ms`, one iteration                                           | approved technical exception candidate, documented and scan-allowlisted                        |
| Existing Geist import        | application root font variables                                   | temporary compatibility dependency; no new font dependency in D1                               |

Raw-value counts are point-in-time migration evidence, not acceptance targets.
A change in count must be explained by file/property, not treated as proof of a
correct migration.

### 3.3 Migration risks

- legacy aliases can hide incomplete migration indefinitely;
- replacing orange with brand/action blue can alter contrast and visual
  hierarchy even without layout changes;
- alpha composites depend on the actual background and cannot be contrast-tested
  as standalone colours;
- changing font metrics can overflow controls or shift decimal columns;
- existing hard-coded z-index relationships can break when partially migrated;
- global raw-value prohibition can incorrectly reject SVG geometry, media
  queries, percentages and content-specific layout values;
- a token-only change can still be a visual regression and needs before/after
  evidence without claiming pixel identity.

## 4. Recommended source of truth

### 4.1 Format and location

Under approved D-079, use a data-only, ordered JSON source:

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

`token-set.meta.json` is the canonical input for `schemaVersion`,
`tokenSetVersion`, namespace and artifact-policy identifiers; the generated
manifest may report those values but cannot be their authority. The token
source is an array of records sorted by token ID rather than an
object keyed by ID. Duplicate IDs are therefore detectable after ordinary JSON
parsing. It is data, not executable TypeScript, and cannot run arbitrary code
during generation.

Together, the metadata file, ordered token source and three governed support
sources form one atomic canonical source set. D-079 and D-085 approve the exact
serialization, artifact and version policy in `D1_DESIGN_DECISIONS.md`.
The generated manifest hashes the exact bytes of that source set plus generated
CSS and TypeScript metadata using sorted repository-relative POSIX paths and
lowercase hexadecimal SHA-256. It does not hash itself; its bytes are verified
by clean deterministic regeneration.

The implementation may use Node 24 standard-library scripts and existing test
tooling. A new schema/generation dependency requires separate approval and is
not necessary for D1.

### 4.2 Record contract

Every source record contains:

- `id`: canonical dot-separated token ID;
- `kind`: exactly `PRIMITIVE` or `SEMANTIC`;
- `family`: one allowlisted semantic or primitive family;
- `type`: one allowlisted token type;
- `value`: a structured literal or alias;
- optional `themes.dark` and `themes.light` structured values;
- `description` and intended semantic role;
- `sinceTokenSetVersion`;
- lifecycle: `ACTIVE` or `DEPRECATED`;
- `replacementId` and `removeAfterVersion` when deprecated;
- optional `accessibilityRole` and approved pairing references.

Documentation-only example:

```json
{
  "id": "semantic.color.text.primary",
  "kind": "SEMANTIC",
  "family": "TEXT",
  "type": "color",
  "themes": {
    "dark": "{primitive.color.neutral.050}",
    "light": "{primitive.color.neutral.950}"
  },
  "description": "Primary required text",
  "accessibilityRole": "normal-text",
  "sinceTokenSetVersion": "1.0.0",
  "lifecycle": "ACTIVE"
}
```

Aliases use exactly `{canonical.token.id}` as the complete value. Concatenated,
nested or runtime aliases are prohibited. Alias resolution is theme-specific,
acyclic and deterministic.

### 4.3 Token types and safe grammars

Allowlisted types are:

- `color`: normalized six- or eight-digit sRGB hex at the source boundary;
- `systemColor`: an allowlisted CSS system-colour identifier used only by the
  approved forced-colours contract; arbitrary keywords remain invalid;
- `dimension`: exact decimal string plus allowlisted CSS unit;
- `duration`: non-negative integer milliseconds;
- `cubicBezier`: four bounded exact decimal components;
- `fontFamily`: bounded ordered family identifiers, not a free-form CSS string;
- `fontWeight`: allowlisted integer weight;
- `lineHeight` and `number`: bounded exact decimal strings;
- `shadow`: structured layers containing bounded offsets, blur, spread and
  colour aliases;
- `integer`: bounded integer for layer order;
- `stringEnum`: only for reviewed presentation identifiers such as marker shape
  or label key.

Source values cannot contain URLs, `@import`, `url()`, arbitrary CSS functions,
declarations, braces, comments, control characters or user content. CSS
serialization operates from structured values, never by copying an arbitrary
string.

### 4.4 Validation invariants

Validation fails before generation on:

- malformed JSON, invalid UTF-8, unknown top-level fields or unknown types;
- absent/invalid metadata versions, conflicting namespace or artifact policy;
- duplicate, unsorted, malformed or overlong IDs;
- missing/unknown `kind` or `family`, or ID/kind/family disagreement;
- unresolved, circular, cross-type or excessive-depth aliases;
- missing DARK or LIGHT resolution for any semantic token;
- duplicate generated CSS names;
- invalid colour, unit, numeric scale, shadow or easing representation;
- excessive token, alias, string, family, shadow-layer or total-byte counts;
- deprecated token without replacement/removal metadata;
- a theme contract mismatch;
- an unapproved semantic token/contrast pairing;
- generated output differing from the committed artifact.

Exact bounds are configuration constants in the validator, covered by boundary
tests and approved under D-079/D-083. They are not user-configurable at runtime.

## 5. Namespace and taxonomy

Canonical IDs use lowercase dot-separated segments. CSS output uses a stable
`--hp-` prefix. Primitive IDs are never referenced from feature styles.

### 5.1 Primitive families

- `primitive.color.brand.*`
- `primitive.color.neutral.*`
- `primitive.color.green|red|amber|blue|violet|cyan.*`
- `primitive.dimension.*`
- `primitive.opacity.*`
- `primitive.duration.*`
- `primitive.shadow.*`

Primitive names describe values, not financial meaning.

### 5.2 Semantic families

| Family            | Required semantic IDs                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Background        | `semantic.color.background.base`, `subtle`, `scrim`                                                                                                                          |
| Surface           | `semantic.color.surface.base`, `elevated`, `sunken`, `overlay`                                                                                                               |
| Border            | `semantic.color.border.default`, `emphasis`, `critical`, `focus`                                                                                                             |
| Text              | `semantic.color.text.primary`, `secondary`, `muted`, `disabled`, `inverse`, `link`                                                                                           |
| Action            | `semantic.color.action.primary.*`, `secondary.*`, `destructive.*` for default/hover/active/disabled text and surface                                                         |
| Interaction       | `semantic.color.interaction.hover`, `active`, `selected`, `disabled` for neutral state treatment that does not imply an action, status or financial outcome                  |
| Focus             | `semantic.color.focus.ring`, `focus.offset`                                                                                                                                  |
| Financial outcome | `semantic.color.financial.positive`, `negative`, `neutral`                                                                                                                   |
| System status     | `semantic.color.status.healthy`, `active`, `warning`, `critical`, `informational`, `unknown`, `disabled`                                                                     |
| Data quality      | `semantic.color.quality.stale`, `gapped`, `reconnecting`, `invalid`, `locked`, `crossed`                                                                                     |
| Capability        | `semantic.color.capability.unsupported`, `unverified`, `research-required`                                                                                                   |
| Chart             | families in section 9                                                                                                                                                        |
| Typography        | `semantic.typography.*` roles, numeric features and alignment metadata                                                                                                       |
| Layout scales     | `semantic.space.*`, `semantic.size.*`, `semantic.radius.*`, `semantic.border.width.*`, `semantic.elevation.*`, `semantic.opacity.*`, `semantic.motion.*`, `semantic.layer.*` |

Brand/action emphasis, financial outcome, data quality, capability and system
error are separate namespaces. `action.primary` does not mean informational or
positive. `financial.positive` does not mean long or buy.

## 6. DARK, LIGHT and SYSTEM resolution

- DARK and LIGHT are the only resolved token maps.
- SYSTEM is a preference selector that resolves to one of those maps; it is not
  emitted as a third value set.
- Every semantic token must resolve in both maps and to the same type.
- LIGHT values are explicitly reviewed; no inversion or runtime colour math is
  permitted.
- Missing theme values, unresolved aliases or type mismatches fail generation.
- Generated CSS provides the approved DARK safe default plus explicit
  `[data-theme="dark"]` and `[data-theme="light"]` scopes. The safe default is
  selected by D-086 and matching the frozen Phase 1 rollback strategy.
- A future D4 bootstrap selects the root attribute. D1 defines names and
  fallback only; it adds no preference storage or script.
- The server and client consume the same token-set manifest/version. Hydration
  cannot synthesize token values.
- Theme failure falls back to the reviewed safe resolved set and never makes
  required text transparent or state indistinguishable.

The accepted initial values and architectural shorthand names in
`THEME_ARCHITECTURE.md` and `DESIGN_SYSTEM.md` remain inputs. D-081 now approves
the expanded values and pairings, and D-085 approves only direct, expiring,
one-way compatibility aliases; neither permits meanings to merge.

## 7. Typography contract

No font is installed or fetched in D1. Under approved D-080, tokens define:

- `font.family.heading`: Space Grotesk preference followed by an approved
  metric-tolerant sans-serif fallback stack;
- `font.family.ui`: Inter preference followed by an approved system sans stack;
- `font.family.data`: a system monospace/data stack only where identifier or
  exact column formatting needs it;
- named size, line-height, weight and letter-spacing roles rather than direct
  values in components;
- `font.feature.tabular`: `tabular-nums` for changing financial values,
  countdowns, amounts and aligned tables;
- decimal alignment through table/grid layout and separate integer/fraction
  spans where necessary; it is not simulated by spaces;
- stable minimum/reserved width rules for live values and countdowns;
- dense table roles with readable line height and no sub-minimum touch targets;
- bounded responsive roles using explicit clamp endpoints;
- fallback evidence at 100%, 200% zoom and long localized strings.

The already-installed Geist package remains a temporary Phase 1 compatibility
fallback under D-080/D-086. D1 installs or removes nothing and does not change
`layout.tsx`.

## 8. Status and financial semantics

Every critical presentation record contains a colour token, label-key token,
icon identifier, marker/shape identifier, optional chart dash/pattern and an
accessible description key. These are presentation contracts, not domain-state
definitions.

| Meaning             | Colour family                  | Required redundant encoding                              |
| ------------------- | ------------------------------ | -------------------------------------------------------- |
| `HEALTHY`           | `status.healthy`               | “Healthy”, check icon, circle marker                     |
| `ACTIVE`            | `status.active`                | “Active”, activity icon, filled circle                   |
| positive outcome    | `financial.positive`           | signed value and “Gain/Positive” label where needed      |
| negative outcome    | `financial.negative`           | signed value and “Loss/Negative” label where needed      |
| `WARNING`           | `status.warning`               | warning label, triangle icon                             |
| `CRITICAL`          | `status.critical`              | critical label, octagon/error icon                       |
| `INFORMATIONAL`     | `status.informational`         | informational label, information icon, diamond marker    |
| `UNKNOWN`           | `status.unknown`               | unknown label, question marker                           |
| `STALE`             | `quality.stale`                | stale label, clock icon, dotted treatment                |
| `GAPPED`            | `quality.gapped`               | gap label, broken-line marker, explicit missing interval |
| `RECONNECTING`      | `quality.reconnecting`         | reconnecting label, sync icon; motion optional           |
| `UNSUPPORTED`       | `capability.unsupported`       | unsupported label, barred marker                         |
| `UNVERIFIED`        | `capability.unverified`        | unverified label, outline marker                         |
| `RESEARCH_REQUIRED` | `capability.research-required` | full label, research icon, distinct dash                 |
| `INVALID`           | `quality.invalid`              | invalid label and error marker                           |
| `LOCKED`            | `quality.locked`               | locked label and lock marker                             |
| `CROSSED`           | `quality.crossed`              | crossed label and crossing-lines marker                  |
| `DISABLED`          | `status.disabled`              | disabled label and disabled control semantics            |

Labels are localizable message keys in metadata; generated CSS contains no
English product copy. A UI may shorten visible labels only when the accessible
name retains the complete state. No icon or colour alone is sufficient.

## 9. Chart token and encoding matrix

Chart tokens do not select a chart library and are not status colours by
default.

### 9.1 Required families

- canvas, plot surface, grid major/minor, axis, label and tooltip surface/text;
- crosshair, selection, hover and focus;
- categorical series `01..N` with paired marker and dash encodings;
- sequential scales with named ordered stops;
- diverging negative/neutral/positive scale with an explicit zero centre;
- bid, ask, long and short series, separately labelled;
- last, mark, index/oracle and generic reference lines;
- threshold warning/critical lines;
- highlighted and muted series;
- anomaly marker families;
- stale interval, gapped interval, missing data, uncertainty and invalid data.

### 9.2 Encoding rules

- Categorical reuse is prohibited before the D-082 maximum is reached.
- Beyond that maximum, the consumer must paginate, facet, select or add a
  reviewed secondary encoding; it cannot silently recycle a colour.
- Bid/ask and long/short are different concepts and require labels even when a
  product chooses similar hues.
- Missing/gapped intervals are geometry, not interpolated lines.
- Stale intervals use explicit bands/labels; opacity alone is insufficient.
- Mark/index/reference lines have distinct dash and accessible names.
- Critical threshold/anomaly meaning uses shape/dash/label in addition to
  colour.
- Tooltip and selected states use approved text/surface pairings.
- Sequential/diverging stops are area/fill-only encodings with required legends
  and value/bin labels; low-contrast stops and selection fills cannot be
  standalone essential geometry or the only indication of meaning.

D-082 approves eight series and the exact palette, marker sequence, dash
sequence and overflow behavior in `D1_DESIGN_DECISIONS.md`.

## 10. Contrast and accessibility matrix

D1 uses the D-081-approved WCAG 2.2 AA baseline and exact legal pairing
allowlist.

| Use                               |                                       Minimum | Required evidence                                               |
| --------------------------------- | --------------------------------------------: | --------------------------------------------------------------- |
| Normal required text              |                                         4.5:1 | every allowed text/background pairing in DARK and LIGHT         |
| Large text                        |                                           3:1 | size/weight classification plus both themes                     |
| Standalone required icon/graphic  |                                           3:1 | icon against adjacent surface                                   |
| Essential control boundary        |                                           3:1 | boundary against adjacent surface and state variants            |
| Focus indicator                   |                                           3:1 | ring against both component and adjacent background             |
| Selected/hover/active state       | 3:1 where the visual difference conveys state | default/state comparison plus text contrast                     |
| Status badge                      |         4.5:1 text; 3:1 essential icon/border | status pairing and redundant label/icon                         |
| Table text                        |                                         4.5:1 | header/body/muted-required values in both themes                |
| Chart labels/tooltips             |                                         4.5:1 | allowed chart text/surface combinations                         |
| Chart critical geometry           |                                           3:1 | adjacent background plus non-colour encoding                    |
| Modal/overlay content             |                      same as ordinary content | resolved composite surface, not raw alpha token alone           |
| Disabled inactive control         |                     documented WCAG exception | cannot contain the only required explanation or financial state |
| Forced-colour/high-contrast state |                       system-colour semantics | focus, boundary, selection and status remain distinguishable    |

### 10.1 Pairing allowlist

The canonical contrast-pair source names legal foreground/background pairs.
At minimum it covers primary/secondary/muted-required text, inverse text,
links, action labels, destructive labels, focus ring, borders, badges, charts,
tooltips, overlays and selected states on every surface where they are allowed.

A semantic colour cannot be paired arbitrarily merely because each token exists.
Unlisted pairings fail static validation or require a governed escape hatch.
Alpha colours are composited against every allowlisted actual background before
contrast is calculated.

### 10.2 Foundation accessibility behavior

- `focus-visible` tokens remain visible in DARK, LIGHT and forced-colour mode;
- reduced-motion tokens remove nonessential transforms/interpolation and retain
  immediate state annunciation;
- motion never carries the only indication of price or status change;
- token metadata uses only approved `systemColor` roles for forced colours;
  exact role/value mappings follow D-087, while rendered component behavior is
  split between D1 and D2/D4/D5;
- keyboard behavior is not implemented in D1, but D1 cannot define a token that
  suppresses focus or makes it transparent.

## 11. Raw-value policy

### 11.1 Prohibited locations and properties

Outside canonical source, generated artifacts and approved fixtures, feature
CSS/TS/TSX may not introduce raw values for:

- colour and alpha colour;
- spacing/padding/margin/gap when a semantic scale role exists;
- radius;
- shadow/elevation;
- transition or animation duration/easing;
- font family, size, weight, line height or letter spacing;
- semantic z-index/layer.

The scanner is property-aware. It does not mistake SVG path numbers, arbitrary
percentages, grid counts, media-query thresholds or content-specific geometry
for semantic design values. Those categories remain reviewable and bounded.

### 11.2 Allowed locations

- `tokens.source.json` and structured token support files;
- generated artifacts bearing a generated-file header and manifest digest;
- validator/generator test fixtures explicitly marked valid or invalid;
- a bounded compatibility-alias file during its approved window;
- reviewed technical constants that CSS cannot express through variables, such
  as media-query thresholds or reduced-motion safety overrides.

### 11.3 Escape hatch

Every exception record contains stable ID, exact file/property/pattern, reason,
owner, approver, issue link, creation date, expiry or target token version, and
cleanup criterion. Broad directory or wildcard exemptions are prohibited.
Expired, orphaned or widened exceptions fail CI. Product strings and user input
cannot become exceptions.

D-084 assigns Frontend Architecture ownership, role-specific approval and a
30-day maximum with one reviewed renewal. A repository-native bounded script
is required; generated and fixture exclusions are exact path allowlists.

## 12. Versioning, compatibility and rollback

### 12.1 Versions

- `schemaVersion` versions the source/schema structure.
- `tokenSetVersion` versions the complete semantic contract and values.
- generated artifacts embed both versions plus the source digest.
- compatibility aliases carry introduction, deprecation and removal versions.

### 12.2 Change classification

| Change                                               | Classification                                               |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Add a new optional primitive/semantic token          | additive token-set minor                                     |
| Add a required theme token for all consumers         | minor only before adoption; otherwise compatibility-reviewed |
| Deprecate with behavior-preserving alias             | minor with migration note                                    |
| Rename/remove token                                  | breaking token-set major                                     |
| Change token type or semantic meaning                | breaking token-set major                                     |
| Change resolved theme value without changing meaning | patch only after contrast/visual/security review             |
| Change schema shape/alias rules                      | schema major/minor according to compatibility                |

Changing `informational` to mean positive, `stale` to mean warning-only, or
`action.primary` to mean financial gain is always a breaking semantic change,
even if the hex value is unchanged.

### 12.3 Compatibility tests

Tests compare the previous accepted manifest with the candidate and fail on:

- removal without an elapsed approved window;
- type or semantic-family change;
- replacement chains that are missing, circular or longer than the bound;
- a value-only patch that fails pairing/contrast checks;
- changed output with unchanged token-set version;
- nondeterministic ordering, timestamps or platform newlines.

### 12.4 Rollback

Rollback restores the prior source, generated artifacts, manifest, aliases and
consumer bridge as one atomic revision. A generated artifact is never rolled
back independently. The previous accepted token set remains buildable during
the D-085 window of at least two minor releases and 90 days, whichever is later.
For the first D1 adoption, rollback removes the newly introduced canonical set
and restores the accepted legacy `tokens.css`, package export and `globals.css`
baseline; later rollbacks restore the complete preceding accepted canonical
set.

## 13. Phase 1 migration plan

### 13.1 Migration sequence

1. Freeze a byte/digest and visual baseline of the current token CSS and web
   shell without modifying it.
2. Add canonical source, schema, generator, manifest and tests without switching
   consumers.
3. Generate DARK/LIGHT artifacts and prove deterministic output/theme parity.
4. Add one explicit legacy alias layer mapping approved old variables to new
   semantics.
5. Replace conflicting raw feature colours and semantic z-index/motion values
   in `globals.css` only; preserve markup, layout and interaction behavior.
6. Keep component/layout one-offs under bounded temporary exceptions or their
   existing layout tokens until D2/D3 owns them.
7. Switch the package export from hand-maintained CSS to the generated CSS only
   after contract and visual evidence passes.
8. Remove aliases only after all Phase 1 consumers migrate and the D-085/D-086
   window expires.

### 13.2 Current value classification

| Legacy item                              | Classification                           | Planned treatment                                                       |
| ---------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| `--color-canvas/surface/surface-raised`  | aliasable but value-conflicting          | map to D-081 semantic backgrounds; approved theme values win            |
| `--color-surface-hover`                  | aliasable                                | map to reviewed interaction surface token                               |
| `--color-border*`                        | aliasable                                | default/emphasis mappings with contrast constraints                     |
| `--color-text*`                          | aliasable                                | map by meaning; disabled exception remains explicit                     |
| `--color-accent*`                        | deprecated/conflicting                   | map action/brand usage separately; no universal accent token            |
| `--color-positive/negative/warning/info` | aliasable with semantic split            | map only where existing use matches financial/status meaning            |
| `--font-sans/mono`                       | conflicting/temporary                    | compatibility aliases to approved family roles; Geist remains temporary |
| font-size/spacing/radius scales          | directly mappable or deprecated          | map value-for-value where approved; reject misleading name equivalence  |
| `--shadow-raised`                        | aliasable                                | map to theme-resolved elevation token                                   |
| sidebar/content sizes                    | intentionally retained                   | D3 layout ownership; exact exception/legacy namespace                   |
| raw alpha colours and button foreground  | accessibility defect/conflict candidates | replace with named semantic/composite tokens                            |
| raw z-index values                       | conflicting                              | map to approved layer tokens                                            |
| media queries and content geometry       | retained temporarily                     | outside semantic raw-value ban with bounded property rules              |

### 13.3 Expected D1 implementation changes

Only a separately approved D1 implementation may change:

- `packages/design-tokens/**`;
- root `package.json` only if an existing workspace command cannot invoke the
  approved D1 checks, and only for the exact D1 scripts recorded in the
  implementation allowlist;
- `packages/design-tokens/package.json` only for approved exports and D1-local
  scripts; no dependency may be added and `package-lock.json` remains unchanged;
- `apps/web/src/app/globals.css` for the bounded token bridge/raw-value cleanup;
- `apps/web/src/app/layout.tsx` is excluded by D-086; an unexpected need to
  change it stops implementation for a new scope decision;
- focused D1 validator/generator/contract tests and D1 documentation.

Explicitly excluded are component/page TSX, routes, browser behavior, backend,
contracts unrelated to design tokens, infrastructure, every other package,
lockfiles, adapters and Phase 2B. If this exact allowlist cannot support the
approved implementation, work stops for a separate scope decision.

### 13.4 Rollback and visual claims

The migration is one revertable foundation change. Before/after screenshots at
defined routes/viewports/theme scopes document impact, but D1 does not claim
pixel identity because the accepted brand palette intentionally replaces Phase
1 colours. Acceptance must prove unchanged DOM/interaction scope and readable,
accessible output rather than visual sameness.

## 14. Security and supply-chain boundary

- Token source and artifacts are local repository files; no runtime remote token
  loading exists.
- No user, tenant, provider or query value can select an arbitrary token value,
  CSS declaration, URL or font source.
- The generator performs no network access and uses pinned Node 24 plus reviewed
  repository code.
- Generation is deterministic across repeated runs and clean environments;
  manifests contain content digests, not wall-clock timestamps or machine paths.
- Committed generated artifacts are reviewed and drift-tested.
- Source, aliases, strings, arrays, graphs, shadows and total output have hard
  bounds; hostile fixtures fail closed.
- Generated CSS/TS contains no secret, environment variable, hostname, user data
  or untrusted text.
- CSP needs no runtime style injection or remote font to render a usable theme.
- Future third-party token tooling is untrusted build tooling: it needs a
  dependency/supply-chain review, pinned lockfile, no-network generation proof
  and an ADR update.

## 15. Documentation fixtures and later tests

Documentation examples define these deterministic implementation fixtures:

| Fixture                                  | Expected result                                |
| ---------------------------------------- | ---------------------------------------------- |
| complete valid token set                 | resolves both themes and byte-stable artifacts |
| missing DARK token                       | reject before generation                       |
| missing LIGHT token                      | reject before generation                       |
| circular alias                           | reject with finite cycle reason                |
| unknown alias                            | reject without fallback                        |
| duplicate token ID                       | reject                                         |
| invalid colour                           | reject                                         |
| invalid numeric scale/unit               | reject                                         |
| contrast failure                         | reject named pairing                           |
| semantic misuse                          | reject family/presentation rule                |
| breaking change without version          | reject compatibility diff                      |
| raw-value violation                      | reject exact file/property evidence            |
| valid migration alias                    | accept within window                           |
| expired escape hatch                     | reject                                         |
| hostile CSS string/URL/control character | reject before serialization                    |
| excessive token/alias graph              | reject at configured bound                     |

Later D1 tests include unit tests, schema/semantic negative tests, deterministic
generation replay, clean-checkout drift, cross-platform newline/order checks,
contrast property/boundary tests, theme parity, compatibility diff, raw scan,
fixture fault injection and frozen-scope scans.

## 16. Deliverables and implementation sequence

### D1-I1 — Contract and source scaffold

- approved D-079 through D-088 recorded;
- schema, canonical source and bounded validator;
- namespace/type/alias/version tests;
- no consumer switch.

### D1-I2 — Semantic/theme completion

- complete DARK/LIGHT maps, typography, layout-scale, status and chart
  presentation metadata;
- contrast and non-colour matrices;
- hostile and accessibility fixtures.

### D1-I3 — Deterministic artifacts and governance

- committed CSS/typed metadata/manifest;
- deterministic drift and compatibility checks;
- raw-value scanner and exact escape register.

### D1-I4 — Phase 1 compatibility migration

- approved legacy aliases;
- bounded `globals.css` semantic migration;
- no markup/page/component redesign;
- visual/contrast/rollback evidence.

These are review checkpoints inside one D1 implementation phase, not authority
to start them separately. The decision gate is approved, but implementation
still requires the separate Product Owner task described in section 20.

## 17. Observability and governance

D1 has build-time evidence, not production monitoring infrastructure. Validator
events/results use finite reason codes for schema failure, alias failure, theme
parity, contrast failure, compatibility break, raw violation, expired exception,
drift and generation success. File paths and token IDs may appear in bounded CI
diagnostics but never become runtime metric labels. Raw source content and full
generated assets are not copied into logs.

Owners:

- Design owns semantic meaning and visual values.
- Frontend Architecture owns schema, generation and compatibility mechanics.
- Accessibility owns pairings, contrast and redundant encodings.
- Security owns CSS-injection, CSP, build-tool and exception-boundary review.
- QA owns deterministic/visual evidence and independent acceptance reproduction.

## 18. Acceptance and freeze summary

The authoritative decomposition is
[`D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md`](D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md).
D1 freezes only when:

- all blocking D-079 through D-088 decisions are approved and versioned;
- canonical source, schema, validators and committed artifacts agree;
- DARK/LIGHT parity and every approved contrast pairing pass;
- status/chart non-colour matrices are complete;
- raw-value governance and compatibility rules are enforced;
- Phase 1 migration/rollback evidence is complete;
- BLOCKER = 0 and unresolved HIGH = 0;
- all authoritative repository checks pass;
- frozen adapters, accepted Phase 2B and brand files are unchanged;
- no component, page, font package or future-track implementation appears.

Passing D1 does not authorize D2 or D4.

## 19. Approved implementation decisions

D-079 through D-088 in `DECISIONS_REQUIRED.md` are approved. Their normative
details are in `D1_DESIGN_DECISIONS.md`:

- source/schema and generated-artifact policy;
- exact typography stacks and Geist compatibility;
- semantic values, pairings and contrast target;
- chart palette, encodings and maximum series;
- exact scales, semantic layers and bounds;
- raw-value exception ownership and lifetime;
- compatibility/deprecation/version policy;
- Phase 1 migration/safe default/rollback policy;
- forced-colour ownership split;
- rendered visual-regression scope.

The decision gate is closed and ADR-0013 is accepted. D1 is eligible for a
separate implementation approval; this plan does not itself authorize work.

## 20. Exact recommended implementation prompt

Use this prompt only when the Product Owner separately approves D1
implementation. D-079 through D-088 are approved and ADR-0013 is accepted:

```text
Read AGENTS.md and all frozen architecture, design, theme, security, roadmap,
decision, risk, acceptance, D1 planning and brand-reference documents
completely.

The Product Design, Commerce and Administration Architecture Amendment and the
D1 plan are frozen and approved. Verify that D-079 through D-088 contain exact
approved answers and ADR-0013 is Accepted. Stop without modifying files if any
D1 decision remains unresolved or contradicts the frozen contracts.

Implement D1 — Brand and Semantic Design Tokens only, following
docs/D1_DESIGN_DECISIONS.md,
docs/D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md and
docs/D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md.

Before modifying files: inspect the complete repository and git diff; verify
frozen adapter packages, accepted Phase 2B documents and docs/brand references
are unchanged; inspect the Phase 1 token/style consumers; present a concise
plan, expected files, migration boundary and blockers.

Implement only the approved canonical token source and schema, bounded
repository-native validation, deterministic DARK/LIGHT semantic resolution,
typography and foundation scales, financial/status/data-quality/capability and
chart presentation tokens, contrast-pair validation, version/compatibility
rules, raw-value scanner and exact escape register, approved deterministic
artifacts and manifest, fixtures/tests, and the bounded Phase 1 token-consumer
migration. SYSTEM is selection policy, not a third resolved set. Preserve
theme-independent financial meaning, require non-colour critical-state
encoding, install no font package and perform no page, component, DOM, route or
product redesign.

Do not begin D2, D4, I1, C1 or Phase 2B.1. Do not add application features,
charts, component libraries, runtime theme preference/picker behavior, remote
token/font loading, persistence, authentication, payments, admin runtime,
providers, exchange adapters or trading. Do not modify frozen packages,
accepted Phase 2B documents or brand images. If a compatibility blocker would
require such a change, stop and request a separate scope decision. Do not create
a commit.

Create implementation-produced evidence for later independent acceptance.
Run the complete authoritative D1 suite plus formatting, lint, TypeScript,
default Node tests, production build where affected, Markdown links,
deterministic regeneration/drift, schema/alias/theme/contrast/chart/raw-value/
compatibility/migration tests, git diff --check, documentation-only and
scope-isolation scans, frozen-package and Phase 2B checks, and brand hash checks
with pinned Node 24 where required.

At the end report: implementation summary; approved decisions applied; token
source/schema and artifact model; taxonomy; theme/typography/status/chart
contracts; contrast and raw-value evidence; version/compatibility behavior;
Phase 1 migration and rollback; files changed; commands and exact test counts;
security/accessibility decisions; limitations/risks; whether D1 can enter formal
independent acceptance; and the exact recommended D1 acceptance-review prompt.
Do not create a commit and do not begin another phase.
```
