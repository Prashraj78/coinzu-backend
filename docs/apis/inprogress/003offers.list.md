# GET /api/offers

Lists the live offers available to the signed-in user, highest reward first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/offers` |
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
| `category` | query | string | no | Filter by category slug, 1–60 characters. |
| `platform` | query | string | no | One of `ios`, `android`, `web`. |
| `search` | query | string | no | Case-insensitive match on the offer title, 1–60 characters. |
| `page` | query | number | no | 1-based page number. Defaults to `1`. |
| `limit` | query | number | no | Rows per page. Values above 100 are capped at 100. Defaults to `20`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | Offers on this page. |
| `data[].cz_offer_id` | string (uuid) | Primary key of the offer. |
| `data[].provider_id` | string (uuid) | The offerwall provider this offer came from. |
| `data[].external_offer_id` | string | The provider's own id for the offer. |
| `data[].title` | string | Offer title. |
| `data[].description` | string \| null | What the user has to do. |
| `data[].image_url` | string \| null | Offer icon. |
| `data[].reward_coins` | number | Coins paid when the offer is approved. |
| `data[].reward_gems` | number | Gems paid when the offer is approved. |
| `data[].category` | string \| null | Category slug, for example `games`. |
| `data[].countries` | string[] | Allowed country codes. An empty array means every country. |
| `data[].platforms` | string[] | Allowed platforms. An empty array means every platform. |
| `data[].goals` | object[] | Milestone steps inside one offer: `goal_id`, `title`, `reward_coins`. |
| `data[].is_active` | boolean | Whether the offer is live. |
| `data[].expires_at` | string (iso date) \| null | When the offer stops being shown. |
| `data[].synced_at` | string (iso date) \| null | Last time the provider sync touched this row. |
| `total` | number | Total offers matching the filters. |

```json
{
  "success": true,
  "data": {
    "data": [
  {
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
    }
    ],
    "total": 214
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
| `platform` | `ios`, `android`, `web` | — |
| `platforms` | `ios`, `android`, `web` | — |

## Example

```bash
curl 'http://localhost:4000/api/offers?category=games&platform=android&page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Only offers with `is_active: true` and no past `expires_at` are returned.
- Country filtering is automatic: an offer is shown when its `countries` array is empty or contains the country on the user profile.
- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
