# Sprint 2 planning

- **Date:** 2026-11-10 (the plan was committed as [`sprint2.md`](sprint2.md) in `2a57f45`, and issue #12 was closed as not planned the same day)
- **Sprint:** 2026-11-10 → 2026-11-12 (milestone "Sprint 2")
- **Attendees:** Theodore Pei

## Sprint goal

Scan a receipt with Gemini into an editable draft that cannot be confirmed while its total is off, update roommates' balances in real time, add personal Bearer tokens for `/api/v1`, run E2E on preview deployments, and polish the UI for 360 px and 1280 px (`docs/PLAN.md` §3, F4, F5, F7).

## Selected issues

| # | Issue | Owner |
|---|---|---|
| 9 | Scan a receipt into a draft with Gemini | Theodore Pei |
| 10 | Review and confirm a receipt draft | Theodore Pei |
| 11 | Real-time balance updates with Pusher | Theodore Pei |
| 13 | Personal API tokens for the public API | Theodore Pei |
| 14 | E2E on preview deployments | Theodore Pei |
| 15 | Preview environments with Neon branches and automated migrations | Theodore Pei |
| 16 | UI polish and mobile layout | Theodore Pei |

## Decisions

- **Scope:** #12 (monthly rent bill with Vercel Cron) was cut and closed as not planned, to keep the sprint on receipt scanning, real-time updates, API tokens and preview deployments.
- **Order:** #13 tokens, #9 receipt scan, #10 draft review, #11 real-time, #14/#15 previews and E2E, #16 polish and docs (`sprint2.md` §3).
- **Workflow:** every feature PR has a Red `test(...)` commit before its Green commit and is merged with a merge commit after an independent evaluator agent tests it against the issue's acceptance criteria.
