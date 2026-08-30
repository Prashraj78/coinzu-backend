# PATCH /api/admin/daily/challenges/:cz_daily_challenge_id

Edits one tile — its wording, how many actions finish it, what it pays, and where a tap sends the app.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/daily/challenges/:cz_daily_challenge_id` |
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
| `cz_daily_challenge_id` | string (uuid) | yes | The tile to edit. |

### Body

Every field optional; only what you send changes.

| Field | Type | Rules | Description |
|---|---|---|---|
| `title` | string | Max 120. | Shown on the tile. |
| `description` | string | Max 255. | The line under the title. |
| `target_count` | integer | 1–100. | How many actions finish it. |
| `action` | string | See [Enum values](#enum-values). | Where a tap sends the app. |
| `reward_coins` | integer | 0–1,000,000. | Coins for finishing it. |
| `reward_gems` | integer | 0–1,000,000. | Gems for finishing it. |
| `icon_url` | string | Max 500. | Tile artwork. |
| `display_order` | integer | ≥ 0. | Board order. |
| `is_active` | boolean | | `false` takes it off the board. |

```json
{ "reward_coins": 75, "target_count": 2 }
```

## Response

### Success — `200`

Identical to `GET /api/admin/daily/challenges`, so the tab re-renders from the response.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A value is out of range, `action` is unknown, or an unknown field was sent. | `ValidationFailedIcon` |
| 404 | `CZDCOMM004` | We could not find what you were looking for. | No challenge exists with that id. | `NotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM004",
  "cz_error_message": "We could not find what you were looking for.",
  "cz_error_description": "No challenge exists with that id.",
  "cz_error_icon": "NotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-30T06:44:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `action` | `spin`, `quiz`, `offers`, `referrals`, `games` | `offers` opens the offer wall; `referrals` opens Refer & Earn. |

## Example

```bash
curl -X PATCH "$BASE/admin/daily/challenges/0f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "reward_coins": 75 }'
```

## Notes

- **Changes are live immediately**, including for users part-way through today. Raising `target_count` from 1 to 2 will un-finish a tile someone had completed, because their progress no longer reaches the target.
- **`type` cannot be changed.** It is what the game endpoints match on when they record progress; a tile's identity is fixed, only its presentation and rewards are editable.
- The reward is paid by the challenge's own completion path, not by this endpoint.
- Past completions keep whatever was paid at the time; editing never rewrites history.
