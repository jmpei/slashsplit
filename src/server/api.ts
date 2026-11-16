// Shared pieces for /api/v1 route handlers: who is calling, the membership check, body parsing,
// and error responses with one shape ({ error }).
import type { z } from "zod";
import { auth } from "@/server/auth";
import { isMember } from "@/server/households";
import { userIdForToken } from "@/server/tokens";

export const unauthorized = () => Response.json({ error: "Sign in first." }, { status: 401 });
// A household that doesn't exist also answers 403, so callers can't probe which ids exist.
export const forbidden = () =>
  Response.json({ error: "You’re not a member of this household." }, { status: 403 });
export const notFound = (message: string) => Response.json({ error: message }, { status: 404 });
export const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });
export const conflict = (message: string) => Response.json({ error: message }, { status: 409 });

// The token in an `Authorization: Bearer <token>` header, or null. The scheme name is
// case-insensitive (RFC 7235).
function bearerToken(request: Request): string | null {
  const match = /^bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "");
  return match ? match[1].trim() : null;
}

async function sessionUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

// A Bearer API token (#13) takes precedence over the session cookie; an unknown token is a 401.
export async function currentUserId(request: Request): Promise<string | null> {
  const token = bearerToken(request);
  return token !== null ? userIdForToken(token) : sessionUserId(request);
}

// Token management (#13) takes the browser session only, so a leaked token cannot mint a fresh one
// that outlives revoking it. Returns the caller's user id, or the 401/403 response to send instead.
export async function requireSession(request: Request): Promise<{ userId: string } | Response> {
  if (bearerToken(request) !== null) {
    return Response.json(
      { error: "API tokens can’t manage tokens. Use the browser session at /settings/tokens." },
      { status: 403 },
    );
  }
  const userId = await sessionUserId(request);
  return userId ? { userId } : unauthorized();
}

// Returns the caller's user id, or the 401/403 response to send instead.
export async function authorizeMember(
  request: Request,
  householdId: string,
): Promise<{ userId: string } | Response> {
  const userId = await currentUserId(request);
  if (!userId) return unauthorized();
  if (!(await isMember(userId, householdId))) return forbidden();
  return { userId };
}

export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Send a JSON body.");
  }
  const result = schema.safeParse(json);
  if (!result.success) return badRequest(result.error.issues.map((i) => i.message).join(" "));
  return { data: result.data };
}
