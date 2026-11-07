// Largest-remainder rounding (PLAN §5.1) and tax allocation (§5.2). Integer math only, so every
// cent of the input lands in exactly one output share.

export type TaxLine = { code: string; amountCents: number };
export type TaxableItem = { priceCents: number; taxCodes: string[] };

export function assertWholeCents(amountCents: number, label = "amount"): void {
  if (!Number.isSafeInteger(amountCents)) {
    throw new Error(`${label} must be whole cents, got ${amountCents}`);
  }
}

export function assertSumsTo(shares: number[], totalCents: number): void {
  const sum = shares.reduce((a, b) => a + b, 0);
  if (sum !== totalCents) {
    throw new Error(`shares add up to ${sum}, expected ${totalCents}`);
  }
}

// Each share gets floor(total × weight / Σweights); the cents left over go one each to the
// largest remainders, ties to the earlier position (= earlier member).
// A negative total is split as its absolute value, then negated, so -1000 mirrors 1000.
export function allocateByWeight(totalCents: number, weights: number[]): number[] {
  assertWholeCents(totalCents, "total");
  if (weights.some((w) => !Number.isSafeInteger(w) || w < 0)) {
    throw new Error("weights must be non-negative integers");
  }
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum === 0) {
    throw new Error("weights must not all be zero");
  }
  if (totalCents < 0) {
    return allocateByWeight(-totalCents, weights).map((s) => -s || 0);
  }

  const shares = weights.map((w) => Math.floor((totalCents * w) / weightSum));
  const remainders = weights.map((w, i) => totalCents * w - shares[i] * weightSum);
  let leftover = totalCents - shares.reduce((a, b) => a + b, 0);
  const order = weights.map((_, i) => i).sort((a, b) => remainders[b] - remainders[a] || a - b);
  for (const i of order) {
    if (leftover === 0) break;
    shares[i] += 1;
    leftover -= 1;
  }

  assertSumsTo(shares, totalCents);
  return shares;
}

// Spread one tax line over the items that carry its code, in proportion to price. A discount line
// (negative price) takes no share: the receipt's tax amount already reflects the discount.
export function allocateTax(tax: TaxLine, items: TaxableItem[]): number[] {
  assertWholeCents(tax.amountCents, `${tax.code} amount`);
  const weights = items.map((item) =>
    item.taxCodes.includes(tax.code) && item.priceCents > 0 ? item.priceCents : 0,
  );
  if (weights.every((w) => w === 0)) {
    throw new Error(`no item carries tax ${tax.code}`);
  }
  return allocateByWeight(tax.amountCents, weights);
}
