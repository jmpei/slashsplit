// Expenses API (#6) through real route handlers and Postgres: itemized, equal and ratio splits,
// listing, viewing, editing, deleting, and 401/403 access checks.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { auth } from "@/server/auth";
import { POST as createHousehold } from "@/app/api/v1/households/route";
import { POST as joinHousehold } from "@/app/api/v1/households/join/route";
import {
  GET as listExpenses,
  POST as createExpense,
} from "@/app/api/v1/households/[id]/expenses/route";
import {
  DELETE as deleteExpense,
  GET as getExpense,
  PATCH as updateExpense,
} from "@/app/api/v1/households/[id]/expenses/[eid]/route";

const runId = Date.now();
const domain = `-exp-${runId}@test.slashsplit.dev`;
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

function request(
  path: string,
  caller: Caller | null,
  options?: { method?: string; body?: unknown },
): Request {
  const method = options?.method ?? (options?.body === undefined ? "GET" : "POST");
  return new Request(`http://localhost:3100${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(caller ? { cookie: caller.cookie } : {}),
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

const householdParams = (id: string) => ({ params: Promise.resolve({ id }) });
const expenseParams = (id: string, eid: string) => ({ params: Promise.resolve({ id, eid }) });

let ada: Caller;
let bo: Caller;
let cy: Caller;
let eve: Caller;
let houseId: string;

beforeAll(async () => {
  [ada, bo, cy, eve] = await Promise.all([
    signUp("Ada"),
    signUp("Bo"),
    signUp("Cy"),
    signUp("Eve"),
  ]);
  const res = await createHousehold(request("/api/v1/households", ada, { body: { name: "Oak House" } }));
  const house = await res.json();
  houseId = house.id;
  createdHouseholdIds.push(houseId);
  await joinHousehold(request("/api/v1/households/join", bo, { body: { inviteCode: house.inviteCode } }));
  await joinHousehold(request("/api/v1/households/join", cy, { body: { inviteCode: house.inviteCode } }));
});

afterAll(async () => {
  await prisma.household.deleteMany({ where: { id: { in: createdHouseholdIds } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
  await prisma.$disconnect();
});

describe("recording and managing expenses", () => {
  test("itemized split stores items, participants and the PLAN §5.3 shares (800 / 800 / 500)", async () => {
    const res = await createExpense(
      request(`/api/v1/households/${houseId}/expenses`, ada, {
        body: {
          payerId: ada.userId,
          merchant: "Corner Market",
          date: "2026-11-08",
          splitMode: "ITEMIZED",
          totalCents: 2100,
          items: [
            {
              name: "Milk",
              priceCents: 600,
              taxCodes: [],
              participantIds: [ada.userId, bo.userId, cy.userId],
            },
            {
              name: "Beer",
              priceCents: 1200,
              taxCodes: [],
              participantIds: [ada.userId, bo.userId],
            },
            {
              name: "Yogurt",
              priceCents: 300,
              taxCodes: [],
              participantIds: [cy.userId],
            },
          ],
          taxes: [],
        },
      }),
      householdParams(houseId),
    );
    expect(res.status).toBe(201);
    const expense = await res.json();
    expect(expense).toMatchObject({
      householdId: houseId,
      payerId: ada.userId,
      merchant: "Corner Market",
      date: "2026-11-08",
      splitMode: "ITEMIZED",
      status: "CONFIRMED",
      totalCents: 2100,
    });
    expect(expense.shares).toEqual([
      { userId: ada.userId, amountCents: 800 },
      { userId: bo.userId, amountCents: 800 },
      { userId: cy.userId, amountCents: 500 },
    ]);
    expect(expense.items).toHaveLength(3);
  });

  test("itemized split allocates taxes proportionally before splitting items", async () => {
    const res = await createExpense(
      request(`/api/v1/households/${houseId}/expenses`, ada, {
        body: {
          payerId: bo.userId,
          merchant: "Costco",
          date: "2026-11-08",
          splitMode: "ITEMIZED",
          totalCents: 848,
          items: [
            { name: "Chips", priceCents: 499, taxCodes: ["GST"], participantIds: [ada.userId] },
            { name: "Soda", priceCents: 299, taxCodes: ["GST"], participantIds: [bo.userId] },
          ],
          taxes: [{ code: "GST", amountCents: 50 }],
        },
      }),
      householdParams(houseId),
    );
    expect(res.status).toBe(201);
    const expense = await res.json();
    expect(expense.shares).toEqual([
      { userId: ada.userId, amountCents: 530 },
      { userId: bo.userId, amountCents: 318 },
      { userId: cy.userId, amountCents: 0 },
    ]);
  });

  test("EQUAL mode splits the whole bill equally in member join order", async () => {
    const res = await createExpense(
      request(`/api/v1/households/${houseId}/expenses`, ada, {
        body: {
          payerId: ada.userId,
          merchant: "Hydro",
          date: "2026-11-08",
          splitMode: "EQUAL",
          totalCents: 1000,
          items: [],
          taxes: [],
        },
      }),
      householdParams(houseId),
    );
    expect(res.status).toBe(201);
    const expense = await res.json();
    expect(expense.shares).toEqual([
      { userId: ada.userId, amountCents: 334 },
      { userId: bo.userId, amountCents: 333 },
      { userId: cy.userId, amountCents: 333 },
    ]);
  });

  test("RATIO mode splits the whole bill by member weights", async () => {
    const res = await createExpense(
      request(`/api/v1/households/${houseId}/expenses`, ada, {
        body: {
          payerId: ada.userId,
          merchant: "Rent",
          date: "2026-11-08",
          splitMode: "RATIO",
          totalCents: 2000,
          weights: [
            { userId: ada.userId, weight: 40 },
            { userId: bo.userId, weight: 30 },
            { userId: cy.userId, weight: 30 },
          ],
          items: [],
          taxes: [],
        },
      }),
      householdParams(houseId),
    );
    expect(res.status).toBe(201);
    const expense = await res.json();
    expect(expense.shares).toEqual([
      { userId: ada.userId, amountCents: 800 },
      { userId: bo.userId, amountCents: 600 },
      { userId: cy.userId, amountCents: 600 },
    ]);
  });

  test("list, view, edit and delete an expense", async () => {
    const created = await createExpense(
      request(`/api/v1/households/${houseId}/expenses`, ada, {
        body: {
          payerId: ada.userId,
          merchant: "Bakery",
          date: "2026-11-09",
          splitMode: "EQUAL",
          totalCents: 900,
          items: [],
          taxes: [],
        },
      }),
      householdParams(houseId),
    );
    expect(created.status).toBe(201);
    const { id: eid } = await created.json();

    const listRes = await listExpenses(
      request(`/api/v1/households/${houseId}/expenses`, bo),
      householdParams(houseId),
    );
    expect(listRes.status).toBe(200);
    const all = await listRes.json();
    expect(all.some((e: { id: string }) => e.id === eid)).toBe(true);

    const viewRes = await getExpense(
      request(`/api/v1/households/${houseId}/expenses/${eid}`, bo),
      expenseParams(houseId, eid),
    );
    expect(viewRes.status).toBe(200);
    expect(await viewRes.json()).toMatchObject({ id: eid, merchant: "Bakery", totalCents: 900 });

    const patchRes = await updateExpense(
      request(`/api/v1/households/${houseId}/expenses/${eid}`, ada, {
        method: "PATCH",
        body: {
          payerId: bo.userId,
          merchant: "Corner Bakery",
          date: "2026-11-09",
          splitMode: "EQUAL",
          totalCents: 1200,
          items: [],
          taxes: [],
        },
      }),
      expenseParams(houseId, eid),
    );
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.merchant).toBe("Corner Bakery");
    expect(updated.shares).toEqual([
      { userId: ada.userId, amountCents: 400 },
      { userId: bo.userId, amountCents: 400 },
      { userId: cy.userId, amountCents: 400 },
    ]);

    const delRes = await deleteExpense(
      request(`/api/v1/households/${houseId}/expenses/${eid}`, ada, { method: "DELETE" }),
      expenseParams(houseId, eid),
    );
    expect(delRes.status).toBe(204);

    const afterDel = await getExpense(
      request(`/api/v1/households/${houseId}/expenses/${eid}`, ada),
      expenseParams(houseId, eid),
    );
    expect(afterDel.status).toBe(404);
  });

  test("rejects an itemized expense when items plus taxes do not equal totalCents", async () => {
    const res = await createExpense(
      request(`/api/v1/households/${houseId}/expenses`, ada, {
        body: {
          payerId: ada.userId,
          merchant: "Bad Math",
          date: "2026-11-08",
          splitMode: "ITEMIZED",
          totalCents: 999,
          items: [{ name: "Milk", priceCents: 600, taxCodes: [], participantIds: [ada.userId] }],
          taxes: [],
        },
      }),
      householdParams(houseId),
    );
    expect(res.status).toBe(400);
  });
});

describe("expense route access rules", () => {
  test("non-members get 403 on list, create, view, edit and delete", async () => {
    expect(
      (await listExpenses(request(`/api/v1/households/${houseId}/expenses`, eve), householdParams(houseId)))
        .status,
    ).toBe(403);
    expect(
      (
        await createExpense(
          request(`/api/v1/households/${houseId}/expenses`, eve, {
            body: {
              payerId: ada.userId,
              merchant: "X",
              date: "2026-11-08",
              splitMode: "EQUAL",
              totalCents: 300,
              items: [],
              taxes: [],
            },
          }),
          householdParams(houseId),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await getExpense(
          request(`/api/v1/households/${houseId}/expenses/any`, eve),
          expenseParams(houseId, "any"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await updateExpense(
          request(`/api/v1/households/${houseId}/expenses/any`, eve, { method: "PATCH", body: {} }),
          expenseParams(houseId, "any"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await deleteExpense(
          request(`/api/v1/households/${houseId}/expenses/any`, eve, { method: "DELETE" }),
          expenseParams(houseId, "any"),
        )
      ).status,
    ).toBe(403);
  });

  test("signed-out callers get 401", async () => {
    expect(
      (await listExpenses(request(`/api/v1/households/${houseId}/expenses`, null), householdParams(houseId)))
        .status,
    ).toBe(401);
  });
});
