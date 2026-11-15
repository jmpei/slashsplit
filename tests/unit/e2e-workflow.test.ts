// Pins how E2E runs on every PR (#14): Vercel's repository_dispatch event starts Playwright against
// the PR's own preview URL, the result lands on the PR's head commit as "E2E (preview)", and the
// protection bypass reaches every request. Reads the files as text so no YAML library is needed.
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
    test("runs when Vercel reports a successful deployment", () => {
      expect(workflow).toMatch(/^on:\s*$[\s\S]*?^ {2}repository_dispatch:/m);
      expect(workflow).toMatch(/types:[\s\S]*?vercel\.deployment\.success/);
    });

    test("runs only for preview deployments", () => {
      expect(workflow).toContain("github.event.client_payload.environment == 'preview'");
    });

    test("defines a job named E2E (preview)", () => {
      expect(workflow).toMatch(/^ {4}name: E2E \(preview\)\s*$/m);
    });

    test("tests the commit and the deployment URL that Vercel reported", () => {
      expect(workflow).toMatch(/ref: \$\{\{ github\.event\.client_payload\.git\.sha \}\}/);
      expect(workflow).toMatch(/E2E_BASE_URL: \$\{\{ github\.event\.client_payload\.url \}\}/);
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

    test("reports an E2E (preview) commit status on the deployed commit", () => {
      expect(workflow).toMatch(/statuses: write/);
      expect(workflow).toMatch(/statuses\/\$\{\{ github\.event\.client_payload\.git\.sha \}\}|statuses\/\$SHA/);
      expect(workflow).toMatch(/context=E2E \(preview\)|context="E2E \(preview\)"/);
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
