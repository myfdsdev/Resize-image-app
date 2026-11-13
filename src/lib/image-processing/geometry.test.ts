import { describe, expect, it } from "vitest";
import { MAX_CANVAS_PIXELS, computeLayout, needsBackgroundFill, resolveOutputMime } from "./geometry";
import type { ResizeTarget } from "./types";

const t = (w: number | null, h: number | null, fit: ResizeTarget["fit"], allowUpscale = false): ResizeTarget => ({
  id: "t",
  label: "t",
  width: w,
  height: h,
  fit,
  allowUpscale,
});

describe("computeLayout — inside (keep ratio)", () => {
  it("fits a landscape image into a square box without distortion", () => {
    const l = computeLayout(4000, 3000, t(1080, 1080, "inside"));
    expect(l.canvasWidth).toBe(1080);
    expect(l.canvasHeight).toBe(810);
    expect(l.hasPadding).toBe(false);
  });

  it("keeps the ratio when only width is given", () => {
    const l = computeLayout(1920, 1080, t(960, null, "inside"));
    expect([l.canvasWidth, l.canvasHeight]).toEqual([960, 540]);
  });

  it("keeps the ratio when only height is given", () => {
    const l = computeLayout(1000, 2000, t(null, 500, "inside"));
    expect([l.canvasWidth, l.canvasHeight]).toEqual([250, 500]);
  });

  it("does not upscale small images unless allowed", () => {
    expect(computeLayout(400, 300, t(1080, 1080, "inside")).canvasWidth).toBe(400);
    const up = computeLayout(400, 300, t(1080, 1080, "inside", true));
    expect([up.canvasWidth, up.canvasHeight]).toEqual([1080, 810]);
  });

  it("returns original size when no dimensions are given", () => {
    const l = computeLayout(1234, 567, t(null, null, "inside"));
    expect([l.canvasWidth, l.canvasHeight]).toEqual([1234, 567]);
  });
});

describe("computeLayout — exact box modes", () => {
  it("contain: exact size with centered padding", () => {
    const l = computeLayout(1920, 1080, t(1080, 1080, "contain"));
    expect([l.canvasWidth, l.canvasHeight]).toEqual([1080, 1080]);
    expect(l.drawWidth).toBeCloseTo(1080);
    expect(l.drawHeight).toBeCloseTo(607.5);
    expect(l.drawY).toBeCloseTo((1080 - 607.5) / 2);
    expect(l.hasPadding).toBe(true);
  });

  it("contain: no padding when ratios match", () => {
    const l = computeLayout(2000, 2000, t(1000, 1000, "contain"));
    expect(l.hasPadding).toBe(false);
  });

  it("contain: small image stays small and centered (no upscale)", () => {
    const l = computeLayout(100, 100, t(1000, 500, "contain"));
    expect([l.canvasWidth, l.canvasHeight]).toEqual([1000, 500]);
    expect(l.drawWidth).toBe(100);
    expect(l.drawX).toBe(450);
  });

  it("cover: fills the box and crops the overflow equally on both sides", () => {
    const l = computeLayout(1920, 1080, t(1080, 1080, "cover"));
    expect([l.canvasWidth, l.canvasHeight]).toEqual([1080, 1080]);
    expect(l.drawHeight).toBeCloseTo(1080);
    expect(l.drawWidth).toBeCloseTo(1920);
    expect(l.drawX).toBeCloseTo(-420);
    expect(l.hasPadding).toBe(false);
  });

  it("cover: portrait source into landscape box", () => {
    const l = computeLayout(1080, 1920, t(1280, 720, "cover"));
    expect(l.drawWidth).toBeCloseTo(1280);
    expect(l.drawY).toBeLessThan(0);
  });

  it("stretch: exact size, ignores ratio", () => {
    const l = computeLayout(1920, 1080, t(500, 500, "stretch"));
    expect([l.drawWidth, l.drawHeight]).toEqual([500, 500]);
  });

  it("falls back to inside when a box mode is missing one side", () => {
    const l = computeLayout(2000, 1000, t(1000, null, "cover"));
    expect([l.canvasWidth, l.canvasHeight]).toEqual([1000, 500]);
  });
});

describe("computeLayout — safety limits", () => {
  it("never exceeds the safe canvas area", () => {
    const l = computeLayout(10000, 10000, t(10000, 10000, "stretch"));
    expect(l.canvasWidth * l.canvasHeight).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
  });

  it("rejects invalid sizes", () => {
    expect(() => computeLayout(0, 100, t(10, 10, "cover"))).toThrow();
  });
});

describe("resolveOutputMime", () => {
  it("keeps the original format", () => {
    expect(resolveOutputMime("original", "image/png", true)).toBe("image/png");
    expect(resolveOutputMime("original", "image/jpeg", true)).toBe("image/jpeg");
    expect(resolveOutputMime("original", "image/webp", true)).toBe("image/webp");
  });

  it("converts to the chosen format", () => {
    expect(resolveOutputMime("webp", "image/jpeg", true)).toBe("image/webp");
    expect(resolveOutputMime("jpeg", "image/png", true)).toBe("image/jpeg");
  });

  it("falls back from WebP when the browser cannot encode it, keeping transparency", () => {
    expect(resolveOutputMime("webp", "image/png", false)).toBe("image/png");
    expect(resolveOutputMime("webp", "image/jpeg", false)).toBe("image/jpeg");
    expect(resolveOutputMime("original", "image/webp", false)).toBe("image/png");
  });
});

describe("needsBackgroundFill", () => {
  it("always fills JPEG (no transparency) so transparent pixels do not turn black", () => {
    expect(needsBackgroundFill("image/jpeg", "transparent", false)).toBe(true);
  });
  it("keeps PNG transparent unless padding needs a color", () => {
    expect(needsBackgroundFill("image/png", "#ffffff", false)).toBe(false);
    expect(needsBackgroundFill("image/png", "transparent", true)).toBe(false);
    expect(needsBackgroundFill("image/png", "#000000", true)).toBe(true);
  });
});
