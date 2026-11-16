// GET: the caller's personal API tokens, without secrets. POST: create one; the plaintext token is
// in this response only (#13). Both take the browser session, never a Bearer token.
import { createTokenBody } from "@/lib/schemas/tokens";
import { parseBody, requireSession } from "@/server/api";
import { createToken, listTokens } from "@/server/tokens";

export async function GET(request: Request) {
  const caller = await requireSession(request);
  if (caller instanceof Response) return caller;
  return Response.json(await listTokens(caller.userId));
}

export async function POST(request: Request) {
  const caller = await requireSession(request);
  if (caller instanceof Response) return caller;
  const body = await parseBody(request, createTokenBody);
  if (body instanceof Response) return body;
  return Response.json(await createToken(caller.userId, body.data.name), { status: 201 });
}
