# All curls

Every Coinzu endpoint as a copy-paste `curl`. Part 1 is the app API, part 2 is the admin API. Each entry links to its full doc, and the link shows which folder it is in: `apis/user/` is verified, `apis/inprogress/` is not tested yet, `apis/admin/` is the panel.

## Before you start

```bash
export BASE=http://localhost:4000/api
# A Coinzu user token, from POST /auth/login or POST /auth/register.
export TOKEN=<access_token>
# A Rewardtym admin token. Coinzu has no admin sign-in of its own.
export ADMIN_TOKEN=<rewardtym_admin_access_token>
```

- Every response is wrapped as `{ "success": true, "data": ... }`. Errors come back as `{ "success": false, "cz_error_code": "...", "cz_error_message": "...", "cz_error_description": "...", "cz_error_icon": "...", "statusCode": ..., "timestamp": "..." }`.
- Every date in a request or a response is **UTC**, ISO-8601 with a `Z` suffix.
- List endpoints take `page` (1-based, default `1`) and `limit` (default `20`, capped at `100`) and return `{ data, total }`.
- Unknown body fields are rejected, so send exactly the documented fields.

# Part 1 — App API (70 endpoints)

What the mobile app and website call. No admin token reaches these.

## Auth

Sign-up, sign-in and OTP. Every route here is public.

### POST /api/auth/register

Creates a new account with an email and password, sends the email verification code, and returns a signed-in session. — [`apis/user/001auth.register.md`](apis/user/001auth.register.md)

```bash
curl -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@coinzu.app",
    "password": "S3curePassw0rd",
    "name": "Ada Lovelace",
    "referral_code": "K7M2PQ4X"
  }'
```

### POST /api/auth/login

Exchanges an email and password for an access token and a refresh token. — [`apis/user/002auth.login.md`](apis/user/002auth.login.md)

```bash
curl -X POST $BASE/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "email": "user@coinzu.app", "password": "S3curePassw0rd" }'
```

### POST /api/auth/refresh

Exchanges a refresh token for a fresh access token and refresh token pair. — [`apis/user/003auth.refresh.md`](apis/user/003auth.refresh.md)

```bash
curl -X POST $BASE/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{ "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }'
```

### POST /api/auth/google

Signs in with a Google ID token, creating the account on first use. — [`apis/user/004auth.google.md`](apis/user/004auth.google.md)

```bash
curl -X POST $BASE/auth/google \
  -H 'Content-Type: application/json' \
  -d '{ "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjZmNzI1NDEwMWY..." }'
```

### POST /api/auth/email/verify

Consumes the token from the emailed confirm-email link, marks the email verified, and returns a signed-in session. — [`apis/user/023auth.email-verify-link.md`](apis/user/023auth.email-verify-link.md)

```bash
curl -X POST $BASE/auth/email/verify \
  -H 'Content-Type: application/json' \
  -d '{ "token": "aa7782ba386f30ba490d8375100fbf29014e60e2935e5b088e0e7170f07a4fe" }'
```

### GET /api/auth/email/verify

Branded HTML page opened from the confirm-email link; auto-calls the verify endpoint above and stores the access token. — [`apis/user/024auth.email-verify-page.md`](apis/user/024auth.email-verify-page.md)

```bash
curl "$BASE/auth/email/verify?token=aa7782ba386f30ba490d8375100fbf29014e60e2935e5b088e0e7170f07a4fe"
```

### POST /api/auth/password/forgot

Emails a password-reset link if the address belongs to an account. Response never reveals whether the email exists. — [`apis/user/025auth.password-forgot.md`](apis/user/025auth.password-forgot.md)

```bash
curl -X POST $BASE/auth/password/forgot \
  -H 'Content-Type: application/json' \
  -d '{ "email": "user@coinzu.app" }'
```

### POST /api/auth/password/reset

Consumes a password-reset link token and sets the new password. — [`apis/user/026auth.password-reset.md`](apis/user/026auth.password-reset.md)

```bash
curl -X POST $BASE/auth/password/reset \
  -H 'Content-Type: application/json' \
  -d '{ "token": "bb4587ed1a5dc5d1e42453d14f05913d6b96eb25dcfa14ba6589f5421491b2a", "password": "N3wS3curePassw0rd" }'
```

### GET /api/auth/password/reset

Branded HTML page opened from the reset-password link, with the new-password form. — [`apis/user/027auth.password-reset-page.md`](apis/user/027auth.password-reset-page.md)

```bash
curl "$BASE/auth/password/reset?token=bb4587ed1a5dc5d1e42453d14f05913d6b96eb25dcfa14ba6589f5421491b2a"
```

## Users & onboarding

The signed-in profile, the four onboarding steps, and device registration.

### GET /api/users/me

Returns the full profile of the signed-in user. — [`apis/user/005users.me.md`](apis/user/005users.me.md)

```bash
curl $BASE/users/me \
  -H 'Authorization: Bearer $TOKEN'
```

### PATCH /api/users/me

Updates the profile of the signed-in user. Only the fields you send are changed. — [`apis/user/006users.update-me.md`](apis/user/006users.update-me.md)

```bash
curl -X PATCH $BASE/users/me \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "name": "Ada Lovelace", "country": "GB", "phone": "+919875643266" }'
```

### POST /api/users/me/onboarding/info

Account setup step 1 — saves name, gender, age range and country. — [`apis/user/007users.onboarding-info.md`](apis/user/007users.onboarding-info.md)

```bash
curl -X POST $BASE/users/me/onboarding/info \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    "name": "Ada Lovelace",
    "gender": "female",
    "age_range": "25-34",
    "country": "GB"
  }'
```

### POST /api/users/me/onboarding/permissions

Account setup step 2 — records whether the user allowed push notifications. — [`apis/user/008users.onboarding-permissions.md`](apis/user/008users.onboarding-permissions.md)

```bash
curl -X POST $BASE/users/me/onboarding/permissions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "notifications_enabled": true }'
```

### POST /api/users/me/onboarding/interests

Account setup step 3 — saves the interest tags the user picked. — [`apis/user/009users.onboarding-interests.md`](apis/user/009users.onboarding-interests.md)

```bash
curl -X POST $BASE/users/me/onboarding/interests \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "interests": ["gaming", "shopping", "travel"] }'
```

### POST /api/users/me/onboarding/goal

Account setup step 4 — saves the primary goal and marks onboarding complete. — [`apis/user/010users.onboarding-goal.md`](apis/user/010users.onboarding-goal.md)

```bash
curl -X POST $BASE/users/me/onboarding/goal \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "primary_goal": "save_for_a_trip" }'
```

### POST /api/users/me/device

Registers or refreshes this device — IP/ASN/fingerprint fraud signals plus push-token targeting. — [`apis/user/028users.register-device.md`](apis/user/028users.register-device.md)

