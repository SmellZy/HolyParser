# Phase 1 — Foundation

## 1. Objective

Create a secure, testable, observable foundation for later read-only analytics.
Phase 1 proves the development workflow, identity boundary, persistence approach,
and accessible web shell without implementing exchange connectivity, financial
analytics, AI, paper trading, or any form of execution.

Because the master specification's original Foundation scope is too large for one
independently reviewable change, Phase 1 is divided into five separately approved
increments. The recommended next task is **Phase 1A only**.

## 2. Prerequisites

- These planning documents are reviewed.
- Phase 1 decisions marked `P1-BLOCKING` in `DECISIONS_REQUIRED.md` are answered or
  their recommended defaults are explicitly accepted.
- Toolchain versions are selected and pinned.
- Product owner approves Phase 1A, not the entire roadmap.

The complete exchange API audit is not a prerequisite for repository/auth
foundation work, but it is mandatory before Phase 2 adapter implementation.

## 3. Scope

### 3.1 Phase 1A — Repository and quality foundation

- create only the directories needed by the current phase;
- configure pinned Kotlin/JVM, Node/TypeScript, package/build, formatting, linting,
  test, and migration tooling;
- add lock files and deterministic local commands;
- add CI for format, lint, type/compile checks, unit tests, build, migration
  validation, dependency scanning, and secret scanning;
- add ADR, contribution, ownership, and local-environment conventions;
- add minimal health/build proof only where required to validate the toolchain.

No product features are part of 1A.

### 3.2 Phase 1B — Control API and database skeleton

- modular Kotlin/Spring control API;
- PostgreSQL local/test setup;
- forward-only production migration convention and tested rollback/recovery plan;
- minimal identity/session/audit schema;
- health/readiness, stable error envelope, correlation, structured redacted logs,
  metrics, and traces;
- configuration validation and environment separation.

### 3.3 Phase 1C — Identity and sessions

- registration and email verification;
- login/logout;
- password recovery/change;
- session rotation, list, single revoke, and revoke all;
- Argon2id, secure cookies, CSRF, throttling, enumeration resistance;
- notification interface with local/test sink;
- audit events and abuse/fault tests.

### 3.4 Phase 1D — Web shell and account security UI

- Next.js/React/TypeScript shell;
- design tokens and responsive sidebar;
- registration, verification, login, recovery, profile, security, and session
  screens;
- accessible loading/error/empty/success states;
- typed generated API client;
- desktop/tablet/mobile browser tests and performance budgets.

### 3.5 Phase 1E — Hardening and non-production release

- baseline dashboards and actionable alerts;
- backup/restore rehearsal;
- dependency, secret, SAST and DAST baseline;
- non-production deployment, rollback, incident contacts, and runbook;
- consolidated evidence and Phase 2 readiness review.

## 4. Explicitly out of scope

- all exchange REST/WebSocket integrations and official capability assertions;
- exchange API key fields, credential validation, vault/KMS, or wallet support;
- market data, instruments, funding, prices, order books, live data gateway;
- TimescaleDB, ClickHouse, Redis, NATS, Redpanda, Kubernetes, Terraform beyond
  what a specifically approved environment actually needs;
- financial formulas, scanner, matrix, calculator, charts, or favorites;
- Strategy Engine, Risk Engine, AI assistant;
- order, fill, position, reconciliation, execution, or kill-switch behavior;
- paper, testnet, sandbox, manual, semi-automatic, or automatic trading;
- billing/subscriptions/entitlements;
- mobile/desktop native applications.

Live trading is not merely disabled in Phase 1; no live-trading code path or
exchange credential storage exists.

## 5. Proposed initial repository shape

The exact shape is approved in Phase 1A. The minimal candidate is:

```text
apps/
  web/
services/
  control-api/
packages/
  contracts/
  test-fixtures/
infra/
  docker/
docs/
  adr/
  runbooks/
```

Do not scaffold future services or all exchange adapter directories in advance.
Add them in their owning phase.

