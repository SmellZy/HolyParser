# Theme Architecture

Status: future UI architecture; documentation only.

## 1. Theme model

The supported preference is exactly `SYSTEM`, `DARK` or `LIGHT`.

- An authenticated account stores the preference server-side and applies it to
  every signed-in client.
- An unauthenticated client stores preference only on that device.
- A first visit defaults to `SYSTEM`.
- `SYSTEM` follows `prefers-color-scheme` and reacts to operating-system changes
  until the user chooses `DARK` or `LIGHT`.
- Account preference wins after authenticated bootstrap; a newer explicit local
  unauthenticated choice may be offered for adoption but is never silently
  written to the account.

Theme is presentation preference, not security state, tenant authorization or
financial configuration.

## 2. Semantic resolution

Light is designed for bright analytical work and is not a mathematical inversion
of dark. D-081 approves the initial D1 values below; the full expanded palette
and legal pairing allowlist are normative in
[`D1_DESIGN_DECISIONS.md`](D1_DESIGN_DECISIONS.md).

| Semantic token                 | Light     | Dark      |
| ------------------------------ | --------- | --------- |
| `background.base`              | `#F6F8FC` | `#060B18` |
| `background.surface`           | `#FFFFFF` | `#0A1324` |
| `background.elevated`          | `#FFFFFF` | `#101C31` |
| `background.subtle`            | `#F1F5F9` | `#0D1728` |
| `surface.interactive`          | `#F8FAFC` | `#121F35` |
| `surface.selected`             | `#E8F1FF` | `#18365F` |
| `border.default`               | `#E5E7EB` | `#24334A` |
| `border.emphasis`              | `#7B8494` | `#536A8A` |
| `text.primary`                 | `#111827` | `#F7FAFF` |
| `text.secondary`               | `#374151` | `#C3CEDD` |
| `text.muted`                   | `#6B7280` | `#8291A8` |
| `text.disabled`                | `#9CA3AF` | `#526178` |
| `text.inverse`                 | `#FFFFFF` | `#06101F` |
| `text.link`                    | `#0A5CD6` | `#66A3FF` |
| `action.primary`               | `#126BFF` | `#3384FF` |
| `action.primary.hover`         | `#0B5DE6` | `#5B9CFF` |
| `action.primary.active`        | `#084CC2` | `#7DB1FF` |
| `action.secondary`             | `#5948D6` | `#A99CFF` |
| `focus.ring`                   | `#006EE6` | `#00D4FF` |
| `financial.positive`           | `#087A55` | `#38D39F` |
| `financial.negative`           | `#B4233C` | `#FF718A` |
| `financial.neutral`            | `#5F6B7A` | `#A6B2C2` |
| `status.healthy`               | `#0F766E` | `#2DD4BF` |
| `status.active`                | `#0A5CD6` | `#66A3FF` |
| `status.warning`               | `#985B00` | `#F5B942` |
| `status.critical`              | `#A61B1B` | `#FF5B5B` |
| `status.informational`         | `#0A5CD6` | `#66A3FF` |
| `status.unknown`               | `#5F6B7A` | `#A6B2C2` |
| `quality.stale`                | `#8A5A00` | `#E9A928` |
| `quality.gapped`               | `#A33252` | `#FF7AA2` |
| `quality.reconnecting`         | `#006B8F` | `#4BD9F5` |
| `quality.invalid`              | `#A61B1B` | `#FF5B5B` |
| `quality.locked`               | `#7C4D00` | `#F2C14E` |
| `quality.crossed`              | `#B4233C` | `#FF718A` |
| `capability.unsupported`       | `#5F6B7A` | `#A6B2C2` |
| `capability.unverified`        | `#5E6472` | `#95A3B8` |
| `capability.research-required` | `#5948D6` | `#A99CFF` |
| `status.disabled`              | `#7D8795` | `#68768A` |

Hover, active and contrast variants are derived in the token build from reviewed
explicit values, not runtime colour arithmetic. Raw hex values never appear in
feature components.

`border.emphasis` is the minimum boundary token for controls or graphics whose
boundary is required to identify the component; it is at least 3:1 against the
adjacent surface in both themes. `border.default` is decorative separation only
and must not be the sole visible boundary of an essential control. Disabled-text
tokens use the WCAG inactive-control exception and must not render required
instructions, denial reasons or financial state.

Chart tokens resolve independently from outcome/status tokens:

