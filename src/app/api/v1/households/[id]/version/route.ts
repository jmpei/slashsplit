// GET: the household's change counter (#11). Members only. Clients poll it and refresh when it moves.
import { authorizeMember, notFound } from "@/server/api";
import { getHouseholdVersion } from "@/server/households";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  const version = await getHouseholdVersion(id);
  if (version === null) return notFound("Household not found.");
  return Response.json({ version });
}
