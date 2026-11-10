---
paths:
  - "src/app/**/*.tsx"
  - "src/app/**/*.css"
  - "e2e/**"
  - "DESIGN.md"
---

# UI & Design System Rules (`DESIGN.md`)

<ui_design_rules>
Before creating or editing any UI component or page in `src/app/**/*.tsx`, read [`DESIGN.md`](../../DESIGN.md) in the repo root (adapted from `VoltAgent/awesome-design-md`'s Vercel system).

1. **Surfaces & 1px Hairlines:**
   - Page background: `bg-zinc-50 dark:bg-zinc-950` (`{colors.canvas-soft}`).
   - Cards/panels: `rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900` (`{colors.canvas}` + `{colors.hairline}`). Never use heavy drop-shadows (`shadow-xl`).
2. **Typography (`Geist` & `Geist Mono`):**
   - Headings: `font-semibold tracking-tight` (sentence case, weight `600` ceiling).
   - Technical labels (invite codes, `ss_...` tokens, tax codes): `font-mono text-xs`.
3. **Tabular Numerals for Money (`tabular-nums`):**
   - Every element displaying dollar amounts (`$21.00`), net balances (`+$20.00` / `-$15.00`), or item shares MUST include `tabular-nums` and format integer cents via `formatCents(cents)`.
4. **Primary CTA & Semantic Status Colors:**
   - Primary CTA: `bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900` (`{colors.primary}`).
   - Positive net balance (`+$20.00`): `text-emerald-700 dark:text-emerald-400`.
   - Negative net balance (`-$15.00`), validation errors, and the **Receipt Draft Total Mismatch Banner**: `border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400` inside `role="status"` / `aria-live="polite"`.
5. **Mobile-First & WCAG 2.2 AA (`360 px` & `1280 px`):**
   - Zero horizontal overflow at `360 px` viewport width.
   - Use native `<button>`, `<input>`, `<select>`, and `<a>` with explicit accessible labels and `>= 40–44 px` touch targets on mobile.
</ui_design_rules>
