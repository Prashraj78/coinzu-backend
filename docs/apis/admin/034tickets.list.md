# GET /api/admin/tickets

Every problem report, support request and piece of feedback, each with the user who raised it. The Problem Reports tab table.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/tickets` |
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
| `search` | string | no | Case-insensitive match against the user's email or name, the subject, or the description. |
| `type` | string | no | One kind of ticket. See [Enum values](#enum-values). |
| `status` | string | no | One state. See [Enum values](#enum-values). |
| `category` | string | no | Exact match on the free-text category. Use a value from `filters.categories`. |
| `issue_type` | string | no | Exact match on the free-text issue type. Use a value from `filters.issue_types`. |
| `rating` | integer | no | Exact star rating, 1 to 5. Only feedback rows carry one, so this narrows to feedback in practice. |
| `cz_user_id` | string (uuid) | no | Only this user's reports. |
| `date_from` | string (date) | no | Reported on/after this UTC date (inclusive), `yyyy-MM-dd`. |
| `date_end` | string (date) | no | Reported on/before this UTC date (inclusive), `yyyy-MM-dd`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_support_ticket_id` | string (uuid) | Use this to open `GET /api/admin/tickets/:id`. |
| `data[].type` | string | What kind of message it is. |
| `data[].category` | string \| null | Free-text topic the user picked. |
| `data[].issue_type` | string \| null | Free-text issue type the user picked. |
| `data[].affected_area` | string \| null | Where in the app it happened. |
| `data[].subject` | string \| null | Short title, when the form collected one. |
| `data[].description` | string | What the user wrote. |
| `data[].status` | string | Current state. |
| `data[].rating` | number \| null | Star rating from 1 to 5. `null` on anything that is not feedback. |
| `data[].occurred_at` | string (date-time) \| null | When the user says it happened. |
| `data[].created_at` | string (date-time) | When they submitted the report. |
| `data[].updated_at` | string (date-time) | When it last changed. |
| `data[].user.cz_user_id` | string (uuid) | Who raised it. Links to `GET /api/admin/users/:cz_user_id`. |
| `data[].user.email` | string | Their email. |
| `data[].user.name` | string \| null | Their display name. |
| `data[].user.avatar_url` | string \| null | Their profile photo. |
| `total` | integer | Reports matching the filters, all pages. |
| `filters.categories` | string[] | Every category value actually present, sorted. Build the category dropdown from this. |
| `filters.issue_types` | string[] | Every issue-type value actually present, sorted. |
| `ratings.count` | integer | How many of the matching rows carry a rating. Not the same as `total`. |
| `ratings.average` | number | Mean rating across those rows, two decimals. `0` when none. |
| `ratings.distribution` | object | Count per star, keyed `"1"` to `"5"`. Drives the Feedback tab's bars. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_support_ticket_id": "9d23c68e-14bd-4974-8aff-b38ea6af192e",
        "type": "report_problem",
        "category": "Rewards",
        "issue_type": "Coins not credited",
        "affected_area": "Offers page",
        "subject": null,
        "description": "I completed the Coin Master offer two days ago but no coins arrived.",
        "status": "open",
        "rating": null,
        "occurred_at": "2026-08-27T14:30:00.000Z",
        "created_at": "2026-08-29T08:09:19.992Z",
        "updated_at": "2026-08-29T08:09:19.992Z",
        "user": {
          "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
          "email": "prashantrajputaaaa@gmail.com",
          "name": "Prashant",
          "avatar_url": null
        }
      }
    ],
    "total": 6,
    "filters": {
      "categories": ["Account", "General", "Payment", "Rewards", "Security"],
      "issue_types": ["Account access", "Cannot sign in", "Coins not credited"]
    },
    "ratings": {
      "count": 6,
      "average": 3.83,
      "distribution": { "1": 0, "2": 1, "3": 1, "4": 2, "5": 2 }
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A filter is not one of its allowed values, or a date is not `yyyy-MM-dd`. | `ValidationFailedIcon` |
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
  "timestamp": "2026-08-29T08:12:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `type` / `data[].type` | `report_problem`, `email_support`, `feedback` | |
| `status` / `data[].status` | `open`, `in_progress`, `resolved` | `open` is rendered as **Pending** in both the app and the panel. |
| `category` / `issue_type` | not a fixed set | Free text the app hard-codes. Read the live values from `filters` rather than assuming a list. |

## Example

```bash
curl "$BASE/admin/tickets?type=report_problem&status=open&category=Rewards&date_from=2026-08-01&date_end=2026-08-29&page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Newest first. Every filter combines as `AND`; the dates filter on `created_at`, both inclusive, in UTC.
- `filters` is computed from the whole table, not the current page, so the dropdowns stay stable while you page through.
- `category` and `issue_type` are free text on purpose: the app hard-codes both pickers so product can add an option with no backend release. That is why the filter values come back with the data instead of being an enum.
- **This one endpoint backs two tabs.** Problem Reports calls it plainly; Feedback calls it with `type=feedback` and reads `ratings` for its average and star bars. There is no separate feedback endpoint, and there should not be one.
- `ratings` is computed over the same filters as the rows, so filtering to 5 stars gives you `count` for that slice rather than the whole table.
- The user is joined in, so the table renders who reported what without an N+1.
- `occurred_at` is when the user says it happened and `created_at` is when they submitted. Both are shown because they often differ.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
