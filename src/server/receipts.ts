// Receipt scan service (#9): runs the extractor, validates its untrusted reply with zod, and saves a
// DRAFT expense. A reply that fails validation (or an extractor error) becomes an empty draft with
// scanError, so the payer can still fill it in by hand. Drafts never affect balances.
import { prisma } from "@/lib/db";
import {
  receiptExtractionSchema,
  type ReceiptExtraction,
  type ReceiptExtractor,
  type ReceiptImage,
} from "@/lib/receipt/scan";
import { localCalendarDay } from "@/lib/schemas/expenses";
import { getExpense, type ExpenseRecord } from "@/server/expenses";
import { listMembers } from "@/server/households";

// Users see only this; the reason (which may name configuration) goes to the server log.
export const SCAN_FAILED_MESSAGE = "We couldn’t read this receipt.";

async function extract(
  extractor: ReceiptExtractor,
  image: ReceiptImage,
): Promise<{ receipt: ReceiptExtraction } | { error: string }> {
  let reply: unknown;
  try {
    reply = await extractor(image);
  } catch (error) {
    console.error("Receipt scan failed:", error);
    return { error: SCAN_FAILED_MESSAGE };
  }
  const parsed = receiptExtractionSchema.safeParse(reply);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "reply"}: ${issue.message}`)
      .join("; ");
    console.error(`Receipt scan reply failed validation: ${reason}`);
    return { error: SCAN_FAILED_MESSAGE };
  }
  return { receipt: parsed.data };
}

export async function scanReceiptToDraft(
  householdId: string,
  payerId: string,
  image: ReceiptImage,
  extractor: ReceiptExtractor,
): Promise<ExpenseRecord> {
  const result = await extract(extractor, image);
  const memberIds = (await listMembers(householdId)).map((m) => m.userId);

  const receipt: ReceiptExtraction =
    "receipt" in result
      ? result.receipt
      : { merchant: "", date: localCalendarDay(), items: [], taxes: [], totalCents: 0 };

  const created = await prisma.expense.create({
    data: {
      householdId,
      payerId,
      merchant: receipt.merchant,
      date: receipt.date,
      totalCents: receipt.totalCents,
      splitMode: "ITEMIZED",
      status: "DRAFT",
      scanError: "error" in result ? result.error : null,
      items: {
        create: receipt.items.map((item, idx) => ({
          name: item.name,
          priceCents: item.priceCents,
          taxCodes: item.taxes,
          sortOrder: idx,
          participants: { create: memberIds.map((userId) => ({ userId })) },
        })),
      },
      taxes: {
        create: receipt.taxes.map((tax, idx) => ({
          code: tax.code,
          amountCents: tax.amountCents,
          sortOrder: idx,
        })),
      },
    },
  });

  return getExpense(householdId, created.id);
}
