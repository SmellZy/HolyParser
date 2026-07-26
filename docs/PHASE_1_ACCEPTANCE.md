# Phase 1 Acceptance Review

## Review outcome

| Field                                  | Result                                                       |
| -------------------------------------- | ------------------------------------------------------------ |
| Review date                            | 2026-07-25                                                   |
| Acceptance status                      | **PASS_WITH_WARNINGS**                                       |
| Accepted baseline                      | The explicitly approved bounded Phase 1 implementation scope |
| Unresolved blockers                    | None                                                         |
| Unresolved high-priority issues        | None                                                         |
| Trading or exchange capability present | No                                                           |
| Safe to approve                        | Yes, subject to the freeze conditions below                  |

Phase 1 is technically complete for the bounded scope that was explicitly
approved for implementation: repository and workspace initialization, the web
shell and non-functional authentication layouts, the control API skeleton,
PostgreSQL and Redis local infrastructure, health and metrics endpoints, shared
contracts, quality tooling, Docker startup, and documentation.

This acceptance does **not** claim that every increment described in the
original, broader `PHASE_1.md` plan was implemented. The later plan originally
included real identity/session behavior, persistence migrations, email, and
non-production operations. The approved implementation prompt expressly
excluded that functionality and replaced it with a smaller foundation slice.
Those features are neither implemented nor silently accepted here.

No exchange integration, authentication logic, billing, AI, paper trading,
live trading, API-key storage, Risk Engine, or execution path exists.

## Architecture summary

The repository is an npm-workspace monorepo with a Next.js web application,
shared TypeScript contracts and design tokens, plus an independently built
Spring Boot control API. PostgreSQL and Redis are local development
dependencies. Docker Compose starts the complete foundation stack with
loopback-only host bindings and dependency-aware health checks. Both application
images use multi-stage builds and non-root runtime users. External exchanges and
all financially consequential modules remain absent and mocked by static UI
data only.

## Scope and governing-document reconciliation

The review used, in order of authority:

1. `AGENTS.md`;
2. `MASTER_SPEC.md`;
3. all architecture and Phase 1 planning documents;
4. the explicit Phase 1 implementation authorization.

The implementation authorization narrowed the broader Phase 1 plan. This is the
only material scope conflict. The review resolves it by accepting the explicitly
authorized foundation slice while preserving all deferred product capabilities
as unimplemented. The repository does not contradict the financial or exchange
safety rules in `AGENTS.md` or `MASTER_SPEC.md`.

Phase 0 official exchange research remains a prerequisite to any Phase 2
exchange work. The capability matrix contains research-required entries and is
not evidence that an exchange capability exists.

## Verified requirements

