// Confirming a receipt draft (#10) through the real route handlers and Postgres. Drafts come from the
// scan endpoint with fixture extractors (RECEIPT_EXTRACTOR=fixture:<name>), so no test calls Gemini.
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { prisma } from "@/lib/db";
import { auth } from "@/server/auth";
import { POST as createHousehold } from "@/app/api/v1/households/route";
import { POST as joinHousehold } from "@/app/api/v1/households/join/route";
import { GET as getBalances } from "@/app/api/v1/households/[id]/balances/route";
import { GET as listExpenses } from "@/app/api/v1/households/[id]/expenses/route";
import {
  DELETE as deleteExpense,
  GET as getExpense,
  PATCH as updateExpense,
} from "@/app/api/v1/households/[id]/expenses/[eid]/route";
import { POST as confirmDraft } from "@/app/api/v1/households/[id]/expenses/[eid]/confirm/route";
import { POST as scanReceipt } from "@/app/api/v1/households/[id]/receipts/scan/route";

const runId = Date.now();
const domain = `-conf-${runId}@test.slashsplit.dev`;
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

function postRequest(path: string, caller: Caller, body?: unknown): Request {
  return new Request(`http://localhost:3100${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: caller.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const householdParams = (id: string) => ({ params: Promise.resolve({ id }) });
const expenseParams = (id: string, eid: string) => ({ params: Promise.resolve({ id, eid }) });
const smallJpeg = { mimeType: "image/jpeg", dataBase64: "/9j/4AAQ" };

async function scanDraft(fixture: string, household = houseId, caller: Caller = ada): Promise<string> {
  vi.stubEnv("RECEIPT_EXTRACTOR", `fixture:${fixture}`);
  const res = await scanReceipt(
    request(`/api/v1/households/${household}/receipts/scan`, caller, smallJpeg),
    householdParams(household),
  );
  expect(res.status).toBe(201);
  return (await res.json()).id;
}

function confirm(eid: string, caller: Caller = ada, body?: unknown, household = houseId) {
  return confirmDraft(
    postRequest(`/api/v1/households/${household}/expenses/${eid}/confirm`, caller, body),
    expenseParams(household, eid),
  );
}

async function fetchExpense(eid: string) {
  const res = await getExpense(
    request(`/api/v1/households/${houseId}/expenses/${eid}`, ada),
    expenseParams(houseId, eid),
  );
  return res.json();
}

async function fetchBalances() {
  const res = await getBalances(
    request(`/api/v1/households/${houseId}/balances`, ada),
    householdParams(houseId),
  );
  return res.json();
}

let ada: Caller;
let bo: Caller;
let cy: Caller;
let eve: Caller;
let houseId: string;
let eveHouseId: string;

beforeAll(async () => {
  [ada, bo, cy, eve] = await Promise.all([
    signUp("Ada"),
    signUp("Bo"),
    signUp("Cy"),
    signUp("Eve"),
  ]);
  const res = await createHousehold(request("/api/v1/households", ada, { name: "Birch House" }));
  const house = await res.json();
  houseId = house.id;
  createdHouseholdIds.push(houseId);
  await joinHousehold(request("/api/v1/households/join", bo, { inviteCode: house.inviteCode }));
  await joinHousehold(request("/api/v1/households/join", cy, { inviteCode: house.inviteCode }));

  const eveRes = await createHousehold(request("/api/v1/households", eve, { name: "Eve House" }));
  eveHouseId = (await eveRes.json()).id;
  createdHouseholdIds.push(eveHouseId);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.household.deleteMany({ where: { id: { in: createdHouseholdIds } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
  await prisma.$disconnect();
});

describe("confirming a receipt draft", () => {
  test("a mismatched draft (items + taxes ≠ total) is rejected with 400 and stays DRAFT", async () => {
    const eid = await scanDraft("mismatch");
    const res = await confirm(eid);
    expect(res.status).toBe(400);
    expect(await fetchExpense(eid)).toMatchObject({ status: "DRAFT", totalCents: 9999, shares: [] });

    // An edited body that still does not add up is rejected too, and nothing is saved.
    const stillWrong = await confirm(eid, ada, {
      totalCents: 9999,
      items: [{ name: "Chips", priceCents: 499, taxCodes: ["GST"], participantIds: [ada.userId] }],
      taxes: [{ code: "GST", amountCents: 25 }],
    });
    expect(stillWrong.status).toBe(400);
    const after = await fetchExpense(eid);
    expect(after.status).toBe("DRAFT");
    expect(after.items).toHaveLength(2);
  });

  test("a draft with no items is rejected with 400 and stays DRAFT", async () => {
    const eid = await scanDraft("malformed");
    const res = await confirm(eid);
    expect(res.status).toBe(400);
    expect(await fetchExpense(eid)).toMatchObject({ status: "DRAFT", items: [], shares: [] });

    const emptyEdit = await confirm(eid, ada, { totalCents: 0, items: [], taxes: [] });
    expect(emptyEdit.status).toBe(400);
    expect((await fetchExpense(eid)).status).toBe("DRAFT");
  });

  test("a matching draft confirms with 200, becomes CONFIRMED, and its shares add up to the total", async () => {
    const before = await fetchBalances();
    const eid = await scanDraft("costco");
    const res = await confirm(eid);
    expect(res.status).toBe(200);
    const confirmed = await res.json();
    expect(confirmed).toMatchObject({ id: eid, status: "CONFIRMED", scanError: null, totalCents: 1123 });
    // Milk 599 / 3 -> 200, 200, 199; Chips 499 + GST 25 = 524 / 3 -> 175, 175, 174.
    expect(confirmed.shares).toEqual([
      { userId: ada.userId, amountCents: 375 },
      { userId: bo.userId, amountCents: 375 },
      { userId: cy.userId, amountCents: 373 },
    ]);
    const sum = confirmed.shares.reduce((a: number, s: { amountCents: number }) => a + s.amountCents, 0);
    expect(sum).toBe(1123);
    expect(await fetchExpense(eid)).toMatchObject({ status: "CONFIRMED", shares: confirmed.shares });

    const after = await fetchBalances();
    const net = (list: { userId: string; netCents: number }[], id: string) =>
      list.find((b) => b.userId === id)!.netCents;
    expect(net(after, ada.userId) - net(before, ada.userId)).toBe(1123 - 375);
    expect(net(after, cy.userId) - net(before, cy.userId)).toBe(-373);
  });

  test("confirming an already CONFIRMED expense returns 409", async () => {
    const eid = await scanDraft("costco");
    expect((await confirm(eid)).status).toBe(200);
    const again = await confirm(eid);
    expect(again.status).toBe(409);
  });

  test("an expense that is not in this household returns 404", async () => {
    const elsewhere = await scanDraft("costco", eveHouseId, eve);
    const res = await confirm(elsewhere);
    expect(res.status).toBe(404);
    expect((await confirm("no-such-expense")).status).toBe(404);
    const row = await prisma.expense.findUnique({ where: { id: elsewhere } });
    expect(row?.status).toBe("DRAFT");
  });

  test("a non-member gets 403 and the draft stays DRAFT", async () => {
    const eid = await scanDraft("costco");
    const res = await confirm(eid, eve);
    expect(res.status).toBe(403);
    expect((await fetchExpense(eid)).status).toBe("DRAFT");
  });

  test("an edited body with one item deleted and one added confirms with the edited items", async () => {
    const eid = await scanDraft("mismatch");
    // Delete Milk, keep Chips (GST), add Paper towels for Ada and Bo: 499 + 9475 + 25 = 9999.
    const res = await confirm(eid, ada, {
      totalCents: 9999,
      items: [
        { name: "Chips", priceCents: 499, taxCodes: ["GST"], participantIds: [ada.userId, bo.userId, cy.userId] },
        { name: "Paper towels", priceCents: 9475, taxCodes: [], participantIds: [ada.userId, bo.userId] },
      ],
      taxes: [{ code: "GST", amountCents: 25 }],
    });
    expect(res.status).toBe(200);
    const confirmed = await res.json();
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.items.map((i: { name: string }) => i.name)).toEqual(["Chips", "Paper towels"]);
    // Chips 524 / 3 -> 175, 175, 174; Paper towels 9475 / 2 -> 4738, 4737.
    expect(confirmed.shares).toEqual([
      { userId: ada.userId, amountCents: 4913 },
      { userId: bo.userId, amountCents: 4912 },
      { userId: cy.userId, amountCents: 174 },
    ]);
    const stored = await fetchExpense(eid);
    expect(stored.items).toHaveLength(2);
    expect(stored.items[1]).toMatchObject({
      name: "Paper towels",
      priceCents: 9475,
      participantIds: [ada.userId, bo.userId],
    });
    expect(stored.taxes).toEqual([{ code: "GST", amountCents: 25 }]);
  });

  test("filling in a failed scan by hand confirms it and clears scanError", async () => {
    const eid = await scanDraft("malformed");
    const res = await confirm(eid, ada, {
      merchant: "Bakery",
      totalCents: 600,
      items: [{ name: "Bread", priceCents: 600, taxCodes: [], participantIds: [ada.userId, bo.userId] }],
      taxes: [],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "CONFIRMED",
      scanError: null,
      merchant: "Bakery",
      shares: [
        { userId: ada.userId, amountCents: 300 },
        { userId: bo.userId, amountCents: 300 },
        { userId: cy.userId, amountCents: 0 },
      ],
    });
  });
});

describe("listing expenses by status", () => {
  test("GET /expenses lists only CONFIRMED expenses; ?status=DRAFT lists only drafts", async () => {
    const draftId = await scanDraft("costco");
    const confirmedId = await scanDraft("costco");
    expect((await confirm(confirmedId)).status).toBe(200);

    const listRes = await listExpenses(
      request(`/api/v1/households/${houseId}/expenses`, ada),
      householdParams(houseId),
    );
    expect(listRes.status).toBe(200);
    const confirmedList: { id: string; status: string }[] = await listRes.json();
    expect(confirmedList.some((e) => e.id === confirmedId)).toBe(true);
    expect(confirmedList.some((e) => e.id === draftId)).toBe(false);
    expect(confirmedList.every((e) => e.status === "CONFIRMED")).toBe(true);

    const draftRes = await listExpenses(
      request(`/api/v1/households/${houseId}/expenses?status=DRAFT`, ada),
      householdParams(houseId),
    );
    expect(draftRes.status).toBe(200);
    const drafts: { id: string; status: string }[] = await draftRes.json();
    expect(drafts.some((e) => e.id === draftId)).toBe(true);
    expect(drafts.some((e) => e.id === confirmedId)).toBe(false);
    expect(drafts.every((e) => e.status === "DRAFT")).toBe(true);
  });

  test("an unknown status value returns 400", async () => {
    const res = await listExpenses(
      request(`/api/v1/households/${houseId}/expenses?status=PAID`, ada),
      householdParams(houseId),
    );
    expect(res.status).toBe(400);
  });
});

describe("editing or discarding a draft outside confirm", () => {
  test("PATCH on a DRAFT answers 409 and leaves the draft untouched", async () => {
    const draftId = await scanDraft("costco");
    const before = await fetchExpense(draftId);
    const res = await updateExpense(
      new Request(`http://localhost:3100/api/v1/households/${houseId}/expenses/${draftId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: ada.cookie },
        body: JSON.stringify({
          payerId: ada.userId,
          merchant: "Edited",
          date: "2026-11-02",
          splitMode: "EQUAL",
          totalCents: 900,
        }),
      }),
      expenseParams(houseId, draftId),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/confirm/i);
    const after = await fetchExpense(draftId);
    expect(after).toEqual(before);
    expect(after).toMatchObject({ status: "DRAFT", merchant: "Costco", shares: [] });
  });

  test("DELETE discards a draft", async () => {
    const draftId = await scanDraft("costco");
    const res = await deleteExpense(
      new Request(`http://localhost:3100/api/v1/households/${houseId}/expenses/${draftId}`, {
        method: "DELETE",
        headers: { cookie: ada.cookie },
      }),
      expenseParams(houseId, draftId),
    );
    expect(res.status).toBe(204);
    expect(await prisma.expense.findUnique({ where: { id: draftId } })).toBeNull();
  });
});
