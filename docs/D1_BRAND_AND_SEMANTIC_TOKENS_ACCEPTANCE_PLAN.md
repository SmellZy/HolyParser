# D1 — Brand and Semantic Design Tokens acceptance plan

- Status: **FORMAL ACCEPTANCE PLAN — NO IMPLEMENTATION AUTHORITY**
- Scope date: 2026-08-16
- Governing plan:
  [`D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md`](D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md)
- Required independent review: after a separately approved D1 implementation

## 1. Acceptance model

D1 has two evidence stages:

1. **Implementation-produced pre-acceptance evidence.** The implementer records
   exact files, decisions, generated digests, tests, migration evidence and
   limitations. This is not proof of acceptance.
2. **Formal independent acceptance.** A reviewer reproduces the source,
   generation, validation, accessibility, compatibility, migration, security
   and scope-isolation evidence without trusting the implementation report.

Formal acceptance may fix only D1 BLOCKER or HIGH findings with the smallest
correct change and a focused regression test. It may not refactor components,
redesign pages, add dependencies or begin D2/D4.

## 2. Accepted implementation scope

The acceptance candidate may contain only:

- canonical token-set metadata, ordered token source/schema/support matrices;
- validator, alias resolver and deterministic generator;
- generated CSS, typed metadata and manifest;
- D1-specific tests, fixtures, raw-value scan and compatibility checks;
- the bounded legacy alias and Phase 1 stylesheet migration;
- only the exact manifest/quality-script changes approved in the D1 allowlist;
- D1 documentation and ADR updates.

The review fails scope isolation if it introduces component/page redesign,
routes, UI behavior, runtime theme storage/picker, remote fonts, new font
packages, backend behavior, persistence, infrastructure, commerce, identity,
admin runtime, analytics, exchange or trading work.

## 3. Prerequisite gate

Before implementation can be accepted:

- D-079 through D-088 are approved with owner, effective date and exact values;
- ADR-0013 is `Accepted` rather than merely `Proposed`;
- the previous Phase 1 token/CSS baseline and brand hashes are recorded;
- frozen adapter and accepted Phase 2B baselines are recorded;
- the implementation change identifies its exact allowlist before editing.

An unresolved blocking decision is a BLOCKER, even when tests encode an
apparently reasonable default.

## 4. Source and schema acceptance

Verify independently that:

- exactly one canonical source exists and generated artifacts say they are not
  authoritative;
- schema/token-set versions originate in canonical metadata rather than the
  generated manifest, and source metadata plus all source records change
  atomically;
- source records are deterministically ordered by canonical ID;
- every record explicitly declares primitive/semantic kind and family, and
  namespace/kind/family disagreement fails;
- token IDs are unique, bounded and grammar-valid;
- schemas reject unknown fields and unknown token types;
- aliases are complete-value references, same-type, acyclic, bounded and fully
  resolved per theme;
- no semantic token lacks DARK or LIGHT resolution;
- duplicate generated CSS names are impossible;
- structured colour, dimension, duration, easing, shadow, font and integer
  values reject arbitrary CSS;
- URLs, imports, control characters, declarations and excessive values fail
  closed;
- token, alias, graph, family, string, file and output bounds are tested at and
  beyond their limits;
- malformed JSON and invalid UTF-8 cannot reach generation;
- source and schema versions are explicit.

Required fixtures include valid complete, missing theme, circular/unknown alias,
duplicate ID, invalid colour/numeric scale, hostile CSS, excessive graph and
unknown-field cases.

## 5. Deterministic artifact acceptance

Verify:

- clean generation from the canonical source produces committed CSS, typed
  metadata and manifest byte-for-byte;
- two consecutive runs and two clean directories produce identical bytes;
- output has stable token ordering, UTF-8, newline and numeric serialization;
- no timestamp, absolute path, hostname, environment-specific value or random ID
  appears;
- manifest digests match source and artifacts;
- generated files contain no secrets or untrusted payload excerpts;
- generated artifacts cannot be edited without a drift failure;
- generated CSS exposes only approved public/compatibility variables;
- generated TypeScript contains data and types only, with no runtime network or
  side effect;
