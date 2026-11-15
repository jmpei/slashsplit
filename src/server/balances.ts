// Balances and settlement service (#7): loads household members, confirmed expenses and recorded
// transfers from Postgres and feeds them to the pure functions in src/lib/split/balances.ts.
import { prisma } from "@/lib/db";
import type { RecordSettlementInput } from "@/lib/schemas/settlements";
import { computeBalances, planSettlement, type Balance, type Transfer } from "@/lib/split/balances";
import { ValidationError } from "@/server/expenses";
import { listMembers } from "@/server/households";

export type SettlementRecord = {
  id: string;
  householdId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  paidAt: string;
};

export async function getHouseholdBalances(householdId: string): Promise<Balance[]> {
  const [members, expenses, settlements] = await Promise.all([
    listMembers(householdId),
    prisma.expense.findMany({
      where: { householdId, status: "CONFIRMED" },
      include: { shares: true },
    }),
    prisma.settlement.findMany({
      where: { householdId },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  return computeBalances({
    memberIds: members.map((m) => m.userId),
    expenses: expenses.map((e) => ({
      payerId: e.payerId,
      totalCents: e.totalCents,
      shares: e.shares.map((s) => ({ userId: s.userId, amountCents: s.amountCents })),
    })),
    settlements: settlements.map((s) => ({
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amountCents: s.amountCents,
    })),
  });
}

export async function getHouseholdSettlementPlan(householdId: string): Promise<Transfer[]> {
  const balances = await getHouseholdBalances(householdId);
  return planSettlement(balances);
}

export async function recordSettlement(
  householdId: string,
  input: RecordSettlementInput,
): Promise<SettlementRecord> {
  if (input.fromUserId === input.toUserId) {
    throw new ValidationError("A member cannot settle a transfer to themselves.");
  }
  const members = await listMembers(householdId);
  const memberSet = new Set(members.map((m) => m.userId));
  if (!memberSet.has(input.fromUserId) || !memberSet.has(input.toUserId)) {
    throw new ValidationError("Both members of a settlement must belong to this household.");
  }

  const created = await prisma.settlement.create({
    data: {
      householdId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      amountCents: input.amountCents,
    },
  });

  return {
    id: created.id,
    householdId: created.householdId,
    fromUserId: created.fromUserId,
    toUserId: created.toUserId,
    amountCents: created.amountCents,
    paidAt: created.paidAt.toISOString(),
  };
}
