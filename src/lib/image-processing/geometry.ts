import type { EncodableMime, Layout, OutputFormat, ResizeTarget } from "./types";

/** Largest canvas area that is safe on every major browser (iOS Safari limit ≈ 16.7MP). */
export const MAX_CANVAS_PIXELS = 16_777_216;
/** Largest single side we allow for output. */
export const MAX_SIDE = 16_384;

const clampSide = (n: number) => Math.max(1, Math.min(MAX_SIDE, Math.round(n)));

/**
 * Pure layout math: given the source size and a target, decide the canvas size
 * and where the source image is drawn. No DOM access, so it is unit-testable.
 */
export function computeLayout(srcW: number, srcH: number, target: ResizeTarget): Layout {
  if (srcW <= 0 || srcH <= 0) throw new Error("Invalid source dimensions");

  const { fit, allowUpscale } = target;
  let tw = target.width ?? null;
  let th = target.height ?? null;

  // "inside" (keep ratio) — one or both sides may be empty.
  if (fit === "inside" || tw === null || th === null) {
    if (tw === null && th === null) {
      tw = srcW;
      th = srcH;
    }
    const sx = tw !== null ? tw / srcW : Infinity;
    const sy = th !== null ? th / srcH : Infinity;
    let scale = Math.min(sx, sy);
    if (!allowUpscale) scale = Math.min(scale, 1);
    const w = clampSide(srcW * scale);
    const h = clampSide(srcH * scale);
    return limitArea({ canvasWidth: w, canvasHeight: h, drawX: 0, drawY: 0, drawWidth: w, drawHeight: h, hasPadding: false });
  }

  const W = clampSide(tw);
  const H = clampSide(th);

  if (fit === "stretch") {
    return limitArea({ canvasWidth: W, canvasHeight: H, drawX: 0, drawY: 0, drawWidth: W, drawHeight: H, hasPadding: false });
  }

  if (fit === "cover") {
    const scale = Math.max(W / srcW, H / srcH);
    const dw = srcW * scale;
    const dh = srcH * scale;
    return limitArea({
      canvasWidth: W,
      canvasHeight: H,
      drawX: (W - dw) / 2,
      drawY: (H - dh) / 2,
      drawWidth: dw,
      drawHeight: dh,
      hasPadding: false,
    });
  }

  // contain
  let scale = Math.min(W / srcW, H / srcH);
  if (!allowUpscale) scale = Math.min(scale, 1);
  const dw = srcW * scale;
  const dh = srcH * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  return limitArea({
    canvasWidth: W,
    canvasHeight: H,
    drawX: dx,
    drawY: dy,
    drawWidth: dw,
    drawHeight: dh,
    hasPadding: Math.round(dw) < W || Math.round(dh) < H,
  });
}

/** Scale the whole layout down proportionally if the canvas would exceed the safe area. */
function limitArea(l: Layout): Layout {
  const area = l.canvasWidth * l.canvasHeight;
  if (area <= MAX_CANVAS_PIXELS) return l;
  const k = Math.sqrt(MAX_CANVAS_PIXELS / area);
  return {
    canvasWidth: Math.max(1, Math.floor(l.canvasWidth * k)),
    canvasHeight: Math.max(1, Math.floor(l.canvasHeight * k)),
    drawX: l.drawX * k,
    drawY: l.drawY * k,
    drawWidth: l.drawWidth * k,
    drawHeight: l.drawHeight * k,
    hasPadding: l.hasPadding,
  };
}

/** Map the user's format choice + source type to the actual output MIME. */
export function resolveOutputMime(
  format: OutputFormat,
  sourceMime: string,
  webpSupported: boolean,
): EncodableMime {
  let mime: EncodableMime;
  if (format === "jpeg") mime = "image/jpeg";
  else if (format === "png") mime = "image/png";
  else if (format === "webp") mime = "image/webp";
  else if (sourceMime === "image/png") mime = "image/png";
  else if (sourceMime === "image/webp") mime = "image/webp";
  else mime = "image/jpeg";

  if (mime === "image/webp" && !webpSupported) {
    // Keep transparency when falling back from WebP.
    mime = sourceMime === "image/jpeg" ? "image/jpeg" : "image/png";
  }
  return mime;
}

export const MIME_EXTENSION: Record<EncodableMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Whether the background must be painted before drawing the image. */
export function needsBackgroundFill(mime: EncodableMime, background: string, hasPadding: boolean): boolean {
  if (mime === "image/jpeg") return true; // JPEG has no alpha: transparent areas would turn black.
  return hasPadding && background !== "transparent";
}
