# PATCH /api/admin/cron/:key/enabled

Pauses or resumes one job. Pausing removes its timer; the job can still be run by hand.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/cron/:key/enabled` |
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
| `enabled` | boolean | yes | | `false` pauses the job, `true` resumes it. |

```json
{ "enabled": false }
```

## Response

### Success — `200`

Identical to `GET /api/admin/cron`, so the tab can re-render straight from the response.

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "key": "streak_check",
        "label": "Streak break check",
        "group": "rewards",
        "cron": "0 01 * * *",
        "schedule_label": "Every day at 01:00 UTC",
        "enabled": false,
        "scheduled": false,
        "next_run_at": null,
        "updated_by": "lt_admin_9f2c",
        "updated_at": "2026-08-30T05:30:12.884Z"
      }
    ],
    "total": 7,
    "summary": { "total": 7, "enabled": 6, "disabled": 1, "custom_schedule": 0, "failing": 0 }
  }
}
```

> The response is the full list from `GET /api/admin/cron`; the sample is abbreviated to one row.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `enabled` is missing or not a boolean. | `ValidationFailedIcon` |
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
  "cz_error_description": "enabled must be a boolean value",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T05:30:12.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
# Pause
curl -X PATCH "$BASE/admin/cron/streak_check/enabled" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "enabled": false }'

# Resume
curl -X PATCH "$BASE/admin/cron/streak_check/enabled" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "enabled": true }'
```

## Notes

- **Takes effect immediately.** The timer is removed or reinstalled in the same request, so `scheduled` and `next_run_at` in the response are already correct.
- **Pausing is not disabling.** `POST /api/admin/cron/:key/run` still works on a paused job — that pairing is how a risky job is run under supervision.
- A pause survives a restart: it lives in `cron_job_settings`, and the registry reads it when the app boots.
- **Pausing a `critical` job has consequences.** `consequence` on the list row spells out what breaks; pausing `gift_card_order_poll`, for instance, means users never receive codes they have already paid coins for.
- A job already in the requested state is not an error — the call is idempotent.
