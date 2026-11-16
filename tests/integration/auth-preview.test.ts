// Test login and auth URL on Vercel previews (#15): Vercel builds previews with NODE_ENV=production,
// so the test login follows VERCEL_ENV when it is set, and previews fall back to their own URL.
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
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

// Better Auth limits /sign-in and /sign-up to 3 requests per 10 s per IP whenever NODE_ENV is
// production, which previews are. Every E2E run signs up dozens of users from one CI runner, so the
// limiter follows the test login: off wherever the test login is on, on in production.
describe("rate limiting", () => {
  // Sends four sign-in attempts from one IP straight to the auth handler; returns the status codes.
  async function signInBurst(auth: ReturnType<typeof createAuth>, ip: string): Promise<number[]> {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const response = await auth.handler(
        new Request(`${baseURL}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": ip, origin: baseURL },
          body: JSON.stringify({ email: email("nobody"), password }),
        }),
      );
      statuses.push(response.status);
    }
    return statuses;
  }

  test("is off on a Vercel preview, where the test login is on", async () => {
    const auth = createAuth({ nodeEnv: "production", vercelEnv: "preview", secret, baseURL });
    expect(auth.options.rateLimit?.enabled).toBe(false);
    expect(await signInBurst(auth, "203.0.113.10")).not.toContain(429);
  });

  test("is on in Vercel production, where the test login is off", async () => {
    const auth = createAuth({ nodeEnv: "production", vercelEnv: "production", secret, baseURL });
    expect(auth.options.rateLimit?.enabled).toBe(true);
    expect(await signInBurst(auth, "203.0.113.11")).toContain(429);
  });
});

// Vercel posts the branch alias (https://<project>-git-<branch>-<team>.vercel.app) on every PR, but
// the auth base URL is the deployment's own VERCEL_URL, so the alias must be a trusted origin too.
// Better Auth skips its origin check when NODE_ENV=test, so these ask its own isTrustedOrigin().
describe("trusted origins on a Vercel preview", () => {
  const branchHost = "slashsplit-git-fix-hardening-tomatoessucks-projects.vercel.app";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function trusts(origin: string): Promise<boolean> {
    const auth = createAuth({ nodeEnv: "production", vercelEnv: "preview", secret, baseURL });
    return (await auth.$context).isTrustedOrigin(origin);
  }

  test("the VERCEL_BRANCH_URL alias is trusted when it is set", async () => {
    vi.stubEnv("VERCEL_BRANCH_URL", branchHost);
    expect(await trusts(`https://${branchHost}`)).toBe(true);
    expect(await trusts(baseURL)).toBe(true);
  });

  test("without VERCEL_BRANCH_URL the alias stays untrusted", async () => {
    vi.stubEnv("VERCEL_BRANCH_URL", "");
    expect(await trusts(`https://${branchHost}`)).toBe(false);
  });

  test("another deployment's alias is never trusted", async () => {
    vi.stubEnv("VERCEL_BRANCH_URL", branchHost);
    expect(await trusts("https://slashsplit-git-other-tomatoessucks-projects.vercel.app")).toBe(false);
  });
});
