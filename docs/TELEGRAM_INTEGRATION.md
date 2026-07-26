# Telegram Integration Architecture

## 1. Status and non-goals

This document designs future Telegram capabilities only. It does not authorize a
Telegram API integration, bot token, webhook, persistence, authentication
implementation, paper action, or live action. Phase 2A.2 remains the next
implementation phase.

Telegram is a presentation and command channel. It does not own platform
identity, strategy calculations, position truth, financial state, exchange
credentials, Risk Engine policy, or execution.

## 2. Product surfaces

### 2.1 Public Telegram channel

The public channel may publish:

- notable anomalous spreads;
- funding opportunities;
- market-data degradation;
- general system notices;
- educational and analytical updates.

It never contains:

- user identity or stable private identifiers;
- private or account-synchronized positions;
- balances or account-specific PnL;
- exchange credentials or authentication material;
- private alert details;
- executable account actions or action callbacks.

Public messages use `PUBLIC_ANALYTICS` templates and an allowlisted field set.
They must state data time, quality, and analytical—not guaranteed—nature where
relevant.

### 2.2 Private Telegram bot

The private bot may eventually provide:

- personal notifications;
- position summaries;
- PnL and funding status;
- alert management;
- system status;
- read-only position tracking;
- paper-trading actions in Phase 5;
- later strictly controlled live-action previews and confirmations in Phase 7.

Planned commands:

| Command      | Responsibility                                                                |
| ------------ | ----------------------------------------------------------------------------- |
| `/start`     | Explain linking status and safe capabilities; never create a platform account |
| `/status`    | Platform and user-channel status without secret details                       |
| `/positions` | Paginated, tenant-scoped position summaries                                   |
| `/position`  | One authorized position detail selected by opaque internal handle             |
| `/alerts`    | List and manage allowed personal alert settings                               |
| `/mute`      | Mute an allowed alert/rule for a bounded or explicit period                   |
| `/unmute`    | Remove a user mute                                                            |
| `/help`      | Explain commands, security boundaries, and web escalation                     |

Planned inline actions include Refresh, Details, Open chart, Configure alert,
Mute alert, Prepare paper entry, and Prepare paper exit. A later separately
approved phase may add Prepare live entry or Prepare live exit.

Every callback resolves to an authenticated internal command. It never calls an
exchange adapter directly.

### 2.3 Telegram Mini App

The Mini App is a mobile client of the same platform backend. Planned screens:

- opportunity list;
- active positions;
- spread chart;
- executable spread by size;
- two venue order books;
- funding countdown;
- position-leg details;
- spread calculator;
- PnL breakdown;
- funding history;
- alert configuration;
- paper execution preview;
- later live execution preview;
- confirmation state;
- action history.

Where practical it reuses shared API and domain contracts, design tokens, React
components, charting components, and validation rules. Telegram-specific
navigation and authentication adapters may differ, but business logic and
financial calculations remain backend-owned.

## 3. Responsibility boundary

| Concern                 | Bot                     | Mini App                     | Platform backend                    |
| ----------------------- | ----------------------- | ---------------------------- | ----------------------------------- |
| Compact notifications   | Primary                 | Secondary                    | Produces classified notification    |
| Command discovery       | Commands/buttons        | Screen actions               | Publishes authorized capabilities   |
| Charts and books        | Link or compact summary | Rich read-only visualization | Owns canonical data and quality     |
| Alert editing           | Simple fields           | Full form                    | Validates and persists policy       |
| Position truth          | Read-only rendering     | Read-only rendering          | Owns aggregate and reconciliation   |
| Spread/PnL calculation  | Never                   | Never                        | Versioned analytics/domain services |
| Paper preview           | Button entry point      | Detailed preview             | Paper engine and authorization      |
| Future live preview     | Entry point only        | Detailed preview             | Risk and execution boundaries       |
| Exchange access/secrets | Never                   | Never                        | Isolated later financial services   |

## 4. Account linking

Precondition: the user already has a verified platform account and an
authenticated website session.

```text
Authenticated website
  -> request single-use link challenge
  -> backend creates random, purpose-bound, short-lived token
  -> website shows Telegram deep link
  -> user opens bot
  -> Telegram Gateway receives verified Telegram user context + opaque token
  -> backend validates token hash, purpose, TTL, use state, environment,
     platform-user state and link conflicts
  -> backend binds Telegram stable user ID to internal user ID
  -> token is atomically consumed
  -> security audit event + in-app/email notification
```

Rules:

- Telegram username is display-only and never canonical identity.
- Raw linking tokens are not stored; store a one-way digest and metadata.
- A token is bound to purpose, internal user, environment, expiry, and one use.
- Consuming, expired, replayed, malformed, or cross-environment tokens fail
  closed and reveal minimal information.
- One Telegram identity cannot silently link to multiple conflicting accounts.
- Linking and unlinking require security audit events.
- The user receives an in-app/email notification after linking or unlinking.
- Changing the linked Telegram account disables every Telegram trading control.
  Re-enablement requires the later approved strong-authentication flow.
- Unlinking revokes Telegram application sessions and outstanding actions.

Exact TTL, relinking policy, recovery, multiple-account policy, and notification
provider require product/security decisions before implementation.

## 5. Mini App authentication

The server, not the frontend, verifies Telegram initialization data using the
then-current official Telegram algorithm and documented freshness rules.
Implementation must re-retrieve official documentation; this architecture does
not invent signature fields or algorithms.

The server:

1. receives the original initialization payload over TLS;
2. validates format and size;
3. verifies its cryptographic signature server-side;
4. checks issue time, configured maximum age, environment, bot/application
   binding, and replay key;
