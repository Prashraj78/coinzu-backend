# GET /api/admin/offerwall/partners/:id/postback-url

Returns the full postback URL, secret, and HTTP method to hand this partner — the "copy postback URL" action on the Partners tab.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/offerwall/partners/:id/postback-url` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | string (uuid) | yes | The `cz_offerwall_partner_id`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `url` | string | The full postback URL: `{API_BASE_URL}/api/offerwall/postback/{slug}/{postback_secret}`. Give this to the partner as-is. |
| `secret` | string | The partner's `postback_secret`, in case it is needed separately (e.g. to configure HMAC signing). |
| `method` | string | `GET` or `POST`, upper-cased — the HTTP verb the partner should call it with. |

```json
{
  "success": true,
  "data": {
    "url": "https://api.coinzu.app/api/offerwall/postback/adgate-media/9f2c8a11c4d7b3e5b0d75a3612ff9021",
    "secret": "9f2c8a11c4d7b3e5b0d75a3612ff9021",
    "method": "GET"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | The token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 404 | `CZDOFW001` | We could not find that offerwall. | No partner exists with that `id`. | `ProviderNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDOFW001",
  "cz_error_message": "We could not find that offerwall.",
  "cz_error_description": "No offerwall_partners row exists for the given id or slug.",
  "cz_error_icon": "ProviderNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-28T07:43:04.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl $BASE/admin/offerwall/partners/2f8b41c9-6d05-4a77-9e12-8c4b0d75a361/postback-url \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- `API_BASE_URL` is the `Env.urls.api` value the server is configured with (`API_BASE_URL` env var, defaults to `http://localhost:4000`).
- The URL keeps working after the secret is rotated — an admin should re-fetch it and re-share it with the partner whenever `postback_secret` changes.
- For a `hmac_sha256` partner, `secret` is the signing key rather than a path token, but the URL is still built the same way — the path segment is unused by the verifier in that mode but is still required to route the request.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses a **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products it may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in a database.
