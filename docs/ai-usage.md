# How AI agents were used

AI coding agents wrote most of the code and tests in this repo. They worked under written rules, in Red → Green commits, and every behavior-changing PR was tested by a separate evaluator agent before merge. This page lists the rules, the workflow, what the checks caught, and the steps only Theodore Pei did.

## Binding rules: `AGENTS.md` and `.claude/rules/`

`AGENTS.md` is the root instruction file every agent reads first; it states that it and `.claude/rules/*.md` override any global `CLAUDE.md`. Its history (`git log -p AGENTS.md .claude/rules`):

| Date | Commit | Change |
|---|---|---|
| 2026-11-01 | `6717b3e` | v1: one long file with project context, tech stack, architecture rules (integer cents, split shares add up to the total, only `src/server/` touches Prisma, 403 for non-members, AI output is untrusted), TDD, Git workflow and a Definition of Done. |
| 2026-11-10 | `2a57f45` | Rewritten as a short root map: commands, six non-negotiable guardrails, and links to scoped rule files loaded only for their area: `api-and-domain.md` (`src/lib`, `src/server`, `src/app/api`), `tdd-and-git.md`, `ui-design.md` (`src/app/**/*.tsx`, with `DESIGN.md`). New guardrail: import Prisma only from `@/generated/prisma/client`, never `@prisma/client` (Prisma 7). |
| 2026-11-15 | `16b3c8d` | Context7 rule (below). The Red commit may hold stubs that only make imports resolve, so tests fail on assertions, and may break a config file when the config itself is under test. Green may be `fix`, `chore` or `ci`. Review rule: an independent evaluator agent tests the running PR and its report is posted on the PR. |
| 2026-11-15 | `e130a28` | Sprint 2 guardrails 6–11: receipt tests use fixtures and never call Gemini; API tokens stored as SHA-256 hashes; real-time falls back to polling and only members may subscribe; previews run on their own Neon branch; an accessibility rule; no new npm dependency without a stated reason. Added a changelog. |

The `16b3c8d` TDD change matches two Sprint 1 evaluation findings: the `#3` Red commit failed with library runtime errors (`APIError: Email and password sign up is not enabled`) instead of assertion failures, and the `#2` Red made its test fail by breaking `ci.yml`. The rule now says what a Red commit may contain so it fails for the right reason.

`AGENTS.md` also keeps the block Next.js writes itself ("This is NOT the Next.js you know"), which tells agents to read the installed version's docs in `node_modules/next/dist/docs/` before writing Next.js code.

## Context7 for library docs

Agents fetch current library documentation through the Context7 MCP whenever they need an API, setup or configuration step, without being asked; Next.js is the exception and is read from `node_modules`. The stack (Next.js 16.4, Prisma 7, Better Auth 1.7, Tailwind 4, zod 4) is newer than most model training data, so answers from memory were a known risk.

## Red → Green → Refactor

Every feature or fix lands as a `test(...)` commit that fails, then a separate implementation commit that makes it pass, and PRs are merged with merge commits so the pair stays visible in `git log`. Examples:

| Issue | Red | Green | Red failure |
|---|---|---|---|
| #5 split rules | `c844422` | `c99a676` | 26 failed, `expected [] to deeply equal [ 334, 333, 333 ]` |
| #6 taxes in the form | `449868d` | `4a100ca` | an item can carry a tax in the expense form |
| #9 image compression | `2730d7c` | `d7eb4cf` | unit 9 failed; e2e `Expected: < 4718592  Received: 5763202` |
| #14 rate limiting | `e7dd7af` | `de8ed8a` | rate limiting follows the test login |

The evaluator checks the pairs by checking out each Red and Green commit and running the tests. It found that the `#4` Green commit (`2357152`) failed one of its own Red E2E tests, fixed afterwards by scoping the test's locator (`f09f6a1`). History was not rewritten; the finding is recorded in the report.

## Orchestrator, implementer and independent evaluator

The work was split into units, each with its own task file. An orchestrator agent dispatched one unit at a time:

1. An **implementer** subagent read its task file and `AGENTS.md`, wrote the Red and Green commits on the issue's branch, and drafted the PR body with test counts.
2. An **independent evaluator** that had not written the code started the app, tested every acceptance criterion in the browser, with curl and with the test suites, re-ran each Red and Green commit, and wrote a report with PASS / FAIL / BLOCKED per criterion and other problems by severity. The reports were posted on the PRs. From PR #35 on, the evaluator was a different model (Gemini 4 Argon through the Antigravity CLI) from the Claude implementer.
3. On FAIL, a **fixer** subagent addressed the findings as new Red → Green pairs, and the evaluator ran again (at most two rounds).

What the evaluator caught:

| Report | Finding | Fix |
|---|---|---|
| Sprint 1, round 1 | The expense form could not record a tax: items had no tax control, so saving failed with `no item carries tax GST` | `449868d` → `4a100ca` |
| Sprint 1, round 1 | `/api/docs` was a hand-written list, not Swagger UI; its E2E test only checked the heading | `37e68ae` → `6bfd694` |
| Sprint 1, round 1 | A participant listed twice was charged twice; a duplicate ratio weight returned HTTP 500 | `38c210d` → `67ee2f5` |
| Sprint 1, round 1 | An empty `DIRECT_URL` from `.env.example` broke every Prisma command | `d4e9684` → `18a5256` |
| Sprint 1, round 1 | The test login was off on Vercel previews, which run with `NODE_ENV=production` | #38 |
| PR #34 | Vercel caps request bodies at about 4.5 MB, below the 10 MB the receipt upload allowed | #36 (browser compression) |
| PR #33 | A Bearer token can create new tokens | recorded, not changed |

PR #39 had no separate evaluator. Instead the full Playwright suite was run against the PR's own preview, which found that Better Auth's rate limit failed 19 of 34 tests on previews; the fix turns rate limiting off where the test login is on.

## Steps only a human did

Theodore Pei did these himself:

- Created the Google OAuth client, put its credentials in the local `.env` and Vercel production, and signed in with Google on production to confirm it.
- Added the Gemini API key, installed the Vercel Neon integration, set the preview environment variables (`PRODUCTION_DB_HOST`, `RECEIPT_EXTRACTOR`, `BETTER_AUTH_SECRET`), stored `VERCEL_AUTOMATION_BYPASS_SECRET` as a GitHub Actions secret, and installed the Vercel GitHub App.
- Pushed every branch to GitHub himself.
- Made the product and process calls the agents asked about: compress photos in the browser, turn rate limiting off only where the test login is on, run real-time on polling in production without a Pusher app, load Swagger UI from a CDN instead of adding an npm package, cut #12, and merge #39 without a separate evaluator.
