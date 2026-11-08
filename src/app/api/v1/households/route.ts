// Stub so the red tests run; the real handler lands in the green commit (#4).
const notImplemented = async (..._args: unknown[]) => Response.json({ error: "Not implemented" }, { status: 501 });
export const GET = notImplemented;
export const POST = notImplemented;
