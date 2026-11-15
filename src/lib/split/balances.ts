// Net balances and the settlement plan (PLAN §5.6). Positive net = others owe this member;
// negative = this member owes. Pure functions over plain records, integer cents only.

export type Balance = { userId: string; netCents: number };
export type Transfer = { fromUserId: string; toUserId: string; amountCents: number };
export type ExpenseRecord = {
  payerId: string;
  totalCents: number;
  shares: { userId: string; amountCents: number }[];
};

// net = paid − owed + sent − received
export function computeBalances(input: {
  memberIds: string[];
  expenses: ExpenseRecord[];
  settlements: Transfer[];
}): Balance[] {
  const net = new Map(input.memberIds.map((id) => [id, 0]));
  const add = (userId: string, cents: number) => {
    const current = net.get(userId);
    if (current === undefined) throw new Error(`${userId} is not a member`);
    if (!Number.isSafeInteger(cents)) throw new Error(`amount must be whole cents, got ${cents}`);
    net.set(userId, current + cents);
  };

  for (const expense of input.expenses) {
    const owed = expense.shares.reduce((a, s) => a + s.amountCents, 0);
    if (owed !== expense.totalCents) {
      throw new Error(`shares add up to ${owed}, expected ${expense.totalCents}`);
    }
    add(expense.payerId, expense.totalCents);
    for (const share of expense.shares) add(share.userId, -share.amountCents);
  }
  for (const t of input.settlements) {
    add(t.fromUserId, t.amountCents);
    add(t.toUserId, -t.amountCents);
  }

  return input.memberIds.map((userId) => ({ userId, netCents: net.get(userId)! }));
}

// Greedy: the member who owes the most pays the member owed the most, the smaller of the two
// amounts. Each transfer zeroes at least one member, so n members need at most n−1 transfers.
// Not always the global minimum (that is NP-hard); fine for a household. Ties go to the earlier
// member so the plan is stable.
export function planSettlement(balances: Balance[]): Transfer[] {
  const sum = balances.reduce((a, b) => a + b.netCents, 0);
  if (sum !== 0) throw new Error(`balances add up to ${sum}, expected 0`);

  const net = balances.map((b) => b.netCents);
  const pick = (better: (a: number, b: number) => boolean) =>
    net.reduce((best, n, i) => (better(n, net[best]) ? i : best), 0);

  const transfers: Transfer[] = [];
  if (net.length === 0) return transfers;
  for (;;) {
    const debtor = pick((a, b) => a < b);
    const creditor = pick((a, b) => a > b);
    const amountCents = Math.min(-net[debtor], net[creditor]);
    if (amountCents <= 0) return transfers;
    transfers.push({
      fromUserId: balances[debtor].userId,
      toUserId: balances[creditor].userId,
      amountCents,
    });
    net[debtor] += amountCents;
    net[creditor] -= amountCents;
  }
}
