# POST /api/offers/:id/click

Records that the user started an offer and returns the provider tracking URL to open.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/offers/:id/click` |
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
| `id` | path | string (uuid) | yes | The `cz_offer_id` being started. |

### Body

None.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `click_id` | string | The tracking id we generated. The provider echoes it back on the postback. |
| `tracking_url` | string | Provider URL to open in a browser or web view. |

```json
{
  "success": true,
  "data": {
    "click_id": "cz_9f2c8a11c4d7b3e5",
    "tracking_url": "https://track.rewardtym.com/click?offer=RT-99120&sub_id=cz_9f2c8a11c4d7b3e5&country=GB"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDOFR001` | We could not find that offer. | No offer exists with that id. | `OfferNotFoundIcon` |
| 400 | `CZDOFR002` | This offer is no longer available. | The offer is switched off. | `OfferUnavailableIcon` |
| 403 | `CZDOFR005` | This offer is temporarily unavailable. | The provider behind the offer is switched off. | `OfferUnavailableIcon` |
| 403 | `CZDOFR003` | This offer is not available in your country. | The offer is not available in the country on the user profile. | `OfferRestrictedRegionIcon` |
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

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl -X POST http://localhost:4000/api/offers/6d3a91f2-0c48-4b7d-a5e1-9f2b7c60d413/click \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- The IP address and user agent of the request are stored with the click to help resolve provider disputes.
- Macros in the provider template (`{CLICK_ID}`, `{USER_ID}`, `{OFFER_ID}`, `{COUNTRY}`, `{DEVICE}`) are URL-encoded before they are substituted.
- Open the URL exactly as returned. Changing it breaks the postback match and the user will not be paid.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
