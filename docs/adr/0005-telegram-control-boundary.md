# ADR 0005: Telegram Control Boundary

- Status: Accepted as future architecture; no implementation authorized
- Date: 2026-07-26

## Context

The product may use a public Telegram channel, a private bot, and a Telegram Mini
App. Telegram messages are long-lived, provider callbacks can be replayed,
provider identity differs from platform identity, and the provider can be
unavailable. Future paper and live controls therefore cannot treat a Telegram
callback as an exchange command or a source of financial truth.

Phase 2A.1 is frozen and Phase 2A.2 is the next implementation phase. This ADR
does not authorize Telegram integration or any financial execution capability.

## Decision

Telegram is a presentation and command-ingress channel behind a dedicated
Telegram Gateway.

The mandatory future command path is:

```text
Bot or Mini App
  -> Telegram Gateway
  -> authenticated internal command
  -> authorization and state/freshness validation
  -> Risk Engine when applicable
  -> expiring preview
  -> explicit confirmation
  -> Execution Engine
  -> exchange adapter
  -> reconciliation
  -> notification
```

The Gateway may authenticate provider input, resolve a linked platform identity,
enforce channel-level abuse controls, translate opaque actions to typed internal
commands, and render responses. It may not own strategy logic, financial state,
exchange credentials, risk decisions, or execution.

Platform accounts pre-exist Telegram links. Linking uses a website-issued,
single-use, purpose-bound, short-lived token. The backend binds verified
Telegram stable user ID to internal user ID. Telegram username is display-only.
Linking changes are audited and notified; changing the link disables Telegram
trading controls.

Mini App initialization data is verified server-side using current official
Telegram rules. Unsigned, expired, replayed, unlinked, or cross-environment data
is rejected. The backend issues a short-lived application session and never
trusts a frontend-provided Telegram user ID.

All critical actions use opaque, single-use, short-lived, idempotent handles
bound to identity, environment, resource, state version, and preview. Material
state or market changes expire previews. Final execution revalidates all
financial and authorization inputs. High-notional actions may require passkey,
2FA, or web reauthentication. Telegram cannot raise risk limits.

Public-channel templates use an allowlist and cannot contain personal,
account-specific, secret, or executable-action data. Provider failure changes
delivery state only. Telegram availability never gates emergency risk handling,
execution reconciliation, or authoritative platform state.

## Consequences

- Bot and Mini App remain thin clients of the same backend and reusable
  contracts.
- Direct bot-to-exchange calls are prohibited.
- Telegram-specific sessions/actions can be revoked without changing platform
  position truth.
- A future live action requires accepted identity, Risk Engine, Execution Engine,
  reconciliation, strong-authentication, idempotency, and audit capabilities.
- Provider outage degrades communication but not financial safety processing.
- Additional persistence and operational components are required in later
  approved phases, but none are added by this ADR.

## Rejected alternatives

- **Telegram identity as the platform account:** usernames change, linking and
  account recovery become unsafe, and provider compromise expands authority.
- **Encode order parameters directly in callback data:** old/replayed messages
  could execute stale intent and expose sensitive data.
- **Gateway calls exchange adapters:** bypasses authorization, risk, state, and
  reconciliation boundaries.
- **Mini App owns financial calculations:** creates divergent business logic and
  validation.
- **Notification success drives position state:** couples provider outages to
  financial truth.
- **Telegram required for emergency operation:** provider availability is outside
  platform control.
