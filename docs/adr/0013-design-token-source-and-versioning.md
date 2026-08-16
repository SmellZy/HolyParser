# ADR-0013: Design-token source and versioning

- Status: Proposed; D-079/D-085 approval required before implementation
- Date: 2026-08-16
- Owners: Design, Frontend Architecture, Accessibility, Security
- Scope: D1 — Brand and Semantic Design Tokens

## Context

The frozen Phase 1 foundation exposes one hand-maintained dark CSS variable file.
It has no schema, light-theme parity, semantic status/chart completeness,
compatibility metadata or deterministic source/artifact check. Feature CSS also
contains raw colours and other values that cannot be governed safely by merely
renaming variables.

HolyParser needs a single source that is portable across future public,
authenticated, billing and admin surfaces; cannot execute arbitrary build code;
can detect duplicate IDs and alias errors; produces stable CSS and typed metadata;
and preserves a controlled compatibility bridge for the accepted Phase 1 shell.

## Decision proposal

Subject to D-079 and D-085 approval:

1. Use a data-only canonical source set: ordered token records at
   `packages/design-tokens/src/tokens.source.json`, canonical version/policy
   metadata at `src/token-set.meta.json`, and the governed contrast/status/chart
   support sources. Generated artifacts and their manifest are never input
   authorities.
2. Validate it against a repository-owned schema plus bounded semantic checks
   implemented with Node 24 and existing repository tooling. Do not require a new
   dependency.
3. Keep canonical dot-separated IDs and generate stable `--hp-` CSS names.
4. Separate primitives from semantic tokens. Feature code may consume semantic
   and explicitly approved layout tokens only.
5. Represent aliases only as complete `{canonical.token.id}` references. Resolve
   a bounded acyclic graph independently for DARK and LIGHT.
6. Treat SYSTEM as preference-selection metadata, not a third resolved set.
7. Generate and commit:
   - resolved CSS variables;
   - typed immutable token metadata;
   - a manifest containing schema version, token-set version and content digests.
8. Require clean generation to match committed artifacts byte-for-byte. Generated
   output has stable ordering/newlines and no timestamps or machine paths.
9. Version the schema and token set independently. Meaning/type changes and
   removals are breaking; reviewed theme-value-only changes may be patches.
10. Keep legacy Phase 1 CSS variables only as one-way, versioned, expiring aliases
    during the approved compatibility window.
11. Reject remote runtime loading, arbitrary CSS strings, URLs/imports, unknown
    fields, missing theme values, duplicate IDs, invalid aliases and excessive
    inputs before generation.
12. Govern legal contrast pairings, status/chart redundant encodings and raw
    value exceptions as versioned source data alongside the token set.

Committed artifacts are chosen because current consumers import CSS directly,
clean checkouts should not depend on an implicit prebuild, diffs need review and
rollback must restore one known token set. Drift tests offset the risk of source
and artifact divergence.

## Version and compatibility rules

- `schemaVersion` changes when source/schema mechanics change.
- `tokenSetVersion` changes when the public token contract or resolved values
  change.
- An additive token is normally a token-set minor change.
- Deprecation requires a replacement, migration note and removal version.
- Rename, removal, type change or semantic-family/meaning change requires a
  token-set major change.
- A reviewed value-only correction that preserves meaning requires a patch and
  reruns all contrast/visual/security gates.
- Changed output with unchanged version fails CI.
- Rollback restores source, generated artifacts, manifest and compatibility
  aliases atomically.

## Consequences

- Token generation becomes reproducible, reviewable and safe to consume across
  languages/surfaces.
- Both themes must be complete before any generated artifact is accepted.
- Source records are more verbose than a handwritten CSS file.
- The repository owns a small validator/generator that requires security and
  compatibility tests.
- Generated files create review noise, but also make release artifacts and
  rollback explicit.
- D1 can bridge Phase 1 without redesigning pages or installing fonts.
- D4 still owns preference persistence and no-flash runtime behavior; D2/D5 own
  component/chart rendering.

## Rejected alternatives

### Typed TypeScript as canonical data

Rejected as the recommendation because importing the source executes code,
permits computed/environment-dependent values and couples non-TypeScript
consumers to a runtime module. A generated typed artifact retains TypeScript
ergonomics without making executable code authoritative.

### Object-keyed JSON

Rejected because duplicate keys may be lost by ordinary parsers before semantic
validation. Array records make duplicate token IDs directly testable.

### Hand-maintained CSS only

Rejected because it cannot prove type/schema/theme parity, semantic metadata,
alias/version rules or deterministic multi-artifact agreement.

### Generated artifacts not committed

Rejected for the current repository because direct CSS consumers and clean
checkouts would depend on an implicit generator step and review/rollback would
not show the exact shipped artifact.

### Third-party token platform or runtime service

Rejected for D1 because it adds dependency, supply-chain, network and runtime
trust without a measured need. A future adoption requires a separate ADR.

## Approval and supersession

This ADR records a recommendation, not approval. D-079 decides the source and
artifact policy; D-085 decides version/deprecation compatibility. Exact palette
and pairings, chart encodings, raw-value governance and forced-colour roles
remain owned by D-081, D-082, D-084 and D-087 respectively; this ADR does not
approve them. If any governing decision selects an incompatible approach, this
ADR must be superseded before D1 implementation begins.
