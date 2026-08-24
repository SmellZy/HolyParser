# D1 Design Decisions acceptance

- **Review date:** 2026-08-16
- **Final status:** `PASS_WITH_WARNINGS`
- **Scope:** independent documentation acceptance of approved D-079 through
  D-088 only
- **D1 implementation authority:** **NOT GRANTED BY THIS REVIEW**

## 1. Executive verdict

The approved D1 decision package is coherent, bounded and implementable after
four HIGH documentation defects were corrected with the smallest compatible
clarifications. No approved palette value, font stack, chart tuple, scale,
resource limit, exception duration, compatibility duration, route or viewport
was replaced.

There are no remaining BLOCKER or HIGH findings. The package may be frozen as
the normative D1 decision baseline. D1 is eligible for a separate explicit
implementation task; this review does not begin or authorize that work.

Warnings are limited to deliberately deferred rendered-component evidence and
an unavailable clean repository execution environment during this
documentation-only review. Neither warning changes application behavior because
no application, test, dependency, package, lockfile or infrastructure file was
modified.

## 2. Reviewed scope

Reviewed completely:

- `AGENTS.md`;
- `D1_DESIGN_DECISIONS.md`;
- `DECISIONS_REQUIRED.md`;
- `D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md`;
- `D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md`;
- `D1_BRAND_AND_SEMANTIC_TOKENS_PLAN_ACCEPTANCE.md`;
- ADR-0013;
- `DESIGN_SYSTEM.md`;
- `THEME_ARCHITECTURE.md`;
- `ROADMAP.md`;
- `RISK_REGISTER.md`;
- `ACCEPTANCE_CRITERIA.md`;
- the governing frozen master, architecture, domain, API-contract, security,
  Product/Commerce/Admin acceptance and Phase 2B architecture records;
- all three files under `docs/brand/references/`.

Inspected without modification:

- `packages/design-tokens/package.json` and `tokens.css`;
- `apps/web/src/app/layout.tsx` and `globals.css`;
- the root, login, register, forgot-password and verify-email pages;
- the existing not-found, error and loading boundaries;
- the Phase 1 shell, auth and icon components.

The current implementation remains the accepted dark-only Phase 1 foundation:
hand-maintained legacy variables, Geist loading, orange general accent and raw
feature values still exist. They are migration inputs, not evidence that D1 has
started.

## 3. Finding classification and remediations

### 3.1 BLOCKER and unresolved HIGH

None.

### 3.2 Remediated HIGH findings

| ID        | Approved invariant at risk                                                                 | Defect found                                                                                                          | Smallest correction                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1-DD-H01 | D-079 requires byte-identical deterministic digests                                        | “every generated artifact” could require the manifest to hash itself, and digest encoding/path rules were unspecified | exclude the manifest from its own digest set; hash exact source/CSS/TypeScript bytes; require lowercase hex, sorted repository-relative POSIX paths                   |
| D1-DD-H02 | D-081 requires essential chart meaning to meet 3:1 and never rely on colour alone          | several intentional sequential/diverging/selection fills are below 3:1 but had no binding usage restriction           | classify them as area/fill-only, require legend/value or equivalent non-colour evidence, and prohibit use as standalone essential geometry                            |
| D1-DD-H03 | D-085 requires deterministic minimum and maximum compatibility behavior                    | the two-minor/90-day minimum could extend past the normal 180-day maximum without defined precedence                  | make the minimum gate authoritative; keep the alias and block a new token-set publication pending extension approval or completed prerequisites                       |
| D1-DD-H04 | D-086 requires an executable atomic rollback for the first migration as well as later sets | the initial rollback referred to a previous canonical source/artifacts/manifest that do not yet exist                 | define initial rollback as removal of the new canonical set plus restoration of legacy `tokens.css`, package export and `globals.css`; preserve normal later rollback |

The corrections are recorded consistently in the normative decision record,
the D1 plan, the D1 acceptance plan and ADR-0013. They remove impossible or
unsafe interpretations; they do not substitute a different product/design
choice.

### 3.3 MEDIUM and LOW findings

None requiring another decision amendment.

### 3.4 Accepted limitations

- Static D1 contracts cannot prove complete rendered component, theme-runtime
  or chart accessibility. D2, D4 and D5 retain those gates.
- `Mark` and `MarkText` are current CSS system colours, but actual user-agent
  forced-colour rendering remains a later rendered-evidence responsibility.
