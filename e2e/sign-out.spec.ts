// Signing out (#3): every signed-in page has the shared header with a Sign out control, and signing
// out from a household page ends the session.
import { expect, test } from "@playwright/test";

test("every signed-in page has Sign out in its header, and it ends the session", async ({ page }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill("Sol");
  await page.getByLabel("Email").fill(`e2e-signout-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  await page.getByLabel("Household name").fill("Yew House");
  await page.getByRole("button", { name: "Create household" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Yew House" })).toBeVisible();
  const householdUrl = page.url();

  for (const url of ["/households", "/settings/tokens", householdUrl]) {
    await page.goto(url);
    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: "Sign out" }), url).toBeVisible();
    await expect(header.getByRole("link", { name: "API tokens" }), url).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" }), url).toHaveCount(1);
  }

  await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto(householdUrl);
  await expect(page).toHaveURL(/\/sign-in$/);
});
