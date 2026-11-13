"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  RotateCcw,
  RotateCw,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { editTransform } from "@/components/image-grid/ImageCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DropZone, type Rejection } from "@/components/upload/DropZone";
import {
  centeredCrop,
  cropPixels,
  flipEdits,
  NO_EDITS,
  orientedSize,
  rotateEdits,
  sourceTransform,
} from "@/lib/image-processing/edits";
import { decodeImage } from "@/lib/image-processing/pipeline";
import type { CropRect, ImageEdits } from "@/lib/image-processing/types";
import { useImageStore } from "@/store/image-store";
import { CropBox } from "./CropBox";

interface RatioOption {
  id: string;
  label: string;
  ratio: number | null | "original";
  group: "basic" | "social";
}

const RATIOS: RatioOption[] = [
  { id: "free", label: "Free", ratio: null, group: "basic" },
  { id: "original", label: "Original", ratio: "original", group: "basic" },
  { id: "1:1", label: "1:1", ratio: 1, group: "basic" },
  { id: "4:5", label: "4:5", ratio: 4 / 5, group: "basic" },
  { id: "3:4", label: "3:4", ratio: 3 / 4, group: "basic" },
  { id: "2:3", label: "2:3", ratio: 2 / 3, group: "basic" },
  { id: "9:16", label: "9:16", ratio: 9 / 16, group: "basic" },
  { id: "16:9", label: "16:9", ratio: 16 / 9, group: "basic" },
  { id: "4:3", label: "4:3", ratio: 4 / 3, group: "basic" },
  { id: "3:2", label: "3:2", ratio: 3 / 2, group: "basic" },
  { id: "ig-post", label: "Instagram Post", ratio: 1, group: "social" },
  { id: "ig-portrait", label: "Instagram Portrait", ratio: 4 / 5, group: "social" },
  { id: "story", label: "Story / Reel", ratio: 9 / 16, group: "social" },
  { id: "yt", label: "YouTube Thumbnail", ratio: 16 / 9, group: "social" },
  { id: "fb-cover", label: "Facebook Cover", ratio: 851 / 315, group: "social" },
  { id: "x-header", label: "X Header", ratio: 3, group: "social" },
  { id: "li-banner", label: "LinkedIn Banner", ratio: 4, group: "social" },
  { id: "pin", label: "Pinterest Pin", ratio: 2 / 3, group: "social" },
];

const PREVIEW_MAX = 1600;
const previewCache = new Map<string, ImageBitmap>();

async function loadPreview(id: string, file: Blob): Promise<ImageBitmap> {
  const hit = previewCache.get(id);
  if (hit) return hit;
  const full = await decodeImage(file);
  const scale = Math.min(1, PREVIEW_MAX / Math.max(full.width, full.height));
  let bmp = full;
  if (scale < 1) {
    bmp = await createImageBitmap(full, {
      resizeWidth: Math.max(1, Math.round(full.width * scale)),
      resizeHeight: Math.max(1, Math.round(full.height * scale)),
      resizeQuality: "high",
    });
    full.close();
  }
  if (previewCache.size > 12) {
    const first = previewCache.keys().next().value!;
    previewCache.get(first)?.close();
    previewCache.delete(first);
  }
  previewCache.set(id, bmp);
  return bmp;
}