| Review area                                         | Verification and result                                                                                                                                                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Repository and workspace                         | npm workspaces resolve the web, contract, and token packages; the Spring service is isolated under `services/`; no unnecessary orchestrator was introduced.                                                                                                                           |
| 2. Version consistency                              | Node 24.18.0, npm 11, Java 17, Gradle 9.6.1, Next.js 16.2.11, Spring Boot 4.1.0, Kotlin 2.3.21, React 19.2.8, and TypeScript 5.9.3 are mutually represented in configuration and locks. The current host Node 25.8.1 is outside the project range; pinned Docker verification passed. |
| 3. Reproducible builds                              | npm lockfile v3 has integrity metadata; the Gradle wrapper distribution and wrapper JAR are checksummed; resolved JVM dependencies are locked in `gradle.lockfile`; clean pinned-container and native JVM builds passed.                                                              |
| 4. Docker and Compose                               | Compose invariants, both production image builds, the backend quality target, full startup, health ordering, non-root users, and volume behavior passed.                                                                                                                              |
| 5. Apple Silicon and x86                            | The complete stack was built and run on arm64. Every selected upstream base image publishes both `linux/arm64` and `linux/amd64`. An amd64 execution build was not run on this host and remains an accepted warning.                                                                  |
| 6. PostgreSQL and Redis health                      | Both services become healthy. Readiness becomes `503 DOWN` when either dependency stops and recovers after restart. PostgreSQL and Redis test values survived `compose down` and recreation without `--volumes`.                                                                      |
| 7. Frontend accessibility and responsive navigation | Desktop and mobile browser passes found no automated axe violations. Semantic navigation, labelled controls, visible focus, and responsive layouts were inspected. Color contrast remained an axe manual/incomplete check rather than a reported violation.                           |
| 8. Drawer, keyboard, reduced motion                 | The mobile drawer is modal, traps focus, marks background regions inert, closes with Escape, restores focus, and wraps forward/backward Tab navigation. Reduced-motion emulation collapses transition and animation duration. Unit and real-browser checks passed.                    |
| 9. Contract consistency                             | OpenAPI and TypeScript health status/service/version fields and timestamp format are tested for parity. RFC 3339 timestamps pass and date-only values fail.                                                                                                                           |
| 10. Health and metrics                              | `/api/v1/health`, liveness, readiness, and the metrics catalog return the intended status. Liveness stays up during dependency loss; readiness fails within the configured health-check timeout.                                                                                      |
| 11. CI quality gates                                | CI actions are commit-SHA pinned with read-only repository permission. Formatting, lint, type-check, unit tests, builds, production npm audit, Compose invariants, Docker builds, backend container tests, and a digest-pinned secret scan are defined.                               |
| 12. Environment variables                           | `.env` files are ignored; `.env.example` documents local-only values; application database credentials have no runtime fallback; dependency timeouts are configurable; startup without required database configuration exits nonzero.                                                 |
| 13. Secret exposure                                 | Static pattern inspection and Gitleaks scans found no secret. The repository has no API-key model, credential path, exchange authentication payload, or real production secret.                                                                                                       |
| 14. Production images                               | The web and API runtime stages contain built artifacts rather than source build toolchains, run as `node` and `app`, and expose no default application credential. Security response headers are present and `X-Powered-By` is absent.                                                |
| 15. Error/loading/not-found                         | App Router error, loading, and not-found boundaries exist and compile. An unknown route returned 404 and the designed not-found content. Auth-layout preview routes rendered independently.                                                                                           |
| 16. Test quality                                    | Tests assert behavior rather than snapshots alone: focus lifecycle and modal semantics, contract/OpenAPI parity, malformed timestamps, security headers, deterministic health payloads, dependency-aware readiness, and volume persistence.                                           |
| 17. Documentation and startup                       | Documented Docker startup was executed from the repository root. Endpoints, native workflows, required environment variables, health semantics, shutdown, volume deletion, and host-specific troubleshooting are accurate.                                                            |
| 18. Generated and untracked files                   | Build outputs and `.DS_Store` are ignored. The root `.DS_Store` was already tracked and modified, and all Phase 1 implementation files remain unstaged/untracked. This must be resolved during the owner-controlled freeze operation.                                                 |
| 19. Dependency vulnerabilities                      | Production npm audit reports zero vulnerabilities. The full development audit reports nine high findings in the ESLint/minimatch/brace-expansion chain; impact and disposition are recorded below. JVM dependencies are locked, but no automated JVM CVE scanner is configured.       |
| 20. Governing-rule compliance                       | No floats or financial arithmetic, symbol mapping, funding interval, exchange endpoint, credential, retrying order path, AI bypass, or live-trading capability was introduced. No database schema change was added outside a migration; Phase 1 has no application schema.            |

## Commands and checks executed

The following commands or equivalent parameterized loops were executed during
the review:

```text
rg --files
wc -l and complete reads of AGENTS.md, MASTER_SPEC.md, all Phase 1 documents,
source, tests, configuration, Dockerfiles, lockfiles, workflows, and runbooks

git status --short --branch
git diff --check
git check-ignore -v --no-index <each .DS_Store>
git fsck --full --no-reflogs

node --version
npm --version
docker run --rm node:24.18.0-alpine node --version
docker run --rm node:24.18.0-alpine npm --version
docker run --rm eclipse-temurin:17-jdk-jammy java -version
./gradlew --version
shasum -a 256 gradle/wrapper/gradle-wrapper.jar

docker build -f infra/docker/quality.Dockerfile --target quality \
  -t arbitrage-quality:phase1 .
./gradlew clean ktlintCheck test bootJar --no-daemon
docker build -f services/control-api/Dockerfile --target quality \
  -t phase1-control-api-quality:final .

npm run verify:compose
docker compose build control-api web
docker compose up --detach
docker compose ps
docker compose down
docker compose up --detach

curl /api/v1/health
curl /actuator/health/liveness
curl /actuator/health/readiness
curl /actuator/metrics
curl /, /login, /register, /forgot-password, /verify-email, and an unknown route

docker stop <redis>; readiness/liveness checks; docker start <redis>
docker stop <postgres>; readiness/liveness checks; docker start <postgres>
psql create/insert/select/drop Phase 1 persistence probe
redis-cli set/get/del Phase 1 persistence probe

npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
./gradlew dependencies --no-daemon
Gitleaks v8.30.0 directory scan using its pinned multi-architecture digest
Gitleaks v8.30.0 one-commit HEAD history scan
static sensitive-value pattern scan with rg

docker buildx imagetools inspect <each selected base image> --raw
docker image inspect arbitrage-platform-web:latest
docker image inspect arbitrage-platform-control-api:latest
docker compose exec web id
docker compose exec control-api id
```

