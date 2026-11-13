"use client";

import { ChevronsLeftRight } from "lucide-react";
import { useState } from "react";

/** Drag (or use arrow keys) to compare the original with the processed image. */
export function BeforeAfter({
  before,
  after,
  ratio,
  beforeLabel = "Before",
  afterLabel = "After",
  beforeStyle,
  beforeFit = "contain",
}: {
  before: string;
  after: string;
  /** width / height of the output */
  ratio: number;
  beforeLabel?: string;
  afterLabel?: string;
  beforeStyle?: React.CSSProperties;
  /** Match how the output was fitted: cover for crops, fill for stretch. */
  beforeFit?: "contain" | "cover" | "fill";
}) {
  const [pos, setPos] = useState(50);

  return (
    <div
      className="relative mx-auto max-h-[60vh] w-full overflow-hidden rounded-xl border border-line bg-checker select-none"
      style={{ aspectRatio: String(ratio), maxWidth: `calc(60vh * ${ratio})` }}
      data-testid="before-after"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={afterLabel} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <div className="absolute inset-0 bg-checker" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before}
          alt={beforeLabel}
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: beforeFit, ...beforeStyle }}
          draggable={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `calc(${pos}% - 1px)` }}>
        <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
          <ChevronsLeftRight className="h-4 w-4" />
        </span>
      </div>

      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] text-zinc-200">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] text-zinc-200">
        {afterLabel}
      </span>

      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