```bash
curl -X POST $BASE/users/me/device \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    "device_id": "b7e2b6b0-1a2b-4c3d-9e4f-5a6b7c8d9e0f",
    "platform_type": "android",
    "push_token": "fcm-or-apns-token",
    "device_info": { "app_version": "1.4.2", "os_version": "17.4", "model": "Pixel 8" }
  }'
```

### PATCH /api/users/me/notification-preferences

Turns push categories on or off and sets the quiet-hours opt-in. — [`apis/user/032users.notification-preferences.md`](apis/user/032users.notification-preferences.md)

```bash
# Mute promotions, keep everything else
curl -X PATCH $BASE/users/me/notification-preferences \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "promotion": false }'

# Accept being interrupted at any hour
curl -X PATCH $BASE/users/me/notification-preferences \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "quiet_hours": false }'
```

## Wallet

Balances, the ledger, coin/gem conversion and withdrawals.

### GET /api/wallet

Returns the coin and gem balances of the signed-in user. — [`apis/user/011wallet.balance.md`](apis/user/011wallet.balance.md)

```bash
curl $BASE/wallet \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/wallet/transactions

Lists the wallet ledger of the signed-in user, newest first. — [`apis/user/012wallet.transactions.md`](apis/user/012wallet.transactions.md)

```bash
curl '$BASE/wallet/transactions?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/wallet/rates

Coin, gem, convert and withdrawal rate definitions, with an optional exact conversion preview. — [`apis/user/030wallet.rates.md`](apis/user/030wallet.rates.md)

```bash
curl "$BASE/wallet/rates?gem_amount=12000&coin_amount=500" \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/wallet/convert

Converts coins into gems, or gems back into coins, at the admin-set rate. — [`apis/user/013wallet.convert.md`](apis/user/013wallet.convert.md)

```bash
curl -X POST $BASE/wallet/convert \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "from_currency": "coin", "amount": 500 }'
```

### POST /api/wallet/withdrawals

Asks for a cash payout. The coins leave the wallet straight away and an admin reviews the request. — [`apis/inprogress/001wallet.withdrawals.create.md`](apis/inprogress/001wallet.withdrawals.create.md)

```bash
curl -X POST $BASE/wallet/withdrawals \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    "amount_coins": 5000,
    "method": "paypal",
    "destination_details": { "paypal_email": "user@coinzu.app" }
  }'
```

### GET /api/wallet/withdrawals

Lists the withdrawal requests of the signed-in user, newest first. — [`apis/inprogress/002wallet.withdrawals.list.md`](apis/inprogress/002wallet.withdrawals.list.md)

```bash
curl '$BASE/wallet/withdrawals?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

## Offerwall

Browsing offers, tracking clicks and the provider postbacks.

### GET /api/offers

Lists the live offers available to the signed-in user, highest reward first. — [`apis/inprogress/003offers.list.md`](apis/inprogress/003offers.list.md)

```bash
curl '$BASE/offers?category=games&platform=android&page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/offers/categories

Lists the categories that currently have live offers. — [`apis/inprogress/004offers.categories.md`](apis/inprogress/004offers.categories.md)

```bash
curl $BASE/offers/categories \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/offers/:id

Returns one offer by id. — [`apis/inprogress/005offers.get.md`](apis/inprogress/005offers.get.md)

```bash
curl $BASE/offers/6d3a91f2-0c48-4b7d-a5e1-9f2b7c60d413 \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/offers/:id/click

Records that the user started an offer and returns the provider tracking URL to open. — [`apis/inprogress/006offers.click.md`](apis/inprogress/006offers.click.md)

```bash
curl -X POST $BASE/offers/6d3a91f2-0c48-4b7d-a5e1-9f2b7c60d413/click \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/offers/mine

Lists the offers the signed-in user started, newest click first, with the reward status of each. — [`apis/inprogress/007offers.mine.md`](apis/inprogress/007offers.mine.md)

```bash
curl '$BASE/offers/mine?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/daily/streak

The whole Rewards screen — the 30-day board, every payout, and whether today is unclaimed. The app calls this on open. — [`apis/user/034daily.streak.board.md`](apis/user/034daily.streak.board.md)

```bash
curl $BASE/daily/streak \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/daily/streak/claim

Claims today's tile and credits it. This is the daily check-in. — [`apis/user/035daily.streak.claim.md`](apis/user/035daily.streak.claim.md)

```bash
curl -X POST $BASE/daily/streak/claim \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/daily/challenges

The whole Daily Challenge screen — tiles, master chest, day strip and what can be played now. — [`apis/user/037daily.challenges.board.md`](apis/user/037daily.challenges.board.md)

```bash
# Today
curl $BASE/daily/challenges \
  -H 'Authorization: Bearer $TOKEN'

# A finished day, read-only
curl "$BASE/daily/challenges?date=2026-08-29" \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/daily/challenges/chest

Claims the Daily Master Chest. Once a day, only when every tile is finished. — [`apis/user/038daily.challenges.chest.md`](apis/user/038daily.challenges.chest.md)

```bash
curl -X POST $BASE/daily/challenges/chest \
  -H 'Authorization: Bearer $TOKEN'
```

## Games

Spin, scratch and quiz.

### GET /api/games/spin

Returns the wheel face and how many spins the signed-in user has left today. — [`apis/user/039games.spin.wheel.md`](apis/user/039games.spin.wheel.md)

```bash
curl $BASE/games/spin \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/games/spin

Spins the wheel once and credits whatever the winning segment pays. — [`apis/user/040games.spin.play.md`](apis/user/040games.spin.play.md)

```bash
curl -X POST $BASE/games/spin \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/games/spin/history

Lists the past spins of the signed-in user, newest first. — [`apis/inprogress/008games.spin.history.md`](apis/inprogress/008games.spin.history.md)

```bash
curl '$BASE/games/spin/history?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/games/scratch

Returns how many scratch cards the signed-in user has left today. — [`apis/user/043games.scratch.status.md`](apis/user/043games.scratch.status.md)

```bash
curl $BASE/games/scratch \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/games/scratch

Scratches one card and credits the prize. — [`apis/user/044games.scratch.play.md`](apis/user/044games.scratch.play.md)

```bash
curl -X POST $BASE/games/scratch \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/games/scratch/history

Lists the past scratch cards of the signed-in user, newest first. — [`apis/inprogress/009games.scratch.history.md`](apis/inprogress/009games.scratch.history.md)

```bash
curl '$BASE/games/scratch/history?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/games/quiz

Returns today's quiz question, plus this user's attempt when they already answered. — [`apis/user/041games.quiz.today.md`](apis/user/041games.quiz.today.md)

```bash
curl $BASE/games/quiz \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/games/quiz/:id/answer

Answers a quiz question and credits the reward when the answer is right. — [`apis/user/042games.quiz.answer.md`](apis/user/042games.quiz.answer.md)

```bash
curl -X POST $BASE/games/quiz/e5b71c48-2a09-4d6f-88b3-05fc71a9d2e6/answer \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "selected_option": "Bitcoin" }'
```

### GET /api/games/quiz/history

Lists the past quiz attempts of the signed-in user, newest first. — [`apis/inprogress/010games.quiz.history.md`](apis/inprogress/010games.quiz.history.md)

```bash
curl '$BASE/games/quiz/history?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

