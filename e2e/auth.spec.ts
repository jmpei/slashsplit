// Sign-in flow (#3) with the test login, which exists only outside production.
import { expect, test } from "@playwright/test";

test("a signed-out visitor to an app page is sent to sign-in", async ({ page }) => {
  await page.goto("/households");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
});

test("test login: create an account, sign out, sign back in", async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@test.slashsplit.dev`;
  const password = "correct-horse-battery";

  await page.goto("/sign-in");
  await page.getByLabel("Name").fill("Robin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create test account" }).click();

  await expect(page).toHaveURL(/\/households$/);
  await expect(page.getByText("Signed in as Robin")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in with test account" }).click();
  await expect(page.getByText("Signed in as Robin")).toBeVisible();
});
