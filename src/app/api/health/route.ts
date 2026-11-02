// Liveness check for deploys and E2E: answers without touching the database.
export async function GET() {
  return Response.json({ status: "ok" });
}
