# GET /api/offers/mine

Lists the offers the signed-in user started, newest click first, with the reward status of each.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/offers/mine` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | number | no | 1-based page number. Defaults to `1`. |
| `limit` | query | number | no | Rows per page. Values above 100 are capped at 100. Defaults to `20`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | Clicks on this page. |
| `data[].cz_offer_click_id` | string (uuid) | Primary key of the click. |
| `data[].clicked_at` | string (iso date) | When the offer was opened. |
| `data[].offer` | object \| null | The offer as listed in `docs/005offers.get.md`. `null` if the offer row was removed. |
| `data[].status` | string | `in_progress` until a postback arrives, then `approved`, `pending` or `reversed`. |
| `data[].payout_coins` | number | Coins credited, `0` while still in progress. |
| `data[].credited_at` | string (iso date) \| null | When the coins were paid. |
| `total` | number | Total clicks by this user. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_offer_click_id": "8e1f6c22-4b39-4d70-9a55-13c8f0e27bd4",
        "clicked_at": "2026-08-26T18:22:03.000Z",
        "offer": {
      "cz_offer_id": "6d3a91f2-0c48-4b7d-a5e1-9f2b7c60d413",
      "provider_id": "2f8b41c9-6d05-4a77-9e12-8c4b0d75a361",
      "external_offer_id": "RT-99120",
      "title": "Reach level 10 in Coin Quest",
      "description": "Install Coin Quest and reach level 10 within 7 days.",
      "image_url": "https://cdn.rewardtym.com/offers/99120.png",
      "reward_coins": 2500,
      "reward_gems": 0,
      "category": "games",
      "countries": ["GB", "US"],
      "platforms": ["android"],
      "goals": [
        { "goal_id": "g1", "title": "Install the app", "reward_coins": 500 },
        { "goal_id": "g2", "title": "Reach level 10", "reward_coins": 2000 }
      ],
      "is_active": true,
      "expires_at": "2026-09-30T23:59:59.000Z",
      "synced_at": "2026-08-27T08:00:00.000Z"
    },
        "status": "approved",
        "payout_coins": 2500,
        "credited_at": "2026-08-27T08:59:11.000Z"
      }
    ],
    "total": 12
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
| `platforms` | `ios`, `android`, `web` | — |
| `status` | `pending`, `approved`, `reversed` | — |

## Example

```bash
curl 'http://localhost:4000/api/offers/mine?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- One row per click, so the same offer can appear more than once.
- `status` stays `in_progress` until the provider sends a postback; there is no timeout.
- Clicks older than 30 days are removed by the nightly cleanup job, so this list is a rolling window.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
