"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { DEFAULT_FILTERS, FILTER_EFFECTS, isNeutral, type FilterSettings } from "@/lib/image-processing/filters";
import { WATERMARK_POSITIONS, type WatermarkSettings } from "@/lib/image-processing/watermark";
import { RENAME_TOKENS, renderName } from "@/lib/rename";
import { useImageStore } from "@/store/image-store";
import { Section, Segmented, Toggle } from "./SettingsPanel";

const TARGET_PRESETS = [50, 100, 200, 500, 1000];

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-fg">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </label>
  );
}

export function TargetSizeSection() {
  const settings = useImageStore((s) => s.settings);
  const update = useImageStore((s) => s.updateSettings);
  const firstMime = useImageStore((s) => s.items[0]?.mime);
  const enabled = settings.targetKB !== null;
  const pngOut = settings.format === "png" || (settings.format === "original" && firstMime === "image/png");

  return (
    <Section title="File size limit">
      <Toggle label="Limit file size" checked={enabled} onChange={(on) => update({ targetKB: on ? 100 : null })} />
      {enabled && (
        <div className="space-y-2">
          <div className="flex h-10 items-center rounded-lg border border-line-strong bg-surface focus-within:border-white">
            <input
              type="number"
              min={5}
              max={50000}
              value={settings.targetKB ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                update({ targetKB: Number.isFinite(n) && n >= 5 ? Math.min(n, 50000) : 5 });
              }}
              className="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none"
              aria-label="Maximum file size in KB"
            />
            <span className="pr-3 text-xs text-faint">KB max</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_PRESETS.map((kb) => (
              <button
                key={kb}
                type="button"
                onClick={() => update({ targetKB: kb })}
                className={`h-7 rounded-md px-2 text-xs ${
                  settings.targetKB === kb ? "bg-white font-medium text-black" : "border border-line-strong text-muted hover:text-fg"
                }`}
              >
                {kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`}
              </button>
            ))}
          </div>
          <p className={`text-xs ${pngOut ? "text-warn" : "text-faint"}`}>
            {pngOut
              ? "Size limits work with JPG and WebP. Choose JPG or WebP as the format."
              : "Quality is lowered automatically until each file fits. If needed, the image is made slightly smaller."}
          </p>
        </div>
      )}
    </Section>
  );
}

const POS_LABEL: Record<string, string> = {
  "top-left": "↖",
  top: "↑",
  "top-right": "↗",
  left: "←",
  center: "•",
  right: "→",
  "bottom-left": "↙",
  bottom: "↓",
  "bottom-right": "↘",
};

export function WatermarkSection() {
  const wm = useImageStore((s) => s.settings.watermark);
  const updateSettings = useImageStore((s) => s.updateSettings);
  const logo = useImageStore((s) => s.watermarkLogo);
  const setLogo = useImageStore((s) => s.setWatermarkLogo);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<WatermarkSettings>) => updateSettings({ watermark: { ...wm, ...patch } });

  return (
    <Section title="Watermark">
      <Toggle label="Add watermark" checked={wm.enabled} onChange={(on) => set({ enabled: on })} />
      {wm.enabled && (
        <div className="space-y-3" data-testid="watermark-settings">
          <Segmented
            name="Watermark type"
            value={wm.type}
            onChange={(v) => set({ type: v })}
            options={[
              { value: "text", label: "Text" },
              { value: "image", label: "Logo" },
            ]}
          />

          {wm.type === "text" ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={wm.text}
                maxLength={80}
                onChange={(e) => set({ text: e.target.value })}
                placeholder="© Your name"
                aria-label="Watermark text"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-sm outline-none focus:border-white"
              />
              <input
                type="color"
                value={wm.color}
                onChange={(e) => set({ color: e.target.value })}
                aria-label="Watermark color"
                className="h-10 w-11 shrink-0 cursor-pointer rounded-md border border-line-strong bg-transparent"
              />
            </div>
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/webp,image/jpeg,image/svg+xml"
                className="hidden"
                data-testid="logo-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size <= 5 * 1024 * 1024) setLogo(f);
                  e.target.value = "";
                }}
              />
              {logo ? (
                <div className="flex items-center gap-3 rounded-lg border border-line-strong bg-surface p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo.url} alt="Logo" className="h-10 w-10 rounded bg-checker object-contain" />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">{logo.name}</span>
                  <button type="button" onClick={() => setLogo(null)} aria-label="Remove logo" className="p-1 text-faint hover:text-fg">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong text-sm text-muted hover:border-faint hover:text-fg"
                >
                  <ImagePlus className="h-4 w-4" /> Upload logo (PNG recommended)
                </button>
              )}
            </div>
          )}

          <Slider label="Size" value={wm.size} min={3} max={80} unit="%" onChange={(v) => set({ size: v })} />
          <Slider label="Opacity" value={wm.opacity} min={5} max={100} unit="%" onChange={(v) => set({ opacity: v })} />

          <Toggle label="Repeat across image" checked={wm.tile} onChange={(v) => set({ tile: v })} />

          {!wm.tile && (
            <div className="flex items-start gap-4">
              <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Watermark position">
                {WATERMARK_POSITIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={wm.position === p}
                    aria-label={p.replace("-", " ")}
                    onClick={() => set({ position: p })}
                    className={`h-8 w-8 rounded-md text-sm ${
                      wm.position === p ? "bg-white text-black" : "border border-line-strong text-faint hover:text-fg"
                    }`}
                  >
                    {POS_LABEL[p]}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                <Slider label="Margin" value={wm.margin} min={0} max={20} unit="%" onChange={(v) => set({ margin: v })} />
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

export function RenameSection() {
  const rename = useImageStore((s) => s.settings.rename);
  const updateSettings = useImageStore((s) => s.updateSettings);
  const first = useImageStore((s) => s.items[0]);
  const set = (patch: Partial<typeof rename>) => updateSettings({ rename: { ...rename, ...patch } });

  const example = renderName(rename, {
    originalName: first?.name ?? "photo.jpg",
    index: 0,
    width: 1080,
    height: 1080,
    sizeId: "instagram-square",
  });

  return (
    <Section title="Rename files">
      <input
        type="text"
        value={rename.pattern}
        maxLength={80}
        onChange={(e) => set({ pattern: e.target.value })}
        aria-label="File name pattern"
        placeholder="{name}"
        className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 font-mono text-sm outline-none focus:border-white"
      />
      <div className="flex flex-wrap gap-1.5">
        {RENAME_TOKENS.map((t) => (
          <button
            key={t.token}
            type="button"
            title={t.label}
            onClick={() => set({ pattern: (rename.pattern || "") + t.token })}
            className="h-7 rounded-md border border-line-strong px-2 font-mono text-[11px] text-muted hover:text-fg"
          >
            {t.token}
          </button>
        ))}
        <button
          type="button"
          onClick={() => set({ pattern: "{name}" })}
          className="h-7 rounded-md px-2 text-[11px] text-faint hover:text-fg"
        >
          Reset
        </button>
      </div>
      {/\{n\}/i.test(rename.pattern) && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Start at
            <input
              type="number"
              min={0}
              value={rename.start}
              onChange={(e) => set({ start: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className="mt-1 h-9 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg outline-none focus:border-white"
            />
          </label>
          <label className="text-xs text-muted">
            Digits
            <input
              type="number"
              min={1}
              max={8}
              value={rename.pad}
              onChange={(e) => set({ pad: Math.min(8, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
              className="mt-1 h-9 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg outline-none focus:border-white"
            />
          </label>
        </div>
      )}
      <p className="truncate text-xs text-faint">
        Example: <span className="font-mono text-muted" data-testid="rename-example">{example}.jpg</span>
      </p>
    </Section>
  );
}

export function FiltersSection() {
  const f = useImageStore((s) => s.settings.filters);
  const updateSettings = useImageStore((s) => s.updateSettings);
  const set = (patch: Partial<FilterSettings>) => updateSettings({ filters: { ...f, ...patch } });

  return (
    <Section
      title="Adjust & filters"
      right={
        !isNeutral(f) ? (
          <button type="button" onClick={() => updateSettings({ filters: DEFAULT_FILTERS })} className="text-xs text-faint hover:text-fg">
            Reset
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Filter effect">
        {FILTER_EFFECTS.map((e) => (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={f.effect === e.id}
            onClick={() => set({ effect: e.id })}
            className={`h-8 rounded-md text-xs font-medium ${
              f.effect === e.id ? "bg-white text-black" : "border border-line-strong text-muted hover:text-fg"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <Slider label="Brightness" value={f.brightness} min={-100} max={100} unit="" onChange={(v) => set({ brightness: v })} />
      <Slider label="Contrast" value={f.contrast} min={-100} max={100} unit="" onChange={(v) => set({ contrast: v })} />
      <Slider label="Saturation" value={f.saturation} min={-100} max={100} unit="" onChange={(v) => set({ saturation: v })} />
      <p className="text-xs text-faint">Thumbnails show a quick preview. Exported files use the exact filter.</p>
    </Section>
  );
}
