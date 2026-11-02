# AGENTS.md — SlashSplit

> Rules for any AI coding agent (Antigravity, Claude Code, Cursor, Codex) working in this repo.
> Read this file first, then the GitHub Issue you were given, then `docs/PLAN.md`.
> Every rule has a **Why** so you can judge cases the rule does not cover.
> This is the only rules file for this repo. If a personal or global instruction file you also loaded
> disagrees with it, this file wins inside this repo. **Why:** in HW3 a home-folder `CLAUDE.md`
> silently leaked into sessions.
> Both partners maintain this file. Version: v1 (2026-11-01), carried over from the Sofa Tomato v2
> rules (HW3). Changes are listed in §9 Changelog.

---

## 1. Project context

### 1.1 What this is

SlashSplit is a shared-expense app for roommates. You snap a receipt, AI turns it into an item list,
each item can be "slashed" for people who did not share it, and the app always shows who owes whom
and the fewest transfers to settle up. Requirements, rules and sprint plan: `docs/PLAN.md`.

### 1.2 Tech stack (pin these versions)

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router, TypeScript (strict) | 16.4.3 |
| UI | React, Tailwind CSS | 19.3 / 4.x |
| Database | PostgreSQL, Prisma ORM with `@prisma/adapter-pg` | 17 / 7.10.1 |
| Validation | zod | 4.x |
| Auth | Auth.js: Google OAuth + JWT session; email/password only outside production | (login issue) |
| AI | Gemini API with `responseSchema` (structured output) | (scan issue) |
| Real-time | Pusher Channels | (real-time issue) |
| Unit + integration tests | Vitest | 5.0.5 |
| E2E | Playwright | 1.64.1 |
| Hosting | Vercel (preview per PR, production on `main`), Neon Postgres | — |

**Next.js 16.4 is newer than most training data.** Before using a Next.js API, read the matching guide
in `node_modules/next/dist/docs/`. `cacheComponents` is on in `next.config.ts`.
**Prisma 7:** import the client from `@/generated/prisma/client` (generated, git-ignored, rebuilt by
`postinstall`). Never import from `@prisma/client`.

### 1.3 Architecture

```
src/
  app/                 Pages and layouts.
  app/api/v1/          Public REST API. Route handlers only parse, authorize, and call src/server/.
  lib/split/           Split rules: pure functions, no Prisma, no Next, no I/O.
  lib/receipt/         Gemini call + parsing the reply into the receipt schema.
  lib/db.ts            The one Prisma client.
  server/              Services: every database read and write.
  generated/prisma/    Prisma client (generated; never edit, never commit).
prisma/schema.prisma   Data model. Migrations in prisma/migrations/.
tests/unit/            Vitest, no database.
tests/integration/     Vitest against real Postgres (TEST_DATABASE_URL).
tests/fixtures/        Receipt JSON samples that stand in for Gemini.
e2e/                   Playwright specs.
docs/                  PLAN.md, sprints/, architecture, API, AI usage log.
```

**Key patterns**

1. **Money is integer cents.** Every amount field and variable ends in `Cents` and is an integer.
   Never use floats, `toFixed`, or `parseFloat` on money. Format only at render time.
   **Why:** float sums drift; shares must add up to the receipt total exactly.
2. **Every split result adds up to its total.** Any function that divides money returns shares whose
   sum equals the input, using the largest-remainder rule in `docs/PLAN.md` §5.1. Each such function has
   a test asserting the sum.
3. **Split logic lives in `src/lib/split/` as pure functions.** Pass in time, ids, and member order as
   parameters. **Why:** this is where TDD earns its keep; tests run in milliseconds.
4. **Only `src/server/` touches Prisma.** Route handlers and pages call services; services return plain
   objects, never Prisma model instances with extra methods.
5. **Every `/households/{id}/…` route checks membership first** and answers 403 to non-members, with an
   integration test proving it. **Why:** one missing check leaks a household's money data.
6. **AI output is untrusted input.** Gemini's reply is parsed with the zod receipt schema; anything that
   fails becomes an editable draft with errors, never a saved expense. Only a user's "Confirm" saves.
7. **Validate every request body and query with zod** at the route boundary; the same schemas generate
   the OpenAPI document.

### 1.4 Data model

See `docs/PLAN.md` §8.1 for the target tables. Change `prisma/schema.prisma` only inside the issue that
needs the table, with a migration (`npm run db:migrate -- --name <what>`), and say so in the PR.

