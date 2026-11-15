---
version: alpha
name: Vercel-Inspired-SlashSplit-design-system
source: https://github.com/VoltAgent/awesome-design-md (design-md/vercel/DESIGN.md)
description: Adapted from VoltAgent/awesome-design-md's Vercel design analysis for SlashSplit — a stark black-and-ink duet on a near-white canvas (#ffffff / #fafafa), crisp 1px hairline borders (#ebebeb), Geist geometric sans for display and UI, Geist Mono with tabular numerals (tabular-nums) for financial amounts and technical labels, emerald positive balance pills, and high-contrast red alerts for receipt-draft total mismatches.

colors:
  primary: "#171717"
  on-primary: "#ffffff"
  ink: "#171717"
  body: "#4d4d4d"
  mute: "#888888"
  hairline: "#ebebeb"
  hairline-strong: "#a1a1a1"
  canvas: "#ffffff"
  canvas-soft: "#fafafa"
  canvas-soft-2: "#f5f5f5"
  link: "#0070f3"
  link-deep: "#0761d1"
  link-bg-soft: "#d3e5ff"
  success: "#059669"
  success-soft: "#ecfdf5"
  success-deep: "#065f46"
  error: "#ee0000"
  error-soft: "#f7d4d6"
  error-deep: "#c50000"
  warning: "#f5a623"
  warning-soft: "#ffefcf"
  warning-deep: "#ab570a"
  violet: "#7928ca"
  violet-soft: "#d8ccf1"
  violet-deep: "#4c2889"
  cyan: "#50e3c2"
  cyan-soft: "#aaffec"
  cyan-deep: "#29bc9b"
  highlight-pink: "#ff0080"
  highlight-magenta: "#eb367f"
  gradient-develop-start: "#007cf0"
  gradient-develop-end: "#00dfd8"
  gradient-preview-start: "#7928ca"
  gradient-preview-end: "#ff0080"
  gradient-ship-start: "#ff4d4d"
  gradient-ship-end: "#f9cb28"
  selection-bg: "#171717"
  selection-fg: "#f2f2f2"

typography:
  display-xl:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 48px
    fontWeight: 600
    lineHeight: 48px
    letterSpacing: -2.4px
  display-lg:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: 40px
    letterSpacing: -1.28px
  display-md:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: -0.96px
  display-sm:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: -0.6px
  body-lg:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0px
  body-md:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-md-strong:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
  body-sm:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: -0.28px
  body-sm-strong:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: -0.28px
  money-tabular:
    fontFamily: Geist Mono, Geist, Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    fontVariantNumeric: tabular-nums
  caption:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  caption-mono:
    fontFamily: Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  code:
    fontFamily: Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  button-md:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  button-lg:
    fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill-sm: 64px
  pill: 100px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 40px
  3xl: 48px
  4xl: 64px
  5xl: 96px
  6xl: 128px
  section: 192px

components:
  nav-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: 64px
    padding: "{spacing.sm} {spacing.lg}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
    minHeight: 40px
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
    minHeight: 40px
  card-panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card-soft:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  form-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0px {spacing.sm}"
    height: 40px
  member-slash-chip-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  member-slash-chip-slashed:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.mute}"
    borderColor: "{colors.hairline}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  balance-badge-positive:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success-deep}"
    typography: "{typography.money-tabular}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  balance-badge-negative:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error-deep}"
    typography: "{typography.money-tabular}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  draft-mismatch-banner:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error-deep}"
    borderColor: "{colors.error}"
    typography: "{typography.body-sm-strong}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
---

# DESIGN.md — SlashSplit Design System (Vercel-Inspired from `VoltAgent/awesome-design-md`)

> Every AI coding agent generating or modifying UI in SlashSplit (`src/app/**/*.tsx`) MUST follow this specification.

## 1. Overview & Visual Posture

SlashSplit adopts the **Vercel design system** from [`VoltAgent/awesome-design-md`](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/vercel/DESIGN.md), tailored for high-precision roommate expense splitting and receipt review:

