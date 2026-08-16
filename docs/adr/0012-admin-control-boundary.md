# ADR-0012: Separate admin control boundary

- Status: Accepted for future architecture
- Date: 2026-08-03
- Scope: privileged platform administration

## Context

Support, catalog, entitlement, refund, crypto and security operations have
different authority and assurance needs. A hidden sidebar link or global
`isAdmin` flag cannot enforce least privilege, separation of duties, step-up,
dual control or durable audit.

## Decision

The `/admin` console is a distinct control-plane shell and application boundary.
Authorization uses independent permissions bundled into expiring roles. All
mutations require actor, permission, authentication assurance, reason,
idempotency, expected version and append-only audit. High-risk actions require
step-up and selected scopes may require a distinct approver over an immutable
command digest.

Admin commands use domain/application ports; the browser never edits databases,
calls financial providers directly or grants entitlements. Audit excludes
secrets and is itself protected.

## Consequences

- User and admin navigation/session policies remain separate.
- Operational tooling costs more than a CRUD panel but produces reviewable
  financial authority.
- Permission, session, approval and audit policies must be finalized before
  implementation.
- Admin outage cannot become a dependency of emergency financial safety.

## Rejected alternatives

- `isAdmin` as the only authorization check.
- Security through an undisclosed route.
- Direct production database edits as routine support workflow.
- Self-approval or editable audit history.
