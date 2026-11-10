// Swagger / OpenAPI UI E2E (#8): /api/docs renders the interactive API documentation and links to
// /api/openapi.json.
import { expect, test } from "@playwright/test";

test("/api/docs shows Swagger UI for the OpenAPI specification", async ({ page }) => {
  await page.goto("/api/docs");
  await expect(page.getByRole("heading", { level: 1, name: "SlashSplit API" })).toBeVisible();
  await expect(page.getByRole("link", { name: "/api/openapi.json" })).toBeVisible();
  await expect(page.getByText("/api/v1/households", { exact: true })).toBeVisible();
  await expect(page.getByText("/api/v1/households/{id}/expenses", { exact: true })).toBeVisible();
});
