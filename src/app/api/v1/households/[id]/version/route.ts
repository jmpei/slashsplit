export async function GET(_request: Request, _context: { params: Promise<{ id: string }> }) {
  return Response.json({ error: "Not implemented." }, { status: 501 });
}