5. extracts Telegram stable user ID only from verified data;
6. finds a previously linked, active internal account;
7. issues a short-lived, audience-bound application session;
8. records privacy-safe success or failure audit evidence.

Unsigned, invalid, expired, replayed, unlinked, disabled, and
cross-environment payloads are rejected. Frontend-provided Telegram IDs,
usernames, roles, account IDs, or authorization claims are never trusted.

Production and non-production use distinct bots/applications, origins, secrets,
callback namespaces, link tokens, sessions, and allowlists. Web security policy
must restrict Mini App origin, framing, CSP, CSRF/session behavior, and redirects
according to the selected deployment model.

## 6. Command-security boundary

The mandatory path is:

```text
Telegram Bot or Mini App
  -> Telegram Gateway
  -> authenticated internal command
  -> authorization
  -> current-state validation
  -> fresh market-data validation
  -> Risk Engine when applicable
  -> execution preview
  -> explicit user confirmation
  -> Execution Engine
  -> exchange adapters
  -> reconciliation
  -> user notification
```

The Telegram Gateway:

- verifies Telegram/provider authenticity and maps it to an internal identity;
- resolves opaque command/action handles;
- applies rate, size, replay, and abuse limits;
- forwards typed commands to internal application ports;
- renders approved responses.

It must not:

- calculate spread strategies or financial values;
- own positions, orders, balances, alerts, or financial state;
- access exchange secrets or private adapters;
- call exchange adapters directly;
- issue or weaken Risk Engine decisions;
- bypass current-state, freshness, authorization, confirmation, or
  reconciliation requirements.

## 7. Callback, preview, and confirmation security

Every action has an idempotency key. Critical callbacks are:

- server-generated opaque handles, not serialized financial commands;
- single-use;
- short-lived;
- bound to internal user, linked Telegram ID, platform session, environment,
  command type, resource, expected aggregate version, and preview version;
- revoked on link/session/authority changes;
- stored and compared in replay-safe form;
- rejected when invoked from an old or superseded message.

An execution preview records:

- exact requested legs, quantities, direction, and constraints;
- canonical instrument identities;
- market-data revisions and maximum acceptable age;
- executable price/liquidity evidence;
- position and reconciliation versions;
- fee/slippage/funding assumptions;
- risk-policy and decision version when applicable;
- expiry, idempotency key, and required authentication strength.

A material market-data, liquidity, position, reconciliation, risk, account-link,
or authority change expires the preview. Final execution revalidates price,
liquidity, position state, reconciliation, permissions, limits, and risk. A
confirmation acknowledges a preview; it is not permission to skip revalidation.

High-notional actions require passkey, 2FA, or web reauthentication according to
future policy. Separate Telegram trading limits are configurable below immutable
system limits. Risk-limit changes through Telegram are prohibited unless a later
policy requires web reauthentication; ordinary Telegram callbacks can never
raise limits.

## 8. Secret management

Future provider credentials:

- live only in the approved secret manager/KMS boundary;
- are separate by environment and bot/application;
- never enter source, database plaintext, frontend, Mini App bundle, callbacks,
  logs, traces, metrics, fixtures, error messages, or notification bodies;
- are exposed only to the narrow Telegram provider/gateway process;
- have rotation, revocation, least-privilege access, audit, and incident
  procedures;
- are redacted before telemetry.

The Mini App never receives a bot token. Exchange credentials are never available
to the Telegram Gateway. A public channel identifier is configuration, not an
authentication secret, but remains environment-scoped.

## 9. Audit requirements

Record:

- link challenge issue, consume, expiry, replay, revoke, link, unlink, and
  conflict outcomes;
- Mini App verification/session outcomes without raw initialization data;
- command receipt, authentication, authorization, validation, rejection, and
  idempotency result;
- alert changes and message action lifecycle;
- preview issue, expire, confirmation, revalidation, execution handoff, and
  reconciliation result;
- strong-authentication and limit-policy decisions;
- provider delivery and editing outcomes.

Audit logs contain internal references and redacted reason codes, not raw
provider payloads or secrets.

## 10. Outage behavior

- Telegram outage never blocks emergency risk handling or reconciliation.
- Platform financial and alert state continues independently.
- Web/in-app controls remain the authoritative fallback.
- Notification delivery follows bounded retry and dead-letter policy.
- Old messages are not made actionable after recovery.
- A backlog is rate-limited and collapsed/grouped according to policy.
- If command status is uncertain, the client queries the internal command record;
  it does not resend a financial command blindly.
- Provider recovery creates delivery/availability events only, not position or
  execution transitions.

## 11. Roadmap gates

- Phase 2C: notification contracts, in-app delivery, mock Telegram provider only.
- Phase 3: real identity/accounts, linking, Telegram Gateway, read-only private
  notifications; provider activation requires separate operational approval.
- Phase 4: read-only position bot and Mini App views.
- Phase 5: paper previews, confirmations, and actions.
- Phase 6: read-only synchronized monitoring; no Telegram exchange action.
- Phase 7: only separately approved live previews and confirmations after Risk
  Engine and Execution Engine acceptance.
- Phase 8: automatic mode remains policy-controlled; Telegram is monitoring and
  pause/resume presentation, not autonomous decision logic.

## 12. Deferred decisions

- Telegram provider terms, operating entity, target regions, bot/channel
  ownership, and moderation;
- link-token, Mini App payload, application-session, callback, and preview TTLs;
- one-to-one versus controlled multiple account/link policy;
- required reauthentication by action and notional;
- Telegram-specific capital, venue, instrument, and daily limits;
- public message editorial policy and delayed-versus-live data;
- Mini App production origins, CSP/frame policy, locales, and accessibility
  targets;
- outage SLO, retry/backlog limits, and emergency communication fallback;
- exact live commands, if any, that may later be confirmed through Telegram.
