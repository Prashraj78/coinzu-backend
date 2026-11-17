# POST /api/users/me/onboarding/contacts

Web account setup — saves where to reach the user (one app plus their handle or number on it) and marks onboarding complete.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/users/me/onboarding/contacts` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `contact_platform` | string | yes | One of `telegram`, `whatsapp`, `skype`, `discord`. | The app picked in the dropdown. |
| `contact_value` | string | yes | 1–100 characters, not blank after trimming. | Username, ID or number on that app. |

```json
{
  "contact_platform": "whatsapp",
  "contact_value": "+919875643266"
}
```

## Response

### Success — `201`

The full user, same shape as `GET /api/users/me`, with `onboarding_completed: true` and `contact` set.

| Field | Type | Description |
|---|---|---|
| `signup_platform` | string | `app` or `web`: where the account was created. |
| `contact` | object \| null | Where to reach the user. |
| `contact.platform` | string | One of `telegram`, `whatsapp`, `skype`, `discord`. |
| `contact.value` | string | The trimmed handle or number. |
| `onboarding_completed` | boolean | Always `true` after this call. |

```json
{
  "success": true,
  "data": {
    "cz_user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
    "email": "user@coinzu.app",
    "signup_platform": "web",
    "contact": { "platform": "whatsapp", "value": "+919875643266" },
    "onboarding_completed": true
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | When | Icon |
|---|---|---|---|---|
| 400 | `CZDUSER012` | Please enter your username or number. | `contact_value` is blank after trimming. | `ValidationFailedIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | Missing field, unknown `contact_platform`, or a value over 100 characters. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Missing access token. | `SignInRequiredIcon` |

## Enum values

| Field | Values |
|---|---|
| `contact_platform` / `contact.platform` | `telegram`, `whatsapp`, `skype`, `discord` |
| `signup_platform` | `app`, `web` |

## Example

```bash
curl -X POST $BASE/users/me/onboarding/contacts \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "contact_platform": "whatsapp", "contact_value": "+919875643266" }'
```

## Notes

- Also sets `country` from the request, like the app's info step: CDN country header first, then IP geo (never from the client body). Outside production a localhost caller uses the machine's own public IP.
- One contact per user, stored in the single `users.contact` jsonb column. Calling this again replaces it, which is how the user changes it later.
- This is the web build's only setup step; the app still uses the four `onboarding/*` steps.
- The call that completes onboarding credits the welcome bonus only when `signup_platform` is `app`. The `onboarding_completed` referral reward still fires.
