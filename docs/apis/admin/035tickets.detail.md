# GET /api/admin/tickets/:cz_support_ticket_id

One report with the account behind it and the full message thread. The detail page a Problem Reports row opens.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/tickets/:cz_support_ticket_id` |
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
| `cz_support_ticket_id` | string (uuid) | yes | From a `GET /api/admin/tickets` row. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `ticket.cz_support_ticket_id` | string (uuid) | Primary key. |
| `ticket.type` | string | What kind of message it is. |
| `ticket.category` | string \| null | Free-text topic. |
| `ticket.issue_type` | string \| null | Free-text issue type. |
| `ticket.affected_area` | string \| null | Where in the app it happened. |
| `ticket.subject` | string \| null | Short title. |
| `ticket.description` | string | What the user wrote. Also the first entry in `messages`. |
| `ticket.rating` | number \| null | Star rating from 1 to 5. Always set on `feedback`, always `null` otherwise. |
| `ticket.attachment_urls` | string[] | Screenshots the user attached. Empty array when none. |
| `ticket.status` | string | Current state. |
| `ticket.admin_response` | string \| null | Legacy single reply field. `null` until replies ship; `messages` is the thread going forward. |
| `ticket.resolved_by` | string \| null | Rewardtym admin id that resolved it. |
| `ticket.occurred_at` | string (date-time) \| null | When the user says it happened. |
| `ticket.created_at` | string (date-time) | When it was submitted. |
| `ticket.updated_at` | string (date-time) | When it last changed. |
| `user.cz_user_id` | string (uuid) | Who raised it. |
| `user.email` | string | Their email. |
| `user.name` | string \| null | Their display name. |
| `user.avatar_url` | string \| null | Their profile photo. |
| `user.status` | string | Their account state. |
| `user.country` | string \| null | Their ISO country code. |
| `user.joined_at` | string (date-time) | When they created the account. |
| `messages[].from` | string | `user` or `admin`. |
| `messages[].body` | string | The message text. |
| `messages[].author_id` | string | Coinzu user uuid, or the Rewardtym admin id on an admin turn. |
| `messages[].created_at` | string (date-time) | When the turn was written. |

```json
{
  "success": true,
  "data": {
    "ticket": {
      "cz_support_ticket_id": "9d23c68e-14bd-4974-8aff-b38ea6af192e",
      "type": "report_problem",
      "category": "Rewards",
      "issue_type": "Coins not credited",
      "affected_area": "Offers page",
      "subject": null,
      "description": "I completed the Coin Master offer two days ago but no coins arrived.",
      "rating": null,
      "attachment_urls": [],
      "status": "open",
      "admin_response": null,
      "resolved_by": null,
      "occurred_at": "2026-08-27T14:30:00.000Z",
      "created_at": "2026-08-29T08:09:19.992Z",
      "updated_at": "2026-08-29T08:09:19.992Z"
    },
    "user": {
      "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
      "email": "prashantrajputaaaa@gmail.com",
      "name": "Prashant",
      "avatar_url": null,
      "status": "active",
      "country": null,
      "joined_at": "2026-08-28T15:27:07.831Z"
    },
    "messages": [
      {
        "from": "user",
        "body": "I completed the Coin Master offer two days ago but no coins arrived.",
        "author_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
        "created_at": "2026-08-29T08:09:19.992Z"
      }
    ]
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDSUP001` | We could not find that request. | No `support_tickets` row exists for the given id. | `TicketNotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDSUP001",
  "cz_error_message": "We could not find that request.",
  "cz_error_description": "No support ticket exists for the given id and user.",
  "cz_error_icon": "TicketNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T08:13:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `ticket.type` | `report_problem`, `email_support`, `feedback` | |
| `ticket.status` | `open`, `in_progress`, `resolved` | `open` is rendered as **Pending**. |
| `messages[].from` | `user`, `admin` | Only `user` appears today. |
| `user.status` | `active`, `suspended`, `banned`, `deleted` | |

## Example

```bash
curl "$BASE/admin/tickets/9d23c68e-14bd-4974-8aff-b38ea6af192e" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Reporting is one-way today.** `messages` holds a single `from: "user"` turn. Storing it as JSON means an admin reply appends a `from: "admin"` turn later with no schema change and no migration.
- There is no endpoint to reply or to change `status` yet. Both arrive with the reply feature.
- `ticket.description` and `messages[0].body` are the same text. Render the thread, not both.
- `admin_response` predates the thread and stays `null`. Treat `messages` as the source of truth.
- The same endpoint serves the Feedback tab's detail view. When `ticket.type` is `feedback`, the panel shows `rating` as stars and hides the category, issue type, affected area and occurred-at fields, which problem reports use and feedback does not.
- The user block is enough to triage without leaving the page; `user.cz_user_id` links to the full profile.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
