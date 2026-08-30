# GET /api/auth/password/reset

The branded HTML page a user lands on after tapping "Reset password" in the forgot-password email. Not a JSON API — this is what the app's transactional email links to, not something the app calls itself.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/auth/password/reset` |
| **Auth** | Public — no token required. |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

None.

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `token` | string | yes | 64 lowercase hex characters, from the emailed link. Anything else (missing, wrong shape, or a token that no longer exists in Redis) renders the "link isn't valid" state instead of the form — the raw value is never reflected back into the page. |

### Body

None.

## Response

### Success — `200`

Always `200` with `Content-Type: text/html`. The server pre-checks the token against Redis (without consuming it) before choosing what to render:

- **Valid token** — a form with "new password" and "confirm password" fields. On submit, the page validates length and that both fields match, then calls `POST /api/auth/password/reset`. On success it shows "Password updated! Open the Coinzu app and log in with your new password." On failure it shows an inline error and leaves the form open to retry.
- **Invalid or expired token** — a failure animation and a message asking the user to request a new link from the app; no form is shown.

No JSON body — the page itself is the response.

### Errors

This route does not throw API errors; a bad or expired token is rendered as a page state, not an HTTP error status.

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl "http://localhost:4000/api/auth/password/reset?token=bb4587ed1a5dc5d1e42453d14f05913d6b96eb25dcfa14ba6589f5421491b2a"
```

## Notes

- Excluded from Swagger (`@ApiExcludeController`) and from the `{success, data}` envelope — it writes raw HTML via `@Res()`, bypassing `ResponseTransformInterceptor`.
- Unlike the confirm-email page, this route checks token validity server-side at page-load time (`LinkTokenService.exists`, a read-only Redis lookup) so an already-used or expired link never shows a form the user can fill in only to have it fail.
- The `token` query param is validated against `/^[a-f0-9]{64}$/` before it is ever used — an invalid shape short-circuits straight to the error state without a Redis lookup.
- Branding assets (the Coinzu logo and three Lottie animations — loading, success, failure) are embedded directly in the page as a base64 image and inline JSON. The only external request is the `lottie-web` player script from a CDN.
- The actual reset happens over `POST /api/auth/password/reset` (see `026auth.password-reset.md`) — this route only renders the shell and form, and runs that call from the browser on submit.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
