// Real-time household updates (#11) through the real route handlers and Postgres: every balance-changing
// mutation publishes once, only members get a Pusher channel signature, and the polling fallback's
// version counter moves on every create, edit, delete, confirm and settlement.
import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { prisma } from "@/lib/db";
import { auth } from "@/server/auth";
import { setRealtimePublisher, type RealtimeEvent } from "@/server/realtime";
import { POST as createHousehold } from "@/app/api/v1/households/route";
import { POST as joinHousehold } from "@/app/api/v1/households/join/route";
import { POST as createExpense } from "@/app/api/v1/households/[id]/expenses/route";
import {
  DELETE as deleteExpense,
  PATCH as updateExpense,
} from "@/app/api/v1/households/[id]/expenses/[eid]/route";
import { POST as confirmDraft } from "@/app/api/v1/households/[id]/expenses/[eid]/confirm/route";
import { POST as scanReceipt } from "@/app/api/v1/households/[id]/receipts/scan/route";
import { POST as recordSettlement } from "@/app/api/v1/households/[id]/settlements/route";
import { GET as getVersion } from "@/app/api/v1/households/[id]/version/route";
import { POST as pusherAuth } from "@/app/api/pusher/auth/route";

const runId = Date.now();
const domain = `-rt-${runId}@test.slashsplit.dev`;
const createdHouseholdIds: string[] = [];

type Caller = { userId: string; cookie: string };

