# PATCH /api/admin/dropdown/options/:id

Updates a dropdown option — including deactivating it, which is how an option is removed from `GET /api/dropdown` without deleting history.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/dropdown/options/:id` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <rewardtym_admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | string (uuid) | yes | `cz_dropdown_option_id` of the option to update. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `type` | string | no | 1 to 40 characters. | Moves the option into a different group. |
| `value` | string | no | 1 to 60 characters. | The stored value. |
| `label` | string | no | 1 to 120 characters. | The text shown to the user. |
| `icon_url` | string | no | 1 to 500 characters. | Public URL of the option's icon. |
| `display_order` | number | no | Integer, minimum 0. | Sort order within its type. |
| `is_active` | boolean | no | | Set to `false` to hide it from `GET /api/dropdown` without deleting it. |

Send only the fields you want to change.

```json
{
  "is_active": false
}
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_dropdown_option_id` | string (uuid) | Primary key of the option. |
| `type` | string | The group it belongs to. |
| `value` | string | The stored value. |
| `label` | string | The text shown to the user. |
| `icon_url` | string \| null | Public URL of the option's icon. |
| `display_order` | number | Sort order within its type. |
| `is_active` | boolean | Whether it is currently returned by `GET /api/dropdown`. |

```json
{
  "success": true,
  "data": {
    "cz_dropdown_option_id": "1a2b3c4d-5e6f-7890-abcd-ef1234567890",
    "type": "interest",
    "value": "gaming",
    "label": "Gaming",
    "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/dropdown-icons/interest/gaming.png",
    "display_order": 9,
    "is_active": false
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | The token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 404 | `CZDDRP001` | We could not find that option. | No `dropdown_options` row exists for the given `id`. | `DropdownOptionNotFoundIcon` |
| 409 | `CZDDRP002` | That option already exists. | Changing `type` and/or `value` would collide with another row's `(type, value)` pair. | `DuplicateOptionIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDDRP001",
  "cz_error_message": "We could not find that option.",
  "cz_error_description": "No dropdown_options row exists for the given id.",
  "cz_error_icon": "DropdownOptionNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-28T09:12:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `type` | Not fixed — any string. Currently seeded: `gender`, `interest`. | See `docs/ENUMS.md`. |

## Example

```bash
curl -X PATCH http://localhost:4000/api/admin/dropdown/options/1a2b3c4d-5e6f-7890-abcd-ef1234567890 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>' \
  -d '{ "is_active": false }'
```

## Notes

- Fields left out are unchanged; there is no way to clear `icon_url` back to `null` except by writing a fresh empty value at the database level.
- There is no delete endpoint. Set `is_active: false` to remove an option from the app without losing the row.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
