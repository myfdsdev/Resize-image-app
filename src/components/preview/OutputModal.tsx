"use client";

import { Download, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { triggerDownload } from "@/lib/download";
import { formatBytes } from "@/lib/filenames";
import { useImageStore } from "@/store/image-store";
import { editTransform } from "../image-grid/ImageCard";
import { BeforeAfter } from "./BeforeAfter";

export function OutputModal({ id, onClose }: { id: string; onClose: () => void }) {
  const item = useImageStore((s) => s.items.find((i) => i.id === id));
  const [active, setActive] = useState(0);

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

  const out = item.outputs[Math.min(active, item.outputs.length - 1)];
  const change = out ? 1 - out.blob.size / item.size : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-surface-2 sm:rounded-2xl"
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

        <div className="space-y-4 overflow-y-auto p-4">
          {!out ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-checker">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt="Original"
                    className="max-h-full max-w-full object-contain"
                    style={{ transform: editTransform(item.edits) }}
                  />
                ) : (
                  <span className="text-xs text-faint">Preparing preview…</span>
                )}
              </div>
              <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-faint">
                {item.status === "error" ? item.error : "Not processed yet. Click “Process” to create outputs."}
              </div>
            </div>
          ) : (
            <>
              {item.outputs.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Output sizes">
                  {item.outputs.map((o, i) => (
                    <button
                      key={o.targetId}
                      type="button"
                      role="tab"
                      aria-selected={i === active}
                      onClick={() => setActive(i)}
                      className={`h-8 shrink-0 rounded-md px-3 text-xs ${
                        i === active ? "bg-white font-medium text-black" : "border border-line-strong text-muted hover:text-fg"
                      }`}
                    >
                      {o.targetLabel}
                    </button>
                  ))}
                </div>
              )}

              <BeforeAfter
                key={out.url}
                before={item.previewUrl}
                after={out.url}
                ratio={out.width / out.height}
                beforeLabel={`Before · ${formatBytes(item.size)}`}
                afterLabel={`After · ${formatBytes(out.blob.size)}`}
                beforeStyle={{ transform: editTransform(item.edits) }}
                beforeFit={
                  item.edits.crop || item.edits.rotate % 180 !== 0
                    ? "contain"
                    : out.fit === "cover"
                      ? "cover"
                      : out.fit === "stretch"
                        ? "fill"
                        : "contain"
                }
              />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                <div className="min-w-0 text-xs">
                  <p className="truncate text-sm text-fg" data-testid="output-filename">{out.fileName}</p>
                  <p className="mt-0.5 text-faint">
                    {out.width}×{out.height} · {out.mime.replace("image/", "").toUpperCase()} · {formatBytes(item.size)} →{" "}
                    {formatBytes(out.blob.size)}
                    {Math.abs(change) > 0.005 && (
                      <span className={change > 0 ? "ml-1 text-ok" : "ml-1 text-warn"}>
                        ({change > 0 ? "−" : "+"}
                        {Math.abs(Math.round(change * 100))}%)
                      </span>
                    )}
                  </p>
                  {out.note && (
                    <p className="mt-1 flex items-center gap-1 text-warn">
                      <Info className="h-3.5 w-3.5" /> {out.note}
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={() => triggerDownload(out.blob, out.fileName)}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
