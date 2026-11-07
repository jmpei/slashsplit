// Stub so the red tests fail on assertions; the real rules land in the green commit (#5).
export type TaxLine = { code: string; amountCents: number };
export type TaxableItem = { priceCents: number; taxCodes: string[] };

export function allocateByWeight(_totalCents: number, _weights: number[]): number[] {
  return [];
}

export function allocateTax(_tax: TaxLine, _items: TaxableItem[]): number[] {
  return [];
}
