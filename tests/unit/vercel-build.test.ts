import { describe, expect, test } from "vitest";
import { shouldMigrate } from "../../scripts/vercel-build.mjs";

describe("shouldMigrate", () => {
  test("runs migrations for production builds", () => {
    expect(shouldMigrate({ VERCEL_ENV: "production" })).toBe(true);
  });

  test("skips migrations for preview builds", () => {
    expect(shouldMigrate({ VERCEL_ENV: "preview" })).toBe(false);
  });

  test("skips migrations for development builds", () => {
    expect(shouldMigrate({ VERCEL_ENV: "development" })).toBe(false);
  });

  test("skips migrations when VERCEL_ENV is unset", () => {
    expect(shouldMigrate({})).toBe(false);
  });
});
