// Full roommate journey (#14): Ada signs in and creates a household, Bo joins by invite code in a
// second browser context, Ada records an itemized expense (Groceries $30.00 shared, Wine $12.50 for
// Bo), both see Ada +$27.50 / Bo -$27.50, Bo marks the transfer paid, and both balances return to
// $0.00. CI runs this against each PR's Vercel preview (.github/workflows/e2e-preview.yml).
import { expect, test, type Browser, type Page } from "@playwright/test";

async function signUp(browser: Browser, name: string, tag: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(`e2e-jny-${name.toLowerCase()}-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  return page;
}

// Asserts one member's row in the Balances list shows the expected signed amount.
async function expectBalance(page: Page, name: string, amount: string) {
  const row = page.getByRole("list", { name: "Balances" }).getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText(amount);
}

test("sign in, share a household, record an expense, settle up to zero", async ({ browser }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;

  const ada = await signUp(browser, "Ada", tag);
  await ada.getByLabel("Household name").fill("Cedar House");
  await ada.getByRole("button", { name: "Create household" }).click();
  await expect(ada.getByRole("heading", { level: 1, name: "Cedar House" })).toBeVisible();
  const inviteCode = (await ada.getByTestId("invite-code").textContent())!.trim();

  const bo = await signUp(browser, "Bo", tag);
  await bo.getByLabel("Invite code").fill(inviteCode);
  await bo.getByRole("button", { name: "Join household" }).click();
  await expect(bo.getByRole("heading", { level: 1, name: "Cedar House" })).toBeVisible();

  await ada.reload();
  const form = ada.getByRole("form", { name: "Record an expense" });
  await form.getByLabel("Merchant").fill("Corner Market");

  const item1 = form.getByRole("group", { name: "Item 1" });
  await item1.getByLabel("Item name").fill("Groceries");
  await item1.getByLabel("Price ($)").fill("30.00");

  await form.getByRole("button", { name: "Add item" }).click();
  const item2 = form.getByRole("group", { name: "Item 2" });
  await item2.getByLabel("Item name").fill("Wine");
  await item2.getByLabel("Price ($)").fill("12.50");
  await item2.getByRole("checkbox", { name: "Ada" }).uncheck();

  await form.getByRole("button", { name: "Save expense" }).click();
  await expect(ada.getByRole("list", { name: "Expenses" })).toContainText("Corner Market");

  // Bo owes $15.00 (half the groceries) + $12.50 (the wine) = 2750 cents.
  await expectBalance(ada, "Ada", "+$27.50");
  await expectBalance(ada, "Bo", "-$27.50");

  await bo.reload();
  await expectBalance(bo, "Ada", "+$27.50");
  await expectBalance(bo, "Bo", "-$27.50");

  const plan = bo.getByRole("list", { name: "Settlement plan" });
  await plan
    .getByRole("listitem")
    .filter({ hasText: "Bo pays Ada $27.50" })
    .getByRole("button", { name: "Mark paid" })
    .click();

  await expectBalance(bo, "Ada", "$0.00");
  await expectBalance(bo, "Bo", "$0.00");
  await expect(bo.getByText("Everyone is settled up.")).toBeVisible();

  await ada.reload();
  await expectBalance(ada, "Ada", "$0.00");
  await expectBalance(ada, "Bo", "$0.00");
});
