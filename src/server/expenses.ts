// Expense service (#6): create, list, view, edit and delete expenses inside a household.
// Computes shares through the pure split functions in src/lib/split/ and stores plain integer cents.
import { prisma } from "@/lib/db";
import type { ExpenseInput } from "@/lib/schemas/expenses";
import { splitByRatio, splitEqual, splitItemized, type Share } from "@/lib/split/split-expense";
import { listMembers, NotFoundError } from "@/server/households";

export class ValidationError extends Error {}

export type ExpenseRecord = {
  id: string;
  householdId: string;
  payerId: string;
  merchant: string;
  date: string;
  totalCents: number;
  splitMode: "EQUAL" | "RATIO" | "ITEMIZED";
  status: "DRAFT" | "CONFIRMED";
  receiptUrl: string | null;
  items: {
    id: string;
    name: string;
    priceCents: number;
    taxCodes: string[];
    participantIds: string[];
  }[];
  taxes: { code: string; amountCents: number }[];
  weights: { userId: string; weight: number }[];
  shares: Share[];
};

function computeSharesForInput(memberIds: string[], input: ExpenseInput): Share[] {
  const memberSet = new Set(memberIds);
  if (!memberSet.has(input.payerId)) {
    throw new ValidationError("The payer must be a member of this household.");
  }

  if (input.splitMode === "EQUAL") {
    if (input.totalCents <= 0) {
      throw new ValidationError("Enter a positive total amount.");
    }
    return splitEqual({ memberIds, totalCents: input.totalCents });
  }

  if (input.splitMode === "RATIO") {
    if (input.totalCents <= 0) {
      throw new ValidationError("Enter a positive total amount.");
    }
    if (input.weights.length === 0) {
      throw new ValidationError("Provide weights for the ratio split.");
    }
    for (const w of input.weights) {
      if (!memberSet.has(w.userId)) {
        throw new ValidationError("Every weighted participant must belong to this household.");
      }
    }
    return splitByRatio({ weights: input.weights, totalCents: input.totalCents });
  }

  // ITEMIZED
  if (input.items.length === 0) {
    throw new ValidationError("Add at least one item.");
  }
  const itemsSum = input.items.reduce((acc, item) => acc + item.priceCents, 0);
  const taxesSum = input.taxes.reduce((acc, tax) => acc + tax.amountCents, 0);
  if (itemsSum + taxesSum !== input.totalCents) {
    throw new ValidationError(
      `Items (${itemsSum}) plus taxes (${taxesSum}) must equal the total (${input.totalCents}).`,
    );
  }
  try {
    return splitItemized({
      memberIds,
      items: input.items.map((item) => ({
        priceCents: item.priceCents,
        taxCodes: item.taxCodes,
        participantIds: item.participantIds,
      })),
      taxes: input.taxes,
    });
  } catch (error) {
    throw new ValidationError(error instanceof Error ? error.message : "Invalid split.");
  }
}

const expenseInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: { participants: true },
  },
  taxes: { orderBy: { sortOrder: "asc" as const } },
  weights: true,
  shares: true,
};

function formatExpense(
  row: {
    id: string;
    householdId: string;
    payerId: string;
    merchant: string;
    date: string;
    totalCents: number;
    splitMode: "EQUAL" | "RATIO" | "ITEMIZED";
    status: "DRAFT" | "CONFIRMED";
    receiptUrl: string | null;
    items: {
      id: string;
      name: string;
      priceCents: number;
      taxCodes: string[];
      participants: { userId: string }[];
    }[];
    taxes: { code: string; amountCents: number }[];
    weights: { userId: string; weight: number }[];
    shares: { userId: string; amountCents: number }[];
  },
  memberIds: string[],
): ExpenseRecord {
  const order = new Map(memberIds.map((id, idx) => [id, idx]));
  const sortedShares = [...row.shares]
    .sort((a, b) => (order.get(a.userId) ?? 999) - (order.get(b.userId) ?? 999))
    .map((s) => ({ userId: s.userId, amountCents: s.amountCents }));
  return {
    id: row.id,
    householdId: row.householdId,
    payerId: row.payerId,
    merchant: row.merchant,
    date: row.date,
    totalCents: row.totalCents,
    splitMode: row.splitMode,
    status: row.status,
    receiptUrl: row.receiptUrl,
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      taxCodes: item.taxCodes,
      participantIds: item.participants
        .map((p) => p.userId)
        .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999)),
    })),
    taxes: row.taxes.map((t) => ({ code: t.code, amountCents: t.amountCents })),
    weights: row.weights.map((w) => ({ userId: w.userId, weight: w.weight })),
    shares: sortedShares,
  };
}

