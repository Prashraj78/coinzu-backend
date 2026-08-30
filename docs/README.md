# Coinzu API docs

154 endpoints across three folders. Every endpoint has its own file, numbered in reading order.

| Folder | Count | What lives here |
|---|---|---|
| [`apis/user/`](apis/user) | 49 | **Live user-facing APIs.** Built, tested and safe for the app to integrate against. |
| [`apis/inprogress/`](apis/inprogress) | 22 | **Not tested yet.** The endpoint exists and the doc is written, but it has not been verified end to end. Do not build against these without checking first. |
| [`apis/admin/`](apis/admin) | 83 | **Admin panel APIs.** Called with a Rewardtym admin token, never by the app. |

A doc moves from `inprogress/` to `user/` once its endpoint has actually been exercised end to end. It takes a new number in its new folder, and both folders are renumbered to stay contiguous.

Numbers are **positional within a folder**, renumbered from `001` whenever docs are added, removed or promoted. They are a reading order, not a permanent id — link to a doc by its path, and identify an endpoint by its method and path rather than its number.

Removed along the way, and not coming back: the phone OTP endpoints (dropped with SMS), the email OTP endpoints (`send-otp`/`verify-otp` — email verification is link-only, see [023](apis/user/023auth.email-verify-link.md)/[024](apis/user/024auth.email-verify-page.md)), the offers provider postbacks (server-to-server, not user-facing), `GET /api/offerwall/history` (the wallet ledger already covers it through `source_type: "offerwall"`), eight endpoints folded into the one call their screen needs, and the five `lucky-draw` endpoints, superseded by the richer Rewards module (`GET`/`POST /api/rewards/*`).

| Read this | For |
|---|---|
| [CONVENTIONS.md](CONVENTIONS.md) | Response envelope, auth, time zone, pagination, naming. **Read first.** |
| [CURLS.md](CURLS.md) | Every endpoint as a copy-paste `curl`. |
| [ENUMS.md](ENUMS.md) | Every fixed-value field and all of its values. |
| [ERROR_CODES.md](ERROR_CODES.md) | All 118 `cz_error_code` values with status and message. |
| [apis/user/033app-changes.md](apis/user/033app-changes.md) | **What the app must configure.** A running numbered sequence of backend changes that need work inside the app. The one non-endpoint file in `user/`. |
| [PUSH_NOTIFICATIONS.md](PUSH_NOTIFICATIONS.md) | Firebase setup and the app developer's push integration steps. |
| [API_DOC_TEMPLATE.md](API_DOC_TEMPLATE.md) | The shape each endpoint file follows. |

## The short version

- Base URL `http://localhost:4000/api`. Success is `{ "success": true, "data": ... }`.
- Failure is `{ "success": false, "cz_error_code", "cz_error_message", "cz_error_description", "statusCode", "timestamp" }`. Branch on `cz_error_code`; show `cz_error_message`.
- Auth is `Authorization: Bearer <token>`. A **user token** comes from the auth endpoints. An **admin token** is the caller's existing **Rewardtym** token — Coinzu has no admin account of its own.
- Everything is **UTC**. Convert for display only.
- Lists take `page` (1-based, default `1`) and `limit` (default `20`, max `100`) and return `{ data, total }`.
- Unknown body fields are rejected with `400 CZDCOMM001`, so send exactly what the doc lists.

# App API — 70 endpoints

Everything the mobile app and website integrate against. Each row's doc link shows which folder it is in: `user/` is verified, `inprogress/` is not.

