# Enum values

Every field in the Coinzu API that has a fixed set of values, with all of its
values. Values are lowercase `snake_case` strings — they are stored as
`varchar`, not as Postgres enum types, so a new value can be added without a
schema migration. Treat any value you do not recognise as unknown rather than
crashing.

Each endpoint doc under `docs/apis/` repeats the subset that applies to it in
its own **Enum values** section. This page is the full list.

## Accounts

### `status` — user account state

| Value | Meaning |
|---|---|
| `active` | Normal account. Can sign in and earn. |
| `suspended` | Temporarily blocked by an admin. Sign-in is refused. |
| `banned` | Permanently blocked by an admin. Sign-in is refused. |
| `deleted` | The user asked for deletion. Sign-in is refused. |

Set by `PATCH /api/admin/users/:id/status`.

### `kyc_status` — identity check state on the user

| Value | Meaning |
|---|---|
| `none` | Never submitted a selfie. This is the value on a fresh account. |
| `pending` | A submission is waiting on the automatic check. |
| `verified` | Passed. Withdrawals are unlocked. |
| `rejected` | Failed. The user may try again. |
| `manual_review` | The automatic score was borderline, so a person is looking at it. |

The KYC attempt row (`kyc_verifications.status`) uses the same values minus
`none`: `pending`, `verified`, `rejected`, `manual_review`. *Retired with the
admin reset:* an admin reviewing an attempt could set `verified` or `rejected`
on a `manual_review` row; that endpoint is gone, so a `manual_review` row now
only resolves if the user submits a fresh selfie that the automatic check
scores cleanly.

`POST /api/kyc/verify` returns `verified`, `manual_review` or `rejected` — never
`pending`, which is only there for a row nobody has settled yet.

### `rejection_code` / `reason_code` — why an attempt was rejected automatically

| Value | Meaning |
|---|---|
| `CZDKYC004` | No face was found in the photo. |
| `CZDKYC005` | More than one face was found in the photo. |
| `null` | Not an automatic rejection — the attempt passed, went to manual review, or an admin rejected it by hand. |

`reason_code` on `POST /api/kyc/verify` and `GET /api/kyc/status` is the same
value as the row's `rejection_code`. An admin rejection always clears it to
`null`; the admin's sentence lives in `rejection_reason` instead.

### `tier` — loyalty tier

| Value |
|---|
| `silver` |
| `gold` |
| `platinum` |
| `diamond` |

Ordered lowest to highest. Driven by lifetime coins earned; never set directly.

### `age_range`

| Value |
|---|
| `18-24` |
| `25-34` |
| `35-44` |
| `45-54+` |

Collected in onboarding step 1. `gender`, `interests` and `primary_goal` are
free text, not enums.

### `role` — on the token, not on the row

| Value | Meaning |
|---|---|
| `user` | A Coinzu user token. |
| `admin` | A Rewardtym admin token, recognised by its `type: "admin"` claim. |

There is no Coinzu admin table. Which Rewardtym admins reach the Coinzu admin
API is decided by the `product_access` claim below.

### `product_access` — which product an admin may open

Set per admin account in Rewardtym and stamped on the admin token. Coinzu reads
it off the token and never queries Rewardtym for it.

| Value | Meaning |
|---|---|
| `both` | The admin may open Rewardtym and Coinzu. |
| `rewardtym` | Rewardtym only. Every `/api/admin/*` call here is rejected with `CZDAUTH007`. |
| `coinzu` | Coinzu only. The admin signs in through Rewardtym but its Rewardtym APIs are closed to them. |

There are exactly these three cases and no read-only level — an admin with
access to a product has full write access inside it.

A token Rewardtym issued before this claim existed carries no `product_access`.
Those fall back to the older rule: the `role` claim must be listed in the
`ADMIN_ROLES` env var — by default `super_admin` and `coinzu_admin`. The
fallback disappears on its own as old tokens expire.

### `role` (Rewardtym) — what powers an admin has

