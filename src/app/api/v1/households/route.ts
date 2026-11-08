// GET: the caller's households. POST: create one; the caller becomes its owner (#4).
import { createHouseholdBody } from "@/lib/schemas/households";
import { currentUserId, parseBody, unauthorized } from "@/server/api";
import { createHousehold, listHouseholds } from "@/server/households";

export async function GET(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return unauthorized();
  return Response.json(await listHouseholds(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return unauthorized();
  const body = await parseBody(request, createHouseholdBody);
  if (body instanceof Response) return body;
  return Response.json(await createHousehold(userId, body.data.name), { status: 201 });
}
