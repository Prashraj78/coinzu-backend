# GET /api/admin/dropdown/options

Lists every dropdown option, inactive included, so the admin panel can manage the master lists that back `GET /api/dropdown`.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/dropdown/options` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <rewardtym_admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | 1-based page number. Default `1`. |
| `limit` | integer | no | Rows per page, max 100. Default `20`. |
| `type` | string | no | Only options in this category. Omit to list across every category. |
| `search` | string | no | Case-insensitive substring match against `value` or `label`. |
| `is_active` | boolean | no | `true` for live options only, `false` for retired ones. Omit for both. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | Every option, ordered by type then display order. |
| `data[].cz_dropdown_option_id` | string (uuid) | Primary key of the option. |
| `data[].type` | string | The group this option belongs to, for example `gender` or `interest`. |
| `data[].value` | string | The stored value the client sends back. |
| `data[].label` | string | The text shown to the user. |
| `data[].icon_url` | string \| null | Public R2 URL of the option's icon. |
| `data[].display_order` | number | Sort order within its type, lowest first. |
| `data[].is_active` | boolean | Inactive options are hidden from `GET /api/dropdown`. |
| `total` | number | How many options exist across every type. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_dropdown_option_id": "0f1b2c3d-4e5f-6789-abcd-ef0123456789",
        "type": "interest",
        "value": "action",
        "label": "Action",
        "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/dropdown-icons/interest/action.png",
        "display_order": 0,
        "is_active": true
      }
    ],
    "total": 13
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
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "No Bearer token was provided in the Authorization header.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-28T09:12:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `type` | Not fixed — any string an admin has used. Currently seeded: `gender`, `interest`. | See `docs/ENUMS.md`. |

## Example

```bash
curl "http://localhost:4000/api/admin/dropdown/options?page=1&limit=20&type=interest&search=gam&is_active=true" \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>'
```

## Notes

- Paginated. A category like `error_icon` holds dozens of rows, so always send `type` when you are rendering one category's table and page through it rather than pulling everything.
- `total` counts the rows matching the filters, not the whole table.
- Returns inactive rows too, unlike the public `GET /api/dropdown`, so the panel can re-activate an option.
- The categories themselves live in `dropdown_types` — list them with `GET /api/admin/dropdown/types` and onboard a new one with `POST /api/admin/dropdown/types` before adding options to it.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
