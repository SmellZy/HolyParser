# Security Model

## 1. Security objectives

1. Prevent account takeover and cross-tenant access.
2. Prevent disclosure or misuse of credentials, wallet material, personal data,
   and financial activity.
3. Prevent stale, manipulated, or ambiguous data from causing unsafe decisions.
4. Make unauthorized or duplicate financial actions impossible by construction.
5. Preserve auditability and recoverability of critical state transitions.
6. Limit blast radius by venue, user, strategy, symbol, service, and environment.
7. Keep AI outside every secret and execution trust boundary.
8. Fail closed while retaining safe access to reconciliation and position exits.

Phase 1 protects identity and product infrastructure only. It stores no exchange
API keys, private keys, seed phrases, or trading permissions.

## 2. Security assumptions and non-assumptions

Assumptions:

- TLS is terminated only at controlled infrastructure.
- Build artifacts and migrations originate from reviewed CI.
- Production cryptographic keys are provided by a managed KMS/HSM.
- Staff access is individually attributable.

Not assumed:

- exchange messages, client clocks, browser storage, AI output, webhook payloads,
  email delivery, or on-chain transactions are trustworthy;
- an exchange timeout or 5xx means an order failed;
- a ticker uniquely identifies an asset;
- testnet behavior fully represents production;
- IP allowlisting alone is sufficient protection.

## 3. Assets and classification

| Class                 | Examples                                                            | Required handling                                                                                               |
| --------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Restricted secrets    | passwords, session tokens, API secrets, signing keys, seed material | Never log; encrypt in transit; hash where verification-only; otherwise envelope encrypt; minimal runtime access |
| Restricted financial  | orders, fills, positions, balances, risk limits, PnL                | Tenant isolation, encryption, immutable audit, strict authorization                                             |
| Confidential personal | email, device/session data, notification destinations               | Data minimization, retention/deletion policy, access logging                                                    |
| Internal sensitive    | adapter errors, venue limits, security configuration, incidents     | Least privilege, redaction, bounded retention                                                                   |
| Public/market         | public prices and funding                                           | Integrity, provenance, freshness, availability controls                                                         |

Seed phrases are prohibited server-side data. If received accidentally, they must
be rejected without persistence or logging and handled through the incident plan.

## 4. Threat actors

- unauthenticated bots and credential-stuffing attackers;
- compromised user browser/device or mailbox;
- malicious or compromised user;
- compromised exchange, provider, dependency, or webhook sender;
- malicious insider or overprivileged operator;
- supply-chain attacker;
- prompt-injection content targeting AI;
- network attacker/replay source;
- financially motivated actor manipulating thin markets or DEX routing;
- accidental operator/developer error.

## 5. Trust zones

### Zone A — Untrusted edge

Browser, public Internet, exchange feeds, email, Telegram provider input,
Telegram Mini App input, AI provider, billing provider, wallet, and blockchain
networks.

Controls: TLS, WAF/rate limits where deployed, validation, bounded payloads,
authentication, anti-replay, timeouts, and safe error mapping.

### Zone B — Product application

Web backend/control API, notification application boundary, and Telegram
Gateway. They handle sessions and user data but never private signing material
or direct exchange-secret access.

Controls: least-privilege service identity, RBAC/ABAC, tenant scoping, CSRF/CSP,
secure headers, SSRF restrictions, structured redaction, and network egress rules.

### Zone C — Data/analytics

Public adapters, normalization, analytics, and strategy. These components do not
hold private exchange credentials.

Controls: schema validation, capability gates, provenance, staleness gates,
resource quotas, and isolated adapter failures.

### Zone D — Financial control (later)

Risk Engine, execution coordinator, reconciliation, and credential-decrypting
workers.

Controls: separate workload identities and network policies, KMS/HSM grants,
parameter-bound risk authorization, durable state, kill switches, dual control
for administrative changes, and enhanced telemetry.

### Zone E — Security administration

KMS/HSM, audit archive, deployment controls, production break-glass access.

Controls: phishing-resistant MFA, approval workflow, short-lived credentials,
session recording where lawful, immutable logs, and periodic access review.

AI is never placed in Zones D or E.

## 6. Phase 1 identity controls

### Registration and verification

- Normalize email under an approved policy while preserving display form.
- Store password hashes using Argon2id with benchmarked parameters.
- Store verification/recovery codes only as purpose-bound hashes.
- Use cryptographically secure random values, single use, short TTL, attempt
  limits, resend cooldown, and rate limits by IP/account/device signals.
