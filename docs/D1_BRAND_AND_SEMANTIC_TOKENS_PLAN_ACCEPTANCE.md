# D1 Brand and Semantic Design Tokens planning acceptance

- **Review date:** 2026-08-16
- **Final status:** `PASS_WITH_WARNINGS`
- **Scope:** independent documentation and architecture acceptance of the D1
  planning package only
- **Implementation authority:** **NOT GRANTED**

## 1. Executive verdict

The D1 planning package is coherent, independently implementable after its
decisions are approved, and may be frozen as a planning baseline. Seven HIGH
documentation defects found during review were corrected without selecting
token values, resolving D-079 through D-088, changing application code or
changing ADR-0013 from `Proposed`.

There are no remaining BLOCKER or HIGH architecture findings in the planning
package. D1 implementation remains blocked because D-079 through D-088 have not
been approved and ADR-0013 therefore cannot yet be accepted. The warnings are
decision dependencies and deliberately deferred rendered-component evidence,
not permission to choose defaults during implementation.

## 2. Reviewed scope and evidence

Reviewed completely:

- `AGENTS.md`;
- `D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md`;
- `D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md`;
- ADR-0013;
- `DESIGN_SYSTEM.md`;
- `THEME_ARCHITECTURE.md`;
- `PRODUCT_COMMERCE_ADMIN_ARCHITECTURE_ACCEPTANCE.md`;
- `MASTER_SPEC.md`;
- `ROADMAP.md`;
- `DOMAIN_MODEL.md`;
- `API_CONTRACTS_PLAN.md`;
- `SECURITY_MODEL.md`;
- `RISK_REGISTER.md`;
- `DECISIONS_REQUIRED.md`;
- `ACCEPTANCE_CRITERIA.md`.

The frozen Product/Commerce/Admin architecture documents, ADR-0010 through
ADR-0012, Phase 1 planning/acceptance material, frozen Phase 2A packages and
acceptance records, accepted Phase 2B plan/acceptance/ADR-0009, and all three
brand references were checked as boundaries.

Inspected Phase 1 source consumers without modifying them:

- `packages/design-tokens/package.json`;
- `packages/design-tokens/tokens.css`;
- `apps/web/src/app/globals.css`;
- `apps/web/src/app/layout.tsx`;
- `apps/web/src/components/app-shell.tsx`;
- `apps/web/src/components/auth-card.tsx`;
- `apps/web/src/components/auth-fields.tsx`;
- `apps/web/src/components/icon.tsx`;
- all current `apps/web/src/app/**/{page,error,loading,not-found}.tsx` files.

The existing implementation is a dark-only Phase 1 compatibility foundation:
legacy `--color-*` variables, Geist imports, orange general accent, raw
RGB/alpha effects, raw z-index values, component geometry and media thresholds
remain present. That inventory agrees with the D1 migration plan and is not a
D1 implementation defect.

## 3. D1 scope verdict

**PASS.** D1 is limited to canonical token data, schema/validation, aliases,
deterministic artifacts, independent versions, DARK/LIGHT resolution,
foundation scales, presentation semantics, contrast, raw-value governance,
the Phase 1 token bridge, security/accessibility checks and rollback evidence.

The plan does not authorize pages, components, navigation, application shells,
charts, preference storage, runtime theme picker, fonts, identity, commerce,
analytics, persistence, backend services or providers. A token-value change is
explicitly not authority to alter markup, layout, copy or interaction.

The future D1 implementation allowlist is now exact. It excludes lockfiles,
infrastructure, other packages, TSX consumers except a separately approved
minimal `layout.tsx` font-compatibility change, frozen adapters, Phase 2B and
brand assets. A blocker outside that allowlist requires a new scope decision.

## 4. Token source and schema verdict

**PASS after remediation.** Ordered data-only JSON records remain a sound
recommendation because duplicates survive parsing, input cannot execute code,
and repository-native Node 24 validation needs no new dependency.

