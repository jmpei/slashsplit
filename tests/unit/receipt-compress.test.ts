// Receipt shrinking rules (#9): which photos the scan form re-encodes before upload, and the
// dimensions and JPEG quality it tries, largest first, until the photo fits the upload budget.
import { describe, expect, test } from "vitest";
import {
  UPLOAD_BUDGET_BYTES,
  compressionSteps,
  needsCompression,
  scaleToFit,
} from "@/lib/receipt/compress";

describe("UPLOAD_BUDGET_BYTES", () => {
  test("leaves headroom under Vercel's 4.5 MB request body limit for the multipart envelope", () => {
    expect(UPLOAD_BUDGET_BYTES).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(UPLOAD_BUDGET_BYTES).toBeGreaterThanOrEqual(3 * 1024 * 1024);
  });
});

describe("needsCompression", () => {
  test("files at or under the budget go through unchanged", () => {
    expect(needsCompression(0)).toBe(false);
    expect(needsCompression(200_000)).toBe(false);
    expect(needsCompression(UPLOAD_BUDGET_BYTES)).toBe(false);
  });

  test("files over the budget are shrunk", () => {
    expect(needsCompression(UPLOAD_BUDGET_BYTES + 1)).toBe(true);
    expect(needsCompression(9 * 1024 * 1024)).toBe(true);
  });
});

describe("scaleToFit", () => {
  test("scales the long edge of a landscape photo down to maxEdge, keeping the aspect ratio", () => {
    expect(scaleToFit({ width: 4000, height: 3000 }, 2048)).toEqual({ width: 2048, height: 1536 });
  });

  test("scales a portrait photo by its height", () => {
    expect(scaleToFit({ width: 3024, height: 4032 }, 2048)).toEqual({ width: 1536, height: 2048 });
  });

  test("never enlarges a photo already within maxEdge", () => {
    expect(scaleToFit({ width: 800, height: 600 }, 2048)).toEqual({ width: 800, height: 600 });
  });

  test("returns whole pixels and never collapses an edge to zero", () => {
    expect(scaleToFit({ width: 4001, height: 3001 }, 1000)).toEqual({ width: 1000, height: 750 });
    expect(scaleToFit({ width: 10_000, height: 1 }, 1000)).toEqual({ width: 1000, height: 1 });
  });
});

describe("compressionSteps", () => {
  const photo = { width: 4032, height: 3024 };

  // Every rule below is checked on a non-empty plan, so an empty plan cannot pass vacuously.
  function stepsFor(size: { width: number; height: number }) {
    const steps = compressionSteps(size);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    return steps;
  }

  test("tries progressively smaller dimensions and lower quality", () => {
    const steps = stepsFor(photo);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].width).toBeLessThanOrEqual(steps[i - 1].width);
      expect(steps[i].height).toBeLessThanOrEqual(steps[i - 1].height);
      expect(steps[i].quality).toBeLessThan(steps[i - 1].quality);
    }
    expect(steps.at(-1)!.width).toBeLessThan(steps[0].width);
  });

  test("keeps every step's quality a valid canvas.toBlob quality and its size whole pixels", () => {
    for (const step of stepsFor(photo)) {
      expect(step.quality).toBeGreaterThan(0);
      expect(step.quality).toBeLessThanOrEqual(1);
      expect(Number.isInteger(step.width) && Number.isInteger(step.height)).toBe(true);
      expect(step.width).toBeGreaterThan(0);
      expect(step.height).toBeGreaterThan(0);
    }
  });

  test("keeps the photo's aspect ratio and never enlarges it", () => {
    for (const step of stepsFor(photo)) {
      expect(step.width).toBeLessThanOrEqual(photo.width);
      expect(Math.abs(step.width / step.height - photo.width / photo.height)).toBeLessThan(0.01);
    }
  });

  test("ends small enough that receipt text stays readable but the file is far under budget", () => {
    const last = stepsFor(photo).at(-1)!;
    expect(Math.max(last.width, last.height)).toBeLessThanOrEqual(1280);
    expect(Math.max(last.width, last.height)).toBeGreaterThanOrEqual(800);
  });

  test("only lowers quality for a photo that is already small in pixels", () => {
    const small = { width: 900, height: 1200 };
    for (const step of stepsFor(small)) {
      expect({ width: step.width, height: step.height }).toEqual(small);
    }
  });
});