## Auth — 9 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `POST /api/auth/register` | public | Creates a new account with an email and password, sends the email verification code, and returns a signed-in session. | [001](apis/user/001auth.register.md) |
| `POST /api/auth/login` | public | Exchanges an email and password for an access token and a refresh token. | [002](apis/user/002auth.login.md) |
| `POST /api/auth/refresh` | public | Exchanges a refresh token for a fresh access token and refresh token pair. | [003](apis/user/003auth.refresh.md) |
| `POST /api/auth/google` | public | Signs in with a Google ID token, creating the account on first use. | [004](apis/user/004auth.google.md) |
| `POST /api/auth/email/verify` | public | Consumes the token from the emailed confirm-email link, marks the email verified, and returns a signed-in session. | [023](apis/user/023auth.email-verify-link.md) |
| `GET /api/auth/email/verify` | public | Branded HTML page opened from the confirm-email link; auto-calls the verify endpoint above and stores the access token. | [024](apis/user/024auth.email-verify-page.md) |
| `POST /api/auth/password/forgot` | public | Emails a password-reset link if the address belongs to an account. Response never reveals whether the email exists. | [025](apis/user/025auth.password-forgot.md) |
| `POST /api/auth/password/reset` | public | Consumes a password-reset link token and sets the new password. | [026](apis/user/026auth.password-reset.md) |
| `GET /api/auth/password/reset` | public | Branded HTML page opened from the reset-password link, with the new-password form. | [027](apis/user/027auth.password-reset-page.md) |

## Users & onboarding — 8 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/users/me` | user token | Returns the full profile of the signed-in user. | [005](apis/user/005users.me.md) |
| `PATCH /api/users/me` | user token | Updates the profile of the signed-in user. Only the fields you send are changed. | [006](apis/user/006users.update-me.md) |
| `POST /api/users/me/onboarding/info` | user token | Account setup step 1 — saves name, gender, age range and country. | [007](apis/user/007users.onboarding-info.md) |
| `POST /api/users/me/onboarding/permissions` | user token | Account setup step 2 — records whether the user allowed push notifications. | [008](apis/user/008users.onboarding-permissions.md) |
| `POST /api/users/me/onboarding/interests` | user token | Account setup step 3 — saves the interest tags the user picked. | [009](apis/user/009users.onboarding-interests.md) |
| `POST /api/users/me/onboarding/goal` | user token | Account setup step 4 — saves the primary goal and marks onboarding complete. | [010](apis/user/010users.onboarding-goal.md) |
| `POST /api/users/me/device` | user token | Registers or refreshes this device — IP/ASN/fingerprint fraud signals plus push-token targeting. | [028](apis/user/028users.register-device.md) |
| `PATCH /api/users/me/notification-preferences` | user token | Turns push categories on or off and sets the quiet-hours opt-in. | [032](apis/user/032users.notification-preferences.md) |

## Wallet — 6 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/wallet` | user token | Returns the coin and gem balances of the signed-in user, with their USD/coin value and the live rates. | [011](apis/user/011wallet.balance.md) |
| `GET /api/wallet/transactions` | user token | Lists the wallet ledger of the signed-in user, newest first. | [012](apis/user/012wallet.transactions.md) |
| `GET /api/wallet/rates` | user token | Coin, gem, convert and withdrawal rate definitions, with an optional exact conversion preview. | [030](apis/user/030wallet.rates.md) |
| `POST /api/wallet/convert` | user token | Converts coins into gems, or gems back into coins, at the admin-set rate. | [013](apis/user/013wallet.convert.md) |
| `POST /api/wallet/withdrawals` | user token | Asks for a cash payout. The coins leave the wallet straight away and an admin reviews the request. | [001](apis/inprogress/001wallet.withdrawals.create.md) |
| `GET /api/wallet/withdrawals` | user token | Lists the withdrawal requests of the signed-in user, newest first. | [002](apis/inprogress/002wallet.withdrawals.list.md) |

## Offerwall — 7 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/offers` | user token | Lists the live offers available to the signed-in user, highest reward first. | [003](apis/inprogress/003offers.list.md) |
| `GET /api/offers/categories` | user token | Lists the categories that currently have live offers. | [004](apis/inprogress/004offers.categories.md) |
| `GET /api/offers/:id` | user token | Returns one offer by id. | [005](apis/inprogress/005offers.get.md) |
| `POST /api/offers/:id/click` | user token | Records that the user started an offer and returns the provider tracking URL to open. | [006](apis/inprogress/006offers.click.md) |
| `GET /api/offers/mine` | user token | Lists the offers the signed-in user started, newest click first, with the reward status of each. | [007](apis/inprogress/007offers.mine.md) |