The proposed canonical source is now an atomic source set:

- `src/token-set.meta.json` is the proposed authority for `schemaVersion`,
  `tokenSetVersion`, namespace and artifact policy;
- `src/tokens.source.json` is the ordered token record set;
- contrast, status and chart source files carry governed support records;
- the generated manifest reports source versions/digests but cannot invent
  them.

Every proposed token record explicitly carries ID, `PRIMITIVE`/`SEMANTIC` kind,
family, type, structured literal/alias, theme values, documentation,
accessibility and lifecycle metadata. The validation plan rejects malformed or
oversized input, duplicate/unsorted IDs, namespace disagreement, unknown
fields/types/families, incomplete themes, alias cycles/depth/cross-type edges,
unsafe CSS, URL/import/control characters and output collisions.

Exact numeric limits are intentionally unanswered by D-079/D-083. No bound was
guessed during this review.

## 5. Taxonomy verdict

**PASS after remediation.** Primitive, background, surface, border, text,
action, neutral interaction, focus, financial outcome, system status, data
quality, capability, chart, typography and layout-scale families are distinct.

Brand/action emphasis is not positive outcome; positive/negative is not
long/short; bid/ask is not buy/sell; warning is not stale;
research-required is not warning; action-primary is not informational. Legacy
architecture shorthand may become only an approved one-way compatibility
mapping under D-081/D-085 and cannot merge those meanings.

## 6. DARK, LIGHT and SYSTEM verdict

**PASS.** DARK and LIGHT are the only independently authored resolved maps and
must have identical IDs/types. SYSTEM is selection preference, not a third
map. Missing resolution, type mismatch or runtime colour arithmetic fails.
Financial meaning remains theme-independent.

D1 defines only generated scopes and an approved safe fallback. D-086 selects
that fallback; D4 owns persisted/system preference, CSP-safe no-flash startup
and runtime selection. The accepted initial theme values are inputs to D-081,
not implicit approval of every expanded D1 value.

## 7. Typography verdict

**PASS.** Heading, UI and data roles, tabular numerals, non-space decimal
alignment, stable live-value widths, dense roles, zoom/localization and fallback
evidence are explicit. Space Grotesk and Inter remain preferences; no package,
font file or remote font is authorized. D-080 owns target stacks and metric
limits; D-086 owns only the Phase 1 Geist migration timing and rollback.

## 8. Status and chart verdict

**PASS.** HEALTHY, ACTIVE, positive, negative, WARNING, CRITICAL,
INFORMATIONAL, UNKNOWN, STALE, GAPPED, RECONNECTING, UNSUPPORTED, UNVERIFIED,
RESEARCH_REQUIRED, INVALID, LOCKED, CROSSED and DISABLED have presentation-only
contracts for semantic colour, localizable label, icon, marker/shape,
accessible description and chart pattern where relevant. Domain meanings are
not redefined and no critical state relies on colour alone.

The chart plan covers categorical, sequential, diverging, outcome, bid/ask,
long/short, price references, thresholds, anomalies, focus/mute, bad/missing
intervals and chart chrome. D-082 must approve the finite series maximum,
ordered encodings and typed overflow behavior. No chart library is selected.

## 9. Accessibility and contrast verdict

**PASS_WITH_WARNINGS.** The WCAG 2.2 AA foundation matrix specifies 4.5:1 for
normal required text and 3:1 for large text, essential graphics/boundaries and
focus. It covers both themes, interaction states, tables, charts, tooltips,
overlays, alpha compositing, keyboard focus and reduced motion. Only allowlisted
pairings are legal; token existence does not authorize arbitrary combinations.

Forced-colour values now use a closed `systemColor` grammar rather than
conflicting with the hex-only colour grammar. D-087 still must approve exact
roles and the D1 versus D2/D4/D5 evidence split. Static D1 checks correctly do
not claim complete component accessibility.

