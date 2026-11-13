"use client";

import { Download, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { triggerDownload } from "@/lib/download";
import { formatBytes } from "@/lib/filenames";
import { useImageStore } from "@/store/image-store";

export function OutputModal({ id, onClose }: { id: string; onClose: () => void }) {
  const item = useImageStore((s) => s.items.find((i) => i.id === id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    if (!item) onClose();
  }, [item, onClose]);
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-surface-2 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">{item.name}</h2>
            <p className="text-xs text-faint">
              Original · {item.width ?? "?"}×{item.height ?? "?"} · {formatBytes(item.size)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-fg" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          <figure className="space-y-2">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-checker">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="Original" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-faint">Preparing preview…</span>
              )}
            </div>
            <figcaption className="text-xs text-muted">Original</figcaption>
          </figure>

          {item.outputs.length === 0 && (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-faint">
              {item.status === "error" ? item.error : "Not processed yet. Click “Process” to create outputs."}
            </div>
          )}

          {item.outputs.map((o) => (
            <figure key={o.targetId} className="space-y-2">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-checker">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.url} alt={o.targetLabel} className="max-h-full max-w-full object-contain" />
              </div>
              <figcaption className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-xs">
                  <p className="truncate text-fg">{o.targetLabel}</p>
                  <p className="text-faint">
                    {o.width}×{o.height} · {o.mime.replace("image/", "").toUpperCase()} · {formatBytes(o.blob.size)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => triggerDownload(o.blob, o.fileName)}>
                  <Download className="h-3.5 w-3.5" /> Save
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
