// Prisma CLI config (#1): migrations use DIRECT_URL, and fall back to DATABASE_URL when DIRECT_URL is
// unset or empty (.env.example ships it as "", which `cp .env.example .env` copies).
import { afterEach, describe, expect, test, vi } from "vitest";

async function configuredUrl(): Promise<string | undefined> {
  vi.resetModules();
  const { default: config } = await import("../../prisma.config");
  return config.datasource?.url;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("prisma.config.ts database URL", () => {
  test("uses DIRECT_URL when it is set", async () => {
    vi.stubEnv("DIRECT_URL", "postgresql://direct");
    vi.stubEnv("DATABASE_URL", "postgresql://pooled");
    expect(await configuredUrl()).toBe("postgresql://direct");
  });

  test("falls back to DATABASE_URL when DIRECT_URL is empty", async () => {
    vi.stubEnv("DIRECT_URL", "");
    vi.stubEnv("DATABASE_URL", "postgresql://pooled");
    expect(await configuredUrl()).toBe("postgresql://pooled");
  });
});
