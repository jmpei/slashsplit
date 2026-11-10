# Sprint 2 Plan — AI Receipt Scanning, Real-Time Updates, Public API Tokens & Polish

- **Sprint Window**: 2026-11-10 (Tue) – 2026-11-13 (Fri)
- **GitHub Milestone**: `Sprint 2`
- **Team Members**: **Theodore Pei** & **Marcus Ramos**
- **Workflow Division**:
  - **Implementation Owner**: **Marcus Ramos** (develops Sprint 2 Issues `#9`, `#10`, `#11`, `#13`, `#14`, `#15`, `#16` across 5–6 separate PRs following strict Red → Green TDD, provides `GEMINI_API_KEY` for `#9`, and authors partner documentation and `AGENTS.md` v3)
  - **PR Review & Verification Owner**: **Theodore Pei** (reviews, verifies acceptance criteria, and approves all Sprint 2 PRs before merge; manages Vercel/Neon deployment and architecture documentation)

---

## 1. Sprint 2 Goal

Add AI-powered receipt scanning into editable drafts with total-mismatch validation, real-time household balance updates via Pusher Channels, personal Bearer API tokens for `/api/v1`, preview deployment E2E verification, mobile/desktop UI polish, and complete project documentation (`docs/PLAN.md` §3, F4, F5, F7).

---

## 2. Sprint 2 Backlog & Ownership

| Issue | Title | Implementation Owner | Reviewer | Target Branch |
|---|---|---|---|---|
| `#9` | Receipt upload & Gemini AI extraction to `DRAFT` expense | Marcus Ramos | Theodore Pei | `feature/9-receipt-scan` |
| `#10` | Draft receipt review page: mismatch highlight in red, edit & confirm | Marcus Ramos | Theodore Pei | `feature/10-draft-confirm` |
| `#11` | Real-time balance updates with Pusher Channels | Marcus Ramos | Theodore Pei | `feature/11-realtime-pusher` |
| `#13` | Personal API Bearer tokens (`/api/v1/tokens`) & OpenAPI completion | Marcus Ramos | Theodore Pei | `feature/13-api-tokens` |
| `#14` | Full-journey Playwright E2E suite against preview/local environment | Marcus Ramos | Theodore Pei | `feature/14-e2e-suite` |
| `#15` | PR preview environment configuration & database branch setup | Marcus Ramos | Theodore Pei | `chore/15-preview-env` |
| `#16` | Mobile (360 px) & desktop (1280 px) UI polish, accessibility & docs | Marcus Ramos & Theodore Pei | Theodore Pei | `docs/16-ui-and-partner-docs` |

---

## 3. What Sprint 2 Delivers in Detail (PR Breakdown)

Every feature PR below must follow `AGENTS.md` §3 (**Commit 1 = Red failing test commit `test(...)`**, **Commit 2 = Green implementation commit `feat(...)`**) and be merged with **Create a merge commit** after **Theodore Pei** reviews and approves it:

1. **PR 1 — Issue `#13`: Public API Bearer Tokens (`feature/13-api-tokens`)**
   - Add `ApiToken` model & migration (`id`, `userId`, `name`, `tokenHash`, `lastUsedAt`, `createdAt`). Store SHA-256 hash only; return the plain token once on creation.
   - Implement `GET / POST /api/v1/tokens` and `DELETE /api/v1/tokens/{id}` + UI for generating and revoking personal tokens.
   - Extend `currentUserId` in `src/server/api.ts` to authenticate `Authorization: Bearer <token>` headers alongside session cookies.
2. **PR 2 — Issue `#9`: Receipt Upload & Gemini AI Scan to Draft (`feature/9-receipt-scan`)**
   - Implement `src/lib/receipt/` using Gemini Flash (`responseSchema`) + zod validation.
   - Implement `POST /api/v1/households/{id}/receipts/scan`: validate image type (`jpg`, `png`, `heic`, `webp`) and size (`≤ 10 MB`), upload to Vercel Blob (with local/test fallback), and create an `Expense` with `status: "DRAFT"`.
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
6. **PR 6 — Issue `#16` & Deliverables Package (`docs/16-ui-and-partner-docs`)**
   - Mobile (360 px) & desktop (1280 px) UI polish + light/dark contrast verification.
   - Update `AGENTS.md` to `v3` (committed by **Marcus Ramos** so both partners have commits on `AGENTS.md`).
   - Complete `docs/schema.md` (Mermaid ER diagram), `docs/setup.md`, `docs/api.md`, `docs/architecture.md`, `docs/ai-usage.md`, `docs/contributions.md`, and Sprint 1 & 2 standups and retrospectives.
