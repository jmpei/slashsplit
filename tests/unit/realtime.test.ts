// Real-time publishing and channel authorization (#11). Signatures are checked against the worked
// examples in Pusher's docs (library_auth_reference/auth-signatures and /rest-api); no test calls Pusher.
import { createHash, createHmac } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("@/server/households", () => ({ isMember: vi.fn() }));

import { isMember } from "@/server/households";
import {
  authorizeChannel,
  notifyHouseholdUpdated,
  setRealtimePublisher,
  signChannel,
  signRestQuery,
} from "@/server/realtime";

// Pusher's documented example credentials (not a real app).
const DOC_KEY = "278d425bdf160c739803";
const DOC_SECRET = "7ad3773142a6692b25b8";

function stubPusherEnv() {
  vi.stubEnv("PUSHER_APP_ID", "3");
  vi.stubEnv("PUSHER_SECRET", DOC_SECRET);
  vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", DOC_KEY);
  vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "mt1");
}

function clearPusherEnv() {
  for (const name of [
    "PUSHER_APP_ID",
    "PUSHER_SECRET",
    "NEXT_PUBLIC_PUSHER_KEY",
    "NEXT_PUBLIC_PUSHER_CLUSTER",
  ]) {
    vi.stubEnv(name, "");
  }
}

afterEach(() => {
  setRealtimePublisher(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("signatures match Pusher's documented examples", () => {
  test("private channel auth: 1234.1234:private-foobar", () => {
    expect(signChannel("1234.1234", "private-foobar", DOC_SECRET)).toBe(
      "58df8b0c36d6982b82c3ecf6b4662e34fe8c25bba48f5369f135bf843651c3a4",
    );
  });

  test("REST API query for POST /apps/3/events", () => {
    const body = '{"name":"foo","channels":["project-3"],"data":"{\\"some\\":\\"data\\"}"}';
    expect(signRestQuery("/apps/3/events", body, DOC_KEY, DOC_SECRET, 1353088179)).toBe(
      "auth_key=278d425bdf160c739803&auth_timestamp=1353088179&auth_version=1.0" +
        "&body_md5=ec365a775a4cd0599faeb73354201b6f" +
        "&auth_signature=da454824c97ba181a32ccc17a72625ba02771f50b50e1e7430e47a1f3f457e6c",
    );
  });
});

describe("notifyHouseholdUpdated", () => {
  test("without the Pusher env vars it is a no-op", async () => {
    clearPusherEnv();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(notifyHouseholdUpdated("h1")).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("with the env vars it POSTs household-updated on private-household-<id>, signed", async () => {
    stubPusherEnv();
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    await notifyHouseholdUpdated("h1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe("https://api-mt1.pusher.com/apps/3/events");
    expect(init.method).toBe("POST");
    const body = init.body as string;
    expect(JSON.parse(body)).toMatchObject({
      name: "household-updated",
      channels: ["private-household-h1"],
    });

    const q = parsed.searchParams;
    expect(q.get("auth_key")).toBe(DOC_KEY);
    expect(q.get("body_md5")).toBe(createHash("md5").update(body).digest("hex"));
    const toSign =
      `POST\n/apps/3/events\nauth_key=${DOC_KEY}&auth_timestamp=${q.get("auth_timestamp")}` +
      `&auth_version=1.0&body_md5=${q.get("body_md5")}`;
    expect(q.get("auth_signature")).toBe(
      createHmac("sha256", DOC_SECRET).update(toSign).digest("hex"),
    );
  });

  test("an injected publisher receives the channel and event name", async () => {
    clearPusherEnv();
    const publisher = vi.fn(async () => {});
    setRealtimePublisher(publisher);
    await notifyHouseholdUpdated("h1");
    expect(publisher).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "private-household-h1", event: "household-updated" }),
    );
  });

  test("a publish error is logged and never rejects", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setRealtimePublisher(async () => {
      throw new Error("Pusher is down");
    });
    await expect(notifyHouseholdUpdated("h1")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("authorizeChannel", () => {
  test("a member of the household gets <key>:<hmac of socket_id:channel>", async () => {
    stubPusherEnv();
    vi.mocked(isMember).mockResolvedValue(true);
    await expect(authorizeChannel("1234.1234", "private-household-h1", "u1")).resolves.toEqual({
      auth: `${DOC_KEY}:${createHmac("sha256", DOC_SECRET)
        .update("1234.1234:private-household-h1")
        .digest("hex")}`,
    });
    expect(isMember).toHaveBeenCalledWith("u1", "h1");
  });

  test("a non-member is refused with a 403", async () => {
    stubPusherEnv();
    vi.mocked(isMember).mockResolvedValue(false);
    await expect(
      authorizeChannel("1234.1234", "private-household-h1", "u1"),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("a channel that is not private-household-<id> is refused with a 403", async () => {
    stubPusherEnv();
    vi.mocked(isMember).mockResolvedValue(true);
    await expect(authorizeChannel("1234.1234", "private-foobar", "u1")).rejects.toMatchObject({
      status: 403,
    });
    await expect(authorizeChannel("1234.1234", "household-h1", "u1")).rejects.toMatchObject({
      status: 403,
    });
  });
});
