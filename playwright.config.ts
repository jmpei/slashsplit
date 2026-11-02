// E2E: runs against localhost (starts `npm run dev`) or a deployed preview when E2E_BASE_URL is set.
import { defineConfig, devices } from "@playwright/test";

// Port 3100, not 3000: other local tools (an Obsidian plugin here) often hold 3000.
const port = Number(process.env.E2E_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // Vercel preview deployments are protected; this header lets CI through.
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npm run dev -- --port ${port}`, url: baseURL, reuseExistingServer: !process.env.CI },
});
