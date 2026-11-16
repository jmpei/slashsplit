# Environments

SlashSplit runs in four environments. Every pull request gets a Vercel preview with its own Neon
database branch; merging to `main` deploys production.

| | Local | CI (GitHub Actions) | Preview (Vercel, one per PR) | Production (Vercel) |
|---|---|---|---|---|
| Database | Docker Postgres 17: `slashsplit` (dev), `slashsplit_test` (integration tests) | Postgres 17 service container, `slashsplit_test` | A Neon branch per preview deployment, created by the Vercel Neon integration in its own Neon project, so it never shares a host with production | Neon project `divine-haze-21350710`, branch `main` |
| Auth URL | `BETTER_AUTH_URL` from `.env` (`http://localhost:3000`); E2E uses port 3100 | Fixed test value from `tests/integration/setup.ts` / the workflow | `https://$VERCEL_URL` (the deployment's own URL) when `BETTER_AUTH_URL` is unset | `BETTER_AUTH_URL` from Vercel env (the production domain) |
| Test login | On | On | On (`VERCEL_ENV=preview`) | Off (`VERCEL_ENV=production`) |
| Where secrets live | `.env` (git-ignored, copied from `.env.example`) | GitHub Actions secrets; database URLs are inline non-secret values in `ci.yml` | Vercel project env vars, Preview scope; the Neon integration injects the database URLs | Vercel project env vars, Production scope |
| When migrations run | By hand: `npm run db:migrate` (dev), `npm run db:deploy` (test DB) | Every run, before integration tests (`npm run db:deploy`) | Every preview build (`npm run vercel-build`), only when `PRODUCTION_DB_HOST` is set and no database URL points at that host | Every production build (`npm run vercel-build`), before `next build` |
| Who deploys | Developer runs `npm run dev` | GitHub on every push and PR | Vercel Git integration on every push to a PR branch | Vercel Git integration on every merge to `main` |

## Migration guard

`scripts/vercel-build.mjs` decides whether a build runs `prisma migrate deploy`:

- `VERCEL_ENV=production`: always.
- `VERCEL_ENV=preview`: only when `PRODUCTION_DB_HOST` is set and none of `DIRECT_URL`,
  `DATABASE_URL_UNPOOLED`, `DATABASE_URL` points at it (Neon's `-pooler` host counts as the same
  endpoint). An unset `PRODUCTION_DB_HOST` or a missing database URL skips migrations, so a
  misconfigured preview can never migrate the production database.
- Anything else: never.

`prisma.config.ts` migrates through the first set of `DIRECT_URL`, `DATABASE_URL_UNPOOLED` (the
Neon integration's name for the direct URL), `DATABASE_URL`. The app always connects through the
pooled `DATABASE_URL`.

## Environment variables

Names only; values never go in the repo. All but the Vercel-only and CI-only rows are in `.env.example`.

| Variable | Local | CI | Preview | Production |
|---|---|---|---|---|
| `DATABASE_URL` | `.env` | `ci.yml` | Neon integration | Vercel env |
| `DIRECT_URL` | `.env` (empty) | not set | not set (uses `DATABASE_URL_UNPOOLED`) | Vercel env |
| `TEST_DATABASE_URL` | `.env` | `ci.yml` | not set | not set |
| `BETTER_AUTH_SECRET` | `.env` | `ci.yml` placeholder (build), `setup.ts` (tests) | Vercel env | Vercel env |
| `BETTER_AUTH_URL` | `.env` | `ci.yml` (build), `setup.ts` (tests) | not set (falls back to `https://$VERCEL_URL`) | Vercel env |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `.env` (optional) | not set | not set (test login only) | Vercel env |
| `GEMINI_API_KEY` | `.env` (optional) | not set | not set | Vercel env |
| `RECEIPT_EXTRACTOR` | `.env` (optional); Playwright sets `fixture:mismatch` | not set | Vercel env: `fixture:mismatch` | not set (ignored in production) |
| `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | `.env` (optional) | not set | Vercel env (optional) | Vercel env (optional) |
| `E2E_BASE_URL` | `.env` (empty for localhost) | GitHub Actions, when E2E targets a preview | not set | not set |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | `.env` | GitHub Actions secret | not set (Vercel holds the bypass) | not set |
| `VERCEL_TOKEN` (CI-only) | not set | GitHub Actions secret: Vercel access token that `e2e-preview.yml` uses to find the PR's preview deployment | not set | not set |
| `DATABASE_URL_UNPOOLED` (Vercel-only) | not set | not set | Neon integration | not set |
| `PRODUCTION_DB_HOST` (Vercel-only) | not set | not set | Vercel env: production Neon endpoint host (not a secret) | not set |
| `VERCEL_ENV`, `VERCEL_URL` (Vercel system) | not set | not set | Vercel | Vercel |

Without the Pusher variables, the household page polls for updates instead of subscribing.

The Neon integration also injects `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` and other
`POSTGRES_*` / `NEON_*` names into Preview; the app does not read them.
