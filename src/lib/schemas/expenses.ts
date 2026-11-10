// Request bodies and helpers for recording and editing expenses (#6). Shared by route handlers,
// server actions, and OpenAPI generation (#8). All amounts are integer cents.
import { z } from "zod";

const calendarDay = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

export const expenseItemSchema = z.object({
  name: z.string().trim().min(1, "Give every item a name.").max(100),
  priceCents: z.number().int("Item prices must be whole cents."),
  taxCodes: z.array(z.string().trim().min(1)).default([]),
  participantIds: z.array(z.string().trim().min(1)).min(1, "Tick at least one person per item."),
});

export const expenseTaxSchema = z.object({
  code: z.string().trim().min(1, "Give every tax a code.").max(20),
  amountCents: z.number().int("Tax amounts must be whole cents.").min(0, "Tax cannot be negative."),
});

export const expenseWeightSchema = z.object({
  userId: z.string().trim().min(1),
  weight: z.number().int().positive("Weights must be positive whole numbers."),
});

export const expenseBody = z.object({
  payerId: z.string().trim().min(1, "Choose who paid."),
  merchant: z
    .string()
    .trim()
    .min(1, "Enter the merchant name.")
    .max(100, "Keep the merchant name under 100 characters."),
  date: calendarDay,
  splitMode: z.enum(["ITEMIZED", "EQUAL", "RATIO"]).default("ITEMIZED"),
  totalCents: z.number().int("Total must be whole cents."),
  items: z.array(expenseItemSchema).default([]),
  taxes: z.array(expenseTaxSchema).default([]),
  weights: z.array(expenseWeightSchema).default([]),
});

export type ExpenseInput = z.infer<typeof expenseBody>;

// Builds YYYY-MM-DD in the caller's local timezone (AGENTS.md §1.6: never toISOString().slice(0, 10)).
export function localCalendarDay(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parses a dollar string like "12.50", "6", or "-3.25" into integer cents without floats.
export function parseDollarsToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, "");
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const dollars = Number.parseInt(match[2], 10);
  const centsDigits = (match[3] ?? "").padEnd(2, "0");
  const cents = Number.parseInt(centsDigits, 10);
  return sign * (dollars * 100 + cents);
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const rem = abs % 100;
  return `${sign}${currencyFormatter.format(whole + rem / 100)}`;
}