Browser automation additionally executed desktop and mobile page loads, console
and page-error collection, axe scans, viewport changes, reduced-motion
emulation, drawer open/close actions, forward and reverse Tab traversal, Escape,
focus restoration, and visual screenshot inspection.

## Test and build results

| Check                         | Result                                                 |
| ----------------------------- | ------------------------------------------------------ |
| Pinned Node formatting        | Pass                                                   |
| Pinned Node lint              | Pass                                                   |
| Pinned Node type-check        | Pass                                                   |
| Contract tests                | 4 passed                                               |
| Web tests                     | 6 passed                                               |
| Next.js production build      | Pass; seven static routes including `_not-found`       |
| Kotlin formatting/lint        | Pass                                                   |
| Spring tests                  | 2 passed                                               |
| Spring Boot JAR               | Pass                                                   |
| Backend Docker quality target | Pass                                                   |
| Web production image          | Pass                                                   |
| API production image          | Pass                                                   |
| Full Compose startup          | Pass; four services healthy                            |
| Redis-down readiness          | `503 DOWN` in 2.12 seconds; liveness remained `200 UP` |
| PostgreSQL-down readiness     | `503 DOWN` in 3.03 seconds; liveness remained `200 UP` |
| PostgreSQL persistence        | Pass across container recreation                       |
| Redis AOF persistence         | Pass across container recreation                       |
| Automated accessibility       | Zero axe violations on reviewed routes                 |
| Production npm audit          | Zero vulnerabilities                                   |
| Gitleaks source scan          | No leaks found                                         |
| Gitleaks committed HEAD scan  | One commit scanned; no leaks found                     |
| Git object integrity          | Pass; only harmless dangling Codex/worktree objects    |

The first persistence probe failed before remediation because the PostgreSQL 18
volume targeted the legacy data path. The post-fix probe above is the acceptance
result.

## Blocker issues

There are no unresolved blockers.

### Remediated blocker: PostgreSQL 18 persistence

- **Problem:** the named volume was mounted at `/var/lib/postgresql/data`, while
  the selected PostgreSQL 18 image stores its cluster under
  `/var/lib/postgresql/18/docker`. Docker created an anonymous parent volume and
  the named volume did not preserve the actual cluster.
- **Smallest correct fix:** mount the named volume at `/var/lib/postgresql` and
  add a Compose-invariant test.
- **Evidence:** a table and row survived `docker compose down` followed by
  `docker compose up`; the probe was removed after verification.

## High-priority issues

There are no unresolved Phase 1 high-priority issues.

### Remediated high-priority issues