### 1.5 Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `split-items.ts`, `expense-form.tsx` |
| React components | PascalCase; a whole page ends in `Page` | `ExpenseForm`, `BalancesPage` |
| Functions | camelCase verb phrase | `splitItems`, `allocateTax`, `planSettlement` |
| Money | `<thing>Cents`, integer | `priceCents`, `totalCents` |
| Calendar day | `YYYY-MM-DD` string | `"2026-11-01"` |
| API paths | `/api/v1/<plural-noun>` | `/api/v1/households/{id}/expenses` |
| Env vars | UPPER_SNAKE_CASE; browser-visible ones start `NEXT_PUBLIC_` | `GEMINI_API_KEY` |
| Tests | `test("<what the user sees or the rule>")` in plain words | `"a slashed member pays nothing for that item"` |

### 1.6 Coding standards

- Each file opens with a 1–3 line comment saying what it is and why. Comment the *why*, not the *what*.
- TypeScript strict; no `any`, no `@ts-ignore` without a comment naming the issue.
- Two-space indent, double quotes, semicolons (match existing code; `npm run lint` is the judge).
- No `console.log` left in `src/`.
- **A calendar day is the person's local day.** Build `YYYY-MM-DD` in one helper from `getFullYear()`,
  `getMonth()`, `getDate()`. Never `toISOString().slice(0, 10)`. **Why:** that is the UTC day; in HW3
  all four test runs shipped this bug (an evening in Vancouver becomes tomorrow).
- User-facing copy: short, plain sentences, sentence case, curly apostrophe (`You don’t owe anyone.`).

---

## 2. Requirements

- `docs/PLAN.md`: features (§3), user stories with acceptance criteria (§4), split rules (§5),
  receipt flow (§6), API (§8.2), sprint plan (§12).
- GitHub Issues: each issue body holds the **acceptance-criteria checklist**. The checklist is the
  contract; if the plan and the issue disagree, the issue wins and you say so.
- **Start every task with `gh issue view <n>`.** If you cannot read it, keep going from the plan and the
  prompt, and list the acceptance criteria you *assumed* at the top of your final report.

---

## 3. TDD workflow (red → green → refactor)

Graders check the git history for failing tests committed **before** the implementation. Follow this
order on every feature and bug fix:

| Step | Commit | Contains | CI on the branch |
|---|---|---|---|
| Red | `test(<scope>): <rule> (#n)` | Only new or changed tests, turned from the issue's acceptance criteria | Fails — expected |
| Green | `feat(<scope>): <summary> (#n)` or `fix(...)` | The smallest code that passes | Passes |
| Refactor | `refactor(<scope>): <summary> (#n)` | Cleanup, no behaviour change | Passes |

- Run the new test and see it fail **for the right reason** (assertion, not a typo or import error)
  before writing the implementation. Paste the failing line into the red commit body.
- Never delete or weaken an existing test to make a change pass.
- When an AI writes the tests, a human reads them before the red commit: the tests are the spec.

---

## 4. Scrum and Git workflow

### 4.1 Board

GitHub Project with **Backlog → Sprint Todo → In Progress → In Review → Done**.
Milestones: **Sprint 1** (2026-11-02 → 11-06), **Sprint 2** (11-07 → 11-10). Deadline 2026-11-12.
Work only on an issue in Sprint Todo or In Progress; move it to In Progress when you start.

### 4.2 Branches

`<type>/<issue-number>-<short-kebab-description>` from an up-to-date `main`. One issue, one branch.

| Type | Use for | Example |
|---|---|---|
| `feature/` | a user-visible capability | `feature/5-itemized-split` |
| `fix/` | a bug | `fix/21-rounding-remainder` |
| `chore/` | tooling, CI, refactors | `chore/2-ci-pipeline` |
| `docs/` | documentation only | `docs/30-architecture` |

### 4.3 Commits — Conventional Commits with the issue number

```
<type>(<scope>): <imperative summary, ≤ 72 chars> (#<issue>)

<optional body: why, not what>
```

- `type`: `test`, `feat`, `fix`, `refactor`, `docs`, `chore`, `ci`, `style`.
- `scope`: `split`, `receipt`, `expenses`, `households`, `balances`, `auth`, `api`, `ui`, `db`, `ci`, `docs`.
- One logical change per commit. Tests and implementation are **separate** commits (§3).

### 4.4 Pull requests

