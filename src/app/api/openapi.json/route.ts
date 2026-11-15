// GET /api/openapi.json (#8): serves the OpenAPI 3.1 specification generated from the zod schemas.
import { buildOpenApiSpec } from "@/lib/openapi";

export async function GET() {
  return Response.json(buildOpenApiSpec());
}