- source changes without an appropriate token-set/schema version fail.

## 6. Token taxonomy acceptance

The review checks complete, non-overloaded families for:

- primitive and semantic colours;
- backgrounds, surfaces, scrims, borders and text;
- action, interaction and focus states;
- financial positive/negative/neutral;
- healthy, active, warning, critical, informational, unknown and disabled;
- stale, gapped, reconnecting, invalid, locked and crossed quality;
- unsupported, unverified and research-required capability;
- typography, spacing, sizing, radius, border width, elevation, opacity,
  motion and justified semantic layers;
- chart canvas/grid/axis/label/tooltip, series, reference, threshold, anomaly,
  stale/gap/missing/uncertainty/invalid states.

Brand blue cannot be the financial-positive token by alias or meaning. Buy/sell,
bid/ask, long/short and positive/negative remain distinct concepts.

## 7. Theme acceptance

Verify:

- DARK and LIGHT resolve independently to the same ID/type contract;
- SYSTEM appears only as preference-selection metadata and emits no third token
  map;
- LIGHT is not generated by inversion;
- theme-specific focus, border, elevation, chart and overlay values exist;
- aliases resolve inside the intended theme without cross-theme leakage;
- invalid or missing theme preference has a documented safe fallback;
- default, explicit dark and explicit light scopes do not create hydration-time
  token differences;
- generation contains no runtime colour arithmetic;
- theme changes do not alter financial/status semantics.

D1 does not need to accept account/device persistence or the final no-flash
bootstrap; those belong to D4. It must prove the token contract can be selected
without inline arbitrary CSS.

## 8. Typography acceptance

Verify:

- heading, UI and data roles have exact approved ordered fallback stacks;
- no new font dependency, remote URL, `@import` or runtime font requirement was
  introduced;
- existing Geist handling matches D-080/D-086;
- size, line-height, weight and letter-spacing roles are bounded and complete;
- financial values/countdowns use tabular numeral metadata;
- decimal alignment is a documented layout contract, not whitespace padding;
- live values reserve stable width where required;
- dense typography remains readable and does not lower touch-target rules;
- representative fallback-only output remains usable at 100% and 200% zoom and
  with long localized labels.

Rendered component typography belongs to D2/D4; D1 acceptance uses the minimal
existing Phase 1 shell solely as compatibility evidence.

## 9. Status and chart semantic acceptance

For every state in the D1 plan, verify a bounded presentation record with:

- exact semantic colour reference;
- localizable label key;
- icon identifier;
- shape/marker identifier;
- accessible description key;
- chart dash/pattern where applicable.

Tests reject colour-only records and invalid cross-family aliases.

For charts, verify categorical, sequential, diverging, positive/negative,
bid/ask, long/short, mark/index/reference, threshold, anomaly, highlight/mute,
stale/gap/missing/uncertainty/invalid contracts. The approved maximum
categorical series has unique primary encodings. Exceeding it returns a typed
design constraint; it does not recycle silently. No chart library is added.

## 10. Contrast and accessibility acceptance

The authoritative matrix includes every legally allowed semantic pairing in
both themes.

Required thresholds:

- normal required text: at least 4.5:1;
- large text and required standalone graphics: at least 3:1;
- essential boundaries: at least 3:1 against adjacent surface;
- focus indicator: at least 3:1 against component and adjacent background;
- ordinary status/badge/tooltip/table text: at least 4.5:1;
- chart geometry that communicates state: at least 3:1 plus redundant encoding.

Verify default, hover, active, selected, focus, disabled, status, table, chart,
tooltip, overlay/modal and alpha-composited pairings. Disabled exceptions cannot
hide required instructions, denial reasons or financial state.

Acceptance includes exact boundary fixtures just above and below thresholds,
both themes, alpha compositing and prohibited arbitrary pairing. Static token
checks do not overclaim complete component accessibility.

