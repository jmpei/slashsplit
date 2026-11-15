// Receipt scan endpoint (#9) through the real route handler and Postgres. The extractor is the
// fixture one (RECEIPT_EXTRACTOR=fixture:<name>), so no test calls Gemini.
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { prisma } from "@/lib/db";
import { auth } from "@/server/auth";
import { POST as createHousehold } from "@/app/api/v1/households/route";
import { POST as joinHousehold } from "@/app/api/v1/households/join/route";
import { GET as getBalances } from "@/app/api/v1/households/[id]/balances/route";
import { POST as scanReceipt } from "@/app/api/v1/households/[id]/receipts/scan/route";

const runId = Date.now();
const domain = `-rcpt-${runId}@test.slashsplit.dev`;
const createdHouseholdIds: string[] = [];
const MAX_BYTES = 10 * 1024 * 1024;

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

function jsonRequest(path: string, caller: Caller | null, body?: unknown): Request {
  return new Request(`http://localhost:3100${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(caller ? { cookie: caller.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function multipartRequest(path: string, caller: Caller, file: File): Request {
  const form = new FormData();
  form.append("file", file);
  return new Request(`http://localhost:3100${path}`, {
    method: "POST",
    headers: { cookie: caller.cookie },
    body: form,
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const scanPath = () => `/api/v1/households/${houseId}/receipts/scan`;
const smallJpeg = { mimeType: "image/jpeg", dataBase64: "/9j/4AAQ" };

async function scanWithFixture(fixture: string, caller: Caller = ada) {
  vi.stubEnv("RECEIPT_EXTRACTOR", `fixture:${fixture}`);
  return scanReceipt(jsonRequest(scanPath(), caller, smallJpeg), params(houseId));
}

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
  const res = await createHousehold(jsonRequest("/api/v1/households", ada, { name: "Pine House" }));
  const house = await res.json();
  houseId = house.id;
  createdHouseholdIds.push(houseId);
  await joinHousehold(jsonRequest("/api/v1/households/join", bo, { inviteCode: house.inviteCode }));
  await joinHousehold(jsonRequest("/api/v1/households/join", cy, { inviteCode: house.inviteCode }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.household.deleteMany({ where: { id: { in: createdHouseholdIds } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
  await prisma.$disconnect();
});

describe("scanning a receipt into a draft expense", () => {
  test("costco receipt becomes a 201 itemized DRAFT with 2 items, everyone ticked, no shares", async () => {
    const res = await scanWithFixture("costco");
    expect(res.status).toBe(201);
    const draft = await res.json();
    expect(draft).toMatchObject({
      householdId: houseId,
      payerId: ada.userId,
      merchant: "Costco",
      date: "2026-11-01",
      splitMode: "ITEMIZED",
      status: "DRAFT",
      totalCents: 1123,
      scanError: null,
      taxes: [{ code: "GST", amountCents: 25 }],
      shares: [],
    });
    expect(draft.items).toHaveLength(2);
    expect(draft.items[0]).toMatchObject({ name: "Milk 2%", priceCents: 599, taxCodes: [] });
    expect(draft.items[1]).toMatchObject({ name: "Chips", priceCents: 499, taxCodes: ["GST"] });
    for (const item of draft.items) {
      expect(item.participantIds).toEqual([ada.userId, bo.userId, cy.userId]);
    }
  });

  test("a multipart upload is accepted the same way", async () => {
    vi.stubEnv("RECEIPT_EXTRACTOR", "fixture:costco");
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "receipt.png", {
      type: "image/png",
    });
    const res = await scanReceipt(multipartRequest(scanPath(), ada, file), params(houseId));
    expect(res.status).toBe(201);
    const draft = await res.json();
    expect(draft).toMatchObject({ status: "DRAFT", merchant: "Costco", totalCents: 1123 });
  });

  test("mismatched total (items + taxes ≠ total) is still saved as an editable DRAFT", async () => {
    const res = await scanWithFixture("mismatch");
    expect(res.status).toBe(201);
    const draft = await res.json();
    expect(draft).toMatchObject({ status: "DRAFT", totalCents: 9999, scanError: null });
    expect(draft.items).toHaveLength(2);
  });

  test("malformed reply becomes a 201 empty DRAFT carrying scanError", async () => {
    const res = await scanWithFixture("malformed");
    expect(res.status).toBe(201);
    const draft = await res.json();
    expect(draft).toMatchObject({
      status: "DRAFT",
      splitMode: "ITEMIZED",
      payerId: ada.userId,
      totalCents: 0,
      items: [],
      taxes: [],
      shares: [],
    });
    expect(typeof draft.scanError).toBe("string");
    expect(draft.scanError.length).toBeGreaterThan(0);
  });

  test("an extractor that throws also yields an empty DRAFT with scanError", async () => {
    const res = await scanWithFixture("does-not-exist");
    expect(res.status).toBe(201);
    const draft = await res.json();
    expect(draft).toMatchObject({ status: "DRAFT", totalCents: 0, items: [] });
    expect(typeof draft.scanError).toBe("string");
  });

  test("rejects a MIME type outside jpg/png/heic/webp with 400", async () => {
    vi.stubEnv("RECEIPT_EXTRACTOR", "fixture:costco");
    const res = await scanReceipt(
      jsonRequest(scanPath(), ada, { mimeType: "application/pdf", dataBase64: "JVBERi0=" }),
      params(houseId),
    );
    expect(res.status).toBe(400);
  });

  test("rejects an image larger than 10 MB with 400", async () => {
    vi.stubEnv("RECEIPT_EXTRACTOR", "fixture:costco");
    const file = new File([new Uint8Array(MAX_BYTES + 1)], "huge.jpg", { type: "image/jpeg" });
    const res = await scanReceipt(multipartRequest(scanPath(), ada, file), params(houseId));
    expect(res.status).toBe(400);
  });

  test("a non-member gets 403 and no draft is created", async () => {
    const before = await prisma.expense.count({ where: { householdId: houseId } });
    const res = await scanWithFixture("costco", eve);
    expect(res.status).toBe(403);
    expect(await prisma.expense.count({ where: { householdId: houseId } })).toBe(before);
  });

  test("balances are unchanged after a draft is scanned", async () => {
    const before = await (await getBalances(jsonRequest(`/api/v1/households/${houseId}/balances`, ada), params(houseId))).json();
    const res = await scanWithFixture("costco");
    expect(res.status).toBe(201);
    const after = await (await getBalances(jsonRequest(`/api/v1/households/${houseId}/balances`, ada), params(houseId))).json();
    expect(after).toEqual(before);
  });
});
