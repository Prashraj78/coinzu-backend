# POST /api/admin/cron/:key/reset

Drops the schedule override and puts the job back on its shipped default.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/cron/:key/reset` |
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
| `key` | string | yes | The job key from `GET /api/admin/cron`. |

### Body

None.

## Response

### Success — `201`

Identical to `GET /api/admin/cron`, with the job back on `default_cron`.

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "key": "streak_check",
        "cron": "0 01 * * *",
        "default_cron": "0 01 * * *",
        "is_custom_schedule": false,
        "schedule_label": "Every day at 01:00 UTC",
        "enabled": true,
        "scheduled": true,
        "next_run_at": "2026-08-31T01:00:00.000Z",
        "updated_by": "lt_admin_9f2c",
        "updated_at": "2026-08-30T05:31:20.550Z"
      }
    ],
    "total": 7,
    "summary": { "total": 7, "enabled": 7, "disabled": 0, "custom_schedule": 0, "failing": 0 }
  }
}
```

> The response is the full list from `GET /api/admin/cron`; the sample is abbreviated to one row.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
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
  "cz_error_code": "CZDADM006",
  "cz_error_message": "We could not find that scheduled job.",
  "cz_error_description": "No job in the cron catalogue matches that key.",
  "cz_error_icon": "SettingNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-30T05:31:20.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST "$BASE/admin/cron/streak_check/reset" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Only the schedule is reset.** `enabled` is left alone, so a paused job stays paused on its default schedule. Resume it with `PATCH /api/admin/cron/:key/enabled`.
- The timer is replaced in the same request, so `next_run_at` in the response is the real next fire under the default.
- Safe to call on a job that was never overridden — it is idempotent and simply confirms the default.
- The `cron_job_settings` row is kept with `cron` set to null rather than deleted, so `updated_by` and `updated_at` still record who reset it.
