"use client";

import { useCallback } from "react";
import { outputFileName } from "@/lib/filenames";
import { MIME_EXTENSION } from "@/lib/image-processing/geometry";
import { runJobs } from "@/lib/image-processing/runner";
import type { EncodableMime, ProcessJob } from "@/lib/image-processing/types";
import { isDefaultPattern, renderName } from "@/lib/rename";
import type { BatchStats } from "@/lib/settings-schema";
import { buildTargets, itemKey, useImageStore, type OutputItem } from "@/store/image-store";

export function useBatchProcessor() {
  const process = useCallback(async (onlyIds?: string[]) => {
    const store = useImageStore.getState();
    if (store.running) return { ok: false as const, error: "Already processing" };

    const { settings, watermarkLogo, customPresets } = store;
    const targets = buildTargets(settings, customPresets);
    if (targets.length === 0) {
      return {
        ok: false as const,
        error: settings.sizeMode === "presets" ? "Select at least one preset" : "Enter a width or height",
      };
    }

    const items = (onlyIds ? store.items.filter((i) => onlyIds.includes(i.id)) : store.items).filter(
      (i) => !i.converting,
    );
    if (items.length === 0) return { ok: false as const, error: "Add some images first" };

    const wm = settings.watermark;
    if (wm.enabled && wm.type === "image" && !watermarkLogo) {
      return { ok: false as const, error: "Upload a logo for the watermark, or switch to text" };
    }
    if (wm.enabled && wm.type === "text" && !wm.text.trim()) {
      return { ok: false as const, error: "Enter watermark text" };
    }

    const keys = new Map(items.map((i) => [i.id, itemKey(settings, i, watermarkLogo)]));
    const multi = targets.length > 1;
    const encode = {
      format: settings.format,
      quality: settings.quality / 100,
      background: settings.transparentPadding ? "transparent" : settings.background,
      targetBytes: settings.targetKB ? settings.targetKB * 1024 : null,
    };
    const watermark = wm.enabled ? { ...wm, logo: wm.type === "image" ? watermarkLogo?.blob : undefined } : undefined;
    // Numbering follows the order in the grid, so retries keep their numbers.
    const position = new Map(store.items.map((it, i) => [it.id, i]));
    const customNames = !isDefaultPattern(settings.rename);
    const batchDate = new Date();

    const jobs: ProcessJob[] = [];
    const pending = new Map<string, { remaining: number; outputs: OutputItem[]; errors: string[] }>();

    for (const item of items) {
      store.patchItem(item.id, { status: "queued", error: undefined });
      pending.set(item.id, { remaining: targets.length, outputs: [], errors: [] });
      targets.forEach((target, ti) => {
        jobs.push({
          jobId: `${item.id}::${ti}`,
          file: item.file,
          sourceMime: item.mime,
          target,
          encode,
          edits: item.edits,
          watermark,
        });
      });
    }

    const targetById = new Map(targets.map((t, i) => [String(i), t]));

    const finishOne = (itemId: string) => {
      const entry = pending.get(itemId)!;
      entry.remaining -= 1;
      if (entry.remaining > 0) return;
      const order = new Map(targets.map((t, i) => [t.id, i]));
      entry.outputs.sort((a, b) => (order.get(a.targetId) ?? 0) - (order.get(b.targetId) ?? 0));
      useImageStore.getState().setOutputs(itemId, entry.outputs, keys.get(itemId)!);
      useImageStore.getState().patchItem(itemId, {
        status: entry.errors.length ? "error" : "done",
        error: entry.errors.length ? entry.errors[0] : undefined,
      });
    };

    useImageStore.getState().setRunning(true);
    try {
      await runJobs(jobs, {
        isCancelled: () => useImageStore.getState().cancelRequested,
        onStart: (job) => {
          const [itemId] = job.jobId.split("::");
          useImageStore.getState().patchItem(itemId, { status: "processing" });
        },
        onDone: (job, result) => {
          const [itemId, ti] = job.jobId.split("::");
          const item = useImageStore.getState().items.find((i) => i.id === itemId);
          const target = targetById.get(ti)!;
          if (!item) return; // removed while processing
          const ext = MIME_EXTENSION[result.mime as EncodableMime] ?? "img";
          let fileName: string;
          let zipPath: string;
          if (customNames) {
            const base = renderName(settings.rename, {
              originalName: item.name,
              index: position.get(itemId) ?? 0,
              width: result.width,
              height: result.height,
              sizeId: target.id,
              date: batchDate,
            });
            const hasSize = /\{size\}/i.test(settings.rename.pattern);
            fileName = multi && !hasSize ? `${base}_${target.id}.${ext}` : `${base}.${ext}`;
            zipPath = multi ? `${target.id}/${base}.${ext}` : fileName;
          } else {
            fileName = outputFileName(item.name, ext, multi ? target.id : undefined);
            zipPath = multi ? `${target.id}/${outputFileName(item.name, ext)}` : fileName;
          }
          pending.get(itemId)!.outputs.push({
            targetId: target.id,
            targetLabel: target.label,
            blob: result.blob,
            url: URL.createObjectURL(result.blob),
            width: result.width,
            height: result.height,
            mime: result.mime,
            fileName,
            zipPath,
            note: result.note,
            fit: target.fit,
          });
          finishOne(itemId);
        },
        onError: (job, message) => {
          const [itemId] = job.jobId.split("::");
          if (!useImageStore.getState().items.some((i) => i.id === itemId)) return;
          pending.get(itemId)!.errors.push(message);
          finishOne(itemId);
        },
      });
    } finally {
      // Anything still queued (cancelled) goes back to idle.
      const st = useImageStore.getState();
      st.items.forEach((i) => {
        if (i.status === "queued" || i.status === "processing") st.patchItem(i.id, { status: "idle" });
      });
      st.setRunning(false);
    }
    let images = 0,
      outputs = 0,
      failed = 0,
      inBytes = 0,
      outBytes = 0;
    for (const item of items) {
      const entry = pending.get(item.id)!;
      if (entry.remaining > 0) continue; // cancelled before finishing
      images++;
      if (entry.errors.length) failed++;
      outputs += entry.outputs.length;
      if (entry.outputs.length) {
        inBytes += item.size;
        outBytes += entry.outputs.reduce((n, o) => n + o.blob.size, 0);
      }
    }
    const stats: BatchStats = {
      images,
      outputs,
      failed,
      inBytes,
      outBytes,
      sizes: targets.map((t) => t.label).slice(0, 60),
      format: settings.format,
    };
    return { ok: true as const, stats };
  }, []);

  return { process };
}
