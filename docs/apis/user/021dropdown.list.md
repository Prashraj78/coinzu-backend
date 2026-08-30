# GET /api/dropdown

Returns the master option lists (gender, interest, and any other configured category) grouped by type, so the app never hardcodes a picker's choices.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/dropdown` |
| **Auth** | Public — no token required. |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Accept` | no | `application/json` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `types` | string | no | Comma-separated list of types to return, for example `gender,interest`. Omit to get every type. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object | Keyed by type, for example `gender` and `interest`. |
| `data.<type>[].value` | string | The value the client sends back when the user picks this option. |
| `data.<type>[].label` | string | The text to show the user. |
| `data.<type>[].icon_url` | string \| null | Public R2 URL of the option's icon, or `null` when the type has no icons. |

```json
{
  "success": true,
  "data": {
    "gender": [
      { "value": "male", "label": "Male", "icon_url": null },
      { "value": "female", "label": "Female", "icon_url": null }
    ],
    "interest": [
      { "value": "action", "label": "Action", "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/dropdown-icons/interest/action.png" }
    ]
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM005",
  "cz_error_message": "Too many requests. Please slow down and try again.",
  "cz_error_description": "Rate limit exceeded for this client.",
  "cz_error_icon": "RateLimitedIcon",
  "statusCode": 429,
  "timestamp": "2026-08-28T09:12:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `types` (query) | Not fixed — any `type` an admin has created via `POST /api/admin/dropdown/options`. Currently seeded: `gender`, `interest`. | See `docs/ENUMS.md`. |

## Example

```bash
curl http://localhost:4000/api/dropdown?types=gender,interest
```

## Notes

- Only `is_active: true` options are returned; an admin hides an option by deactivating it rather than deleting it.
- Options are sorted by `display_order` ascending within each type.
- Not paginated; every active option for the requested types comes back in one call.
- The `type` vocabulary is data, not code — a new category (for example `country`) needs no deploy, just rows added through `POST /api/admin/dropdown/options`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