- Twelve-pixel dense typography has no WCAG size prohibition and remains
  contrast/zoom gated; D2/D5 must prove real dense interfaces remain usable.
- The repository's local Node processes stalled without output and Docker
  Desktop's content store returned an input/output error. Their aborted output
  is not acceptance evidence. Application code was unchanged, so the missing
  clean runtime rerun is accepted for this decision-only review and remains
  mandatory for D1 implementation.

## 4. D-079 verdict — source and artifacts

**PASS after remediation.** The ordered data-only JSON model is internally
sound:

- `src/token-set.meta.json` is the sole metadata authority for namespace,
  `schemaVersion`, `tokenSetVersion`, generator contract and artifact policy;
- initial schema/token-set versions are independently `1.0.0`;
- token and support records have stable sorted IDs while arrays preserve
  duplicate detection;
- aliases are complete-value references only;
- committed CSS, TypeScript metadata and manifest remain derived, read-only
  outputs rather than competing authorities;
- serialization is UTF-8 without BOM, LF, two-space indentation, stable field
  order, no trailing whitespace and one final newline;
- the corrected digest contract is non-recursive and byte-deterministic;
- Node 24 standard-library parsing, graph checks, hashing and serialization are
  realistic without network access or a new dependency;
- D-083 supplies finite mandatory resource bounds.

The schema is a repository-owned machine-readable contract; implementation may
write bounded validation against it with standard-library code and is not
silently dependent on a third-party general-purpose JSON Schema engine.

## 5. D-080 verdict — typography

**PASS.** All three stacks are valid ordered CSS family contracts and remain
usable when their preferred families are absent. D1 installs or fetches no
font. Existing Geist and `layout.tsx` stay untouched.

The 12–48px scale, line heights and weights 400/500/600/700 are finite and
coherent. Ordinary body/interactive text is at least 14/20; 12/16 is limited to
dense data. Financial values require tabular numerals and stable width. Decimal
alignment is a structured layout contract, never inserted spaces. Font loading
cannot change amount, sign, decimal point or unit correctness.

## 6. D-081 verdict — palette and contrast

**PASS.** An independent WCAG relative-luminance recomputation expanded every
legal pair named by D-081:

- 162 theme-specific pair checks executed;
- 162 passed and 0 failed;
- minimum required-text ratio was 4.547:1 for LIGHT `text.muted` on
  `background.base`;
- minimum action-text ratio was 4.592:1 for LIGHT `text.inverse` on
  `action.primary`;
- minimum essential-boundary/focus ratio was 3.080:1 for DARK
  `border.emphasis` on `background.elevated`.

The matrix covers primary/secondary text on six surfaces, muted text on its four
legal surfaces, inverse action text, link plus every non-disabled
financial/status/quality/capability foreground on three legal surfaces, and
emphasis/focus against both approved surfaces in both themes. Arbitrary
pairings remain prohibited.

The alpha scrims composite deterministically over only the six approved
surfaces; no text is legal directly on a scrim, and required overlay content
uses opaque `background.elevated`. Disabled colours carry no required
information. Brand blue is not financial positive. Equal raw values do not
merge informational, active, outcome, capability or quality identities.

## 7. D-082 verdict — chart encodings

**PASS after remediation.** Independent parsing verified eight records in
strict series order. LIGHT colours, DARK colours, markers, dash patterns and
complete tuples are each 8/8 unique. Every categorical colour exceeds 3:1
against its theme canvas; the minimum is 4.592:1 for LIGHT series 1.

The ninth series fails with `CHART_SERIES_CAPACITY_EXCEEDED`; silent reuse is
forbidden. Sequential luminance is strictly descending in LIGHT and ascending
in DARK. The diverging scales have explicit zero-neutral centres. Long/short,
bid/ask and positive/negative remain different concepts; mark/index/reference
remain distinguishable; stale/gap/missing/uncertainty/anomaly have redundant
geometry or labels.

The independent audit also measured adjacent sequential-stop contrast between
1.243:1 and 2.418:1 and canvas contrast as low as 1.138:1. These are acceptable
only after the D1-DD-H02 correction: the stops and low-contrast selection fill
are bounded fill scales, not essential standalone geometry, and require
non-colour/legend evidence. No chart library is selected.

## 8. D-083 verdict — scales and bounds

