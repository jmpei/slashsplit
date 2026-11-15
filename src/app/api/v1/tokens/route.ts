// GET: the caller's personal API tokens, without secrets. POST: create one; the plaintext token is
// in this response only (#13).
import { createTokenBody } from "@/lib/schemas/tokens";
import { currentUserId, parseBody, unauthorized } from "@/server/api";
import { createToken, listTokens } from "@/server/tokens";

export async function GET(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return unauthorized();
  return Response.json(await listTokens(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return unauthorized();
  const body = await parseBody(request, createTokenBody);
  if (body instanceof Response) return body;
  return Response.json(await createToken(userId, body.data.name), { status: 201 });
}