## 10. Raw-value governance verdict

**PASS.** The planned scan is property-aware and covers colour, alpha, spacing,
radius, shadow, motion, typography and semantic layers without treating SVG
geometry, percentages, grid counts, media thresholds or reviewed layout
constants as tokens.

Exceptions require stable ID, exact file/property/pattern, reason, owner,
approver, issue, creation date, expiry/target and cleanup criterion. Broad,
permanent, unowned, expired, orphaned, widened and unused exceptions fail.
Alternate colour syntaxes and TS strings within approved scope cannot bypass
the plan. D-084 remains the authority for exact ownership and maximum lifetime.

## 11. Versioning, compatibility and rollback verdict

**PASS after remediation.** `schemaVersion` and `tokenSetVersion` are separate
canonical inputs. Additive, deprecated, alias, rename, removal, type, meaning,
theme-value and schema changes have testable classifications. A meaning change
is always breaking; changed output without the required version fails.

Replacement chains and aliases are bounded, one-way and expiring. The previous
accepted source set remains buildable during the approved window. Rollback
restores metadata, all sources, generated artifacts, manifest and aliases as one
foundation revision. D-085 still owns exact formats and durations.

## 12. Phase 1 migration verdict

**PASS.** The actual Phase 1 values are classified as directly mappable,
aliasable, conflicting/deprecated, one-off/accessibility candidates or retained
layout constants. The order is safe: baseline, source/schema, artifacts,
aliases, bounded semantic cleanup, retained D3 geometry, export switch and
eventual alias removal.

No TSX/DOM/route/navigation/responsive redesign is necessary or authorized.
The plan does not claim pixel identity. D-086/D-088 must approve safe default,
exact aliases/exceptions, baseline routes/viewports and evidence thresholds.
Rollback is atomic at the token-foundation revision.

## 13. Security and supply-chain verdict

**PASS.** Remote/runtime loading, untrusted values, arbitrary CSS, URL/import
injection, external-font correctness dependency, networked generation,
environment-dependent output and secrets are prohibited. Structured grammars,
bounded source/alias/string/shadow/file/output sizes, deterministic local
generation and digest checks define the trust boundary. Future third-party
token tooling requires separate review and an ADR change. CSP compatibility is
limited to “no new unsafe source”; it does not overclaim D4 bootstrap behavior.

## 14. D-079 through D-088 completeness verdict

**PASS for decision review; all remain unresolved.** A review matrix now gives
each decision explicit alternatives, implementation gate, distinct production
gate and affected acceptance evidence. Ownership overlaps are separated:
D-079 owns representation/artifact authority, D-085 version compatibility,
D-080 typography target, D-086 Geist migration, and D-083 includes Security for
validator bounds.

The authorities must still record exact choices, rejected alternatives,
effective dates and evidence. Recommendations are not approvals.

## 15. R-120 through R-130 completeness verdict

**PASS after remediation.** Every risk records impact, trigger, prevention,
detection, recovery, residual risk and owning phase. The added control matrix
names accountable authorities, internal implementation checkpoints and formal
acceptance evidence. R-130 explicitly treats layer/focus and
motion/reduced-motion as independently failing controls.

## 16. Acceptance-plan verdict

**PASS after remediation.** The plan separates implementer evidence from
independent proof, uses BLOCKER/HIGH/MEDIUM/LOW/ACCEPTED_LIMITATION, and now
records evidence subtypes that distinguish architecture, pending decisions,
implementation, deferred rendering, source/artifact drift, token/rendered
accessibility and scope/approved migration.

Freeze explicitly requires zero BLOCKER and unresolved HIGH, approved
D-079…D-088, accepted ADR-0013, deterministic artifacts, parity, contrast,
status/chart/raw-value/compatibility/migration/rollback evidence and unchanged
frozen boundaries.

## 17. Findings and remediations

### BLOCKER and unresolved HIGH

