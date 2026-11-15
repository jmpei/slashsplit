// GET: confirmed expenses in a household, or drafts with ?status=DRAFT (#10). POST: record a new expense (#6). Members only.
import { expenseBody, expenseStatusQuery } from "@/lib/schemas/expenses";
import { authorizeMember, badRequest, parseBody } from "@/server/api";
import { createExpense, listExpenses, ValidationError } from "@/server/expenses";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  const status = expenseStatusQuery.safeParse(
    new URL(request.url).searchParams.get("status") ?? undefined,
  );
  if (!status.success) return badRequest("status must be CONFIRMED or DRAFT.");
  return Response.json(await listExpenses(id, status.data));
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
