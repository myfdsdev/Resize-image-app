import { describe, expect, it } from "vitest";
import { pdfPageLayout } from "./pdf-layout";

describe("images to PDF layout", () => {
  it("fits a portrait photo on A4 portrait, centered, keeping its ratio", () => {
    const l = pdfPageLayout(3000, 4000, { pageSize: "a4", orientation: "auto", margin: "normal" });
    expect(l.pageW).toBeCloseTo(595.28);
    expect(l.pageH).toBeCloseTo(841.89);
    expect(l.w / l.h).toBeCloseTo(0.75);
    expect(l.w).toBeLessThanOrEqual(595.28 - 72 + 0.01);
    expect(l.x).toBeCloseTo((595.28 - l.w) / 2);
  });

  it("auto orientation turns the page for landscape photos", () => {
    const l = pdfPageLayout(4000, 3000, { pageSize: "a4", orientation: "auto", margin: "none" });
    expect(l.pageW).toBeGreaterThan(l.pageH);
    expect(l.h).toBeCloseTo(595.28); // 4:3 on A4 landscape is limited by height
  });

  it("forced orientation is respected", () => {
    const l = pdfPageLayout(4000, 3000, { pageSize: "letter", orientation: "portrait", margin: "none" });
    expect(l.pageW).toBe(612);
    expect(l.w).toBe(612);
  });

  it("fit-to-image page wraps the image plus margin", () => {
    const l = pdfPageLayout(800, 600, { pageSize: "fit", orientation: "auto", margin: "small" });
    expect([l.pageW, l.pageH]).toEqual([636, 486]);
    expect([l.x, l.y, l.w, l.h]).toEqual([18, 18, 600, 450]);
  });
});