None after the documentation remediations below.

### Remediated HIGH findings

| ID        | Defect                                                                                   | Smallest correction                                                       |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| D1-AR-H01 | generated manifest was the only proposed home for source versions                        | added canonical `token-set.meta.json` and atomic source-set rules         |
| D1-AR-H02 | token record did not explicitly represent primitive/semantic kind and family             | made `kind` and `family` required and validation-visible                  |
| D1-AR-H03 | forced-colour roles conflicted with a hex-only colour grammar                            | added closed, allowlisted `systemColor` representation gated by D-087     |
| D1-AR-H04 | surface and neutral interaction semantics were folded into background/action             | split both token families without approving names or values               |
| D1-AR-H05 | decisions lacked explicit alternatives, production gates and acceptance evidence         | added the D-079…D-088 decision-review matrix and clarified ownership      |
| D1-AR-H06 | risks lacked accountable owners and implementation/acceptance checkpoints                | added the R-120…R-130 ownership/evidence matrix                           |
| D1-AR-H07 | acceptance classification/freeze could conflate evidence and did not repeat the ADR gate | added evidence subtypes and explicit `ADR-0013 Accepted` freeze criterion |

### MEDIUM and LOW findings

None requiring a planning-document change. Exact values and limits are pending
decisions, not hidden defects.

### Accepted limitations

- Exact token values, scales, bounds, series maximum, exception lifetime,
  compatibility window and safe default await D-079…D-088.
- D1 static contracts cannot prove complete component accessibility.
- Full forced-colour rendering, no-flash preference runtime and chart rendering
  remain D2/D4/D5 responsibilities.
- D1 uses bounded existing-shell screenshots unless D-088 separately approves
  tooling; it does not claim pixel identity or broad visual coverage.
- System font metrics vary across platforms; D1 can test a reviewed envelope,
  not eliminate that variance.
- This host has an ancestor `/Users/dima/node_modules/.bin/node` at Node 22.6
  that contaminates nested `npm run` PATH resolution. The aborted host run is
  not acceptance evidence; the clean repository quality image is authoritative.

## 18. Verification results

Host formatting and documentation checks used pinned Node `v24.18.1` and npm
`11.16.0`. The authoritative repository suite ran from a clean
`node:24.18.0-alpine` quality image. Exact final results:

