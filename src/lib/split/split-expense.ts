// The three split modes (PLAN §5.4): EQUAL, RATIO and ITEMIZED. Each returns one share per member,
// in member order, and the shares add up to the expense total to the cent.
import { allocateByWeight, allocateTax, assertSumsTo, assertWholeCents, type TaxLine } from "./allocate";

export type Share = { userId: string; amountCents: number };
export type SplitItem = { priceCents: number; taxCodes: string[]; participantIds: string[] };

export function splitEqual(input: { memberIds: string[]; totalCents: number }): Share[] {
  const amounts = allocateByWeight(input.totalCents, input.memberIds.map(() => 1));
  return input.memberIds.map((userId, i) => ({ userId, amountCents: amounts[i] }));
}

export function splitByRatio(input: {
  weights: { userId: string; weight: number }[];
  totalCents: number;
}): Share[] {
  const amounts = allocateByWeight(
    input.totalCents,
    input.weights.map((w) => w.weight),
  );
  return input.weights.map((w, i) => ({ userId: w.userId, amountCents: amounts[i] }));
}

// Each item costs its price plus its share of every tax it carries (§5.2); that amount is split
// evenly among the item's participants (§5.3). Leftover cents follow member order, not the order
// participants were ticked, so the same receipt always gives the same shares.
export function splitItemized(input: {
  memberIds: string[];
  items: SplitItem[];
  taxes: TaxLine[];
}): Share[] {
  const { memberIds, items, taxes } = input;
  const position = new Map(memberIds.map((id, i) => [id, i]));

  const itemCents = items.map((item) => {
    assertWholeCents(item.priceCents, "item price");
    return item.priceCents;
  });
  for (const tax of taxes) {
    allocateTax(tax, items).forEach((cents, i) => (itemCents[i] += cents));
  }

  const totals = memberIds.map(() => 0);
  items.forEach((item, i) => {
    if (item.participantIds.length === 0) {
      throw new Error(`item ${i} has no participants`);
    }
    const seats = item.participantIds.map((id) => {
      const seat = position.get(id);
      if (seat === undefined) throw new Error(`participant ${id} is not a member`);
      return seat;
    });
    seats.sort((a, b) => a - b);
    const parts = allocateByWeight(itemCents[i], seats.map(() => 1));
    seats.forEach((seat, k) => (totals[seat] += parts[k]));
  });

  const expected =
    items.reduce((a, item) => a + item.priceCents, 0) + taxes.reduce((a, t) => a + t.amountCents, 0);
  assertSumsTo(totals, expected);
  return memberIds.map((userId, i) => ({ userId, amountCents: totals[i] }));
}
