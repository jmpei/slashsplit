// Personal API tokens (#13) through the real route handlers and Postgres: create (plaintext once),
// list without secrets, revoke, and Bearer authentication on /api/v1.
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { GET as listTokens, POST as createToken } from "@/app/api/v1/tokens/route";
import { DELETE as deleteToken } from "@/app/api/v1/tokens/[id]/route";
import { GET as listHouseholds, POST as createHousehold } from "@/app/api/v1/households/route";

const runId = Date.now();
const domain = `-tokens-${runId}@test.slashsplit.dev`;

type Caller = { userId: string; headers: Record<string, string> };

async function signUp(name: string): Promise<Caller> {
  const { headers, response } = await auth.api.signUpEmail({
    returnHeaders: true,
    body: { name, email: `${name.toLowerCase()}${domain}`, password: "correct-horse-battery" },
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { userId: response.user.id, headers: { cookie } };
}

const bearer = (token: string): Caller => ({ userId: "", headers: { authorization: `Bearer ${token}` } });

function request(path: string, caller: Caller | null, method = "GET", body?: unknown): Request {
  return new Request(`http://localhost:3100${path}`, {
    method,
    headers: { "content-type": "application/json", ...(caller?.headers ?? {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function create(caller: Caller, name: string) {
  const res = await createToken(request("/api/v1/tokens", caller, "POST", { name }));
  return { res, body: await res.json().catch(() => null) };
}

let ada: Caller;
let bo: Caller;

beforeAll(async () => {
  [ada, bo] = await Promise.all([signUp("Ada"), signUp("Bo")]);
});

afterAll(async () => {
  // Deleting the users cascades to their households' memberships and their tokens.
  const users = await prisma.user.findMany({ where: { email: { endsWith: domain } } });
  await prisma.household.deleteMany({
    where: { memberships: { some: { userId: { in: users.map((u) => u.id) } } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
  await prisma.$disconnect();
});

describe("creating a token", () => {
  test("returns the plaintext token once, with its id, name and creation time", async () => {
    const { res, body } = await create(ada, "Laptop script");
    expect(res.status).toBe(201);
    expect(body).toMatchObject({ name: "Laptop script" });
    expect(body.id).toEqual(expect.any(String));
    expect(body.token).toMatch(/^ss_[0-9a-f]{48}$/);
    expect(new Date(body.createdAt).toString()).not.toBe("Invalid Date");
  });

  test("stores only the sha256 hash of the token", async () => {
    const { res, body } = await create(ada, "Hashed");
    expect(res.status).toBe(201);
    const rows = await prisma.$queryRaw<{ tokenHash: string }[]>`
      SELECT "tokenHash" FROM "ApiToken" WHERE id = ${body.id}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(createHash("sha256").update(body.token).digest("hex"));
    expect(rows[0].tokenHash).not.toContain(body.token);
  });

  test("an empty name answers 400", async () => {
    const { res } = await create(ada, "   ");
    expect(res.status).toBe(400);
  });
});

describe("listing tokens", () => {
  test("shows my tokens without the token or its hash", async () => {
    const { body: created } = await create(bo, "CI job");
    const res = await listTokens(request("/api/v1/tokens", bo));
    expect(res.status).toBe(200);
    const tokens = await res.json();
    const mine = tokens.find((t: { id: string }) => t.id === created.id);
    expect(mine).toMatchObject({ id: created.id, name: "CI job", lastUsedAt: null });
    expect(mine.createdAt).toEqual(expect.any(String));
    for (const t of tokens) {
      expect(t).not.toHaveProperty("token");
      expect(t).not.toHaveProperty("tokenHash");
    }
    expect(JSON.stringify(tokens)).not.toContain(created.token);
  });

  test("does not show other users' tokens", async () => {
    const { body: adas } = await create(ada, "Ada only");
    const res = await listTokens(request("/api/v1/tokens", bo));
    expect(res.status).toBe(200);
    const ids = (await res.json()).map((t: { id: string }) => t.id);
    expect(ids).not.toContain(adas.id);
  });
});

describe("revoking a token", () => {
  test("answers 204 and removes it from my list", async () => {
    const { body: created } = await create(ada, "Old phone");
    const res = await deleteToken(request(`/api/v1/tokens/${created.id}`, ada, "DELETE"), params(created.id));
    expect(res.status).toBe(204);
    const ids = (await (await listTokens(request("/api/v1/tokens", ada))).json()).map(
      (t: { id: string }) => t.id,
    );
    expect(ids).not.toContain(created.id);
  });

  test("another user's token answers 404 and stays usable", async () => {
    const { body: created } = await create(ada, "Not Bo's");
    const res = await deleteToken(request(`/api/v1/tokens/${created.id}`, bo, "DELETE"), params(created.id));
    expect(res.status).toBe(404);
    expect((await listHouseholds(request("/api/v1/households", bearer(created.token)))).status).toBe(200);
  });

  test("an unknown id answers 404", async () => {
    const res = await deleteToken(request("/api/v1/tokens/nope", ada, "DELETE"), params("nope"));
    expect(res.status).toBe(404);
  });
});

describe("Bearer authentication", () => {
  test("a token authenticates GET /api/v1/households as its owner", async () => {
    const house = await createHousehold(request("/api/v1/households", bo, "POST", { name: "Bo's Flat" }));
    const { id: houseId } = await house.json();
    const { body: created } = await create(bo, "Households script");
    expect(typeof created?.token).toBe("string");

    const res = await listHouseholds(request("/api/v1/households", bearer(created.token)));
    expect(res.status).toBe(200);
    expect((await res.json()).map((h: { id: string }) => h.id)).toContain(houseId);
  });

  test("using a token records lastUsedAt", async () => {
    const { body: created } = await create(bo, "Tracked");
    expect(typeof created?.token).toBe("string");
    await listHouseholds(request("/api/v1/households", bearer(created.token)));
    const tokens = await (await listTokens(request("/api/v1/tokens", bo))).json();
    const used = tokens.find((t: { id: string }) => t.id === created.id);
    expect(used.lastUsedAt).toEqual(expect.any(String));
  });

  test("the scheme name is case-insensitive: `bearer <token>` works", async () => {
    const { body: created } = await create(bo, "Lowercase scheme");
    expect(typeof created?.token).toBe("string");
    const lower: Caller = { userId: "", headers: { authorization: `bearer ${created.token}` } };
    expect((await listHouseholds(request("/api/v1/households", lower))).status).toBe(200);
    const upper: Caller = { userId: "", headers: { authorization: `BEARER ${created.token}` } };
    expect((await listHouseholds(request("/api/v1/households", upper))).status).toBe(200);
  });

  test("an unknown token answers 401", async () => {
    const res = await listHouseholds(request("/api/v1/households", bearer(`ss_${"0".repeat(48)}`)));
    expect(res.status).toBe(401);
  });

  test("a revoked token answers 401", async () => {
    const { body: created } = await create(ada, "Revoked");
    expect(typeof created?.token).toBe("string");
    await deleteToken(request(`/api/v1/tokens/${created.id}`, ada, "DELETE"), params(created.id));
    const res = await listHouseholds(request("/api/v1/households", bearer(created.token)));
    expect(res.status).toBe(401);
  });
});

describe("token management needs the browser session", () => {
  // A leaked token must not mint a fresh token that outlives revoking the leaked one.
  async function expectSessionRequired(res: Response) {
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/browser session/i);
  }

  test("a Bearer token cannot list tokens", async () => {
    const { body: created } = await create(bo, "No listing");
    await expectSessionRequired(await listTokens(request("/api/v1/tokens", bearer(created.token))));
  });

  test("a Bearer token cannot create a token, and none is stored", async () => {
    const { body: created } = await create(bo, "No minting");
    const before = await prisma.apiToken.count({ where: { userId: bo.userId } });
    await expectSessionRequired(
      await createToken(request("/api/v1/tokens", bearer(created.token), "POST", { name: "Minted" })),
    );
    expect(await prisma.apiToken.count({ where: { userId: bo.userId } })).toBe(before);
  });

  test("a Bearer token cannot revoke a token, which stays usable", async () => {
    const { body: target } = await create(bo, "Survivor");
    const { body: caller } = await create(bo, "Revoker");
    await expectSessionRequired(
      await deleteToken(
        request(`/api/v1/tokens/${target.id}`, bearer(caller.token), "DELETE"),
        params(target.id),
      ),
    );
    expect((await listHouseholds(request("/api/v1/households", bearer(target.token)))).status).toBe(200);
  });

  test("a lowercase `bearer` scheme is refused the same way", async () => {
    const { body: created } = await create(bo, "Lowercase manager");
    const lower: Caller = { userId: "", headers: { authorization: `bearer ${created.token}` } };
    await expectSessionRequired(await listTokens(request("/api/v1/tokens", lower)));
  });
});

describe("signed-out callers", () => {
  test("get 401 on every token route", async () => {
    expect((await listTokens(request("/api/v1/tokens", null))).status).toBe(401);
    expect((await createToken(request("/api/v1/tokens", null, "POST", { name: "X" }))).status).toBe(401);
    expect((await deleteToken(request("/api/v1/tokens/x", null, "DELETE"), params("x"))).status).toBe(401);
  });
});
