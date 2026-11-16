// Receipt extraction (#9): one Gemini call with a responseSchema (PLAN §6), the zod schema its reply
// must pass, and a fixture extractor so tests, E2E and previews never call Gemini.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { isCalendarDay } from "@/lib/schemas/expenses";

// Item prices may be negative (discount lines, PLAN §5.5); taxes and the total may not.
export const receiptExtractionSchema = z.object({
  merchant: z.string(),
  date: z.string().refine(isCalendarDay, "Use a real YYYY-MM-DD date."),
  items: z.array(
    z.object({
      name: z.string(),
      priceCents: z.number().int(),
      taxes: z.array(z.string()),
    }),
  ),
  taxes: z.array(z.object({ code: z.string(), amountCents: z.number().int().min(0) })),
  totalCents: z.number().int().min(0),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

// The same shape in Gemini's responseSchema dialect (an OpenAPI 3.0 subset).
export const receiptResponseSchema = {
  type: "OBJECT",
  properties: {
    merchant: { type: "STRING" },
    date: { type: "STRING", description: "Purchase date as YYYY-MM-DD." },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          priceCents: { type: "INTEGER", description: "Line price in integer cents." },
          taxes: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Codes of the taxes charged on this line, e.g. GST.",
          },
        },
        required: ["name", "priceCents", "taxes"],
      },
    },
    taxes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          code: { type: "STRING" },
          amountCents: { type: "INTEGER", description: "Tax amount in integer cents." },
        },
        required: ["code", "amountCents"],
      },
    },
    totalCents: { type: "INTEGER", description: "Receipt total in integer cents." },
  },
  required: ["merchant", "date", "items", "taxes", "totalCents"],
};

export type ReceiptImage = { bytes: Uint8Array; mimeType: string };
export type ReceiptExtractor = (image: ReceiptImage) => Promise<unknown>;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const PROMPT =
  "Extract this receipt: merchant, purchase date (YYYY-MM-DD), every line item with its price in " +
  "integer cents and the codes of taxes charged on it, each tax with its amount in integer cents, " +
  "and the total in integer cents.";

export const geminiExtractor: ReceiptExtractor = async ({ bytes, mimeType }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: receiptResponseSchema,
      },
    }),
  });
  if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}.`);
  const reply = await response.json();
  const text = reply?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini returned no receipt text.");
  return JSON.parse(text);
};

export function fixtureExtractor(name: string): ReceiptExtractor {
  return async () => {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Invalid receipt fixture name "${name}".`);
    const file = path.join(process.cwd(), "tests", "fixtures", "receipts", `${name}.json`);
    return JSON.parse(await readFile(file, "utf8"));
  };
}

// RECEIPT_EXTRACTOR=fixture:<name> works only outside production. Vercel previews build with
// NODE_ENV=production, so VERCEL_ENV decides there; NODE_ENV decides only when VERCEL_ENV is unset.
export function selectExtractor(env: {
  RECEIPT_EXTRACTOR?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
}): ReceiptExtractor {
  const fixture = env.RECEIPT_EXTRACTOR?.match(/^fixture:(.+)$/)?.[1];
  const nonProduction = env.VERCEL_ENV
    ? env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development"
    : env.NODE_ENV !== "production";
  return fixture && nonProduction ? fixtureExtractor(fixture) : geminiExtractor;
}
