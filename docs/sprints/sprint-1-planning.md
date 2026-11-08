# Sprint 1 planning

- **Date:** 2026-11-07
- **Sprint:** 2026-11-07 → 2026-11-09 (milestone "Sprint 1")

## Sprint goal

Roommates can sign in, create a household, record an expense, and see who owes whom (PLAN §3, F1–F3).

## Selected issues

Estimates are story points (1, 2, 3, 5) from the plan (`docs/PLAN.md` §12).

| # | Issue | Points | Owner |
|---|---|---|---|
| 1 | Deploy to production: Neon Postgres + Vercel | 3 | Jiaming |
| 2 | CI pipeline: lint, typecheck, unit, integration, security scans | 3 | Jiaming |
| 3 | Sign in with Google (JWT session) | 3 | Jiaming |
| 4 | Households and invite codes | 3 | Jiaming |
| 5 | Split rules: equal, ratio, itemized, tax, rounding | 5 | Jiaming |
| 6 | Record an itemized expense | 5 | TBD |
| 7 | Balances, settlement plan, record a transfer | 3 | Jiaming |
| 8 | OpenAPI document and Swagger UI | 2 | TBD |
| | **Total** | **27** | |

## Decisions

- **#2 and #3 prioritized first alongside core logic.** Every PR needs CI before it can merge, and #4, #6 and #7 need sign-in, so these two unblock downstream work.
- **Order:** issues with no dependencies first (#5, then the settlement math in #7), then #3 because it blocks the rest, then #2, #4 and #1.
- **Known dependency:** the balances page and API in #7 need the expense tables from #6. #7 is split into the settlement math now and the page/API after #6.