**PASS.** Spacing, icon, control, border, radius, opacity, motion, easing,
elevation and semantic-layer sets are finite. A visible 32px control is
compatible with a 44×44 hit target through a larger non-overlapping wrapper or
hit area; D2 must prove the rendered target. `pill=9999px` is an explicit
allowlisted dimension and remains valid under the structured grammar.

Reduced-motion `0ms` is the semantic resolved value. The legacy `0.01ms`
browser-safety constant is a separately scoped scanner exclusion and cannot
enter the motion scale by numeric similarity. Layers 0 through 80 provide
ordered semantic slots without authorizing arbitrary z-index. Page and
component geometry remains outside D1.

All approved source, node, key, token, support-record, alias, identifier,
string, font, shadow, file, output and diagnostic limits are finite and
implementable. Limit exhaustion fails before publication and diagnostics stop
at 200 without reproducing hostile input.

## 9. D-084 verdict — raw-value governance

**PASS.** Frontend Architecture owns the registry; Design, Accessibility and
Security approvals are required by affected semantics. Product Owner is not a
routine bypass approver. Records match one exact file/property/value, have all
required ownership/audit/expiry fields, last at most 30 days plus one reviewed
30-day renewal and are never permanent.

Broad paths/globs, widened matches and generated-code exemptions are prohibited.
Expired, orphaned, widened and unused records fail CI. The technical constants
are a closed category list and must also match a finite property-context table;
their spelling alone grants no exemption.

## 10. D-085 verdict — versioning

**PASS after remediation.** Independent SemVer 2.0.0 versions begin at `1.0.0`.
Patch/minor/major classifications are compatible, and semantic meaning changes
are always major even if bytes remain equal. Direct replacement chains have
maximum length one.

Aliases remain for at least two subsequent minor releases and 90 days,
whichever is later. The corrected precedence prevents the 180-day governance
checkpoint from authorizing premature removal. Removal additionally requires a
major release, migrated consumers, no exception references and migration plus
rollback notes. The previous accepted set remains reproducible and rollback is
atomic.

## 11. D-086 verdict — Phase 1 migration

**PASS after remediation.** DARK is consistent with the current Phase 1
`color-scheme: dark` shell and is safe until D4. Explicit LIGHT remains testable
without implementing SYSTEM, storage, a picker or bootstrap.

The migration can complete through the token package and `globals.css` without
changing `layout.tsx`, Geist packages, TSX, DOM, routes, navigation,
breakpoints, responsive behavior or page geometry. The consumer-switch gate
requires all D1 contract, test, build and visual evidence before export change.
Aliases cannot outlive D-085.

Initial and later rollback are now both exact: first adoption removes the new
canonical files and restores the legacy CSS/export/bridge; later rollback
restores the complete preceding accepted canonical set. Any discovered need for
`layout.tsx`, lockfile, dependency or out-of-allowlist change is a stop
condition.

## 12. D-087 verdict — forced colours

**PASS.** The ten-value `systemColor` enum is closed and compatible with the
structured D-079 grammar. `Canvas`, `CanvasText`, `ButtonFace`, `ButtonText`,
`Highlight`, `HighlightText`, `GrayText`, `LinkText`, `Mark` and `MarkText` are
defined CSS system colours. The current W3C CSS Color Level 4 and CSS Color
Adjustment Level 1 documents were retrieved on 2026-08-16:

- <https://www.w3.org/TR/css-color-4/#css-system-colors>;
- <https://www.w3.org/TR/css-color-adjust-1/#forced>.

Required role mappings, a two-part focus indicator and label/icon/shape status
redundancy are explicit. Arbitrary system-colour strings cannot enter the
source, and `forced-color-adjust: none` remains prohibited by default. D1 owns
static closure/completeness; D2, D4 and D5 retain rendered control, runtime and
chart evidence.

## 13. D-088 verdict — visual evidence

**PASS.** Five concrete Phase 1 routes exist, and the sixth approved URL
(`/d1-missing-route`) deterministically exercises the existing custom
`not-found.tsx` boundary:

```text
/
/login
/register
/forgot-password
/verify-email
/d1-missing-route
```

Six routes × two viewports produce 12 DARK baseline screenshots. Six routes ×
two viewports × two explicit themes produce 24 result screenshots: 36 primary
route captures total. The 390×844 and 1440×900 CSS-pixel viewports at DSF 1 are
bounded and reproducible.

