// Stub so the red tests run; the real Better Auth setup lands in the green commit (#3).
import { betterAuth } from "better-auth";

export type AuthOptions = {
  nodeEnv?: string;
  secret?: string;
  baseURL?: string;
  google?: { clientId: string; clientSecret: string };
};

export function createAuth(options: AuthOptions = {}) {
  return betterAuth({ secret: options.secret, baseURL: options.baseURL });
}
