/** Collage layouts as grid cells: [col, row, colSpan, rowSpan]. Pure math, no DOM. */
export interface CollageLayout {
  id: string;
  label: string;
  cols: number;
  rows: number;
  cells: [number, number, number, number][];
}

export const COLLAGE_LAYOUTS: CollageLayout[] = [
  { id: "2h", label: "2 side by side", cols: 2, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 1, 1]] },
  { id: "2v", label: "2 stacked", cols: 1, rows: 2, cells: [[0, 0, 1, 1], [0, 1, 1, 1]] },
  { id: "3h", label: "3 in a row", cols: 3, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1]] },
  { id: "3a", label: "1 big + 2", cols: 2, rows: 2, cells: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
  { id: "3b", label: "1 wide + 2", cols: 2, rows: 2, cells: [[0, 0, 2, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  { id: "4", label: "2 × 2 grid", cols: 2, rows: 2, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  {
    id: "5",
    label: "2 + 3",
    cols: 6,
    rows: 2,
    cells: [[0, 0, 3, 1], [3, 0, 3, 1], [0, 1, 2, 1], [2, 1, 2, 1], [4, 1, 2, 1]],
  },
  {
    id: "6",
    label: "3 × 2 grid",
    cols: 3,
    rows: 2,
    cells: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]],
  },
  {
    id: "9",
    label: "3 × 3 grid",
    cols: 3,
    rows: 3,
    cells: Array.from({ length: 9 }, (_, i) => [i % 3, Math.floor(i / 3), 1, 1] as [number, number, number, number]),
  },
];

export const COLLAGE_SIZES = [
  { id: "square", label: "Square", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait 4:5", width: 1080, height: 1350 },
  { id: "story", label: "Story 9:16", width: 1080, height: 1920 },
  { id: "landscape", label: "Landscape 16:9", width: 1920, height: 1080 },
  { id: "a4", label: "A4 print", width: 2480, height: 3508 },
];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pixel rectangles for each cell, with outer padding and gaps between cells. */
export function cellRects(layout: CollageLayout, W: number, H: number, gap: number, padding: number): Rect[] {
  const innerW = Math.max(1, W - padding * 2);
  const innerH = Math.max(1, H - padding * 2);
  const cw = (innerW - gap * (layout.cols - 1)) / layout.cols;
  const ch = (innerH - gap * (layout.rows - 1)) / layout.rows;
  return layout.cells.map(([c, r, cs, rs]) => ({
    x: padding + c * (cw + gap),
    y: padding + r * (ch + gap),
    w: cs * cw + (cs - 1) * gap,
    h: rs * ch + (rs - 1) * gap,
  }));
}

/** Source crop that fills a cell without distortion (centered "cover"). */
export function coverSource(sw: number, sh: number, cell: Rect): Rect {
  const scale = Math.max(cell.w / sw, cell.h / sh);
  const w = cell.w / scale;
  const h = cell.h / scale;
  return { x: (sw - w) / 2, y: (sh - h) / 2, w, h };
}