Zoom, keyboard focus, pseudo-localization, preferred-font-unavailable,
forced-colour, machine contrast and chart completeness evidence are separately
bounded. A non-shipping harness can collect them with existing browser tooling;
no dependency is required. Pixel identity is correctly rejected because the
palette changes intentionally. Only token-driven presentation change is
authorized.

## 14. ADR-0013 and cross-decision consistency

**PASS after remediation.** ADR-0013 remains legitimately `Accepted`. Its
canonical-source and independent-version choices exactly match corrected D-079
and D-085.

Cross-checks pass:

- D-079's closed structured grammar explicitly accommodates D-087
  `systemColor` enums;
- D-080 preserves Geist exactly as required by D-086;
- D-081 legal-pair rules now constrain D-082 low-contrast fill usage;
- D-083 bounds apply to D-079 source and diagnostics;
- D-084 exceptions cannot bypass D-086 migration scope;
- D-085 window precedence and D-086 rollback/removal are deterministic;
- D-081 machine contrast complements rather than relies on D-088 screenshots;
- no convenience rule overrides an approved normative decision.

## 15. Implementation readiness

All D1 decision choices are closed. The canonical source, schema, artifacts,
themes, typography, status/chart semantics, accessibility rules, scales,
governance, compatibility, migration, forced-colour contract and evidence scope
are deterministic and bounded. Required D1 evidence is achievable without a new
dependency or any D2/D4/D5 implementation.

The exact future implementation allowlist remains:

- `packages/design-tokens/**`;
- D1-local validator/generator/fixture/test files;
- `apps/web/src/app/globals.css` for the approved bridge only;
- root/design-token package scripts only if needed to invoke existing tooling,
  with no dependency or lockfile change;
- D1 implementation/evidence documentation.

Everything else remains a stop condition. Eligibility is not authority: a new
Product Owner implementation task is required.

## 16. Verification evidence

### 16.1 Completed checks

Executed with the pinned workspace Node path where JavaScript was required:

```text
/Users/dima/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --version
node node_modules/prettier/bin/prettier.cjs --check <repository-configured files>
node node_modules/prettier/bin/prettier.cjs --check <review-touched documents>
node <independent D-081 contrast and D-082 chart audit from stdin>
node <Markdown/local-link validator from stdin>
git diff --check
git status --short
git diff --quiet -- <frozen adapter paths>
git diff --quiet -- <accepted Phase 2B paths>
git diff --quiet -- <frozen Product/Commerce/Admin core paths>
shasum -a 256 docs/brand/references/*.png
```

| Check                                      | Result                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| repository and current diff inspection     | PASS; pre-existing decision work is documentation-only                   |
| independent D-081 matrix                   | PASS: 162/162 legal pairs, 0 failures                                    |
| independent D-082 tuple check              | PASS: 8/8 unique LIGHT colours, DARK colours, markers, dashes and tuples |
| categorical series/canvas check            | PASS: 16/16, minimum 4.592:1                                             |
| sequential scale order                     | PASS: strict monotonic order in both themes; low-contrast use remediated |
| exact route/source inspection              | PASS: five pages plus custom not-found path                              |
| frozen adapter/package diff                | PASS: no differences                                                     |
| accepted Phase 2B plan/acceptance/ADR diff | PASS: no differences                                                     |
| frozen Product/Commerce/Admin core diff    | PASS: no differences outside accepted D1 cross-cutting records           |
| brand-reference SHA-256                    | PASS: all three accepted hashes match                                    |
| `git diff --check`                         | PASS                                                                     |
| documentation/implementation scope scan    | PASS: no application, test, manifest, lockfile or infrastructure changes |
| Markdown/local-link validation             | PASS: 57 files, 28 local links, 0 missing                                |
| repository-configured formatting set       | PASS with pinned Node 24.19.0 and Prettier 3.9.6                         |
| formatting of review-touched documents     | PASS                                                                     |

A supplemental all-`docs/**/*.md` Prettier scan also identified four unchanged
legacy files outside this task (`PHASE_1.md`, `ARCHITECTURE.md`,
`PHASE_0_DECISIONS.md` and `MASTER_SPEC.md`). No current-review file fails.
Those unrelated historical differences were preserved rather than broadened
into this acceptance task.

Accepted brand hashes:

- `holyparser-dark.png`:
  `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08`;
- `holyparser-design-system.png`:
  `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54`;
- `holyparser-logo-system.png`:
  `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c`.

