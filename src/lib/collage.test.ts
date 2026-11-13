import { describe, expect, it } from "vitest";
import { cellRects, COLLAGE_LAYOUTS, coverSource } from "./collage";

const L = (id: string) => COLLAGE_LAYOUTS.find((l) => l.id === id)!;

describe("collage layouts", () => {
  it("every layout covers the grid without overlaps", () => {
    for (const l of COLLAGE_LAYOUTS) {
      const used = new Set<string>();
      let area = 0;
      for (const [c, r, cs, rs] of l.cells) {
        for (let x = c; x < c + cs; x++)
          for (let y = r; y < r + rs; y++) {
            const k = `${x},${y}`;
            expect(used.has(k), `${l.id} overlaps at ${k}`).toBe(false);
            used.add(k);
          }
        area += cs * rs;
      }
      expect(area, l.id).toBe(l.cols * l.rows);
    }
  });

  it("2×2 grid with gap and padding", () => {
    const r = cellRects(L("4"), 1000, 1000, 20, 40);
    expect(r[0]).toEqual({ x: 40, y: 40, w: 450, h: 450 });
    expect(r[3]).toEqual({ x: 510, y: 510, w: 450, h: 450 });
  });

  it("spanning cells include the gap they cross", () => {
    const r = cellRects(L("3a"), 1000, 1000, 20, 0);
    expect(r[0].h).toBe(1000);
    expect(r[1].h).toBe(490);
  });

  it("cover crop keeps the cell ratio and stays centered", () => {
    const s = coverSource(1600, 1000, { x: 0, y: 0, w: 500, h: 500 });
    expect(s.w).toBe(1000);
    expect(s.h).toBe(1000);
    expect(s.x).toBe(300);
    expect(s.y).toBe(0);
  });
});
