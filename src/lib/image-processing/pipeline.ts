import { computeLayout, needsBackgroundFill, resolveOutputMime } from "./geometry";
import type { EncodableMime, ProcessJob, ProcessResult } from "./types";

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function createCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function getCtx(canvas: AnyCanvas): AnyCtx {
  const ctx = canvas.getContext("2d") as AnyCtx | null;
  if (!ctx) throw new Error("Canvas 2D is not available in this browser");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

async function canvasToBlob(canvas: AnyCanvas, mime: EncodableMime, quality: number): Promise<Blob> {
  const q = mime === "image/png" ? undefined : Math.min(1, Math.max(0.01, quality));
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: mime, quality: q });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
      mime,
      q,
    );
  });
}

/** Decode with EXIF orientation applied, so phone photos are never sideways. */
export async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error("This file could not be read as an image");
    }
  }
}

/**
 * Downscale in halving steps when shrinking a lot. A single large downscale
 * with drawImage produces aliasing/moire; stepping keeps detail smooth.
 */
function stepDown(source: CanvasImageSource, sw: number, sh: number, tw: number, th: number): {
  src: CanvasImageSource;
  w: number;
  h: number;
} {
  let src = source;
  let w = sw;
  let h = sh;
  while (w / 2 >= tw && h / 2 >= th && w > 2 && h > 2) {
    const nw = Math.floor(w / 2);
    const nh = Math.floor(h / 2);
    const c = createCanvas(nw, nh);
    getCtx(c).drawImage(src, 0, 0, w, h, 0, 0, nw, nh);
    src = c as CanvasImageSource;
    w = nw;
    h = nh;
  }
  return { src, w, h };
}

/** Full pipeline for one image + one target: decode → layout → draw → encode. */
export async function processImage(job: ProcessJob, webpSupported: boolean): Promise<ProcessResult> {
  const bitmap = await decodeImage(job.file);
  try {
    const layout = computeLayout(bitmap.width, bitmap.height, job.target);
    const mime = resolveOutputMime(job.encode.format, job.sourceMime, webpSupported);

    const canvas = createCanvas(layout.canvasWidth, layout.canvasHeight);
    const ctx = getCtx(canvas);

    if (needsBackgroundFill(mime, job.encode.background, layout.hasPadding)) {
      const bg = job.encode.background === "transparent" ? "#ffffff" : job.encode.background;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
    }

    const { src, w, h } = stepDown(
      bitmap,
      bitmap.width,
      bitmap.height,
      Math.ceil(layout.drawWidth),
      Math.ceil(layout.drawHeight),
    );
    ctx.drawImage(src, 0, 0, w, h, layout.drawX, layout.drawY, layout.drawWidth, layout.drawHeight);

    const blob = await canvasToBlob(canvas, mime, job.encode.quality);
    // Some browsers silently fall back to PNG for unsupported types.
    const actualMime = (["image/jpeg", "image/png", "image/webp"].includes(blob.type)
      ? blob.type
      : mime) as EncodableMime;

    return { jobId: job.jobId, blob, width: layout.canvasWidth, height: layout.canvasHeight, mime: actualMime };
  } finally {
    bitmap.close();
  }
}
