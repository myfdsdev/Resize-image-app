"use client";

import { useRef } from "react";
import { clampCrop } from "@/lib/image-processing/edits";
import type { CropRect } from "@/lib/image-processing/types";

type Handle = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const MIN = 0.03;

/**
 * Draggable crop rectangle over an image. Values are fractions of the image
 * (0–1), so the final crop matches the preview exactly at any resolution.
 * `ratio` is width / height in pixels (null = free).
 */
export function CropBox({
  rect,
  onChange,
  onCommit,
  ratio,
  imageWidth,
  imageHeight,
}: {
  rect: CropRect;
  onChange: (r: CropRect) => void;
  onCommit: (r: CropRect) => void;
  ratio: number | null;
  imageWidth: number;
  imageHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; start: CropRect; px: number; py: number; last: CropRect } | null>(null);

  // Fraction-space ratio: h = w * k
  const k = ratio ? imageWidth / (imageHeight * ratio) : 1;

  const pointFromEvent = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
  };

  const compute = (handle: Handle, s: CropRect, px: number, py: number, nx: number, ny: number): CropRect => {
    const dx = nx - px;
    const dy = ny - py;
    if (handle === "move") {
      return clampCrop({ ...s, x: s.x + dx, y: s.y + dy }, MIN);
    }

    if (ratio && handle.length === 2) {
      // Keep ratio: anchor the opposite corner.
      const right = handle.includes("e");
      const down = handle.includes("s");
      const ax = right ? s.x : s.x + s.w;
      const ay = down ? s.y : s.y + s.h;
      const cx = Math.min(1, Math.max(0, nx));
      const cy = Math.min(1, Math.max(0, ny));
      let w = Math.max(Math.abs(cx - ax), Math.abs(cy - ay) / k);
      const maxW = right ? 1 - ax : ax;
      const maxH = down ? 1 - ay : ay;
      w = Math.min(w, maxW, maxH / k);
      w = Math.max(w, MIN, MIN / k);
      if (w > maxW || w * k > maxH) w = Math.min(maxW, maxH / k);
      const h = w * k;
      return { x: right ? ax : ax - w, y: down ? ay : ay - h, w, h };
    }

    let x1 = s.x;
    let y1 = s.y;
    let x2 = s.x + s.w;
    let y2 = s.y + s.h;
    if (handle.includes("w")) x1 = Math.min(x2 - MIN, Math.max(0, s.x + dx));
    if (handle.includes("e")) x2 = Math.max(x1 + MIN, Math.min(1, s.x + s.w + dx));
    if (handle.includes("n")) y1 = Math.min(y2 - MIN, Math.max(0, s.y + dy));
    if (handle.includes("s")) y2 = Math.max(y1 + MIN, Math.min(1, s.y + s.h + dy));
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  };

  const onDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const p = pointFromEvent(e);
    drag.current = { handle, start: rect, px: p.x, py: p.y, last: rect };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = pointFromEvent(e);
    const next = compute(d.handle, d.start, d.px, d.py, p.x, p.y);
    d.last = next;
    onChange(next);
  };

  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    onCommit(d.last);
  };

  const handles: Handle[] = ratio ? ["nw", "ne", "sw", "se"] : ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
  const pos: Record<Exclude<Handle, "move">, string> = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
    s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
    e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  };

  return (
    <div ref={ref} className="absolute inset-0 touch-none select-none" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {/* Dim the area outside the crop (stays inside the image) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 bg-black/60" style={{ height: `${rect.y * 100}%` }} />
        <div className="absolute inset-x-0 bottom-0 bg-black/60" style={{ height: `${(1 - rect.y - rect.h) * 100}%` }} />
        <div
          className="absolute left-0 bg-black/60"
          style={{ top: `${rect.y * 100}%`, height: `${rect.h * 100}%`, width: `${rect.x * 100}%` }}
        />
        <div
          className="absolute right-0 bg-black/60"
          style={{ top: `${rect.y * 100}%`, height: `${rect.h * 100}%`, width: `${(1 - rect.x - rect.w) * 100}%` }}
        />
      </div>
      <div
        className="absolute cursor-move outline outline-1 outline-white"
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.w * 100}%`,
          height: `${rect.h * 100}%`,
        }}
        onPointerDown={onDown("move")}
        data-testid="crop-box"
      >
        {/* rule of thirds */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/30" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/30" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/30" />
        </div>
        {handles.map((h) => (
          <span
            key={h}
            onPointerDown={onDown(h)}
            data-handle={h}
            className={`absolute z-10 flex h-7 w-7 items-center justify-center ${pos[h as Exclude<Handle, "move">]}`}
          >
            <span className="pointer-events-none h-3.5 w-3.5 rounded-sm border-2 border-black bg-white shadow" />
          </span>
        ))}
      </div>
    </div>
  );
}
