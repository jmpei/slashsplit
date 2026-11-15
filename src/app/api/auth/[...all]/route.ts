// Better Auth endpoints: sign-in, OAuth callbacks, sign-out, session (#3).
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

export const { GET, POST } = toNextJsHandler(auth);