- **Stark Black-and-Ink Duet on Near-White Canvas**: Page background sits on `{colors.canvas-soft}` (`#fafafa` / `bg-zinc-50` in light mode, `bg-zinc-950` in dark mode); interactive cards sit on pure `{colors.canvas}` (`#ffffff` / `bg-white`, `dark:bg-zinc-900`) separated by crisp `1px` `{colors.hairline}` borders (`border-zinc-200 dark:border-zinc-800`).
- **Geist + Geist Mono Typography**: `Geist` (`--font-geist-sans`) carries all headings, body copy, labels, and buttons at weights `400`, `500`, and `600` with tight negative tracking on headings (`tracking-tight`). `Geist Mono` (`--font-geist-mono`) carries invite codes, API tokens (`ss_...`), OpenAPI paths, and tabular financial figures.
- **Tabular Financial Numerals (`tabular-nums`)**: Every dollar amount (`$21.00`), net balance (`+$20.00` / `-$15.00`), tax line, and item share MUST use `tabular-nums` (`font-variant-numeric: tabular-nums`) so columns of cents align vertically to the pixel.
- **Semantic Financial Status Only Where It Matters**:
  - **Primary CTA**: `{colors.primary}` (`#171717` / `bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`) is the sole primary conversion button across the app (`Save expense`, `Confirm expense`, `Create household`, `Mark paid`).
  - **Positive Balance (Owed to Roommate)**: `{colors.success}` (`text-emerald-700 dark:text-emerald-400`) with `+` prefix (`+$20.00`).
  - **Negative Balance (Owes Roommates) & Receipt Total Mismatch**: `{colors.error}` (`text-red-700 dark:text-red-400`, `border-red-300 bg-red-50`) for negative balances (`-$15.00`) and the receipt-draft mismatch warning banner (`role="status"`).

---

## 2. Color Tokens & Tailwind Mapping

| Semantic Token | Hex (Light) | Tailwind Utility (Light & Dark) | Usage |
|---|---|---|---|
| `{colors.canvas-soft}` | `#fafafa` | `bg-zinc-50 dark:bg-zinc-950` | Page background canvas |
| `{colors.canvas}` | `#ffffff` | `bg-white dark:bg-zinc-900` | Elevated cards (`Balances`, `Record an expense`, `Expenses`) |
| `{colors.hairline}` | `#ebebeb` | `border-zinc-200 dark:border-zinc-800` | 1px card borders, table dividers, form input borders |
| `{colors.ink}` | `#171717` | `text-zinc-900 dark:text-zinc-100` | Primary headings, item names, dollar totals |
| `{colors.body}` | `#4d4d4d` | `text-zinc-600 dark:text-zinc-400` | Secondary labels, dates, payer subtitles |
| `{colors.mute}` | `#888888` | `text-zinc-400 dark:text-zinc-500` | Slashed (excluded) roommate chips, placeholders |
| `{colors.primary}` | `#171717` | `bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900` | Primary buttons, active split-mode tabs, ticked member chips |
| `{colors.success}` | `#059669` | `text-emerald-700 dark:text-emerald-400` | Positive net balance (`+$20.00`) |
| `{colors.error}` | `#ee0000` | `text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40` | Negative net balance (`-$15.00`), receipt draft mismatch alert, form validation errors |

---

## 3. Typography & Hierarchy

| Role | Token | Tailwind Classes | Rules |
|---|---|---|---|
| Page Title (`h1`) | `{typography.display-md}` | `text-2xl font-semibold tracking-tight` | Sentence case, tight negative tracking |
| Section Header (`h2`) | `{typography.display-sm}` | `text-lg font-semibold tracking-tight` | Card section headings (`Balances`, `Record an expense`, `Expenses`) |
| Sub-header (`h3`) | `{typography.body-sm-strong}` | `text-sm font-semibold text-zinc-700 dark:text-zinc-300` | Sub-sections (`Suggested transfers`, `Items`, `Taxes`) |
| Body Copy | `{typography.body-sm}` | `text-sm text-zinc-600 dark:text-zinc-400` | Default descriptions and empty states |
| Money / Amounts | `{typography.money-tabular}` | `font-semibold tabular-nums` | Always formatted from integer cents via `formatCents(cents)` |
| Monospace Labels | `{typography.code}` | `font-mono text-xs` | Invite codes (`OAK12345`), Bearer tokens (`ss_...`), tax codes (`A`, `B`, `GST`) |

