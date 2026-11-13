"use client";

import { Download, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section, Segmented } from "@/components/editor/SettingsPanel";
import { Button } from "@/components/ui/Button";
import { addFilesToWorkspace, DropZone, type Rejection } from "@/components/upload/DropZone";
import { cellRects, COLLAGE_LAYOUTS, COLLAGE_SIZES, coverSource, type CollageLayout } from "@/lib/collage";
import { triggerDownload } from "@/lib/download";
import { loadEditedImage, type LoadedImage } from "@/lib/item-bitmap";
import { useImageStore } from "@/store/image-store";

const MAX_SOURCE = 2200;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

interface Options {
  layout: CollageLayout;
  width: number;
  height: number;
  gap: number;
  padding: number;
  radius: number;
  background: string;
}

/** Draw the collage at any scale (preview or full size). */
function drawCollage(ctx: CanvasRenderingContext2D, images: (LoadedImage | null)[], o: Options, scale: number) {
  const W = o.width * scale;
  const H = o.height * scale;
  ctx.fillStyle = o.background;
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = "high";
  const rects = cellRects(o.layout, W, H, o.gap * scale, o.padding * scale);
  rects.forEach((cell, i) => {
    const img = images[i];
    ctx.save();
    roundRect(ctx, cell.x, cell.y, cell.w, cell.h, o.radius * scale);
    ctx.clip();
    if (img) {
      const s = coverSource(img.width, img.height, cell);
      ctx.drawImage(img.src, s.x, s.y, s.w, s.h, cell.x, cell.y, cell.w, cell.h);
    } else {
      ctx.fillStyle = "rgba(127,127,127,0.18)";
      ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    }
    ctx.restore();
  });
}

function LayoutIcon({ layout, active }: { layout: CollageLayout; active: boolean }) {
  const rects = cellRects(layout, 40, 40, 3, 0);
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={2} fill={active ? "#000" : "#71717a"} />
      ))}
    </svg>
  );
}

