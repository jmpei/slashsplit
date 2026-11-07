// Sign-in rules (#3): test login only outside production, users land in the User table, the
// session cookie is a JWT, and Google sign-in is offered once its credentials are set.
import { afterAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { createAuth } from "@/server/auth";

const secret = "integration-test-secret-at-least-32-chars";
const baseURL = "http://localhost:3100";
const runId = Date.now();
const email = (who: string) => `${who}-${runId}@test.slashsplit.dev`;
const password = "correct-horse-battery";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${runId}@test.slashsplit.dev` } } });
  await prisma.$disconnect();
});

describe("test login outside production", () => {
  const auth = createAuth({ nodeEnv: "test", secret, baseURL });

  test("signing up with email and password creates a User row", async () => {
    await auth.api.signUpEmail({ body: { name: "Ada", email: email("ada"), password } });
    const user = await prisma.user.findUnique({ where: { email: email("ada") } });
    expect(user?.name).toBe("Ada");
  });

  test("signing in sets a session cookie that is a signed JWT", async () => {
    await auth.api.signUpEmail({ body: { name: "Bo", email: email("bo"), password } });
    const { headers } = await auth.api.signInEmail({
      returnHeaders: true,
      body: { email: email("bo"), password },
    });
    const cookies = headers.getSetCookie().join("; ");
    const jwt = /session_data=([^;]+)/.exec(cookies)?.[1];
    expect(jwt?.split(".")).toHaveLength(3);
    const header = JSON.parse(Buffer.from(jwt!.split(".")[0], "base64url").toString());
    expect(header.alg).toBe("HS256");
  });
});

describe("test login in production", () => {
  const auth = createAuth({ nodeEnv: "production", secret, baseURL });

  test("email and password sign-up is off", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "Eve", email: email("eve"), password } }),
    ).rejects.toThrow();
    expect(await prisma.user.findUnique({ where: { email: email("eve") } })).toBeNull();
  });

  test("email and password sign-in is off", async () => {
    await expect(
      auth.api.signInEmail({ body: { email: email("ada"), password } }),
    ).rejects.toThrow();
  });
});

describe("Google sign-in", () => {
  test("sends the user to Google when a client id and secret are set", async () => {
    const auth = createAuth({
      nodeEnv: "production",
      secret,
      baseURL,
      google: { clientId: "test-client-id", clientSecret: "test-client-secret" },
    });
    const { url } = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: "/households" },
    });
    expect(url).toMatch(/^https:\/\/accounts\.google\.com\//);
  });
});
