// DELETE: revoke one of the caller's API tokens (#13). Someone else's token answers 404.
import { currentUserId, notFound, unauthorized } from "@/server/api";
import { revokeToken } from "@/server/tokens";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const userId = await currentUserId(request);
  if (!userId) return unauthorized();
  if (!(await revokeToken(userId, id))) return notFound("No token with that id.");
  return new Response(null, { status: 204 });
}