## Lucky draw

Draw listings, entries and winners.






## Achievements

Badge catalogue and progress.

### GET /api/achievements

Lists the active achievements with the progress of the signed-in user merged into each one. — [`apis/user/036achievements.list.md`](apis/user/036achievements.list.md)

```bash
curl $BASE/achievements \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/referrals/invite

Returns the signed-in user's invite link plus the Invite a Friend screen's reward/stats numbers. — [`apis/user/029referrals.invite.md`](apis/user/029referrals.invite.md)

```bash
curl $BASE/referrals/invite \
  -H 'Authorization: Bearer $TOKEN'
```

## Leaderboard

Ranking board and the caller’s own rank.

### GET /api/leaderboard

Returns the top coin earners for today, this week, or all time. — [`apis/user/014leaderboard.top.md`](apis/user/014leaderboard.top.md)

```bash
curl '$BASE/leaderboard?window=week&limit=50' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/leaderboard/me

Returns where the signed-in user sits in the chosen window, even when they are outside the top list. — [`apis/user/015leaderboard.me.md`](apis/user/015leaderboard.me.md)

```bash
curl '$BASE/leaderboard/me?window=week' \
  -H 'Authorization: Bearer $TOKEN'
```

## Redeem

Gift card catalogue, orders and code reveal.

### GET /api/redeem/products

Lists the gift cards that can be ordered, featured first and then cheapest first. — [`apis/inprogress/011redeem.products.list.md`](apis/inprogress/011redeem.products.list.md)

```bash
curl '$BASE/redeem/products?category=shopping&page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/redeem/categories

Lists the categories that active gift cards are filed under, for the filter chips on the redeem screen. — [`apis/inprogress/012redeem.categories.md`](apis/inprogress/012redeem.categories.md)

```bash
curl $BASE/redeem/categories \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/redeem/products/:id

Returns one gift card product by id. — [`apis/inprogress/013redeem.products.get.md`](apis/inprogress/013redeem.products.get.md)

```bash
curl $BASE/redeem/products/6c1d5a83-90b7-4f2e-8a41-3d7b0e29c5f6 \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/redeem/products/:id/order

Buys a gift card with coins. Coins are charged first, then the vendor is asked for the code. — [`apis/inprogress/014redeem.products.order.md`](apis/inprogress/014redeem.products.order.md)

```bash
curl -X POST $BASE/redeem/products/6c1d5a83-90b7-4f2e-8a41-3d7b0e29c5f6/order \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/redeem/orders

Lists the gift card orders of the signed-in user, newest first. — [`apis/inprogress/015redeem.orders.list.md`](apis/inprogress/015redeem.orders.list.md)

```bash
curl '$BASE/redeem/orders?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/redeem/orders/:id

Returns one of the signed-in user’s gift card orders. — [`apis/inprogress/016redeem.orders.get.md`](apis/inprogress/016redeem.orders.get.md)

```bash
curl $BASE/redeem/orders/a91f4e07-2c68-4b35-9d80-51e6f3b7a2c4 \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/redeem/orders/:id/code

Reveals the gift card code of a fulfilled order. — [`apis/inprogress/017redeem.orders.code.md`](apis/inprogress/017redeem.orders.code.md)

```bash
curl $BASE/redeem/orders/a91f4e07-2c68-4b35-9d80-51e6f3b7a2c4/code \
  -H 'Authorization: Bearer $TOKEN'
```

## KYC

Selfie verification.

### POST /api/kyc/verify

Uploads a selfie and decides on it in the same call using AWS Rekognition face detection. — [`apis/user/016kyc.selfie.md`](apis/user/016kyc.selfie.md)

```bash
curl -X POST $BASE/kyc/verify \
  -H 'Authorization: Bearer $TOKEN' \
  -F 'file=@selfie.jpg'
```

### GET /api/notifications

Lists the notifications of the signed-in user together with every broadcast, newest first. — [`apis/inprogress/018notifications.list.md`](apis/inprogress/018notifications.list.md)

```bash
curl '$BASE/notifications?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### PATCH /api/notifications/:id/read

Marks one notification as read. — [`apis/inprogress/019notifications.mark-read.md`](apis/inprogress/019notifications.mark-read.md)

```bash
curl -X PATCH $BASE/notifications/c30f7a95-4b12-4de8-96a3-2e5b8d740c1f/read \
  -H 'Authorization: Bearer $TOKEN'
```

### POST /api/notifications/push-events

Reports that a push arrived, was opened, or had a button tapped. — [`apis/user/031notifications.push-event.md`](apis/user/031notifications.push-event.md)

```bash
# The notification arrived
curl -X POST $BASE/notifications/push-events \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "cz_push_campaign_id": "60dc116b-1ae4-4e25-b87d-1f217c2e2da5", "event": "delivered" }'

# The user tapped an action button
curl -X POST $BASE/notifications/push-events \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{ "cz_push_campaign_id": "60dc116b-1ae4-4e25-b87d-1f217c2e2da5",
        "event": "clicked", "button_id": "open_offers" }'
```

## Support

FAQs and tickets.

### GET /api/support/faqs

Lists or searches the active FAQs, in display order. Public. — [`apis/user/017support.faqs.list.md`](apis/user/017support.faqs.list.md)

```bash
curl '$BASE/support/faqs?search=withdraw'
```

### POST /api/support/tickets

Raises a support ticket, a problem report, or a piece of feedback. — [`apis/user/018support.tickets.create.md`](apis/user/018support.tickets.create.md)

```bash
curl -X POST $BASE/support/tickets \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    "type": "report_problem",
    "category": "Withdrawals",
    "subject": "Coins missing after offer",
    "description": "I completed the offer yesterday but got no coins."
  }'
```

Feedback (star rating) posts to the same endpoint with `type: "feedback"` and a `rating`:

```bash
curl -X POST $BASE/support/tickets \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    "type": "feedback",
    "rating": 5,
    "description": "The daily check in streak keeps me coming back."
  }'
```

### GET /api/support/tickets

Lists the tickets of the signed-in user, newest first. — [`apis/user/019support.tickets.list.md`](apis/user/019support.tickets.list.md)

```bash
curl '$BASE/support/tickets?page=1&limit=20' \
  -H 'Authorization: Bearer $TOKEN'
```

### GET /api/support/tickets/:id

Returns one of the signed-in user’s tickets. — [`apis/inprogress/020support.tickets.get.md`](apis/inprogress/020support.tickets.get.md)

```bash
curl $BASE/support/tickets/9e0b4a72-63d5-4c81-a297-5f14c8e0b3d6 \
  -H 'Authorization: Bearer $TOKEN'
