// GET, PATCH, DELETE: one expense inside a household (#6). Members only.
import { expenseBody } from "@/lib/schemas/expenses";
import { authorizeMember, badRequest, notFound, parseBody } from "@/server/api";
import { deleteExpense, getExpense, updateExpense, ValidationError } from "@/server/expenses";
import { NotFoundError } from "@/server/households";

type RouteParams = { params: Promise<{ id: string; eid: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id, eid } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  try {
    return Response.json(await getExpense(id, eid));
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id, eid } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  const body = await parseBody(request, expenseBody);
  if (body instanceof Response) return body;
  try {
    return Response.json(await updateExpense(id, eid, body.data));
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof ValidationError) return badRequest(error.message);
    throw error;
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id, eid } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  try {
    await deleteExpense(id, eid);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    throw error;
  }
}