function IconBtn({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-10 flex-1 items-center justify-center rounded-lg border border-line-strong bg-surface text-muted hover:bg-surface-3 hover:text-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function CropStudio() {
  const items = useImageStore((s) => s.items);
  const editItems = useImageStore((s) => s.editItems);
  const running = useImageStore((s) => s.running);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ratioId, setRatioId] = useState("free");
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [preview, setPreview] = useState<ImageBitmap | null>(null);
  const [draft, setDraft] = useState<CropRect | null>(null);
  const [applied, setApplied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setStage({ w, h });
    };
    measure();
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setStage({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length]);

  const ready = items.filter((i) => !i.converting && !i.thumbFailed);
  const index = Math.max(0, ready.findIndex((i) => i.id === activeId));
  const item = ready[index] ?? null;
  const edits: ImageEdits = item?.edits ?? NO_EDITS;

  useEffect(() => {
    if (!activeId && ready[0]) setActiveId(ready[0].id);
  }, [activeId, ready]);

  // Load a medium-size preview for the active image.
  useEffect(() => {
    let alive = true;
    setPreview(null);
    if (!item) return;
    loadPreview(item.id, item.file)
      .then((b) => alive && setPreview(b))
      .catch(() => alive && setPreview(null));
    return () => {
      alive = false;
    };
  }, [item?.id, item?.file]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw the rotated/flipped (uncropped) preview.
  const oriented = useMemo(
    () => (preview ? orientedSize(preview.width, preview.height, edits.rotate) : null),
    [preview, edits.rotate],
  );
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !preview || !oriented) return;
    c.width = oriented.width;
    c.height = oriented.height;
    const ctx = c.getContext("2d")!;
    const t = sourceTransform(preview.width, preview.height, { ...edits, crop: null });
    ctx.setTransform(...t.matrix);
    ctx.drawImage(preview, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [preview, oriented, edits]);

  // Real (full resolution) oriented size, for ratios and pixel read-out.
  const real = item?.width && item.height ? orientedSize(item.width, item.height, edits.rotate) : null;

  const ratioValue = (opt: RatioOption, w: number, h: number): number | null =>
    opt.ratio === "original" ? w / h : opt.ratio;
  const currentRatioOpt = RATIOS.find((r) => r.id === ratioId)!;
  const activeRatio = real ? ratioValue(currentRatioOpt, real.width, real.height) : null;

  const rect = draft ?? edits.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const px = real ? cropPixels(real.width, real.height, rect) : null;

  const commitCrop = useCallback(
    (r: CropRect | null) => {
      if (!item) return;
      const full = r && r.x <= 0.0005 && r.y <= 0.0005 && r.w >= 0.999 && r.h >= 0.999;
      editItems([item.id], (e) => ({ ...e, crop: full ? null : r }));
      setDraft(null);
    },
    [item, editItems],
  );

  const chooseRatio = (opt: RatioOption) => {
    setRatioId(opt.id);
    if (!item || !real) return;
    const r = ratioValue(opt, real.width, real.height);
    commitCrop(r ? centeredCrop(real.width, real.height, r) : edits.crop);
  };

  const applyToAll = () => {
    if (!item) return;
    const src = edits;
    const opt = currentRatioOpt;
    editItems(
      ready.map((i) => i.id),
      (_, it) => {
        if (it.id === item.id) return src;
        let next: ImageEdits = { rotate: src.rotate, flipH: src.flipH, flipV: src.flipV, crop: null };
        if (it.width && it.height) {
          const o = orientedSize(it.width, it.height, next.rotate);
          const r = ratioValue(opt, o.width, o.height);
          if (opt.ratio !== null && r) next = { ...next, crop: centeredCrop(o.width, o.height, r) };
          else next = { ...next, crop: src.crop };
        }
        return next;
      },
    );
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const go = (d: 1 | -1) => {
    const next = ready[(index + d + ready.length) % ready.length];
    if (next) setActiveId(next.id);
    setDraft(null);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader title="Crop & Rotate" description="Crop with exact ratios and social presets, rotate and flip." />
        {rejections.length > 0 && (
          <p className="text-sm text-bad">{rejections.map((r) => `${r.name}: ${r.reason}`).join(" · ")}</p>
        )}
        <DropZone onRejected={setRejections} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:py-6">
      <PageHeader
        title="Crop & Rotate"
        description="Edits are applied when you process images in the Bulk Editor."
        actions={
          <ButtonLink href="/app" variant="secondary" size="sm">
            Done <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Editor */}
        <div className="min-w-0 space-y-3">
          <div className="relative rounded-2xl border border-line bg-checker p-4 sm:p-6">
            <div ref={stageRef} className="flex h-[340px] items-center justify-center sm:h-[520px]">
            {!preview || !oriented || !stage.w ? (
              <Loader2 className="h-6 w-6 animate-spin text-faint" />
            ) : (
              <div
                className="relative"
                style={(() => {
                  const k = Math.min(stage.w / oriented.width, stage.h / oriented.height);
                  return { width: Math.floor(oriented.width * k), height: Math.floor(oriented.height * k) };
                })()}
              >
                <canvas ref={canvasRef} className="block h-full w-full" data-testid="crop-canvas" />
                <div className="absolute inset-0">
                  <CropBox
                    rect={rect}
                    ratio={activeRatio}
                    imageWidth={real?.width ?? oriented.width}
                    imageHeight={real?.height ?? oriented.height}
                    onChange={setDraft}
                    onCommit={commitCrop}
                  />
                </div>
              </div>
            )}
            </div>
            {ready.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-fg hover:bg-black"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-fg hover:bg-black"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span className="truncate">
              {item?.name} · {index + 1}/{ready.length}
            </span>
            {px && (
              <span className="font-mono" data-testid="crop-size">
                {px.width} × {px.height} px
              </span>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Images">
            {ready.map((it) => (
              <button
                key={it.id}
                type="button"
                role="option"
                aria-selected={it.id === item?.id}
                onClick={() => {
                  setActiveId(it.id);
                  setDraft(null);
                }}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-checker ${
                  it.id === item?.id ? "border-white" : "border-line hover:border-line-strong"
                }`}
              >
                {it.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.thumbUrl} alt={it.name} className="h-full w-full object-cover" style={{ transform: editTransform(it.edits) }} />
                )}
                {it.edits.crop && <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface-2 p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-faint">Rotate & flip</h3>
            <div className="mt-3 flex gap-2">
              <IconBtn label="Rotate left" disabled={running} onClick={() => item && editItems([item.id], (e) => rotateEdits(e, -90))}>
                <RotateCcw className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Rotate right" disabled={running} onClick={() => item && editItems([item.id], (e) => rotateEdits(e, 90))}>
                <RotateCw className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Flip horizontal" disabled={running} onClick={() => item && editItems([item.id], (e) => flipEdits(e, "h"))}>
                <FlipHorizontal2 className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Flip vertical" disabled={running} onClick={() => item && editItems([item.id], (e) => flipEdits(e, "v"))}>
                <FlipVertical2 className="h-4 w-4" />
              </IconBtn>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface-2 p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-faint">Aspect ratio</h3>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {RATIOS.filter((r) => r.group === "basic").map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => chooseRatio(r)}
                  aria-pressed={ratioId === r.id}
                  className={`h-8 rounded-md text-xs font-medium ${
                    ratioId === r.id ? "bg-white text-black" : "border border-line-strong text-muted hover:text-fg"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-faint">Social presets</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {RATIOS.filter((r) => r.group === "social").map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => chooseRatio(r)}
                  aria-pressed={ratioId === r.id}
                  className={`h-8 truncate rounded-md px-2 text-xs ${
                    ratioId === r.id ? "bg-white font-medium text-black" : "border border-line-strong text-muted hover:text-fg"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-2xl border border-line bg-surface-2 p-4">
            <Button variant="secondary" className="w-full" onClick={applyToAll} disabled={ready.length < 2 || running}>
              {applied ? <Check className="h-4 w-4 text-ok" /> : null}
              {applied ? "Applied to all" : `Apply to all ${ready.length} images`}
            </Button>
            <p className="text-xs text-faint">
              Copies rotation and flip. With a ratio selected, each image gets a centered crop of that ratio.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => {
                  commitCrop(null);
                  setRatioId("free");
                }}
              >
                Clear crop
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => item && editItems([item.id], () => NO_EDITS)}
              >
                <Undo2 className="h-3.5 w-3.5" /> Reset image
              </Button>
            </div>
          </section>

          <Link href="/app" className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-fg lg:hidden">
            <ArrowLeft className="h-4 w-4" /> Back to Bulk Editor
          </Link>
        </div>
      </div>
    </div>
  );
}