### 16.2 Unavailable authoritative application rerun

Pinned Node `v24.19.0` is within the repository engine range. Direct lint,
typecheck and Vitest attempts stalled on their first process without output and
were terminated; no partial result is counted. Docker reported version 29.2.1,
but image inspection failed with a containerd content-store input/output error,
so Docker was not used as substitute evidence. No exchange canary was run.

Because this review changed documentation only and scope/frozen checks pass,
this is an `ACCEPTED_LIMITATION`, not evidence of an implementation failure. A
clean authoritative lint/typecheck/default-test run remains mandatory before
and after D1 implementation.

## 17. Freeze recommendation

Freeze D-079 through D-088 and this acceptance report. There are zero BLOCKER
and zero unresolved HIGH findings. ADR-0013 remains `Accepted`. D1 implementation
may proceed only under the separate exact task below.

## 18. Exact recommended D1 implementation prompt

```text
Read AGENTS.md and all frozen architecture, design, theme, security, roadmap,
decision, risk, acceptance, D1 planning, D1 decision acceptance and
brand-reference documents completely, including:

- docs/D1_DESIGN_DECISIONS.md
- docs/D1_DESIGN_DECISIONS_ACCEPTANCE.md
- docs/D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md
- docs/D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md
- docs/D1_BRAND_AND_SEMANTIC_TOKENS_PLAN_ACCEPTANCE.md
- docs/adr/0013-design-token-source-and-versioning.md
- docs/DESIGN_SYSTEM.md
- docs/THEME_ARCHITECTURE.md
- docs/DECISIONS_REQUIRED.md
- docs/RISK_REGISTER.md
- docs/ACCEPTANCE_CRITERIA.md

The Product Design, Commerce and Administration Architecture Amendment, D1
planning package and D-079 through D-088 decision package are frozen and
approved. ADR-0013 is Accepted. I authorize implementation of D1 — Brand and
Semantic Design Tokens only.

Before modifying files: inspect the complete repository and git diff; verify
frozen adapters, accepted Phase 2B documents and brand hashes are unchanged;
inspect all Phase 1 token/style consumers; present a concise implementation
plan, exact file allowlist, migration inventory, rollback boundary and blockers.
Stop without changes if a frozen contract is contradicted or implementation
requires layout.tsx, TSX/DOM/routes, a dependency, lockfile, infrastructure or
another out-of-scope file.

Implement exactly the approved ordered data-only JSON source set, sole metadata
authority, schema, bounded Node 24 standard-library validator, complete-value
alias resolver, deterministic DARK/LIGHT resolution, typography and finite
foundation scales, financial/status/quality/capability presentations, chart
encodings and fill-only constraints, contrast allowlist, raw-value scanner and
exception registry, independent version/compatibility rules, committed CSS and
TypeScript artifacts, and the non-self-hashing SHA-256 manifest. Preserve
SYSTEM as selection metadata only. Add deterministic fixtures and focused tests.

Perform only the D-086 bridge in apps/web/src/app/globals.css after every
consumer-switch gate passes. Keep DARK as the safe default, Geist and
layout.tsx unchanged, and preserve markup, copy, routes, DOM, interaction,
responsive behavior and geometry. Capture the exact D-088 evidence. Rehearse
the explicit initial-adoption rollback.

Do not implement D2, D4, D5, I1, C1 or Phase 2B.1. Do not add components,
charts, pages, theme preference/runtime, fonts, dependencies, persistence,
authentication, commerce, admin runtime, exchange work or trading. Do not
modify frozen packages, accepted Phase 2B documents or brand images. Do not
create a commit.

Run pinned Node 24 formatting, lint, type checking, all default tests and
required production builds; D1 schema/alias/theme/contrast/chart/raw-value/
compatibility/resource/fault/determinism tests; clean-directory regeneration
and drift; Markdown links; git diff --check; scope/frozen checks; brand hashes;
and the exact D-088 visual/accessibility evidence. Treat implementation-produced
evidence as pre-acceptance only.

At the end report: implementation summary; decisions applied; exact source,
schema and artifact model; theme, typography, status and chart contracts;
contrast and raw-value results; versioning and migration/rollback; files
changed; commands and exact test counts; visual evidence; security and
accessibility results; limitations; whether D1 can enter formal independent
acceptance; and the exact recommended D1 acceptance-review prompt. Do not begin
another phase.
```
