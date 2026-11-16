// POST: scan a receipt image into a DRAFT expense (#9). Members only. Accepts multipart/form-data
// (`file`) or JSON { mimeType, dataBase64 }; the image is checked here and never stored. A body over
// the limit is refused before it is buffered, and the image type comes from its bytes.
import { selectExtractor, type ReceiptImage } from "@/lib/receipt/scan";
import {
  MAX_JSON_BODY_BYTES,
  MAX_MULTIPART_BODY_BYTES,
  MAX_RECEIPT_BYTES,
  receiptMimeType,
  scanReceiptJsonBody,
  sniffImageType,
} from "@/lib/schemas/receipts";
import { authorizeMember, badRequest, parseBody } from "@/server/api";
import { scanReceiptToDraft } from "@/server/receipts";

const TOO_LARGE = "The image must be 10 MB or smaller.";

// The body, or null once it is longer than `limit`: a larger Content-Length is refused unread, and a
// stream is cancelled as soon as it passes the limit.
async function readBody(request: Request, limit: number): Promise<Uint8Array | null> {
  if (Number(request.headers.get("content-length")) > limit) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

async function readImage(request: Request): Promise<ReceiptImage | Response> {
  const contentType = request.headers.get("content-type") ?? "";
  const multipart = contentType.startsWith("multipart/form-data");
  const body = await readBody(request, multipart ? MAX_MULTIPART_BODY_BYTES : MAX_JSON_BODY_BYTES);
  if (!body) return Response.json({ error: TOO_LARGE }, { status: 413 });
  const buffered = new Request(request.url, {
    method: "POST",
    headers: { "content-type": contentType },
    body: body as BodyInit,
  });

  let bytes: Uint8Array;
  if (multipart) {
    let file: FormDataEntryValue | null;
    try {
      file = (await buffered.formData()).get("file");
    } catch {
      return badRequest("Send the receipt as multipart/form-data with a `file` field.");
    }
    if (!(file instanceof File)) return badRequest("Attach the receipt image as `file`.");
    const mimeType = receiptMimeType.safeParse(file.type);
    if (!mimeType.success) return badRequest(mimeType.error.issues[0].message);
    bytes = new Uint8Array(await file.arrayBuffer());
  } else {
    const json = await parseBody(buffered, scanReceiptJsonBody);
    if (json instanceof Response) return json;
    bytes = Buffer.from(json.data.dataBase64, "base64");
  }
  if (bytes.byteLength > MAX_RECEIPT_BYTES) return badRequest(TOO_LARGE);
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return badRequest("The file is not a jpg, png, heic or webp image.");
  return { mimeType, bytes };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await authorizeMember(request, id);
  if (caller instanceof Response) return caller;
  const image = await readImage(request);
  if (image instanceof Response) return image;
  const draft = await scanReceiptToDraft(id, caller.userId, image, selectExtractor(process.env));
  return Response.json(draft, { status: 201 });
}