---

## 4. Layout, Spacing & Responsive Strategy (`360 px` Mobile → `1280 px` Desktop)

- **Base Spacing Unit**: `4 px` (`p-3` = 12px, `p-4` = 16px, `p-6` = 24px, `gap-4` = 16px, `gap-6` = 24px).
- **Container**: Centered max-width container (`mx-auto max-w-3xl px-4 py-8 sm:px-6`) so receipt review and itemized splitting remain scannable on both `360 px` phones (in the grocery store aisle) and `1280 px` desktop monitors.
- **Responsive Breakpoints**:
  - **Mobile (`360 px`, `< 640px`)**: Single-column vertical stack (`grid-cols-1`); item row inputs stack cleanly without horizontal overflow; touch targets (`<button>`, `<input>`, `<select>`, roommate slash pills) maintain a minimum `40–44 px` tap target area.
  - **Desktop (`1280 px`, `≥ 640px`)**: Multi-column form headers (`sm:grid-cols-3` for Merchant / Date / Paid by) and side-by-side summary rows (`sm:flex-row sm:items-center sm:justify-between`).

---

## 5. Signature SlashSplit Components

1. **Card Panel (`card-panel`)**:
   - `rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900`.
   - Uses Level 1/2 hairline border + subtle shadow — never heavy Material drop-shadows.
2. **Roommate Slash Chip (`member-slash-chip-active` / `member-slash-chip-slashed`)**:
   - Pill toggle (`rounded-full px-3 py-1 text-xs font-medium`) with `aria-pressed={included}` inside each receipt item's ` Shared by` fieldset.
   - **Included**: `bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`.
   - **Slashed (Excluded)**: `border border-zinc-300 bg-white text-zinc-400 line-through dark:border-zinc-700 dark:bg-zinc-900`.
3. **Balances & Settlement Row (`balance-badge-positive` / `balance-badge-negative`)**:
   - Net balances list each member with `tabular-nums`: positive (`+$20.00`) in emerald, negative (`-$15.00`) in red, settled (`$0.00`) in muted zinc.
   - Suggested transfers render inside a soft inset row (`bg-zinc-50 dark:bg-zinc-950`) with a right-aligned `Mark paid` button.
4. **Receipt Draft Mismatch Banner (`draft-mismatch-banner`)**:
   - When reviewing an AI-scanned `DRAFT` receipt where `sum(items.priceCents) + sum(taxes.amountCents) !== totalCents`, display a prominent red banner (`role="status"`, `aria-live="polite"`, `rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700`) and disable the `Confirm expense` primary CTA until the numbers reconcile.

---

## 6. Do's and Don'ts

### Do
- Reserve `{colors.primary}` (`bg-zinc-900 dark:bg-zinc-100`) for primary CTAs and active selection pills.
- Apply `tabular-nums` on every element displaying money, weights, or item counts.
- Use `1px` hairline borders (`border-zinc-200 dark:border-zinc-800`) to define cards, inputs, and list items.
- Announce validation errors, draft mismatches, and status updates inside `role="status"` / `aria-live="polite"` containers.
- Keep all interactive controls native (`<button>`, `<input>`, `<select>`, `<a>`) with explicit accessible labels.

### Don't
- Don't introduce arbitrary rainbow accent colors or heavy drop-shadows (`shadow-xl`, `shadow-2xl`).
- Don't render headlines in all-caps or weights above `600` (`font-semibold`).
- Don't allow horizontal page scrolling (`overflow-x`) at `360 px` mobile width.
- Don't format money with `toFixed(2)` on floats; always pass integer cents into `formatCents(cents)`.
