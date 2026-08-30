# PATCH /api/admin/dropdown/types/:id

Updates a dropdown category's presentation or retires it. The `type` key itself is never editable.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/dropdown/types/:id` |
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

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | string (uuid) | yes | The `cz_dropdown_type_id` from `GET /api/admin/dropdown/types`. |

### Body

Every field is optional; send only what changes.

| Name | Type | Required | Rules | Description |
|---|---|---|---|---|
| `label` | string | no | Max 120 chars. | Human name shown in the panel. |
| `description` | string | no | Max 300 chars. | What the category is for. |
| `display_order` | number | no | Integer, 0 or more. | Sort position in the panel, ascending. |
| `is_active` | boolean | no | — | `false` hides the category and every option in it from `GET /api/dropdown`. |

```json
{
  "label": "Payout reason",
  "display_order": 2,
  "is_active": false
}
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_dropdown_type_id` | string (uuid) | Primary key. |
| `type` | string | Unchanged — this endpoint never edits it. |
| `label` | string | Human name after the update. |
| `description` | string \| null | What the category is for. |
| `display_order` | number | Sort position. |
| `is_active` | boolean | Whether it is live. |
| `created_at` | string (date-time) | When it was onboarded. |
| `updated_at` | string (date-time) | When this update landed. |

```json
{
  "success": true,
  "data": {
    "cz_dropdown_type_id": "3a91d2b7-6f0e-4c22-8a3f-11c7d9e4b5a0",
    "type": "payout_reason",
    "label": "Payout reason",
    "description": "Shown when a withdrawal is rejected.",
    "display_order": 2,
    "is_active": false,
    "created_at": "2026-08-29T05:46:02.117Z",
    "updated_at": "2026-08-29T05:52:40.905Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDDRP003` | We could not find that category. | No `dropdown_types` row exists for the given id. | `DropdownOptionNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field is the wrong type or over its length limit. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDDRP003",
  "cz_error_message": "We could not find that category.",
  "cz_error_description": "No dropdown_types row exists for the given id.",
  "cz_error_icon": "DropdownOptionNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T05:52:06.810Z"
}
```

## Enum values

None.

## Example

```bash
curl -X PATCH http://localhost:4000/api/admin/dropdown/types/3a91d2b7-6f0e-4c22-8a3f-11c7d9e4b5a0 \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"label":"Payout reason","is_active":false}'
```

## Notes

- `type` is write-once and this endpoint ignores it entirely — the DTO does not accept the field.
- Setting `is_active: false` retires the whole category at once: its options stay in the database and keep their own `is_active`, but none of them reach `GET /api/dropdown` while the category is off.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
