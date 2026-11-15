// Receipt upload rules (#9), shared by the scan route and OpenAPI generation (#8).
import { z } from "zod";

export const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/heic", "image/webp"] as const;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

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
