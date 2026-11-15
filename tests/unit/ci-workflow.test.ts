// Pins the CI pipeline shape: stages run in order and the security scans gate the build.
// Reads the workflow files as text so no YAML library is needed.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const githubDir = path.resolve(import.meta.dirname, "../../.github");
const ciYml = readFileSync(path.join(githubDir, "workflows/ci.yml"), "utf8");

// Splits the `jobs:` section into one text block per job, keyed by the job id (2-space indent).
function jobBlocks(workflow: string): Map<string, string> {
  const jobsSection = workflow.split(/^jobs:\s*$/m)[1] ?? "";
  const blocks = new Map<string, string>();
  for (const chunk of jobsSection.split(/^(?= {2}[\w-]+:\s*$)/m)) {
    const id = chunk.match(/^ {2}([\w-]+):\s*$/m)?.[1];
    if (id) blocks.set(id, chunk);
  }
  return blocks;
}

// Reads `needs: x` or `needs: [x, y]` from a job block.
function needsOf(block: string): string[] {
  const value = block.match(/^ {4}needs:\s*(.+)$/m)?.[1]?.trim();
  if (!value) return [];
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const jobs = jobBlocks(ciYml);

describe("ci.yml", () => {
  test("runs on pull requests", () => {
    expect(ciYml).toMatch(/^on:\s*$[\s\S]*?^ {2}pull_request:/m);
  });

  test("defines the lint, test, security and build jobs", () => {
    for (const id of ["check", "unit", "integration", "audit", "gitleaks", "build"]) {
      expect(jobs.has(id), `job ${id} exists`).toBe(true);
    }
  });

  test("unit tests wait for lint and typecheck", () => {
    expect(needsOf(jobs.get("unit") ?? "")).toContain("check");
  });

  test("integration tests wait for unit tests", () => {
    expect(needsOf(jobs.get("integration") ?? "")).toContain("unit");
  });

  test("build waits for integration tests, npm audit and the secret scan", () => {
    const needs = needsOf(jobs.get("build") ?? "");
    expect(needs, "build needs integration").toContain("integration");
    expect(needs, "build needs audit").toContain("audit");
    expect(needs, "build needs gitleaks").toContain("gitleaks");
  });
});

describe("security scanning", () => {
  test("CodeQL scans JavaScript and TypeScript", () => {
    const codeqlPath = path.join(githubDir, "workflows/codeql.yml");
    expect(existsSync(codeqlPath)).toBe(true);
    expect(readFileSync(codeqlPath, "utf8")).toContain("javascript-typescript");
  });

  test("Dependabot is configured", () => {
    expect(existsSync(path.join(githubDir, "dependabot.yml"))).toBe(true);
  });
});
