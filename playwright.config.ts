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
    // Vercel preview deployments are protected; the header lets CI through, and the bypass cookie
    // keeps later navigations and page requests through as well.
    extraHTTPHeaders: bypass
      ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // The local server scans receipts with the mismatch fixture, never Gemini (#10). It is never
  // reused, so a dev server already on this port without the variable cannot serve the tests.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        env: { RECEIPT_EXTRACTOR: "fixture:mismatch" },
      },
});
