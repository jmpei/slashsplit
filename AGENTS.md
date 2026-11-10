# AGENTS.md — SlashSplit

> Concise root instruction map following [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) and [Claude Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices). Detailed domain rules live in `.claude/rules/`.

<context>
**SlashSplit** (`jmpei/slashsplit`) is a roommate expense-splitting web app built by **Theodore Pei** (Sprint 1 `#1`–`#8`) and **Marcus Ramos** (Sprint 2 `#9`–`#16`).
- **Stack:** Next.js `16.4.3` (App Router, TypeScript strict), React `19.3`, Tailwind CSS `4`, PostgreSQL `17` + Prisma `7.10.1` (`@prisma/adapter-pg`), Better Auth `1.7.18`, `zod` `4`, Vitest `5`, Playwright `1.64`.
- **Precedence:** This file and `.claude/rules/*.md` override any global/home `CLAUDE.md`.
</context>

<commands>
## 1. Commands & Verifiable Checks

```bash
npm install                                      # installs deps + runs prisma generate
npm run db:up                                    # starts Postgres 17 in Docker (slashsplit + slashsplit_test)
npm run db:deploy                                # applies migrations to dev DB
DATABASE_URL="postgresql://slashsplit:slashsplit@localhost:5432/slashsplit_test?schema=public" npm run db:deploy
npm run lint && npm run typecheck                # next typegen + tsc --noEmit + eslint
npm run test:unit                                # fast pure unit tests (no DB)
npm run test:integration                         # route + service tests against real Postgres
npm run test:e2e                                 # Playwright E2E suite (port 3100, 360px + 1280px)
```
</commands>

<invariants>
## 2. Non-Negotiable Guardrails (What Claude Cannot Guess)

1. **Strict Red → Green TDD commits:** Every feature/fix branch requires a failing `test(<scope>): ... (#<n>)` commit **before** the `feat(<scope>): ... (#<n>)` implementation commit. Merge PRs with `--merge` (**never `--squash`**) so Red/Green history stays intact.
2. **All UI must follow [`DESIGN.md`](./DESIGN.md):** Read `DESIGN.md` (Vercel-inspired design system from `VoltAgent/awesome-design-md`) before editing any `.tsx` file. Use `Geist` / `Geist Mono`, `#171717` (`bg-zinc-900`) primary CTAs, `1px` hairline borders, and `tabular-nums` on every money figure.
3. **Money is integer cents (`*Cents`):** Never use floats, `parseFloat`, or `toFixed` on money; use `allocate()` (Largest Remainder, `src/lib/split/allocate.ts`) and `formatCents()`.
4. **Prisma 7 & layer boundary:** Import Prisma strictly from `@/generated/prisma/client` (never `@prisma/client`) and only inside `src/server/`. Route handlers in `src/app/api/v1/` only parse with `zod`, call `authorizeMember(request, householdId)` (`403` for non-members), and call `src/server/`.
5. **OpenAPI parity guard:** Register every `/api/v1` route in `src/lib/openapi.ts` (`tests/unit/openapi.test.ts` enforces 100% route parity in CI).
6. **Untrusted AI & zero live API calls in tests:** Store Gemini receipt parses as `status: "DRAFT"` until confirmed; inject fixtures from `tests/fixtures/receipts/` in all tests.
</invariants>

<scoped_rules>
## 3. Progressive Disclosure — Scoped Rules & Specs

Load these files when working in their respective areas:
- **Product Spec & Split Math:** [`docs/PLAN.md`](./docs/PLAN.md), [`docs/sprints/sprint1.md`](./docs/sprints/sprint1.md), [`docs/sprints/sprint2.md`](./docs/sprints/sprint2.md)
- **UI Design Tokens & Components:** [`DESIGN.md`](./DESIGN.md) & [`.claude/rules/ui-design.md`](./.claude/rules/ui-design.md) (`src/app/**/*.tsx`)
- **Domain Math, API & Prisma Rules:** [`.claude/rules/api-and-domain.md`](./.claude/rules/api-and-domain.md) (`src/lib/**`, `src/server/**`, `src/app/api/**`)
- **TDD, Git & PR Workflow:** [`.claude/rules/tdd-and-git.md`](./.claude/rules/tdd-and-git.md)
</scoped_rules>

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