```

## Storage

Avatar upload.

### POST /api/storage/avatar

Uploads an avatar image and returns its public URL. — [`apis/user/020storage.avatar.md`](apis/user/020storage.avatar.md)

```bash
curl -X POST $BASE/storage/avatar \
  -H 'Authorization: Bearer $TOKEN' \
  -F 'file=@avatar.png'
```

## Health

Liveness and readiness. Both public.

### GET /api/health

Liveness probe. Answers as long as the process is running. — [`apis/inprogress/021health.check.md`](apis/inprogress/021health.check.md)

```bash
curl $BASE/health
```

### GET /api/health/ready

Readiness probe. Runs a trivial query to confirm the database answers. — [`apis/inprogress/022health.ready.md`](apis/inprogress/022health.ready.md)

```bash
curl $BASE/health/ready
```

## Dropdown

Master option lists (gender, interest, and more). Public.

### GET /api/dropdown

Returns the master option lists grouped by type. — [`apis/user/021dropdown.list.md`](apis/user/021dropdown.list.md)

```bash
curl "$BASE/dropdown?types=gender,interest"
```

## Offerwall Partners

Hosted offerwalls the app lists as ranked logos, opened in an iframe with the user id appended.

### GET /api/offerwall

Lists every active offerwall, ranked, each with the caller's user id appended into its click URL. — [`apis/user/022offerwall.list.md`](apis/user/022offerwall.list.md)

```bash
curl $BASE/offerwall \
  -H 'Authorization: Bearer $TOKEN'
```

The partner reward callback (`GET`/`POST /api/offerwall/postback/:slug/:token`) is public and unauthenticated, but its curl examples live in the Admin API section below since the URL itself is admin-managed — see [011](apis/admin/011offerwall.postback-get.md)/[012](apis/admin/012offerwall.postback-post.md).

# Part 2 — Admin API (37 endpoints)

Numbers `001`–`053` are retired — every admin feature except Dropdown was
removed to start the panel clean. New admin curls are added back one at a
time as the feature returns.

## Dropdown

Master option lists (gender, interest, and more).

### GET /api/admin/dropdown/options

Lists dropdown options, inactive included, paginated and filterable by category. — [`apis/admin/001dropdown.list.md`](apis/admin/001dropdown.list.md)

```bash
curl "$BASE/admin/dropdown/options?page=1&limit=20&type=interest&search=gam&is_active=true" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/dropdown/options

Creates a dropdown option under a type, existing or new. — [`apis/admin/002dropdown.create.md`](apis/admin/002dropdown.create.md)

```bash
curl -X POST $BASE/admin/dropdown/options \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "type": "interest",
    "value": "gaming",
    "label": "Gaming",
    "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/dropdown-icons/interest/gaming.png",
    "display_order": 9
  }'
```

### PATCH /api/admin/dropdown/options/:id

Updates a dropdown option, including deactivating it. — [`apis/admin/003dropdown.update.md`](apis/admin/003dropdown.update.md)

```bash
curl -X PATCH $BASE/admin/dropdown/options/1a2b3c4d-5e6f-7890-abcd-ef1234567890 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "is_active": false }'
```

### POST /api/admin/dropdown/options/icon

Uploads a dropdown option icon and returns its public URL. — [`apis/admin/004dropdown.upload-icon.md`](apis/admin/004dropdown.upload-icon.md)

```bash
curl -X POST $BASE/admin/dropdown/options/icon \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -F 'file=@gaming.png'
```

## Offerwall Partners

Onboard partners, set rank/badge, and audit postbacks.

### GET /api/admin/offerwall/partners

Lists every offerwall partner, inactive included. — [`apis/admin/005offerwall.partners.list.md`](apis/admin/005offerwall.partners.list.md)

```bash
curl $BASE/admin/offerwall/partners \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/offerwall/partners

Onboards a new offerwall partner. — [`apis/admin/006offerwall.partners.create.md`](apis/admin/006offerwall.partners.create.md)

```bash
curl -X POST $BASE/admin/offerwall/partners \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "name": "AdGate Media",
    "slug": "adgate-media",
    "click_url_template": "https://wall.adgatemedia.com/wall?userid={USER_ID}&app=coinzu",
    "postback_field_mapping": {
      "user_id": "user_id",
      "external_transaction_id": "conversion_id",
      "offer_name": "campaign_name",
      "payout": "payout_amount"
    },
    "rank": 100,
    "badge_label": "Trending"
  }'
```

`postback_method` and `postback_auth_type` are both omitted here to take their defaults (`get`, `token`) — see [006](apis/admin/006offerwall.partners.create.md) for the `hmac_sha256` option, which is optional and independent of the method.

### PATCH /api/admin/offerwall/partners/:id

Updates rank, badge, URL template, rev share, postback config, logo, or `is_active`. — [`apis/admin/007offerwall.partners.update.md`](apis/admin/007offerwall.partners.update.md)

```bash
curl -X PATCH $BASE/admin/offerwall/partners/2f8b41c9-6d05-4a77-9e12-8c4b0d75a361 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "rank": 200, "badge_label": "Featured", "revenue_share_percent": 60 }'
```

### GET /api/admin/offerwall/partners/:id/postback-url

Returns the full postback URL, secret, and method to hand the partner. — [`apis/admin/008offerwall.partners.postback-url.md`](apis/admin/008offerwall.partners.postback-url.md)

```bash
curl $BASE/admin/offerwall/partners/2f8b41c9-6d05-4a77-9e12-8c4b0d75a361/postback-url \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/offerwall/postbacks

Postback audit log, newest first, filterable by partner and status. — [`apis/admin/009offerwall.postbacks.list.md`](apis/admin/009offerwall.postbacks.list.md)

```bash
curl "$BASE/admin/offerwall/postbacks?partner_id=2f8b41c9-6d05-4a77-9e12-8c4b0d75a361&status=credited&page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/offerwall/partners/logo

Uploads an offerwall partner logo and returns its public URL. — [`apis/admin/010offerwall.partners.upload-logo.md`](apis/admin/010offerwall.partners.upload-logo.md)

```bash
curl -X POST $BASE/admin/offerwall/partners/logo \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -F 'file=@adgate-logo.png'
```

### GET /api/offerwall/postback/:slug/:token

Partner reward callback (GET version). Public — the path token or HMAC signature authenticates it, not an admin token. — [`apis/admin/011offerwall.postback-get.md`](apis/admin/011offerwall.postback-get.md)

```bash
curl '$BASE/offerwall/postback/adgate-media/9f2c8a11c4d7b3e5b0d75a3612ff9021?user_id=e3b0c442-98fc-4e1e-8b1e-8c4b0d75a361&conversion_id=RT-TX-55120&campaign_name=Complete+a+survey&payout_amount=250&status=approved'
```

### POST /api/offerwall/postback/:slug/:token

Partner reward callback (POST version). Identical to the GET version, just delivered as a JSON body. — [`apis/admin/012offerwall.postback-post.md`](apis/admin/012offerwall.postback-post.md)

```bash
curl -X POST $BASE/offerwall/postback/adgate-media/9f2c8a11c4d7b3e5b0d75a3612ff9021 \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "e3b0c442-98fc-4e1e-8b1e-8c4b0d75a361",
    "conversion_id": "RT-TX-55120",
    "campaign_name": "Complete a survey",
    "payout_amount": 250,
    "status": "approved"
  }'