## Daily — 4 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/daily/streak` | user token | The whole Rewards screen — the 30-day board, every payout, and whether today is unclaimed. **The app calls this on open.** | [034](apis/user/034daily.streak.board.md) |
| `POST /api/daily/streak/claim` | user token | Claims today's tile and credits it. **This is the daily check-in.** | [035](apis/user/035daily.streak.claim.md) |
| `GET /api/daily/challenges` | user token | The whole Daily Challenge screen — the five tiles with progress, the master chest, the day strip, and what can be played now. Pass `?date=` for a read-only past day. | [037](apis/user/037daily.challenges.board.md) |
| `POST /api/daily/challenges/chest` | user token | Claims the Daily Master Chest. Once a day, only when every tile is finished. | [038](apis/user/038daily.challenges.chest.md) |

`POST /api/daily/challenges/:id/claim` was removed: each tile now pays itself on completion, and the only thing left to claim is the master chest.

`GET`/`POST /api/daily/checkin` were removed: they were a second daily reward path over the same action. The streak board absorbed them, so claiming a streak day *is* checking in — it writes the check-in row and advances challenges, achievements and referral rules.

## Games — 9 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/games/spin` | user token | Returns the wheel face and how many spins the signed-in user has left today. | [039](apis/user/039games.spin.wheel.md) |
| `POST /api/games/spin` | user token | Spins the wheel once and credits whatever the winning segment pays. | [040](apis/user/040games.spin.play.md) |
| `GET /api/games/spin/history` | user token | Lists the past spins of the signed-in user, newest first. | [008](apis/inprogress/008games.spin.history.md) |
| `GET /api/games/scratch` | user token | Returns how many scratch cards the signed-in user has left today. | [043](apis/user/043games.scratch.status.md) |
| `POST /api/games/scratch` | user token | Scratches one card and credits the prize. | [044](apis/user/044games.scratch.play.md) |
| `GET /api/games/scratch/history` | user token | Lists the past scratch cards of the signed-in user, newest first. | [009](apis/inprogress/009games.scratch.history.md) |
| `GET /api/games/quiz` | user token | Returns today's quiz question, plus this user's attempt when they already answered. | [041](apis/user/041games.quiz.today.md) |
| `POST /api/games/quiz/:id/answer` | user token | Answers a quiz question and credits the reward when the answer is right. | [042](apis/user/042games.quiz.answer.md) |
| `GET /api/games/quiz/history` | user token | Lists the past quiz attempts of the signed-in user, newest first. | [010](apis/inprogress/010games.quiz.history.md) |

## Rewards — 6 endpoints

Buy entries, spin, and see who won. Replaces the retired `lucky-draw` module.

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/rewards` | user token | The Rewards screen: every card, its price, its countdown, and the user's entries. | [045](apis/user/045rewards.list.md) |
| `GET /api/rewards/:slug` | user token | One reward: the live pot, the countdown, my entries, the prize ladder and the latest winners. **The only call the detail screen needs.** | [046](apis/user/046rewards.detail.md) |
| `POST /api/rewards/:slug/entries` | user token | Buys entries into a draw with gems. Entries stack; more entries is more chance. | [047](apis/user/047rewards.buy-entries.md) |
| `POST /api/rewards/:slug/play` | user token | Pays for one instant play and resolves it. The paid Wheel of Fortune, unlimited. | [048](apis/user/048rewards.play.md) |
| `GET /api/rewards/winners` | user token | Winners across every reward, filterable to any date. Identities masked server-side. | [049](apis/user/049rewards.winners.md) |
| `GET /api/rewards/:slug/winners` | user token | The same list scoped to one reward. | [049](apis/user/049rewards.winners.md) |

## Achievements — 1 endpoint

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/achievements` | user token | The whole Achievements screen: lifetime coins and gems, the medal board with progress, and the current and rarest medals. **The only achievements endpoint.** | [036](apis/user/036achievements.list.md) |

