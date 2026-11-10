// Itemized and equal expense E2E (#6): 3 roommates join a household, record the PLAN §5.3 receipt
// (Milk $6.00 all 3, Beer $12.00 Cy unticked, Yogurt $3.00 only Cy -> shares $8.00 / $8.00 / $5.00),
// and also test the "Split equally" button.
import { expect, test, type Browser, type Page } from "@playwright/test";

async function signUp(browser: Browser, name: string, tag: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(`e2e-exp-${name.toLowerCase()}-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  return page;
}

test("record the PLAN §5.3 itemized expense and a whole-bill equal split", async ({ browser }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;

  const ada = await signUp(browser, "Ada", tag);
  await ada.getByLabel("Household name").fill("Pine House");
  await ada.getByRole("button", { name: "Create household" }).click();
  await expect(ada.getByRole("heading", { level: 1, name: "Pine House" })).toBeVisible();
  const inviteCode = (await ada.getByTestId("invite-code").textContent())!.trim();

  const bo = await signUp(browser, "Bo", tag);
  await bo.getByLabel("Invite code").fill(inviteCode);
  await bo.getByRole("button", { name: "Join household" }).click();
  await expect(bo.getByRole("heading", { level: 1, name: "Pine House" })).toBeVisible();

  const cy = await signUp(browser, "Cy", tag);
  await cy.getByLabel("Invite code").fill(inviteCode);
  await cy.getByRole("button", { name: "Join household" }).click();
  await expect(cy.getByRole("heading", { level: 1, name: "Pine House" })).toBeVisible();

  await ada.reload();
  const form = ada.getByRole("form", { name: "Record an expense" });
  await form.getByLabel("Merchant").fill("Corner Market");

  // Item 1: Milk $6.00 — all 3 members are ticked by default.
  const item1 = form.getByRole("group", { name: "Item 1" });
  await expect(item1.getByRole("checkbox", { name: "Ada" })).toBeChecked();
  await expect(item1.getByRole("checkbox", { name: "Bo" })).toBeChecked();
  await expect(item1.getByRole("checkbox", { name: "Cy" })).toBeChecked();
  await item1.getByLabel("Item name").fill("Milk");
  await item1.getByLabel("Price ($)").fill("6.00");

  // Item 2: Beer $12.00 — untick Cy.
  await form.getByRole("button", { name: "Add item" }).click();
  const item2 = form.getByRole("group", { name: "Item 2" });
  await item2.getByLabel("Item name").fill("Beer");
  await item2.getByLabel("Price ($)").fill("12.00");
  await item2.getByRole("checkbox", { name: "Cy" }).uncheck();

  // Item 3: Yogurt $3.00 — only Cy.
  await form.getByRole("button", { name: "Add item" }).click();
  const item3 = form.getByRole("group", { name: "Item 3" });
  await item3.getByLabel("Item name").fill("Yogurt");
  await item3.getByLabel("Price ($)").fill("3.00");
  await item3.getByRole("checkbox", { name: "Ada" }).uncheck();
  await item3.getByRole("checkbox", { name: "Bo" }).uncheck();

  await form.getByRole("button", { name: "Save expense" }).click();

  const list = ada.getByRole("list", { name: "Expenses" });
  await expect(list).toContainText("Corner Market");
  await expect(list).toContainText("$21.00");
  await expect(list).toContainText("Ada: $8.00");
  await expect(list).toContainText("Bo: $8.00");
  await expect(list).toContainText("Cy: $5.00");

  // Also test the "Split equally" button on a $9.00 bill.
  await form.getByLabel("Merchant").fill("Internet");
  await form.getByRole("button", { name: "Split equally" }).click();
  await form.getByLabel("Total ($)").fill("9.00");
  await form.getByRole("button", { name: "Save expense" }).click();
  await expect(list).toContainText("Internet");
  await expect(list).toContainText("Ada: $3.00");
});
