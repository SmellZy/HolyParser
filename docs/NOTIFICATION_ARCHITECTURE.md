# Alerts and Notification Architecture

## 1. Status and boundary

This is a future architecture specification. It introduces no provider
integration, persistence, queue, credentials, Telegram calls, or user-facing
implementation. Phase 2C may implement the foundation only after separate
approval, beginning with in-app delivery and a mock Telegram provider.

An alert is a domain conclusion. A notification is a message created from a
domain event. A delivery is one attempt to send that message through one
channel. Provider success or failure never changes the underlying opportunity,
position, risk, reconciliation, or execution state.

## 2. Domain model

### 2.1 Alert entities

- `AlertRule`: versioned user or system policy.
- `AlertEvaluation`: immutable evaluation inputs, formula version, result,
  quality, and time.
- `AlertOccurrence`: one condition episode from qualification through
  resolution.
- `AlertSuppressionState`: cooldown, hysteresis, mute, quiet-hours,
  deduplication, and grouping state.

Rules support:

- token and canonical-instrument filters;
- venue-pair and product-group filters;
- strategy filters;
- threshold direction and exact value;
- configured executable size;
- minimum duration;
- cooldown and hysteresis;
- deduplication and grouping keys;
- quiet hours and timezone;
- severity;
- expiration;
- mute/pause;
- delivery-channel preferences.

Rule definitions must identify whether they are user-owned or system-defined.
System emergency rules cannot be silently weakened by a user preference.

### 2.2 Notification entities

- `Notification`: channel-neutral message intent and data classification.
- `NotificationRecipient`: internal user, system audience, or approved public
  channel target.
- `NotificationPreference`: channel, quiet-hours, severity, locale, and consent
  policy.
- `NotificationTemplate`: versioned rendering contract with allowed data class.
- `NotificationDelivery`: one recipient/channel delivery state.
- `NotificationAction`: optional read-only, paper, or later live command handle.
- `DeliveryOutbox`: transactional record awaiting dispatch.
- `DeliveryAttempt`: immutable provider-attempt evidence.

Supported future channels are:

- `IN_APP`;
- `TELEGRAM_PRIVATE`;
- `TELEGRAM_CHANNEL`;
- `EMAIL`;
- `WEB_PUSH`.

## 3. Supported alert families

The future rule engine may evaluate:

- anomalous spread;
- spread entry opportunity;
- spread convergence and exit;
- executable spread threshold at configured size;
- funding differential;
- funding-rate change;
- funding settlement approaching;
- expected net profit threshold;
- position PnL gain or loss;
- residual delta;
- liquidation buffer;
- stale or degraded venue;
- partial fill;
- reconciliation;
- emergency risk.

Expected net remains unknown when required cost inputs are unknown. Alert rules
cannot turn non-actionable or stale analytics into actionable output.

## 4. State machines

### 4.1 AlertRule lifecycle

```text
DRAFT -> ACTIVE <-> PAUSED
ACTIVE -> EXPIRED | DISABLED
PAUSED -> EXPIRED | DISABLED
```

`DISABLED` is an administrative or safety state. Editing an active rule creates a
new version. Expiration, mute, and pause are distinct.

### 4.2 AlertOccurrence lifecycle

```text
CANDIDATE -> QUALIFYING -> TRIGGERED -> ACKNOWLEDGED -> RESOLVED
                       \-> SUPPRESSED
CANDIDATE | QUALIFYING | TRIGGERED -> EXPIRED
SUPPRESSED -> QUALIFYING | RESOLVED | EXPIRED
```

- `CANDIDATE`: a threshold sample exists.
- `QUALIFYING`: minimum duration has not yet elapsed.
- `TRIGGERED`: rule, quality, duration, and hysteresis conditions are satisfied.
- `SUPPRESSED`: occurrence exists but cooldown, deduplication, grouping, mute, or
  quiet-hours policy blocks delivery.
- `ACKNOWLEDGED`: a user or operator acknowledged it; the market condition may
  still be active.
- `RESOLVED`: the exit/hysteresis condition is satisfied.
- `EXPIRED`: the rule or occurrence validity window ended.

Hysteresis controls resolution; cooldown controls repeat notification. They are
not interchangeable. Deduplication never discards the occurrence audit record.

### 4.3 Notification and delivery lifecycle

```text
Notification:
CREATED -> OUTBOX_PENDING -> ACTIVE -> COMPLETED
                            \-> CANCELED | EXPIRED

Delivery:
PENDING -> IN_FLIGHT -> DELIVERED
                    \-> RETRY_SCHEDULED -> IN_FLIGHT
                    \-> DEAD_LETTER | CANCELED | EXPIRED

NotificationAction:
ISSUED -> CONSUMED | EXPIRED | REVOKED
```

One notification may complete with mixed delivery outcomes. A dead Telegram
delivery does not reopen or fail the domain occurrence.

