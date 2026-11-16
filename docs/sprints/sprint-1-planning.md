# Sprint 1 planning

- **Date:** 2026-11-07
- **Sprint:** 2026-11-07 → 2026-11-10 (milestone "Sprint 1")
- **Attendees:** Theodore Pei

## Sprint goal

Roommates can sign in, create a household, record an expense, see who owes whom, and view the OpenAPI documentation (`docs/PLAN.md` §3, F1–F3 & F7 skeleton).

## Selected issues

| # | Issue | Owner |
|---|---|---|
| 1 | Deploy to production: Neon Postgres + Vercel | Theodore Pei |
| 2 | CI pipeline: lint, typecheck, unit, integration, security scans | Theodore Pei |
| 3 | Sign in with Google (JWT session) | Theodore Pei |
| 4 | Households and invite codes | Theodore Pei |
| 5 | Split rules: equal, ratio, itemized, tax, rounding | Theodore Pei |
| 6 | Record an itemized expense | Theodore Pei |
| 7 | Balances, settlement plan, record a transfer | Theodore Pei |
| 8 | OpenAPI document and Swagger UI | Theodore Pei |

## Decisions

- **Ownership:** Theodore Pei implements, verifies and merges every Sprint 1 issue (`#1`–`#8`) and every Sprint 2 issue (`docs/sprints/sprint2.md`).
- **Execution order:** pure split and settlement math first (`#5`, `#7` Part 1), then CI (`#2`), production deploy (`#1`), sign-in (`#3`), households (`#4`), itemized expenses (`#6`), balances UI/API (`#7` Part 2), and OpenAPI/Swagger (`#8`).
