# POST /api/admin/dropdown/types

Onboards a new dropdown category. Create the category first, then add its options with `POST /api/admin/dropdown/options`.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/dropdown/types` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |
| `Content-Type` | yes | `application/json` |

### Path / query params

None.

### Body

| Name | Type | Required | Rules | Description |
|---|---|---|---|---|
| `type` | string | yes | Max 40 chars, matches `^[a-z][a-z0-9_]*$`, unique. | The key the app sends and reads. Permanent — it cannot be edited afterwards. |
| `label` | string | yes | Max 120 chars. | Human name shown in the panel. |
| `description` | string | no | Max 300 chars. | What the category is for. |
| `display_order` | number | no | Integer, 0 or more. Default `0`. | Sort position in the panel, ascending. |
| `is_active` | boolean | no | Default `true`. | `false` hides the category and every option in it from `GET /api/dropdown`. |

```json
{
  "type": "payout_reason",
  "label": "Payout reason",
  "description": "Shown when a withdrawal is rejected.",
  "display_order": 5,
  "is_active": true
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_dropdown_type_id` | string (uuid) | Primary key of the new category. |
| `type` | string | The key you sent. |
| `label` | string | Human name. |
| `description` | string \| null | What the category is for. |
| `display_order` | number | Sort position. |
| `is_active` | boolean | Whether it is live. |
| `created_at` | string (date-time) | When it was onboarded. |
| `updated_at` | string (date-time) | Same as `created_at` on creation. |

```json
{
  "success": true,
  "data": {
    "cz_dropdown_type_id": "3a91d2b7-6f0e-4c22-8a3f-11c7d9e4b5a0",
    "type": "payout_reason",
    "label": "Payout reason",
    "description": "Shown when a withdrawal is rejected.",
    "display_order": 5,
    "is_active": true,
    "created_at": "2026-08-29T05:46:02.117Z",
    "updated_at": "2026-08-29T05:46:02.117Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 409 | `CZDDRP004` | That category already exists. | A `dropdown_types` row already uses this `type` key. | `DuplicateOptionIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `type` is missing, too long, or does not match `^[a-z][a-z0-9_]*$`; or `label` is missing. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDDRP004",
  "cz_error_message": "That category already exists.",
  "cz_error_description": "A dropdown_types row already uses this type key.",
  "cz_error_icon": "DuplicateOptionIcon",
  "statusCode": 409,
  "timestamp": "2026-08-29T05:46:17.672Z"
}
```

## Enum values

None. `type` is free-form within the `^[a-z][a-z0-9_]*$` shape.

## Example

```bash
curl -X POST http://localhost:4000/api/admin/dropdown/types \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"type":"payout_reason","label":"Payout reason","description":"Shown when a withdrawal is rejected."}'
```

## Notes

- `type` is the contract the app codes against, so it is write-once — there is no endpoint that renames it. Retire a category with `is_active: false` and onboard a replacement instead.
- Creating a category does not create any options. `POST /api/admin/dropdown/options` rejects a `type` that has no category row with `CZDDRP003`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
