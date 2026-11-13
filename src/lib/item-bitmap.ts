"use client";

import { applyEdits, decodeImage } from "./image-processing/pipeline";
import type { ImageEdits } from "./image-processing/types";

export interface LoadedImage {
  src: CanvasImageSource;
  width: number;
  height: number;
}

/** Decode an image with its crop/rotate/flip edits applied, limited to `maxSide`. */
export async function loadEditedImage(file: Blob, edits: ImageEdits | undefined, maxSide: number): Promise<LoadedImage> {
  const bmp = await decodeImage(file);
  try {
    const edited = applyEdits(bmp, edits);
    const scale = Math.min(1, maxSide / Math.max(edited.width, edited.height));
    const w = Math.max(1, Math.round(edited.width * scale));
    const h = Math.max(1, Math.round(edited.height * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(edited.src, 0, 0, w, h);
    return { src: c, width: w, height: h };
  } finally {
    bmp.close();
  }
}
