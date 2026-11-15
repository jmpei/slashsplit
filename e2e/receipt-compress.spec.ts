// Large receipt photos E2E (#9): Vercel rejects request bodies above about 4.5 MB with 413 before
// the scan route runs, so the scan form shrinks bigger photos in the browser. A 5.8 MB PNG must
// leave the browser under 4.5 MB and still become a draft; an over-budget photo the browser cannot
// decode (HEIC outside Safari) is stopped in the form with a message instead of being uploaded.
// The local dev server scans with RECEIPT_EXTRACTOR=fixture:mismatch, so no Gemini call.
import { randomBytes } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";
import { expect, test, type Browser, type Page } from "@playwright/test";

const VERCEL_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;

// An RGB PNG of random noise: noise does not compress, so the file is about width * height * 3 bytes.
function noisePng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // colour type: RGB
  const rows = randomBytes((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) rows[y * (width * 3 + 1)] = 0; // filter: none
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 1 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function householdPage(browser: Browser, tag: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill("Ada");
  await page.getByLabel("Email").fill(`e2e-compress-ada-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  await page.getByLabel("Household name").fill("Big Photo House");
  await page.getByRole("button", { name: "Create household" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Big Photo House" })).toBeVisible();
  return page;
}

const isScan = (url: string) => /\/receipts\/scan$/.test(url);

test("a photo over the upload limit is shrunk below 4.5 MB in the browser and becomes a draft", async ({ browser }, info) => {
  const ada = await householdPage(browser, `big-${info.project.name}-${Date.now()}`);
  const png = noisePng(1600, 1200);
  expect(png.length).toBeGreaterThan(VERCEL_BODY_LIMIT_BYTES);

  const scan = ada.getByRole("form", { name: "Scan a receipt" });
  await scan.getByLabel("Receipt image").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: png });
  const sent = ada.waitForRequest((req) => req.method() === "POST" && isScan(req.url()));
  await scan.getByRole("button", { name: "Scan receipt" }).click();

  // Chromium does not expose multipart bodies that carry a file, but it reports their Content-Length.
  const bodyBytes = Number((await (await sent).allHeaders())["content-length"]);
  expect(bodyBytes).toBeGreaterThan(0);
  expect(bodyBytes).toBeLessThan(VERCEL_BODY_LIMIT_BYTES);

  const drafts = ada.getByRole("region", { name: "Draft receipts to confirm" });
  await expect(drafts.getByRole("form", { name: "Review Costco draft" })).toBeVisible();
});

test("an over-limit photo the browser cannot decode is stopped with a message, not uploaded", async ({ browser }, info) => {
  const ada = await householdPage(browser, `heic-${info.project.name}-${Date.now()}`);
  const scanRequests: string[] = [];
  ada.on("request", (req) => {
    if (isScan(req.url())) scanRequests.push(req.url());
  });

  // Random bytes named .heic: no browser decodes this, like a real HEIC in Chrome.
  const heic = randomBytes(5 * 1024 * 1024);
  const scan = ada.getByRole("form", { name: "Scan a receipt" });
  await scan.getByLabel("Receipt image").setInputFiles({ name: "receipt.heic", mimeType: "image/heic", buffer: heic });
  await scan.getByRole("button", { name: "Scan receipt" }).click();

  await expect(scan.getByRole("status")).toContainText("too large");
  await expect(scan.getByRole("button", { name: "Scan receipt" })).toBeEnabled();
  expect(scanRequests).toEqual([]);
  await expect(ada.getByText("No receipts waiting for review.")).toBeVisible();
});
