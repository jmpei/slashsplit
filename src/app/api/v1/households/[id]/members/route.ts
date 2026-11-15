// GET: members of a household in join order (#4). Members only.
import { authorizeMember } from "@/server/api";
import { listMembers } from "@/server/households";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  return Response.json(await listMembers(id));
}
