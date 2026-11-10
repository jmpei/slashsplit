// GET: net balances for every member of a household (#7). Members only.
import { authorizeMember } from "@/server/api";
import { getHouseholdBalances } from "@/server/balances";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  return Response.json(await getHouseholdBalances(id));
}
