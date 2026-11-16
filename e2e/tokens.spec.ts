// Personal API tokens (#13): create a token on /settings/tokens, see the plaintext once, reload and
// see only its name, then revoke it.
import { expect, test } from "@playwright/test";

test("create a token, see it once, revoke it", async ({ page }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill("Tess");
  await page.getByLabel("Email").fill(`e2e-tess-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);

  const tokensLink = page.getByRole("link", { name: "API tokens" });
  await expect(tokensLink).toBeVisible();
  await tokensLink.click();
  await expect(page).toHaveURL(/\/settings\/tokens$/);
  await expect(page.getByRole("heading", { level: 1, name: "API tokens" })).toBeVisible();

  await page.getByLabel("Token name").fill("Laptop script");
  await page.getByRole("button", { name: "Create token" }).click();
  const plaintext = page.getByTestId("new-token");
  await expect(plaintext).toHaveText(/^ss_[0-9a-f]{48}$/);
  const token = (await plaintext.textContent())!.trim();
  await expect(page.getByText("You will not see this token again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy token" })).toBeVisible();

  const list = page.getByRole("list", { name: "Your API tokens" });
  await expect(list.getByRole("listitem")).toHaveText([/Laptop script.*Never used/]);

  await page.reload();
  await expect(page.getByTestId("new-token")).toHaveCount(0);
  await expect(list.getByRole("listitem")).toHaveText([/Laptop script/]);
  expect(await page.content()).not.toContain(token);

  await list.getByRole("button", { name: "Revoke Laptop script" }).click();
  await list.getByRole("button", { name: "Yes, revoke" }).click();
  await expect(list).toHaveCount(0);
  await expect(page.getByText("No API tokens yet.")).toBeVisible();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("a revoke that never reaches the server resets the button and shows the error", async ({ page }, info) => {
  const tag = `${info.project.name}-${Date.now()}`;
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill("Rex");
  await page.getByLabel("Email").fill(`e2e-rex-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  await page.goto("/settings/tokens");
  await page.getByLabel("Token name").fill("Flaky network");
  await page.getByRole("button", { name: "Create token" }).click();
  await expect(page.getByTestId("new-token")).toBeVisible();

  const row = page.getByRole("list", { name: "Your API tokens" }).getByRole("listitem");
  // The status region is mounted before anything fails, so a screen reader announces the error.
  const status = row.getByRole("status");
  await expect(status).toHaveCount(1);
  await expect(status).toHaveText("");

  // Server actions POST to the page URL; drop them as if the connection had gone.
  await page.route("**/settings/tokens", (route) =>
    route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue(),
  );
  await row.getByRole("button", { name: "Revoke Flaky network" }).click();
  await row.getByRole("button", { name: "Yes, revoke" }).click();

  const revoke = row.getByRole("button", { name: "Revoke Flaky network" });
  await expect(revoke).toBeEnabled();
  await expect(revoke).toBeFocused();
  await expect(status).toHaveText(/couldn.t reach the server/i);

  // After the connection returns, the same button revokes the token.
  await page.unroute("**/settings/tokens");
  await revoke.click();
  await row.getByRole("button", { name: "Yes, revoke" }).click();
  await expect(page.getByText("No API tokens yet.")).toBeVisible();
});
