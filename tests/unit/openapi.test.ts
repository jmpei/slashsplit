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

  test.each(["/api/v1/households"])(
    "POST %s documents a Bearer token request example (#13)",
    async (routePath) => {
      const doc = await (await getOpenApi()).json();
      const operation = doc.paths?.[routePath]?.post;
      expect(operation, `Missing POST ${routePath}`).toBeDefined();

      const examples = operation?.requestBody?.content?.["application/json"]?.examples ?? {};
      expect(Object.keys(examples).length).toBeGreaterThan(0);
      for (const example of Object.values(examples) as { value?: unknown }[]) {
        expect(example.value).toBeDefined();
      }

      const samples: { source?: string }[] = operation?.["x-codeSamples"] ?? [];
      expect(samples.map((s) => s.source).join("\n")).toMatch(
        /curl[\s\S]*-H "Authorization: Bearer ss_[^"]*"/,
      );
    },
  );

  test("token routes are documented with bearerAuth", async () => {
    const doc = await (await getOpenApi()).json();
    expect(doc.paths?.["/api/v1/tokens"]?.get).toBeDefined();
    expect(doc.paths?.["/api/v1/tokens"]?.post).toBeDefined();
    expect(doc.paths?.["/api/v1/tokens/{id}"]?.delete).toBeDefined();
    expect(doc.security).toEqual([{ bearerAuth: [] }]);
  });

  test("token routes require the session cookie and document 403 for a Bearer token (#13)", async () => {
    const doc = await (await getOpenApi()).json();
    expect(doc.components?.securitySchemes?.cookieAuth).toMatchObject({ type: "apiKey", in: "cookie" });
    const operations = [
      doc.paths?.["/api/v1/tokens"]?.get,
      doc.paths?.["/api/v1/tokens"]?.post,
      doc.paths?.["/api/v1/tokens/{id}"]?.delete,
    ];
    for (const operation of operations) {
      expect(operation?.security).toEqual([{ cookieAuth: [] }]);
      expect(operation?.responses?.["403"]?.description).toMatch(/Bearer/);
    }
    const samples: { source?: string }[] = doc.paths?.["/api/v1/tokens"]?.post?.["x-codeSamples"] ?? [];
    expect(samples.map((s) => s.source).join("\n")).not.toMatch(/Authorization: Bearer/);
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
