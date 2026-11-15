# Sprint 1 planning

- **Date:** 2026-11-07
- **Sprint:** 2026-11-07 → 2026-11-10 (milestone "Sprint 1")
- **Attendees:** Theodore Pei, Marcus Ramos

## Sprint goal

Roommates can sign in, create a household, record an expense, see who owes whom, and view the OpenAPI documentation (`docs/PLAN.md` §3, F1–F3 & F7 skeleton).

## Selected issues

| # | Issue | Implementation owner | Reviewer |
|---|---|---|---|
| 1 | Deploy to production: Neon Postgres + Vercel | Theodore Pei | Marcus Ramos |
| 2 | CI pipeline: lint, typecheck, unit, integration, security scans | Theodore Pei | Marcus Ramos |
| 3 | Sign in with Google (JWT session) | Theodore Pei | Marcus Ramos |
| 4 | Households and invite codes | Theodore Pei | Marcus Ramos |
| 5 | Split rules: equal, ratio, itemized, tax, rounding | Theodore Pei | Marcus Ramos |
| 6 | Record an itemized expense | Theodore Pei | Marcus Ramos |
| 7 | Balances, settlement plan, record a transfer | Theodore Pei | Marcus Ramos |
| 8 | OpenAPI document and Swagger UI | Theodore Pei | Marcus Ramos |

## Decisions

- **Sprint 1 / Sprint 2 role pairing:** Theodore Pei implements the Sprint 1 issues (`#1`–`#8`) while Marcus Ramos conducts all Sprint 1 PR reviews and merge approvals; in Sprint 2 (`docs/sprints/sprint2.md`), Marcus Ramos implements the Sprint 2 features while Theodore Pei conducts the Sprint 2 PR reviews.
- **Execution order:** pure split and settlement math first (`#5`, `#7` Part 1), then CI (`#2`), production deploy (`#1`), sign-in (`#3`), households (`#4`), itemized expenses (`#6`), balances UI/API (`#7` Part 2), and OpenAPI/Swagger (`#8`).