- Return enumeration-resistant responses where account existence is sensitive.
- Version acceptance of terms and privacy documents.

### Sessions

- Opaque, high-entropy session credentials in `HttpOnly`, `Secure`, appropriately
  scoped `SameSite` cookies.
- Rotate at login, privilege change, and reauthentication.
- Enforce idle and absolute expiry.
- Protect cookie-authenticated mutations against CSRF.
- Let users inspect and revoke sessions and revoke all after password recovery.
- Store only a verifier/hashed session secret where the chosen design permits.
- Never place bearer/session tokens in URLs or browser local storage.

### Login abuse

- Layered throttling by IP, account, session, and endpoint.
- Avoid permanent lockout that enables denial of service.
- Record safe security signals and alert on suspicious changes.
- Production requires bot/abuse policy and email delivery monitoring.

### Browser security

- restrictive CSP introduced early and tightened per deployed sources;
- HSTS in production, MIME sniffing protection, clickjacking protection,
  Referrer-Policy, and Permissions-Policy;
- output encoding and sanitization for any rich content;
- dependency integrity and no secret-bearing client configuration;
- sensitive pages avoid third-party scripts unless reviewed.

## 7. Authorization

- Deny by default.
- Every server query is tenant-scoped from authenticated context, never from a
  trusted client-provided user ID.
- Separate roles, permissions, entitlements, and trading authority.
- Admin access is narrow, strongly authenticated, and fully audited.
- Support personnel cannot retrieve secret material.
- Risk-limit changes, credential changes, and later trading-mode changes require
  recent authentication and notification.
- System risk policy can restrict but no user/admin path can silently loosen it
  beyond an approved maximum.

## 8. Exchange credential security (deferred to Phase 6)

- Separate read-only and trading credentials.
- Reject or block credentials with withdrawal permission where permission
  inspection is officially supported; otherwise require a documented manual
  verification and mark confidence.
- Recommend/enforce IP allowlists when officially available.
- Envelope encrypt with a unique data-encryption key per credential or user;
  encrypt the DEK under KMS/HSM; bind ciphertext to user/venue/environment using
  authenticated associated data.
- Persist key version and rotation metadata.
- Decrypt only inside the venue-specific execution worker immediately before use.
- Zeroize best-effort memory and never return secrets to the frontend.
- Never log headers, signatures, secret fields, private request bodies, or full
  private responses.
- Audit create, validate, use category, rotate, revoke, and failed access without
  recording the secret.

KMS permissions, disaster recovery, rotation, deletion, and backup behavior must
be tested before storing any real credential.

## 9. DEX and wallet security (unresolved, later phase)

Preferred model is non-custodial signing by the user's wallet. Automated signing
requires a separate approved threat model and may use constrained session keys or
smart accounts. Server-side custody is not an implicit requirement.

If server-side automation is ever approved:

- MPC/HSM-backed keys and isolated trading wallets;
- capital, time, chain, token, contract, method, gas, and slippage allowlists;
- canonical transaction construction, not arbitrary user/AI payloads;
- independent transaction simulation before signing;
- nonce and replacement policy;
- approval-state tracking and revocation;
- MEV, failed-transaction, bridge, reorg, and confirmation risk controls.

No seed phrase is accepted by any server API.

## 10. Market-data integrity controls

- Verify all exchange semantics against official documentation.
- Validate schemas, types, ranges, timestamps, sequence continuity, and instrument
  metadata versions.
- Quarantine zero/negative/impossible values and future timestamps outside policy.
- Mark stale/degraded data synchronously with detecting the fault.
- Resnapshot after gaps; do not bridge unproven continuity.
- Cross-check REST/WebSocket where semantics support comparison.
- Sign or checksum internal archives/manifests where tamper evidence is required.
- Treat symbol mapping changes as financially critical audited changes.

## 11. Financial action controls (later phases)

- Deterministic Strategy Engine proposes; Risk Engine authorizes; Execution Engine
  acts.
- Authorization is short-lived and binds exact legs, size, price/slippage limits,
  user, policy versions, and environment.
- Every mutation has an idempotency identity and concurrency protection.
- Order outcome states explicitly include unknown/reconciliation-required.
- A timeout, disconnect, or 5xx cannot enter an automatic retry path.
- Reconciliation uses the officially supported combination of order query, open
  orders, fills, and positions for that venue.
- New entries stop before safety exits/reconciliation during load shedding.
- Manual, semi-auto, and auto permissions are distinct states with distinct
  approvals and expiry.
- Global/venue/symbol/strategy/user kill switches are independent, observable,
  tested, and resistant to stale caches.

