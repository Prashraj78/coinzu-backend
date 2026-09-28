# GET /api/admin/daily/quizzes

The quiz schedule with attempts and accuracy, plus which of the next 15 days still have no quiz. A quiz pays no currency — a right answer wins a scratch card.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/daily/quizzes` |
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
| `page` | integer | no | 1-based. Default `1`. |
| `limit` | integer | no | 1–100. Default `20`. |
| `from` | string (date) | no | Window start, `yyyy-MM-dd`. Defaults to 7 days ago. |
| `to` | string (date) | no | Window end. Defaults to 60 days ahead. |
| `search` | string | no | Matches the question or any option, case-insensitive. |
| `state` | string | no | `past`, `today` or `upcoming`. See [Enum values](#enum-values). |
| `has_image` | boolean | no | `true` for quizzes that carry an image, `false` for those that do not. |
| `is_active` | boolean | no | `true` for live quizzes, `false` for paused ones. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_quiz_id` | string (uuid) | Primary key. |
| `data[].date` | string (date) | The day it runs. One quiz per day. |
| `data[].question` | string | The question. |
| `data[].options` | string[] | Exactly three answers. |
| `data[].correct_option` | string | The right one. Admin-only — never sent to the app before answering. |
| `data[].image_url` | string \| null | Shown above the question. |
| `data[].reward_coins` | integer | Coins for a right answer. |
| `data[].reward_gems` | integer | Gems for a right answer. |
| `data[].is_active` | boolean | Inactive quizzes do not run. |
| `data[].attempts` | integer | How many users answered. |
| `data[].correct` | integer | How many got it right. |
| `data[].accuracy_pct` | integer | `correct / attempts` as a percentage. |
| `data[].is_past` | boolean | The day has gone. |
| `data[].is_today` | boolean | Running now. |
| `total` | integer | Quizzes matching the filters, across every page. |
| `page` | integer | The page returned. |
| `limit` | integer | Rows per page. |
| `pages` | integer | How many pages the filtered set has. |
| `summary.scheduled_ahead` | integer | Active quizzes today or later. |
| `summary.missing_days` | string[] | Days in the next 15 with no quiz. |
| `summary.fully_scheduled` | boolean | `true` when the next 15 days are all covered. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_quiz_id": "75130136-b35f-4e3b-b8ff-b672a1964aeb",
        "date": "2026-08-30",
        "question": "What is the name of the toy cowboy in Toy Story?",
        "options": ["SMITH", "WOODY", "JACK"],
        "correct_option": "WOODY",
        "image_url": null,
        "is_active": true,
        "attempts": 1,
        "correct": 1,
        "accuracy_pct": 100,
        "is_past": false,
        "is_today": true
      }
    ],
    "total": 16,
    "page": 1,
    "limit": 20,
    "pages": 1,
    "summary": {
      "scheduled_ahead": 16,
      "missing_days": [],
      "fully_scheduled": true
    }
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
  "timestamp": "2026-08-30T06:50:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `state` | `past`, `today`, `upcoming` | Relative to the UTC date. Omit for all three. |

## Example

```bash
# The default page
curl "$BASE/admin/daily/quizzes" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Page 3, five at a time
curl "$BASE/admin/daily/quizzes?page=3&limit=5" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Everything still to run that has no image
curl "$BASE/admin/daily/quizzes?state=upcoming&has_image=false" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Find a question by wording, or by one of its options
curl "$BASE/admin/daily/quizzes?search=cowboy" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **The summary ignores the filters and the page.** `missing_days`, `fully_scheduled` and `scheduled_ahead` are always counted across the whole horizon, so filtering down to one quiz never makes the schedule look complete when it is not.
- **A day with no quiz is a day with no scratch cards.** The quiz is the only source of a card, so an unscheduled day silently switches off the Scratch & Win game for everyone — which makes `missing_days` more consequential than it looks.
- **`summary.missing_days` is the number to watch.** A day with no quiz leaves the Take the Quiz tile unplayable, which also makes the master chest unreachable that day. The tab turns each missing day into a shortcut for scheduling one.
- **`correct_option` is included here and nowhere else.** The user-facing quiz endpoint withholds it until an answer is submitted.
- `accuracy_pct` is worth watching on a live quiz: near 100% means it is too easy, near 0% usually means the options are ambiguous.
- Ordered by date ascending, past days first, so the window reads as a calendar. Paging follows that order.
- `search` matches the question text and the options, so looking up an answer finds the quiz that uses it.
