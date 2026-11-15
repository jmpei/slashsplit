// POST: confirm a DRAFT expense (#10). Members only. An optional JSON body carries the reviewed
// receipt (merchant, date, total, items, taxes); without one the stored draft is confirmed.
import { draftEditsBody, type DraftEdits } from "@/lib/schemas/expenses";
import { authorizeMember, badRequest, conflict, notFound } from "@/server/api";
import { confirmExpense, ConflictError, ValidationError } from "@/server/expenses";
import { NotFoundError } from "@/server/households";

type RouteParams = { params: Promise<{ id: string; eid: string }> };

async function readEdits(request: Request): Promise<{ edits?: DraftEdits } | Response> {
  const text = await request.text();
  if (!text.trim()) return {};
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return badRequest("Send a JSON body.");
  }
  const result = draftEditsBody.safeParse(json);
  if (!result.success) return badRequest(result.error.issues.map((i) => i.message).join(" "));
  return { edits: result.data };
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id, eid } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  const body = await readEdits(request);
  if (body instanceof Response) return body;
  try {
    return Response.json(await confirmExpense(id, eid, body.edits));
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof ConflictError) return conflict(error.message);
    if (error instanceof ValidationError) return badRequest(error.message);
    throw error;
  }
}