## 6. Phase 1 architecture

```text
Browser -> Next.js web -> Control API -> PostgreSQL
                          |
                          +-> EmailProvider interface -> local/test sink
                          |
                          +-> redacted logs/metrics/traces
```

Production email, WAF/CDN, and hosting are selected before Phase 1E release.
Redis is not required for a single control API instance; the session design must
allow later evolution without exposing tokens.

## 7. Data model planned for Phase 1

Only the minimum entities:

- users and versioned legal acceptance;
- password credential metadata;
- security challenges;
- sessions;
- audit events;
- migration/schema metadata.

No exchange credential, balance, instrument, opportunity, order, position,
subscription, or billing table is created.

Database rules:

- all changes through migrations;
- UTC timestamps;
- opaque identifiers;
- tenant/user uniqueness and foreign keys enforced in the database;
- no plaintext password, token, code, or session secret;
- audit fields contain redacted summaries only;
- integration tests apply migrations from an empty database.

## 8. API planned for Phase 1

Contract groups only:

- health/readiness;
- registration/verification;
- login/logout/current session;
- session list/revoke/revoke-all;
- password recovery/change;
- current profile/security posture;
- user-visible security events.

Exact routes and schemas are reviewed contract-first during 1B/1C. There are no
exchange, analytics, AI, trading, credential, or billing APIs.

## 9. Security requirements

- Argon2id parameters benchmarked and recorded in an ADR.
- Verification and recovery secrets are random, hashed, purpose-bound,
  short-lived, single-use, attempt-limited, and rate-limited.
- Cookies are `Secure`, `HttpOnly`, appropriately `SameSite`, scoped, rotated, and
  protected by CSRF controls.
- Login and recovery resist enumeration and abuse.
- Authorization is deny-by-default and all user data is server-side tenant scoped.
- CSP and secure headers are tested.
- Logs, errors, traces, metrics, CI, and fixtures contain no secrets.
- Dependency/secret scans run in CI.
- Admin functions are not added without a separate permission model.
- Configuration fails at startup when a required secure setting is missing.

2FA/passkeys are required before live trading but need not be fully implemented
in Phase 1 unless separately approved. The Phase 1 data/API design must leave a
clean path for stronger authentication and recovery.

## 10. Observability requirements

Phase 1 defines and tests:

- request rate, latency, and error metrics without high-cardinality user labels;
- registration/login/verification/recovery outcome counters with privacy-safe
  dimensions;
- database and notification adapter health;
- structured correlation across request and notification work;
- alert candidates for elevated failures, abuse throttles, and notification
  backlog;
- redaction tests.

Exact production SLOs require hosting and product traffic assumptions. Phase 1
records provisional indicators and the decision needed to set objectives.

## 11. Test strategy

### Phase 1A

- toolchain and clean-build proof;
- seeded CI failure proof for each required class of check;
- migration linter/validator proof;
- dependency and secret scanner proof.

### Phase 1B

- unit tests for domain primitives;
- API contract tests and error/redaction tests;
- database migration from empty and upgrade test;
- configuration, readiness, and dependency-failure tests.

### Phase 1C

- auth lifecycle integration tests;
- property/negative tests for expiry, attempts, single use, rotation, concurrency,
  enumeration, rate limits, CSRF, and cross-user isolation;
- fake clock and deterministic notification adapter;
- password/session invalidation and audit tests.

### Phase 1D

- component and browser tests for all user journeys;
- mobile/tablet/desktop layouts;
- keyboard, focus, screen-reader semantics, contrast, reduced motion;
- performance/bundle budgets and error boundary tests.

### Phase 1E

- non-production E2E;
- load test for auth abuse and ordinary flows;
- DAST/security checklist;
- backup/restore and deployment rollback rehearsal;
- incident/runbook tabletop.

## 12. Metrics and documentation deliverables

Each increment includes:

