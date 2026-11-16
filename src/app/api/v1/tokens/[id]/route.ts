// DELETE: revoke one of the caller's API tokens (#13), with the browser session only. Someone else's
// token answers 404.
import { notFound, requireSession } from "@/server/api";
import { revokeToken } from "@/server/tokens";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const caller = await requireSession(request);
  if (caller instanceof Response) return caller;
  if (!(await revokeToken(caller.userId, id))) return notFound("No token with that id.");
  return new Response(null, { status: 204 });
}
