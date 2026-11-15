// Browser-side receipt shrinking rules (#9). Vercel rejects request bodies above about 4.5 MB with
// 413 before the scan route runs, so the scan form re-encodes photos over UPLOAD_BUDGET_BYTES.
export const UPLOAD_BUDGET_BYTES = 4 * 1024 * 1024;

export type Size = { width: number; height: number };
export type CompressionStep = Size & { quality: number };

export function needsCompression(sizeBytes: number): boolean {
  void sizeBytes;
  return false;
}

export function scaleToFit(size: Size, maxEdge: number): Size {
  void maxEdge;
  return size;
}

export function compressionSteps(size: Size): CompressionStep[] {
  void size;
  return [];
}
