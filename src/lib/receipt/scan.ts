// Receipt scanning (#9): stub so the Red tests compile; implemented in the Green commit.
import { z } from "zod";

export const receiptExtractionSchema = z.never();

export const receiptResponseSchema: Record<string, unknown> = {};

export type ReceiptImage = { bytes: Uint8Array; mimeType: string };
export type ReceiptExtractor = (image: ReceiptImage) => Promise<unknown>;

export const geminiExtractor: ReceiptExtractor = async () => {
  throw new Error("not implemented");
};

export function fixtureExtractor(name: string): ReceiptExtractor {
  void name;
  throw new Error("not implemented");
}

export function selectExtractor(env: {
  RECEIPT_EXTRACTOR?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
}): ReceiptExtractor {
  void env;
  throw new Error("not implemented");
}
