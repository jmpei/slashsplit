// POST: join a household with its invite code (#4). Joining twice keeps one membership.
import { joinHouseholdBody } from "@/lib/schemas/households";
import { currentUserId, notFound, parseBody, unauthorized } from "@/server/api";
import { joinHousehold, NotFoundError } from "@/server/households";

export async function POST(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return unauthorized();
  const body = await parseBody(request, joinHouseholdBody);
  if (body instanceof Response) return body;
  try {
    return Response.json(await joinHousehold(userId, body.data.inviteCode));
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(error.message);
    throw error;
  }
}
