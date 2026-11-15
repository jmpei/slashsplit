// POST: scan a receipt image into a DRAFT expense (#9). Members only. Accepts multipart/form-data
// (`file`) or JSON { mimeType, dataBase64 }; the image is checked here and never stored.
import { selectExtractor, type ReceiptImage } from "@/lib/receipt/scan";
import { MAX_RECEIPT_BYTES, receiptMimeType, scanReceiptJsonBody } from "@/lib/schemas/receipts";
import { authorizeMember, badRequest, parseBody } from "@/server/api";
import { scanReceiptToDraft } from "@/server/receipts";

async function readImage(request: Request): Promise<ReceiptImage | Response> {
  let image: ReceiptImage;
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    let file: FormDataEntryValue | null;
    try {
      file = (await request.formData()).get("file");
    } catch {
      return badRequest("Send the receipt as multipart/form-data with a `file` field.");
    }
    if (!(file instanceof File)) return badRequest("Attach the receipt image as `file`.");
    const mimeType = receiptMimeType.safeParse(file.type);
    if (!mimeType.success) return badRequest(mimeType.error.issues[0].message);
    if (file.size > MAX_RECEIPT_BYTES) return badRequest("The image must be 10 MB or smaller.");
    image = { mimeType: mimeType.data, bytes: new Uint8Array(await file.arrayBuffer()) };
  } else {
    const body = await parseBody(request, scanReceiptJsonBody);
    if (body instanceof Response) return body;
    image = { mimeType: body.data.mimeType, bytes: Buffer.from(body.data.dataBase64, "base64") };
  }
  if (image.bytes.byteLength > MAX_RECEIPT_BYTES) {
    return badRequest("The image must be 10 MB or smaller.");
  }
  return image;
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