- Title = the main commit summary. Body starts with `Closes #<issue>`.
- Copy the issue's acceptance-criteria checklist into the PR; tick each item with its test name.
- Paste the test summary lines (unit, integration, e2e).
- UI changes: attach screenshots at 360 px and 1280 px, light and dark.
- **The partner reviews and approves before merge** (each partner needs 5+ reviews). Review comments
  must say something concrete: a question, a risk, or what you checked.
- **Merge with "Create a merge commit"** (not squash). **Why:** squash collapses the red and green
  commits into one and erases the TDD evidence. Delete the branch after merge.

### 4.5 Referencing issues in code

- Reference an issue in code only where the reason is not obvious: `// #12: Costco prints tax per line.`
- No `TODO` without an issue number: `// TODO(#14): …`.

---

## 5. Do's and don'ts

### 5.1 Patterns

| Do | Don't |
|---|---|
| Integer cents everywhere; format at render | Floats, `toFixed`, or strings for amounts |
| Pure split functions with injected inputs | Split math inside a component or route handler |
| Route → zod parse → auth + membership → service | Prisma calls in a route handler or page |
| Gemini reply → zod → draft → user confirms | Saving AI output directly |
| Use fixtures in `tests/fixtures/receipts/` in tests | Calling the real Gemini API from any test or CI job |
| Tailwind utilities and theme tokens in `globals.css` | Hard-coded hex colors in components |
| Mobile first: works at 360 px | Layouts that only work on desktop |

### 5.2 Dependencies

- Ask before adding any dependency; say why a built-in or an existing one won't do.
- Prefer platform built-ins: `Intl.NumberFormat` for money display, `crypto.randomUUID`, `fetch`.

### 5.3 Security

- Secrets live only in `.env` (git-ignored), Vercel, and GitHub Secrets. `.env.example` lists names
  with empty values. Never print a secret in logs, tests, or PRs.
- Never use `dangerouslySetInnerHTML` or `eval`.
- Authorize on the server for every request; never trust a user id or household id from the client
  without checking membership.
- Uploads: accept only jpg, png, heic, webp up to 10 MB; check the type on the server.
- Public API tokens are stored hashed; show the plain token once at creation.
- The email/password login exists only when `NODE_ENV !== "production"`; a test asserts it is off in
  production.

### 5.4 Accessibility (WCAG 2.2 AA)

- Real `<button>`, `<a>`, `<input>`, `<select>` with visible or `sr-only` labels.
- Touch targets ≥ 44 px; results and errors announced in an `aria-live="polite"` region.
- Contrast ≥ 4.5:1 in light and dark; animation respects `prefers-reduced-motion`.

---

## 6. Definition of Done

- [ ] Every acceptance-criteria checkbox in the issue is met and has a test.
- [ ] Red commit came before the green commit (§3).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` pass (paste counts).
- [ ] New API routes appear in the OpenAPI document with request and response schemas.
- [ ] Works at 360 and 1280 px, light and dark.
- [ ] Branch, commits and PR follow §4; partner approved.
- [ ] A user-visible feature adds one line to README "Features".

**Final report template** (end every task with this, filled in):

```
Issue: #<n> — read with gh | could not read; assumed AC: …
Branch: <name>   Red commit: <first line>   Green commit: <first line>
Tests: unit <pass/fail>, integration <pass/fail>, e2e <pass/fail>
AC:  - [x] <criterion> — <test name>
     - [ ] <criterion> — not done, because …
Not done / open questions: …
```

---

## 7. Commands

```bash
npm install                     # also runs prisma generate
npx playwright install chromium # first time only
npm run db:up                   # local Postgres in Docker (dev + test databases)
npm run db:migrate              # apply / create migrations locally
npm run dev                     # http://localhost:3000
npm run lint && npm run typecheck
npm run test:unit               # fast, no database
npm run test:integration        # needs db:up
npm test                        # unit + integration
npm run test:e2e                # Playwright; starts dev server on port 3100
```

---

## 8. When unsure

Name the gap and ask instead of guessing. Do not change the split rules (`docs/PLAN.md` §5), the data
model, or the access rules without saying so in the PR.

---

## 9. Changelog

- **v1 (2026-11-01):** written for SlashSplit from the Sofa Tomato v2 rules (HW3). Kept: rule-file
  precedence, `gh issue view` first, local calendar day, no weakened tests, final report template.
  Changed: tests and code now go in **separate** commits and PRs merge with a merge commit (TDD evidence);
  stack moved to Next.js + Prisma + TypeScript; added money-in-cents, membership-check, and
  AI-output-is-untrusted rules.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