Reduced-motion and focus-visible tokens must remain functional. Forced-colour
evidence follows the approved D-087 split; a missing required D1 contract is a
HIGH finding.

## 11. Raw-value enforcement acceptance

Verify the bounded scanner:

- checks only approved file types/properties and excludes exact generated/test
  paths;
- rejects new raw colour, spacing-scale, radius, shadow, motion, typography and
  semantic-layer values outside approved locations;
- does not treat SVG path data, percentages, grid counts or reviewed
  media-query/layout values as semantic violations;
- reports exact file, property and finite violation type;
- applies exact-path/property exceptions, not broad directories;
- rejects missing owner/reason/approver/expiry/cleanup data;
- rejects expired, orphaned, widened or unused exceptions;
- cannot be bypassed by alternate hex/rgb/hsl syntax, casing, whitespace,
  shorthand or a TS string where the policy applies;
- remains bounded on large/hostile files;
- adds no dependency-heavy custom lint plugin.

At acceptance, every remaining Phase 1 raw value is categorized as migrated,
canonical-source, generated, fixture, layout/media technical constant or active
approved exception.

## 12. Versioning and compatibility acceptance

Compatibility fixtures prove:

- additive change classification;
- behavior-preserving deprecation alias;
- breaking rename/removal;
- type change;
- semantic-family/meaning change;
- theme-value-only patch;
- schema-compatible and schema-breaking changes;
- compatibility-window expiry;
- replacement-chain bound;
- rollback to the previous accepted set.

The diff engine must reject unchanged versions after meaningful output changes.
No semantic token may silently change from informational to positive, from
quality to outcome, or from capability to action.

## 13. Phase 1 migration acceptance

The reviewer records a before/after inventory and verifies:

- canonical artifacts can be added before consumer switching;
- each legacy variable has one classified target or documented exception;
- compatibility aliases are bounded, one-way and versioned;
- the Phase 1 shell uses the generated contract after the approved switch;
- no page/component TSX, copy, route, navigation, DOM hierarchy or interaction
  behavior was redesigned;
- no new font dependency was installed;
- raw orange/general accent is not left as an overloaded financial/status API;
- existing component geometry and media behavior are either unchanged or
  explicitly excluded under D3 ownership;
- DARK and LIGHT token scopes render usable existing pages without claiming D4
  preference completion;
- selected reference routes/viewports have before/after screenshots and
  accessibility evidence under D-088;
- rollback restores prior source/artifacts/bridge together;
- alias removal criteria are explicit and not executed prematurely.

The accepted visual change is limited to token resolution. A layout or product
redesign is a scope violation even if screenshots look better.

## 14. Security and supply-chain acceptance

Verify:

- generation performs no network access and uses pinned Node 24;
- no runtime remote token fetch, arbitrary CSS injection or user-controlled
  token source exists;
- no remote font is required for correct/usable rendering;
- CSP needs no new unsafe source or arbitrary inline style path;
- hostile source values cannot escape a declaration or introduce URL/import;
- file/record/string/alias/output limits fail closed;
- artifacts contain no secrets, environment data or machine paths;
- source and generated digests are reproducible;
- dependencies/manifests change only if explicitly approved for existing
  repository scripts, and no new dependency is added;
- secret, dependency and scope scans remain green;
- future third-party tooling remains outside the accepted trust boundary.

## 15. Test and fixture matrix

Minimum authoritative suites:

1. schema and source grammar tests;
2. duplicate/order/ID tests;
3. alias graph and theme resolution property tests;
4. token-type and hostile-string tests;
5. deterministic generation and drift tests;
6. DARK/LIGHT parity tests;
7. taxonomy/semantic misuse tests;
8. status and chart encoding completeness tests;
9. contrast-pair and alpha-composite boundary tests;
10. raw-value and exception lifecycle tests;
11. compatibility/version/deprecation/rollback tests;
12. Phase 1 migration alias tests;
13. clean-checkout/repeated-run replay tests;
14. resource-bound/fault-injection tests;
15. existing default Node, Kotlin and production build regressions as required
    by repository quality gates.