```

## Referrals

### GET /api/admin/referrals

Every user with their referral code, invite counts, and coins earned. Paginated table for the Refer & Earn tab. — [`apis/admin/013referrals.list.md`](apis/admin/013referrals.list.md)

```bash
curl "$BASE/admin/referrals?page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/referrals/:cz_user_id

One user's referral summary and the paginated list of everyone they invited — the row's detail page. — [`apis/admin/014referrals.detail.md`](apis/admin/014referrals.detail.md)

```bash
curl "$BASE/admin/referrals/f2eae717-1142-4c8b-b9d5-09d495d7b217?page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

`postback_method` (`get`/`post`) and `postback_auth_type` (`token`/`hmac_sha256`) are independent, optional settings on the partner — either method works with either auth type. A `hmac_sha256` partner adds one extra field, `signature`, to whichever of the two shapes above it already sends.

## Users

### GET /api/admin/users

Every user with their wallet balance, paginated and searchable by email/name/phone. The Users tab table. — [`apis/admin/015users.list.md`](apis/admin/015users.list.md)

```bash
curl "$BASE/admin/users?page=1&limit=20&search=shubham" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/users/:cz_user_id

One user's full profile — wallet, KYC, referral stats, recent activity — the shared detail page both the Users tab and the Referrals tab navigate to. — [`apis/admin/016users.detail.md`](apis/admin/016users.detail.md)

```bash
curl "$BASE/admin/users/f2eae717-1142-4c8b-b9d5-09d495d7b217" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/dropdown/types

Every dropdown category with its option counts, paginated and searchable. — [`apis/admin/017dropdown.types.list.md`](apis/admin/017dropdown.types.list.md)

```bash
curl "$BASE/admin/dropdown/types?page=1&limit=20&search=inter&is_active=true" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/dropdown/types

Onboards a new dropdown category. — [`apis/admin/018dropdown.types.create.md`](apis/admin/018dropdown.types.create.md)

```bash
curl -X POST $BASE/admin/dropdown/types \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "type": "payout_reason",
    "label": "Payout reason",
    "description": "Shown when a withdrawal is rejected.",
    "display_order": 5,
    "is_active": true
  }'
```

### PATCH /api/admin/dropdown/types/:id

Updates a dropdown category's label, description, order, or active state. — [`apis/admin/019dropdown.types.update.md`](apis/admin/019dropdown.types.update.md)

```bash
curl -X PATCH $BASE/admin/dropdown/types/3a91d2b7-6f0e-4c22-8a3f-11c7d9e4b5a0 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "label": "Payout reason", "is_active": false }'
```

### GET /api/admin/transactions

Every wallet movement across all users, filterable by user, currency, type, source and date. The Transactions tab table. — [`apis/admin/020transactions.list.md`](apis/admin/020transactions.list.md)

```bash
curl "$BASE/admin/transactions?page=1&limit=20&currency=coin&type=earn&source_type=offerwall&date_from=2026-08-01&date_end=2026-08-29" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/transactions/:cz_wallet_transaction_id

One wallet movement with its user, their live balance, and the row that caused it. — [`apis/admin/021transactions.detail.md`](apis/admin/021transactions.detail.md)

```bash
curl "$BASE/admin/transactions/9ebe339a-89b0-4a9a-bce7-268439611263" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/settings

Every tunable platform setting, grouped, with its value, default and bounds. The Configuration Settings tab. — [`apis/admin/022settings.list.md`](apis/admin/022settings.list.md)

```bash
curl "$BASE/admin/settings" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PATCH /api/admin/settings

Saves one or more settings; validated all-or-nothing, then the cache is cleared. — [`apis/admin/023settings.update.md`](apis/admin/023settings.update.md)

```bash
curl -X PATCH $BASE/admin/settings \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "settings": [
      { "setting_key": "coins_per_gem", "setting_value": "0.025" },
      { "setting_key": "withdrawal_requires_kyc", "setting_value": "true" }
    ]
  }'
```

### GET /api/admin/referral-rules

The referral reward ladder plus every trigger available to add. — [`apis/admin/024referral-rules.list.md`](apis/admin/024referral-rules.list.md)

```bash
curl "$BASE/admin/referral-rules" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/referral-rules

Adds one step to the referral reward ladder. — [`apis/admin/025referral-rules.create.md`](apis/admin/025referral-rules.create.md)

```bash
curl -X POST $BASE/admin/referral-rules \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "trigger": "kyc_verified", "reward_coins": 250, "label": "Friend completes KYC" }'
```

### PATCH /api/admin/referral-rules/:id

Changes a step's reward, threshold, label or active state. — [`apis/admin/026referral-rules.update.md`](apis/admin/026referral-rules.update.md)

```bash
curl -X PATCH $BASE/admin/referral-rules/7c1f0a2e-9b34-4d67-8e02-3f5a1c9d4b88 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "reward_coins": 750, "is_active": false }'
```

### DELETE /api/admin/referral-rules/:id

Removes a step from the referral reward ladder. — [`apis/admin/027referral-rules.delete.md`](apis/admin/027referral-rules.delete.md)

```bash
curl -X DELETE $BASE/admin/referral-rules/7c1f0a2e-9b34-4d67-8e02-3f5a1c9d4b88 \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/faqs/categories

FAQ categories, inactive included, for the filter and the FAQ form. — [`apis/admin/028faqs.categories.md`](apis/admin/028faqs.categories.md)

```bash
curl "$BASE/admin/faqs/categories" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/faqs

Every FAQ with its category, inactive included, filterable by category. — [`apis/admin/029faqs.list.md`](apis/admin/029faqs.list.md)

```bash
curl "$BASE/admin/faqs?category=payment&is_active=true" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/faqs

Adds a question and answer to a category. — [`apis/admin/030faqs.create.md`](apis/admin/030faqs.create.md)

```bash
curl -X POST $BASE/admin/faqs \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "category_id": "0f1b2c3d-4e5f-6789-abcd-ef0123456789",
    "question": "How can I withdraw my earnings?",
    "answer": "Go to Wallet and tap Withdraw. Pick a payout method, enter the amount and confirm."
  }'
```

### PATCH /api/admin/faqs/:id

Edits a FAQ, moves it, reorders it, or hides it. — [`apis/admin/031faqs.update.md`](apis/admin/031faqs.update.md)

```bash
curl -X PATCH $BASE/admin/faqs/5a71c308-92e4-4bd7-8f60-1c3e07a9d254 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "is_active": false }'
```

### DELETE /api/admin/faqs/:id

Deletes a FAQ permanently. — [`apis/admin/032faqs.delete.md`](apis/admin/032faqs.delete.md)

```bash
curl -X DELETE $BASE/admin/faqs/5a71c308-92e4-4bd7-8f60-1c3e07a9d254 \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/tickets

