import { hasEdits, sourceTransform } from "./edits";
import { computeLayout, needsBackgroundFill, resolveOutputMime } from "./geometry";
import { searchQuality } from "./target-size";
import type { EncodableMime, ImageEdits, ProcessJob, ProcessResult } from "./types";
import { markWidth, placeMark, tilePositions, type WatermarkJob } from "./watermark";

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

/**
 * Apply rotate → flip → crop in one draw. Returns the original bitmap when
 * there are no edits, so unedited images cost no extra memory.
 */
export function applyEdits(
  bitmap: ImageBitmap,
  edits: ImageEdits | undefined,
): { src: CanvasImageSource; width: number; height: number } {
  if (!hasEdits(edits)) return { src: bitmap, width: bitmap.width, height: bitmap.height };
  const t = sourceTransform(bitmap.width, bitmap.height, edits!);
  const canvas = createCanvas(t.width, t.height);
  const ctx = getCtx(canvas);
  ctx.setTransform(...t.matrix);
  ctx.drawImage(bitmap, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { src: canvas as CanvasImageSource, width: t.width, height: t.height };
}

/** Draw a text or logo watermark on the finished canvas. */
async function drawWatermark(ctx: AnyCtx, W: number, H: number, wm: WatermarkJob) {
  const mw = markWidth(W, wm.size);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.05, wm.opacity / 100));

  if (wm.type === "image") {
    if (!wm.logo) {
      ctx.restore();
      return;
    }
    const logo = await createImageBitmap(wm.logo);
    try {
      const mh = Math.max(1, Math.round((mw * logo.height) / logo.width));
      const spots = wm.tile ? tilePositions(W, H, mw, mh) : [placeMark(W, H, mw, mh, wm.position, wm.margin)];
      for (const p of spots) ctx.drawImage(logo, p.x, p.y, mw, mh);
    } finally {
      logo.close();
    }
    ctx.restore();
    return;
  }

  const text = wm.text.trim();
  if (!text) {
    ctx.restore();
    return;
  }
  const family = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  ctx.font = `600 100px ${family}`;
  const w100 = Math.max(1, ctx.measureText(text).width);
  const fontPx = Math.max(6, (100 * mw) / w100);
  ctx.font = `600 ${fontPx}px ${family}`;
  ctx.textBaseline = "top";
  const mh = Math.round(fontPx * 1.15);
  ctx.fillStyle = wm.color;
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = Math.max(1, fontPx * 0.08);
  const spots = wm.tile ? tilePositions(W, H, mw, mh) : [placeMark(W, H, mw, mh, wm.position, wm.margin)];
  for (const p of spots) ctx.fillText(text, p.x, p.y + fontPx * 0.05);
  ctx.restore();
}

/**
 * Encode, and when a target size is set (JPEG/WebP), lower the quality until
 * it fits. If even the lowest quality is too big, shrink the image in steps.
 */
async function encodeOutput(
  canvas: AnyCanvas,
  mime: EncodableMime,
  quality: number,
  targetBytes: number | null | undefined,
): Promise<{ blob: Blob; canvas: AnyCanvas; note?: string }> {
  if (!targetBytes || mime === "image/png") {
    return { blob: await canvasToBlob(canvas, mime, quality), canvas };
  }
  let current = canvas;
  for (let attempt = 0; attempt < 8; attempt++) {
    const found = await searchQuality((q) => canvasToBlob(current, mime, q), targetBytes, quality, 0.1);
    if (found) {
      const note =
        current !== canvas ? `Reduced to ${current.width}×${current.height} to fit the target size` : undefined;
      return { blob: found.blob, canvas: current, note };
    }
    const nw = Math.max(16, Math.floor(current.width * 0.85));
    const nh = Math.max(16, Math.floor(current.height * 0.85));
    if (nw === current.width && nh === current.height) break;
    const smaller = createCanvas(nw, nh);
    const sctx = getCtx(smaller);
    if (mime === "image/jpeg") {
      sctx.fillStyle = "#ffffff";
      sctx.fillRect(0, 0, nw, nh);
    }
    sctx.drawImage(current as CanvasImageSource, 0, 0, nw, nh);
    current = smaller;
  }
  const blob = await canvasToBlob(current, mime, 0.1);
  return { blob, canvas: current, note: "Could not reach the target size; saved the smallest version" };
}

/** Full pipeline for one image + one target: decode → edits → layout → draw → watermark → encode. */
export async function processImage(job: ProcessJob, webpSupported: boolean): Promise<ProcessResult> {
  const bitmap = await decodeImage(job.file);
  try {
    const edited = applyEdits(bitmap, job.edits);
    const layout = computeLayout(edited.width, edited.height, job.target);
    const mime = resolveOutputMime(job.encode.format, job.sourceMime, webpSupported);

    const canvas = createCanvas(layout.canvasWidth, layout.canvasHeight);
    const ctx = getCtx(canvas);

    if (needsBackgroundFill(mime, job.encode.background, layout.hasPadding)) {
      const bg = job.encode.background === "transparent" ? "#ffffff" : job.encode.background;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
    }

    const { src, w, h } = stepDown(
      edited.src,
      edited.width,
      edited.height,
      Math.ceil(layout.drawWidth),
      Math.ceil(layout.drawHeight),
    );
    ctx.drawImage(src, 0, 0, w, h, layout.drawX, layout.drawY, layout.drawWidth, layout.drawHeight);

    if (job.watermark?.enabled) {
      await drawWatermark(ctx, layout.canvasWidth, layout.canvasHeight, job.watermark);
    }

    const encoded = await encodeOutput(canvas, mime, job.encode.quality, job.encode.targetBytes);
    const blob = encoded.blob;
    // Some browsers silently fall back to PNG for unsupported types.
    const actualMime = (["image/jpeg", "image/png", "image/webp"].includes(blob.type)
      ? blob.type
      : mime) as EncodableMime;

    return {
      jobId: job.jobId,
      blob,
      width: encoded.canvas.width,
      height: encoded.canvas.height,
      mime: actualMime,
      note: encoded.note,
    };
  } finally {
    bitmap.close();
  }
}
