# coinzu-backend

Coinzu backend API — NestJS 11 + TypeORM + Postgres (Neon).

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL + JWT secrets
npm run db:migrate:run
npm run start:dev
```

Server: `http://localhost:4000/api` · Swagger (non-prod): `/api/docs`

## Layout

```
src/
  main.ts                  bootstrap: CORS, validation, Swagger, global prefix
  app.module.ts            root module; registers global filter/interceptor/guards
  common/
    config/env.ts          typed env access (DATABASE_URL wins over DB_* vars)
    errors/                error catalog + CzException
    filters/               normalizes every error to CzApiErrorResponse
    interceptors/          wraps success responses as { success, data }
    guards/                JwtAuthGuard (global) + RolesGuard
    decorators/            @Public, @Roles, @CurrentUser
    auth/                  RequestUser types
  database/
    entities/              TypeORM entities
    migrations/            generated migrations (schema source of truth)
  modules/
    health/       liveness + readiness probes
    auth/         register, login, Google sign-in, OTP, refresh
    users/        profile + onboarding + admin user management
    wallet/       coin & gem ledger, conversion, withdrawals
    offers/       offerwall providers, offers, clicks, postbacks
    daily/        challenges, check-ins, streaks
    games/        spin, quiz, scratch
    lucky-draw/   draws, entries, winners
    redeem/       gift card catalog and orders
    referrals/    invite codes and milestones
    achievements/ badges and progress
    leaderboard/  ranks summed from the wallet ledger
    kyc/          selfie verification via Rekognition
    support/      tickets and FAQs
    notifications/ in-app notification inbox and delivery
    storage/      avatar upload endpoint
    settings/     app settings read at runtime
    admin/        every /api/admin/* route, for all modules
    cron/         scheduled jobs and their run history
  external/                one file per outbound service; nothing else calls out
    r2-storage.external.ts     Cloudflare R2 uploads (rewardtym bucket)
    redis.external.ts          Redis cache (rewardtym instance)
    sendgrid-mail.external.ts  transactional email (rewardtym SendGrid account)
    rekognition-face.external.ts  KYC face check
    google-auth.external.ts    Google ID token verification
    gift-card.external.ts      gift card vendor
    offerwall.external.ts      offerwall provider fetch + click URLs
```

`src/external/` is the only place an HTTP call leaves the process. Each file
owns its own request building, response parsing and payload shaping — there are
no shared formatting utils, so one vendor changing its JSON touches one file.

## Conventions

- Every route requires a Bearer token unless marked `@Public()`.
- Admin routes use `@Roles('admin')`. There is **no Coinzu admin table** — an admin is a Rewardtym account, identified by the `type: "admin"` claim on their Rewardtym token. Rewardtym decides per account which products it may open and stamps it on the token as `product_access` (`both`, `rewardtym` or `coinzu`); Coinzu lets `both` and `coinzu` through. Older tokens without the claim fall back to `role` being listed in `ADMIN_ROLES`. Tokens are verified with the shared `JWT_AUTH_TOKEN`, never looked up in the database.
- The process runs in **UTC** (`TZ=UTC`, Postgres session `-c timezone=UTC`). Every timestamp in and out is UTC.
- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "cz_error_code", "cz_error_message", "cz_error_description", "statusCode", "timestamp" }`
- Add new error codes to `src/common/errors/error.constants.ts` and throw `CzException`.
- Schema changes go through migrations (`synchronize` is off).

## Adding a module

```bash
npx nest g module modules/wallet && npx nest g controller modules/wallet && npx nest g service modules/wallet
```

Then register it in `app.module.ts`.

## Docs

- `docs/README.md` — index of every endpoint, grouped by module. Start here.
- `docs/apis/` — the **app** API, 76 endpoints, one markdown file each, numbered `001`–`076` in reading order. This is what the app integrates against.
- `docs/apis/admin/` — the **admin** API, 47 endpoints, numbered `001`–`047` in their own sequence. Panel only.
- `docs/CURLS.md` — every endpoint as a copy-paste `curl`; part 1 app, part 2 admin.
- `docs/ENUMS.md` — every fixed-value field and all of its values.
- `docs/API_DOC_TEMPLATE.md` — the shape the endpoint files follow.
- `docs/ERROR_CODES.md` — all 90 `cz_error_code` values, their status and their message.
- `docs/CONVENTIONS.md` — response shape, auth, time zone and naming rules.
