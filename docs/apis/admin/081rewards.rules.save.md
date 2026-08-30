# PUT /api/admin/rewards/games/:cz_reward_game_id/payout-rules

Replaces a draw's turnout-to-pot ladder in one transaction.

## Overview

| Item | Value |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/rewards/games/:cz_reward_game_id/payout-rules` |
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
| `cz_reward_game_id` | string (uuid) | yes | A draw game. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `rules` | object[] | yes | 1–20 bands. | The whole ladder. |
| `rules[].min_participants` | integer | yes | 0–10,000,000, unique across the ladder. | Inclusive floor. |
| `rules[].prize_pool_coins` | integer | yes | 0–100,000,000. | Coins shared across the winners. |
| `rules[].winners_count` | integer | yes | 1–100. | How many share it. |
| `rules[].is_active` | boolean | no | Default `true`. | |

```json
{
  "rules": [
    { "min_participants": 0, "prize_pool_coins": 500, "winners_count": 1 },
    { "min_participants": 10, "prize_pool_coins": 2000, "winners_count": 2 },
    { "min_participants": 50, "prize_pool_coins": 5000, "winners_count": 3 },
    { "min_participants": 250, "prize_pool_coins": 15000, "winners_count": 5 }
  ]
}
```

## Response

### Success — `200`

Identical to `GET /api/admin/rewards/games/:id/payout-rules`.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | Two bands share a floor, **no band starts at 0**, a field is out of range, or an unknown field was sent. | `ValidationFailedIcon` |
| 404 | `CZDCOMM004` | We could not find what you were looking for. | No reward game exists with that id. | `NotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "The first band must start at 0 participants, or a quiet day pays nothing predictable.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T12:22:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Notes

- **A band starting at 0 is required.** Without one, a day with a handful of players matches nothing and falls back to whatever pot the draw was opened with — unpredictable, and the reason the save is refused.
- **Floors must be unique.** Two bands on the same floor would make the outcome depend on row order, so the save is rejected rather than picking arbitrarily.
- **All or nothing**, in a transaction — a rejected payload leaves the old ladder untouched.
- **Send every band, every time.** This is a `PUT`; anything omitted is deleted, and ids are regenerated.
- **The change is live immediately, including for the open draw.** The pot on the user's screen is recomputed from these rules on every read, so raising a band lifts the advertised pot at once. Draws already settled keep what they paid.
- Order does not matter in the payload — bands are sorted by floor on the way in.