Test fixtures are documentation-derived and synthetic. They contain no brand
image copies, credentials, user data or external payloads.

## 16. Verification commands

The implementation and independent review use pinned Node 24 and record exact
versions/results for:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high

the repository Kotlin formatting, test and bootJar gates
the D1 source/schema validator
the D1 deterministic generator drift check
the D1 compatibility diff
the D1 contrast matrix
the D1 raw-value/exception scan
the repository Markdown/local-link validator
git diff --check
documentation and implementation allowlist scan
frozen adapter/package diff check
accepted Phase 2B document diff check
brand-reference SHA-256 comparison
secret and forbidden-scope scans
```

Docker/Compose runtime is required only if the existing authoritative repository
gate requires it for source changes. No live exchange canary belongs to D1.

## 17. Finding classification

| Severity              | Meaning                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `BLOCKER`             | source is ambiguous/untrusted; decisions unresolved; artifacts non-reproducible; theme missing; scope/dependency/frozen boundary violated |
| `HIGH`                | contrast/semantic/security/raw-value/compatibility/migration invariant can fail or be bypassed                                            |
| `MEDIUM`              | bounded usability/governance gap without current invariant violation                                                                      |
| `LOW`                 | maintainability or documentation issue with no material semantic effect                                                                   |
| `ACCEPTED_LIMITATION` | explicit deferred D2/D4 rendered/component behavior that does not weaken D1                                                               |

Only BLOCKER/HIGH findings in D1 scope may be fixed during formal acceptance.
Every fix cites the frozen contract or approved decision, adds a regression test
and reruns the authoritative suite.

Classification also records one evidence subtype so unlike failures are not
collapsed:

| Subtype                                             | Required distinction                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `ARCHITECTURE` / `DECISION_PENDING`                 | defective approved contract versus an unanswered D-079…D-088 question                   |
| `IMPLEMENTATION` / `DEFERRED_RENDERING`             | D1 defect versus an explicitly accepted D2/D4/D5 component limitation                   |
| `SOURCE_DRIFT` / `ARTIFACT_DRIFT`                   | unauthorized canonical-source change versus generated bytes/digests not matching source |
| `TOKEN_ACCESSIBILITY` / `RENDERED_EVIDENCE_PENDING` | failed legal pairing/foundation contract versus component evidence not claimed by D1    |
| `SCOPE_VIOLATION` / `APPROVED_COMPATIBILITY`        | unauthorized product/UI change versus an exact D-086 migration-allowlist edit           |

## 18. Formal acceptance report requirements

The implementation-produced report and later independent acceptance report both
record:

- status: `PASS`, `PASS_WITH_WARNINGS` or `FAIL`;
- accepted scope and explicit non-goals;
- approved D-079 through D-088 values;
- reviewed files and source/artifact digests;
- source/schema/alias verdict;
- deterministic-generation verdict;
- taxonomy and theme-parity verdict;
- typography/status/chart verdict;
- contrast and raw-value verdict;
- versioning/compatibility verdict;
- Phase 1 migration and rollback evidence;
- security/supply-chain evidence;
- findings, remediations and limitations;
- exact commands, test counts and results;
- scope-isolation and frozen-boundary evidence;
- freeze recommendation and exact next task without starting it.

## 19. Freeze criteria

D1 may freeze only when:

- BLOCKER = 0;
- unresolved HIGH = 0;
- D-079 through D-088 are approved and implemented exactly;
- ADR-0013 is `Accepted` with no unresolved conflict with those decisions;
- authoritative tests and builds pass;
- committed generated artifacts match clean generation;
- every required token resolves in DARK and LIGHT;
- contrast/status/chart/raw-value/compatibility gates pass;
- migration boundary, active exceptions, removal criteria and rollback are
  documented;
- no dependency, source or UI change exists outside the approved D1 allowlist;
- frozen adapters, accepted Phase 2B and brand reference hashes are unchanged;
- a formal independent acceptance report recommends freeze.

Freeze authorizes D1 tokens as a foundation only. D2, D4 and every other track
still require separate approval.
