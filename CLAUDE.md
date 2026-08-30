# coinzu-backend — rules for Claude

NestJS 11 + TypeORM + Postgres (Neon). Backend only. Read this file fully before writing code.

## Non-negotiables

1. **Response format** — never hand-build an envelope. `ResponseTransformInterceptor` wraps every success as `{ success: true, data }`. Controllers return the payload only.
2. **Error format** — never build an error body. Throw a standard Nest exception carrying `cz_error_code` only; `HttpExceptionFilter` resolves message/description from `CzErrorMap`.
3. **Every new endpoint gets a doc** — one markdown file per API in `docs/apis/`, no exceptions. See `docs/API_DOC_TEMPLATE.md`.
4. **Do not create files that aren't needed.** Add to an existing file when the thing is small. New files only when a real boundary requires it.
5. **Comments: 1–2 lines max**, and only where the code cannot say it. Prefer none. No block comments, no comment banners.

## Throwing errors

```ts
throw new UnauthorizedException({ cz_error_code: CzAuthErrorCodes.INVALID_CREDENTIALS });
throw new NotFoundException({ cz_error_code: CzUserErrorCodes.USER_NOT_FOUND });
throw new ConflictException({ cz_error_code: CzUserErrorCodes.EMAIL_ALREADY_REGISTERED });
```

Rules:
- The service throws the code. It never writes the message.
- Add every new code to `src/common/errors/error.constants.ts`: the code in its module block, plus a `CzErrorMap` entry with `message` and `description`.
- `message` is **shown to the user** — friendly, plain, actionable, ends with a period. Never leak internals ("query failed", "null id", stack text).
- `description` is for the developer/logs — factual, precise.
- Pass `cz_error_description` in the thrown object only to add per-instance context. Never pass `cz_error_message`.
- Reuse an existing code before inventing one.

### Code format

`CZD` + module prefix + 3-digit sequence: `CZDAUTH001`, `CZDUSER002`, `CZDWLT001`. Sequences never get reused or renumbered — codes are a public contract.

| Module | Prefix | Const |
|---|---|---|
| Auth | `CZDAUTH` | `CzAuthErrorCodes` |
| User | `CZDUSER` | `CzUserErrorCodes` |
| Common | `CZDCOMM` | `CzCommonErrorCodes` |

New module → new prefix + new exported const block in the same file.

### Message tone

| Bad | Good |
|---|---|
| `User not found` | `We could not find that account.` |
| `Insufficient balance` | `You do not have enough coins for this withdrawal.` |
| `Invalid input` | `Please check the details you entered and try again.` |
| `Unauthorized` | `Please sign in to continue.` |

## Auth

Every route requires a Bearer token — guards are global. Open a route with `@Public()`. Restrict with `@Roles('admin')`. Read the caller with `@CurrentUser()`.

Two token shapes are accepted on the same routes, both verified with the shared `JWT_AUTH_TOKEN`:

- A **Coinzu user token** — carries `cz_user_id`. Reaches every non-admin route.
- A **Rewardtym admin token** — carries `type: "admin"`, and is let through when its `product_access` claim is `both` or `coinzu`. Tokens issued before that claim existed fall back to the old rule: the `role` claim must be listed in `ADMIN_ROLES`. Keep the fallback until those tokens have expired.

`product_access` is Rewardtym's answer to "which products may this admin open" — `both`, `rewardtym` or `coinzu`, with no read-only level. Coinzu only reads it off the token. Never call Rewardtym to ask, never cache it, never add a Coinzu-side override.

There is **no Coinzu admin table**. Never add one, never read an admin row, never write a Coinzu admin sign-in. Verification is stateless: the guard reads claims and stops. Every `/api/admin/*` route lives in `src/modules/admin/` — admin-only DTOs stay in their feature module so features never import from `admin`.

## Outbound calls

