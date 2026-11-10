// Request body for recording a settlement transfer (#7) and signed-currency formatting.
import { z } from "zod";
import { formatCents } from "@/lib/schemas/expenses";

export const recordSettlementBody = z.object({
  fromUserId: z.string().trim().min(1, "Choose who paid."),
  toUserId: z.string().trim().min(1, "Choose who received the payment."),
  amountCents: z.number().int("Amount must be whole cents.").positive("Amount must be positive."),
});

export type RecordSettlementInput = z.infer<typeof recordSettlementBody>;

export function formatSignedCents(cents: number): string {
  if (cents > 0) return `+${formatCents(cents)}`;
  return formatCents(cents);
}
