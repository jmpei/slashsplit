// Receipt draft review E2E (#10): Ada scans a receipt (the local dev server runs with
// RECEIPT_EXTRACTOR=fixture:mismatch, so no Gemini call), sees the red mismatch banner and a
// disabled Confirm, deletes an item, adds and removes a tax, adds an item, fixes its price so the
// numbers match, confirms, and the expense shows up in Expenses and Balances.
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";

async function signUp(browser: Browser, name: string, tag: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(`e2e-draft-${name.toLowerCase()}-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  return page;
}

test("fix a mismatched receipt draft, confirm it, and see it in Expenses and Balances", async ({ browser }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;

  const ada = await signUp(browser, "Ada", tag);
  await ada.getByLabel("Household name").fill("Ash House");
  await ada.getByRole("button", { name: "Create household" }).click();
  await expect(ada.getByRole("heading", { level: 1, name: "Ash House" })).toBeVisible();
  const inviteCode = (await ada.getByTestId("invite-code").textContent())!.trim();

  const bo = await signUp(browser, "Bo", tag);
  await bo.getByLabel("Invite code").fill(inviteCode);
  await bo.getByRole("button", { name: "Join household" }).click();
  await expect(bo.getByRole("heading", { level: 1, name: "Ash House" })).toBeVisible();

  await ada.reload();
  const scan = ada.getByRole("form", { name: "Scan a receipt" });
  await scan.getByLabel("Receipt image").setInputFiles(path.join(__dirname, "fixtures", "receipt.png"));
  await scan.getByRole("button", { name: "Scan receipt" }).click();

  // The mismatch fixture: Milk 2% $5.99, Chips $4.99 (GST), GST $0.25, total $99.99.
  const drafts = ada.getByRole("region", { name: "Draft receipts to confirm" });
  const draft = drafts.getByRole("form", { name: "Review Costco draft" });
  await expect(draft).toBeVisible();
  const banner = draft.getByRole("status").filter({ hasText: "do not match" });
  await expect(banner).toHaveText(
    "Items plus taxes ($11.23) do not match the receipt total ($99.99).",
  );
  const confirm = draft.getByRole("button", { name: "Confirm expense" });
  await expect(confirm).toBeDisabled();
  // A draft is not an expense yet.
  await expect(ada.getByText("No expenses recorded yet.")).toBeVisible();

  // Delete Milk: Chips is now Item 1.
  await draft.getByRole("button", { name: "Delete item 1" }).click();
  await expect(draft.getByRole("group", { name: "Item 1" }).getByLabel("Item name")).toHaveValue("Chips");
  await expect(banner).toHaveText("Items plus taxes ($5.24) do not match the receipt total ($99.99).");

  // Add a tax and delete it again.
  await draft.getByRole("button", { name: "Add tax" }).click();
  const tax2 = draft.getByRole("group", { name: "Tax 2" });
  await tax2.getByLabel("Tax ($)").fill("1.00");
  await expect(banner).toHaveText("Items plus taxes ($6.24) do not match the receipt total ($99.99).");
  await draft.getByRole("button", { name: "Delete tax 2" }).click();
  await expect(draft.getByRole("group", { name: "Tax 2" })).toHaveCount(0);

  // Add Paper towels at $10.00, then fix the price to $94.75 so 4.99 + 94.75 + 0.25 = 99.99.
  await draft.getByRole("button", { name: "Add item" }).click();
  const item2 = draft.getByRole("group", { name: "Item 2" });
  await item2.getByLabel("Item name").fill("Paper towels");
  await item2.getByLabel("Price ($)").fill("10.00");
  await expect(banner).toHaveText("Items plus taxes ($15.24) do not match the receipt total ($99.99).");
  await expect(confirm).toBeDisabled();
  await item2.getByLabel("Price ($)").fill("94.75");
  await expect(draft.getByRole("status").filter({ hasText: "do not match" })).toHaveCount(0);
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // Chips $5.24 / 2 -> $2.62 each; Paper towels $94.75 / 2 -> $47.38 Ada, $47.37 Bo.
  const list = ada.getByRole("list", { name: "Expenses" });
  await expect(list).toContainText("Costco");
  await expect(list).toContainText("$99.99");
  await expect(list).toContainText("Ada: $50.00");
  await expect(list).toContainText("Bo: $49.99");
  const balances = ada.getByRole("list", { name: "Balances" });
  await expect(balances).toContainText("+$49.99");
  await expect(balances).toContainText("-$49.99");
  await expect(drafts.getByRole("form", { name: "Review Costco draft" })).toHaveCount(0);
});
