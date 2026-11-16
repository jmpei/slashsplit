# Contributions

Every issue, the pull request that closed it, and the merge commit on `main`. Data from `gh issue list`, `gh pr list` and `git log main`.

| Issue | Title | PR | Merge commit | Author |
|---|---|---|---|---|
| #1 | Deploy to production: Neon Postgres + Vercel | #22 | `a3e6d37` | Theodore Pei |
| #2 | CI pipeline: lint, typecheck, unit, integration, security scans | #20 | `12372c3` | Theodore Pei |
| #3 | Sign in with Google (JWT session) | #19 | `af61424` | Theodore Pei |
| #4 | Households and invite codes | #21 | `acc2cd3` | Theodore Pei |
| #5 | Split rules: equal, ratio, itemized, tax, rounding | #17 | `91ddf69` | Theodore Pei |
| #6 | Record an itemized expense | #24 | `3814f43` | Theodore Pei |
| #7 | Balances, settlement plan, record a transfer | #18, #25 | `d2d528e`, `a9ca5f5` | Theodore Pei |
| #8 | OpenAPI document and Swagger UI | #26 | `18d0d43` | Theodore Pei |
| #9 | Scan a receipt into a draft with Gemini | #34, #36 | `eafcd62`, `8450287` | Theodore Pei |
| #10 | Review and confirm a receipt draft | #35 | `1c909d5` | Theodore Pei |
| #11 | Real-time balance updates with Pusher | #37 | `be2c982` | Theodore Pei |
| #12 | Monthly rent bill with Vercel Cron | none (closed as not planned) | none | — |
| #13 | Personal API tokens for the public API | #33 | `47fcaba` | Theodore Pei |
| #14 | E2E on preview deployments | #39, #42 | `313bccd`, `770f9ee` | Theodore Pei |
| #15 | Preview environments with Neon branches and automated migrations | #38 | `6ced011` | Theodore Pei |
| #16 | UI polish and mobile layout | #40 | `0086d7c` | Theodore Pei |
| none | Context7 rule and TDD rules update (docs only) | #32 | `7d6b878` | Theodore Pei |
| none | Final documentation package (docs only) | #41 | `c0e216f` | Theodore Pei |
| #3, #6, #9, #10, #11, #13, #14 | Hardening from evaluator findings, first refactor commit | #45 | `171cd53` | Theodore Pei |
| none | Sprint records and standups from Marcus Ramos (docs only) | #44 | `9bb3177` | Marcus Ramos |
| none | Final docs refresh (docs only) | #46 | this PR | Theodore Pei |

Theodore Pei's git author name is Jiaming Pei.

## Commit counts

`git shortlog -sn main` at `9bb3177`:

```
   126  Jiaming Pei
     3  Marcus Ramos
```

Of the 129 commits, 41 are merge commits. The other 88 by type: `test` 34, `docs` 16, `feat` 14, `fix` 12, `ci` 7, `chore` 4, `refactor` 1.

## Reviews and docs by Marcus Ramos

Git author: Marcus Ramos (`marcusramos2024`).

| PR | What | When |
|---|---|---|
| #17 | Post-merge review: `feature/5-split-rules` — Red `c844422` fails 26 assertions before Green `c99a676`; integer-cent largest-remainder, no floats; `splitEqual`/`splitByRatio`/`splitItemized` all tested. | 2026-11-15 |
| #18 | Post-merge review: `feature/7-balances-settlement` — Red `7ebd3eb` before Green `af52f0a`; `computeBalances` and `planSettlement` (greedy, ≤ n−1 transfers) covered; empty-household edge case tested; no money floats. | 2026-11-15 |
| #19 | Post-merge review: `feature/3-sign-in` — Better Auth session cookie + test login restricted to `NODE_ENV !== production`; 401 to unauthenticated callers in `authorizeMember`; Red → Green confirmed. | 2026-11-15 |
| #21 | Post-merge review: `feature/4-households` — 8-character unambiguous invite code generation, OWNER/MEMBER roles, 403 Forbidden for non-members on all `/api/v1/households/{id}/...` routes; integration tests cover auth path; TDD separation confirmed. | 2026-11-15 |
| #24 | Post-merge review: `feature/6-itemized-expenses` — `Expense`/`ExpenseItem`/`ItemParticipant`/`ExpenseTax`/`ExpenseWeight`/`ExpenseShare` tables; CRUD API with `authorizeMember` guard; 400 on duplicate participant or ratio weight; integer-cent money throughout; Red → Green confirmed. | 2026-11-15 |
| #25 | Post-merge review: `feature/7-balances-page` — `/balances`, `/settlement-plan`, `/settlements` endpoints; Settlement table; one-click Mark paid; E2E covers the full settlement flow; integer-cent throughout; Red → Green confirmed. | 2026-11-15 |
| #42 | Comment review (open PR): Dependabot PRs get no `VERCEL_TOKEN`, so preview E2E would fail on them — suggested guard. | 2026-11-15 |
| #44 | Merged docs PR with standup entries, an `AGENTS.md` rule and this review log; the standups and the rule were revised in #46 to match the GitHub record (reviews posted on 2026-11-15). | 2026-11-15 |
