# PUT /api/admin/rewards/games/:cz_reward_game_id/prizes

Replaces a reward's whole prize ladder in one transaction, so it is never half-written.

## Overview

| Item | Value |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/rewards/games/:cz_reward_game_id/prizes` |
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
| `cz_reward_game_id` | string (uuid) | yes | The reward. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `prizes` | object[] | yes | 1–20 entries. | The whole ladder. |
| `prizes[].rank` | integer | no | ≥ 1. Defaults to array position. | 1 is the top prize. |
| `prizes[].label` | string | yes | 1–60 characters. | Shown on the rung or wedge. |
| `prizes[].reward_coins` | integer | yes | 0–100,000,000. | |
| `prizes[].reward_gems` | integer | yes | 0–100,000,000. | |
| `prizes[].probability_weight` | number | no | 0–1,000,000. | **Instant games only.** Ignored and stored as `null` on a draw. |
| `prizes[].is_active` | boolean | no | Default `true`. | |

```json
{
  "prizes": [
    { "label": "10 Coins", "reward_coins": 10, "reward_gems": 0, "probability_weight": 30 },
    { "label": "5,000 Coins", "reward_coins": 5000, "reward_gems": 0, "probability_weight": 2 },
    { "label": "Better luck", "reward_coins": 0, "reward_gems": 0, "probability_weight": 15 }
  ]
}
```

## Response

### Success — `200`

Identical to `GET /api/admin/rewards/games/:id/prizes`.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | No active prize, an instant game whose every active weight is 0, a field out of range, or an unknown field. | `ValidationFailedIcon` |
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
  "cz_error_description": "An instant game needs at least one active prize with a weight above 0.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T12:18:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Notes

- **All or nothing.** The write clears the ladder and re-inserts it in a transaction, so a rejected payload leaves the old one exactly as it was.
- **Send every prize, every time.** This is a `PUT`; anything omitted is deleted, and ids are regenerated on each save.
- **An instant game with no winning weight is refused**, because a play would have nothing to draw from and every spin would fail with `CZDGAME024`.
- **`probability_weight` is dropped on a draw.** A draw ranks its prizes; it does not weight them. Send it anyway and it is stored as `null` rather than rejected.
- Plays already taken keep what they paid — `reward_plays` is the record and is never rewritten.
