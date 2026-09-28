# POST /api/admin/cron/:key/run

Runs one job immediately, on demand. Used to recover after a failure, or to apply a change without waiting for the next tick.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/cron/:key/run` |
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

| Field | Type | Description |
|---|---|---|
| `key` | string | The job that ran. |
| `ran_by` | string | Rewardtym admin id that triggered it. |
| `duration_ms` | integer | How long it took. |
| `status` | string | `success` or `failed`. See [Enum values](#enum-values). |
| `error_message` | string \| null | The failure, when it failed. |

```json
{
  "success": true,
  "data": {
    "key": "streak_check",
    "ran_by": "lt_admin_9f2c",
    "duration_ms": 639,
    "status": "success",
    "error_message": null
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | The job exists in the catalogue but no module registered a runner for it. | `ValidationFailedIcon` |
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
  "timestamp": "2026-08-30T05:31:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `success`, `failed` | Mirrors the row written to `cron_job_logs`. |

## Example

```bash
curl -X POST "$BASE/admin/cron/streak_check/run" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Synchronous.** The response comes back after the job has finished, so `duration_ms` and `status` are real rather than optimistic. A slow job holds the request open.
- **A failing job still returns 200.** The error is reported in `status` and `error_message`, exactly as a scheduled failure is recorded — one broken job never throws through the API.
- **It runs even when the job is paused.** `enabled: false` removes the timer, not the ability to run by hand. That is deliberate: pausing then running once is how a risky job is controlled.
- It writes the same `cron_job_logs` row as a scheduled run, so `last_run` in the list reflects it immediately.
- Jobs marked `critical` are flagged `confirm_run: true` so the tab asks first. The API itself does not confirm — it runs whatever is asked.
- Nothing prevents two runs overlapping. Jobs that must not overlap guard themselves; the push dispatcher, for example, skips a tick while one is in flight.