## 12. AI security

- Allowlisted, read-only tools with bounded outputs.
- No secrets, authentication payloads, private keys, raw private exchange
  responses, user-provided hidden instructions, or mutable controls.
- Treat all retrieved text as data, not instructions.
- Minimize personal and financial data sent to providers and document retention.
- Validate output schema, entity references, allowed state transitions, numeric
  claims, timestamp, and provenance.
- AI outage or invalid output degrades to deterministic product behavior.
- Prompt, response, and tool logs follow redaction and retention policy.

## 13. Application and infrastructure controls

- Environment separation with distinct identities, databases, keys, and domains.
- No production secrets in source, CI logs, fixtures, developer machines, or
  non-production environments.
- Pinned dependencies and lock files; SCA, secret scanning, SAST, container/IaC
  scanning, and scheduled patch process.
- Protected branches, reviewed migrations, provenance/SBOM/signing target before
  production.
- Least-privilege database roles and parameterized queries.
- SSRF defense through URL allowlists, egress policy, DNS/IP validation, and no
  user-controlled exchange endpoints.
- Resource quotas, payload limits, deadlines, cancellation, backpressure, and
  priority load shedding.
- Encrypted backups, tested restore, explicit RPO/RTO, and deletion/retention
  processes.

Kubernetes is not a security prerequisite and is not introduced in Phase 1.

## 14. Audit and monitoring

Audit events include:

- identity lifecycle and session changes;
- role/admin/entitlement changes;
- mapping and capability changes;
- configuration and risk-policy changes;
- credential lifecycle;
- strategy/risk decisions;
- order/position/reconciliation transitions;
- kill-switch activation/reset;
- AI validation failures involving safety constraints.

Audit entries contain actor, action, target, time, result, reason, correlation, and
safe before/after summaries. They exclude secrets and unnecessary personal data.
Critical logs are append-only/tamper-evident in the production design.

Detection covers credential stuffing, unusual sessions, admin actions, data gaps,
schema drift, API errors, unknown orders, unmatched fills, risk denials, kill
switches, and log-redaction failures.

## 15. Security verification by stage

| Stage                 | Minimum evidence                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Phase 1               | Auth abuse tests, tenant isolation, CSRF/CSP/headers, secret scan, dependency scan, redaction tests, restore exercise |
| Read-only MVP         | Parser fuzz/schema tests, stale/gap faults, rate-limit/load tests, adapter isolation                                  |
| Production analytics  | External surface review, DAST, SLO/chaos evidence, incident runbooks                                                  |
| AI                    | Prompt injection, tool authorization, data leakage, schema/state validation                                           |
| Paper                 | State-machine, replay, fault, restart, kill-switch, and environment isolation tests                                   |
| Manual live readiness | Threat model refresh, KMS/vault tests, pentest, access review, reconciliation drills                                  |
| Semi/auto             | Delegation boundary tests, soak/chaos, disaster recovery, independent security and financial controls review          |

No critical finding may be waived for a trading release. High findings require an
explicit documented risk decision by authorized owners and a time-bound fix.

## 16. Incident response priorities

1. Preserve user safety and block new financial exposure.
2. Maintain or restore risk evaluation, reconciliation, and safe close capability.
3. Revoke compromised sessions/credentials/authority.
4. Preserve evidence without leaking secrets.
5. Notify affected users and authorities according to approved legal policy.
6. Recover from known-good artifacts and reconcile external truth.

Runbooks are required for account takeover, leaked credential, malicious release,
exchange outage/schema drift, stale data, unknown order, unmatched fill, KMS
outage, database loss, AI leakage, and on-chain signer compromise.

## 17. Security decisions still required

- jurisdictions, privacy regime, retention, and user-deletion obligations;
- production identity/email/edge/hosting/KMS providers;
- staff access and break-glass policy;
- 2FA/passkey provider and recovery policy;
- live credential permission validation per venue;
- DEX custody/signing model;
- audit immutability and retention targets;
- production RPO/RTO and incident staffing;
- AI provider data-use/retention terms;
- external security assessment criteria and release authority.

## 18. Telegram identity and authentication boundary

Telegram identity is external evidence, not a platform account. A user must have
an existing active platform account before linking.

Linking controls:

- the authenticated website creates a random, purpose-bound, short-lived,
  single-use challenge;
- only a one-way token digest is retained;
- the backend binds verified Telegram stable user ID, never username, to the
  internal user;
- token purpose, TTL, use state, platform-user state, environment, attempts, and
  link conflicts are verified atomically;
