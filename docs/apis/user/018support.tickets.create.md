# POST /api/support/tickets

**One endpoint backs three screens: Report a Problem, Feedback, and Email Support.** Which one you are sending is decided by `type`. There is no separate `/feedback` endpoint and there should not be one; they are the same table and the same row shape.

## Which screen sends what

| Screen | `type` | Required beyond `description` | Also sends |
|---|---|---|---|
| **Feedback** (star rating) | `feedback` | `rating` (1 to 5) | nothing else |
| **Report a Problem** | `report_problem` | — | `category`, `issue_type`, `occurred_at`, `affected_area` |
| **Email Support** | `email_support` | — | `category`, `subject` |

### Feedback request

The Feedback screen is the smallest of the three. Stars plus the message, nothing more:

```json
{
  "type": "feedback",
  "rating": 5,
  "description": "The daily check in streak keeps me coming back. Payouts have always arrived on time."
}
```

`rating` is **required** here and rejected with `CZDCOMM001` if missing, because the stars are that screen's main input. `category`, `issue_type`, `occurred_at` and `affected_area` are all meaningless for feedback and can be left out.

Admins read feedback back through `GET /api/admin/tickets?type=feedback`, which also returns a star summary. See [`../admin/033tickets.list.md`](../admin/033tickets.list.md).

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/support/tickets` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `type` | string | yes | One of `email_support`, `report_problem`, `feedback`. | What kind of message this is. |
| `category` | string | no | At most 60 characters. | Topic, for example `Withdrawals`. Free text: the app hard-codes the picker options. |
| `issue_type` | string | no | At most 60 characters. | The form's second dropdown, for example `Coins not credited`. Free text, same as `category`. |
| `occurred_at` | string (date-time) | no | ISO-8601, UTC. | When the problem happened, from the "When did the issue happen?" picker. |
| `affected_area` | string | no | At most 120 characters. | Where in the app it happened, for example `Offers page` or `Wallet`. Optional on the form. |
| `subject` | string | no | At most 255 characters. | Short title. |
| `description` | string | yes | At most 1000 characters, matching the form's counter. | What the user wants to say. |
| `rating` | number | **yes for `feedback`** | Whole number from 1 to 5. | Star rating from the Feedback screen. Required when `type` is `feedback`, ignored otherwise. |
| `attachment_urls` | string[] | no | Every item has to be a valid URL. | Screenshots, uploaded beforehand. |

```json
{
  "type": "report_problem",
  "category": "Withdrawals",
  "subject": "Coins missing after offer",
  "description": "I completed the offer yesterday but got no coins.",
  "attachment_urls": ["https://cdn.coinzu.app/support/a.png"]
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_support_ticket_id` | string (uuid) | Primary key of the ticket. |
| `user_id` | string (uuid) | Who raised it. |
| `type` | string | `email_support`, `report_problem` or `feedback`. |
| `category` | string \| null | Free-text topic, for example `Withdrawals`. |
| `issue_type` | string \| null | Free-text issue type, for example `Coins not credited`. |
| `occurred_at` | string (iso date) \| null | When the user says the problem happened. |
| `affected_area` | string \| null | Where in the app it happened. |
| `subject` | string \| null | Short title. |
| `description` | string | What the user wrote. |
| `rating` | number \| null | Star rating from 1 to 5, feedback only. |
| `attachment_urls` | string[] | Uploaded screenshots. Empty array when none. |
| `status` | string | `open`, `in_progress` or `resolved`. `open` is shown as **Pending**. |
| `admin_response` | string \| null | The reply from support. |
| `resolved_by` | string (uuid) \| null | The admin who resolved it. |
| `created_at` | string (iso date) | When it was raised. |
| `updated_at` | string (iso date) | When it last changed. |
| `messages` | object[] | The conversation thread, seeded with the user's own message. |
| `messages[].from` | string | `user` or `admin`. Always `user` today. |
| `messages[].body` | string | The message text. |
| `messages[].author_id` | string | Coinzu user uuid, or the Rewardtym admin id on an admin turn. |
| `messages[].created_at` | string (iso date) | When the turn was written. |

```json
{
  "success": true,
  "data": {
      "cz_support_ticket_id": "9e0b4a72-63d5-4c81-a297-5f14c8e0b3d6",
      "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
      "type": "report_problem",
      "category": "Withdrawals",
      "subject": "Coins missing after offer",
      "description": "I completed the offer yesterday but got no coins.",
      "rating": null,
      "attachment_urls": ["https://cdn.coinzu.app/support/a.png"],
      "status": "open",
      "admin_response": null,
      "resolved_by": null,
      "created_at": "2026-08-27T07:55:12.000Z",
      "updated_at": "2026-08-27T07:55:12.000Z"
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
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "One or more fields in the request are invalid.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `open`, `in_progress`, `resolved` | — |
| `type` | `email_support`, `report_problem`, `feedback` | — |

## Example

```bash
curl -X POST http://localhost:4000/api/support/tickets \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{
    "type": "report_problem",
    "category": "Withdrawals",
    "subject": "Coins missing after offer",
    "description": "I completed the offer yesterday but got no coins."
  }'
```

## Notes

- **This endpoint backs three screens.** Report a Problem sends `type: "report_problem"` with the category, issue type, occurred-at and affected area. Feedback sends `type: "feedback"` with a `rating` and the message. Email support sends `type: "email_support"`. They are one table and one endpoint on purpose.
- `rating` is required when `type` is `feedback` and rejected with `CZDCOMM001` if missing, because the stars are that screen's main input.

- `category` and `issue_type` are deliberately free text, not enums. The app hard-codes both dropdowns, so product can add an option without a backend release. The admin panel builds its filters from the values actually present.
- `occurred_at` is what the user says happened; `created_at` is when they pressed submit. Do not conflate them when triaging.
- **Replies are one-way for now.** `messages` is stored as JSON and starts with the user's message. When admin replies ship they append a `from: "admin"` turn, so no schema change is needed then.
- `status` moves `open` to `in_progress` to `resolved`. The app and the admin panel both label `open` as "Pending".

- Tickets always start as `open`.
- Attachments are uploaded first through `POST /api/storage/avatar`, and the URLs it returns are sent here.
- The user is notified in the app when support replies.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
