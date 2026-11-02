import { expect, test } from "@playwright/test";

test("home page shows the app name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "SlashSplit" })).toBeVisible();
});

test("health endpoint is up", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ status: "ok" });
});
