// Stub so the red tests fail on assertions; the real rules land in the green commit (#7).
export type Balance = { userId: string; netCents: number };
export type Transfer = { fromUserId: string; toUserId: string; amountCents: number };
export type ExpenseRecord = {
  payerId: string;
  totalCents: number;
  shares: { userId: string; amountCents: number }[];
};

export function computeBalances(_input: {
  memberIds: string[];
  expenses: ExpenseRecord[];
  settlements: Transfer[];
}): Balance[] {
  return [];
}

export function planSettlement(_balances: Balance[]): Transfer[] {
  return [{ fromUserId: "", toUserId: "", amountCents: 0 }];
}
