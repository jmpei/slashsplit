// POST: record a settlement transfer between two household members (#7). Members only.
import { recordSettlementBody } from "@/lib/schemas/settlements";
import { authorizeMember, badRequest, parseBody } from "@/server/api";
import { recordSettlement } from "@/server/balances";
import { ValidationError } from "@/server/expenses";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  const body = await parseBody(request, recordSettlementBody);
  if (body instanceof Response) return body;
  try {
    return Response.json(await recordSettlement(id, body.data), { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) return badRequest(error.message);
    throw error;
  }
}