| Problem                                                                                      | Smallest fix                                                                                                                          | Verification                                                                                |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Compose exposed PostgreSQL, Redis, API, and web on every host interface.                     | Bind all published development ports to `127.0.0.1`.                                                                                  | Compose invariant test and runtime `docker compose ps`.                                     |
| API configuration supplied fallback database credentials.                                    | Require URL, username, and password; document native environment loading.                                                             | Context test supplies test-only properties; runtime exits nonzero without configuration.    |
| Redis health used a default timeout longer than the Compose readiness timeout.               | Configure 2-second Redis connect/command timeouts and a 3-second database timeout.                                                    | Real Redis and PostgreSQL stop/start tests returned readiness failure in 2.12/3.03 seconds. |
| The mobile drawer lacked complete modal focus and background isolation.                      | Add dialog semantics, focus trap, inert background, Escape handling, and focus restoration.                                           | Unit tests plus real forward/reverse keyboard traversal and Escape checks.                  |
| Web responses lacked a baseline browser-security policy.                                     | Add CSP, frame denial, content-type, referrer, and permission headers and disable the framework disclosure header.                    | Header unit tests and production HTTP response inspection.                                  |
| OpenAPI and TypeScript health contracts could drift, and date-only timestamps were accepted. | Add schema-parity tests and strict RFC 3339 validation.                                                                               | Four contract tests include invalid date-only rejection.                                    |
| JVM dependency resolution was mutable.                                                       | Enable Gradle dependency locking and check in `gradle.lockfile`; include it in Docker builds.                                         | Clean native and container builds resolved successfully from the lock.                      |
| CI did not exercise production images or scan repository history for secrets.                | Add Docker build gates, Compose invariant verification, digest-pinned Gitleaks, read-only permissions, and commit-SHA-pinned actions. | Local equivalents of all new gates passed.                                                  |

## Accepted limitations and warnings

1. **Development-only npm advisories.** `npm audit` reports nine high-severity
   findings through ESLint's `minimatch`/`brace-expansion` dependency graph.
   Production audit is clean, and the standalone web runtime does not contain
   the lint toolchain. The advisories can affect developer or CI availability
   through pathological glob expansion, but do not expose production runtime
   data or credentials. CI has least privilege and timeouts. The automatic fix
   requires a breaking ESLint 10 upgrade that is incompatible with the current
   Next/React lint stack, so it was not forced during acceptance.
2. **JVM and image CVE automation.** Dependencies are locked, but CI has no JVM
   or container-image vulnerability scanner. A local Docker Scout attempt could
   not run without Docker account authentication. Add an unauthenticated,
   pinned scanner in a separately reviewed foundation-security change.
3. **x86 runtime evidence.** Upstream manifests prove all selected images support
   amd64 and arm64, and arm64 builds/runs pass. The suite was not executed on an
   amd64 runner. The first frozen CI run must record the runner architecture and
   supply that missing evidence.
4. **Manual accessibility checks.** Automated axe scans reported no violations,
   but color contrast/landmark review included incomplete/manual nodes. Retain a
   human WCAG pass before any public release.
5. **Host toolchain mismatch.** This machine currently runs Node 25.8.1 while the
   project pins 24.18.0. Native npm execution is not the acceptance authority;
   the clean pinned Node container passed all gates. Developers must activate
   `.nvmrc`.
6. **Cloud-backed workspace and disk pressure.** macOS had evicted files in the
   workspace and the host reached roughly 243 MiB free, causing Docker build
   context and container-storage errors. After freeing a regenerable npm cache,
   restarting Docker, and hydrating source files, the complete builds passed.
   The runbook now documents both conditions.
7. **Base image immutability.** Application/tool versions are pinned, and actual
   build digests are visible in build evidence, but Dockerfiles use version tags
   rather than checked-in immutable digests. Adopt a reviewed digest-update
   workflow before production deployment.
8. **Route-boundary depth.** Error, loading, and not-found boundaries build, and
   the 404 path was exercised. Phase 1 has no asynchronous product workflow with
   which to force every loading/error boundary end to end.

## Technical debt

- Add a pinned, unauthenticated JVM/container CVE scan and an update policy.
- Resolve the ESLint dependency advisories when the Next.js lint ecosystem
  supports the required upgrade.
- Add an amd64 execution job rather than relying only on upstream manifests and
  the standard GitHub runner.
- Introduce image digest refresh automation before any production deployment.
- Add browser accessibility regression automation; retain human checks for
  contrast, zoom, and assistive technology.
- Replace static shell mock data only in a separately approved analytics phase.
- Reconcile the original broad Phase 1A-1E terminology with the explicitly
  accepted bounded foundation slice so future phase labels are unambiguous.

## Security observations

- Local infrastructure is loopback-only, but the Redis service itself has no
  password. That is acceptable only for the documented single-developer Compose
  environment and must not be copied to a shared network.
- `.env.example` contains an intentionally obvious local-only PostgreSQL
  password. It is not a production secret. The application image has no fallback
  credentials.
