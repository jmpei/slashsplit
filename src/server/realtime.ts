// Real-time household updates (#11). Red stub: signatures only.
export type RealtimeEvent = { channel: string; event: string; data: unknown };
export type RealtimePublisher = (event: RealtimeEvent) => Promise<void>;

export class ChannelForbiddenError extends Error {
  readonly status = 403;
}

export function signChannel(_socketId: string, _channelName: string, _secret: string): string {
  return "";
}

export function signRestQuery(
  _path: string,
  _body: string,
  _key: string,
  _secret: string,
  _timestamp: number,
): string {
  return "";
}

export function setRealtimePublisher(_publisher: RealtimePublisher | null): void {}

export async function notifyHouseholdUpdated(_householdId: string): Promise<void> {}

export async function authorizeChannel(
  _socketId: string,
  _channelName: string,
  _userId: string,
): Promise<{ auth: string }> {
  throw new Error("not implemented");
}
