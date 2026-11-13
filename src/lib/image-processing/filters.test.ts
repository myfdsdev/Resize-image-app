import { describe, expect, it } from "vitest";
import { applyFilters, cssFilter, DEFAULT_FILTERS, isNeutral } from "./filters";

const px = (r: number, g: number, b: number, a = 255) => new Uint8ClampedArray([r, g, b, a]);

describe("filters", () => {
  it("leaves pixels alone when neutral", () => {
    const d = px(10, 20, 30);
    applyFilters(d, DEFAULT_FILTERS);
    expect(Array.from(d)).toEqual([10, 20, 30, 255]);
    expect(isNeutral(DEFAULT_FILTERS)).toBe(true);
    expect(cssFilter(DEFAULT_FILTERS)).toBeUndefined();
  });

  it("brightens and darkens", () => {
    const up = px(100, 100, 100);
    applyFilters(up, { ...DEFAULT_FILTERS, brightness: 20 });
    expect(up[0]).toBe(151);
    const down = px(100, 100, 100);
    applyFilters(down, { ...DEFAULT_FILTERS, brightness: -100 });
    expect(down[0]).toBe(0);
  });

  it("contrast pushes values away from mid-grey", () => {
    const d = new Uint8ClampedArray([64, 64, 64, 255, 192, 192, 192, 255]);
    applyFilters(d, { ...DEFAULT_FILTERS, contrast: 50 });
    expect(d[0]).toBeLessThan(64);
    expect(d[4]).toBeGreaterThan(192);
  });

  it("black & white makes channels equal and keeps alpha", () => {
    const d = px(200, 50, 10, 77);
    applyFilters(d, { ...DEFAULT_FILTERS, effect: "bw" });
    expect(d[0]).toBe(d[1]);
    expect(d[1]).toBe(d[2]);
    expect(d[3]).toBe(77);
  });

  it("desaturating fully equals grey", () => {
    const d = px(200, 50, 10);
    applyFilters(d, { ...DEFAULT_FILTERS, saturation: -100 });
    expect(Math.abs(d[0] - d[2])).toBeLessThanOrEqual(1);
  });

  it("sepia gives a warm brown tone", () => {
    const d = px(128, 128, 128);
    applyFilters(d, { ...DEFAULT_FILTERS, effect: "sepia" });
    expect(d[0]).toBeGreaterThan(d[1]);
    expect(d[1]).toBeGreaterThan(d[2]);
  });

  it("warm and cool shift red/blue", () => {
    const w = px(100, 100, 100);
    applyFilters(w, { ...DEFAULT_FILTERS, effect: "warm" });
    expect(w[0]).toBeGreaterThan(w[2]);
    const c = px(100, 100, 100);
    applyFilters(c, { ...DEFAULT_FILTERS, effect: "cool" });
    expect(c[2]).toBeGreaterThan(c[0]);
  });
});
