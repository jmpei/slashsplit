// Browser-side receipt shrinking rules (#9). Vercel rejects request bodies above about 4.5 MB with
// 413 before the scan route runs, so the scan form re-encodes photos over UPLOAD_BUDGET_BYTES.
export const UPLOAD_BUDGET_BYTES = 4 * 1024 * 1024;

export type Size = { width: number; height: number };
export type CompressionStep = Size & { quality: number };

// Long edge (px) and JPEG quality per attempt, largest first. 1280 px still keeps receipt text legible.
const STEPS: ReadonlyArray<readonly [maxEdge: number, quality: number]> = [
  [4096, 0.85],
  [3072, 0.8],
  [2560, 0.75],
  [2048, 0.7],
  [1600, 0.65],
  [1280, 0.6],
];

export function needsCompression(sizeBytes: number): boolean {
  return sizeBytes > UPLOAD_BUDGET_BYTES;
}

export function scaleToFit(size: Size, maxEdge: number): Size {
  const scale = Math.min(1, maxEdge / Math.max(size.width, size.height));
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

export function compressionSteps(size: Size): CompressionStep[] {
  return STEPS.map(([maxEdge, quality]) => ({ ...scaleToFit(size, maxEdge), quality }));
}
