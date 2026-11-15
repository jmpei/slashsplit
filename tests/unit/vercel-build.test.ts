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

  describe("preview builds with the Neon integration", () => {
    const productionHost = "ep-prod-123.c-15.us-east-1.aws.neon.tech";
    const branchUrl = "postgresql://u:p@ep-branch-456-pooler.c-2.us-east-1.aws.neon.tech/neondb";

    test("migrate when the database is a branch on another host", () => {
      expect(
        shouldMigrate({
          VERCEL_ENV: "preview",
          PRODUCTION_DB_HOST: productionHost,
          DATABASE_URL: branchUrl,
          DATABASE_URL_UNPOOLED: "postgresql://u:p@ep-branch-456.c-2.us-east-1.aws.neon.tech/neondb",
        }),
      ).toBe(true);
    });

    test("skip when the database is on the production host", () => {
      expect(
        shouldMigrate({
          VERCEL_ENV: "preview",
          PRODUCTION_DB_HOST: productionHost,
          DATABASE_URL: `postgresql://u:p@${productionHost}/slashsplit`,
        }),
      ).toBe(false);
    });

    test("skip when the pooled URL points at the production endpoint", () => {
      expect(
        shouldMigrate({
          VERCEL_ENV: "preview",
          PRODUCTION_DB_HOST: productionHost,
          DATABASE_URL: "postgresql://u:p@ep-prod-123-pooler.c-15.us-east-1.aws.neon.tech/slashsplit",
        }),
      ).toBe(false);
    });

    test("skip when any database URL points at the production host", () => {
      expect(
        shouldMigrate({
          VERCEL_ENV: "preview",
          PRODUCTION_DB_HOST: productionHost,
          DATABASE_URL: branchUrl,
          DIRECT_URL: `postgresql://u:p@${productionHost}/slashsplit`,
        }),
      ).toBe(false);
    });

    test("skip when PRODUCTION_DB_HOST is unset", () => {
      expect(shouldMigrate({ VERCEL_ENV: "preview", DATABASE_URL: branchUrl })).toBe(false);
    });

    test("skip when there is no database URL", () => {
      expect(shouldMigrate({ VERCEL_ENV: "preview", PRODUCTION_DB_HOST: productionHost })).toBe(
        false,
      );
    });
  });
});
