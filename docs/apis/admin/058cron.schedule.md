# PUT /api/admin/cron/:key/schedule

Overrides when one job fires. The expression is validated and the timer is replaced in the same request.

## Overview

| Item | Value |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/cron/:key/schedule` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `key` | string | yes | The job key from `GET /api/admin/cron`. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `cron` | string | yes | 1–120 characters, a valid cron expression. | Five or six fields; six starts with seconds. Evaluated in UTC. |

```json
{ "cron": "0 */4 * * *" }
```

## Response

### Success — `200`

Identical to `GET /api/admin/cron`.

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "key": "streak_check",
        "cron": "0 */4 * * *",
        "default_cron": "0 01 * * *",
        "is_custom_schedule": true,
        "schedule_label": "Every 4 hours",
        "enabled": true,
        "scheduled": true,
        "next_run_at": "2026-08-30T08:00:00.000Z",
        "updated_by": "lt_admin_9f2c",
        "updated_at": "2026-08-30T05:30:44.201Z"
      }
    ],
    "total": 7,
    "summary": { "total": 7, "enabled": 7, "disabled": 0, "custom_schedule": 1, "failing": 0 }
  }
}
```

> The response is the full list from `GET /api/admin/cron`; the sample is abbreviated to one row.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `cron` is missing, over 120 characters, or not a valid expression. The description names the offending value. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 404 | `CZDADM006` | We could not find that scheduled job. | No job in the catalogue matches that key. | `SettingNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "\"not a cron\" is not a valid cron expression.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T05:30:44.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
# Every four hours
curl -X PUT "$BASE/admin/cron/streak_check/schedule" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "cron": "0 */4 * * *" }'

# Six fields — every 30 seconds
curl -X PUT "$BASE/admin/cron/push_dispatch/schedule" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "cron": "*/30 * * * * *" }'
```

## Notes

- **Validated before it is stored.** A malformed expression is rejected with a 400 naming the value, so a typo can never silently kill a timer.
- **Always UTC.** There is no per-job time zone; the whole platform runs on UTC.
- The old timer is removed and a new one installed in the same request, so `next_run_at` in the response is the real next fire.
- The override survives a restart. `default_cron` is untouched, so `POST /api/admin/cron/:key/reset` can always put the shipped schedule back.
- Setting the expression to the same value as `default_cron` still marks the job `is_custom_schedule: true` — the override row exists. Use reset to clear it properly.
- **Scheduling a job far apart has consequences.** Moving `gift_card_order_poll` from 5 minutes to daily means a user waits up to a day for a code they have already paid for.