The Rewardtym `role` claim, separate from `product_access`. It says what the
admin can do; `product_access` says where.

| Value | Meaning |
|---|---|
| `super_admin` | Full powers inside whichever products `product_access` covers. |
| `partner_admin` | A Rewardtym partner's own login. Always `product_access: rewardtym`, so it never reaches Coinzu. |

### `platform` — device / offer platform

| Value |
|---|
| `ios` |
| `android` |
| `web` |

`user_devices.platform_type` (`POST /api/users/me/device`, `POST /api/auth/register`'s `device` field) uses the same three values.

## Devices

Registered by `POST /api/users/me/device` (and optionally at `POST /api/auth/register`). One row per app install, upserted on `cz_user_id` + `device_id`. `ip_address`, `country_code`, `asn`, `isp`, `is_vpn`, `user_agent` and `fingerprint` are always derived server-side from the request — never accepted from the client and never returned in any response.

### `device_info` — free-form device metadata

Not a fixed enum — a client-supplied JSON object stored as-is in `user_devices.device_info` (jsonb), so the app can add fields (app version, OS version, model, brand, locale, timezone, screen size, ...) without a migration.

## Wallet

### `currency`

| Value | Meaning |
|---|---|
| `coin` | The spendable balance. Earned from offers, games and referrals. |
| `gem` | The premium balance. Spent on lucky draw entries. |

### `type` — ledger entry type

| Value | Meaning |
|---|---|
| `earn` | Balance went up from an activity. |
| `spend` | Balance went down on a purchase. |
| `withdrawal` | Balance was held for a cash-out. |
| `convert_in` | The receiving side of a coin/gem conversion. |
| `convert_out` | The paying side of a coin/gem conversion. |
| `reversal` | Balance went down because an advertiser reversed an already-credited offerwall conversion. |

### `source_type` — which feature moved the balance

| Value |
|---|
| `offer` |
| `daily_checkin` |
| `referral` |
| `game` |
| `streak` |
| `withdrawal` |
| `redeem` |
| `lucky_draw` |
| `achievement` |
| `challenge` |
| `convert` |
| `admin_adjustment` |
| `offerwall` |

### Withdrawal `method`

| Value |
|---|
| `paypal` |
| `bank` |
| `crypto` |

### Withdrawal `status`

| Value | Meaning |
|---|---|
| `pending` | Waiting on an admin. |
| `approved` | Accepted, not yet paid out. |
| `rejected` | Refused. The coins are returned to the user. |
| `paid` | Money has left. |

*Retired with the admin reset:* `approved`, `rejected` and `paid` were only
ever set by the deleted admin withdrawal review endpoint. Every row now stays
`pending` forever — nothing in the codebase moves it further.

## Earning

### Offer completion `status`

| Value | Meaning |
|---|---|
| `pending` | The provider reported it but has not cleared it. |
| `approved` | Cleared. Coins have been credited. |
| `reversed` | The provider took it back. Coins have been debited. |

### Daily challenge `type`

| Value | Meaning |
|---|---|
| `spin` | Spin the Lucky Wheel. |
| `quiz` | Take the Quiz. |
| `game_install` | Play any new games. |
| `invite` | Invite a friend. |
| `offer` | Complete any offer. |
| `scratch` | In the schema, not on the board. |
| `checkin` | In the schema, not on the board. |

The board is the five active tiles; the last two exist but are inactive.

### Daily challenge `action`

Where a tap on the tile sends the app.

| Value | Meaning |
|---|---|
| `spin` | The spin wheel screen. |
| `quiz` | The quiz screen. |
| `scratch` | The Scratch & Win screen. |
| `offers` | The offer wall. Used by both "play any 2 new games" and "complete any offer". |
| `referrals` | Refer & Earn. |
| `games` | The games list. |

### Daily challenge progress `status`

| Value | Meaning |
|---|---|
| `pending` | Started, target not reached. |
| `completed` | Target reached and the tile's reward paid. |
| `claimed` | Legacy, from when tiles were claimed by hand. Treated the same as `completed`. |

### Streak `reward_type`

| Value |
|---|
| `coins` |
| `gems` |
| `tokens` |

### Achievement `rarity`

| Value |
|---|
| `common` |
| `rare` |
| `epic` |
| `rarest` |

### Daily dashboard `source`

Which game a payout came out of. Used both as a filter and in the response rows.

| Value | Meaning |
|---|---|
| `spin` | Spin the Lucky Wheel. |
| `scratch` | Scratch & Win. |
| `quiz` | Take the Quiz. |
| `challenge` | The five challenge tiles. |
| `chest` | The daily master chest. |

### Daily dashboard `granularity`

| Value | Meaning |
|---|---|
| `day` | One bucket per day. The default. |
| `week` | Monday-anchored weekly buckets. |

### Quiz schedule `state`

| Value | Meaning |
|---|---|
| `past` | The day has gone. |
| `today` | Running now. |
| `upcoming` | Still to run. |

### Challenge tile `highlight_reason`

Why a finished tile still wants attention. `null` when nothing is pending.

| Value | Meaning |
|---|---|
| `scratch_card_ready` | The quiz was answered correctly and the card it won has not been scratched. The tile's `action` switches to `scratch`. A correct answer is the only way to get a card. |

### Reward game `slug`

The four cards on the Rewards screen. Admin-managed, so treat the set as open.

| Value | Meaning |
|---|---|
| `wheel_of_fortune` | Paid wheel. Instant, unlimited. |
| `daily_lucky_draw` | Settles at 00:00 UTC every day. |
| `mystery_box` | Instant. `coming_soon` today. |
| `weekly_lucky_draw` | Settles at 00:00 UTC on Monday. |

### Reward game `kind`

| Value | Meaning |
|---|---|
| `instant` | Bought and resolved in one call — `POST /api/rewards/:slug/play`. |
| `draw` | Entries are bought, then a cron settles the period. |

### Reward game `cadence`

| Value | Meaning |
|---|---|
| `none` | An instant game has no period. |
| `daily` | One draw per UTC day. |
| `weekly` | One draw per ISO week, Monday-anchored. |

### Reward game `status`

| Value | Meaning |
|---|---|
| `live` | Playable. |
| `coming_soon` | Shown on the card list, but not playable. |
| `paused` | Hidden from the app entirely. |

### Lucky draw `status`

| Value | Meaning |
|---|---|
| `open` | Accepting entries. |
| `drawing` | Transient, while the settlement runs. |
| `resolved` | Settled and paid. |

### Scratch prize `min_medal_rarity`

The tier a user's **best** medal must reach before a prize enters their pool. Same four values as `rarity`, plus `null` for a prize open to everyone. At least one active prize must be `null`, or an unmedalled user could never win.

| Value |
|---|
| `common` |
| `rare` |
| `epic` |
| `rarest` |
| `null` |

### Referral `status`

| Value | Meaning |
|---|---|
| `pending` | The invited user signed up but has not hit the qualifying action. |
| `qualified` | The reward has been paid to the referrer. |

### Leaderboard `window`

| Value |
|---|
| `today` |
| `week` |
| `all_time` |

## Lucky draw

### `type`

| Value |
|---|
| `daily` |
| `weekly` |

### `status`

| Value | Meaning |
|---|---|
| `open` | Accepting entries. |
| `drawing` | Closed, winners being picked. |
| `resolved` | Winners are final and prizes are paid. |

## Redeem

### Gift card order `status`

| Value | Meaning |
|---|---|
| `pending` | Charged, waiting on the vendor. |
| `fulfilled` | The code is ready. Reveal it with `GET /api/redeem/orders/:id/code`. |
| `failed` | The vendor refused. The coins have been refunded automatically. |

## Support

### Ticket `type`

| Value |
|---|
| `email_support` |
| `report_problem` |
| `feedback` |

### Ticket `status`

| Value | Meaning |
|---|---|
| `open` | Not picked up yet. |
| `in_progress` | An admin has replied and is working on it. |
| `resolved` | Closed. |

*Retired with the admin reset:* every ticket is created `open` and nothing in
the codebase moves it to `in_progress` or `resolved` — those transitions lived
in the deleted admin support endpoints.

## Notifications

### `type`

| Value | Meaning |
|---|---|
| `push` | Sent to the device as well as stored in the inbox. |
| `in_app` | Inbox only. |

## OTP

### `channel`

| Value | Meaning |
|---|---|
| `email` | The only channel. Codes are sent by email through SendGrid. |

### `purpose`

| Value | Meaning |
|---|---|
| `verify_email` | Confirms the address on a new or unverified account. |
| `login` | Signs the user in with a code instead of a password. |

## Link tokens

Single-use tokens embedded in emailed links (`GET /api/auth/email/verify`, `GET /api/auth/password/reset`), stored in Redis by `LinkTokenService`. Not a client-facing field — the purpose is fixed per route, never sent by the caller.

### `purpose`

| Value | Meaning |
|---|---|
| `verify_email` | Confirms the address from the "Confirm my email" link. |
| `reset_password` | Authorizes setting a new password from the "Reset password" link. |

## Operations

### Cron log `status`

| Value |
|---|
| `running` |
| `success` |
| `failed` |

## Dropdown

### `type`

Not a fixed enum — `dropdown_options.type` is free-form so an admin can add a
category through `POST /api/admin/dropdown/options` with no code change.
Currently seeded:

| Value | Meaning |
|---|---|
| `gender` | Options for a gender picker. No icons. |
| `interest` | Options for the onboarding "choose your interests" screen. Each has an icon. |
| `age_range` | Options for the onboarding "your age" picker. `value` matches `OnboardingInfoDto.age_range` (`18-24`, `25-34`, `35-44`, `45-54+`). No icons. |
| `primary_goal` | Options for the onboarding "set your goal" screen. `value` matches `OnboardingGoalDto.primary_goal` (`earn_up_to_10_daily`, `highest_rewards`, `no_limit_earn_big`). Each has an icon. |
| `error_icon` | Error-sheet icons. `value` is a `CzErrorIcon` member (e.g. `InsufficientCoinsIcon`), `icon_url` is the image an admin uploaded for it. See [ERROR_CODES.md](ERROR_CODES.md#error-icons). |

## Offerwall Partners

Not the same feature as "Offer completion `status`" under Earning above —
that one syncs individual offers from providers into a catalogue. This is a
separate, admin-managed list of whole hosted offerwalls (`offerwall_partners`
/ `offerwall_postbacks`), shown as ranked logos and opened in an iframe.

Every partner is an iframe integration — `offer_url` is always `click_url_template` with `{USER_ID}` filled in, opened inside the app's iframe, never an external redirect.

### `postback_method`

| Value | Meaning |
|---|---|
| `get` | Default. The partner calls the postback with a GET request and query params. |
| `post` | The partner calls the postback with a POST request and a JSON body. Required when `postback_auth_type` is `hmac_sha256`. |

### `postback_auth_type`

| Value | Meaning |
|---|---|
| `token` | Default. The `:token` path segment must equal the partner's `postback_secret`. |
| `hmac_sha256` | The payload must carry a `signature` field: HMAC-SHA256, keyed with `postback_secret`, over `JSON.stringify` of every other field with its keys sorted alphabetically. Works with either `postback_method` — optional per partner, not enforced against the method. Used for a partner that signs its own outbound webhook, e.g. RewardTym (`PartnerWebhookDispatcherService.signPayload` in rewardtym-backend). |

### `offerwall_postbacks.status`

| Value | Meaning |
|---|---|
| `credited` | Coins were added to the user's wallet. |
| `reversed` | A previously credited reward was reported back as reversed; coins were debited. |
| `duplicate` | A postback with this `external_transaction_id` was already recorded for this partner. Nothing changed. |
| `user_not_found` | The mapped `user_id` field did not match any user. Nothing changed. |
| `invalid_payload` | The mapped `user_id` field was missing or empty. Nothing changed. |
| `invalid_secret` | Reserved. An unauthorized postback is rejected before a row is written, so this value is never actually stored. |

## Admin settings

### `group` — Configuration Settings subtabs

`currency`, `withdrawals`, `referrals`, `notifications`

One subtab each in the admin Configuration Settings tab. Returned by `GET /api/admin/settings`.

### `value_type` — how a setting value is parsed

`integer`, `decimal`, `boolean`

`integer` rejects decimals. `decimal` accepts them — `coins_per_gem` is fractional by design. `boolean` accepts only the exact strings `"true"` and `"false"`. Every `setting_value` travels as a string regardless, because `app_settings.setting_value` is a text column.

### `setting_key` — the tunable catalogue

`coins_per_usd`, `coins_per_gem`, `min_withdrawal_coins`, `withdrawal_requires_kyc`, `kyc_confidence_threshold`, `referral_max_coins_per_friend`, `referral_max_gems_per_friend`, `push_quiet_hours_start`, `push_quiet_hours_end`

A key outside this list is rejected by `PATCH /api/admin/settings` with `CZDADM004`.

## Referral rewards

### `trigger` — what an invited friend must do to pay the referrer

`signup`, `email_verified`, `onboarding_completed`, `kyc_verified`, `first_withdrawal`, `first_redeem`, `offers_completed`, `daily_checkins`, `streak_reached`, `withdrawals_completed`, `redeems_completed`, `referrals_made`

Configured in the admin Referral Rewards tab. Six are single events holding one step each (`signup`, `email_verified`, `onboarding_completed`, `kyc_verified`, `first_withdrawal`, `first_redeem`); the other six are repeatable and hold one step per `threshold` (`offers_completed`, `daily_checkins`, `streak_reached`, `withdrawals_completed`, `redeems_completed`, `referrals_made`). Every step pays at most once per invited friend, and payouts are clamped by the `referral_max_*_per_friend` caps. The full firing conditions are in `docs/apis/admin/024referral-rules.list.md`.

## FAQs

### `slug` — FAQ category keys

`account`, `rewards`, `payment`, `security`, `referrals`

Sent as `?category=` on `GET /api/support/faqs` and `GET /api/admin/faqs`. These are rows in `faq_categories`, not a code enum, so read them from the `categories` array on `GET /api/support/faqs` rather than hard-coding the list. A slug is permanent once published because the app codes against it.

## Support tickets

### `type` — what kind of message a ticket is

`report_problem`, `email_support`, `feedback`

### `status` — where a ticket is in its life

`open`, `in_progress`, `resolved`

A new ticket is always `open`. Both the app and the admin panel render `open` as **Pending**.

### `messages[].from` — who wrote a turn in the thread

`user`, `admin`

Only `user` appears today: reporting is one-way until the reply feature ships. The thread is stored as JSON so an `admin` turn appends without a schema change.

`rating` is 1 to 5 and is required on `feedback`, `null` on everything else.

`category` and `issue_type` are deliberately **not** enums. The app hard-codes both dropdowns so options change without a backend release; read the live values from `filters` on `GET /api/admin/tickets`.

## Leaderboard

### `window` — the range a ranking covers

`today`, `week`, `month`, `all_time`

`today` and `week` start at UTC midnight and the UTC week start; `month` starts on the 1st, UTC. The admin endpoint also reports `custom` in `summary.window` when an explicit `date_from`/`date_end` was sent instead. Ranks sum `wallet_transactions` where `currency = 'coin'` and `type = 'earn'`, and only users above zero appear.


## Push campaigns

### `status` — where a campaign got to

| Value | Meaning |
|---|---|
| `draft` | Saved but never run. |
| `scheduled` | Queued for a future `scheduled_at`. A dispatcher polls every minute. |
| `sending` | The send is in flight. Transient — a completed call never returns this. |
| `sent` | Every token FCM was given was accepted. Also the state of a dry run. |
| `partial` | Some tokens were accepted, some were not. |
| `failed` | No token was accepted, or the whole send hit a transport error (see `error`). |
| `cancelled` | Stopped before it ran. Only a `draft` or `scheduled` campaign can reach this. |

### `category` — what the message is about

| Value | Meaning | Mutable | Quiet hours |
|---|---|---|---|
| `announcement` | Product news and general announcements. | yes | applies |
| `promotion` | Offers, bonuses and campaigns. | yes | applies |
| `reward` | Streaks, achievements and earning nudges. | yes | applies |
| `transaction` | Payouts and account activity. | **no** | ignored |
| `system` | Security and service notices. | **no** | ignored |

"Mutable" means the user can switch it off with `PATCH /api/users/me/notification-preferences`.

### `audience_type` — the shape of the targeting

| Value | Meaning |
|---|---|
| `all` | No filters. Every active account with a live push token. |
| `users` | `cz_user_ids` alone. |
| `country` | `countries` alone. |
| `platform` | `platforms` alone. |
| `segment` | Two or more filters, or any of `statuses`, `kyc_statuses`, `tiers`, `min_coins`. |

Derived by the backend from the stored filters. It is never sent by the admin and never accepted in a request body — only as a list filter on `GET /api/admin/push`.

### `priority` — how hard FCM tries

| Value | Meaning |
|---|---|
| `high` | Wakes a dozing device. Maps to Android `high` and APNs priority `10`. |
| `normal` | Waits for the next maintenance window. Maps to APNs priority `5`. |

### `event` — what the app reports back

Used by `POST /api/notifications/push-events`.

| Value | Meaning |
|---|---|
| `delivered` | The payload reached the device. |
| `opened` | The user tapped the notification itself. |
| `clicked` | The user tapped one of its action buttons. |

One row is kept per user, campaign and event, so a repeat is accepted but not counted twice.

### Audience filter fields

| Field | Allowed values |
|---|---|
| `platforms[]` | `ios`, `android`, `web` — the `platform` enum under [Devices](#devices). |
| `statuses[]` | `active`, `suspended`, `banned`, `deleted` — the account `status` enum under [Accounts](#accounts). |
| `kyc_statuses[]` | `none`, `pending`, `verified`, `rejected`, `manual_review`. |
| `tiers[]` | `silver`, `gold`, `platinum`, `diamond`. |
| `countries[]` | Any ISO-3166 alpha-2 code, uppercased by the backend. |

Only `active` accounts with a non-empty `push_token` are ever reached, whatever `statuses` says — the filter narrows that set, it never widens it.

## KYC decisions

### `decision` — a super admin's verdict

Used by `POST /api/admin/kyc/:cz_kyc_verification_id/decision`.

| Value | Meaning |
|---|---|
| `approve` | The attempt becomes `verified` and the account's `kyc_status` follows. |
| `reject` | The attempt becomes `rejected`, and the reason is shown to the user. |

An attempt sitting at `pending`, `manual_review` or `rejected` can be decided — an automatic rejection is an override candidate. A `verified` one is final and returns `CZDKYC008`.

## Daily streak

The board is a fixed 30-day cycle with no enum fields of its own — a day is numbers, a free-text `label`, and booleans. The values worth pinning down:

| Field | Range | Notes |
|---|---|---|
| `day_number` | `1`–`30` | Position on the board. Also its identity: there is exactly one row per number. |
| `current_day` | `0`–`30` | `0` means the run has not started, or a missed day broke it. |
| `longest_day` | `0`–`30` | The all-time record. Never reset by a missed day. |
| `reward_coins` / `reward_gems` | `0`–`1,000,000` | A day may pay coins, gems, both, or nothing. |
| `is_milestone` | `true`, `false` | Drawn with the gold border. Default `true` on days 7, 14, 21, 28 and 30. |

`source_type` on the resulting wallet rows is `streak` for both the coin and the gem credit.