Every call that leaves the process lives in `src/external/`, one file per service, named `<service>.external.ts`. That file owns its client, its request building, its response parsing and its payload shaping. No shared formatting helper, no response-mapping util outside it — a vendor changing its JSON must touch exactly one file. Services depend on the external class, never on `HttpService` or `axios` directly.

Reuse rewardtym's infrastructure and credentials: same R2 bucket, same Redis, same JWT secret.

## Time zone

Everything is UTC. `env.ts` sets `process.env.TZ = 'UTC'` as its first statement and opens the Postgres session with `-c timezone=UTC`. Never build a date from a local-time assumption, and never format a date for a user in the backend.

## Queries

- Load related rows with a declared relation, not a second query in a loop. Read-only relations use `createForeignKeyConstraints: false` so no migration is needed.
- Select only the columns you use (`select: { ... }`) whenever you are not returning the whole row.
- Independent awaits go in one `Promise.all`. Sequential awaits are only for genuinely dependent steps.
- Prefer `update()` over load-then-save when you already know the id.

## Conventions

- Naming: `snake_case` for all API fields, DB columns, and entity properties. Ids are `cz_<entity>_id` (uuid). Table names carry no prefix — `users`, `wallets`, `offer_clicks`.
- Lists return `{ data, total }` inside the envelope. Query params: `page` (1-based), `limit`.
- DTOs: one file per DTO folder under the module, `class-validator` on every field, `@ApiProperty`/`@ApiPropertyOptional` for Swagger.
- `ValidationPipe` is global with `whitelist` + `forbidNonWhitelisted` — unknown fields are rejected, so DTOs must be complete.
- Schema changes go through migrations. `synchronize` is off. Never edit an applied migration.
- Secrets come from `Env` (`src/common/config/env.ts`). Never read `process.env` directly outside that file.
- Money/coins: integers only, never floats.

## Adding a module (the standard flow)

1. Entity in `src/database/entities/`, registered via `TypeOrmModule.forFeature`.
2. Error codes + map entries in `error.constants.ts`.
3. `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `dto/`.
4. Register the module in `app.module.ts`.
5. Generate + run the migration.
6. **Write one doc per endpoint in `docs/apis/`**, then add it to `docs/README.md` and `docs/CURLS.md`.
7. `npm run typecheck` must pass before you call it done.

Controllers stay thin: validate via DTO, delegate to the service, return the payload. Business rules live in services.

## Docs

- `docs/README.md` — the endpoint index. Add a row for every new route.
- `docs/API_DOC_TEMPLATE.md` — the exact template for each endpoint doc. Follow it literally.
- `docs/ERROR_CODES.md` — the full code registry. Update it whenever you add a code.
- `docs/CONVENTIONS.md` — request/response contract in detail.
- `docs/ENUMS.md` — every fixed-value field and all of its values. Update it whenever you add or change one.
- `docs/CURLS.md` — every endpoint as a curl. Add the new one in the same position as its doc.
- `docs/apis/user/NNN<module>.<action>.md` — one file per **live, tested** app endpoint.
- `docs/apis/inprogress/NNN<module>.<action>.md` — same shape, for an app endpoint that exists but has not been verified end to end. Move the file to `user/` once it has, keeping its number.
- Numbers are **positional within a folder**, not permanent ids. Each folder runs `001`..`N` with no gaps; adding, removing or promoting a doc renumbers the folder. Identify an endpoint by its method and path, never by its number.
- `docs/apis/admin/NNN<module>.<action>.md` — one file per **admin** endpoint, The filename does not repeat "admin" — the folder says it. `<module>` is the feature the route manages.
- `NNN` is a zero-padded position, counted **per folder**, starting at `001`. A new endpoint goes at the end of its folder; renumber the folder if you insert or remove one in the middle.
- Nothing sits loose in `docs/apis/` — every doc is in `user/`, `inprogress/` or `admin/`.

Every endpoint doc must spell out **all** allowed values for every fixed-value field in its `## Enum values` section — copy them from `docs/ENUMS.md`, never write "see the entity".
