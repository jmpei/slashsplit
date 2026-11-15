// Households and invite codes (#4) through the real route handlers and Postgres: create, join,
// list members, and the membership check every /households/{id}/… route must make.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { auth } from "@/server/auth";
import { GET as listHouseholds, POST as createHousehold } from "@/app/api/v1/households/route";
import { POST as joinHousehold } from "@/app/api/v1/households/join/route";
import { GET as listMembers } from "@/app/api/v1/households/[id]/members/route";

const runId = Date.now();
const domain = `-${runId}@test.slashsplit.dev`;
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

function request(path: string, caller: Caller | null, body?: unknown): Request {
  return new Request(`http://localhost:3100${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(caller ? { cookie: caller.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function create(caller: Caller, name: string) {
  const res = await createHousehold(request("/api/v1/households", caller, { name }));
  const body = await res.json();
  if (res.status === 201) createdHouseholdIds.push(body.id);
  return { res, body };
}

let ada: Caller;
let bo: Caller;
let eve: Caller;

beforeAll(async () => {
  [ada, bo, eve] = await Promise.all([signUp("Ada"), signUp("Bo"), signUp("Eve")]);
});

afterAll(async () => {
  await prisma.household.deleteMany({ where: { id: { in: createdHouseholdIds } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
  await prisma.$disconnect();
});

describe("creating a household", () => {
  test("makes me its owner and gives an invite code", async () => {
    const { res, body } = await create(ada, "Maple House");
    expect(res.status).toBe(201);
    expect(body).toMatchObject({ name: "Maple House", role: "OWNER" });
    expect(body.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  test("each household gets its own invite code", async () => {
    const a = await create(ada, "One");
    const b = await create(ada, "Two");
    expect(a.body.inviteCode).not.toBe(b.body.inviteCode);
  });

  test("an empty name answers 400", async () => {
    const { res } = await create(ada, "   ");
    expect(res.status).toBe(400);
  });

  test("lists only the households I belong to", async () => {
    const mine = await create(bo, "Bo's Place");
    const res = await listHouseholds(request("/api/v1/households", eve));
    expect(res.status).toBe(200);
    const ids = (await res.json()).map((h: { id: string }) => h.id);
    expect(ids).not.toContain(mine.body.id);
  });
});

describe("joining with an invite code", () => {
  test("someone who joins appears in the member list, in join order", async () => {
    const { body: house } = await create(ada, "Cedar Flat");
    const join = await joinHousehold(
      request("/api/v1/households/join", bo, { inviteCode: house.inviteCode }),
    );
    expect(join.status).toBe(200);
    expect(await join.json()).toMatchObject({ id: house.id, role: "MEMBER" });

    const res = await listMembers(request(`/api/v1/households/${house.id}/members`, ada), params(house.id));
    expect(res.status).toBe(200);
    const members = await res.json();
    expect(members.map((m: { name: string; role: string }) => [m.name, m.role])).toEqual([
      ["Ada", "OWNER"],
      ["Bo", "MEMBER"],
    ]);
  });

  test("joining twice keeps one membership", async () => {
    const { body: house } = await create(ada, "Birch Loft");
    for (let i = 0; i < 2; i++) {
      await joinHousehold(request("/api/v1/households/join", bo, { inviteCode: house.inviteCode }));
    }
    const res = await listMembers(request(`/api/v1/households/${house.id}/members`, bo), params(house.id));
    expect(await res.json()).toHaveLength(2);
  });

  test("the code is not case-sensitive", async () => {
    const { body: house } = await create(ada, "Oak Room");
    const join = await joinHousehold(
      request("/api/v1/households/join", bo, { inviteCode: house.inviteCode.toLowerCase() }),
    );
    expect(join.status).toBe(200);
  });

  test("a wrong invite code answers 404", async () => {
    const res = await joinHousehold(request("/api/v1/households/join", bo, { inviteCode: "ZZZZZZZZ" }));
    expect(res.status).toBe(404);
  });
});

describe("access rules", () => {
  // Every /api/v1/households/{id}/… handler goes here as it is added.
  const householdRoutes = [{ name: "GET members", call: listMembers, path: "members" }];

  test.each(householdRoutes)("$name answers 403 to a non-member", async ({ call, path }) => {
    const { body: house } = await create(ada, "Private");
    const res = await call(request(`/api/v1/households/${house.id}/${path}`, eve), params(house.id));
    expect(res.status).toBe(403);
  });

  test.each(householdRoutes)("$name answers 403 for a household that doesn't exist", async ({ call, path }) => {
    const res = await call(request(`/api/v1/households/nope/${path}`, eve), params("nope"));
    expect(res.status).toBe(403);
  });

  test("signed-out callers get 401", async () => {
    expect((await listHouseholds(request("/api/v1/households", null))).status).toBe(401);
    expect((await createHousehold(request("/api/v1/households", null, { name: "X" }))).status).toBe(401);
    expect(
      (await joinHousehold(request("/api/v1/households/join", null, { inviteCode: "ABCDEFGH" }))).status,
    ).toBe(401);
  });
});
