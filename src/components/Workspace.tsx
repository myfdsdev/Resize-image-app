"use client";

import { Crop, FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SettingsPanel } from "@/components/editor/SettingsPanel";
import { ExportPanel } from "@/components/export/ExportPanel";
import { ImageCard } from "@/components/image-grid/ImageCard";
import { OutputModal } from "@/components/preview/OutputModal";
import { Button } from "@/components/ui/Button";
import { DropZone, type Rejection } from "@/components/upload/DropZone";
import { flipEdits, rotateEdits } from "@/lib/image-processing/edits";
import { itemKey, useImageStore } from "@/store/image-store";

export function Workspace() {
  const items = useImageStore((s) => s.items);
  const selected = useImageStore((s) => s.selected);
  const selectAll = useImageStore((s) => s.selectAll);
  const removeItems = useImageStore((s) => s.removeItems);
  const editItems = useImageStore((s) => s.editItems);
  const clearAll = useImageStore((s) => s.clearAll);
  const running = useImageStore((s) => s.running);
  const settings = useImageStore((s) => s.settings);

  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const onRejected = useCallback((r: Rejection[]) => setRejections(r), []);
  const closeModal = useCallback(() => setOpenId(null), []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 px-4 pb-28 pt-4 sm:px-6 lg:grid-cols-[1fr_340px] lg:gap-6 lg:py-6">
      <div className="min-w-0 space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Bulk Image Editor</h1>
          <p className="mt-1 text-sm text-muted">
            Resize, convert and compress images — right in your browser. Images stay here while you switch tools.
          </p>
        </div>

        {rejections.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm" role="alert">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-bad">
                {rejections.length} file{rejections.length === 1 ? "" : "s"} skipped
              </p>
              <button type="button" onClick={() => setRejections([])} aria-label="Dismiss" className="text-faint hover:text-fg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-1.5 max-h-28 space-y-0.5 overflow-y-auto text-xs text-muted">
              {rejections.map((r, i) => (
                <li key={i}>
                  <span className="text-fg">{r.name}</span> — {r.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length === 0 ? (
          <DropZone onRejected={onRejected} />
        ) : (
          <div className="rounded-2xl border border-line bg-surface-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-white"
                  checked={allSelected}
                  onChange={(e) => selectAll(e.target.checked)}
                  aria-label="Select all"
                />
                {selected.size > 0 ? `${selected.size} selected` : `${items.length} image${items.length === 1 ? "" : "s"}`}
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {selected.size > 0 && (
                  <>
                    <div className="flex items-center rounded-lg border border-line-strong" role="group" aria-label="Edit selected">
                      <button
                        type="button"
                        title="Rotate left"
                        aria-label="Rotate selected left"
                        disabled={running}
                        onClick={() => editItems([...selected], (e) => rotateEdits(e, -90))}
                        className="flex h-8 w-8 items-center justify-center text-muted hover:text-fg disabled:opacity-40"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Rotate right"
                        aria-label="Rotate selected right"
                        disabled={running}
                        onClick={() => editItems([...selected], (e) => rotateEdits(e, 90))}
                        className="flex h-8 w-8 items-center justify-center text-muted hover:text-fg disabled:opacity-40"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Flip horizontal"
                        aria-label="Flip selected horizontally"
                        disabled={running}
                        onClick={() => editItems([...selected], (e) => flipEdits(e, "h"))}
                        className="flex h-8 w-8 items-center justify-center text-muted hover:text-fg disabled:opacity-40"
                      >
                        <FlipHorizontal2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Flip vertical"
                        aria-label="Flip selected vertically"
                        disabled={running}
                        onClick={() => editItems([...selected], (e) => flipEdits(e, "v"))}
                        className="flex h-8 w-8 items-center justify-center text-muted hover:text-fg disabled:opacity-40"
                      >
                        <FlipVertical2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Button size="sm" variant="danger" disabled={running} onClick={() => removeItems([...selected])}>
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </>
                )}
                <Link
                  href="/app/crop"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-muted hover:bg-surface-3 hover:text-fg"
                >
                  <Crop className="h-3.5 w-3.5" /> Crop
                </Link>
                <Button size="sm" variant="ghost" disabled={running} onClick={clearAll}>
                  Clear all
                </Button>
                <DropZone compact onRejected={onRejected} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" data-testid="image-grid">
              {items.map((it) => (
                <ImageCard
                  key={it.id}
                  item={it}
                  selected={selected.has(it.id)}
                  outdated={it.status === "done" && it.processedKey !== itemKey(settings, it)}
                  onOpen={setOpenId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div id="settings" className="scroll-mt-20 overflow-hidden rounded-2xl border border-line bg-surface-2">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-medium">Image settings</h2>
          </div>
          <SettingsPanel />
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-medium">Export</h2>
          </div>
          <ExportPanel onMessage={setMessage} />
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <ExportPanel
          variant="bar"
          onMessage={setMessage}
          onShowSettings={() => document.getElementById("settings")?.scrollIntoView({ behavior: "smooth" })}
        />
      </div>

      {message && (
        <div className="fixed bottom-24 left-1/2 z-50 lg:bottom-4 -translate-x-1/2 rounded-lg border border-line-strong bg-surface-3 px-4 py-2.5 text-sm shadow-xl" role="status">
          {message}
        </div>
      )}
      {openId && <OutputModal id={openId} onClose={closeModal} />}
    </div>
  );
}
