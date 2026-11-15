# Sprint 1 Plan — Core Expense Splitting, Households & Settlement

- **Sprint Window**: 2026-11-07 (Sat) – 2026-11-10 (Tue)
- **GitHub Milestone**: `Sprint 1`
- **Team Members**: **Theodore Pei** & **Marcus Ramos**
- **Workflow Division**:
  - **Implementation Owner**: **Theodore Pei** (develops Issues `#1`–`#8` following strict Red → Green TDD)
  - **PR Review & Verification Owner**: **Marcus Ramos** (reviews, verifies acceptance criteria, and approves all Sprint 1 PRs before merge)

---

## 1. Sprint 1 Goal

Deliver a working, deployed full-stack roommate expense tracker where users can sign in, create or join a household via invite code, record itemized/equal/ratio expenses with tax allocation, view net balances and a greedy settlement plan, mark transfers as paid, and browse the OpenAPI 3.1 specification in Swagger UI (`docs/PLAN.md` §3, F1–F3 & F7 skeleton).

---

## 2. Sprint 1 Backlog & Ownership

| Issue | Title | Implementation Owner | Reviewer | Branch | Status |
|---|---|---|---|---|---|
| `#1` | Deploy to production: Neon Postgres + Vercel | Theodore Pei | Marcus Ramos | `chore/1-production-deploy` | PR #22 open |
| `#2` | CI pipeline: lint, typecheck, unit, integration, security scans | Theodore Pei | Marcus Ramos | `chore/2-ci-pipeline` | PR #20 open (CI 9/9 green) |
| `#3` | Sign in with Google & non-production test login (Better Auth) | Theodore Pei | Marcus Ramos | `feature/3-sign-in` | PR #19 open |
| `#4` | Households and invite codes | Theodore Pei | Marcus Ramos | `feature/4-households` | PR #21 open |
| `#5` | Split rules: equal, ratio, itemized, tax allocation, rounding | Theodore Pei | Marcus Ramos | `feature/5-split-rules` | PR #17 open |
| `#6` | Record an itemized expense (tables, API, UI, E2E) | Theodore Pei | Marcus Ramos | `feature/6-itemized-expenses` | PR #24 open |
| `#7` | Balances, greedy settlement plan, record a transfer | Theodore Pei | Marcus Ramos | `feature/7-balances-settlement` & `feature/7-balances-page` | PR #18 & PR #25 open |
| `#8` | OpenAPI 3.1 document (`/api/openapi.json`) and Swagger UI (`/api/docs`) | Theodore Pei | Marcus Ramos | `chore/8-openapi-docs` | PR #26 open |

---

## 3. What Sprint 1 Delivers in Detail

1. **Production Infrastructure & Multi-Stage CI (`#1`, `#2`)**:
   - Production app hosted at `https://slashsplit.vercel.app` backed by Neon PostgreSQL 17, running `prisma migrate deploy` automatically on production builds.
   - GitHub Actions CI running `Lint and typecheck`, `Unit tests`, `Integration tests` (with Postgres 17 service container), `Build`, `npm audit`, `Secret scan (gitleaks)`, and `CodeQL`, plus Dependabot.
2. **Authentication (`#3`)**:
   - Better Auth 1.7.18 with Google OAuth + HS256 JWT session cookie cache, and email/password test accounts restricted to `NODE_ENV !== "production"`.
3. **Households & Access Control (`#4`)**:
   - Create households (`OWNER`), join via 8-character unambiguous invite codes (`MEMBER`), list members in join order, and enforce `403 Forbidden` for non-members across all `/api/v1/households/{id}/...` endpoints.
4. **Pure Split & Settlement Engine (`#5`, `#7` Part 1)**:
   - Integer-cent largest-remainder allocation (`allocateByWeight`), proportional tax allocation (`allocateTax`), `splitEqual`, `splitByRatio`, `splitItemized`, `computeBalances`, and greedy `planSettlement` (`≤ n − 1` transfers).
5. **Itemized Expense Recording (`#6`)**:
   - `Expense`, `ExpenseItem`, `ItemParticipant`, `ExpenseTax`, `ExpenseWeight`, and `ExpenseShare` tables + CRUD API (`/api/v1/households/{id}/expenses`) + interactive household expense form where all members are ticked by default and can be unticked ("slashed") per item or switched to one-click equal split.
6. **Balances & Settlements UI/API (`#7` Part 2)**:
   - `Settlement` table + `/balances`, `/settlement-plan`, and `/settlements` endpoints + live household Balances & Settlement Plan panel with one-click `Mark paid`.
7. **OpenAPI 3.1 & Swagger UI (`#8`)**:
   - `/api/openapi.json` generated directly from the zod request/response schemas and rendered at `/api/docs`, guarded by a unit test that fails if any `/api/v1` route file on disk is undocumented.

---

## 4. Merge & Review Sequence for Sprint 1

To preserve the Red → Green TDD commit history in `main`, **Marcus Ramos** reviews and approves each PR and merges using **Create a merge commit** (`--merge`, never squash) in dependency order:

1. `PR #20` (`#2` CI pipeline)
2. `PR #22` (`#1` Production deploy)
3. `PR #17` (`#5` Split rules)
4. `PR #18` (`#7` Settlement math)
5. `PR #19` (`#3` Sign-in)
6. `PR #21` (`#4` Households)
7. `#6` (`feature/6-itemized-expenses`)
8. `#7` (`feature/7-balances-page`)
9. `#8` (`chore/8-openapi-docs`)
10. `PR #23` (`docs/sprint-1-records`)
