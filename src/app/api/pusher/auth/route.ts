// POST: Pusher private-channel auth (#11). Pusher's client sends a form body with socket_id and
// channel_name; members of the household get a signature, everyone else 401/403.
import { badRequest, currentUserId, forbidden, unauthorized } from "@/server/api";
import { authorizeChannel, ChannelForbiddenError, RealtimeNotConfiguredError } from "@/server/realtime";

export async function POST(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return unauthorized();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Send socket_id and channel_name as a form body.");
  }
  const socketId = form.get("socket_id");
  const channelName = form.get("channel_name");
  if (typeof socketId !== "string" || !/^\d+\.\d+$/.test(socketId) || typeof channelName !== "string") {
    return badRequest("Send socket_id and channel_name as a form body.");
  }
  try {
    return Response.json(await authorizeChannel(socketId, channelName, userId));
  } catch (error) {
    if (error instanceof ChannelForbiddenError) return forbidden();
    if (error instanceof RealtimeNotConfiguredError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
}