async function signUp(name: string): Promise<Caller> {
  const { headers, response } = await auth.api.signUpEmail({
    returnHeaders: true,
    body: { name, email: `${name.toLowerCase()}${domain}`, password: "correct-horse-battery" },
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { userId: response.user.id, cookie };
}

function request(path: string, caller: Caller | null, method = "GET", body?: unknown): Request {
  return new Request(`http://localhost:3100${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(caller ? { cookie: caller.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function authRequest(caller: Caller | null, socketId: string, channelName: string): Request {
  return new Request("http://localhost:3100/api/pusher/auth", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(caller ? { cookie: caller.cookie } : {}),
    },
    body: new URLSearchParams({ socket_id: socketId, channel_name: channelName }).toString(),
  });
}

const householdParams = (id: string) => ({ params: Promise.resolve({ id }) });
const expenseParams = (id: string, eid: string) => ({ params: Promise.resolve({ id, eid }) });

let ada: Caller;
let bo: Caller;
let eve: Caller;
let houseId: string;
const published: RealtimeEvent[] = [];

function expenseBody(totalCents: number) {
  return {
    payerId: ada.userId,
    merchant: "Market",
    date: "2026-11-15",
    splitMode: "ITEMIZED",
    totalCents,
    items: [
      { name: "Food", priceCents: totalCents, taxCodes: [], participantIds: [ada.userId, bo.userId] },
    ],
    taxes: [],
  };
}

async function addExpense(totalCents = 1000): Promise<string> {
  const res = await createExpense(
    request(`/api/v1/households/${houseId}/expenses`, ada, "POST", expenseBody(totalCents)),
    householdParams(houseId),
  );
  expect(res.status).toBe(201);
  return (await res.json()).id;
}

async function editExpense(eid: string, totalCents: number) {
  const res = await updateExpense(
    request(`/api/v1/households/${houseId}/expenses/${eid}`, ada, "PATCH", expenseBody(totalCents)),
    expenseParams(houseId, eid),
  );
  expect(res.status).toBe(200);
}

async function removeExpense(eid: string) {
  const res = await deleteExpense(
    request(`/api/v1/households/${houseId}/expenses/${eid}`, ada, "DELETE"),
    expenseParams(houseId, eid),
  );
  expect(res.status).toBe(204);
}

async function scanAndConfirm() {
  vi.stubEnv("RECEIPT_EXTRACTOR", "fixture:costco");
  const scan = await scanReceipt(
    request(`/api/v1/households/${houseId}/receipts/scan`, ada, "POST", {
      mimeType: "image/jpeg",
      dataBase64: "/9j/4AAQ",
    }),
    householdParams(houseId),
  );
  expect(scan.status).toBe(201);
  const eid = (await scan.json()).id;
  published.length = 0; // Only the confirm is under test; a draft does not change balances.
  const res = await confirmDraft(
    request(`/api/v1/households/${houseId}/expenses/${eid}/confirm`, ada, "POST"),
    expenseParams(houseId, eid),
  );
  expect(res.status).toBe(200);
}

async function settle() {
  const res = await recordSettlement(
    request(`/api/v1/households/${houseId}/settlements`, bo, "POST", {
      fromUserId: bo.userId,
      toUserId: ada.userId,
      amountCents: 100,
    }),
    householdParams(houseId),
  );
  expect(res.status).toBe(201);
}

async function version(caller: Caller | null = ada): Promise<Response> {
  return getVersion(
    request(`/api/v1/households/${houseId}/version`, caller),
    householdParams(houseId),
  );
}

async function currentVersion(): Promise<number> {
  const res = await version();
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(typeof body.version).toBe("number");
  return body.version;
}

function expectOneHouseholdEvent() {
  expect(published).toHaveLength(1);
  expect(published[0]).toMatchObject({
    channel: `private-household-${houseId}`,
    event: "household-updated",
  });
}

beforeAll(async () => {
  [ada, bo, eve] = await Promise.all([signUp("Ada"), signUp("Bo"), signUp("Eve")]);
  const res = await createHousehold(
    request("/api/v1/households", ada, "POST", { name: "Cedar House" }),
  );
  const house = await res.json();
  houseId = house.id;
  createdHouseholdIds.push(houseId);
  await joinHousehold(
    request("/api/v1/households/join", bo, "POST", { inviteCode: house.inviteCode }),
  );
  setRealtimePublisher(async (event) => {
    published.push(event);
  });
});

afterEach(() => {
  published.length = 0;
  vi.unstubAllEnvs();
});

afterAll(async () => {
  setRealtimePublisher(null);
  await prisma.household.deleteMany({ where: { id: { in: createdHouseholdIds } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
  await prisma.$disconnect();
});

describe("every balance-changing mutation publishes household-updated once", () => {
  test("create expense", async () => {
    await addExpense();
    expectOneHouseholdEvent();
  });

  test("edit expense", async () => {
    const eid = await addExpense();
    published.length = 0;
    await editExpense(eid, 2000);
    expectOneHouseholdEvent();
  });

  test("delete expense", async () => {
    const eid = await addExpense();
    published.length = 0;
    await removeExpense(eid);
    expectOneHouseholdEvent();
  });

  test("confirm draft", async () => {
    await scanAndConfirm();
    expectOneHouseholdEvent();
  });

  test("record settlement", async () => {
    await settle();
    expectOneHouseholdEvent();
  });
});

describe("joining a household (#11)", () => {
  test("a new member bumps the version and publishes household-updated once", async () => {
    const cy = await signUp("Cy");
    const { inviteCode } = (await prisma.household.findUniqueOrThrow({ where: { id: houseId } }));
    const before = await currentVersion();
    published.length = 0;
    const res = await joinHousehold(request("/api/v1/households/join", cy, "POST", { inviteCode }));
    expect(res.status).toBe(200);
    expect(await currentVersion()).toBeGreaterThan(before);
    expectOneHouseholdEvent();
  });

  test("joining again as a member changes nothing and publishes nothing", async () => {
    const { inviteCode } = (await prisma.household.findUniqueOrThrow({ where: { id: houseId } }));
    const before = await currentVersion();
    published.length = 0;
    const res = await joinHousehold(request("/api/v1/households/join", bo, "POST", { inviteCode }));
    expect(res.status).toBe(200);
    expect(await currentVersion()).toBe(before);
    expect(published).toHaveLength(0);
  });
});

describe("POST /api/pusher/auth: only members can subscribe to the household channel", () => {
  const channel = () => `private-household-${houseId}`;

  function stubPusherEnv() {
    vi.stubEnv("PUSHER_APP_ID", "3");
    vi.stubEnv("PUSHER_SECRET", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "test-key");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "mt1");
  }

  test("401 when signed out", async () => {
    stubPusherEnv();
    const res = await pusherAuth(authRequest(null, "1234.1234", channel()));
    expect(res.status).toBe(401);
  });

  test("403 for a non-member", async () => {
    stubPusherEnv();
    const res = await pusherAuth(authRequest(eve, "1234.1234", channel()));
    expect(res.status).toBe(403);
  });

  test("403 for a channel that is not a household channel", async () => {
    stubPusherEnv();
    const res = await pusherAuth(authRequest(ada, "1234.1234", "private-foobar"));
    expect(res.status).toBe(403);
  });

  test("200 with <key>:<signature> for a member", async () => {
    stubPusherEnv();
    const res = await pusherAuth(authRequest(bo, "1234.1234", channel()));
    expect(res.status).toBe(200);
    const signature = createHmac("sha256", "test-secret")
      .update(`1234.1234:${channel()}`)
      .digest("hex");
    expect(await res.json()).toEqual({ auth: `test-key:${signature}` });
  });
});

describe("GET /api/v1/households/{id}/version", () => {
  test("401 signed out, 403 for a non-member", async () => {
    expect((await version(null)).status).toBe(401);
    expect((await version(eve)).status).toBe(403);
  });

  test("increases after create, edit and delete of an expense, a confirm and a settlement", async () => {
    const v0 = await currentVersion();
    const eid = await addExpense();
    const v1 = await currentVersion();
    expect(v1).toBeGreaterThan(v0);

    await editExpense(eid, 3000);
    const v2 = await currentVersion();
    expect(v2).toBeGreaterThan(v1);

    await removeExpense(eid);
    const v3 = await currentVersion();
    expect(v3).toBeGreaterThan(v2);

    await scanAndConfirm();
    const v4 = await currentVersion();
    expect(v4).toBeGreaterThan(v3);

    await settle();
    const v5 = await currentVersion();
    expect(v5).toBeGreaterThan(v4);
  });
});
