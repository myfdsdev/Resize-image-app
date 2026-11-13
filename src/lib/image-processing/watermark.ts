export type WatermarkPosition =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export const WATERMARK_POSITIONS: WatermarkPosition[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

export interface WatermarkSettings {
  enabled: boolean;
  type: "text" | "image";
  text: string;
  color: string;
  /** 5–100 */
  opacity: number;
  /** Width of the mark as % of the image width (3–80). */
  size: number;
  position: WatermarkPosition;
  /** Distance from the edge as % of the shorter side (0–20). */
  margin: number;
  /** Repeat the mark across the whole image. */
  tile: boolean;
}

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: false,
  type: "text",
  text: "© PixForge",
  color: "#ffffff",
  opacity: 70,
  size: 25,
  position: "bottom-right",
  margin: 3,
  tile: false,
};

/** Data sent to the worker for one job. */
export interface WatermarkJob extends WatermarkSettings {
  logo?: Blob;
}

/** Top-left corner of a mark of size (mw × mh) placed on a (W × H) image. */
export function placeMark(
  W: number,
  H: number,
  mw: number,
  mh: number,
  position: WatermarkPosition,
  marginPct: number,
): { x: number; y: number } {
  const m = (Math.min(W, H) * Math.max(0, marginPct)) / 100;
  const col = position.endsWith("left") ? 0 : position.endsWith("right") ? 2 : 1;
  const row = position.startsWith("top") ? 0 : position.startsWith("bottom") ? 2 : 1;
  const x = col === 0 ? m : col === 2 ? W - mw - m : (W - mw) / 2;
  const y = row === 0 ? m : row === 2 ? H - mh - m : (H - mh) / 2;
  return { x: Math.round(x), y: Math.round(y) };
}

/** Width in pixels the mark should have on an image of width W. */
export function markWidth(W: number, sizePct: number): number {
  return Math.max(8, Math.round((W * Math.min(80, Math.max(3, sizePct))) / 100));
}

/** Tiling grid positions (staggered rows) covering the image. */
export function tilePositions(W: number, H: number, mw: number, mh: number): { x: number; y: number }[] {
  const gapX = mw * 0.8;
  const gapY = mh * 3;
  const out: { x: number; y: number }[] = [];
  let row = 0;
  for (let y = -mh; y < H + mh; y += mh + gapY, row++) {
    const offset = row % 2 ? (mw + gapX) / 2 : 0;
    for (let x = -mw + offset; x < W + mw; x += mw + gapX) out.push({ x: Math.round(x), y: Math.round(y) });
    if (out.length > 2000) break;
  }
  return out;
}
