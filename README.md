# Arbitrage Platform

Foundation monorepo for a multi-exchange crypto spread and funding analytics
platform.

Phase 1 contains:

- a Next.js application shell with responsive navigation;
- nonfunctional authentication page layouts;
- a Kotlin/Spring Boot control API skeleton;
- shared health contracts and design tokens;
- local PostgreSQL and Redis services;
- Docker-based startup and quality checks.

It contains no exchange connections, credentials, financial calculations, AI,
billing, Risk Engine, Execution Engine, paper trading, or live trading.

## Start locally

Copy the optional local configuration and start the complete stack:

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Web shell: <http://localhost:3000>
- Control API health: <http://localhost:8080/api/v1/health>
- Liveness: <http://localhost:8080/actuator/health/liveness>
- Readiness: <http://localhost:8080/actuator/health/readiness>
- Operational metrics: <http://localhost:8080/actuator/metrics>

See [Local development](docs/LOCAL_DEVELOPMENT.md) for native workflows,
validation commands, and troubleshooting.

## Repository structure

```text
apps/web/                  Next.js frontend
services/control-api/      Kotlin/Spring Boot service
packages/contracts/        Versioned shared API contracts
packages/design-tokens/    Shared CSS tokens
docs/                      Product and engineering documentation
compose.yaml               Local development stack
```

Development is phase-gated. Read `AGENTS.md`, `docs/MASTER_SPEC.md`, and the
approved phase document before making changes.
