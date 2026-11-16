# Sprint 1 retrospective

- **Written:** 2026-11-15
- **Planned window:** 2026-11-07 → 2026-11-09 (milestone due 2026-11-10)
- **Issues:** #1–#8, all merged

The sprint ran past its window. `#6`, `#7` Part 2 and `#8` were committed on Nov 10, and no Sprint 1 PR was merged until Nov 15, after the evaluation below.

## What went well

- Every issue has a Red `test(...)` commit before its Green commit, and each Red failed on an assertion (for example `#5`: 26 failed, `expected [] to deeply equal [ 334, 333, 333 ]`).
- The split and settlement engine came first as pure functions, so the UI and API work on Nov 10 built on tested math.
- CI ran 8 required checks (lint and typecheck, unit, integration, build, npm audit, gitleaks, CodeQL ×2), and the production deploy (`#1`) was set up on Vercel + Neon on Nov 7.

## What didn't

- The first independent evaluation of the whole sprint failed (`sprint1-r1`). The expense form could not record a tax: items had no tax control, so any taxed bill failed with `no item carries tax GST`. `/api/docs` was a hand-written list, not Swagger UI, and its E2E test only checked the heading.
- The same report found API bugs: a participant listed twice was charged twice, a duplicate ratio weight returned HTTP 500, and an empty `DIRECT_URL` broke every Prisma command after `cp .env.example .env`.
- The `#4` Green commit failed one of its own Red E2E tests; a follow-up commit had to scope the test's locator.
- The test login was off on Vercel previews, because previews run with `NODE_ENV=production`. It was fixed in Sprint 2 (#38).
- Branches were stacked on each other, so the PRs had to merge in a fixed order and PR #22 had no CI run while `ci.yml` was not yet on `main`.

## What I would change

- Merge each PR as soon as it is green, instead of stacking branches.
- Run the evaluator during the sprint, not after it.
- Write E2E tests that check what a criterion promises (Swagger UI's operations), not just a heading.
