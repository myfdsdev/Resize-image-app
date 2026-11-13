"use client";

import { create } from "zustand";
import type { FitMode, OutputFormat, ResizeTarget } from "@/lib/image-processing/types";
import { PRESET_BY_ID } from "@/lib/presets";

export type ItemStatus = "idle" | "queued" | "processing" | "done" | "error";

export interface OutputItem {
  targetId: string;
  targetLabel: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  mime: string;
  /** Name used for single downloads (includes preset suffix when several sizes). */
  fileName: string;
  /** Path inside the ZIP (a folder per size when several sizes). */
  zipPath: string;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  mime: string;
  /** Full-size original (used in the preview modal). */
  previewUrl: string;
  /** Small preview for the grid; undefined while generating. */
  thumbUrl?: string;
  /** True when the browser could not read the file for a preview. */
  thumbFailed?: boolean;
  width?: number;
  height?: number;
  status: ItemStatus;
  error?: string;
  outputs: OutputItem[];
  /** Settings fingerprint used for the current outputs. */
  processedKey?: string;
}

export type SizeMode = "presets" | "custom" | "original";

export interface Settings {
  sizeMode: SizeMode;
  width: number | null;
  height: number | null;
  lockRatio: boolean;
  /** Used for custom size when ratio lock is off. */
  customFit: Exclude<FitMode, "inside">;
  presetIds: string[];
  presetFit: "cover" | "contain";
  allowUpscale: boolean;
  format: OutputFormat;
  /** 1–100 */
  quality: number;
  background: string;
  transparentPadding: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sizeMode: "custom",
  width: 1080,
  height: 1080,
  lockRatio: true,
  customFit: "cover",
  presetIds: ["instagram-square"],
  presetFit: "cover",
  allowUpscale: false,
  format: "original",
  quality: 85,
  background: "#ffffff",
  transparentPadding: false,
};

export function buildTargets(s: Settings): ResizeTarget[] {
  if (s.sizeMode === "original") {
    return [{ id: "original", label: "Original size", width: null, height: null, fit: "inside", allowUpscale: false }];
  }
  if (s.sizeMode === "presets") {
    return s.presetIds
      .map((id) => PRESET_BY_ID[id])
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        label: `${p.name} · ${p.width}×${p.height}`,
        width: p.width,
        height: p.height,
        fit: s.presetFit,
        allowUpscale: true, // presets need exact sizes, so small images are enlarged
      }));
  }
  const w = s.width && s.width > 0 ? s.width : null;
  const h = s.height && s.height > 0 ? s.height : null;
  if (!w && !h) return [];
  const fit: FitMode = s.lockRatio ? "inside" : s.customFit;
  return [
    {
      id: "custom",
      label: `${w ?? "auto"}×${h ?? "auto"}`,
      width: w,
      height: h,
      fit,
      allowUpscale: s.allowUpscale,
    },
  ];
}

export function settingsKey(s: Settings): string {
  return JSON.stringify(s);
}

interface State {
  items: ImageItem[];
  selected: Set<string>;
  settings: Settings;
  running: boolean;
  cancelRequested: boolean;
  addItems: (items: ImageItem[]) => void;
  removeItems: (ids: string[]) => void;
  clearAll: () => void;
  toggleSelect: (id: string) => void;
  selectAll: (on: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  patchItem: (id: string, patch: Partial<ImageItem>) => void;
  setThumb: (id: string, thumbUrl: string, width: number, height: number) => void;
  setOutputs: (id: string, outputs: OutputItem[], key: string) => void;
  setRunning: (running: boolean) => void;
  requestCancel: () => void;
}

const revokeOutputs = (item: ImageItem) => item.outputs.forEach((o) => URL.revokeObjectURL(o.url));

export const useImageStore = create<State>((set, get) => ({
  items: [],
  selected: new Set(),
  settings: DEFAULT_SETTINGS,
  running: false,
  cancelRequested: false,

  addItems: (items) => set((s) => ({ items: [...s.items, ...items] })),

  removeItems: (ids) => {
    const remove = new Set(ids);
    get().items.forEach((it) => {
      if (remove.has(it.id)) {
        URL.revokeObjectURL(it.previewUrl);
        if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
        revokeOutputs(it);
      }
    });
    set((s) => {
      const selected = new Set(s.selected);
      ids.forEach((id) => selected.delete(id));
      return { items: s.items.filter((it) => !remove.has(it.id)), selected };
    });
  },

  clearAll: () => {
    get().items.forEach((it) => {
      URL.revokeObjectURL(it.previewUrl);
      if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
      revokeOutputs(it);
    });
    set({ items: [], selected: new Set() });
  },

  toggleSelect: (id) =>
    set((s) => {
      const selected = new Set(s.selected);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      return { selected };
    }),

  selectAll: (on) => set((s) => ({ selected: on ? new Set(s.items.map((i) => i.id)) : new Set() })),


  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

  patchItem: (id, patch) => set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })),

  setThumb: (id, thumbUrl, width, height) => {
    if (!get().items.some((i) => i.id === id)) {
      URL.revokeObjectURL(thumbUrl); // item removed while the thumbnail was being made
      return;
    }
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, thumbUrl, width, height } : it)) }));
  },

  setOutputs: (id, outputs, key) =>
    set((s) => ({
      items: s.items.map((it) => {
        if (it.id !== id) return it;
        revokeOutputs(it);
        return { ...it, outputs, processedKey: key };
      }),
    })),

  setRunning: (running) => set({ running, cancelRequested: false }),
  requestCancel: () => set({ cancelRequested: true }),
}));
