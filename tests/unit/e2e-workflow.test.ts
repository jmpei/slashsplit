// Pins how E2E runs on every PR (#14): each pull request push waits for its head commit's Vercel
// preview through the Vercel API, runs Playwright against that deployment's own URL as the
// "E2E (preview)" job, and the protection bypass reaches every request. Reads the files as text so
// no YAML library is needed.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const workflowPath = path.join(root, ".github/workflows/e2e-preview.yml");
const workflowExists = existsSync(workflowPath);
const workflow = workflowExists ? readFileSync(workflowPath, "utf8") : "";

describe("e2e-preview.yml", () => {
  test("exists", () => {
    expect(workflowExists, ".github/workflows/e2e-preview.yml exists").toBe(true);
  });

  describe.runIf(workflowExists)("contents", () => {
    test("runs on every pull request push and can be started by hand", () => {
      expect(workflow).toMatch(/^on:\s*$[\s\S]*?^ {2}pull_request:/m);
      expect(workflow).toMatch(/types:\s*\[opened, synchronize, reopened\]/);
      expect(workflow).toMatch(/^ {2}workflow_dispatch:/m);
      expect(workflow).not.toContain("repository_dispatch");
      expect(workflow).not.toContain("client_payload");
    });

    test("defines a job named E2E (preview)", () => {
      expect(workflow).toMatch(/^ {4}name: E2E \(preview\)\s*$/m);
    });

    test("finds the head commit's READY preview through the Vercel API with VERCEL_TOKEN", () => {
      expect(workflow).toContain("github.event.pull_request.head.sha");
      expect(workflow).toMatch(/VERCEL_TOKEN: \$\{\{ secrets\.VERCEL_TOKEN \}\}/);
      expect(workflow).toContain("node scripts/find-preview-url.mjs");
    });

    test("checks out the head commit and tests the deployment URL the lookup found", () => {
      expect(workflow).toMatch(/ref: \$\{\{ env\.HEAD_SHA \}\}/);
      expect(workflow).toMatch(/E2E_BASE_URL: \$\{\{ steps\.preview\.outputs\.url \}\}/);
    });

    test("passes the protection bypass secret from Actions secrets", () => {
      expect(workflow).toMatch(
        /VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_AUTOMATION_BYPASS_SECRET \}\}/,
      );
    });

    test("installs Chromium and runs Playwright", () => {
      expect(workflow).toContain("npx playwright install --with-deps chromium");
      expect(workflow).toContain("npx playwright test");
    });

    test("uploads the Playwright report even when tests fail", () => {
      expect(workflow).toMatch(/uses: actions\/upload-artifact@/);
      expect(workflow).toMatch(/path: playwright-report\/?/);
      expect(workflow).toMatch(/if: \$\{\{ always\(\) \}\}|if: always\(\)/);
    });

    test("reports through the job check, not the commit status API", () => {
      expect(workflow).not.toMatch(/statuses: write/);
      expect(workflow).not.toMatch(/repos\/[^\s]*\/statuses\//);
    });
  });
});

describe("playwright.config.ts", () => {
  const config = readFileSync(path.join(root, "playwright.config.ts"), "utf8");

  test("sends the bypass header and asks Vercel to set the bypass cookie", () => {
    expect(config).toContain('"x-vercel-protection-bypass"');
    expect(config).toMatch(/"x-vercel-set-bypass-cookie":\s*"true"/);
  });

  test("keeps the desktop and mobile projects", () => {
    expect(config).toMatch(/name: "desktop"/);
    expect(config).toMatch(/name: "mobile"/);
  });
});
