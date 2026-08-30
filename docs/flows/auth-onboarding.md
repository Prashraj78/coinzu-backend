# Auth & Onboarding — Screen → API Map

Maps every screen in the sign-up / sign-in / account-setup mockups to the exact backend
call it makes. Built from the two attached Figma exports (screens: *Sign up*, *Email
Verification*, *Sign in/sign up*, *Sign in*, *Forget Password*, *Start Earning*,
*Account setup 1–4*).

This folder (`docs/flows/`) is for cross-endpoint, screen-level guides. Individual
endpoint contracts stay in `docs/apis/` — this doc only says which one to call and when.

## Checking status — "where did this user leave off?"

`GET /api/users/me` (`docs/../apis/user/005users.me.md`) is the single call that answers this. It
returns every status field in one response — call it on every app launch (after reading
the stored token) to decide which screen to resume at, instead of tracking onboarding
progress locally:

| Field | Tells you |
|---|---|
| `email_verified_at` | non-`null` once **Email Verification** is done — `null` means show that screen. |
| `onboarding_completed` | `true` once step 4 (**Account setup 4 — Goal**) is saved — `false` means resume onboarding. |
| `name`, `gender`, `age_range`, `country` | set once **Account setup 1** is saved — any `null` means that screen hasn't run. |
| `notifications_enabled` | set once **Account setup 2** is saved. |
| `interests` | non-empty once **Account setup 3** is saved. |
| `primary_goal` | set once **Account setup 4** is saved — the same field `onboarding_completed` derives from. |
| `kyc_status` | selfie/KYC state, for screens beyond this flow (`docs/../apis/user/016kyc.status.md` onward). |
| `profile_completion_pct` | a ready-made 0–100 number if the app just wants a progress bar rather than checking each field. |

Since each onboarding step's own response (`011`–`014`) already returns this same full
user object, the app does not need to call `GET /api/users/me` again right after
submitting a step — only on cold start / resume.

## Flow diagram

```mermaid
flowchart TD
  A[Sign in / Sign up landing] -->|Continue with Google| G[POST /api/auth/google]
  A -->|Continue with Email| B[Sign up screen]
  A -->|"Sign in" link| S[Sign in screen]

  B -->|"Verify email" tap| R[POST /api/auth/register]
  R --> V[Email Verification screen]
  V -->|resend code| O1[POST /api/auth/email/send-otp]
  V -->|"Verify Email" tap| O2[POST /api/auth/email/verify-otp]
  V -.."Back To Login"..-> S

  S -->|"Sign in" tap| L[POST /api/auth/login]
  S -->|Continue with Google| G
  S -->|"Forget Password" link| F[Forget Password screen]
  F -->|"Verify Email" tap| FP[POST /api/auth/password/forgot]
  FP -.emailed link, opens in browser, not in-app.-> FE[GET + POST /api/auth/password/reset]

  O2 --> E[Start Earning screen]
  L --> E
  G --> E

  E -->|"START EARNING"| AS1[Account setup 1 — Personal Information]
  E -.."Skip for Now"..-> HOME[Home / dashboard]

  AS1 -->|Continue| AI[POST /api/users/me/onboarding/info]
  AI --> AS2[Account setup 2 — Permissions]
  AS2 -->|Allow Permissions| AP[POST /api/users/me/onboarding/permissions]
  AP --> AS3[Account setup 3 — Interests]
  AS3 -->|Continue| AIN[POST /api/users/me/onboarding/interests]
  AIN --> AS4[Account setup 4 — Goal]
  AS4 -->|Continue| AG[POST /api/users/me/onboarding/goal]
  AG --> HOME
```

Register a device (`POST /api/users/me/device`, doc `089`) alongside `register` (via its
optional `device` field) and again on every `login`/`google` sign-in — it is what keeps
IP, fingerprint and push token fresh for fraud checks and notifications. It has no
dedicated screen; call it silently in the background right after any of the three
session-issuing calls (`register`, `login`, `google`).

## Screen-by-screen map

### Sign in / Sign up (landing)

"Play Game, Earn Rewards!" — entry screen, no API call by itself.

| Action on screen | Call | Doc |
|---|---|---|
| "Continue with Google" | `POST /api/auth/google` | `docs/../apis/user/004auth.google.md` |
| "Continue with Email" | none — navigates to the **Sign up** screen | — |
| "Sign in" link | none — navigates to the **Sign in** screen | — |

### Sign up

Email, password, confirm password fields.

