# Sprint 2 Plan — AI Receipt Scanning, Real-Time Updates, Public API Tokens & Polish

- **Sprint Window**: 2026-11-10 (Tue) – 2026-11-13 (Fri)
- **GitHub Milestone**: `Sprint 2`
- **Owner**: **Theodore Pei** (implements, verifies and merges Issues `#9`, `#10`, `#11`, `#13`, `#14`, `#15`, `#16` following strict Red → Green TDD; manages the Vercel/Neon deployment and the documentation)

---

## 1. Sprint 2 Goal

Add AI-powered receipt scanning into editable drafts with total-mismatch validation, real-time household balance updates via Pusher Channels, personal Bearer API tokens for `/api/v1`, preview deployment E2E verification, mobile/desktop UI polish, and complete project documentation (`docs/PLAN.md` §3, F4, F5, F7).

---

## 2. Sprint 2 Backlog & Ownership

| Issue | Title | Owner | Branch |
|---|---|---|---|
| `#9` | Receipt upload & Gemini AI extraction to `DRAFT` expense | Theodore Pei | `feature/9-receipt-scan` |
| `#10` | Draft receipt review page: mismatch highlight in red, edit & confirm | Theodore Pei | `feature/10-draft-confirm` |
| `#11` | Real-time balance updates with Pusher Channels | Theodore Pei | `feature/11-realtime-pusher` |
| `#13` | Personal API Bearer tokens (`/api/v1/tokens`) & OpenAPI completion | Theodore Pei | `feature/13-api-tokens` |
| `#14` | Full-journey Playwright E2E suite against preview/local environment | Theodore Pei | `feature/14-e2e-suite` |
| `#15` | PR preview environment configuration & database branch setup | Theodore Pei | `chore/15-preview-env` |
| `#16` | Mobile (360 px) & desktop (1280 px) UI polish, accessibility & docs | Theodore Pei | `docs/16-ui-and-docs` |

---

## 3. What Sprint 2 Delivers in Detail (PR Breakdown)

Every feature PR below must follow `AGENTS.md` §2 rule 1 (**Commit 1 = Red failing test commit `test(...)`**, **Commit 2 = Green implementation commit `feat(...)`**) and be merged with **Create a merge commit** after an independent evaluator agent tests it against the issue's acceptance criteria:

1. **PR 1 — Issue `#13`: Public API Bearer Tokens (`feature/13-api-tokens`)**
   - Add `ApiToken` model & migration (`id`, `userId`, `name`, `tokenHash`, `lastUsedAt`, `createdAt`). Store SHA-256 hash only; return the plain token once on creation.
   - Implement `GET / POST /api/v1/tokens` and `DELETE /api/v1/tokens/{id}` + UI for generating and revoking personal tokens.
   - Extend `currentUserId` in `src/server/api.ts` to authenticate `Authorization: Bearer <token>` headers alongside session cookies.
2. **PR 2 — Issue `#9`: Receipt Upload & Gemini AI Scan to Draft (`feature/9-receipt-scan`)**
   - Implement `src/lib/receipt/` using Gemini Flash (`responseSchema`) + zod validation.
   - Implement `POST /api/v1/households/{id}/receipts/scan`: validate image type (`jpg`, `png`, `heic`, `webp`) and size (`≤ 10 MB`) on the server without storing the image, and create an `Expense` with `status: "DRAFT"`.
   - Use deterministic JSON fixtures from `tests/fixtures/receipts/` in all unit and integration tests (never call live Gemini in tests/CI).
3. **PR 3 — Issue `#10`: Draft Receipt Review & Confirm (`feature/10-draft-confirm`)**
   - Build the draft review/edit UI and `POST /api/v1/households/{id}/expenses/{eid}/confirm`.
   - When `sum(items.priceCents) + sum(taxes.amountCents) !== totalCents`, highlight the discrepancy in red (`aria-live="polite"`) and disable the Confirm button.
   - On Confirm, transition `status` from `DRAFT` to `CONFIRMED` and persist computed `ExpenseShare` rows.
4. **PR 4 — Issue `#11`: Real-Time Balance Updates (`feature/11-realtime-pusher`)**
   - Publish a Pusher event on the household channel whenever an expense is confirmed/created or a settlement is recorded (with a clean no-op fallback when Pusher credentials are unset).
   - Subscribe in the household balances view so roommates see updated balances within 3 seconds without refreshing.
5. **PR 5 — Issues `#14` & `#15`: Preview Environment & Full E2E Suite (`feature/14-e2e-suite`)**
   - Configure preview environment support and a full end-to-end Playwright user journey covering sign-in, household creation & invite join, itemized expense splitting, balance check, and settlement.
6. **PR 6 — Issue `#16`: UI Polish, Accessibility & Docs (`docs/16-ui-and-docs`)**
   - Mobile (360 px) & desktop (1280 px) UI polish + light/dark contrast verification, empty states, error messages and keyboard access.
   - Add the Sprint 2 rules, an accessibility rule and a changelog to `AGENTS.md`.
   - Complete `docs/schema.md` (Mermaid ER diagram), `docs/setup.md`, `docs/api.md`, `docs/architecture.md`, and Sprint 1 & 2 standups and retrospectives.
