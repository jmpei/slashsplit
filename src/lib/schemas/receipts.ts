// Receipt upload rules (#9), shared by the scan route and OpenAPI generation (#8).
import { z } from "zod";

export const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/heic", "image/webp"] as const;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
// Largest request body read: the image as base64 plus the JSON envelope, or as multipart plus its
// boundaries and headers.
export const MAX_JSON_BODY_BYTES = Math.ceil(MAX_RECEIPT_BYTES / 3) * 4 + 1024;
export const MAX_MULTIPART_BODY_BYTES = MAX_RECEIPT_BYTES + 64 * 1024;

type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"];

// The image type its first bytes (magic numbers) show, or null for anything else.
export function sniffImageType(bytes: Uint8Array): ReceiptMimeType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && HEIC_BRANDS.includes(ascii(8, 12))) return "image/heic";
  return null;
}

export const receiptMimeType = z.enum(RECEIPT_MIME_TYPES, {
  error: "Upload a jpg, png, heic or webp image.",
});

export const scanReceiptJsonBody = z.object({
  mimeType: receiptMimeType,
  dataBase64: z
    .string()
    .min(1, "Send the image as base64.")
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Send the image as base64."),
});
