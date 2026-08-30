# GET /api/admin/dropdown/types

Every dropdown category with how many options it holds — the left-hand list of the Dropdown tab. Paginated and searchable.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/dropdown/types` |
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
| `page` | integer | no | 1-based page number. Default `1`. |
| `limit` | integer | no | Rows per page, max 100. Default `20`. |
| `search` | string | no | Case-insensitive substring match against `type` or `label`. |
| `is_active` | boolean | no | `true` for live categories only, `false` for retired ones. Omit for both. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_dropdown_type_id` | string (uuid) | Primary key. Pass it to `PATCH /api/admin/dropdown/types/:id`. |
| `data[].type` | string | The immutable key the app sends and reads, for example `interest`. |
| `data[].label` | string | Human name shown in the panel. |
| `data[].description` | string \| null | What the category is for. |
| `data[].display_order` | number | Sort position in the panel, ascending. |
| `data[].is_active` | boolean | `false` hides the whole category from the public `GET /api/dropdown`. |
| `data[].option_count` | number | How many options sit in this category, inactive included. |
| `data[].active_option_count` | number | How many of those are active. |
| `data[].created_at` | string (date-time) | When the category was onboarded. |
| `data[].updated_at` | string (date-time) | Last change. |
| `total` | integer | Total categories matching the filters, all pages. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_dropdown_type_id": "0f8b2f1c-5c1a-4a1e-9d1e-2b6d0a5c9e77",
        "type": "interest",
        "label": "Interest",
        "description": "Topics a user picks during onboarding.",
        "display_order": 0,
        "is_active": true,
        "option_count": 9,
        "active_option_count": 9,
        "created_at": "2026-08-29T05:42:11.204Z",
        "updated_at": "2026-08-29T05:42:11.204Z"
      }
    ],
    "total": 5
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "Authorization header is missing.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-29T05:43:04.183Z"
}
```

## Enum values

None. `type` is free-form and grows as categories are onboarded — never hard-code the list.

## Example

```bash
curl "http://localhost:4000/api/admin/dropdown/types?page=1&limit=20&search=inter&is_active=true" \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>'
```

## Notes

- Ordered by `display_order` ascending, then `type` alphabetically.
- `option_count`/`active_option_count` are computed per page, so paging never counts rows you cannot see.
- Turning a category inactive hides every option inside it from the public `GET /api/dropdown` without touching the option rows themselves.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
