import { describe, expect, it } from "vitest";
import { applyMatrix, centeredCrop, clampCrop, cropPixels, flipEdits, hasEdits, NO_EDITS, orientedSize, rotateBy, rotateEdits, sourceTransform } from "./edits";
import type { ImageEdits } from "./types";

const e = (p: Partial<ImageEdits>): ImageEdits => ({ ...NO_EDITS, ...p });
// Source 400×200. Corners: TL(0,0) TR(400,0) BL(0,200)
const W = 400;
const H = 200;

describe("rotation helpers", () => {
  it("rotates in 90° steps and wraps around", () => {
    expect(rotateBy(0, 90)).toBe(90);
    expect(rotateBy(270, 90)).toBe(0);
    expect(rotateBy(0, -90)).toBe(270);
  });
  it("swaps size for 90/270", () => {
    expect(orientedSize(W, H, 90)).toEqual({ width: 200, height: 400 });
    expect(orientedSize(W, H, 180)).toEqual({ width: 400, height: 200 });
  });
  it("detects edits", () => {
    expect(hasEdits(NO_EDITS)).toBe(false);
    expect(hasEdits(e({ flipH: true }))).toBe(true);
  });
});

describe("sourceTransform maps corners correctly", () => {
  it("identity", () => {
    const t = sourceTransform(W, H, NO_EDITS);
    expect(applyMatrix(t.matrix, 0, 0)).toEqual([0, 0]);
    expect([t.width, t.height]).toEqual([400, 200]);
  });

  it("90° clockwise: top-left goes to top-right", () => {
    const t = sourceTransform(W, H, e({ rotate: 90 }));
    expect([t.width, t.height]).toEqual([200, 400]);
    expect(applyMatrix(t.matrix, 0, 0)).toEqual([200, 0]);
    expect(applyMatrix(t.matrix, 400, 0)).toEqual([200, 400]); // TR → BR
    expect(applyMatrix(t.matrix, 0, 200)).toEqual([0, 0]); // BL → TL
  });

  it("180°: top-left goes to bottom-right", () => {
    const t = sourceTransform(W, H, e({ rotate: 180 }));
    expect(applyMatrix(t.matrix, 0, 0)).toEqual([400, 200]);
  });

  it("270°: top-left goes to bottom-left", () => {
    const t = sourceTransform(W, H, e({ rotate: 270 }));
    expect(applyMatrix(t.matrix, 0, 0)).toEqual([0, 400]);
    expect(applyMatrix(t.matrix, 400, 0)).toEqual([0, 0]);
  });

  it("horizontal flip mirrors x", () => {
    const t = sourceTransform(W, H, e({ flipH: true }));
    expect(applyMatrix(t.matrix, 0, 0)).toEqual([400, 0]);
    expect(applyMatrix(t.matrix, 400, 200)).toEqual([0, 200]);
  });

  it("vertical flip mirrors y", () => {
    const t = sourceTransform(W, H, e({ flipV: true }));
    expect(applyMatrix(t.matrix, 0, 0)).toEqual([0, 200]);
  });

  it("flip is applied after rotation (in the rotated frame)", () => {
    // rotate 90 then flipH: TL → (200,0) → mirrored in 200-wide frame → (0,0)
    const t = sourceTransform(W, H, e({ rotate: 90, flipH: true }));
    expect(applyMatrix(t.matrix, 0, 0)).toEqual([0, 0]);
  });

  it("crop offsets the output and sets its size", () => {
    const t = sourceTransform(W, H, e({ crop: { x: 0.25, y: 0.5, w: 0.5, h: 0.5 } }));
    expect([t.width, t.height]).toEqual([200, 100]);
    expect(applyMatrix(t.matrix, 100, 100)).toEqual([0, 0]); // crop origin
  });

  it("crop is measured on the rotated image", () => {
    const t = sourceTransform(W, H, e({ rotate: 90, crop: { x: 0, y: 0, w: 1, h: 0.5 } }));
    expect([t.width, t.height]).toEqual([200, 200]);
  });
});

describe("crop helpers", () => {
  it("cropPixels clamps to the image", () => {
    expect(cropPixels(100, 100, { x: 0.9, y: 0.9, w: 0.5, h: 0.5 })).toEqual({ x: 90, y: 90, width: 10, height: 10 });
  });
  it("centeredCrop fits the ratio inside the image", () => {
    const c = centeredCrop(400, 200, 1);
    expect(c.w * 400).toBeCloseTo(200);
    expect(c.h * 200).toBeCloseTo(200);
    expect(c.x).toBeCloseTo(0.25);
    const tall = centeredCrop(400, 200, 9 / 16);
    expect((tall.w * 400) / (tall.h * 200)).toBeCloseTo(9 / 16);
  });
  it("clampCrop keeps the box inside", () => {
    expect(clampCrop({ x: 0.8, y: -0.1, w: 0.5, h: 0.3 })).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.3 });
  });
});

describe("crop follows rotate and flip", () => {
  // Crop the top-left quarter, then check the same pixels are selected after the edit.
  const crop = { x: 0, y: 0, w: 0.5, h: 0.5 };
  const pixelsOf = (ed: ImageEdits) => {
    // map the crop's top-left output pixel back to a source corner region
    const t = sourceTransform(W, H, ed);
    return { w: t.width, h: t.height, origin: applyMatrix(t.matrix, 0, 0) };
  };

  it("rotating right keeps the selected source region", () => {
    const before = e({ crop });
    const after = rotateEdits(before, 90);
    expect(after.rotate).toBe(90);
    expect(after.crop).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 });
    // Source pixel (0,0) is inside the crop both times: it maps to an in-bounds point.
    const p = pixelsOf(after);
    expect(p.w).toBe(100);
    expect(p.h).toBe(200);
    expect(p.origin[0]).toBeGreaterThanOrEqual(0);
    expect(p.origin[0]).toBeLessThanOrEqual(p.w);
  });

  it("rotating left then right restores the crop", () => {
    const start = e({ crop: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } });
    const back = rotateEdits(rotateEdits(start, -90), 90);
    expect(back.rotate).toBe(0);
    expect(back.crop!.x).toBeCloseTo(0.1);
    expect(back.crop!.y).toBeCloseTo(0.2);
    expect(back.crop!.w).toBeCloseTo(0.3);
    expect(back.crop!.h).toBeCloseTo(0.4);
  });

  it("flipping mirrors the crop", () => {
    expect(flipEdits(e({ crop }), "h").crop).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 });
    expect(flipEdits(e({ crop }), "v").crop).toEqual({ x: 0, y: 0.5, w: 0.5, h: 0.5 });
    expect(flipEdits(e({}), "h")).toEqual(e({ flipH: true }));
  });
});
