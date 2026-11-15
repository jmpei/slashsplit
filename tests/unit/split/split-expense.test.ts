// The three split modes (PLAN §5.3–5.5): EQUAL, RATIO, ITEMIZED. Shares come back in member order
// and always add up to the expense total.
import { describe, expect, test } from "vitest";
import { splitByRatio, splitEqual, splitItemized, type Share } from "@/lib/split/split-expense";

const members = ["A", "B", "C"];
const total = (shares: Share[]) => shares.reduce((a, s) => a + s.amountCents, 0);
const asMap = (shares: Share[]) => Object.fromEntries(shares.map((s) => [s.userId, s.amountCents]));

describe("splitEqual", () => {
  test("splits 1000 among three members as 334 / 333 / 333 in member order", () => {
    expect(splitEqual({ memberIds: members, totalCents: 1000 })).toEqual([
      { userId: "A", amountCents: 334 },
      { userId: "B", amountCents: 333 },
      { userId: "C", amountCents: 333 },
    ]);
  });
});

describe("splitByRatio", () => {
  test("rent of 2000.00 at 40 / 30 / 30 is 800.00 / 600.00 / 600.00", () => {
    const shares = splitByRatio({
      weights: [
        { userId: "A", weight: 40 },
        { userId: "B", weight: 30 },
        { userId: "C", weight: 30 },
      ],
      totalCents: 200000,
    });
    expect(asMap(shares)).toEqual({ A: 80000, B: 60000, C: 60000 });
  });

  test("a member with weight 0 pays nothing and the rest still add up", () => {
    const shares = splitByRatio({
      weights: [
        { userId: "A", weight: 1 },
        { userId: "B", weight: 0 },
        { userId: "C", weight: 2 },
      ],
      totalCents: 1000,
    });
    expect(asMap(shares)).toEqual({ A: 333, B: 0, C: 667 });
    expect(total(shares)).toBe(1000);
  });
});

describe("splitItemized", () => {
  test("the worked example gives A 800, B 800, C 500", () => {
    const shares = splitItemized({
      memberIds: members,
      items: [
        { priceCents: 600, taxCodes: [], participantIds: ["A", "B", "C"] }, // milk
        { priceCents: 1200, taxCodes: [], participantIds: ["A", "B"] }, // beer, C doesn't drink
        { priceCents: 300, taxCodes: [], participantIds: ["C"] }, // yogurt, only C
      ],
      taxes: [],
    });
    expect(shares).toEqual([
      { userId: "A", amountCents: 800 },
      { userId: "B", amountCents: 800 },
      { userId: "C", amountCents: 500 },
    ]);
  });

  test("a slashed member pays nothing for that item", () => {
    const shares = splitItemized({
      memberIds: members,
      items: [{ priceCents: 1200, taxCodes: [], participantIds: ["A", "B"] }],
      taxes: [],
    });
    expect(asMap(shares)).toEqual({ A: 600, B: 600, C: 0 });
  });

  test("an item with one member is paid by that member alone", () => {
    const shares = splitItemized({
      memberIds: members,
      items: [{ priceCents: 777, taxCodes: [], participantIds: ["B"] }],
      taxes: [],
    });
    expect(asMap(shares)).toEqual({ A: 0, B: 777, C: 0 });
  });

  test("tax is added to the items that carry it before the item is split", () => {
    const shares = splitItemized({
      memberIds: members,
      items: [
        { priceCents: 499, taxCodes: ["GST"], participantIds: ["A", "B"] }, // chips + 31 GST
        { priceCents: 299, taxCodes: ["GST"], participantIds: ["C"] }, // soda + 19 GST
        { priceCents: 600, taxCodes: [], participantIds: ["A", "B", "C"] }, // milk, no tax
      ],
      taxes: [{ code: "GST", amountCents: 50 }],
    });
    expect(asMap(shares)).toEqual({ A: 465, B: 465, C: 518 });
    expect(total(shares)).toBe(499 + 299 + 600 + 50);
  });

  test("a discount line lowers the shares of its participants", () => {
    const shares = splitItemized({
      memberIds: members,
      items: [
        { priceCents: 1000, taxCodes: [], participantIds: ["A", "B"] },
        { priceCents: -200, taxCodes: [], participantIds: ["A", "B"] },
      ],
      taxes: [],
    });
    expect(asMap(shares)).toEqual({ A: 400, B: 400, C: 0 });
  });

  test("leftover cents inside an item follow member order, not the order participants were ticked", () => {
    const shares = splitItemized({
      memberIds: members,
      items: [{ priceCents: 101, taxCodes: [], participantIds: ["C", "A"] }],
      taxes: [],
    });
    expect(asMap(shares)).toEqual({ A: 51, B: 0, C: 50 });
  });

  test("shares add up to items plus taxes to the cent", () => {
    const shares = splitItemized({
      memberIds: ["A", "B", "C", "D"],
      items: [
        { priceCents: 1999, taxCodes: ["GST", "PST"], participantIds: ["A", "B", "C"] },
        { priceCents: 349, taxCodes: ["GST"], participantIds: ["D"] },
        { priceCents: 1, taxCodes: [], participantIds: ["A", "B", "C", "D"] },
        { priceCents: -150, taxCodes: [], participantIds: ["B", "D"] },
        { priceCents: 733, taxCodes: ["PST"], participantIds: ["A", "C", "D"] },
      ],
      taxes: [
        { code: "GST", amountCents: 117 },
        { code: "PST", amountCents: 191 },
      ],
    });
    expect(total(shares)).toBe(1999 + 349 + 1 - 150 + 733 + 117 + 191);
  });

  test("rejects an item nobody shares", () => {
    expect(() =>
      splitItemized({
        memberIds: members,
        items: [{ priceCents: 500, taxCodes: [], participantIds: [] }],
        taxes: [],
      }),
    ).toThrow();
  });

  test("rejects a participant who is not a member", () => {
    expect(() =>
      splitItemized({
        memberIds: members,
        items: [{ priceCents: 500, taxCodes: [], participantIds: ["A", "Z"] }],
        taxes: [],
      }),
    ).toThrow(/Z/);
  });
});
