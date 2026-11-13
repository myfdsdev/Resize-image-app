import type { CropRect, ImageEdits, Rotation } from "./types";

export const NO_EDITS: ImageEdits = { rotate: 0, flipH: false, flipV: false, crop: null };

export function hasEdits(e?: ImageEdits | null): boolean {
  return !!e && (e.rotate !== 0 || e.flipH || e.flipV || e.crop !== null);
}

export function rotateBy(r: Rotation, delta: 90 | -90): Rotation {
  return ((((r + delta) % 360) + 360) % 360) as Rotation;
}

/** Size of the image after rotation (90/270 swap width and height). */
export function orientedSize(w: number, h: number, rotate: Rotation): { width: number; height: number } {
  return rotate === 90 || rotate === 270 ? { width: h, height: w } : { width: w, height: h };
}

/** Crop rectangle in pixels of the oriented image, clamped to valid bounds. */
export function cropPixels(ow: number, oh: number, crop: CropRect | null) {
  if (!crop) return { x: 0, y: 0, width: ow, height: oh };
  const x = Math.min(ow - 1, Math.max(0, Math.round(crop.x * ow)));
  const y = Math.min(oh - 1, Math.max(0, Math.round(crop.y * oh)));
  const width = Math.max(1, Math.min(ow - x, Math.round(crop.w * ow)));
  const height = Math.max(1, Math.min(oh - y, Math.round(crop.h * oh)));
  return { x, y, width, height };
}

export type Matrix = [a: number, b: number, c: number, d: number, e: number, f: number];

/**
 * Canvas transform that maps a source pixel (x, y) to the output canvas:
 *   x' = a·x + c·y + e,  y' = b·x + d·y + f
 * Order: rotate (clockwise) → flip → crop offset.
 */
export function sourceTransform(w: number, h: number, edits: ImageEdits) {
  const { width: ow, height: oh } = orientedSize(w, h, edits.rotate);
  let m: Matrix;
  switch (edits.rotate) {
    case 90:
      m = [0, 1, -1, 0, h, 0];
      break;
    case 180:
      m = [-1, 0, 0, -1, w, h];
      break;
    case 270:
      m = [0, -1, 1, 0, 0, w];
      break;
    default:
      m = [1, 0, 0, 1, 0, 0];
  }
  let [a, b, c, d, e, f] = m;
  if (edits.flipH) {
    a = -a;
    c = -c;
    e = ow - e;
  }
  if (edits.flipV) {
    b = -b;
    d = -d;
    f = oh - f;
  }
  const crop = cropPixels(ow, oh, edits.crop);
  e -= crop.x;
  f -= crop.y;
  return { matrix: [a, b, c, d, e, f] as Matrix, width: crop.width, height: crop.height, orientedWidth: ow, orientedHeight: oh };
}

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Largest centered crop with the given ratio (width / height), as fractions. */
export function centeredCrop(ow: number, oh: number, ratio: number): CropRect {
  let cw = ow;
  let ch = cw / ratio;
  if (ch > oh) {
    ch = oh;
    cw = ch * ratio;
  }
  return { x: (ow - cw) / 2 / ow, y: (oh - ch) / 2 / oh, w: cw / ow, h: ch / oh };
}

/** Keep a crop inside the image and at least a minimum size. */
export function clampCrop(c: CropRect, min = 0.02): CropRect {
  const w = Math.min(1, Math.max(min, c.w));
  const h = Math.min(1, Math.max(min, c.h));
  const x = Math.min(1 - w, Math.max(0, c.x));
  const y = Math.min(1 - h, Math.max(0, c.y));
  return { x, y, w, h };
}

/** Rotate the image 90° and keep the same crop area (rotated with it). */
export function rotateEdits(e: ImageEdits, dir: 90 | -90): ImageEdits {
  let crop = e.crop;
  if (crop) {
    crop =
      dir === 90
        ? { x: 1 - (crop.y + crop.h), y: crop.x, w: crop.h, h: crop.w }
        : { x: crop.y, y: 1 - (crop.x + crop.w), w: crop.h, h: crop.w };
  }
  return { ...e, rotate: rotateBy(e.rotate, dir), crop };
}

/** Flip the image and mirror the crop area with it. */
export function flipEdits(e: ImageEdits, axis: "h" | "v"): ImageEdits {
  const c = e.crop;
  if (axis === "h") return { ...e, flipH: !e.flipH, crop: c ? { ...c, x: 1 - c.x - c.w } : null };
  return { ...e, flipV: !e.flipV, crop: c ? { ...c, y: 1 - c.y - c.h } : null };
}
