# POST /api/admin/redeem/phaze/webhook

Registers this backend as Phaze's order-status webhook. Run once per environment after deploy, and again if `API_BASE_URL` or `PHAZE_WEBHOOK_SECRET` changes.

## Overview

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/redeem/phaze/webhook` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None.

### Body

None.

```json
{ }
```

## Response

### Success — `201`

Registers `<API_BASE_URL>/api/redeem/webhooks/phaze` at Phaze with `PHAZE_WEBHOOK_SECRET` as the header value Phaze sends back. An earlier registration of the same URL is deleted first, so calling this twice is safe.

| Field | Type | Description |
|---|---|---|
| `id` | string | Phaze's webhook id. |
| `url` | string | The URL Phaze will call. |

```json
{ "success": true, "data": { "id": "82", "url": "https://coinzu-backend-q6mk.onrender.com/api/redeem/webhooks/phaze" } }
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Phaze rejected the call — missing credentials, non-HTTPS `API_BASE_URL`, or a Phaze outage. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM002",
  "statusCode": 500
}
```

## Enum values

None.

## Notes

- Phaze requires an HTTPS URL, so this fails from a local `API_BASE_URL` of `http://localhost:4000`.
- Gift-card vendor selection lives in Configuration settings: `gift_card_active_vendor` (primary), `gift_card_secondary_vendor`, `gift_card_failover_enabled`.