export async function createExpense(
  householdId: string,
  input: ExpenseInput,
): Promise<ExpenseRecord> {
  const members = await listMembers(householdId);
  const memberIds = members.map((m) => m.userId);
  const shares = computeSharesForInput(memberIds, input);

  const created = await prisma.expense.create({
    data: {
      householdId,
      payerId: input.payerId,
      merchant: input.merchant,
      date: input.date,
      totalCents: input.totalCents,
      splitMode: input.splitMode,
      status: "CONFIRMED",
      items: {
        create: input.items.map((item, idx) => ({
          name: item.name,
          priceCents: item.priceCents,
          taxCodes: item.taxCodes,
          sortOrder: idx,
          participants: {
            create: [...new Set(item.participantIds)].map((userId) => ({ userId })),
          },
        })),
      },
      taxes: {
        create: input.taxes.map((tax, idx) => ({
          code: tax.code,
          amountCents: tax.amountCents,
          sortOrder: idx,
        })),
      },
      weights: {
        create: input.weights.map((w) => ({
          userId: w.userId,
          weight: w.weight,
        })),
      },
      shares: {
        create: shares.map((s) => ({
          userId: s.userId,
          amountCents: s.amountCents,
        })),
      },
    },
    include: expenseInclude,
  });

  return formatExpense(created, memberIds);
}

export async function listExpenses(householdId: string): Promise<ExpenseRecord[]> {
  const [members, rows] = await Promise.all([
    listMembers(householdId),
    prisma.expense.findMany({
      where: { householdId },
      include: expenseInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const memberIds = members.map((m) => m.userId);
  return rows.map((row) => formatExpense(row, memberIds));
}

export async function getExpense(householdId: string, expenseId: string): Promise<ExpenseRecord> {
  const [members, row] = await Promise.all([
    listMembers(householdId),
    prisma.expense.findFirst({
      where: { id: expenseId, householdId },
      include: expenseInclude,
    }),
  ]);
  if (!row) throw new NotFoundError("Expense not found.");
  return formatExpense(row, members.map((m) => m.userId));
}

export async function updateExpense(
  householdId: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<ExpenseRecord> {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, householdId },
  });
  if (!existing) throw new NotFoundError("Expense not found.");

  const members = await listMembers(householdId);
  const memberIds = members.map((m) => m.userId);
  const shares = computeSharesForInput(memberIds, input);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.expenseItem.deleteMany({ where: { expenseId } });
    await tx.expenseTax.deleteMany({ where: { expenseId } });
    await tx.expenseWeight.deleteMany({ where: { expenseId } });
    await tx.expenseShare.deleteMany({ where: { expenseId } });

    return tx.expense.update({
      where: { id: expenseId },
      data: {
        payerId: input.payerId,
        merchant: input.merchant,
        date: input.date,
        totalCents: input.totalCents,
        splitMode: input.splitMode,
        items: {
          create: input.items.map((item, idx) => ({
            name: item.name,
            priceCents: item.priceCents,
            taxCodes: item.taxCodes,
            sortOrder: idx,
            participants: {
              create: [...new Set(item.participantIds)].map((userId) => ({ userId })),
            },
          })),
        },
        taxes: {
          create: input.taxes.map((tax, idx) => ({
            code: tax.code,
            amountCents: tax.amountCents,
            sortOrder: idx,
          })),
        },
        weights: {
          create: input.weights.map((w) => ({
            userId: w.userId,
            weight: w.weight,
          })),
        },
        shares: {
          create: shares.map((s) => ({
            userId: s.userId,
            amountCents: s.amountCents,
          })),
        },
      },
      include: expenseInclude,
    });
  });

  return formatExpense(updated, memberIds);
}

export async function deleteExpense(householdId: string, expenseId: string): Promise<void> {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, householdId },
  });
  if (!existing) throw new NotFoundError("Expense not found.");
  await prisma.expense.delete({ where: { id: expenseId } });
}
