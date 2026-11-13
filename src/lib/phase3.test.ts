import { describe, expect, it } from "vitest";
import { searchQuality } from "./image-processing/target-size";
import { markWidth, placeMark, tilePositions } from "./image-processing/watermark";
import { DEFAULT_RENAME, isDefaultPattern, renderName } from "./rename";

describe("batch rename", () => {
  const ctx = { originalName: "IMG 001.jpeg", index: 0, width: 1080, height: 1350, sizeId: "instagram-portrait", date: new Date(2026, 10, 13) };

  it("keeps the original name by default", () => {
    expect(renderName(DEFAULT_RENAME, ctx)).toBe("IMG 001");
    expect(isDefaultPattern(DEFAULT_RENAME)).toBe(true);
  });

  it("numbers with padding and start value", () => {
    expect(renderName({ pattern: "trip-{n}", start: 1, pad: 3 }, ctx)).toBe("trip-001");
    expect(renderName({ pattern: "trip-{n}", start: 10, pad: 2 }, { ...ctx, index: 5 })).toBe("trip-15");
  });

  it("supports size, dimension and date tokens", () => {
    expect(renderName({ pattern: "{name}_{w}x{h}", start: 1, pad: 1 }, ctx)).toBe("IMG 001_1080x1350");
    expect(renderName({ pattern: "{size}-{date}", start: 1, pad: 1 }, ctx)).toBe("instagram-portrait-2026-11-13");
  });

  it("strips unsafe characters and never returns empty", () => {
    expect(renderName({ pattern: "a/b:c*{n}", start: 1, pad: 1 }, ctx)).toBe("a-b-c-1");
    expect(renderName({ pattern: "///", start: 1, pad: 1 }, ctx)).toBe("image");
    expect(renderName({ pattern: "x_{size}_", start: 1, pad: 1 }, { ...ctx, sizeId: undefined })).toBe("x");
  });
});

describe("watermark placement", () => {
  it("places marks in the 9 positions with margin", () => {
    expect(placeMark(1000, 500, 200, 50, "top-left", 2)).toEqual({ x: 10, y: 10 });
    expect(placeMark(1000, 500, 200, 50, "bottom-right", 2)).toEqual({ x: 790, y: 440 });
    expect(placeMark(1000, 500, 200, 50, "center", 2)).toEqual({ x: 400, y: 225 });
    expect(placeMark(1000, 500, 200, 50, "top", 0)).toEqual({ x: 400, y: 0 });
  });

  it("sizes the mark relative to image width and clamps", () => {
    expect(markWidth(1000, 25)).toBe(250);
    expect(markWidth(1000, 500)).toBe(800);
    expect(markWidth(100, 1)).toBe(8);
  });

  it("tiles across the whole image", () => {
    const tiles = tilePositions(1000, 1000, 200, 40);
    expect(tiles.length).toBeGreaterThan(10);
    expect(Math.min(...tiles.map((t) => t.x))).toBeLessThan(0);
    expect(Math.max(...tiles.map((t) => t.x))).toBeGreaterThan(800);
  });
});

describe("target file size search", () => {
  // Fake encoder: size grows linearly with quality.
  const fake = (bytesAtFull: number) => async (q: number) => new Blob([new Uint8Array(Math.round(bytesAtFull * q))]);

  it("returns full quality when it already fits", async () => {
    const r = await searchQuality(fake(50_000), 100_000, 0.9);
    expect(r!.quality).toBe(0.9);
  });

  it("finds the highest quality under the target", async () => {
    const r = await searchQuality(fake(1_000_000), 100_000, 0.9);
    expect(r!.blob.size).toBeLessThanOrEqual(100_000);
    expect(r!.quality).toBeGreaterThan(0.08);
    expect(r!.quality).toBeLessThanOrEqual(0.1);
  });

  it("returns null when even the lowest quality is too big", async () => {
    expect(await searchQuality(fake(10_000_000), 100_000, 0.9)).toBeNull();
  });
});