## 5. Evaluation semantics

Evaluation inputs contain canonical instrument IDs, exact decimals, configured
size, source revisions, exchange/receive/processing time, quality, formula
version, and rule version. Rules fail closed when required data is stale,
gapped, unsupported, unverified, research-required, or unknown.

Minimum duration uses a monotonic processing clock while preserving event time
for evidence. Late or reordered events cannot move an occurrence backward
without an explicit correction policy.

Grouping and deduplication keys are deterministic and versioned. They may include
rule ID, occurrence family, canonical instrument/venue pair, severity bucket, and
time window, but not free-form message text.

## 6. Transactional outbox and delivery

In an approved persistence phase, the domain event and `DeliveryOutbox` record
are committed atomically. Dispatchers:

1. claim an outbox record with bounded concurrency;
2. derive a stable delivery idempotency key;
3. enforce recipient preferences and data classification;
4. call the selected provider through an isolated port;
5. record a `DeliveryAttempt`;
6. mark delivered, schedule a bounded retry with exponential backoff and jitter,
   or move to dead-letter state;
7. emit a delivery-status audit event.

Retries are safe only for notification delivery and use the stable delivery key.
They do not retry financial commands. Provider rate limits pause the affected
channel without blocking other channels.

Message editing is allowed when the provider supports it and the template policy
permits it, for example resolving or updating a previously sent alert. Editing
must target the recorded provider message ID and must not create action authority
beyond the original message.

## 7. Public and private classification

| Classification        | Allowed destinations                                              | Examples                                             |
| --------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| `PUBLIC_ANALYTICS`    | In-app public surfaces, `TELEGRAM_CHANNEL`                        | Notable spread, funding opportunity, service notice  |
| `USER_PRIVATE`        | Authenticated in-app, `TELEGRAM_PRIVATE`, email, web push         | Personal alert, position summary, account event      |
| `FINANCIAL_SENSITIVE` | Strongly authenticated in-app; private channels only under policy | PnL, balances, liquidation buffer, execution preview |
| `SECURITY_SENSITIVE`  | Approved security channels with redacted templates                | Link/unlink, login, authority change                 |
| `SECRET`              | No notification template                                          | Credentials, signatures, bot token, private keys     |

Public templates are allowlist-based. A public message never contains user
identity, private position, balance, account PnL, credential, private alert, or
executable account action. Template rendering rejects fields above the allowed
classification.

## 8. Channel failure and outage behavior

- Telegram outage does not block alert evaluation, position monitoring,
  reconciliation, emergency risk handling, or execution-state persistence.
- Other enabled channels continue independently.
- Bounded retries honor provider rate limits and then dead-letter.
- Recovery does not resend an unbounded historical backlog.
- Critical undelivered notifications appear in authenticated in-app status and
  operations telemetry.
- Duplicate provider acknowledgements are idempotent.
- Provider delivery status is evidence about delivery only.

## 9. Audit and observability

Audit:

- rule creation, version, pause, mute, expiry, and deletion;
- occurrence trigger, suppression reason, acknowledgment, and resolution;
- template version and classification decision;
- outbox creation and every terminal delivery outcome;
- action issue, expiry, consume, reject, and revoke;
- preference changes, including emergency-override policy.

Metrics use finite labels: channel, notification family, severity, template
version family, outcome, and retry bucket. User, rule, occurrence, position,
instrument, Telegram, provider-message IDs, deduplication keys, and raw provider
errors never become metric labels.

## 10. Phase acceptance

### Phase 2C

- deterministic rule evaluation, minimum duration, cooldown, hysteresis,
  grouping, and deduplication pass unit/property/replay tests;
- outbox and delivery state contracts are versioned;
- in-app delivery and a deterministic mock Telegram provider pass;
- provider failure cannot mutate source domain state;
- no real Telegram token or network integration exists.

### Phase 3

- per-user preferences and linked private Telegram recipients are tenant-scoped;
- read-only personal delivery and security audit flows pass;
- public/private template classification has negative leakage tests;
- real provider activation, if separately approved, uses isolated secrets and
  bounded rate handling.

### Phase 5 and later

- paper actions use single-use internal command handles;
- future live actions require the command-security boundary, fresh preview,
  strong authentication policy, Risk Engine, Execution Engine, and
  reconciliation;
- notification failure never increases authority or changes financial state.

## 11. Deferred decisions

- exact alert formulas, thresholds, default cooldowns, and hysteresis bands;
- quiet-hours timezone and emergency override policy;
- public editorial and moderation policy;
- provider selection, regions, terms, costs, and delivery SLOs;
- retry count, backoff ceilings, dead-letter retention, and operator workflow;
- template languages, retention, deletion, and legal consent requirements;
- whether acknowledgments synchronize across channels;
- which notification families may be edited versus sent as new messages.