## Referrals — 1 endpoint

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/referrals/invite` | user token | The whole Invite a Friend screen: link, reward ladder, per-friend ceiling, live stats and invited friends. **The only referral endpoint.** | [029](apis/user/029referrals.invite.md) |

## Leaderboard — 2 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/leaderboard` | user token | Returns the top coin earners for today, this week, or all time. | [014](apis/user/014leaderboard.top.md) |
| `GET /api/leaderboard/me` | user token | Returns where the signed-in user sits in the chosen window, even when they are outside the top list. | [015](apis/user/015leaderboard.me.md) |

## Redeem — 7 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/redeem/products` | user token | Lists the gift cards that can be ordered, featured first and then cheapest first. | [011](apis/inprogress/011redeem.products.list.md) |
| `GET /api/redeem/categories` | user token | Lists the categories that active gift cards are filed under, for the filter chips on the redeem screen. | [012](apis/inprogress/012redeem.categories.md) |
| `GET /api/redeem/products/:id` | user token | Returns one gift card product by id. | [013](apis/inprogress/013redeem.products.get.md) |
| `POST /api/redeem/products/:id/order` | user token | Buys a gift card with coins. Coins are charged first, then the vendor is asked for the code. | [014](apis/inprogress/014redeem.products.order.md) |
| `GET /api/redeem/orders` | user token | Lists the gift card orders of the signed-in user, newest first. | [015](apis/inprogress/015redeem.orders.list.md) |
| `GET /api/redeem/orders/:id` | user token | Returns one of the signed-in user’s gift card orders. | [016](apis/inprogress/016redeem.orders.get.md) |
| `GET /api/redeem/orders/:id/code` | user token | Reveals the gift card code of a fulfilled order. | [017](apis/inprogress/017redeem.orders.code.md) |

## KYC — 1 endpoint

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `POST /api/kyc/verify` | user token | **The only KYC call.** Uploads the selfie and returns the decision, the new status, the reason and whether a retry is allowed. | [016](apis/user/016kyc.selfie.md) |

## Notifications — 3 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/notifications` | user token | My notifications, newest first, with my unread count folded in. | [018](apis/inprogress/018notifications.list.md) |
| `PATCH /api/notifications/:id/read` | user token | Marks one notification as read. | [019](apis/inprogress/019notifications.mark-read.md) |
| `POST /api/notifications/push-events` | user token | Reports that a push arrived, was opened, or had a button tapped. Drives the open and tap-through rates. | [031](apis/user/031notifications.push-event.md) |

## Support — 4 endpoints

FAQs, plus the one endpoint behind **Report a Problem, Feedback and Email Support**. There is no separate feedback API: send `type: "feedback"` with a `rating` to `POST /api/support/tickets`.

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/support/faqs` | public | Every FAQ plus the category chips, optionally filtered to one category. Search is done on the client. **The only FAQ endpoint.** | [017](apis/user/017support.faqs.list.md) |
| `POST /api/support/tickets` | user token | **Report a Problem, Feedback (star rating) and Email Support all post here**, split by `type`. Feedback sends `type: "feedback"` with a `rating`. | [018](apis/user/018support.tickets.create.md) |
| `GET /api/support/tickets` | user token | Lists the tickets of the signed-in user, newest first. | [019](apis/user/019support.tickets.list.md) |
| `GET /api/support/tickets/:id` | user token | Returns one of the signed-in user’s tickets. | [020](apis/inprogress/020support.tickets.get.md) |

## Storage — 1 endpoint

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `POST /api/storage/avatar` | user token | Uploads an avatar image and returns its public URL. | [020](apis/user/020storage.avatar.md) |

## Health — 2 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/health` | public | Liveness probe. Answers as long as the process is running. | [021](apis/inprogress/021health.check.md) |
| `GET /api/health/ready` | public | Readiness probe. Runs a trivial query to confirm the database answers. | [022](apis/inprogress/022health.ready.md) |

## Dropdown — 1 endpoint

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/dropdown` | public | Returns the master option lists (gender, interest, and more) grouped by type. | [021](apis/user/021dropdown.list.md) |

## Offerwall Partners — 1 endpoint

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/offerwall` | user token | Lists every active offerwall, ranked, each with the caller's user id appended into its click URL. | [022](apis/user/022offerwall.list.md) |