Every problem report and support ticket with its user, filterable. The Problem Reports tab. — [`apis/admin/033tickets.list.md`](apis/admin/033tickets.list.md)

```bash
# Problem Reports tab
curl "$BASE/admin/tickets?type=report_problem&status=open&date_from=2026-08-01&date_end=2026-08-29" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Feedback tab — same endpoint, read `ratings` for the star summary
curl "$BASE/admin/tickets?type=feedback&rating=5" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/tickets/:cz_support_ticket_id

One report with its user and the full message thread. — [`apis/admin/034tickets.detail.md`](apis/admin/034tickets.detail.md)

```bash
curl "$BASE/admin/tickets/9d23c68e-14bd-4974-8aff-b38ea6af192e" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/leaderboard

Coin earners ranked, paginated and filterable by range, country and minimum. The Leaderboard tab. — [`apis/admin/035leaderboard.list.md`](apis/admin/035leaderboard.list.md)

```bash
# Preset window
curl "$BASE/admin/leaderboard?window=week&page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Exact range, only sizeable earners in one country
curl "$BASE/admin/leaderboard?date_from=2026-08-01&date_end=2026-08-29&min_coins=1000&country=IN" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/kyc

Every verification attempt with its user, filterable, plus a count per outcome. The KYC tab. — [`036kyc.list.md`](apis/admin/036kyc.list.md)

```bash
curl "$BASE/admin/kyc?status=manual_review&date_from=2026-08-01&page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/kyc/:cz_kyc_verification_id

One attempt with the user and their full attempt history. — [`037kyc.detail.md`](apis/admin/037kyc.detail.md)

```bash
curl "$BASE/admin/kyc/1c7a9f22-4d3b-4e08-9b51-6f0e2a7d3c14" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/kyc/:cz_kyc_verification_id/decision

Approves or rejects an attempt awaiting review. **Super admin only.** — [`038kyc.decide.md`](apis/admin/038kyc.decide.md)

```bash
# Approve
curl -X POST "$BASE/admin/kyc/ca290ec5-4371-4e39-b02e-4432b9aae1fb/decision" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "decision": "approve" }'

# Reject with the wording the user will read
curl -X POST "$BASE/admin/kyc/d5ececdf-9fcc-4c6f-9e7d-6c6d5861351b/decision" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "decision": "reject", "reason": "The selfie does not match the document on file." }'
```

### GET /api/admin/push

Every push campaign, newest first, filterable, plus lifetime delivery and engagement totals. — [`039push.list.md`](apis/admin/039push.list.md)

```bash
curl "$BASE/admin/push?status=sent&category=promotion&date_from=2026-08-01&page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/push/preview

Who an audience reaches and who drops out, without sending. — [`040push.preview.md`](apis/admin/040push.preview.md)

```bash
# Everyone with a live push token
curl -X POST "$BASE/admin/push/preview" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{}'

# A promotion to Android and iOS in India or the US
curl -X POST "$BASE/admin/push/preview" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "countries": ["IN","US"], "platforms": ["android","ios"], "category": "promotion" }'

# A payout notice — nobody can mute it and the hour does not matter
curl -X POST "$BASE/admin/push/preview" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "category": "transaction" }'
```

### POST /api/admin/push

Creates a campaign and sends it now, schedules it, or saves a draft. — [`041push.create.md`](apis/admin/041push.create.md)

```bash
# Send now, to one country
curl -X POST "$BASE/admin/push" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "emoji": "🎉", "title": "Double coins all weekend",
        "body": "Every offer you finish before Sunday pays twice.",
        "deep_link": "coinzu://offers", "category": "promotion", "countries": ["IN"],
        "buttons": [{ "id": "open_offers", "label": "Browse offers", "deep_link": "coinzu://offers" }] }'

# Queue it for Friday morning
curl -X POST "$BASE/admin/push" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "title": "Weekend bonus", "body": "Double coins start now.",
        "category": "promotion", "scheduled_at": "2026-09-01T09:00:00.000Z" }'

# A payout notice to one person
curl -X POST "$BASE/admin/push" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "emoji": "💰", "title": "Your withdrawal is on its way",
        "body": "We have sent your payout. It should land within 24 hours.",
        "category": "transaction",
        "cz_user_ids": ["ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2"] }'

# Save a draft without sending
curl -X POST "$BASE/admin/push" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "title": "Weekend bonus", "body": "Double coins all weekend.", "send_now": false }'
```

### POST /api/admin/push/:cz_push_campaign_id/send

Runs a draft, or resends against a freshly resolved audience. — [`042push.send.md`](apis/admin/042push.send.md)

```bash
curl -X POST "$BASE/admin/push/60dc116b-1ae4-4e25-b87d-1f217c2e2da5/send" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/push/:cz_push_campaign_id/cancel

Stops a draft or a scheduled campaign before it runs. — [`043push.cancel.md`](apis/admin/043push.cancel.md)

```bash
curl -X POST "$BASE/admin/push/60dc116b-1ae4-4e25-b87d-1f217c2e2da5/cancel" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/push/:cz_push_campaign_id/duplicate

Copies a campaign into a fresh draft. — [`044push.duplicate.md`](apis/admin/044push.duplicate.md)

```bash
curl -X POST "$BASE/admin/push/60dc116b-1ae4-4e25-b87d-1f217c2e2da5/duplicate" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/push/test

A real send to a few named accounts, recorded nowhere. — [`045push.test.md`](apis/admin/045push.test.md)

```bash
curl -X POST "$BASE/admin/push/test" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "cz_user_ids": ["ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2"],
        "emoji": "🎉", "title": "Double coins all weekend",
        "body": "Every offer you finish before Sunday pays twice." }'
```

### GET /api/admin/push/:cz_push_campaign_id

One campaign with its results and what its audience reaches today. — [`046push.detail.md`](apis/admin/046push.detail.md)

```bash
curl "$BASE/admin/push/60dc116b-1ae4-4e25-b87d-1f217c2e2da5" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/push-templates

Saved push messages, most used first. — [`047push-templates.list.md`](apis/admin/047push-templates.list.md)

```bash
curl "$BASE/admin/push-templates?is_active=true&page=1&limit=50" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/push-templates

Saves a reusable push message. — [`048push-templates.create.md`](apis/admin/048push-templates.create.md)

```bash
curl -X POST "$BASE/admin/push-templates" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "name": "Weekend double coins", "emoji": "🎉",
        "title": "Double coins all weekend",
        "body": "Every offer you finish before Sunday pays twice.",
        "category": "promotion", "deep_link": "coinzu://offers" }'
