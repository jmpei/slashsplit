// Real-time balances E2E (#11): Ada and Bo have the same household open in two browsers. Ada records
// a $10.00 expense split between them; Bo's balances show -$5.00 within 3 seconds without a reload.
// A roommate who joins also appears on an open household page without a reload.
import { expect, test, type Browser, type Page } from "@playwright/test";

async function signUp(browser: Browser, name: string, tag: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(`e2e-rt-${name.toLowerCase()}-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  return page;
}

test("a roommate's balances update within 3 seconds without a reload", async ({ browser }, info) => {
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
  const boBalances = bo.getByRole("list", { name: "Balances" });
  await expect(boBalances).toContainText("Bo");
  await expect(boBalances).not.toContainText("-$5.00");

  // Ada reloads to see Bo in the form; Bo's page is never reloaded from here on.
  await ada.reload();
  const form = ada.getByRole("form", { name: "Record an expense" });
  await form.getByLabel("Merchant").fill("Pizza Place");
  const item1 = form.getByRole("group", { name: "Item 1" });
  await item1.getByLabel("Item name").fill("Pizza");
  await item1.getByLabel("Price ($)").fill("10.00");
  await form.getByRole("button", { name: "Save expense" }).click();

  // Ada's own view confirms the expense is saved; the 3-second clock for Bo starts here.
  await expect(ada.getByRole("list", { name: "Balances" })).toContainText("+$5.00");
  await expect(boBalances).toContainText("-$5.00", { timeout: 3000 });
  await expect(boBalances).toContainText("+$5.00");
});

test("a new roommate appears on an open household page without a reload", async ({ browser }, info) => {
  const tag = `join-${info.project.name}-${Date.now()}`;

  const ada = await signUp(browser, "Ada", tag);
  await ada.getByLabel("Household name").fill("Fir House");
  await ada.getByRole("button", { name: "Create household" }).click();
  await expect(ada.getByRole("heading", { level: 1, name: "Fir House" })).toBeVisible();
  const inviteCode = (await ada.getByTestId("invite-code").textContent())!.trim();
  const members = ada.getByRole("list", { name: "Members" });
  await expect(members.getByRole("listitem")).toHaveCount(1);

  const bo = await signUp(browser, "Bo", tag);
  await bo.getByLabel("Invite code").fill(inviteCode);
  await bo.getByRole("button", { name: "Join household" }).click();
  await expect(bo.getByRole("heading", { level: 1, name: "Fir House" })).toBeVisible();

  // Ada's page is never reloaded: polling /version (every 2 s) brings Bo in.
  await expect(members.getByRole("listitem")).toHaveCount(2, { timeout: 5000 });
  await expect(members).toContainText("Bo");
  const form = ada.getByRole("form", { name: "Record an expense" });
  await expect(form).toContainText("Bo");
});
