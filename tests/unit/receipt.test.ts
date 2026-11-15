// Receipt extraction (#9): the zod schema for Gemini's reply, which extractor each environment
// uses, and the shape of the single Gemini request. fetch is mocked; no test calls Gemini.
import { afterEach, describe, expect, test, vi } from "vitest";
import costco from "../fixtures/receipts/costco.json";
import malformed from "../fixtures/receipts/malformed.json";
import mismatch from "../fixtures/receipts/mismatch.json";
import {
  geminiExtractor,
  receiptExtractionSchema,
  receiptResponseSchema,
  selectExtractor,
} from "@/lib/receipt/scan";

const image = { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("receiptExtractionSchema", () => {
  test("accepts the costco receipt", () => {
    expect(receiptExtractionSchema.safeParse(costco).success).toBe(true);
  });

  test("accepts a receipt whose items and taxes don't add up to the total", () => {
    expect(receiptExtractionSchema.safeParse(mismatch).success).toBe(true);
  });

  test("rejects a reply without items", () => {
    expect(receiptExtractionSchema.safeParse(malformed).success).toBe(false);
  });

  test("rejects non-integer cents and a date that isn't YYYY-MM-DD", () => {
    expect(receiptExtractionSchema.safeParse({ ...costco, totalCents: 11.23 }).success).toBe(false);
    expect(receiptExtractionSchema.safeParse({ ...costco, date: "Nov 1, 2026" }).success).toBe(false);
  });
});

describe("selectExtractor", () => {
  test("returns the fixture extractor outside production", async () => {
    const extractor = selectExtractor({ RECEIPT_EXTRACTOR: "fixture:costco", NODE_ENV: "test" });
    expect(extractor).not.toBe(geminiExtractor);
    expect(await extractor(image)).toEqual(costco);
  });

  test("returns Gemini when no fixture is requested", () => {
    expect(selectExtractor({ NODE_ENV: "development" })).toBe(geminiExtractor);
  });

  test("returns Gemini for a production build without VERCEL_ENV, even with a fixture set", () => {
    expect(selectExtractor({ RECEIPT_EXTRACTOR: "fixture:costco", NODE_ENV: "production" })).toBe(
      geminiExtractor,
    );
  });

  test("returns Gemini for VERCEL_ENV=production even when RECEIPT_EXTRACTOR is set", () => {
    expect(
      selectExtractor({
        RECEIPT_EXTRACTOR: "fixture:costco",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBe(geminiExtractor);
  });

  test("returns the fixture for VERCEL_ENV=preview (built with NODE_ENV=production)", async () => {
    const extractor = selectExtractor({
      RECEIPT_EXTRACTOR: "fixture:mismatch",
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
    });
    expect(extractor).not.toBe(geminiExtractor);
    expect(await extractor(image)).toEqual(mismatch);
  });
});

describe("geminiExtractor", () => {
  test("sends one request with responseSchema and the key in the x-goog-api-key header", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-123");
    const fetchMock = vi.fn(async () =>
      Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(costco) }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(geminiExtractor(image)).resolves.toEqual(costco);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(url).not.toContain("test-key-123");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("test-key-123");

    const body = JSON.parse(String(init.body));
    expect(body.generationConfig).toEqual({
      responseMimeType: "application/json",
      responseSchema: receiptResponseSchema,
    });
    expect(receiptResponseSchema).toMatchObject({
      type: "OBJECT",
      required: expect.arrayContaining(["merchant", "date", "items", "taxes", "totalCents"]),
    });
    const parts = body.contents[0].parts;
    expect(parts).toContainEqual({ inlineData: { mimeType: "image/png", data: "AQID" } });
    expect(parts.some((p: { text?: string }) => typeof p.text === "string")).toBe(true);
  });
});
