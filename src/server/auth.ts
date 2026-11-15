// Sign-in with Better Auth (#3): Google OAuth everywhere, plus an email/password test login that
// exists only outside production (local, CI, Vercel preview) so E2E can sign in without Google.
// The session travels in a signed JWT cookie (cookie cache, HS256) backed by a Session row that
// sign-out deletes.
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

export type AuthOptions = {
  nodeEnv?: string;
  vercelEnv?: string;
  secret?: string;
  baseURL?: string;
  google?: { clientId: string; clientSecret: string };
};

// Vercel builds previews with NODE_ENV=production, so VERCEL_ENV decides whenever it is set.
export function testLoginEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  if (vercelEnv) return vercelEnv === "preview" || vercelEnv === "development";
  return nodeEnv !== "production";
}

// Previews have no BETTER_AUTH_URL; each serves itself at https://$VERCEL_URL.
export function authBaseURL(env: { BETTER_AUTH_URL?: string; VERCEL_URL?: string }): string | undefined {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  return env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;
}

function googleFromEnv(): AuthOptions["google"] {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

export function googleSignInEnabled(): boolean {
  return googleFromEnv() !== undefined;
}

export function createAuth(options: AuthOptions = {}) {
  const google = options.google ?? googleFromEnv();
  const testLogin = testLoginEnabled(options.nodeEnv, options.vercelEnv);
  return betterAuth({
    secret: options.secret ?? process.env.BETTER_AUTH_SECRET,
    baseURL:
      options.baseURL ??
      authBaseURL({
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        VERCEL_URL: process.env.VERCEL_URL,
      }),
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: testLogin },
    // Better Auth would limit sign-in and sign-up to 3 per 10 s per IP on previews too (they run with
    // NODE_ENV=production), which breaks E2E there; production, without the test login, stays limited.
    rateLimit: { enabled: !testLogin },
    socialProviders: google ? { google } : {},
    session: { cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "jwt" } },
    plugins: [nextCookies()],
  });
}

export const auth = createAuth();