| Chart token               | Light     | Dark      |
| ------------------------- | --------- | --------- |
| `chart.canvas`            | `#FFFFFF` | `#0A1324` |
| `chart.grid`              | `#E5E7EB` | `#24334A` |
| `chart.axis`              | `#6B7280` | `#8291A8` |
| `chart.label`             | `#374151` | `#C3CEDD` |
| `chart.crosshair`         | `#126BFF` | `#00D4FF` |
| `chart.selection`         | `#DCEAFF` | `#18365F` |
| `chart.series.primary`    | `#126BFF` | `#3384FF` |
| `chart.series.comparison` | `#5948D6` | `#A99CFF` |
| `chart.gap`               | `#A33252` | `#FF7AA2` |
| `chart.uncertainty`       | `#7D8795` | `#68768A` |
| `chart.invalid`           | `#A61B1B` | `#FF5B5B` |

Series, selection, uncertainty, gap and invalid states also use labels,
dash/pattern/marker or explicit missing-range geometry. Colour contrast between
two series is not accepted as their only distinction. Axis/label text follows
the same 4.5:1 normal-text rule as other required copy.

## 3. Boot and no-flash protocol

1. The HTML response declares supported colour schemes and uses a neutral
   theme-safe canvas.
2. A small, nonce/hash-authorized pre-render bootstrap reads the validated local
   enum and system preference before first paint; it performs no network call.
3. The root receives `data-theme="light|dark"` before styles render.
4. After session bootstrap, the validated account preference may replace the
   provisional theme in one controlled transition with motion suppressed.
5. SSR-capable surfaces should emit the known authenticated preference directly.

Invalid or unknown stored values fall back to `SYSTEM`. No user-supplied string
is interpolated into CSS. Content Security Policy must explicitly account for
the bootstrap mechanism; unsafe inline script is not an acceptable shortcut.

## 4. Persistence and synchronization

The account record stores preference plus revision and update time. Updates use
optimistic concurrency and audit only actor, old/new enum and timestamp—not
device fingerprints. Cross-tab/device changes use the platform settings contract;
local storage events are presentation hints, not authority.

Unauthenticated preference is local and environment-scoped. Production,
staging, public site, app and admin contexts must not leak storage keys across
origins. Logout retains device preference only if privacy policy approves it;
account identity is never stored with that key.

## 5. Surfaces and special cases

- Public site, app, billing portal and admin console use the same semantic token
  contract.
- Admin defaults may be denser but cannot force a different user preference.
- Email, exported files and public Telegram messages use their own static,
  accessibility-reviewed rendering; they do not read browser theme state.
- Embedded charts receive a resolved token snapshot and theme version so canvas
  and DOM remain consistent.
- Browser-native controls declare matching `color-scheme`.

## 6. Verification

Acceptance requires first-paint screenshots for all three preferences in light
and dark system modes, CSP validation, hydration mismatch tests, corrupted
storage fallback, account/local conflict tests, cross-tab behavior, contrast,
forced-colour and reduced-motion checks. Theme failure must degrade to a usable
light or dark surface and must never block authentication, billing status,
emergency operations or reconciliation.

## 7. D1/D4 responsibility split

D1 defines and validates the complete semantic token contract for two resolved
sets, `DARK` and `LIGHT`. `SYSTEM` remains preference-selection policy and is
never a third resolved token set. D1 also defines a reviewed safe resolved
fallback, artifact/schema version metadata, parity checks and the static
contract needed by server rendering and hydration. It does not implement the
theme picker, authenticated/device preference synchronization, cross-tab
behavior or the complete no-flash bootstrap; those remain D4 responsibilities.

The D1 plan is `D1_BRAND_AND_SEMANTIC_TOKENS_PLAN.md`. D-079 through D-088 are
approved in [`D1_DESIGN_DECISIONS.md`](D1_DESIGN_DECISIONS.md): DARK is the
temporary Phase 1 safe fallback, LIGHT is independently authored, and D-087
defines the static forced-colour split. Both resolved themes must expose
identical semantic IDs, status meaning and chart roles. Missing or unresolved
theme values fail generation; the consumer may use only the approved safe
complete artifact and may not synthesize a theme through inversion. D4 still
owns the section 3 runtime selection and no-flash protocol.

## 8. D2 component responsibilities

D2 inherits one already resolved D1 map. Components do not read or persist a
theme preference, resolve `SYSTEM`, execute boot scripts, or perform runtime
colour arithmetic. The same component API/state has the same meaning in DARK
and LIGHT.

D2 must prove rendered focus, disabled/read-only, loading, invalid, selected,
status-redundancy, and overlay behavior in both resolved themes and under the
approved forced-colour matrix. D1's `systemColor` contract is closed;
components cannot add arbitrary system colours or use
`forced-color-adjust:none` without an exact D-084 exception. Theme changes may
alter presentation only, never financial, quality, capability, error, or
authorization semantics.

The evidence/browser matrix is governed by D-091, D-092, and D-098. Complete
theme preference, first-paint, cross-tab, and hydration selection still belongs
to D4; D2 tests only that component output remains deterministic when the
resolved theme selector is supplied.
