// Browser-side Better Auth client; talks to /api/auth on the same origin.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
