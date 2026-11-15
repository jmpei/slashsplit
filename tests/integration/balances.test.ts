// Balances, settlement plan and recording a transfer (#7) through the real route handlers and
// Postgres, including the PLAN §5.6 example (A +2000, B −500, C −1500 → C pays A 1500, B pays A 500).
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { auth } from "@/server/auth";
import { POST as createHousehold } from "@/app/api/v1/households/route";
import { POST as joinHousehold } from "@/app/api/v1/households/join/route";
import { POST as createExpense } from "@/app/api/v1/households/[id]/expenses/route";
import { GET as getBalances } from "@/app/api/v1/households/[id]/balances/route";
import { GET as getSettlementPlan } from "@/app/api/v1/households/[id]/settlement-plan/route";
import { POST as recordSettlement } from "@/app/api/v1/households/[id]/settlements/route";

const runId = Date.now();
const domain = `-bal-${runId}@test.slashsplit.dev`;
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
  const res = await createHousehold(request("/api/v1/households", ada, { name: "Elm House" }));
  const house = await res.json();
  houseId = house.id;
  createdHouseholdIds.push(houseId);
  await joinHousehold(request("/api/v1/households/join", bo, { inviteCode: house.inviteCode }));
  await joinHousehold(request("/api/v1/households/join", cy, { inviteCode: house.inviteCode }));
});

afterAll(async () => {
  await prisma.household.deleteMany({ where: { id: { in: createdHouseholdIds } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
  await prisma.$disconnect();
});

describe("balances, settlement plan, and marking a transfer paid", () => {
  test("A +2000, B −500, C −1500 → C pays A 1500, B pays A 500; paying updates both balances", async () => {
    // Ada pays 2000 for Bo (500) and Cy (1500) -> Ada +2000, Bo -500, Cy -1500.
    const expRes = await createExpense(
      request(`/api/v1/households/${houseId}/expenses`, ada, {
        payerId: ada.userId,
        merchant: "Groceries",
        date: "2026-11-08",
        splitMode: "ITEMIZED",
        totalCents: 2000,
        items: [
          { name: "Snack", priceCents: 500, taxCodes: [], participantIds: [bo.userId] },
          { name: "Roast", priceCents: 1500, taxCodes: [], participantIds: [cy.userId] },
        ],
        taxes: [],
      }),
      params(houseId),
    );
    expect(expRes.status).toBe(201);

    const balRes = await getBalances(
      request(`/api/v1/households/${houseId}/balances`, ada),
      params(houseId),
    );
    expect(balRes.status).toBe(200);
    expect(await balRes.json()).toEqual([
      { userId: ada.userId, netCents: 2000 },
      { userId: bo.userId, netCents: -500 },
      { userId: cy.userId, netCents: -1500 },
    ]);

    const planRes = await getSettlementPlan(
      request(`/api/v1/households/${houseId}/settlement-plan`, ada),
      params(houseId),
    );
    expect(planRes.status).toBe(200);
    expect(await planRes.json()).toEqual([
      { fromUserId: cy.userId, toUserId: ada.userId, amountCents: 1500 },
      { fromUserId: bo.userId, toUserId: ada.userId, amountCents: 500 },
    ]);

    // Mark Cy -> Ada 1500 as paid.
    const payRes = await recordSettlement(
      request(`/api/v1/households/${houseId}/settlements`, cy, {
        fromUserId: cy.userId,
        toUserId: ada.userId,
        amountCents: 1500,
      }),
      params(houseId),
    );
    expect(payRes.status).toBe(201);
    expect(await payRes.json()).toMatchObject({
      householdId: houseId,
      fromUserId: cy.userId,
      toUserId: ada.userId,
      amountCents: 1500,
    });

    const balAfter = await getBalances(
      request(`/api/v1/households/${houseId}/balances`, ada),
      params(houseId),
    );
    expect(await balAfter.json()).toEqual([
      { userId: ada.userId, netCents: 500 },
      { userId: bo.userId, netCents: -500 },
      { userId: cy.userId, netCents: 0 },
    ]);

    const planAfter = await getSettlementPlan(
      request(`/api/v1/households/${houseId}/settlement-plan`, ada),
      params(houseId),
    );
    expect(await planAfter.json()).toEqual([
      { fromUserId: bo.userId, toUserId: ada.userId, amountCents: 500 },
    ]);
  });

  test("rejects non-positive settlement amounts or paying yourself", async () => {
    const zero = await recordSettlement(
      request(`/api/v1/households/${houseId}/settlements`, bo, {
        fromUserId: bo.userId,
        toUserId: ada.userId,
        amountCents: 0,
      }),
      params(houseId),
    );
    expect(zero.status).toBe(400);

    const self = await recordSettlement(
      request(`/api/v1/households/${houseId}/settlements`, bo, {
        fromUserId: bo.userId,
        toUserId: bo.userId,
        amountCents: 100,
      }),
      params(houseId),
    );
    expect(self.status).toBe(400);
  });

  test("non-members get 403 and signed-out callers get 401", async () => {
    expect(
      (await getBalances(request(`/api/v1/households/${houseId}/balances`, eve), params(houseId))).status,
    ).toBe(403);
    expect(
      (
        await getSettlementPlan(
          request(`/api/v1/households/${houseId}/settlement-plan`, eve),
          params(houseId),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await recordSettlement(
          request(`/api/v1/households/${houseId}/settlements`, eve, {
            fromUserId: bo.userId,
            toUserId: ada.userId,
            amountCents: 500,
          }),
          params(houseId),
        )
      ).status,
    ).toBe(403);
    expect(
      (await getBalances(request(`/api/v1/households/${houseId}/balances`, null), params(houseId))).status,
    ).toBe(401);
  });
});
