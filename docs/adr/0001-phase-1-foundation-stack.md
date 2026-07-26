# ADR 0001: Phase 1 Foundation Stack

- Status: Accepted for Phase 1
- Date: 2026-07-25

## Context

The repository began with documentation only. The approved Phase 1 scope requires
a frontend shell, backend skeleton, shared contracts, PostgreSQL, Redis, Docker
startup, and quality infrastructure while explicitly excluding every exchange,
credential, trading, AI, billing, and execution capability.

`docs/PHASE_1.md` recommends smaller increments and originally defers Redis. The
current product-owner instruction explicitly approves the bounded combined scope
and requires Redis local configuration.

## Decision

- Use npm workspaces for the web, contracts, and design-token packages.
- Use Next.js App Router with Server Components by default and one narrow client
  boundary for sidebar interaction.
- Use Kotlin/Spring Boot as a separate control API build with a pinned Gradle
  wrapper.
- Use OpenAPI plus TypeScript types for the initial health contract.
- Use PostgreSQL and Redis only as local dependencies in this phase; add no
  application schema or authentication persistence.
- Use Docker Compose for local orchestration.
- Keep authentication pages nonfunctional and visibly marked as previews.
- Keep all future navigation visibly disabled.

## Consequences

- JavaScript and JVM builds remain native to their ecosystems rather than adding a
  monorepo orchestrator.
- The web shell can evolve independently while contract review remains explicit.
- Dependency readiness can be exercised without prematurely creating user or
  financial data.
- Redis is present because the approved Phase 1 scope requires it, but no cache,
  session, rate-limit, or live-state behavior is claimed.
- Any real authentication behavior, database migration, or exchange capability
  requires a separately approved task.