| Action on screen | Call | Doc |
|---|---|---|
| "Verify email" tap | `POST /api/auth/register` | `docs/../apis/user/001auth.register.md` |

- `confirm password` is a client-side-only check — the API has no such field, never send it.
- Send the device object inline (`device` field on the body) so the very first install is
  captured at sign-up: `docs/../apis/user/028users.register-device.md` documents the shape.
- The response already contains `access_token`/`refresh_token` — the session starts
  immediately, before the email is verified. Nothing downstream is gated on
  `email_verified`.

### Email Verification

4-digit code entry, shown right after "Verify email" on the Sign up screen.

| Action on screen | Call | Doc |
|---|---|---|
| Screen load / "resend" | `POST /api/auth/email/send-otp` | `docs/apis/005auth.email-send-otp.md` |
| "Verify Email" tap | `POST /api/auth/email/verify-otp` | `docs/apis/006auth.email-verify-otp.md` |
| "Back To Login" | none — navigates to **Sign in** | — |

See **Known gaps → #1** below — as written today, the backend will not actually deliver a
numeric code to this screen for a real registered user.

### Sign in

| Action on screen | Call | Doc |
|---|---|---|
| "Sign in" tap | `POST /api/auth/login` | `docs/../apis/user/002auth.login.md` |
| "Continue with Google" | `POST /api/auth/google` | `docs/../apis/user/004auth.google.md` |
| "Forget Password" link | none — navigates to **Forget Password** | — |
| "Sign up" link | none — navigates to **Sign up** | — |

### Forget Password

| Action on screen | Call | Doc |
|---|---|---|
| "Verify Email" tap (the button under the email field) | `POST /api/auth/password/forgot` | `docs/../apis/user/025auth.password-forgot.md` |

- Always responds `{ sent: true }`, whether or not the email is registered — do not show a
  different state for "email not found".
- The actual password reset does **not** happen on this screen or anywhere else in the
  app. It happens on the branded web page the email links to
  (`docs/../apis/user/027auth.password-reset-page.md`, which itself calls
  `docs/../apis/user/026auth.password-reset.md`). See **Known gaps → #6**.

### Start Earning

"Welcome Bonus 2000 Tokens — Ready to unlock." No backend call is made by this screen
itself; it is a static teaser between sign-in/verification and account setup.

| Action on screen | Call | Doc |
|---|---|---|
| "START EARNING" | none — navigates to **Account setup 1** | — |
| "Skip for Now" | none — navigates straight to the home/dashboard | — |

See **Known gaps → #3** — there is currently no backend concept of this bonus at all.

### Account setup 1 — Personal Information

| Action on screen | Call | Doc |
|---|---|---|
| "Continue" | `POST /api/users/me/onboarding/info` | `docs/../apis/user/007users.onboarding-info.md` |

- Screen fields → body: Name → `name`, Gender → `gender`, "Your Age" chips → `age_range`
  (`18-24`, `25-34`, `35-44`, `45-54+`).
- `country` is **required** by this endpoint but has no visible field on this screen — see
  **Known gaps → #4**.

### Account setup 2 — Enable Required Permissions

| Action on screen | Call | Doc |
|---|---|---|
| "Allow Permissions" | `POST /api/users/me/onboarding/permissions` | `docs/../apis/user/008users.onboarding-permissions.md` |

- Only the **Notification** toggle maps to a stored field (`notifications_enabled`).
  Location and Camera are OS-level device permissions the app requests locally — the
  backend has no field for either. See **Known gaps → #5**.

### Account setup 3 — Choose your interests

| Action on screen | Call | Doc |
|---|---|---|
| "Continue" | `POST /api/users/me/onboarding/interests` | `docs/../apis/user/009users.onboarding-interests.md` |

- Send the selected tile labels lowercased as `interests` (e.g. `["sports", "casual",
  "multiplayer"]`). 1–20 tags accepted.

### Account setup 4 — Set your goal

| Action on screen | Call | Doc |
|---|---|---|
| "Continue" | `POST /api/users/me/onboarding/goal` | `docs/../apis/user/010users.onboarding-goal.md` |

- Map each option to a short snake_case value, e.g. "Earn up to $10 daily" →
  `earn_10_daily`, "I want the highest rewards" → `maximize_rewards`, "No limit — earn
  big!" → `no_limit`. `primary_goal` accepts any 1–60 character string, so these values
  are a client-side convention, not a fixed enum — keep a single source of truth for them
  in the app.
- This call also flips `onboarding_completed` to `true`. After this, route to the home
  screen.

