/** Page layout for "images to PDF". Units are PDF points (1/72 inch). Pure math. */
export type PdfPageSize = "a4" | "letter" | "fit";
export type PdfOrientation = "auto" | "portrait" | "landscape";
export type PdfMargin = "none" | "small" | "normal";

export interface PdfOptions {
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  margin: PdfMargin;
}

export const PAGE_SIZES: Record<Exclude<PdfPageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export const MARGINS: Record<PdfMargin, number> = { none: 0, small: 18, normal: 36 };

/** Where an image of (w × h) pixels goes on its page. */
export function pdfPageLayout(w: number, h: number, o: PdfOptions) {
  const m = MARGINS[o.margin];
  if (o.pageSize === "fit") {
    // 96 dpi screen pixels → points, page wraps the image.
    const iw = w * 0.75;
    const ih = h * 0.75;
    return { pageW: iw + m * 2, pageH: ih + m * 2, x: m, y: m, w: iw, h: ih };
  }
  let [pw, ph] = PAGE_SIZES[o.pageSize];
  const landscape = o.orientation === "landscape" || (o.orientation === "auto" && w > h);
  if (landscape) [pw, ph] = [ph, pw];
  const boxW = pw - m * 2;
  const boxH = ph - m * 2;
  const scale = Math.min(boxW / w, boxH / h);
  const dw = w * scale;
  const dh = h * scale;
  return { pageW: pw, pageH: ph, x: (pw - dw) / 2, y: (ph - dh) / 2, w: dw, h: dh };
}
