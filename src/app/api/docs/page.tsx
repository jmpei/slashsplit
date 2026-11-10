// /api/docs (#8): Swagger / OpenAPI reference page showing every /api/v1 endpoint, its HTTP method,
// parameters, and JSON request/response schemas generated from zod.
import Link from "next/link";
import { buildOpenApiSpec } from "@/lib/openapi";

const methodBadge: Record<string, string> = {
  get: "bg-sky-600 text-white",
  post: "bg-emerald-600 text-white",
  patch: "bg-amber-600 text-white",
  delete: "bg-red-600 text-white",
};

type OperationObject = {
  summary?: string;
  parameters?: { name: string; in: string; description?: string }[];
  requestBody?: { content?: { "application/json"?: { schema?: unknown } } };
  responses?: Record<
    string,
    { description?: string; content?: { "application/json"?: { schema?: unknown } } }
  >;
};

export default function ApiDocsPage() {
  const spec = buildOpenApiSpec();
  const pathEntries = Object.entries(spec.paths) as [string, Record<string, OperationObject>][];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2 border-b border-foreground/15 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{spec.info.title}</h1>
          <span className="rounded-full border border-foreground/20 px-2.5 py-0.5 font-mono text-xs">
            OpenAPI {spec.openapi} · v{spec.info.version}
          </span>
        </div>
        <p className="text-sm text-foreground/75">{spec.info.description}</p>
        <p className="text-sm">
          Raw spec:{" "}
          <Link href="/api/openapi.json" className="font-mono underline">
            /api/openapi.json
          </Link>
        </p>
      </header>

      <section className="flex flex-col gap-4" aria-label="Endpoints">
        {pathEntries.map(([routePath, operations]) => (
          <div
            key={routePath}
            className="flex flex-col gap-3 rounded-xl border border-foreground/15 p-4"
          >
            <h2 className="font-mono text-base font-semibold">{routePath}</h2>
            <div className="flex flex-col gap-3">
              {Object.entries(operations).map(([method, op]) => {
                const reqSchema = op.requestBody?.content?.["application/json"]?.schema;
                return (
                  <details
                    key={method}
                    className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3"
                  >
                    <summary className="flex cursor-pointer items-center gap-3">
                      <span
                        className={`inline-block min-w-16 rounded px-2 py-1 text-center font-mono text-xs font-bold uppercase ${
                          methodBadge[method] ?? "bg-foreground text-background"
                        }`}
                      >
                        {method}
                      </span>
                      <span className="text-sm font-medium">{op.summary}</span>
                    </summary>
                    <div className="mt-3 flex flex-col gap-3 text-xs">
                      {reqSchema !== undefined && (
                        <div>
                          <p className="mb-1 font-medium text-foreground/70">Request body schema</p>
                          <pre className="overflow-x-auto rounded bg-foreground/5 p-2 font-mono">
                            {JSON.stringify(reqSchema, null, 2)}
                          </pre>
                        </div>
                      )}
                      {op.responses && (
                        <div>
                          <p className="mb-1 font-medium text-foreground/70">Responses</p>
                          <ul className="flex flex-col gap-1">
                            {Object.entries(op.responses).map(([status, resp]) => (
                              <li key={status} className="font-mono">
                                <strong>{status}</strong> — {resp.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