export function CollageStudio() {
  const items = useImageStore((s) => s.items);
  const ready = useMemo(() => items.filter((i) => !i.converting && !i.thumbFailed), [items]);
  const [order, setOrder] = useState<string[]>([]);
  const [layoutId, setLayoutId] = useState("4");
  const [sizeId, setSizeId] = useState("square");
  const [gap, setGap] = useState(12);
  const [padding, setPadding] = useState(12);
  const [radius, setRadius] = useState(0);
  const [background, setBackground] = useState("#ffffff");
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [loaded, setLoaded] = useState<Record<string, LoadedImage>>({});
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const layout = COLLAGE_LAYOUTS.find((l) => l.id === layoutId)!;
  const size = COLLAGE_SIZES.find((s) => s.id === sizeId)!;

  // Default selection: the first images in the workspace.
  useEffect(() => {
    setOrder((prev) => {
      const valid = prev.filter((id) => ready.some((r) => r.id === id));
      if (valid.length) return valid;
      return ready.slice(0, layout.cells.length).map((r) => r.id);
    });
  }, [ready, layout.cells.length]);

  const chosen = order.slice(0, layout.cells.length);

  // Decode chosen images (with their edits) once.
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const id of chosen) {
        if (loaded[id]) continue;
        const it = ready.find((r) => r.id === id);
        if (!it) continue;
        try {
          const img = await loadEditedImage(it.file, it.edits, MAX_SOURCE);
          if (alive) setLoaded((m) => ({ ...m, [id]: img }));
        } catch {
          /* skip unreadable */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [chosen.join(","), ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const options: Options = { layout, width: size.width, height: size.height, gap, padding, radius, background };
  const images = chosen.map((id) => loaded[id] ?? null);

  // Live preview.
  useEffect(() => {
    const c = canvasRef.current;
    const box = boxRef.current;
    if (!c || !box) return;
    const maxW = box.clientWidth;
    const maxH = Math.min(window.innerHeight * 0.62, 640);
    const scale = Math.min(maxW / size.width, maxH / size.height);
    c.width = Math.round(size.width * scale);
    c.height = Math.round(size.height * scale);
    drawCollage(c.getContext("2d")!, images, options, scale);
  });

  const toggle = (id: string) => {
    setAdded(false);
    setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  };

  async function exportCollage(): Promise<File> {
    const c = document.createElement("canvas");
    c.width = size.width;
    c.height = size.height;
    drawCollage(c.getContext("2d")!, images, options, 1);
    const type = format === "png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), type, 0.92));
    return new File([blob], `collage_${size.width}x${size.height}.${format === "png" ? "png" : "jpg"}`, { type });
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader title="Collage" description="Combine 2–9 photos into one image." />
        {rejections.length > 0 && <p className="text-sm text-bad">{rejections.map((r) => `${r.name}: ${r.reason}`).join(" · ")}</p>}
        <DropZone onRejected={setRejections} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:py-6">
      <PageHeader title="Collage" description="Combine 2–9 photos into one image. Everything stays in your browser." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          <div ref={boxRef} className="flex min-h-[300px] items-center justify-center rounded-2xl border border-line bg-checker p-4">
            <canvas ref={canvasRef} className="max-w-full rounded shadow-2xl" data-testid="collage-canvas" />
          </div>
          <p className="text-xs text-muted">
            {size.width}×{size.height} px · {chosen.length}/{layout.cells.length} photos · click photos below to choose and order them
          </p>
          <div className="flex flex-wrap gap-2" data-testid="collage-picker">
            {ready.map((it) => {
              const pos = order.indexOf(it.id);
              const inUse = pos > -1 && pos < layout.cells.length;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => toggle(it.id)}
                  aria-pressed={inUse}
                  aria-label={`${inUse ? "Remove" : "Add"} ${it.name}`}
                  className={`relative h-16 w-16 overflow-hidden rounded-lg border bg-checker ${
                    inUse ? "border-white" : "border-line opacity-60 hover:opacity-100"
                  }`}
                >
                  {it.thumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumbUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  {inUse && (
                    <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-black">
                      {pos + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <Section title="Layout">
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Collage layout">
              {COLLAGE_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={layoutId === l.id}
                  title={l.label}
                  aria-label={l.label}
                  onClick={() => setLayoutId(l.id)}
                  className={`flex items-center justify-center rounded-md p-1 ${layoutId === l.id ? "bg-white" : "border border-line-strong hover:border-faint"}`}
                >
                  <LayoutIcon layout={l} active={layoutId === l.id} />
                </button>
              ))}
            </div>
          </Section>
          <Section title="Size">
            <select
              value={sizeId}
              onChange={(e) => setSizeId(e.target.value)}
              aria-label="Collage size"
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm outline-none focus:border-white"
            >
              {COLLAGE_SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · {s.width}×{s.height}
                </option>
              ))}
            </select>
          </Section>
          <Section title="Style">
            {[
              { label: "Gap", value: gap, set: setGap, max: 60 },
              { label: "Border", value: padding, set: setPadding, max: 80 },
              { label: "Rounded corners", value: radius, set: setRadius, max: 60 },
            ].map((s) => (
              <label key={s.label} className="block">
                <span className="mb-1 flex justify-between text-xs">
                  <span className="text-muted">{s.label}</span>
                  <span className="font-mono">{s.value}px</span>
                </span>
                <input type="range" min={0} max={s.max} value={s.value} onChange={(e) => s.set(Number(e.target.value))} className="w-full" aria-label={s.label} />
              </label>
            ))}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                aria-label="Background color"
                className="h-9 w-12 cursor-pointer rounded-md border border-line-strong bg-transparent"
              />
              <span className="font-mono text-xs text-muted">{background}</span>
            </div>
          </Section>
          <Section title="Export">
            <Segmented
              name="Collage format"
              value={format}
              onChange={setFormat}
              options={[
                { value: "jpeg", label: "JPG" },
                { value: "png", label: "PNG" },
              ]}
            />
            <Button
              className="w-full"
              disabled={busy || chosen.length === 0}
              data-testid="collage-download"
              onClick={async () => {
                setBusy(true);
                try {
                  const f = await exportCollage();
                  triggerDownload(f, f.name);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download collage
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy || chosen.length === 0 || added}
              onClick={async () => {
                addFilesToWorkspace([await exportCollage()]);
                setAdded(true);
              }}
            >
              <Plus className="h-4 w-4" /> {added ? "Added to Bulk Editor" : "Add to Bulk Editor"}
            </Button>
          </Section>
        </aside>
      </div>
    </div>
  );
}