The partner reward callback (`GET`/`POST /api/offerwall/postback/:slug/:token`) is public and unauthenticated, but it's documented in the Admin API section below — [011](apis/admin/011offerwall.postback-get.md)/[012](apis/admin/012offerwall.postback-post.md) — since it only matters to the admin managing offerwall partners, not to the app.

A per-user offerwall summary is deliberately **not** a separate endpoint — credited/reversed offerwall activity shows up in [`GET /api/wallet/transactions`](apis/user/012wallet.transactions.md) instead, as `source_type: "offerwall"` rows.

# Admin API — `apis/admin/` (83 endpoints)

Panel-only, with two exceptions. Every route needs a **Rewardtym admin token**
whose `product_access` claim is `both` or `coinzu`; the app never calls these —
except [011](apis/admin/011offerwall.postback-get.md)/[012](apis/admin/012offerwall.postback-post.md),
which are public callback URLs an offerwall partner's server calls directly and
are grouped here only because the URL itself is admin-managed. See
[Which admins reach Coinzu](CONVENTIONS.md#which-admins-reach-coinzu).

The panel was restarted clean — every earlier admin feature was removed and the
tabs are being built back one at a time. Numbers run `001`–`061` in filename
order and are **positional**, not permanent ids: adding or removing a doc
renumbers the folder, so identify an endpoint by its method and path.

## Dropdown — 4 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/dropdown/options` | admin token | Lists dropdown options, inactive included, paginated and filterable by category. | [001](apis/admin/001dropdown.list.md) |
| `POST /api/admin/dropdown/options` | admin token | Creates a dropdown option under a type, existing or new. | [002](apis/admin/002dropdown.create.md) |
| `PATCH /api/admin/dropdown/options/:id` | admin token | Updates a dropdown option, including deactivating it. | [003](apis/admin/003dropdown.update.md) |
| `POST /api/admin/dropdown/options/icon` | admin token | Uploads a dropdown option icon and returns its public URL. | [004](apis/admin/004dropdown.upload-icon.md) |

## Offerwall Partners — 8 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/offerwall/partners` | admin token | Lists every offerwall partner, inactive included. Paginated. | [005](apis/admin/005offerwall.partners.list.md) |
| `POST /api/admin/offerwall/partners` | admin token | Onboards a new offerwall partner. | [006](apis/admin/006offerwall.partners.create.md) |
| `PATCH /api/admin/offerwall/partners/:id` | admin token | Updates rank, badge, URL template, rev share, postback config, logo, or `is_active`. | [007](apis/admin/007offerwall.partners.update.md) |
| `GET /api/admin/offerwall/partners/:id/postback-url` | admin token | Returns the full postback URL, secret, and method to hand the partner. | [008](apis/admin/008offerwall.partners.postback-url.md) |
| `GET /api/admin/offerwall/postbacks` | admin token | Postback audit log, newest first, filterable by partner and status. | [009](apis/admin/009offerwall.postbacks.list.md) |
| `POST /api/admin/offerwall/partners/logo` | admin token | Uploads a partner logo image and returns its public URL. | [010](apis/admin/010offerwall.partners.upload-logo.md) |
| `GET /api/offerwall/postback/:slug/:token` | **public** | Partner reward callback (GET). Credits or reverses coins and logs the hit. | [011](apis/admin/011offerwall.postback-get.md) |
| `POST /api/offerwall/postback/:slug/:token` | **public** | Partner reward callback (POST). Identical to the GET version. | [012](apis/admin/012offerwall.postback-post.md) |

## Referrals — 2 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/referrals` | admin token | Every user with their referral code, invite counts, and coins earned. Paginated table for the Refer & Earn tab. | [013](apis/admin/013referrals.list.md) |
| `GET /api/admin/referrals/:cz_user_id` | admin token | One user's referral summary and the paginated list of everyone they invited — the row's detail page. | [014](apis/admin/014referrals.detail.md) |

## Users — 2 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/users` | admin token | Every user with their wallet balance, paginated and searchable by email/name/phone. The Users tab table. | [015](apis/admin/015users.list.md) |
| `GET /api/admin/users/:cz_user_id` | admin token | One user's full profile — wallet, KYC, referral stats, recent activity — the shared detail page both the Users tab and the Referrals tab navigate to. | [016](apis/admin/016users.detail.md) |

## Dropdown categories — 3 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/dropdown/types` | admin token | Every dropdown category with its option counts, paginated and searchable. | [017](apis/admin/017dropdown.types.list.md) |
| `POST /api/admin/dropdown/types` | admin token | Onboards a new dropdown category. | [018](apis/admin/018dropdown.types.create.md) |
| `PATCH /api/admin/dropdown/types/:id` | admin token | Updates a dropdown category's label, description, order, or active state. | [019](apis/admin/019dropdown.types.update.md) |

## Transactions — 2 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/transactions` | admin token | Every wallet movement across all users, filterable by user, currency, type, source and date. The Transactions tab table. | [020](apis/admin/020transactions.list.md) |
| `GET /api/admin/transactions/:cz_wallet_transaction_id` | admin token | One wallet movement with its user, their live balance, and the row that caused it. | [021](apis/admin/021transactions.detail.md) |

## Configuration Settings — 6 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/settings` | admin token | Every tunable platform setting, grouped, with its value, default and bounds. The Configuration Settings tab. | [022](apis/admin/022settings.list.md) |
| `PATCH /api/admin/settings` | admin token | Saves one or more settings; validated all-or-nothing, then the cache is cleared. | [023](apis/admin/023settings.update.md) |
| `GET /api/admin/referral-rules` | admin token | The referral reward ladder plus every trigger available to add. | [024](apis/admin/024referral-rules.list.md) |
| `POST /api/admin/referral-rules` | admin token | Adds one step to the referral reward ladder. | [025](apis/admin/025referral-rules.create.md) |
| `PATCH /api/admin/referral-rules/:id` | admin token | Changes a step's reward, threshold, label or active state. | [026](apis/admin/026referral-rules.update.md) |
| `DELETE /api/admin/referral-rules/:id` | admin token | Removes a step from the referral reward ladder. | [027](apis/admin/027referral-rules.delete.md) |

## FAQs — 5 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/faqs/categories` | admin token | FAQ categories, inactive included, for the filter and the FAQ form. | [028](apis/admin/028faqs.categories.md) |
| `GET /api/admin/faqs` | admin token | Every FAQ with its category, inactive included, filterable by category. | [029](apis/admin/029faqs.list.md) |
| `POST /api/admin/faqs` | admin token | Adds a question and answer to a category. | [030](apis/admin/030faqs.create.md) |
| `PATCH /api/admin/faqs/:id` | admin token | Edits a FAQ, moves it, reorders it, or hides it. | [031](apis/admin/031faqs.update.md) |
| `DELETE /api/admin/faqs/:id` | admin token | Deletes a FAQ permanently. | [032](apis/admin/032faqs.delete.md) |

## Problem Reports & Feedback — 2 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/tickets` | admin token | Every problem report, support ticket and piece of feedback with its user, filterable, plus a star summary. Backs both the Problem Reports and Feedback tabs. | [033](apis/admin/033tickets.list.md) |
| `GET /api/admin/tickets/:cz_support_ticket_id` | admin token | One report with its user and the full message thread. | [034](apis/admin/034tickets.detail.md) |

## Leaderboard — 1 endpoint

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/leaderboard` | admin token | Coin earners ranked, paginated and filterable by range, country and minimum. The Leaderboard tab. | [035](apis/admin/035leaderboard.list.md) |

## Identity (KYC) — 3 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/kyc` | admin token | Every verification attempt with its user, filterable, plus a count per outcome. The KYC tab. | [036](apis/admin/036kyc.list.md) |
| `GET /api/admin/kyc/:cz_kyc_verification_id` | admin token | One attempt with the user and their full attempt history. | [037](apis/admin/037kyc.detail.md) |
| `POST /api/admin/kyc/:cz_kyc_verification_id/decision` | **super admin** | Approves or rejects an attempt awaiting review, moving the account with it. | [038](apis/admin/038kyc.decide.md) |

## Push Notifications — 8 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/push` | admin token | Every push campaign, newest first, filterable, plus lifetime delivery and engagement totals. The Push Notifications tab. | [039](apis/admin/039push.list.md) |
| `POST /api/admin/push/preview` | admin token | Who an audience reaches and who drops out, without sending. Powers the live reach counter. | [040](apis/admin/040push.preview.md) |
| `POST /api/admin/push` | admin token | Creates a campaign and sends it now, schedules it, or saves a draft. | [041](apis/admin/041push.create.md) |
| `POST /api/admin/push/:cz_push_campaign_id/send` | admin token | Runs a draft, or resends against a freshly resolved audience. | [042](apis/admin/042push.send.md) |
| `POST /api/admin/push/:cz_push_campaign_id/cancel` | admin token | Stops a draft or a scheduled campaign before it runs. | [043](apis/admin/043push.cancel.md) |
| `POST /api/admin/push/:cz_push_campaign_id/duplicate` | admin token | Copies a campaign into a fresh draft. | [044](apis/admin/044push.duplicate.md) |
| `POST /api/admin/push/test` | admin token | A real send to a few named accounts, recorded nowhere. | [045](apis/admin/045push.test.md) |
| `GET /api/admin/push/:cz_push_campaign_id` | admin token | One campaign with its results and what its audience reaches today. | [046](apis/admin/046push.detail.md) |

## Push Templates — 4 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/push-templates` | admin token | Saved push messages, most used first. Feeds the composer's template picker. | [047](apis/admin/047push-templates.list.md) |
| `POST /api/admin/push-templates` | admin token | Saves a reusable push message. | [048](apis/admin/048push-templates.create.md) |
| `PATCH /api/admin/push-templates/:cz_push_template_id` | admin token | Edits a template, or hides it from the composer. | [049](apis/admin/049push-templates.update.md) |
| `DELETE /api/admin/push-templates/:cz_push_template_id` | admin token | Deletes a template permanently. | [050](apis/admin/050push-templates.delete.md) |

## Daily Streak — 3 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/streak` | admin token | The 30-day ladder, its payout totals against the targets, and where users sit on the board. The Daily Streak tab. | [051](apis/admin/051streak.ladder.md) |
| `PUT /api/admin/streak` | admin token | Replaces the whole 30-day ladder in one transaction. | [052](apis/admin/052streak.save.md) |
| `POST /api/admin/streak/reset` | admin token | Restores the shipped 5,000-coin / 2,000-gem ladder. | [053](apis/admin/053streak.reset.md) |

## Dashboard — 1 endpoint

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/dashboard/streak` | admin token | Daily-streak participation, depth and payout, for the Dashboard tab's streak card. | [054](apis/admin/054dashboard.streak.md) |

## Scheduled Jobs — 5 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/cron` | admin token | Every background job, its schedule, and how the last run went. The Scheduled Jobs tab. | [055](apis/admin/055cron.list.md) |
| `POST /api/admin/cron/:key/run` | admin token | Runs one job immediately, on demand. | [056](apis/admin/056cron.run.md) |
| `PATCH /api/admin/cron/:key/enabled` | admin token | Pauses or resumes one job. | [057](apis/admin/057cron.enabled.md) |
| `PUT /api/admin/cron/:key/schedule` | admin token | Overrides when one job fires. | [058](apis/admin/058cron.schedule.md) |
| `POST /api/admin/cron/:key/reset` | admin token | Restores the shipped schedule. | [059](apis/admin/059cron.reset.md) |

## Achievements — 2 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/achievements` | admin token | Every medal with how many users hold it and who is close. The Achievements tab. | [060](apis/admin/060achievements.list.md) |
| `GET /api/admin/achievements/:slug/users` | admin token | The users holding one medal, or still working towards it. Filterable. | [061](apis/admin/061achievements.holders.md) |

## Daily Challenges — 13 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/daily/dashboard` | admin token | How much the daily games paid out over a range, and exactly where it went. Filterable by source, currency and bucket size. | [062](apis/admin/062daily.dashboard.md) |
| `GET /api/admin/daily/challenges` | admin token | The five tiles, the master chest, and how the last week went. | [063](apis/admin/063daily.challenges.md) |
| `PATCH /api/admin/daily/config` | admin token | Sets the master chest reward and the free scratch allowance. **The only way to change them** — they are not in the settings catalogue. | [064](apis/admin/064daily.config.md) |
| `PATCH /api/admin/daily/challenges/:id` | admin token | Edits one tile — wording, target, rewards, and where a tap sends the app. | [065](apis/admin/065daily.challenges.update.md) |
| `GET /api/admin/daily/spin-wheel` | admin token | The wheel's segments with real odds and the average payout per spin. | [066](apis/admin/066daily.wheel.md) |
| `PUT /api/admin/daily/spin-wheel` | admin token | Replaces the whole wheel. A segment can pay a fixed amount or a random one inside a band. | [067](apis/admin/067daily.wheel.save.md) |
| `GET /api/admin/daily/scratch-cards` | admin token | The scratch prize pool with real odds, medal gating and payout bands. | [068](apis/admin/068daily.scratch.md) |
| `PUT /api/admin/daily/scratch-cards` | admin token | Replaces the whole prize pool. At least one active prize must stay ungated. | [069](apis/admin/069daily.scratch.save.md) |
| `GET /api/admin/daily/quizzes` | admin token | The quiz schedule, paged and filterable, plus which of the next 15 days have no quiz. | [070](apis/admin/070daily.quizzes.md) |
| `POST /api/admin/daily/quizzes` | admin token | Schedules a quiz for a date. Upsert — re-posting a date replaces it. | [071](apis/admin/071daily.quizzes.save.md) |
| `POST /api/admin/daily/quizzes/:id/repeat` | admin token | Copies a quiz onto another day. | [072](apis/admin/072daily.quizzes.repeat.md) |
| `POST /api/admin/daily/quizzes/image` | admin token | Uploads a quiz image and returns its public URL. | [073](apis/admin/073daily.quizzes.image.md) |
| `DELETE /api/admin/daily/quizzes/:id` | admin token | Removes a scheduled quiz. | [074](apis/admin/074daily.quizzes.delete.md) |

## Rewards — 9 endpoints

| Endpoint | Access | What it does | Doc |
|---|---|---|---|
| `GET /api/admin/rewards/dashboard` | admin token | Gems collected against coins paid, by reward and by day. | [075](apis/admin/075rewards.dashboard.md) |
| `GET /api/admin/rewards/games` | admin token | Every reward card with its configuration and live figures. | [076](apis/admin/076rewards.games.md) |
| `PATCH /api/admin/rewards/games/:id` | admin token | Edits one card — wording, price, entry bounds, status. | [077](apis/admin/077rewards.games.update.md) |
| `GET /api/admin/rewards/games/:id/prizes` | admin token | The prize ladder, or the wheel face with its real odds. | [078](apis/admin/078rewards.prizes.md) |
| `PUT /api/admin/rewards/games/:id/prizes` | admin token | Replaces the whole prize ladder. | [079](apis/admin/079rewards.prizes.save.md) |
| `GET /api/admin/rewards/games/:id/payout-rules` | admin token | How the pot scales with turnout — "x participants pays y". | [080](apis/admin/080rewards.rules.md) |
| `PUT /api/admin/rewards/games/:id/payout-rules` | admin token | Replaces the turnout-to-pot ladder. | [081](apis/admin/081rewards.rules.save.md) |
| `GET /api/admin/rewards/draws` | admin token | Every draw instance with its turnout, pot and winners. | [082](apis/admin/082rewards.draws.md) |
| `POST /api/admin/rewards/draws/run` | admin token | Settles what is due and opens what is missing. **Pays real money.** | [083](apis/admin/083rewards.draws.run.md) |
