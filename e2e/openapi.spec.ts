// Swagger UI E2E (#8): /api/docs renders Swagger UI from /api/openapi.json, with one operation block
// per method in the document and a working "Try it out", and fits a 360 px screen.
import { expect, test } from "@playwright/test";

test("/api/docs shows Swagger UI for the OpenAPI specification", async ({ page, request }) => {
  const spec = await (await request.get("/api/openapi.json")).json();
  const operationCount = Object.values(spec.paths as Record<string, object>).reduce(
    (sum, methods) => sum + Object.keys(methods).length,
    0,
  );

  await page.goto("/api/docs");
  await expect(page.getByRole("heading", { name: /^SlashSplit API/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "/api/openapi.json" })).toBeVisible();
  await expect(page.locator(".swagger-ui .opblock")).toHaveCount(operationCount);

  await page.locator(".opblock-get").filter({ hasText: "/api/v1/households" }).first().click();
  await expect(page.getByRole("button", { name: "Try it out" })).toBeVisible();
});

test("/api/docs does not scroll sideways at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/api/docs");
  await expect(page.locator(".swagger-ui .opblock").first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
