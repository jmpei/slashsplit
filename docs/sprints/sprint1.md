# Sprint 1 Plan — Core Expense Splitting, Households & Settlement

- **Sprint Window**: 2026-11-07 (Sat) – 2026-11-10 (Tue)
- **GitHub Milestone**: `Sprint 1`
- **Owner**: **Theodore Pei** (implements, verifies and merges Issues `#1`–`#8` following strict Red → Green TDD)

---

## 1. Sprint 1 Goal

Deliver a working, deployed full-stack roommate expense tracker where users can sign in, create or join a household via invite code, record itemized/equal/ratio expenses with tax allocation, view net balances and a greedy settlement plan, mark transfers as paid, and browse the OpenAPI 3.1 specification in Swagger UI (`docs/PLAN.md` §3, F1–F3 & F7 skeleton).

---

## 2. Sprint 1 Backlog & Ownership

| Issue | Title | Owner | Branch | PR |
|---|---|---|---|---|
| `#1` | Deploy to production: Neon Postgres + Vercel | Theodore Pei | `chore/1-production-deploy` | #22 (merged) |
| `#2` | CI pipeline: lint, typecheck, unit, integration, security scans | Theodore Pei | `chore/2-ci-pipeline` | #20 (merged) |
| `#3` | Sign in with Google & non-production test login (Better Auth) | Theodore Pei | `feature/3-sign-in` | #19 (merged) |
| `#4` | Households and invite codes | Theodore Pei | `feature/4-households` | #21 (merged) |
| `#5` | Split rules: equal, ratio, itemized, tax allocation, rounding | Theodore Pei | `feature/5-split-rules` | #17 (merged) |
| `#6` | Record an itemized expense (tables, API, UI, E2E) | Theodore Pei | `feature/6-itemized-expenses` | #24 (merged) |
| `#7` | Balances, greedy settlement plan, record a transfer | Theodore Pei | `feature/7-balances-settlement` & `feature/7-balances-page` | #18, #25 (merged) |
| `#8` | OpenAPI 3.1 document (`/api/openapi.json`) and Swagger UI (`/api/docs`) | Theodore Pei | `chore/8-openapi-docs` | #26 (merged) |

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

To preserve the Red → Green TDD commit history in `main`, **Theodore Pei** verifies each PR against its acceptance criteria and merges it using **Create a merge commit** (`--merge`, never squash) in dependency order:

1. `PR #20` (`#2` CI pipeline)
2. `PR #22` (`#1` Production deploy)
3. `PR #17` (`#5` Split rules)
4. `PR #18` (`#7` Settlement math)
5. `PR #19` (`#3` Sign-in)
6. `PR #21` (`#4` Households)
7. `PR #24` (`#6` Itemized expenses)
8. `PR #25` (`#7` Balances page)
9. `PR #26` (`#8` OpenAPI docs)
