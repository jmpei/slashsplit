// Largest-remainder rounding and tax allocation (PLAN §5.1, §5.2): every cent of the input lands
// in exactly one output share.
import { describe, expect, test } from "vitest";
import { allocateByWeight, allocateTax } from "@/lib/split/allocate";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("allocateByWeight", () => {
  test("1000 cents over 3 people is 334 / 333 / 333", () => {
    expect(allocateByWeight(1000, [1, 1, 1])).toEqual([334, 333, 333]);
  });

  test("leftover cents go to the earliest members first", () => {
    expect(allocateByWeight(1001, [1, 1, 1])).toEqual([334, 334, 333]);
  });

  test("an amount that divides evenly has no leftover", () => {
    expect(allocateByWeight(900, [1, 1, 1])).toEqual([300, 300, 300]);
  });

  test("weights 40 / 30 / 30 split 1000 as 400 / 300 / 300", () => {
    expect(allocateByWeight(1000, [40, 30, 30])).toEqual([400, 300, 300]);
  });

  test("the leftover cent goes to the largest fractional part, not the first member", () => {
    // Exact shares 333.67 / 666.33: floors 333 / 666, the spare cent goes to the .67.
    expect(allocateByWeight(1000, [1001, 1999])).toEqual([334, 666]);
  });

  test("a weight of 0 gets nothing", () => {
    expect(allocateByWeight(1000, [1, 0, 1])).toEqual([500, 0, 500]);
  });

  test("a negative amount splits like the positive one with the sign flipped", () => {
    expect(allocateByWeight(-1000, [1, 1, 1])).toEqual([-334, -333, -333]);
  });

  test("shares always add up to the total", () => {
    const weightSets = [[1], [1, 1], [1, 1, 1], [3, 2, 2], [40, 30, 30], [7, 0, 13, 1], [499, 299]];
    for (const total of [0, 1, 2, 99, 100, 101, 1000, 12345, -1, -7, -1001]) {
      for (const weights of weightSets) {
        expect(sum(allocateByWeight(total, weights))).toBe(total);
      }
    }
  });

  test("rejects amounts that are not whole cents", () => {
    expect(() => allocateByWeight(10.5, [1, 1])).toThrow();
  });

  test("rejects weights that are negative, fractional, or all zero", () => {
    expect(() => allocateByWeight(100, [1, -1])).toThrow();
    expect(() => allocateByWeight(100, [0.5, 1])).toThrow();
    expect(() => allocateByWeight(100, [0, 0])).toThrow();
    expect(() => allocateByWeight(100, [])).toThrow();
  });
});

describe("allocateTax", () => {
  test("GST 50 over items 499 and 299 is 31 / 19", () => {
    const items = [
      { priceCents: 499, taxCodes: ["GST"] },
      { priceCents: 299, taxCodes: ["GST"] },
    ];
    expect(allocateTax({ code: "GST", amountCents: 50 }, items)).toEqual([31, 19]);
  });

  test("an item without the tax code gets none of it", () => {
    const items = [
      { priceCents: 499, taxCodes: ["GST"] },
      { priceCents: 600, taxCodes: [] },
      { priceCents: 299, taxCodes: ["GST", "PST"] },
    ];
    expect(allocateTax({ code: "GST", amountCents: 50 }, items)).toEqual([31, 0, 19]);
    expect(allocateTax({ code: "PST", amountCents: 21 }, items)).toEqual([0, 0, 21]);
  });

  test("a discount line takes no share of tax", () => {
    // The receipt's tax line already reflects the discount.
    const items = [
      { priceCents: 1000, taxCodes: ["GST"] },
      { priceCents: -200, taxCodes: ["GST"] },
    ];
    expect(allocateTax({ code: "GST", amountCents: 40 }, items)).toEqual([40, 0]);
  });

  test("rejects a tax that no item carries", () => {
    const items = [{ priceCents: 499, taxCodes: [] }];
    expect(() => allocateTax({ code: "GST", amountCents: 25 }, items)).toThrow(/GST/);
  });
});
