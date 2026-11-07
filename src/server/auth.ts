// Sign-in with Better Auth (#3): Google OAuth everywhere, plus an email/password test login that
// exists only outside production so E2E can sign in without Google. The session travels in a
// signed JWT cookie (cookie cache, HS256) backed by a Session row that sign-out deletes.
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

export type AuthOptions = {
  nodeEnv?: string;
  secret?: string;
  baseURL?: string;
  google?: { clientId: string; clientSecret: string };
};

export function testLoginEnabled(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
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
  return betterAuth({
    secret: options.secret ?? process.env.BETTER_AUTH_SECRET,
    baseURL: options.baseURL ?? process.env.BETTER_AUTH_URL,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: testLoginEnabled(options.nodeEnv) },
    socialProviders: google ? { google } : {},
    session: { cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "jwt" } },
    plugins: [nextCookies()],
  });
}

export const auth = createAuth();
