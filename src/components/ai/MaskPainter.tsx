"use client";

import { useEffect, useRef } from "react";
import { drawStrokes, type MaskStroke } from "@/lib/ai-client";

/** Paint over the image to mark what the eraser should remove. */
export function MaskPainter({
  strokes,
  onChange,
  brush,
}: {
  strokes: MaskStroke[];
  onChange: (s: MaskStroke[]) => void;
  /** Brush diameter as a fraction of the image width. */
  brush: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<MaskStroke | null>(null);

  const redraw = (list: MaskStroke[]) => {
    const c = ref.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.round(rect.width * dpr));
    c.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    drawStrokes(ctx, list, c.width, c.height, "rgba(255, 60, 90, 0.55)");
  };

  useEffect(() => {
    redraw(strokes);
    const onResize = () => redraw(strokes);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [strokes]);

  const point = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ];
  };

  return (
    <canvas
      ref={ref}
      data-testid="mask-canvas"
      className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        drawing.current = { size: brush, points: [point(e)] };
        redraw([...strokes, drawing.current]);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        drawing.current.points.push(point(e));
        redraw([...strokes, drawing.current]);
      }}
      onPointerUp={() => {
        if (drawing.current) onChange([...strokes, drawing.current]);
        drawing.current = null;
      }}
      onPointerCancel={() => {
        drawing.current = null;
        redraw(strokes);
      }}
    />
  );
}