| Command/check                                                                                      | Result                                                                                                    |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run format:check` with pinned host Node 24                                                    | PASS; every configured file matched Prettier                                                              |
| `docker build --target quality -f infra/docker/quality.Dockerfile -t holyparser-d1-plan-quality .` | PASS; clean `npm ci`, formatting, lint, typecheck, tests and production builds                            |
| authoritative lint                                                                                 | PASS across contracts, market-data, OKX, Binance USDⓈ-M, Bybit and web workspaces                         |
| authoritative TypeScript checking                                                                  | PASS across the same six workspaces                                                                       |
| authoritative default Node tests                                                                   | PASS: 264 tests; 3 opt-in live-canary tests skipped; 33 test files passed and 3 skipped                   |
| authoritative production builds                                                                    | PASS: five TypeScript packages and the Next.js web application; 6 static web routes generated             |
| Markdown/local-link validation                                                                     | PASS: 20 local links across 54 Markdown files                                                             |
| `git diff --check`                                                                                 | PASS                                                                                                      |
| documentation-only allowlist                                                                       | PASS; every changed/untracked path is under `docs/`                                                       |
| frozen adapter diff                                                                                | PASS: no differences                                                                                      |
| accepted Phase 2B diff                                                                             | PASS: no differences                                                                                      |
| frozen Product/Commerce/Admin core diff                                                            | PASS; only the already planned D1 cross-reference additions exist in design/theme cross-cutting documents |
| brand-reference diff and SHA-256 comparison                                                        | PASS: all three files unchanged and hashes match                                                          |

An initial host `npm run lint/typecheck/test/build` attempt was stopped and
discarded after npm exposed the ancestor Node 22.6 PATH contamination. No failed
or partial host result is counted above.

No exchange canary was run because this was a documentation-only review.

## 19. Scope-isolation evidence

- Frozen `packages/market-data`, OKX, Binance USDⓈ-M and Bybit adapter package
  diffs: clean.
- Accepted Phase 2B plan, acceptance and ADR-0009 diffs: clean.
- Brand reference diffs: clean; SHA-256 values match the accepted register:
  - `holyparser-dark.png`:
    `e4a53ef99d5b38b77300eb923bc2c6cdb5e4cd4c1d942fa63c49f111090dbe08`;
  - `holyparser-design-system.png`:
    `459f2354c5c953b44b391feb8b6d3b61cef709942935db12c9cb5ee467a68c54`;
  - `holyparser-logo-system.png`:
    `5050e13e5149b5638982ef4845b67a1d6e48af5e29d81199f5d67595a6482a8c`.
- No application source, test, dependency, manifest, lockfile, infrastructure,
  frozen adapter, accepted Phase 2B document or brand image was changed by this
  review.
- ADR-0013 remains `Proposed`.

## 20. Freeze and authorization recommendation

The D1 planning package **may be frozen** with this acceptance report.
D-079 through D-088 are complete enough for their authorities to decide, but
are not approved. ADR-0013 **may not** be accepted yet. D1 implementation **may
not** begin until all ten decisions are recorded and ADR-0013 is reconciled and
accepted in a separate documentation-only decision task.

## 21. Exact recommended next task

```text
Read AGENTS.md and all frozen architecture, design, theme, security, roadmap,
decision, risk, acceptance, D1 planning and brand-reference documents
completely, including:

- docs/D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md
- docs/D1_BRAND_AND_SEMANTIC_TOKENS_ACCEPTANCE_PLAN.md
- docs/D1_BRAND_AND_SEMANTIC_TOKENS_PLAN_ACCEPTANCE.md
- docs/adr/0013-design-token-source-and-versioning.md
- docs/DECISIONS_REQUIRED.md

The D1 planning package is frozen and accepted. Perform a documentation-only
product/design/accessibility/frontend-architecture/security decision task for
D-079 through D-088.

For every decision, record the exact approved choice, rejected alternatives,
authority names or roles, approval date, implementation gate, production gate
and affected acceptance evidence. Decide the canonical source set and artifact
policy; typography stacks and Geist compatibility; exact DARK/LIGHT semantic
values and legal contrast pairings; chart palette/encodings/series maximum;
foundation scales and validator bounds; raw-value exception governance;
versioning/deprecation window; Phase 1 migration/safe default/rollback;
forced-colour responsibility; and rendered visual-evidence scope.

Do not infer approval. If an authorized owner has not supplied a required
choice, leave that decision BLOCKING and report it. Update ADR-0013 to Accepted
only if all decisions that govern it are approved consistently; otherwise keep
it Proposed or supersede it explicitly. Reconcile cross-document references
without implementing tokens, CSS, generators, validators, fixtures,
components, theme runtime or fonts.

Do not modify application source, tests, manifests, lockfiles, infrastructure,
frozen adapters, accepted Phase 2B documents or docs/brand images. Do not add
dependencies. Do not begin D1 implementation, D2, D4, I1, C1 or Phase 2B.1. Do
not create a commit.

Run documentation formatting, lint, TypeScript checking, default Node tests,
Markdown/local-link validation, git diff --check, documentation-only scope,
frozen-package, accepted Phase 2B and brand-hash checks with pinned Node 24.

At the end report: decisions approved; decisions still blocked; exact values
and policies recorded; ADR-0013 status and rationale; documents changed;
verification results; whether D1 implementation is now eligible for separate
approval; and the exact recommended D1 implementation prompt without starting
implementation.
```
