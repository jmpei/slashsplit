// Real-time household updates (#11). After every balance-changing write the household's private
// Pusher channel gets a `household-updated` event, published through Pusher's REST API with plain
// fetch + node:crypto signing (no SDK). Without the four Pusher env vars publishing is a no-op and
// clients fall back to polling GET /api/v1/households/{id}/version.
import { createHash, createHmac } from "node:crypto";
import { isMember } from "@/server/households";

export type RealtimeEvent = { channel: string; event: string; data: unknown };
export type RealtimePublisher = (event: RealtimeEvent) => Promise<void>;

export class ChannelForbiddenError extends Error {
  readonly status = 403;
}
export class RealtimeNotConfiguredError extends Error {}

const CHANNEL_PREFIX = "private-household-";
const EVENT_NAME = "household-updated";

type PusherConfig = { appId: string; key: string; secret: string; cluster: string };

function pusherConfig(): PusherConfig | null {
  const appId = process.env.PUSHER_APP_ID;
  const secret = process.env.PUSHER_SECRET;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  return appId && secret && key && cluster ? { appId, key, secret, cluster } : null;
}

const hmacHex = (secret: string, text: string) =>
  createHmac("sha256", secret).update(text).digest("hex");

// Private channel auth: HMAC-SHA256 of "<socket_id>:<channel_name>" (Pusher auth-signatures spec).
export function signChannel(socketId: string, channelName: string, secret: string): string {
  return hmacHex(secret, `${socketId}:${channelName}`);
}

// REST API query string for a POST, signed per Pusher's HTTP API spec: the method, path and
// key-sorted query (already sorted here) joined by newlines, then HMAC-SHA256 with the secret.
export function signRestQuery(
  path: string,
  body: string,
  key: string,
  secret: string,
  timestamp: number,
): string {
  const bodyMd5 = createHash("md5").update(body).digest("hex");
  const query = `auth_key=${key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
  return `${query}&auth_signature=${hmacHex(secret, `POST\n${path}\n${query}`)}`;
}

async function publishToPusher(config: PusherConfig, event: RealtimeEvent): Promise<void> {
  const path = `/apps/${config.appId}/events`;
  const body = JSON.stringify({
    name: event.event,
    channels: [event.channel],
    data: JSON.stringify(event.data),
  });
  const query = signRestQuery(path, body, config.key, config.secret, Math.floor(Date.now() / 1000));
  const res = await fetch(`https://api-${config.cluster}.pusher.com${path}?${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`Pusher answered ${res.status}: ${await res.text()}`);
}

// Tests inject a publisher; null restores the env-driven Pusher publisher.
let injectedPublisher: RealtimePublisher | null = null;

export function setRealtimePublisher(publisher: RealtimePublisher | null): void {
  injectedPublisher = publisher;
}

// Never throws: the write has already committed, so a failed publish is only logged.
export async function notifyHouseholdUpdated(householdId: string): Promise<void> {
  const config = pusherConfig();
  const publisher =
    injectedPublisher ?? (config ? (event: RealtimeEvent) => publishToPusher(config, event) : null);
  if (!publisher) return;
  try {
    await publisher({
      channel: `${CHANNEL_PREFIX}${householdId}`,
      event: EVENT_NAME,
      data: { householdId },
    });
  } catch (error) {
    console.error("Real-time publish failed:", error);
  }
}

// Signs a subscription to private-household-<id> for members of that household only.
export async function authorizeChannel(
  socketId: string,
  channelName: string,
  userId: string,
): Promise<{ auth: string }> {
  const householdId = channelName.startsWith(CHANNEL_PREFIX)
    ? channelName.slice(CHANNEL_PREFIX.length)
    : "";
  if (!householdId || !(await isMember(userId, householdId))) {
    throw new ChannelForbiddenError("You’re not a member of this household.");
  }
  const config = pusherConfig();
  if (!config) throw new RealtimeNotConfiguredError("Real-time updates are not configured.");
  return { auth: `${config.key}:${signChannel(socketId, channelName, config.secret)}` };
}
