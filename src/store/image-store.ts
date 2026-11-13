"use client";

import { create } from "zustand";
import { CUSTOM_PREFIX, type CustomPreset } from "@/lib/custom-presets";
import { NO_EDITS } from "@/lib/image-processing/edits";
import type { FitMode, ImageEdits, OutputFormat, ResizeTarget } from "@/lib/image-processing/types";
import { DEFAULT_WATERMARK, type WatermarkSettings } from "@/lib/image-processing/watermark";
import { PRESET_BY_ID } from "@/lib/presets";
import { DEFAULT_RENAME, type RenameOptions } from "@/lib/rename";

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
  note?: string;
  /** How the image was fitted, so previews can line up before/after. */
  fit?: FitMode;
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
  /** True while an HEIC file is being converted. */
  converting?: boolean;
  /** Rotate / flip / crop applied before resizing. */
  edits: ImageEdits;
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
  /** Max file size in KB for JPG/WebP (null = off). */
  targetKB: number | null;
  watermark: WatermarkSettings;
  rename: RenameOptions;
}

export interface WatermarkLogo {
  blob: Blob;
  url: string;
  name: string;
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
  targetKB: null,
  watermark: DEFAULT_WATERMARK,
  rename: DEFAULT_RENAME,
};

export type PartialSettings = Omit<Partial<Settings>, "watermark" | "rename"> & {
  watermark?: Partial<WatermarkSettings>;
  rename?: Partial<RenameOptions>;
};

/** Saved (partial) settings merged over the built-in defaults. */
export function mergeSettings(d: PartialSettings | null | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(d ?? {}),
    watermark: { ...DEFAULT_WATERMARK, ...(d?.watermark ?? {}) },
    rename: { ...DEFAULT_RENAME, ...(d?.rename ?? {}) },
  };
}

export function buildTargets(s: Settings, custom: CustomPreset[] = []): ResizeTarget[] {
  if (s.sizeMode === "original") {
    return [{ id: "original", label: "Original size", width: null, height: null, fit: "inside", allowUpscale: false }];
  }
  if (s.sizeMode === "presets") {
    const customById = new Map(custom.map((c) => [CUSTOM_PREFIX + c.id, c]));
    return s.presetIds
      .map((id) => {
        const c = customById.get(id);
        if (c) return { id: `my-${slug(c.name) || c.id}`, name: c.name, width: c.width, height: c.height };
        return PRESET_BY_ID[id];
      })
      .filter((p): p is { id: string; name: string; width: number; height: number } => !!p)
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

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function settingsKey(s: Settings, logo?: WatermarkLogo | null): string {
  return JSON.stringify(s) + (s.watermark.enabled && s.watermark.type === "image" ? `|logo:${logo?.name}:${logo?.blob.size}` : "");
}

/** Fingerprint of everything that affects an item's outputs. */
export function itemKey(s: Settings, item: Pick<ImageItem, "edits">, logo?: WatermarkLogo | null): string {
  return settingsKey(s, logo) + "|" + JSON.stringify(item.edits);
}

interface State {
  items: ImageItem[];
  selected: Set<string>;
  settings: Settings;
  running: boolean;
  cancelRequested: boolean;
  watermarkLogo: WatermarkLogo | null;
  customPresets: CustomPreset[];
  setWatermarkLogo: (file: File | null) => void;
  setCustomPresets: (list: CustomPreset[]) => void;
  addItems: (items: ImageItem[]) => void;
  removeItems: (ids: string[]) => void;
  clearAll: () => void;
  toggleSelect: (id: string) => void;
  selectAll: (on: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Replace settings with saved defaults (merged over the built-in defaults). */
  applyDefaults: (defaults: PartialSettings) => void;
  /** Update edits for one or more images. */
  editItems: (ids: string[], fn: (e: ImageEdits, item: ImageItem) => ImageEdits) => void;
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
  watermarkLogo: null,
  customPresets: [],

  setWatermarkLogo: (file) => {
    const old = get().watermarkLogo;
    if (old) URL.revokeObjectURL(old.url);
    set({ watermarkLogo: file ? { blob: file, url: URL.createObjectURL(file), name: file.name } : null });
  },
  setCustomPresets: (list) =>
    set((s) => {
      // Drop selections of presets that no longer exist.
      const valid = new Set(list.map((c) => CUSTOM_PREFIX + c.id));
      const presetIds = s.settings.presetIds.filter((id) => !id.startsWith(CUSTOM_PREFIX) || valid.has(id));
      return { customPresets: list, settings: { ...s.settings, presetIds } };
    }),

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
  applyDefaults: (defaults) => set({ settings: mergeSettings(defaults) }),
  editItems: (ids, fn) => {
    const target = new Set(ids);
    set((s) => ({
      items: s.items.map((it) => (target.has(it.id) ? { ...it, edits: fn(it.edits ?? NO_EDITS, it) } : it)),
    }));
  },

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
