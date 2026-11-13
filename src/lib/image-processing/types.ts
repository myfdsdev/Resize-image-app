export type OutputFormat = "original" | "jpeg" | "png" | "webp";
export type EncodableMime = "image/jpeg" | "image/png" | "image/webp";

/**
 * How the image is placed into the target box.
 * - inside:  keep ratio, scale to fit within W×H, no padding (output size varies)
 * - contain: exact W×H, whole image visible, empty area filled with background
 * - cover:   exact W×H, image fills the box, overflow is cropped (centered)
 * - stretch: exact W×H, ratio ignored (distorts)
 */
export type FitMode = "inside" | "contain" | "cover" | "stretch";

export interface ResizeTarget {
  /** Stable id used for naming outputs and ZIP folders ("custom" or preset id). */
  id: string;
  label: string;
  /** null means "keep original size" (only valid for fit "inside"). */
  width: number | null;
  height: number | null;
  fit: FitMode;
  allowUpscale: boolean;
}

export interface EncodeOptions {
  format: OutputFormat;
  /** 0–1, used for JPEG and WebP only. */
  quality: number;
  /** CSS hex color or "transparent". JPEG always gets a solid color. */
  background: string;
}

export interface ProcessJob {
  jobId: string;
  file: Blob;
  sourceMime: string;
  target: ResizeTarget;
  encode: EncodeOptions;
}

export interface ProcessResult {
  jobId: string;
  blob: Blob;
  width: number;
  height: number;
  mime: EncodableMime;
}

export interface Layout {
  /** Final canvas size. */
  canvasWidth: number;
  canvasHeight: number;
  /** Where the (scaled) source is drawn on the canvas. May extend outside for "cover". */
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  /** True when the canvas has areas not covered by the image (needs background). */
  hasPadding: boolean;
}
