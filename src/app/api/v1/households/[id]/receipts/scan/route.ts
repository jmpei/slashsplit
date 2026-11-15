// POST: scan a receipt image into a draft expense (#9). Stub until the Green commit.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  void request;
  void params;
  return Response.json({ error: "Not implemented." }, { status: 501 });
}
