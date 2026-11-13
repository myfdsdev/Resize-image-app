export type FilterEffect = "none" | "bw" | "sepia" | "warm" | "cool" | "vintage";

export interface FilterSettings {
  /** -100 … 100 */
  brightness: number;
  /** -100 … 100 */
  contrast: number;
  /** -100 … 100 */
  saturation: number;
  effect: FilterEffect;
}

export const DEFAULT_FILTERS: FilterSettings = { brightness: 0, contrast: 0, saturation: 0, effect: "none" };

export const FILTER_EFFECTS: { id: FilterEffect; label: string }[] = [
  { id: "none", label: "None" },
  { id: "bw", label: "B&W" },
  { id: "sepia", label: "Sepia" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "vintage", label: "Vintage" },
];

export function isNeutral(f?: FilterSettings | null): boolean {
  return !f || (f.brightness === 0 && f.contrast === 0 && f.saturation === 0 && f.effect === "none");
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Apply filters to RGBA pixels in place. Alpha is left untouched. */
export function applyFilters(data: Uint8ClampedArray, f: FilterSettings): void {
  if (isNeutral(f)) return;
  const b = f.brightness * 2.55;
  const c = f.contrast * 2.55;
  const cf = (259 * (c + 255)) / (255 * (259 - c));
  const sat = 1 + f.saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let bl = data[i + 2];

    // brightness, then contrast around mid-grey
    r = cf * (r + b - 128) + 128;
    g = cf * (g + b - 128) + 128;
    bl = cf * (bl + b - 128) + 128;

    // saturation (luma-preserving)
    if (sat !== 1) {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      bl = l + (bl - l) * sat;
    }

    switch (f.effect) {
      case "bw": {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
        r = g = bl = l;
        break;
      }
      case "sepia":
      case "vintage": {
        const sr = 0.393 * r + 0.769 * g + 0.189 * bl;
        const sg = 0.349 * r + 0.686 * g + 0.168 * bl;
        const sb = 0.272 * r + 0.534 * g + 0.131 * bl;
        const k = f.effect === "sepia" ? 1 : 0.55;
        r = r + (sr - r) * k;
        g = g + (sg - g) * k;
        bl = bl + (sb - bl) * k;
        if (f.effect === "vintage") {
          r = r * 0.92 + 18;
          g = g * 0.92 + 12;
          bl = bl * 0.92 + 10;
        }
        break;
      }
      case "warm":
        r += 18;
        bl -= 18;
        break;
      case "cool":
        r -= 18;
        bl += 18;
        break;
    }

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(bl);
  }
}

/** Approximate CSS filter for fast thumbnail previews (output uses applyFilters). */
export function cssFilter(f?: FilterSettings | null): string | undefined {
  if (isNeutral(f)) return undefined;
  const parts = [
    `brightness(${1 + f!.brightness / 100})`,
    `contrast(${1 + f!.contrast / 100})`,
    `saturate(${1 + f!.saturation / 100})`,
  ];
  if (f!.effect === "bw") parts.push("grayscale(1)");
  if (f!.effect === "sepia") parts.push("sepia(1)");
  if (f!.effect === "vintage") parts.push("sepia(0.55)", "contrast(0.92)");
  if (f!.effect === "warm") parts.push("sepia(0.15)", "saturate(1.1)");
  if (f!.effect === "cool") parts.push("hue-rotate(-10deg)", "saturate(0.95)");
  return parts.join(" ");
}
