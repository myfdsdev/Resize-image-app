export interface FormatSupport {
  webp: boolean;
  offscreen: boolean;
}

let cached: FormatSupport | null = null;

/** Detect what this browser can encode. Safari, for example, cannot encode WebP. */
export function detectFormatSupport(): FormatSupport {
  if (cached) return cached;
  if (typeof document === "undefined") return { webp: false, offscreen: false };
  let webp = false;
  try {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 2;
    webp = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webp = false;
  }
  let offscreen = false;
  try {
    offscreen =
      typeof OffscreenCanvas !== "undefined" &&
      typeof Worker !== "undefined" &&
      !!new OffscreenCanvas(1, 1).getContext("2d");
  } catch {
    offscreen = false;
  }
  cached = { webp, offscreen };
  return cached;
}
