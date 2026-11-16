# How AI was used

AI coding agents wrote most of the code and tests for SlashSplit. They worked under written rules and in red → green commits, an independent AI evaluator tested behavior-changing PRs before merge, and the app itself uses an AI model to read receipts. This page covers the rules, the context engineering, the TDD workflow, what the evaluations caught, AI inside the product, the demo video, and the steps only Theodore Pei did.

## Rules file: `AGENTS.md` and `.claude/rules/`

`AGENTS.md` is the root instruction file every agent reads first. Its history (`git log -p AGENTS.md .claude/rules`):

| Date | Commit | Change |
|---|---|---|
| 2026-11-01 | `6717b3e` | v1: one long file with project context, tech stack, architecture rules (integer cents, split shares add up to the total, only `src/server/` touches Prisma, 403 for non-members, AI output is untrusted), TDD, Git workflow and a Definition of Done. |
| 2026-11-10 | `2a57f45` | Rewritten as a short root map: commands, six non-negotiable guardrails, and links to scoped rule files: `api-and-domain.md` (`src/lib`, `src/server`, `src/app/api`), `tdd-and-git.md`, `ui-design.md` (`src/app/**/*.tsx`, with `DESIGN.md`). New guardrail: import Prisma only from `@/generated/prisma/client` (Prisma 7). |
| 2026-11-15 | `16b3c8d` | Context7 rule. A red commit may hold stubs that only make imports resolve, so tests fail on assertions, and may break a config file when the config itself is under test. Green may be `fix`, `chore` or `ci`. |
| 2026-11-15 | `e130a28` | Sprint 2 guardrails 6–11: receipt tests use fixtures and never call Gemini; API tokens stored as SHA-256 hashes; real-time falls back to polling and only members may subscribe; previews run on their own Neon branch; an accessibility rule; no new npm dependency without a stated reason. Added a changelog. |

The `16b3c8d` TDD change came from two Sprint 1 evaluation findings: the `#3` red commit failed with library runtime errors (`APIError: Email and password sign up is not enabled`) instead of assertion failures, and the `#2` red made its test fail by breaking `ci.yml`. The rule now says what a red commit may contain so it fails for the right reason.

## Context engineering

- **Progressive disclosure.** The root file stays short; area rules load only where they apply, so an agent editing a page reads the UI rules and one editing the split engine reads the money rules.
- **Current docs over memory.** The stack (Next.js 16.4, Prisma 7, Better Auth 1.7, Tailwind 4, zod 4) is newer than most model training data. Agents fetch library docs through the Context7 MCP without being asked; Next.js is read from the installed version's `node_modules/next/dist/docs/`, as the block Next.js writes into `AGENTS.md` instructs.
- **Verifiable checks in the rules.** `AGENTS.md` lists the exact commands that prove a change (lint, typecheck, unit, integration, E2E), and the OpenAPI parity test fails if a `/api/v1` route is undocumented, so a rule can be checked instead of trusted.

## Red → Green → Refactor

Every feature or fix lands as a `test(...)` commit that fails, then a separate implementation commit that makes it pass, and PRs are merged with merge commits so the pair stays visible in `git log`. Examples:

| Issue | Red | Green | Red failure |
|---|---|---|---|
| #5 split rules | `c844422` | `c99a676` | 26 failed, `expected [] to deeply equal [ 334, 333, 333 ]` |
| #6 taxes in the form | `449868d` | `4a100ca` | an item can carry a tax in the expense form |
| #9 image compression | `2730d7c` | `d7eb4cf` | unit 9 failed; e2e `Expected: < 4718592  Received: 5763202` |
| #14 rate limiting | `e7dd7af` | `de8ed8a` | rate limiting follows the test login |

The first refactor commit, `7381dff` in #45, moved the Prisma client into `src/server/` and removed a dead action, with the same test counts before and after.

## Independent evaluation

Behavior-changing PRs were tested by an evaluator that had not written the code. It started the app, checked each acceptance criterion in the browser, with curl and with the test suites, re-ran each red and green commit, and wrote a PASS / FAIL / BLOCKED report that was posted on the PR. From PR #35 on, the evaluator was Gemini 4 Argon run through the Antigravity CLI, a different model family from the one that wrote the code.

What the evaluations caught:

| Report | Finding | Fix |
|---|---|---|
| Sprint 1, round 1 | The expense form could not record a tax, so saving failed with `no item carries tax GST` | `449868d` → `4a100ca` |
| Sprint 1, round 1 | `/api/docs` was a hand-written list, not Swagger UI; its E2E test only checked the heading | `37e68ae` → `6bfd694` |
| Sprint 1, round 1 | A participant listed twice was charged twice; a duplicate ratio weight returned HTTP 500 | `38c210d` → `67ee2f5` |
| Sprint 1, round 1 | An empty `DIRECT_URL` from `.env.example` broke every Prisma command | `d4e9684` → `18a5256` |
| Sprint 1, round 1 | The test login was off on Vercel previews, which run with `NODE_ENV=production` | #38 |
| PR #34 | Vercel caps request bodies at about 4.5 MB, below the 10 MB the receipt upload allowed | #36 (browser compression) |
| PR #33 and later | A Bearer token could create new tokens; impossible dates were accepted; no way to discard a draft; no sign-out outside `/households` | #45 |

Running the full Playwright suite against a real preview found that Better Auth's rate limit failed 19 of 34 tests there; the fix turns rate limiting off where the test login is on (#39).

## AI inside the product

Receipt scanning sends the photo to Gemini (`gemini-2.5-flash`) in one call with a `responseSchema`. The reply is validated with zod and saved only as a `DRAFT` expense, so a person must review and confirm it, and the confirm endpoint refuses a draft whose items and taxes do not add up to the total. Tests never call Gemini: they use fixture extractors in `tests/fixtures/receipts/`.

## Demo video

The demo was recorded with Playwright scripts against a preview deployment. The narration script was drafted with AI, voiced with ElevenLabs text-to-speech through fal.ai, and the burned-in subtitles were timed with Whisper word timestamps.

## Steps only a human did

Theodore Pei did these himself:

- Created the Google OAuth client, put its credentials in the local `.env` and Vercel production, and signed in with Google on production to confirm it.
- Added the Gemini API key, installed the Vercel Neon integration, set the preview environment variables, created the Vercel token and the protection-bypass secret and stored them as GitHub Actions secrets, and installed the Vercel GitHub App.
- Pushed every branch to GitHub himself.
- Made the product and process calls: compress photos in the browser, turn rate limiting off only where the test login is on, run real-time on polling without a Pusher app, load Swagger UI from a CDN instead of adding an npm package, cut #12, and close the Dependabot PRs.
