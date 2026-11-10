---
paths:
  - "src/lib/**"
  - "src/server/**"
  - "src/app/api/**"
  - "prisma/**"
  - "tests/**"
---

# Domain Math, API Boundary & Database Rules

<domain_and_api_rules>
1. **Money is integer cents (`*Cents`):**
   - Every monetary field, column, and variable ends in `Cents` and is an integer (`priceCents`, `totalCents`, `owedCents`, `netCents`).
   - Never use floats, `parseFloat`, or `toFixed` on money; convert only at input/render boundaries (`parseDollarsToCents` / `formatCents`).
   - **Why:** Float sums drift; divided shares must equal the receipt total to the exact cent.
2. **Largest Remainder split invariant (`src/lib/split/`):**
   - All money division uses `allocate(totalCents, weights)` (`docs/PLAN.md` §5.1) with deterministic tie-breaking by ascending `userId`.
   - Keep `src/lib/split/` 100% pure (no Prisma, no Next.js, no `process.env`). Every split test asserts `sum(shares) === totalCents`.
3. **Service & route boundary (`src/server/` vs `src/app/api/v1/`):**
   - Only `src/server/` imports Prisma (`@/lib/db` and `@/generated/prisma/client`).
   - Route handlers in `src/app/api/v1/` only parse with `zod`, call `authorizeMember(request, householdId)`, and delegate to `src/server/`.
4. **Household membership check (`403`):**
   - Every `/api/v1/households/{id}/...` route must check membership first and return `401` (unauthenticated) or `403` (non-member), backed by an integration test.
5. **Untrusted AI receipt output (`#9`, `#10`):**
   - Validate Gemini JSON output with `zod` and store scanned receipts strictly as `status: "DRAFT"`.
   - Never call the live Gemini API in unit/integration/CI tests; inject deterministic fixtures from `tests/fixtures/receipts/`.
   - Only transition a draft to `CONFIRMED` when `sum(items.priceCents) + sum(taxes.amountCents) === totalCents` via `POST /api/v1/households/[id]/expenses/[eid]/confirm`.
6. **OpenAPI parity (`src/lib/openapi.ts`):**
   - Register every `/api/v1` route and HTTP method in `src/lib/openapi.ts`. `tests/unit/openapi.test.ts` fails CI if any route file on disk is missing from the OpenAPI spec.
7. **Local calendar date (`YYYY-MM-DD`):**
   - Build calendar dates from local `getFullYear()`, `getMonth()`, `getDate()`; never use `toISOString().slice(0, 10)` (which shifts evening local times to tomorrow's UTC date).
</domain_and_api_rules>
