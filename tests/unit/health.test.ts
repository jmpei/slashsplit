import { describe, expect, test } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  test("answers 200 with status ok so deploy checks can tell the app is up", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
