// Test login and auth URL on Vercel previews (#15): Vercel builds previews with NODE_ENV=production,
// so the test login follows VERCEL_ENV when it is set, and previews fall back to their own URL.
import { afterAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { authBaseURL, createAuth, testLoginEnabled } from "@/server/auth";

const secret = "integration-test-secret-at-least-32-chars";
const baseURL = "http://localhost:3100";
const runId = Date.now();
const email = (who: string) => `${who}-${runId}@preview.slashsplit.dev`;
const password = "correct-horse-battery";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${runId}@preview.slashsplit.dev` } } });
  await prisma.$disconnect();
});

describe("testLoginEnabled", () => {
  test("is on for Vercel preview even though NODE_ENV is production", () => {
    expect(testLoginEnabled("production", "preview")).toBe(true);
  });

  test("is on for Vercel development", () => {
    expect(testLoginEnabled("production", "development")).toBe(true);
  });

  test("is off for Vercel production whatever NODE_ENV says", () => {
    expect(testLoginEnabled("development", "production")).toBe(false);
  });

  test("is off when VERCEL_ENV is unset and NODE_ENV is production", () => {
    expect(testLoginEnabled("production", undefined)).toBe(false);
  });
});

describe("createAuth on a Vercel preview", () => {
  test("allows the test login when vercelEnv is preview", async () => {
    const auth = createAuth({ nodeEnv: "production", vercelEnv: "preview", secret, baseURL });
    await auth.api.signUpEmail({ body: { name: "Pia", email: email("pia"), password } });
    const user = await prisma.user.findUnique({ where: { email: email("pia") } });
    expect(user?.name).toBe("Pia");
  });

  test("refuses the test login when vercelEnv is production", async () => {
    const auth = createAuth({ nodeEnv: "test", vercelEnv: "production", secret, baseURL });
    await expect(
      auth.api.signUpEmail({ body: { name: "Pat", email: email("pat"), password } }),
    ).rejects.toThrow();
    expect(await prisma.user.findUnique({ where: { email: email("pat") } })).toBeNull();
  });

  test("refuses the test login when vercelEnv is unset and nodeEnv is production", async () => {
    const auth = createAuth({ nodeEnv: "production", vercelEnv: undefined, secret, baseURL });
    await expect(
      auth.api.signUpEmail({ body: { name: "Pru", email: email("pru"), password } }),
    ).rejects.toThrow();
    expect(await prisma.user.findUnique({ where: { email: email("pru") } })).toBeNull();
  });
});

describe("authBaseURL", () => {
  test("uses BETTER_AUTH_URL when it is set", () => {
    expect(
      authBaseURL({
        BETTER_AUTH_URL: "https://slashsplit.vercel.app",
        VERCEL_URL: "slashsplit-abc.vercel.app",
      }),
    ).toBe("https://slashsplit.vercel.app");
  });

  test("falls back to the preview's own https URL when BETTER_AUTH_URL is unset", () => {
    expect(authBaseURL({ VERCEL_URL: "slashsplit-abc.vercel.app" })).toBe(
      "https://slashsplit-abc.vercel.app",
    );
  });

  test("falls back when BETTER_AUTH_URL is empty", () => {
    expect(authBaseURL({ BETTER_AUTH_URL: "", VERCEL_URL: "slashsplit-abc.vercel.app" })).toBe(
      "https://slashsplit-abc.vercel.app",
    );
  });

  test("is undefined when neither is set", () => {
    expect(authBaseURL({})).toBeUndefined();
  });
});
