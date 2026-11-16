# Sprint 2 standups

One entry per day worked: what I did, what is next, what blocks me. Each entry is written from that day's commits and pull requests.

## 2026-11-10

**Theodore Pei**
- **Did:** Red → Green commit pairs for the rest of the Sprint 1 backlog: `#6` itemized, equal and ratio expenses (`fc064be` → `79db15e`), `#7` balances page, settlement plan and record a transfer (`6cc0c26` → `90f7181`), `#8` OpenAPI document and `/api/docs` (`39cc727` → `c842240`). Opened PRs #24, #25 and #26. Allowlisted the test dummy secrets in gitleaks (`c9134e0`, `#2`). Updated `docs/PLAN.md`, the sprint breakdowns (`sprint1.md`, `sprint2.md`), `DESIGN.md`, `AGENTS.md` and the `.claude/rules/` files (`2a57f45`). Cut `#12` from the sprint. Also read technical docs, studied Claude tutorials and worked on the `AGENTS.md` design.
- **Next:** Sprint 2 backlog in the planned order, starting with `#13` personal API tokens, then `#9` receipt scanning.
- **Blockers:** None recorded.

## 2026-11-15

**Theodore Pei**
- **Did:** Fixed what the Sprint 1 evaluation (round 1: FAIL) found, each as a Red → Green pair: taxes in the expense form (`#6`), duplicate participants and ratio weights rejected (`#6`), `/api/docs` rendered with Swagger UI (`#8`), `DIRECT_URL` fallback and a tested migration script (`#1`), build waits for the secret scan (`#2`). Round 2 passed, and the nine Sprint 1 PRs (#17–#22, #24–#26) were merged. Merged the Context7 rule (#32). Then the whole Sprint 2 backlog, one PR each: `#13` tokens (#33), `#9` receipt scan (#34), `#10` draft review and confirm (#35), `#9` browser-side image compression (#36), `#11` real-time updates (#37), `#15` preview environments (#38), `#14` E2E on previews (#39), `#16` UI polish and docs (#40). Merged the final documentation package (#41). Then #42 (`#14`): the `E2E (preview)` workflow now starts from every pull request and finds that commit's preview through the Vercel API with `VERCEL_TOKEN`; its first passing run was on #42's own preview (58 passed, 4 viewport-specific tests skipped). It skips Dependabot PRs, which get no Actions secrets, and checks that the preview answers through the bypass before Playwright starts. #45: fixes for the findings the evaluators had left open (tokens, receipts, drafts, real-time, sign-out, preview lookup), each as a Red → Green pair, plus the first refactor commit (`7381dff`). Closed the four Dependabot PRs (#28–#31).
- **Next:** Demo video, a final docs refresh and the reflection.
- **Blockers:** Met and cleared today. Vercel rejects request bodies above about 4.5 MB, so large receipt photos would fail in production; fixed by compressing them in the browser (#36). Better Auth's rate limit (3 sign-up or sign-in requests per 10 s per IP) failed 19 of 34 E2E tests on a preview; fixed by turning rate limiting off where the test login is on (#39). The `E2E (preview)` workflow only started from `main`, so it could not run on its own PR before merge; #42 fixed that later the same day. On #42's first runs every Playwright test timed out: the bypass secret in GitHub was wrong, because the local `.env` value had been changed and that wrong value was copied to GitHub. Fixed by copying the secret from Vercel again; the new bypass check now fails fast instead.
