import { afterAll, expect, test } from "vitest";
import { prisma } from "@/lib/db";

afterAll(async () => {
  await prisma.$disconnect();
});

test("the app can reach Postgres", async () => {
  const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
  expect(rows).toEqual([{ ok: 1 }]);
});
