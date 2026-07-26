# Local Development

## Requirements

- Docker 26+ with Docker Compose;
- for native frontend work, Node.js 24.18 LTS and npm 11;
- for native backend work, Java 17;
- no exchange credentials or production secrets.

The checked-in Node version is `.nvmrc`. The backend uses the checked-in Gradle
wrapper, so a system Gradle installation is not required.

## Full Docker startup

The local stack contains the web shell, control API, PostgreSQL, and Redis.

```bash
cp .env.example .env
docker compose up --build
```

The values in `.env.example` are local-development defaults only. Do not reuse
them in a shared or production environment. Compose publishes every local port
on `127.0.0.1` only.

Endpoints:

| Component                                     | URL                                               |
| --------------------------------------------- | ------------------------------------------------- |
| Web shell                                     | <http://localhost:3000>                           |
| API process health                            | <http://localhost:8080/api/v1/health>             |
| API liveness                                  | <http://localhost:8080/actuator/health/liveness>  |
| API readiness, including PostgreSQL and Redis | <http://localhost:8080/actuator/health/readiness> |
| API operational metrics catalog               | <http://localhost:8080/actuator/metrics>          |

Inspect service state:

```bash
docker compose ps
docker compose logs control-api web
```

Stop containers while preserving local data:

```bash
docker compose down
```

Remove the local PostgreSQL and Redis volumes only when their data is no longer
needed:

```bash
docker compose down --volumes
```

The final command deletes local development data.

## Native frontend

Start only PostgreSQL and Redis if needed:

```bash
docker compose up -d postgres redis
```

Install and run the web workspace:

```bash
npm ci
npm run dev
```

Frontend and contract checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Run the same checks in the pinned Node.js container:

```bash
docker build -f infra/docker/quality.Dockerfile -t arbitrage-quality:phase1 .
```

Authentication routes are layout previews:

- `/login`
- `/register`
- `/forgot-password`
- `/verify-email`

They do not submit credentials or create accounts.

## Native control API

With PostgreSQL and Redis running:

```bash
set -a
. ./.env
set +a
cd services/control-api
./gradlew bootRun
```

Run these commands from the repository root. The control API intentionally has
no fallback database credentials; it fails to start unless `DATABASE_URL`,
`POSTGRES_USER`, and `POSTGRES_PASSWORD` are supplied.

Backend checks:

```bash
cd services/control-api
./gradlew ktlintCheck
./gradlew test
./gradlew bootJar
```

Runtime configuration:

| Variable                         | Runtime behavior                                 |
| -------------------------------- | ------------------------------------------------ |
| `CONTROL_API_PORT`               | Defaults to `8080`                               |
| `DATABASE_URL`                   | Required; local example targets PostgreSQL       |
| `POSTGRES_USER`                  | Required; local example is `arbitrage`           |
| `POSTGRES_PASSWORD`              | Required; local-only example is documented       |
| `DATABASE_CONNECTION_TIMEOUT_MS` | Defaults to `3000` for health fail-fast behavior |
| `REDIS_HOST`                     | Defaults to `localhost`                          |
| `REDIS_PORT`                     | Defaults to `6379`                               |
| `REDIS_CONNECT_TIMEOUT`          | Defaults to `2s` for health fail-fast behavior   |
| `REDIS_COMMAND_TIMEOUT`          | Defaults to `2s` for health fail-fast behavior   |

## Health semantics

`GET /api/v1/health` is the stable Phase 1 contract for process availability.
Actuator liveness answers whether the process should be restarted. Actuator
readiness includes PostgreSQL and Redis and answers whether the service should
receive traffic. The metrics endpoint exposes Spring's operational metric names;
Phase 1 defines no financial, market, or trading metrics.

Health responses never expose credentials, connection strings, or dependency
details.

## Troubleshooting

- If ports are occupied, override `WEB_PORT`, `CONTROL_API_PORT`,
  `POSTGRES_PORT`, or `REDIS_PORT` in `.env`.
- If readiness is `DOWN`, inspect `docker compose ps` and the control API logs.
- If the Node engine warning appears, switch to the `.nvmrc` version.
- Keep enough free disk space for Docker's multi-stage build cache. A nearly full
  Docker Desktop disk can surface as container-storage I/O errors.
- On macOS, keep the repository fully downloaded when it is inside a
  cloud-synchronized folder. Evicted `dataless` files can reach Docker as empty
  or unreadable build-context files; download them locally or clone into a
  non-cloud-backed development directory.
- If dependency metadata changes, update lock files in a dedicated reviewed
  change.

No Phase 1 workflow requires or accepts an exchange API key.
