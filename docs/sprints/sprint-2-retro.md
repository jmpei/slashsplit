# Sprint 2 retrospective

- **Written:** 2026-11-15
- **Planned window:** 2026-11-10 → 2026-11-12 (milestone due 2026-11-13)
- **Issues:** #9, #10, #11, #13, #14, #15, #16, all merged; #12 cut at planning

The sprint ran past its Nov 10–12 window into Nov 15. Nov 15 counts as an extension of Sprint 2: every Sprint 2 PR (#33–#40) was opened and merged that day.

## What went well

- Every feature PR kept the Red → Green pair, and every feature PR except #39 had an independent evaluator report posted before merge. All of them passed in round 1.
- The evaluator for #9 (`34-r1`) flagged that Vercel caps request bodies at about 4.5 MB, below the 10 MB the issue allowed. A follow-up PR (#36) compresses large photos in the browser before upload, with an E2E test that checks the request stays under 4.5 MB.
- Running the full E2E suite against a real preview found what local runs could not: Better Auth's rate limit (3 sign-up or sign-in requests per 10 s per IP) failed 19 of 34 tests. Rate limiting is now off where the test login is on and still on in production, with an integration test for both cases.
- Receipt tests use fixtures and never call Gemini, and every preview gets its own Neon branch with migrations, so tests and previews never touch production data.

## What didn't

- All of the sprint's work landed on one day, after the planned window.
- Previews had no environment variables at first, so the evaluations for #33–#37 ran locally.
- The `E2E (preview)` workflow starts only from `main`, so it could not run on its own PR (#39), and it had not yet run on a PR when the sprint closed.
- Some evaluator findings were recorded but not fixed before merge, for example a Bearer token can create new tokens (`33-r1`, medium).
- Four Dependabot PRs (#28–#31) are still open.

## What I would change

- Set up preview environment variables and the E2E trigger at the start of the sprint.
- Check platform limits (body size, rate limits) during planning, not after a feature is built.
- Keep each day's work small enough to merge the same day.
