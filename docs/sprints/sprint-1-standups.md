# Sprint 1 standups

One entry per day: what I did yesterday, what I'm doing today, what blocks me.

## 2026-11-07

**Theodore Pei**
- **Yesterday:** Finalized sprint schedule (Nov 7–9 for Sprint 1, Nov 10–12 for Sprint 2) and project setup.
- **Today:** `#5` split rules (PR #17). `#7` settlement math (PR #18). `#3` sign-in with Better Auth (PR #19). `#4` households and invite codes (PR #21). `#2` CI and branch protection (PR #20). `#1` production deploy on Vercel + Neon (PR #22).
- **Blockers:** None; `#6`, `#7` UI/API, and `#8` are next in the queue.

**Marcus Ramos**
- **Yesterday:** Reviewed the project spec (`docs/PLAN.md`) and sprint breakdown (`docs/sprints/sprint1.md`). Cloned the repo and ran `npm install` and `npm run db:up` to confirm local setup.
- **Today:** Sprint 1 Reviewer — reading through Theodore's open PRs (#17, #18, #19, #20, #21) as they land. Focusing on TDD Red→Green commit separation, integer-cent invariants in `src/lib/split/`, and 401/403 auth tests in `tests/integration/`.
- **Blockers:** None.

## 2026-11-08

**Marcus Ramos**
- **Yesterday:** Reviewed PR #17 (`feature/5-split-rules`) and PR #18 (`feature/7-balances-settlement`). Confirmed Red commit `c844422` fails 26 assertions before Green `c99a676`. Checked `allocateByWeight` uses largest-remainder integer cents with no floats. Left approval comments on both.
- **Today:** Reviewing PR #19 (`feature/3-sign-in`) and PR #20 (`chore/2-ci-pipeline`). Checking Better Auth session cookie setup, the test-only email login guard (`NODE_ENV !== "production"`), and the CI workflow for lint, typecheck, unit, integration, and secret scan jobs.
- **Blockers:** None.

## 2026-11-09

**Marcus Ramos**
- **Yesterday:** Reviewed and approved PR #19 (sign-in) and PR #20 (CI pipeline). Verified `authorizeMember` returns 403 to non-members and that gitleaks allowlist covers test dummy secrets only.
- **Today:** Reviewing PR #21 (`feature/4-households`) — 8-character unambiguous invite codes, OWNER/MEMBER roles, 403 on all household sub-routes. Also standing by to review PR #24 (`feature/6-itemized-expenses`) and PR #25 (`feature/7-balances-page`) once Theodore opens them.
- **Blockers:** None.
