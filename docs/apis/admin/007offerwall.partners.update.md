# PATCH /api/admin/offerwall/partners/:id

Updates a partner — rank, badge, URL template, rev share, logo, or hide/show — the edit action on the Partners tab.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/offerwall/partners/:id` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | string (uuid) | yes | `cz_offerwall_partner_id` to update. |

### Body

All fields optional; send only what changes. Same fields and rules as [Create](006offerwall.partners.create.md#body), all optional.

```json
{
  "rank": 200,
  "badge_label": "Featured",
  "revenue_share_percent": 60,
  "is_active": true
}
```

## Response

### Success — `200`

Same shape as [Create](006offerwall.partners.create.md#success--200), reflecting the row after the update. `postback_secret` is included only if it was just changed by this call; otherwise the saved value is still present on the returned entity but selected the same way as any other read.

```json
{
  "success": true,
  "data": {
    "cz_offerwall_partner_id": "2f8b41c9-6d05-4a77-9e12-8c4b0d75a361",
    "name": "AdGate Media",
    "slug": "adgate-media",
    "rank": 200,
    "badge_label": "Featured",
    "revenue_share_percent": 60,
    "is_active": true,
    "updated_at": "2026-08-28T07:00:00.000Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 404 | `CZDOFW001` | We could not find that offerwall. | No partner exists for `id`. | `ProviderNotFoundIcon` |
| 409 | `CZDOFW003` | That offerwall slug is already in use. | Changing `slug` to one another partner already has. | `DuplicateOptionIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation or an unknown field was sent. | `ValidationFailedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDOFW001",
  "cz_error_message": "We could not find that offerwall.",
  "cz_error_description": "No offerwall_partners row exists for the given id.",
  "cz_error_icon": "ProviderNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-28T07:43:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `postback_method` | `get`, `post` | Independent of `postback_auth_type` — either method works with either auth type. |
| `postback_auth_type` | `token`, `hmac_sha256` | — |

## Example

```bash
curl -X PATCH $BASE/admin/offerwall/partners/2f8b41c9-6d05-4a77-9e12-8c4b0d75a361 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "rank": 200, "badge_label": "Featured", "revenue_share_percent": 60 }'
```

## Notes

- Changing `postback_secret` or `slug` invalidates the 60-second in-memory secret cache used to verify inbound postbacks, so the change takes effect on the next postback with no restart needed.
- Setting `is_active: false` removes the partner from `GET /api/offerwall` immediately but does not affect postbacks already recorded, and still rejects new postbacks for it (`CZDOFW002`).
- Upload a new logo via [063](010offerwall.partners.upload-logo.md) first, then send the returned URL as `logo_url` here — the old file at a replaced URL is not deleted.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