```

### PATCH /api/admin/push-templates/:cz_push_template_id

Edits a template, or hides it from the composer. — [`049push-templates.update.md`](apis/admin/049push-templates.update.md)

```bash
curl -X PATCH "$BASE/admin/push-templates/4675facb-3f13-4f59-b51a-d7293f579460" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "is_active": false }'
```

### DELETE /api/admin/push-templates/:cz_push_template_id

Deletes a template permanently. — [`050push-templates.delete.md`](apis/admin/050push-templates.delete.md)

```bash
curl -X DELETE "$BASE/admin/push-templates/4675facb-3f13-4f59-b51a-d7293f579460" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/streak

The 30-day ladder, its payout totals against the targets, and where users sit. — [`051streak.ladder.md`](apis/admin/051streak.ladder.md)

```bash
curl "$BASE/admin/streak" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PUT /api/admin/streak

Replaces the whole 30-day ladder in one transaction. All 30 days are required. — [`052streak.save.md`](apis/admin/052streak.save.md)

```bash
curl -X PUT "$BASE/admin/streak" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "days": [
        { "day_number": 1, "reward_coins": 60, "reward_gems": 0, "label": "Token" },
        { "day_number": 7, "reward_coins": 300, "reward_gems": 200, "label": "Week 1 bonus", "is_milestone": true }
      ] }'
```

### POST /api/admin/streak/reset

Restores the shipped 5,000-coin / 2,000-gem ladder. Destructive, no undo. — [`053streak.reset.md`](apis/admin/053streak.reset.md)

```bash
curl -X POST "$BASE/admin/streak/reset" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/dashboard/streak

Daily-streak participation, depth and payout for the Dashboard tab. — [`054dashboard.streak.md`](apis/admin/054dashboard.streak.md)

```bash
curl "$BASE/admin/dashboard/streak" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/cron

Every background job, its schedule and how the last run went. — [`055cron.list.md`](apis/admin/055cron.list.md)

```bash
curl "$BASE/admin/cron" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/cron/:key/run

Runs one job immediately. Synchronous — the response carries the outcome. — [`056cron.run.md`](apis/admin/056cron.run.md)

```bash
curl -X POST "$BASE/admin/cron/streak_check/run" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PATCH /api/admin/cron/:key/enabled

Pauses or resumes one job. A paused job can still be run by hand. — [`057cron.enabled.md`](apis/admin/057cron.enabled.md)

```bash
curl -X PATCH "$BASE/admin/cron/streak_check/enabled" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "enabled": false }'
```

### PUT /api/admin/cron/:key/schedule

Overrides when one job fires. Validated before it is stored. — [`058cron.schedule.md`](apis/admin/058cron.schedule.md)

```bash
curl -X PUT "$BASE/admin/cron/streak_check/schedule" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "cron": "0 */4 * * *" }'
```

### POST /api/admin/cron/:key/reset

Drops the override and restores the shipped schedule. — [`059cron.reset.md`](apis/admin/059cron.reset.md)

```bash
curl -X POST "$BASE/admin/cron/streak_check/reset" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/achievements

Every medal with how many users hold it and who is close. — [`060achievements.list.md`](apis/admin/060achievements.list.md)

```bash
curl "$BASE/admin/achievements?rarity=rarest" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/achievements/:slug/users

The users holding one medal, or still working towards it. — [`061achievements.holders.md`](apis/admin/061achievements.holders.md)

```bash
# Who holds it
curl "$BASE/admin/achievements/verified/users?page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Who is close
curl "$BASE/admin/achievements/champion/users?state=in_progress" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Daily Challenges

### GET /api/admin/daily/dashboard

How much the daily games paid out, and exactly where it went. — [`062daily.dashboard.md`](apis/admin/062daily.dashboard.md)

```bash
# The last 30 days, everything
curl "$BASE/admin/daily/dashboard" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Only the wheel, week by week, over a quarter
curl "$BASE/admin/daily/dashboard?date_from=2026-06-01&date_to=2026-08-30&source=spin&granularity=week" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Coins only, longer leaderboard
curl "$BASE/admin/daily/dashboard?currency=coin&top=25" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/daily/challenges

The five tiles, the master chest, and how the last week went. — [`063daily.challenges.md`](apis/admin/063daily.challenges.md)

```bash
curl "$BASE/admin/daily/challenges" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PATCH /api/admin/daily/config

Sets the master chest reward. Not in the settings catalogue — this is the only way to change it. — [`064daily.config.md`](apis/admin/064daily.config.md)

```bash
curl -X PATCH "$BASE/admin/daily/config" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "chest_coins": 1200, "chest_gems": 800 }'
```

### PATCH /api/admin/daily/challenges/:cz_daily_challenge_id

Edits one tile — wording, target, rewards, and where a tap sends the app. — [`065daily.challenges.update.md`](apis/admin/065daily.challenges.update.md)

```bash
curl -X PATCH "$BASE/admin/daily/challenges/0f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "reward_coins": 75, "target_count": 2, "action": "offers" }'
```

### GET /api/admin/daily/spin-wheel

The wheel's segments with real odds, and the average payout per spin. — [`066daily.wheel.md`](apis/admin/066daily.wheel.md)

```bash
curl "$BASE/admin/daily/spin-wheel" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PUT /api/admin/daily/spin-wheel

Replaces the whole wheel. Send every segment — anything omitted is deleted. A segment pays exactly what its wedge shows — bands belong to the scratch pool. — [`067daily.wheel.save.md`](apis/admin/067daily.wheel.save.md)

```bash
curl -X PUT "$BASE/admin/daily/spin-wheel" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "segments": [
      { "label": "10",   "reward_coins": 10,   "reward_gems": 0, "probability_weight": 30 },
      { "label": "1000",     "reward_coins": 1000, "reward_gems": 0, "probability_weight": 12 },
      { "label": "Better luck", "reward_coins": 0, "reward_gems": 0, "probability_weight": 15 }
    ]
  }'
```

### GET /api/admin/daily/scratch-cards

The scratch prize pool with real odds, medal gating and payout bands. — [`068daily.scratch.md`](apis/admin/068daily.scratch.md)

```bash
curl "$BASE/admin/daily/scratch-cards" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PUT /api/admin/daily/scratch-cards

Replaces the whole prize pool. At least one active prize must stay ungated. — [`069daily.scratch.save.md`](apis/admin/069daily.scratch.save.md)

```bash
curl -X PUT "$BASE/admin/daily/scratch-cards" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "cards": [
      { "label": "Coin drop", "reward_coins": 25, "reward_coins_max": 250, "reward_gems": 0, "probability_weight": 34 },
      { "label": "2000 coins", "reward_coins": 2000, "reward_gems": 0, "probability_weight": 3, "min_medal_rarity": "epic" },
      { "label": "Better luck", "reward_coins": 0, "reward_gems": 0, "probability_weight": 10 }
    ]
  }'
```

### GET /api/admin/daily/quizzes

The quiz schedule, paged and filterable, plus the gaps in the next 15 days. — [`070daily.quizzes.md`](apis/admin/070daily.quizzes.md)

