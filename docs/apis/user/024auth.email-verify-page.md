# GET /api/auth/email/verify

The branded HTML page a user lands on after tapping "Confirm my email" in the verification email. Not a JSON API — this is what the app's transactional email links to, not something the app calls itself.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/auth/email/verify` |
| **Auth** | Public — no token required. |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

None.

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `token` | string | yes | 64 lowercase hex characters, from the emailed link. Anything else (missing, wrong shape) renders the "link isn't valid" state — the raw value is never reflected back into the page. |

### Body

None.

## Response

### Success — `200`

Always `200` with `Content-Type: text/html`, regardless of whether the token turns out to be valid — validity is resolved client-side. The page:

1. Shows a loading animation and calls `POST /api/auth/email/verify` with the token.
2. On success, stores the returned `access_token` in `localStorage` under `coinzu_access_token`, plays a success animation, and shows "Email verified! Open the Coinzu app to check your account details."
3. On failure (expired/used token, or any other error), plays a failure animation and shows a message asking the user to request a new link from the app.

No JSON body — the page itself is the response.

### Errors

This route does not throw API errors; a bad or expired token is rendered as a page state, not an HTTP error status.

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl "http://localhost:4000/api/auth/email/verify?token=aa7782ba386f30ba490d8375100fbf29014e60e2935e5b088e0e7170f07a4fe"
```

## Notes

- Excluded from Swagger (`@ApiExcludeController`) and from the `{success, data}` envelope — it writes raw HTML via `@Res()`, bypassing `ResponseTransformInterceptor`.
- The `token` query param is validated against `/^[a-f0-9]{64}$/` before it is ever used in the page — an invalid shape short-circuits straight to the error state without a network call.
- Branding assets (the Coinzu logo and three Lottie animations — loading, success, failure) are embedded directly in the page as a base64 image and inline JSON, so the page has no dependency on this backend's other static routes. The only external request is the `lottie-web` player script from a CDN.
- The actual verification happens over `POST /api/auth/email/verify` (see `023auth.email-verify-link.md`) — this route only renders the shell and runs that call from the browser.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
