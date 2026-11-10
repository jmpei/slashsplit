// Balances and settlement E2E (#7): Ada pays for Bo ($5.00) and Cy ($15.00), everyone sees net
// balances (+$20.00, -$5.00, -$15.00) and the greedy settlement plan, and marking Cy -> Ada paid
// updates both balances immediately.
import { expect, test, type Browser, type Page } from "@playwright/test";

async function signUp(browser: Browser, name: string, tag: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(`e2e-bal-${name.toLowerCase()}-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  return page;
}

test("show net balances, greedy settlement plan, and mark a transfer paid", async ({ browser }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;

  const ada = await signUp(browser, "Ada", tag);
  await ada.getByLabel("Household name").fill("Elm House");
  await ada.getByRole("button", { name: "Create household" }).click();
  await expect(ada.getByRole("heading", { level: 1, name: "Elm House" })).toBeVisible();
  const inviteCode = (await ada.getByTestId("invite-code").textContent())!.trim();

  const bo = await signUp(browser, "Bo", tag);
  await bo.getByLabel("Invite code").fill(inviteCode);
  await bo.getByRole("button", { name: "Join household" }).click();
  await expect(bo.getByRole("heading", { level: 1, name: "Elm House" })).toBeVisible();

  const cy = await signUp(browser, "Cy", tag);
  await cy.getByLabel("Invite code").fill(inviteCode);
  await cy.getByRole("button", { name: "Join household" }).click();
  await expect(cy.getByRole("heading", { level: 1, name: "Elm House" })).toBeVisible();

  await ada.reload();
  const form = ada.getByRole("form", { name: "Record an expense" });
  await form.getByLabel("Merchant").fill("Market");

  const item1 = form.getByRole("group", { name: "Item 1" });
  await item1.getByLabel("Item name").fill("Snack");
  await item1.getByLabel("Price ($)").fill("5.00");
  await item1.getByRole("checkbox", { name: "Ada" }).uncheck();
  await item1.getByRole("checkbox", { name: "Cy" }).uncheck();

  await form.getByRole("button", { name: "Add item" }).click();
  const item2 = form.getByRole("group", { name: "Item 2" });
  await item2.getByLabel("Item name").fill("Roast");
  await item2.getByLabel("Price ($)").fill("15.00");
  await item2.getByRole("checkbox", { name: "Ada" }).uncheck();
  await item2.getByRole("checkbox", { name: "Bo" }).uncheck();

  await form.getByRole("button", { name: "Save expense" }).click();

  const balances = ada.getByRole("list", { name: "Balances" });
  await expect(balances).toContainText("Ada");
  await expect(balances).toContainText("+$20.00");
  await expect(balances).toContainText("-$5.00");
  await expect(balances).toContainText("-$15.00");

  const plan = ada.getByRole("list", { name: "Settlement plan" });
  await expect(plan).toContainText("Cy pays Ada $15.00");
  await expect(plan).toContainText("Bo pays Ada $5.00");

  await plan
    .getByRole("listitem")
    .filter({ hasText: "Cy pays Ada $15.00" })
    .getByRole("button", { name: "Mark paid" })
    .click();

  await expect(balances).toContainText("+$5.00");
  await expect(plan).not.toContainText("Cy pays Ada $15.00");
  await expect(plan).toContainText("Bo pays Ada $5.00");
});
