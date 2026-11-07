// Balances and the settlement plan (PLAN §5.6, US3): net = paid − owed + sent − received, and a
// greedy plan that settles everyone in at most n−1 transfers.
import { describe, expect, test } from "vitest";
import { computeBalances, planSettlement, type Balance, type Transfer } from "@/lib/split/balances";

const members = ["A", "B", "C"];
const asMap = (balances: Balance[]) =>
  Object.fromEntries(balances.map((b) => [b.userId, b.netCents]));

// The PLAN §5.3 receipt: A paid 2100, owes 800; B owes 800; C owes 500.
const groceries = {
  payerId: "A",
  totalCents: 2100,
  shares: [
    { userId: "A", amountCents: 800 },
    { userId: "B", amountCents: 800 },
    { userId: "C", amountCents: 500 },
  ],
};

// Apply transfers to balances: the sender's net goes up, the receiver's goes down.
function applyPlan(balances: Balance[], transfers: Transfer[]): Record<string, number> {
  const net = asMap(balances);
  for (const t of transfers) {
    net[t.fromUserId] += t.amountCents;
    net[t.toUserId] -= t.amountCents;
  }
  return net;
}

describe("computeBalances", () => {
  test("the payer is owed what the others' shares add up to", () => {
    const balances = computeBalances({ memberIds: members, expenses: [groceries], settlements: [] });
    expect(balances).toEqual([
      { userId: "A", netCents: 1300 },
      { userId: "B", netCents: -800 },
      { userId: "C", netCents: -500 },
    ]);
  });

  test("marking a transfer as paid updates both balances", () => {
    const balances = computeBalances({
      memberIds: members,
      expenses: [groceries],
      settlements: [{ fromUserId: "B", toUserId: "A", amountCents: 800 }],
    });
    expect(asMap(balances)).toEqual({ A: 500, B: 0, C: -500 });
  });

  test("a member with no expenses or transfers shows 0", () => {
    const balances = computeBalances({ memberIds: [...members, "D"], expenses: [groceries], settlements: [] });
    expect(asMap(balances).D).toBe(0);
  });

  test("expenses paid by different members net against each other", () => {
    const balances = computeBalances({
      memberIds: members,
      expenses: [
        groceries,
        {
          payerId: "B",
          totalCents: 900,
          shares: [
            { userId: "A", amountCents: 300 },
            { userId: "B", amountCents: 300 },
            { userId: "C", amountCents: 300 },
          ],
        },
      ],
      settlements: [],
    });
    expect(asMap(balances)).toEqual({ A: 1000, B: -200, C: -800 });
  });

  test("balances always add up to 0", () => {
    const balances = computeBalances({
      memberIds: members,
      expenses: [groceries],
      settlements: [{ fromUserId: "C", toUserId: "B", amountCents: 123 }],
    });
    expect(balances.reduce((a, b) => a + b.netCents, 0)).toBe(0);
  });

  test("rejects an expense whose shares don't add up to its total", () => {
    expect(() =>
      computeBalances({
        memberIds: members,
        expenses: [{ ...groceries, totalCents: 2000 }],
        settlements: [],
      }),
    ).toThrow();
  });

  test("rejects a payer, share or transfer from someone who is not a member", () => {
    expect(() =>
      computeBalances({ memberIds: members, expenses: [{ ...groceries, payerId: "Z" }], settlements: [] }),
    ).toThrow(/Z/);
    expect(() =>
      computeBalances({
        memberIds: members,
        expenses: [],
        settlements: [{ fromUserId: "A", toUserId: "Z", amountCents: 100 }],
      }),
    ).toThrow(/Z/);
  });
});

describe("planSettlement", () => {
  test("A +2000, B −500, C −1500: C pays A 1500, then B pays A 500", () => {
    const plan = planSettlement([
      { userId: "A", netCents: 2000 },
      { userId: "B", netCents: -500 },
      { userId: "C", netCents: -1500 },
    ]);
    expect(plan).toEqual([
      { fromUserId: "C", toUserId: "A", amountCents: 1500 },
      { fromUserId: "B", toUserId: "A", amountCents: 500 },
    ]);
  });

  test("when everyone is even there is nothing to transfer", () => {
    expect(
      planSettlement([
        { userId: "A", netCents: 0 },
        { userId: "B", netCents: 0 },
      ]),
    ).toEqual([]);
  });

  test("ties go to the earlier member", () => {
    const plan = planSettlement([
      { userId: "A", netCents: 500 },
      { userId: "B", netCents: 500 },
      { userId: "C", netCents: -500 },
      { userId: "D", netCents: -500 },
    ]);
    expect(plan).toEqual([
      { fromUserId: "C", toUserId: "A", amountCents: 500 },
      { fromUserId: "D", toUserId: "B", amountCents: 500 },
    ]);
  });

  test("the plan settles everyone in at most n−1 transfers", () => {
    const cases: number[][] = [
      [2000, -500, -1500],
      [1, -1],
      [700, 300, -250, -250, -500],
      [-1000, 400, 400, 200],
      [333, 333, 334, -1000],
      [5, -1, -1, -1, -1, -1],
    ];
    for (const nets of cases) {
      const balances = nets.map((netCents, i) => ({ userId: `M${i}`, netCents }));
      const plan = planSettlement(balances);
      expect(plan.length).toBeLessThanOrEqual(nets.length - 1);
      expect(plan.every((t) => t.amountCents > 0)).toBe(true);
      expect(Object.values(applyPlan(balances, plan)).every((n) => n === 0)).toBe(true);
    }
  });

  test("rejects balances that don't add up to 0", () => {
    expect(() =>
      planSettlement([
        { userId: "A", netCents: 100 },
        { userId: "B", netCents: -99 },
      ]),
    ).toThrow();
  });
});
