"use client";

import { Download, Loader2, Play, RotateCw, SlidersHorizontal, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { reportBatch } from "@/lib/defaults-client";
import { buildZip, triggerDownload, zipFileName } from "@/lib/download";
import { formatBytes } from "@/lib/filenames";
import { useBatchProcessor } from "@/hooks/useBatchProcessor";
import { buildTargets, itemKey, useImageStore } from "@/store/image-store";

export function ExportPanel({
  onMessage,
  variant = "full",
  onShowSettings,
}: {
  onMessage: (m: string) => void;
  variant?: "full" | "bar";
  onShowSettings?: () => void;
}) {
  const items = useImageStore((s) => s.items);
  const settings = useImageStore((s) => s.settings);
  const running = useImageStore((s) => s.running);
  const requestCancel = useImageStore((s) => s.requestCancel);
  const selected = useImageStore((s) => s.selected);
  const { process } = useBatchProcessor();
  const { loggedIn } = useDashboard();
  const [zipping, setZipping] = useState(false);

  const targets = buildTargets(settings);
  const stats = useMemo(() => {
    let done = 0,
      failed = 0,
      active = 0,
      outputs = 0,
      inBytes = 0,
      outBytes = 0;
    for (const it of items) {
      if (it.status === "done") done++;
      if (it.status === "error") failed++;
      if (it.status === "queued" || it.status === "processing") active++;
      outputs += it.outputs.length;
      if (it.outputs.length) {
        inBytes += it.size;
        outBytes += it.outputs.reduce((n, o) => n + o.blob.size, 0);
      }
    }
    return { done, failed, active, outputs, inBytes, outBytes };
  }, [items]);

  const outdated = items.some((i) => i.outputs.length > 0 && i.processedKey !== itemKey(settings, i));
  const finished = stats.done + stats.failed;
  const total = running ? finished + stats.active : items.length;
  const pct = total ? Math.round((finished / total) * 100) : 0;

  const scope = selected.size > 0 ? items.filter((i) => selected.has(i.id)) : items;
  const outputsInScope = scope.flatMap((i) => i.outputs);

  const run = async (ids?: string[]) => {
    const res = await process(ids);
    if (!res.ok) onMessage(res.error);
    else if (loggedIn && res.stats.images > 0) reportBatch(res.stats);
  };

  const downloadZip = async () => {
    if (!outputsInScope.length) return;
    if (outputsInScope.length === 1) {
      triggerDownload(outputsInScope[0].blob, outputsInScope[0].fileName);
      return;
    }
    setZipping(true);
    try {
      const zip = await buildZip(outputsInScope.map((o) => ({ path: o.zipPath, blob: o.blob })));
      triggerDownload(zip, zipFileName());
    } catch {
      onMessage("Could not create the ZIP file. Try downloading fewer images.");
    } finally {
      setZipping(false);
    }
  };

  const failedIds = items.filter((i) => i.status === "error").map((i) => i.id);

  if (variant === "bar") {
    return (
      <div className="border-t border-line-strong bg-surface-2/95 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-md">
        {running && (
          <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-white transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="shrink-0 px-3" onClick={onShowSettings} aria-label="Settings">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          {running ? (
            <Button variant="secondary" className="flex-1" onClick={requestCancel}>
              <Square className="h-4 w-4" /> Stop · {finished}/{total}
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => run()} disabled={!items.length}>
              <Play className="h-4 w-4" /> Process {items.length || ""}
              {targets.length > 1 ? ` × ${targets.length}` : ""}
            </Button>
          )}
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={downloadZip}
            disabled={!outputsInScope.length || running || zipping}
            aria-label="Download"
          >
            {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {outputsInScope.length > 1 ? "ZIP" : ""}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="export-panel">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-line bg-surface px-2 py-2.5">
          <div className="text-lg font-semibold" data-testid="stat-images">{items.length}</div>
          <div className="text-[11px] text-faint">Images</div>
        </div>
        <div className="rounded-lg border border-line bg-surface px-2 py-2.5">
          <div className="text-lg font-semibold" data-testid="stat-processed">{stats.done}</div>
          <div className="text-[11px] text-faint">Processed</div>
        </div>
        <div className="rounded-lg border border-line bg-surface px-2 py-2.5">
          <div className={`text-lg font-semibold ${stats.failed ? "text-bad" : ""}`} data-testid="stat-failed">
            {stats.failed}
          </div>
          <div className="text-[11px] text-faint">Failed</div>
        </div>
      </div>

      {(running || finished > 0) && (
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-muted">
            <span>{running ? "Processing…" : "Complete"}</span>
            <span className="font-mono">
              {finished}/{total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {stats.outputs > 0 && (
        <p className="text-xs text-muted">
          {stats.outputs} file{stats.outputs === 1 ? "" : "s"} · {formatBytes(stats.inBytes)} →{" "}
          <span className="text-fg">{formatBytes(stats.outBytes)}</span>
          {targets.length === 1 && stats.inBytes > stats.outBytes && (
            <span className="text-ok"> (−{Math.round((1 - stats.outBytes / stats.inBytes) * 100)}%)</span>
          )}
        </p>
      )}
      {outdated && !running && <p className="text-xs text-warn">Settings changed — process again to update outputs.</p>}

      <div className="space-y-2">
        {running ? (
          <Button variant="secondary" className="w-full" onClick={requestCancel}>
            <Square className="h-4 w-4" /> Stop
          </Button>
        ) : (
          <Button className="w-full" size="lg" onClick={() => run()} disabled={!items.length} data-testid="process-btn">
            <Play className="h-4 w-4" />
            Process {items.length || ""} image{items.length === 1 ? "" : "s"}
            {targets.length > 1 ? ` × ${targets.length} sizes` : ""}
          </Button>
        )}

        {failedIds.length > 0 && !running && (
          <Button variant="secondary" className="w-full" onClick={() => run(failedIds)}>
            <RotateCw className="h-4 w-4" /> Retry {failedIds.length} failed
          </Button>
        )}

        <Button
          variant="secondary"
          className="w-full"
          onClick={downloadZip}
          disabled={!outputsInScope.length || running || zipping}
          data-testid="download-btn"
        >
          {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {outputsInScope.length <= 1
            ? "Download"
            : `Download ZIP (${outputsInScope.length}${selected.size ? " selected" : ""})`}
        </Button>
      </div>
      <p className="text-center text-[11px] text-faint">Processed on your device · originals are never changed</p>
    </div>
  );
}
