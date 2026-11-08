// Households (#4): one roommate creates a household, another joins with the invite code, and both
// see each other in the member list.
import { expect, test, type Browser, type Page } from "@playwright/test";

async function signUp(browser: Browser, name: string, tag: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(`e2e-${name.toLowerCase()}-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  return page;
}

test("create a household, invite a roommate, see both members", async ({ browser }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;

  const owner = await signUp(browser, "Robin", tag);
  await owner.getByLabel("Household name").fill("Maple House");
  await owner.getByRole("button", { name: "Create household" }).click();
  await expect(owner.getByRole("heading", { level: 1, name: "Maple House" })).toBeVisible();
  const inviteCode = (await owner.getByTestId("invite-code").textContent())!.trim();
  expect(inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  const members = owner.getByRole("list", { name: "Members" });
  await expect(members.getByRole("listitem")).toHaveText([/Robin.*Owner/]);

  const roommate = await signUp(browser, "Sam", tag);
  await roommate.getByLabel("Invite code").fill(inviteCode);
  await roommate.getByRole("button", { name: "Join household" }).click();
  await expect(roommate.getByRole("heading", { level: 1, name: "Maple House" })).toBeVisible();

  await owner.reload();
  await expect(members.getByRole("listitem")).toHaveText([/Robin.*Owner/, /Sam.*Member/]);

  await owner.goto("/households");
  await expect(owner.getByRole("link", { name: "Maple House" })).toBeVisible();
});

test("a wrong invite code shows an error", async ({ browser }, info) => {
  const page = await signUp(browser, "Lee", `${info.project.name}-${Date.now()}`);
  await page.getByLabel("Invite code").fill("ZZZZZZZZ");
  await page.getByRole("button", { name: "Join household" }).click();
  await expect(page.getByRole("status")).toHaveText("No household has that invite code.");
});
