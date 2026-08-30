# GET /api/offers/:id

Returns one offer by id.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/offers/:id` |
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
| `id` | path | string (uuid) | yes | The `cz_offer_id` of the offer. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_offer_id` | string (uuid) | Primary key of the offer. |
| `provider_id` | string (uuid) | The offerwall provider this offer came from. |
| `external_offer_id` | string | The provider's own id for the offer. |
| `title` | string | Offer title. |
| `description` | string \| null | What the user has to do. |
| `image_url` | string \| null | Offer icon. |
| `reward_coins` | number | Coins paid when the offer is approved. |
| `reward_gems` | number | Gems paid when the offer is approved. |
| `category` | string \| null | Category slug, for example `games`. |
| `countries` | string[] | Allowed country codes. An empty array means every country. |
| `platforms` | string[] | Allowed platforms. An empty array means every platform. |
| `goals` | object[] | Milestone steps inside one offer: `goal_id`, `title`, `reward_coins`. |
| `is_active` | boolean | Whether the offer is live. |
| `expires_at` | string (iso date) \| null | When the offer stops being shown. |
| `synced_at` | string (iso date) \| null | Last time the provider sync touched this row. |

```json
{
  "success": true,
  "data": {
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
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDOFR001` | We could not find that offer. | No offer exists with that id. | `OfferNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDOFR001",
  "cz_error_message": "We could not find that offer.",
  "cz_error_description": "No offer exists for the given id.",
  "cz_error_icon": "OfferNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `platforms` | `ios`, `android`, `web` | — |

## Example

```bash
curl http://localhost:4000/api/offers/6d3a91f2-0c48-4b7d-a5e1-9f2b7c60d413 \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Expired and inactive offers are still returned here, so a deep link from `GET /api/offers/mine` keeps working.
- `goals` is empty for single-step offers.
- To start the offer, call `POST /api/offers/:id/click` and open the URL it returns.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