- malformed, replayed, consumed, expired, revoked, or cross-environment tokens
  fail closed;
- link, unlink, conflict, replay, and recovery outcomes are audited;
- the platform sends an in-app/email security notification after link/unlink;
- unlink or linked-account change revokes Telegram sessions/actions and disables
  Telegram trading controls.

Mini App controls:

- verify the original Telegram initialization data server-side using current
  official Telegram guidance at implementation time;
- reject unsigned, expired, replayed, oversized, malformed, unlinked, disabled,
  or cross-environment data;
- never trust a frontend Telegram ID, username, role, platform user ID, or
  authorization claim;
- issue a short-lived, audience- and environment-bound application session;
- maintain replay protection and revoke sessions when link/account state
  changes;
- separate production/non-production bots, applications, origins, secrets,
  sessions, callback namespaces, and link tokens;
- enforce TLS, origin policy, CSP/frame policy, CSRF/session policy, and safe
  redirects for the selected Mini App deployment.

Exact provider signature algorithms and fields are intentionally not reproduced
here; they must be implemented from re-retrieved official documentation.

## 19. Telegram command security

The only permitted future financial command path is:

```text
Bot or Mini App
  -> Telegram Gateway
  -> authenticated internal command
  -> authorization
  -> current-state validation
  -> fresh market-data validation
  -> Risk Engine when applicable
  -> expiring execution preview
  -> explicit confirmation
  -> Execution Engine
  -> exchange adapters
  -> reconciliation
  -> notification
```

The Gateway cannot calculate strategies, own financial state, access exchange
secrets, call private adapters, issue risk authorization, or bypass
reconciliation.

Every action has an idempotency key. Critical callback/action handles are opaque,
single-use, short-lived, replay-protected, and bound to internal user, linked
Telegram ID, application session, environment, command, resource, expected
state version, and preview. Old or superseded messages cannot act.

Preview expiry and final revalidation cover:

- price and liquidity;
- market-data freshness and revision;
- position and reconciliation state;
- permissions and linked-account state;
- user/system/Telegram-specific limits;
- risk policy and decision.

High-notional actions require the approved passkey/2FA/web reauthentication
policy. Telegram limits may only reduce system authority. Risk-limit changes are
prohibited through Telegram unless a later policy requires web
reauthentication; an ordinary callback can never raise them.

## 20. Telegram and notification data protection

Public-channel templates use an allowlist for non-personal analytics. They never
contain user identity, private positions, balances, account PnL, credentials,
private alerts, or executable actions.

Private notifications are tenant-scoped and classified before rendering.
Credentials, signatures, provider secrets, raw authentication payloads, callback
secrets, and private keys have no notification template.

Future Telegram provider secrets:

- reside only in an approved secret manager/KMS;
- are separate by environment and provider application;
- are available only to the narrow provider/gateway workload;
- never enter source, frontend/Mini App bundles, callback data, database
  plaintext, logs, traces, metrics, fixtures, or messages;
- have rotation, revocation, access review, and incident procedures.

Delivery uses idempotency, bounded retry, exponential backoff, rate-limit
handling, dead-letter state, and audit. Provider failure changes delivery state
only. Telegram outage must never block emergency risk handling, reconciliation,
authoritative execution state, or web controls. Recovery does not make expired
messages actionable or blindly replay financial commands.

## 21. Telegram audit and verification gates

Security audit covers link challenges and link changes, Mini App verification and
session outcomes, command authentication/authorization, callback replay,
previews, confirmations, revalidation, execution handoff, reconciliation, alert
changes, provider delivery, and authority/limit changes. Raw provider payloads
and secrets are excluded.

Before Phase 3 activation:

- linking and Mini App flows pass expiry, replay, race, conflict,
  environment-separation, cross-user, revoke, and abuse tests;
- Telegram Gateway has no route to exchange credentials/adapters;
- public/private template leakage tests fail closed;
- provider secret rotation and outage runbooks are rehearsed.

Before Phase 5:

- paper callbacks are single-use, expiring, idempotent, and state-bound;
- old-message, duplicate, provider-timeout, and link-change tests pass;
- no real exchange endpoint or credential is reachable.

Before any Phase 7 Telegram live control:

- Phase 5 paper graduation and Phase 6 reconciliation are accepted;
- Risk Engine and Execution Engine reviews are complete;
- strong reauthentication, Telegram limits, preview expiry, final
  revalidation, unknown outcome, partial hedge, kill switch, and outage drills
  pass;
- live remains disabled by default.