- Health responses reveal service name/version and aggregate state only; they do
  not expose dependency addresses, credentials, or stack details.
- Production processes are non-root and the web response includes a restrictive
  baseline CSP. The CSP still permits inline script/style required by the
  current framework build; nonce/hash hardening is future production work.
- No API-key persistence, exchange signature, order, balance, risk, or execution
  object exists.
- GitHub Actions are SHA-pinned and run with `contents: read`; the Gitleaks image
  is digest-pinned.

## Freeze conditions

Phase 1 can be approved technically. To make the freeze reproducible from Git,
the repository owner must perform a reviewed source-control operation because
this review was not authorized to commit or tag:

1. remove the already tracked root `.DS_Store` from the index while retaining
   the ignore rule;
2. review and stage the complete Phase 1 file set;
3. rerun CI from the resulting clean commit;
4. confirm the CI amd64 Docker jobs pass;
5. create the Phase 1 freeze tag only after those checks pass.

Until that owner-controlled operation occurs, a fresh clone of `main` contains
only the earlier development-plan commit and cannot reproduce Phase 1. This is a
release-administration warning, not an unresolved implementation defect.

## Rollback and recovery

- No database migration or application data model was introduced, so application
  rollback is an image/source revision rollback.
- `docker compose down` removes containers and the network while preserving
  PostgreSQL and Redis named volumes.
- `docker compose down --volumes` intentionally deletes local development data
  and must be used only after confirming it is disposable.
- Restore a failed local stack by checking out the approved Phase 1 revision,
  copying `.env.example` to `.env`, rebuilding with `docker compose up --build`,
  and verifying readiness before use.
- If PostgreSQL data must be retained across an image rollback, preserve the
  `arbitrage-platform_postgres-data` volume and do not change its mount root.
- If the acceptance fixes are reverted individually, revert their associated
  tests and documentation in the same change. Do not revert the PostgreSQL
  volume-path fix while retaining an existing PostgreSQL 18 volume.
- There is no production deployment, user account, exchange credential, or
  trade requiring recovery.

## Exact recommended next phase

The next phase should be **Phase 0 — Official API discovery and product
decisions**, not Phase 2 implementation. Phase 0 is mandatory before any real
adapter work and must close the pilot-venue, canonical-identity, market-data
rights, and capability-evidence decisions. After Phase 0 is approved, Phase 2A
can be authorized separately with all real exchange ports still mocked.

## Exact recommended prompt

```text
Read AGENTS.md and these documents completely before changing anything:
docs/MASTER_SPEC.md
docs/ARCHITECTURE.md
docs/ROADMAP.md
docs/DOMAIN_MODEL.md
docs/API_CONTRACTS_PLAN.md
docs/SECURITY_MODEL.md
docs/EXCHANGE_CAPABILITY_MATRIX.md
docs/PHASE_1.md
docs/PHASE_1_ACCEPTANCE.md
docs/DECISIONS_REQUIRED.md
docs/RISK_REGISTER.md
docs/ACCEPTANCE_CRITERIA.md

Phase 1 is frozen. I approve Phase 0 only: Official API discovery and product
decisions.

Do not implement Phase 2 and do not write application or exchange-integration
code. Use only current official exchange documentation and record the exact
source URL, retrieval date, API family/version, authentication class, market
type, limits, sequence/checksum semantics, funding semantics, symbol metadata,
and unresolved ambiguity for every capability claim. Do not infer or invent an
endpoint, field, rate limit, symbol mapping, funding interval, or trading
feature.

Before modifying documentation:
1. inspect the complete repository and existing decision/capability registers;
2. provide a concise research plan;
3. list the documentation files expected to change;
4. identify decisions that require product-owner input and any blocking lack of
   official evidence.

Update only Phase 0 research and decision documentation. Keep all real exchange
ports disabled and mocked. Do not add credentials, authentication logic,
private APIs, billing, AI, paper trading, live trading, risk, or execution
functionality.

At the end, report:
- official sources reviewed;
- verified, unsupported, and research-required capabilities;
- contradictions or stale assumptions discovered;
- decisions resolved and decisions still blocking;
- whether Phase 2A can be separately approved;
- the exact recommended prompt for Phase 2A, but do not start it.
```
