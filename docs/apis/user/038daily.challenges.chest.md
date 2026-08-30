# POST /api/daily/challenges/chest

Claims the Daily Master Chest. Pays once a day, and only when every challenge on the board is finished.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/daily/challenges/chest` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None. The chest is always today's — a past day cannot be claimed late.

### Body

None.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `claimed` | boolean | Always `true`. |
| `date` | string (date) | The UTC day claimed. |
| `reward_coins` | integer | Coins credited. |
| `reward_gems` | integer | Gems credited. |
| `claimed_at` | string (date-time) | When it was taken. |

```json
{
  "success": true,
  "data": {
    "claimed": true,
    "date": "2026-08-30",
    "reward_coins": 1000,
    "reward_gems": 1000,
    "claimed_at": "2026-08-30T07:02:11.882Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDGAME002` | Finish this challenge before claiming its reward. | Not every challenge is done. The description says how many remain. | `ChallengeIncompleteIcon` |
| 400 | `CZDGAME003` | You have already claimed this reward. | The chest was taken earlier today. | `RewardAlreadyClaimedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME002",
  "cz_error_message": "Finish this challenge before claiming its reward.",
  "cz_error_description": "3 challenge(s) still to finish today.",
  "cz_error_icon": "ChallengeIncompleteIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T06:58:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value fields.

## Example

```bash
curl -X POST http://localhost:4000/api/daily/challenges/chest \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **Gate the button on `master_chest.can_claim`** from `GET /api/daily/challenges` rather than calling and handling the error.
- **Once a day, and only today.** A day that ended with everything finished but the chest untaken cannot be claimed afterwards — the chest expires with the day.
- The amounts come from the `daily_chest_coins` and `daily_chest_gems` settings, so they can change between the board load and the claim. Trust the values in this response.
- Both currencies are credited as separate `wallet_transactions` rows with `source_type: "challenge"`. Read the new balance from `GET /api/wallet` rather than adding the deltas locally.
- Times are UTC; the day rolls at 00:00 UTC.
