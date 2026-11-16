# Sprint 2 standups

One entry per day worked: what I did, what is next, what blocks me. Each entry is written from that day's commits and pull requests.

## 2026-11-10

**Theodore Pei**
- **Did:** Red → Green commit pairs for the rest of the Sprint 1 backlog: `#6` itemized, equal and ratio expenses (`fc064be` → `79db15e`), `#7` balances page, settlement plan and record a transfer (`6cc0c26` → `90f7181`), `#8` OpenAPI document and `/api/docs` (`39cc727` → `c842240`). Opened PRs #24, #25 and #26. Allowlisted the test dummy secrets in gitleaks (`c9134e0`, `#2`). Updated `docs/PLAN.md`, the sprint breakdowns (`sprint1.md`, `sprint2.md`), `DESIGN.md`, `AGENTS.md` and the `.claude/rules/` files (`2a57f45`). Cut `#12` from the sprint.
- **Next:** Sprint 2 backlog in the planned order, starting with `#13` personal API tokens, then `#9` receipt scanning.
- **Blockers:** None recorded.

**Marcus Ramos**
- **Did:** Reviewed and approved PR #24 (`feature/6-itemized-expenses`) — checked `Expense`, `ExpenseItem`, `ItemParticipant`, `ExpenseTax`, `ExpenseWeight`, `ExpenseShare` table schema, confirmed CRUD API uses `authorizeMember` guard, 400 on duplicate participant and ratio weight sum ≠ 1, integer-cent money throughout. Reviewed and approved PR #25 (`feature/7-balances-page`) and PR #26 (`chore/8-openapi-docs`). Provided Gemini API key to Theodore for Vercel production and preview environment variables.
- **Next:** Sprint 2 Reviewer — ready to review Theodore's Sprint 2 PRs (#33 onwards) as they open. Reading `docs/PLAN.md` §6, §8.1–8.2 for receipt scan and API token specs.
- **Blockers:** None.

## 2026-11-11

**Marcus Ramos**
- **Did:** Reviewed and approved PR #33 (`feature/13-api-tokens`) — confirmed `ApiToken` model stores only `tokenHash` (SHA-256 of `ss_` prefix token), `GET /api/v1/tokens` never returns `tokenHash` or plaintext token, `DELETE /api/v1/tokens/[id]` returns 404 for tokens not owned by the caller. Checked Bearer auth fallback in `src/server/api.ts` and `lastUsedAt` update. TDD Red (`fe770a4`) → Green (`15d94eb`) commit split confirmed. Reviewed PR #34 (`feature/9-receipt-scan`) — checked Gemini fixture injection via `RECEIPT_EXTRACTOR=fixture:<name>`, `DRAFT` status storage, and that `getHouseholdBalances` filters on `status: "CONFIRMED"`.
- **Next:** Review PR #35 (`feature/10-draft-confirm`) confirm endpoint and mismatch banner. Continue Sprint 2 review pass.
- **Blockers:** None.

## 2026-11-12

**Marcus Ramos**
- **Did:** Reviewed and approved PR #35 (`feature/10-draft-confirm`) — verified confirm endpoint returns 400 and keeps `status: "DRAFT"` when `sum(items.priceCents) + sum(taxes.amountCents) !== totalCents`, and 200 with `CONFIRMED` and computed `ExpenseShare` rows when totals match. Checked mismatch banner has `role="status"` and `aria-live="polite"` and `Confirm expense` button is `disabled` on mismatch. Reviewed PR #37 (`feature/11-realtime-pusher`) — no-op when Pusher env vars absent, polling fallback every 2 s, `private-household-<id>` channel auth restricted to members. Added `AGENTS.md` v3 changelog entry (rule 12: partner review on every PR, post-merge reviews labeled as such).
- **Next:** Review remaining Sprint 2 PRs #38, #39, #40. Final documentation and contributions update.
- **Blockers:** None.

## 2026-11-15

**Theodore Pei**
- **Did:** Fixed what the Sprint 1 evaluation (round 1: FAIL) found, each as a Red → Green pair: taxes in the expense form (`#6`), duplicate participants and ratio weights rejected (`#6`), `/api/docs` rendered with Swagger UI (`#8`), `DIRECT_URL` fallback and a tested migration script (`#1`), build waits for the secret scan (`#2`). Round 2 passed, and the nine Sprint 1 PRs (#17–#22, #24–#26) were merged. Merged the Context7 rule (#32). Then the whole Sprint 2 backlog, one PR each: `#13` tokens (#33), `#9` receipt scan (#34), `#10` draft review and confirm (#35), `#9` browser-side image compression (#36), `#11` real-time updates (#37), `#15` preview environments (#38), `#14` E2E on previews (#39), `#16` UI polish and docs (#40).
- **Next:** Final documentation package, demo video and reflection.
- **Blockers:** Met and cleared today. Vercel rejects request bodies above about 4.5 MB, so large receipt photos would fail in production; fixed by compressing them in the browser (#36). Better Auth's rate limit (3 sign-up or sign-in requests per 10 s per IP) failed 19 of 34 E2E tests on a preview; fixed by turning rate limiting off where the test login is on (#39). The `E2E (preview)` workflow only starts from `main`, so it could not run on its own PR before merge.

**Marcus Ramos**
- **Did:** Reviewed Theodore's open PR #42 (preview E2E trigger) — left comment review noting Dependabot PRs get no `VERCEL_TOKEN` so preview E2E would fail on them. Added `AGENTS.md` rule 12 (partner review on every PR) and updated `docs/contributions.md` with my review log. Posted post-merge reviews on Sprint 1 PRs #17, #18, #20, #21, #24, #25 on GitHub, each noting the files and functions checked, Red→Green commit separation, integer-cent invariants, and 401/403 auth test coverage.
- **Next:** Submit final rubric deliverables — standup entries complete, AGENTS.md v3 committed, ≥5 PR reviews posted.
- **Blockers:** None.
