# GET /api/admin/cron

Every background job Coinzu runs — its schedule, whether it is live, and how the last run went. The Scheduled Jobs tab.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/cron` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None. The catalogue is fixed, so there is nothing to page or filter.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].key` | string | Stable job key. Also the `job_name` written to `cron_job_logs`. |
| `data[].label` | string | Human name for the tab. |
| `data[].group` | string | Which part of the product it serves. See [Enum values](#enum-values). |
| `data[].description` | string | What the job actually does. |
| `data[].cron` | string | The expression in force — the override when set, otherwise the default. |
| `data[].default_cron` | string | The shipped expression. |
| `data[].is_custom_schedule` | boolean | `true` when an admin has overridden the schedule. |
| `data[].schedule_label` | string | Plain-English reading, e.g. `Every day at 01:00 UTC`. |
| `data[].time_zone` | string | Always `UTC`. |
| `data[].enabled` | boolean | `false` means paused — no timer is installed. |
| `data[].critical` | boolean | Touches money or a user's standing. |
| `data[].consequence` | string | What breaks if the job stops running. |
| `data[].confirm_run` | boolean | The tab confirms before a manual run. Mirrors `critical`. |
| `data[].registered` | boolean | `false` when no module claimed the key — the job cannot run. |
| `data[].scheduled` | boolean | A timer is installed right now. |
| `data[].next_run_at` | string (date-time) \| null | When the timer next fires. `null` when paused. |
| `data[].last_run.status` | string | `running`, `success` or `failed`. |
| `data[].last_run.last_run_at` | string (date-time) | When it started. |
| `data[].last_run.duration_ms` | integer \| null | How long it took. |
| `data[].last_run.error_message` | string \| null | The failure, when it failed. |
| `data[].updated_by` | string \| null | Rewardtym admin id that last changed it. |
| `data[].updated_at` | string (date-time) \| null | When that was. |
| `total` | integer | Jobs in the catalogue. |
| `summary.total` | integer | Same as `total`. |
| `summary.enabled` | integer | Jobs on a live schedule. |
| `summary.disabled` | integer | Paused jobs. |
| `summary.custom_schedule` | integer | Jobs with an overridden schedule. |
| `summary.failing` | integer | Jobs whose last run failed. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "key": "streak_check",
        "label": "Streak break check",
        "group": "rewards",
        "description": "Resets the board to day 0 for anyone who did not claim yesterday. The all-time record is never reset.",
        "cron": "0 01 * * *",
        "default_cron": "0 01 * * *",
        "is_custom_schedule": false,
        "schedule_label": "Every day at 01:00 UTC",
        "time_zone": "UTC",
        "enabled": true,
        "critical": true,
        "consequence": "A broken streak keeps advancing, so users collect late-board rewards without earning them.",
        "confirm_run": true,
        "registered": true,
        "scheduled": true,
        "next_run_at": "2026-08-31T01:00:00.000Z",
        "last_run": {
          "status": "success",
          "last_run_at": "2026-08-30T05:31:02.114Z",
          "duration_ms": 639,
          "error_message": null
        },
        "updated_by": null,
        "updated_at": null
      }
    ],
    "total": 7,
    "summary": {
      "total": 7,
      "enabled": 7,
      "disabled": 0,
      "custom_schedule": 0,
      "failing": 0
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
  "timestamp": "2026-08-30T05:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].group` | `rewards`, `delivery`, `catalogue`, `maintenance` | One filter chip in the tab each. |
| `data[].last_run.status` | `running`, `success`, `failed` | `running` means the row was written but the job never finished — usually a crash mid-run. |

## Example

```bash
curl "$BASE/admin/cron" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **The catalogue is code, the overrides are data.** Jobs are defined in `cron.catalogue.ts`; only `enabled` and a custom `cron` are stored. A job with no row runs on its shipped schedule.
- `registered: false` means the catalogue lists a key no module claimed — the row shows but Run now is refused. It is a wiring bug, not a config choice.
- `next_run_at` is read from the live timer, so it reflects reality rather than a recomputed guess.
- `last_run` is the newest row in `cron_job_logs` for that key. A manual run writes the same kind of row as a scheduled one, so the two are indistinguishable here by design.
- All seven jobs run in **UTC**, matching the rest of the platform.