- code and API documentation relevant to that increment;
- ADRs for material decisions;
- test and security evidence;
- metrics and alert descriptions;
- change/migration/rollback notes;
- unresolved issues;
- exact next increment recommendation.

## 13. Increment acceptance

An increment is accepted only when:

- its scoped deliverables are complete;
- format, lint, type/compile, unit, integration, and applicable browser/security
  checks pass;
- no critical/high unresolved security defect exists;
- documentation and rollback/migration notes are current;
- no out-of-scope future module was introduced;
- the product owner explicitly approves the next increment.

The full Phase 1 exit criteria are in `ACCEPTANCE_CRITERIA.md`.

## 14. Risks and mitigations

| Risk | Phase 1 mitigation |
|---|---|
| Foundation becomes an unreviewable “big bang” | Five separately approved increments |
| Premature microservices/infrastructure | Minimal deployables and evidence-based adoption |
| Auth edge cases or account enumeration | Contract-first abuse tests, fake clock, rate limits |
| Secrets leak through telemetry | Central redaction plus negative tests and CI scan |
| Legal acceptance is modeled incorrectly | Version fields and a blocking product/legal decision |
| Email provider delays work | Interface plus local/test sink; provider required only for release |
| Runtime/toolchain incompatibility | Pin in 1A and validate clean checkout/CI |
| UI gets ahead of API/security semantics | Generated client and contract review before screens |

## 15. Phase 1 completion evidence

The Phase 1 report must list:

- files and migrations changed by increment;
- implemented functionality;
- exact commands/checks and results;
- dependency/security scan summaries;
- accessibility/performance evidence;
- deployment/rollback/restore evidence;
- unresolved findings and owners;
- explicit confirmation that no exchange credentials or trading path exists;
- recommended Phase 2A prompt, submitted for approval rather than started.

## 16. Recommended first implementation slice

Start with **Phase 1A only**. It has no external provider dependency, establishes
the quality gates for all later code, and is small enough to review and revert.

## 17. Exact prompt to authorize Phase 1A

```text
Read AGENTS.md and these documents completely before changing anything:
docs/ARCHITECTURE.md
docs/ROADMAP.md
docs/DOMAIN_MODEL.md
docs/API_CONTRACTS_PLAN.md
docs/SECURITY_MODEL.md
docs/EXCHANGE_CAPABILITY_MATRIX.md
docs/PHASE_1.md
docs/DECISIONS_REQUIRED.md
docs/RISK_REGISTER.md
docs/ACCEPTANCE_CRITERIA.md

I approve Phase 1A only: Repository and quality foundation.

For D-001 through D-005, use the recommended defaults in
docs/DECISIONS_REQUIRED.md. For runtime and framework versions, consult current
official compatibility documentation, propose supported stable/LTS versions in
your implementation plan, and pin the approved selections and dependency lock
files. Use GitHub Actions as the CI target, keep the repository
private/proprietary with no open-source license, and begin with native Gradle plus
one Node workspace without adding a monorepo orchestrator unless a concrete
Phase 1A requirement proves it necessary.

Before coding, inspect the repository and provide a short implementation plan,
risks, ambiguities, and the exact files you expect to create or change. Then
implement only the Phase 1A scope and acceptance criteria defined in
docs/PHASE_1.md and docs/ACCEPTANCE_CRITERIA.md.

Do not implement authentication features, exchange adapters, market data,
financial calculations, exchange credential storage, AI, paper trading, Risk
Engine, Execution Engine, billing, Kubernetes, Redis, NATS/Redpanda, TimescaleDB,
ClickHouse, or any live/testnet trading path.

Run all applicable formatting, linting, type/compile checking, tests, build,
migration validation, dependency scanning, and secret scanning. Demonstrate that
the mandatory CI gates detect seeded failures without leaving those failures in
the repository.

At the end report changed files, implemented foundation functionality, exact
checks and results, unresolved issues, risk-register updates, and the recommended
prompt for Phase 1B. Do not begin Phase 1B; ask for approval.
```
