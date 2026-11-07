// Stub so the red tests fail on assertions; the real rules land in the green commit (#5).
import type { TaxLine } from "./allocate";

export type Share = { userId: string; amountCents: number };
export type SplitItem = { priceCents: number; taxCodes: string[]; participantIds: string[] };

export function splitEqual(_input: { memberIds: string[]; totalCents: number }): Share[] {
  return [];
}

export function splitByRatio(_input: {
  weights: { userId: string; weight: number }[];
  totalCents: number;
}): Share[] {
  return [];
}

export function splitItemized(_input: {
  memberIds: string[];
  items: SplitItem[];
  taxes: TaxLine[];
}): Share[] {
  return [];
}
