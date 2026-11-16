// Discarding a receipt draft (#10): Ada scans a receipt (fixture extractor, no Gemini), opens the
// inline confirmation on "Discard draft", cancels it once, then discards the draft for good.
import path from "node:path";
import { expect, test } from "@playwright/test";

test("discard an unwanted receipt draft after an inline confirmation", async ({ page }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill("Dee");
  await page.getByLabel("Email").fill(`e2e-discard-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  await page.getByLabel("Household name").fill("Elm House");
  await page.getByRole("button", { name: "Create household" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Elm House" })).toBeVisible();

  const scan = page.getByRole("form", { name: "Scan a receipt" });
  await scan.getByLabel("Receipt image").setInputFiles(path.join(__dirname, "fixtures", "receipt.png"));
  await scan.getByRole("button", { name: "Scan receipt" }).click();
  const draft = page.getByRole("form", { name: "Review Costco draft" });
  await expect(draft).toBeVisible();

  const discard = draft.getByRole("button", { name: "Discard draft" });
  await expect(discard).toBeVisible();
  await discard.click();
  await expect(draft.getByText("Delete this draft? This cannot be undone.")).toBeVisible();
  const cancel = draft.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(discard).toBeFocused();
  await expect(draft).toBeVisible();

  await discard.click();
  await draft.getByRole("button", { name: "Yes, discard" }).click();
  await expect(draft).toHaveCount(0);
  await expect(page.getByText("No receipts waiting for review.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("No receipts waiting for review.")).toBeVisible();
});
