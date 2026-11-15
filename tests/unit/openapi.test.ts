// OpenAPI 3.1 document (#8): generated from zod schemas and verified against every /api/v1/**/route.ts
// file on disk so a new route can never be forgotten.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { GET as getOpenApi } from "@/app/api/openapi.json/route";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function discoverV1Routes(dir: string, prefix = "/api/v1"): { path: string; methods: string[] }[] {
  const results: { path: string; methods: string[] }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const seg = entry.name.replace(/^\[(.+)\]$/, "{$1}");
      results.push(...discoverV1Routes(full, `${prefix}/${seg}`));
    } else if (entry.isFile() && entry.name === "route.ts") {
      const source = fs.readFileSync(full, "utf8");
      const methods = HTTP_METHODS.filter((m) =>
        new RegExp(`export\\s+(async\\s+function|const)\\s+${m}\\b`).test(source),
      );
      results.push({ path: prefix, methods: [...methods] });
    }
  }
  return results;
}

describe("/api/openapi.json", () => {
  test("returns a valid OpenAPI 3.1 document generated from the zod schemas", async () => {
    const res = await getOpenApi();
    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info).toMatchObject({ title: "SlashSplit API", version: "1.0.0" });
    expect(doc.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });

    const createHouseholdSchema =
      doc.paths?.["/api/v1/households"]?.post?.requestBody?.content?.["application/json"]?.schema;
    expect(createHouseholdSchema?.properties?.name).toMatchObject({
      type: "string",
      minLength: 1,
      maxLength: 60,
    });

    const createExpenseSchema =
      doc.paths?.["/api/v1/households/{id}/expenses"]?.post?.requestBody?.content?.[
        "application/json"
      ]?.schema;
    expect(createExpenseSchema?.properties?.totalCents).toMatchObject({
      type: "integer",
    });
  });

  test("every /api/v1 route and HTTP method on disk is documented in paths", async () => {
    const res = await getOpenApi();
    expect(res.status).toBe(200);
    const doc = await res.json();

    const v1Root = path.join(process.cwd(), "src/app/api/v1");
    const routes = discoverV1Routes(v1Root);
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const documented = doc.paths?.[route.path];
      expect(documented, `Missing path ${route.path} in OpenAPI document`).toBeDefined();
      for (const method of route.methods) {
        expect(
          documented?.[method.toLowerCase()],
          `Missing ${method} ${route.path} in OpenAPI document`,
        ).toBeDefined();
      }
    }
  });
});
