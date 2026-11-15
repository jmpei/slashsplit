// DELETE: revoke one of the caller's API tokens (#13). Stub until the implementation lands.
type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  void request;
  void params;
  return Response.json({ error: "Not implemented." }, { status: 501 });
}
