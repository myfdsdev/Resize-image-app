"use client";

import { AlertCircle, Check, Crop, Loader2, Trash2 } from "lucide-react";
import { memo } from "react";
import { formatBytes } from "@/lib/filenames";
import { hasEdits } from "@/lib/image-processing/edits";
import type { ImageEdits } from "@/lib/image-processing/types";
import { useImageStore, type ImageItem } from "@/store/image-store";

/** Show rotation/flip on the thumbnail without regenerating it. */
export function editTransform(e?: ImageEdits): string | undefined {
  if (!e || (!e.rotate && !e.flipH && !e.flipV)) return undefined;
  return `rotate(${e.rotate}deg) scale(${e.flipH ? -1 : 1}, ${e.flipV ? -1 : 1})`;
}

function StatusBadge({ item, outdated }: { item: ImageItem; outdated: boolean }) {
  switch (item.status) {
    case "queued":
      return <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-muted">Queued</span>;
    case "processing":
      return (
        <span className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px]">
          <Loader2 className="h-3 w-3 animate-spin" /> Working
        </span>
      );
    case "done":
      return (
        <span
          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${
            outdated ? "bg-black/70 text-warn" : "bg-white text-black"
          }`}
        >
          <Check className="h-3 w-3" /> {outdated ? "Outdated" : "Done"}
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 rounded-md bg-red-500/90 px-1.5 py-0.5 text-[11px] text-white">
          <AlertCircle className="h-3 w-3" /> Failed
        </span>
      );
    default:
      return null;
  }
}

export const ImageCard = memo(function ImageCard({
  item,
  selected,
  outdated,
  onOpen,
}: {
  item: ImageItem;
  selected: boolean;
  outdated: boolean;
  onOpen: (id: string) => void;
}) {
  const toggleSelect = useImageStore((s) => s.toggleSelect);
  const removeItems = useImageStore((s) => s.removeItems);
  const running = useImageStore((s) => s.running);

  const outSize = item.outputs.reduce((n, o) => n + o.blob.size, 0);
  const saved = item.outputs.length === 1 ? 1 - outSize / item.size : null;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-surface transition-colors ${
        selected ? "border-white" : "border-line hover:border-line-strong"
      }`}
      data-testid="image-card"
      data-status={item.status}
    >
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className="relative block aspect-square w-full bg-checker"
        aria-label={`Open ${item.name}`}
      >
        {item.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbUrl}
            alt=""
            decoding="async"
            className="h-full w-full object-contain transition-transform"
            style={{ transform: editTransform(item.edits) }}
          />
        ) : item.converting ? (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-[11px] text-faint">
            <Loader2 className="h-5 w-5 animate-spin" /> Converting HEIC…
          </span>
        ) : item.thumbFailed ? (
          <span className="flex h-full w-full items-center justify-center text-xs text-faint">No preview</span>
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-faint" />
          </span>
        )}
      </button>

      <label className="absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-line-strong bg-black/70 backdrop-blur">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-white"
          checked={selected}
          onChange={() => toggleSelect(item.id)}
          aria-label={`Select ${item.name}`}
        />
      </label>
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
        <StatusBadge item={item} outdated={outdated} />
        {item.edits?.crop && (
          <span className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-muted" title="Cropped">
            <Crop className="h-3 w-3" /> Cropped
          </span>
        )}
        {hasEdits(item.edits) && !item.edits.crop && (
          <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-muted">Edited</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => removeItems([item.id])}
        disabled={running}
        className="absolute left-2 top-10 flex h-6 w-6 items-center justify-center rounded-md border border-line-strong bg-black/75 text-muted hover:text-bad disabled:hidden sm:hidden sm:group-hover:flex"
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="space-y-0.5 border-t border-line px-2.5 py-2">
        <p className="truncate text-xs font-medium" title={item.name}>
          {item.name}
        </p>
        <p className="flex flex-wrap items-center justify-between gap-x-2 text-[11px] text-faint">
          <span className="whitespace-nowrap">{item.width ? `${item.width}×${item.height}` : "…"}</span>
          {item.outputs.length > 0 ? (
            <span className="whitespace-nowrap text-muted">
              {formatBytes(item.size)} → {formatBytes(outSize)}
              {saved !== null && saved > 0.005 && <span className="ml-1 text-ok">−{Math.round(saved * 100)}%</span>}
            </span>
          ) : (
            <span>{formatBytes(item.size)}</span>
          )}
        </p>
        {item.outputs.some((o) => o.note) && (
          <p className="truncate text-[11px] text-warn" title={item.outputs.find((o) => o.note)?.note}>
            {item.outputs.find((o) => o.note)?.note}
          </p>
        )}
        {item.status === "error" && item.error && (
          <p className="truncate text-[11px] text-bad" title={item.error}>
            {item.error}
          </p>
        )}
      </div>
    </div>
  );
});
