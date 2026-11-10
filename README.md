# SlashSplit

[![CI](https://github.com/jmpei/slashsplit/actions/workflows/ci.yml/badge.svg)](https://github.com/jmpei/slashsplit/actions/workflows/ci.yml)

Split shared bills with roommates, item by item. Snap a receipt, slash the items someone didn’t share,
and see who owes whom and the fewest transfers to settle up.

CS6983 Project 2 (pair project). Plan, user stories, split rules and sprints: [`docs/PLAN.md`](docs/PLAN.md).
Rules for AI agents and contributors: [`AGENTS.md`](AGENTS.md).

## Features

Planned for Sprint 1 and 2 (see `docs/PLAN.md` §3). This list grows as features merge.

- `GET /api/health` — liveness check for deploys and E2E.
- Sign in with Google; outside production, a test email/password login for E2E.
- Households: create one, invite roommates with an 8-character code, see members in join order.
- Expenses: record itemized bills (untick anyone who didn’t share an item), equal splits, or ratio splits, with proportional tax allocation and largest-remainder rounding.
- Balances and settlements: see every roommate’s net balance, get a greedy settlement plan in at most `n − 1` transfers, and mark transfers paid.
- OpenAPI 3.1 & Swagger UI: `/api/openapi.json` generated directly from the zod schemas and interactive reference at `/api/docs`.

## Tech stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Better Auth · zod ·
Gemini (receipt scanning) · Pusher (real-time) · Vitest · Playwright · GitHub Actions · Vercel · Neon

## Local setup

Requirements: Node 22+, Docker.

```bash
cp .env.example .env            # fill in secrets you have; DB URLs work as-is
npm install                     # also generates the Prisma client
npx playwright install chromium # first time only
npm run db:up                   # Postgres 17 on localhost:5432 (dev + test databases)
npm run db:migrate              # apply migrations
npm run dev                     # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:unit` | Vitest unit tests (no database) |
| `npm run test:integration` | Vitest against `TEST_DATABASE_URL` |
| `npm test` | Unit + integration |
| `npm run test:e2e` | Playwright on desktop + mobile; starts a dev server on port 3100, or tests `E2E_BASE_URL` |
| `npm run db:up` | Start local Postgres (Docker) |
| `npm run db:migrate` | Create / apply migrations locally |
| `npm run db:deploy` | Apply migrations in CI / production |

## Environment variables

All names are in [`.env.example`](.env.example).

| Variable | Used for |
|---|---|
| `DATABASE_URL` | App database |
| `TEST_DATABASE_URL` | Integration tests (separate database) |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login |
| `GEMINI_API_KEY` | Receipt scanning |
| `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | Real-time updates |
| `BLOB_READ_WRITE_TOKEN` | Receipt image storage |
| `CRON_SECRET` | Monthly rent job |
| `E2E_BASE_URL`, `VERCEL_AUTOMATION_BYPASS_SECRET` | E2E against a preview deployment |

## Project layout

```
src/app/            pages; src/app/api/v1/ public API
src/lib/split/      split rules (pure functions)
src/lib/receipt/    Gemini receipt parsing
src/server/         database services
prisma/             schema and migrations
tests/unit/         tests/integration/   tests/fixtures/
e2e/                Playwright specs
docs/               plan, sprints, architecture, API
```