## Known gaps found while mapping this flow

1. **The in-app OTP-code screen will not work as designed for a real user.**
   `POST /api/auth/register` already auto-sends a **link-based** "Confirm my email"
   email (`otp.service.ts`, `sendVerifyEmailLink`). `POST /api/auth/email/send-otp` was
   meant to send the 4-digit code this screen collects, but it shares the same
   `OtpService.issue('verify_email', …)` path, which sends the link-based email instead
   of a numeric code **whenever the destination email already belongs to a user**
   (`if (purpose === 'verify_email' && user_id) { sendVerifyEmailLink(...); return; }`
   in `src/modules/auth/otp.service.ts`). Since this screen only ever runs for an
   email that was just registered, `user_id` is always truthy, so the numeric-code
   branch is effectively unreachable here — the user gets an email with a "Confirm my
   email" button, not a code, and has nothing to type into the 4 boxes.
   Fix needed before this screen can ship: give the code-based flow its own purpose
   (e.g. `verify_email_otp`) so it never falls into the link branch, or make `send-otp`
   force the numeric branch regardless of `user_id`. Flagging this rather than fixing it
   here since it changes auth-critical behavior — say the word and it's a small patch.
2. **Screen copy mismatch.** The Email Verification mockup's body text ("We have sent a
   password reset link to your email") is the Forget-Password screen's copy reused on
   the sign-up verification screen — a design artifact, not a backend concern, but worth
   fixing before this ships so support doesn't get "reset link" confusion from new
   sign-ups.
3. **No "Welcome Bonus 2000 Tokens" on the backend.** New wallets are created with
   `coin_balance: 0` (`wallet.service.ts`) and there is no bonus/grant table or field
   anywhere in the codebase. If the Start Earning screen's bonus is meant to actually pay
   out, a new endpoint/mechanism is needed (e.g. a one-time claim tied to
   `onboarding_completed`, mirroring how `daily.checkin` or `daily.streak.claim` already
   pay coins). Until then this screen is cosmetic only.
4. **`country` has no field on Account setup 1** but is required by
   `POST /api/users/me/onboarding/info`. Either add a country picker to that screen, or
   have the app pre-fill it silently from device locale/GPS before submitting — either
   way it must be resolved client-side, since the server does not infer it from the
   request for this endpoint.
5. **Location and Camera permission toggles are not persisted.** Only
   `notifications_enabled` is saved by step 2. Camera only matters later, at
   `docs/../apis/user/016kyc.selfie.md` time; location currently has no server-side use at all.
   Not necessarily a bug — just don't expect either to show up on `GET /api/users/me`.
6. **No in-app "set new password" screen exists in this flow**, and none is needed for
   the current backend design — password reset is deliberately link/browser-based
   (`086` → emailed link → `088` page → `087`). If product wants the whole reset to stay
   inside the app instead, that is a larger change (an OTP-style reset endpoint), not
   just a docs update.

## Endpoint quick reference

| # | Method & path | Doc |
|---|---|---|
| 001 | `POST /api/auth/register` | `docs/../apis/user/001auth.register.md` |
| 002 | `POST /api/auth/login` | `docs/../apis/user/002auth.login.md` |
| 004 | `POST /api/auth/google` | `docs/../apis/user/004auth.google.md` |
| 005 | `POST /api/auth/email/send-otp` | `docs/apis/005auth.email-send-otp.md` |
| 006 | `POST /api/auth/email/verify-otp` | `docs/apis/006auth.email-verify-otp.md` |
| 009 | `GET /api/users/me` | `docs/../apis/user/005users.me.md` |
| 011 | `POST /api/users/me/onboarding/info` | `docs/../apis/user/007users.onboarding-info.md` |
| 012 | `POST /api/users/me/onboarding/permissions` | `docs/../apis/user/008users.onboarding-permissions.md` |
| 013 | `POST /api/users/me/onboarding/interests` | `docs/../apis/user/009users.onboarding-interests.md` |
| 014 | `POST /api/users/me/onboarding/goal` | `docs/../apis/user/010users.onboarding-goal.md` |
| 086 | `POST /api/auth/password/forgot` | `docs/../apis/user/025auth.password-forgot.md` |
| 087 | `POST /api/auth/password/reset` | `docs/../apis/user/026auth.password-reset.md` |
| 088 | `GET /api/auth/password/reset` | `docs/../apis/user/027auth.password-reset-page.md` |
| 089 | `POST /api/users/me/device` | `docs/../apis/user/028users.register-device.md` |
