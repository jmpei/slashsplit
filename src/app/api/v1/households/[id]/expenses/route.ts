// GET: expenses in a household. POST: record a new expense (#6). Members only.
import { expenseBody } from "@/lib/schemas/expenses";
import { authorizeMember, badRequest, parseBody } from "@/server/api";
import { createExpense, listExpenses, ValidationError } from "@/server/expenses";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  return Response.json(await listExpenses(id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  const body = await parseBody(request, expenseBody);
  if (body instanceof Response) return body;
  try {
    return Response.json(await createExpense(id, body.data), { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) return badRequest(error.message);
    throw error;
  }
}