```bash
# The default page
curl "$BASE/admin/daily/quizzes" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Page 3, five at a time
curl "$BASE/admin/daily/quizzes?page=3&limit=5" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Everything still to run that has no image
curl "$BASE/admin/daily/quizzes?state=upcoming&has_image=false" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Find a question by wording, or by one of its options
curl "$BASE/admin/daily/quizzes?search=cowboy" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/daily/quizzes

Schedules a quiz for a date. Upsert — re-posting a date replaces it. A right answer wins a scratch card; there is no reward to set. — [`071daily.quizzes.save.md`](apis/admin/071daily.quizzes.save.md)

```bash
curl -X POST "$BASE/admin/daily/quizzes" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "date": "2026-09-19",
    "question": "Which sea creature has eight arms?",
    "options": ["SQUID", "OCTOPUS", "CRAB"],
    "correct_option": "OCTOPUS",
    "image_url": "https://cdn.coinzu.app/quiz/octopus.png"
  }'
```

### POST /api/admin/daily/quizzes/:cz_quiz_id/repeat

Copies a quiz onto another day. — [`072daily.quizzes.repeat.md`](apis/admin/072daily.quizzes.repeat.md)

```bash
curl -X POST "$BASE/admin/daily/quizzes/75130136-b35f-4e3b-b8ff-b672a1964aeb/repeat" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "date": "2026-09-20" }'
```

### POST /api/admin/daily/quizzes/image

Uploads a quiz image and returns its public URL. — [`073daily.quizzes.image.md`](apis/admin/073daily.quizzes.image.md)

```bash
curl -X POST "$BASE/admin/daily/quizzes/image" \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -F 'file=@octopus.png'
```

### DELETE /api/admin/daily/quizzes/:cz_quiz_id

Removes a scheduled quiz. The day then has none. — [`074daily.quizzes.delete.md`](apis/admin/074daily.quizzes.delete.md)

```bash
curl -X DELETE "$BASE/admin/daily/quizzes/75130136-b35f-4e3b-b8ff-b672a1964aeb" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Rewards

### GET /api/rewards

The Rewards screen: every card, its price, its countdown. — [`apis/user/045rewards.list.md`](apis/user/045rewards.list.md)

```bash
curl $BASE/rewards -H 'Authorization: Bearer $TOKEN'
```

### GET /api/rewards/:slug

One reward: the live pot, countdown, my entries, prizes and winners. — [`apis/user/046rewards.detail.md`](apis/user/046rewards.detail.md)

```bash
curl $BASE/rewards/daily_lucky_draw -H 'Authorization: Bearer $TOKEN'
```

### POST /api/rewards/:slug/entries

Buys entries into a draw with gems. Entries stack. — [`apis/user/047rewards.buy-entries.md`](apis/user/047rewards.buy-entries.md)

```bash
curl -X POST $BASE/rewards/daily_lucky_draw/entries \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $TOKEN' \
  -d '{ "count": 10 }'
```

### POST /api/rewards/:slug/play

Pays for one instant play and resolves it. Unlimited. — [`apis/user/048rewards.play.md`](apis/user/048rewards.play.md)

```bash
curl -X POST $BASE/rewards/wheel_of_fortune/play -H 'Authorization: Bearer $TOKEN'
```

### GET /api/rewards/winners

Winners across every reward, or one, filterable to any date. — [`apis/user/049rewards.winners.md`](apis/user/049rewards.winners.md)

```bash
curl $BASE/rewards/winners -H 'Authorization: Bearer $TOKEN'

curl "$BASE/rewards/daily_lucky_draw/winners?date=2026-08-29" -H 'Authorization: Bearer $TOKEN'

curl "$BASE/rewards/winners?date_from=2026-08-01&date_to=2026-08-31&page=2" -H 'Authorization: Bearer $TOKEN'
```

## Rewards (admin)

### GET /api/admin/rewards/dashboard

Gems collected against coins paid. — [`075rewards.dashboard.md`](apis/admin/075rewards.dashboard.md)

```bash
curl "$BASE/admin/rewards/dashboard?date_from=2026-08-01&date_to=2026-08-30" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### GET /api/admin/rewards/games

Every reward card with its live figures. — [`076rewards.games.md`](apis/admin/076rewards.games.md)

```bash
curl "$BASE/admin/rewards/games" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PATCH /api/admin/rewards/games/:cz_reward_game_id

Edits one card. — [`077rewards.games.update.md`](apis/admin/077rewards.games.update.md)

```bash
curl -X PATCH "$BASE/admin/rewards/games/$GAME_ID" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "entry_cost_gems": 15, "entry_packs": [5,10,25,50,100,250] }'
```

### GET /api/admin/rewards/games/:cz_reward_game_id/prizes

The prize ladder, or the wheel face with real odds. — [`078rewards.prizes.md`](apis/admin/078rewards.prizes.md)

```bash
curl "$BASE/admin/rewards/games/$GAME_ID/prizes" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PUT /api/admin/rewards/games/:cz_reward_game_id/prizes

Replaces the whole ladder. — [`079rewards.prizes.save.md`](apis/admin/079rewards.prizes.save.md)

```bash
curl -X PUT "$BASE/admin/rewards/games/$GAME_ID/prizes" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "prizes": [ { "label": "10 Coins", "reward_coins": 10, "reward_gems": 0, "probability_weight": 30 } ] }'
```

### GET /api/admin/rewards/games/:cz_reward_game_id/payout-rules

How the pot scales with turnout. — [`080rewards.rules.md`](apis/admin/080rewards.rules.md)

```bash
curl "$BASE/admin/rewards/games/$GAME_ID/payout-rules" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### PUT /api/admin/rewards/games/:cz_reward_game_id/payout-rules

Replaces the turnout-to-pot ladder. The first band must start at 0. — [`081rewards.rules.save.md`](apis/admin/081rewards.rules.save.md)

```bash
curl -X PUT "$BASE/admin/rewards/games/$GAME_ID/payout-rules" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "rules": [
      { "min_participants": 0,    "prize_pool_coins": 500,   "winners_count": 1 },
      { "min_participants": 10,   "prize_pool_coins": 2000,  "winners_count": 2 },
      { "min_participants": 50,   "prize_pool_coins": 5000,  "winners_count": 3 },
      { "min_participants": 250,  "prize_pool_coins": 15000, "winners_count": 5 }
    ]
  }'
```

### GET /api/admin/rewards/draws

Every draw instance with its winners. — [`082rewards.draws.md`](apis/admin/082rewards.draws.md)

```bash
curl "$BASE/admin/rewards/draws?slug=daily_lucky_draw&status=resolved" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

### POST /api/admin/rewards/draws/run

Settles what is due and opens what is missing. Pays real money. — [`083rewards.draws.run.md`](apis/admin/083rewards.draws.run.md)

```bash
curl -X POST "$BASE/admin/rewards/draws/run" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

