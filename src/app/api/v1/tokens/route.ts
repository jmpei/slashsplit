// GET: the caller's API tokens. POST: create one (#13). Stub until the implementation lands.
const notImplemented = (request: Request) => {
  void request;
  return Response.json({ error: "Not implemented." }, { status: 501 });
};

export async function GET(request: Request) {
  return notImplemented(request);
}

export async function POST(request: Request) {
  return notImplemented(request);
}
