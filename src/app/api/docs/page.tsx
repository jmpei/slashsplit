// /api/docs (#8): Swagger UI for the OpenAPI document that src/lib/openapi.ts generates from zod.
// Swagger UI has no dark theme, so it sits on a light surface in both color schemes.
import { SwaggerUi } from "./swagger-ui";

export const metadata = { title: "SlashSplit API" };

export default function ApiDocsPage() {
  return (
    <main className="w-full flex-1 bg-white text-zinc-900">
      <SwaggerUi />
    </main>
  );
}
