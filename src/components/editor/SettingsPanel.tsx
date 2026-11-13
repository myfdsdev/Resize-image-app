"use client";

import { Check, ChevronDown, Link2, Link2Off, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { FiltersSection, RenameSection, TargetSizeSection, WatermarkSection } from "./ExtraSettings";
import { saveDefaults } from "@/lib/defaults-client";
import { detectFormatSupport } from "@/lib/format-support";
import type { OutputFormat } from "@/lib/image-processing/types";
import { customPresetKey } from "@/lib/custom-presets";
import { PLATFORMS, presetsFor, ratioLabel } from "@/lib/presets";
import { useImageStore, type Settings } from "@/store/image-store";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabledValues = [],
  name,
}: {
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  disabledValues?: T[];
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-line bg-surface p-1">
      {options.map((o) => {
        const disabled = disabledValues.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`h-8 rounded-md px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
              value === o.value ? "bg-white text-black" : "text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-line px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-faint">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      <div className="flex h-10 items-center rounded-lg border border-line-strong bg-surface focus-within:border-white">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={16384}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(Number.isFinite(n) && n > 0 ? Math.min(n, 16384) : null);
          }}
          className="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none [appearance:textfield] placeholder:text-faint"
        />
        <span className="pr-3 text-xs text-faint">px</span>
      </div>
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-white" : "bg-line-strong"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
            checked ? "left-[18px] bg-black" : "left-0.5 bg-zinc-400"
          }`}
        />
      </button>
    </label>
  );
}

export function SettingsPanel() {
  const settings = useImageStore((s) => s.settings);
  const update = useImageStore((s) => s.updateSettings);
  const reset = useImageStore((s) => s.resetSettings);
  const firstImage = useImageStore((s) => s.items[0]);
  const [webp, setWebp] = useState(true);
  const [openPlatform, setOpenPlatform] = useState<string | null>("instagram");
  const { loggedIn } = useDashboard();
  const [savedDefault, setSavedDefault] = useState<"idle" | "saved" | "error">("idle");

  const saveAsDefault = async () => {
    try {
      await saveDefaults(loggedIn, settings);
      setSavedDefault("saved");
    } catch {
      setSavedDefault("error");
    }
    setTimeout(() => setSavedDefault("idle"), 2000);
  };

  useEffect(() => {
    setWebp(detectFormatSupport().webp);
  }, []);

  useEffect(() => {
    if (!webp && settings.format === "webp") update({ format: "original" });
  }, [webp, settings.format, update]);

  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => update({ [k]: v } as Partial<Settings>);

  const pngOut =
    settings.format === "png" ||
    (settings.format === "original" && firstImage?.mime === "image/png");
  const jpegOut = settings.format === "jpeg";
  const hasPadding =
    (settings.sizeMode === "presets" && settings.presetFit === "contain") ||
    (settings.sizeMode === "custom" && !settings.lockRatio && settings.customFit === "contain");

  const customPresets = useImageStore((s) => s.customPresets);
  const myCount = customPresets.filter((c) => settings.presetIds.includes(customPresetKey(c.id))).length;

  const togglePreset = (id: string) => {
    const has = settings.presetIds.includes(id);
    update({ presetIds: has ? settings.presetIds.filter((x) => x !== id) : [...settings.presetIds, id] });
  };

  return (
    <div className="flex flex-col" data-testid="settings-panel">
      <Section
        title="Size"
        right={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveAsDefault}
              title={loggedIn ? "Save these settings to your account" : "Save these settings in this browser"}
              className="flex items-center gap-1 text-xs text-faint hover:text-fg"
            >
              {savedDefault === "saved" ? <Check className="h-3 w-3 text-ok" /> : <Save className="h-3 w-3" />}
              {savedDefault === "saved" ? "Saved" : savedDefault === "error" ? "Failed" : "Save as default"}
            </button>
            <button type="button" onClick={reset} className="flex items-center gap-1 text-xs text-faint hover:text-fg">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        }
      >
        <Segmented
          name="Size mode"
          value={settings.sizeMode}
          onChange={set("sizeMode")}
          options={[
            { value: "presets", label: "Presets" },
            { value: "custom", label: "Custom" },
            { value: "original", label: "Original" },
          ]}
        />

        {settings.sizeMode === "custom" && (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <NumberField
                label="Width"
                value={settings.width}
                placeholder="auto"
                onChange={set("width")}
              />
              <button
                type="button"
                onClick={() => update({ lockRatio: !settings.lockRatio })}
                aria-pressed={settings.lockRatio}
                title={settings.lockRatio ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  settings.lockRatio ? "border-white bg-white text-black" : "border-line-strong text-muted"
                }`}
              >
                {settings.lockRatio ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
              </button>
              <NumberField
                label="Height"
                value={settings.height}
                placeholder="auto"
                onChange={set("height")}
              />
            </div>
            <p className="text-xs text-faint">
              {settings.lockRatio
                ? "Ratio locked: each image fits inside this box without distortion. Leave one side empty for auto."
                : "Exact size: choose how the image fills the box."}
            </p>
            {!settings.lockRatio && (
              <Segmented
                name="Fit"
                value={settings.customFit}
                onChange={set("customFit")}
                options={[
                  { value: "cover", label: "Fill & crop", title: "Fill the box, crop the overflow" },
                  { value: "contain", label: "Fit & pad", title: "Show the whole image, pad the rest" },
                  { value: "stretch", label: "Stretch", title: "Ignore ratio (distorts)" },
                ]}
              />
            )}
            <Toggle label="Enlarge smaller images" checked={settings.allowUpscale} onChange={set("allowUpscale")} />
          </div>
        )}

        {settings.sizeMode === "presets" && (
          <div className="space-y-3">
            <Segmented
              name="Preset fit"
              value={settings.presetFit}
              onChange={set("presetFit")}
              options={[
                { value: "cover", label: "Fill & crop" },
                { value: "contain", label: "Fit & pad" },
              ]}
            />
            <p className="text-xs text-muted">
              {settings.presetIds.length} selected · each image is exported in every selected size
            </p>
            <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              <div>
                <button
                  type="button"
                  onClick={() => setOpenPlatform(openPlatform === "mine" ? null : "mine")}
                  aria-expanded={openPlatform === "mine"}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-surface-3"
                >
                  <span>My presets</span>
                  <span className="flex items-center gap-2">
                    {myCount > 0 && (
                      <span className="rounded-full bg-white px-1.5 text-[11px] font-medium text-black">{myCount}</span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-faint transition-transform ${openPlatform === "mine" ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {openPlatform === "mine" && (
                  <ul className="space-y-0.5 bg-surface px-1.5 pb-2">
                    {customPresets.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-3">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-white"
                            checked={settings.presetIds.includes(customPresetKey(c.id))}
                            onChange={() => togglePreset(customPresetKey(c.id))}
                          />
                          <span className="flex-1 truncate text-muted">{c.name}</span>
                          <span className="font-mono text-[11px] text-faint">
                            {c.width}×{c.height}
                          </span>
                        </label>
                      </li>
                    ))}
                    <li className="px-2 pt-1">
                      <Link href="/app/presets" className="text-xs text-faint underline-offset-4 hover:text-fg hover:underline">
                        {customPresets.length ? "Manage my presets" : "Create your own presets"}
                      </Link>
                    </li>
                  </ul>
                )}
              </div>
              {PLATFORMS.map((pl) => {
                const list = presetsFor(pl.id);
                const count = list.filter((p) => settings.presetIds.includes(p.id)).length;
                const open = openPlatform === pl.id;
                return (
                  <div key={pl.id}>
                    <button
                      type="button"
                      onClick={() => setOpenPlatform(open ? null : pl.id)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-surface-3"
                    >
                      <span>{pl.name}</span>
                      <span className="flex items-center gap-2">
                        {count > 0 && (
                          <span className="rounded-full bg-white px-1.5 text-[11px] font-medium text-black">{count}</span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-faint transition-transform ${open ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    {open && (
                      <ul className="space-y-0.5 bg-surface px-1.5 pb-2">
                        {list.map((p) => (
                          <li key={p.id}>
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-3">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 accent-white"
                                checked={settings.presetIds.includes(p.id)}
                                onChange={() => togglePreset(p.id)}
                              />
                              <span className="flex-1 text-muted">{p.name}</span>
                              <span className="font-mono text-[11px] text-faint">
                                {p.width}×{p.height} · {ratioLabel(p.width, p.height)}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            {settings.presetIds.length > 0 && (
              <button
                type="button"
                onClick={() => update({ presetIds: [] })}
                className="text-xs text-faint hover:text-fg"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {settings.sizeMode === "original" && (
          <p className="text-xs text-faint">Keep each image&apos;s original dimensions — useful for converting or compressing only.</p>
        )}
      </Section>

      <Section title="Format">
        <Segmented<OutputFormat>
          name="Output format"
          value={settings.format}
          onChange={set("format")}
          disabledValues={webp ? [] : ["webp"]}
          options={[
            { value: "original", label: "Same" },
            { value: "jpeg", label: "JPG" },
            { value: "png", label: "PNG" },
            { value: "webp", label: "WebP", title: webp ? undefined : "Your browser cannot export WebP" },
          ]}
        />
        {!webp && <p className="text-xs text-warn">WebP export isn&apos;t supported by this browser.</p>}

        <div className={pngOut ? "opacity-40" : ""}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted">Quality</span>
            <span className="font-mono text-fg">{settings.quality}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={1}
            value={settings.quality}
            disabled={pngOut}
            onChange={(e) => update({ quality: Number(e.target.value) })}
            className="w-full"
            aria-label="Quality"
          />
          <p className="mt-1 text-xs text-faint">
            {pngOut ? "PNG is lossless — quality does not apply." : "Lower quality = smaller files. 75–85% is a good balance."}
          </p>
        </div>
      </Section>

      <Section title="Background">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings.background}
            onChange={(e) => update({ background: e.target.value })}
            disabled={settings.transparentPadding && !jpegOut}
            className="h-9 w-12 cursor-pointer rounded-md border border-line-strong bg-transparent disabled:opacity-40"
            aria-label="Background color"
          />
          <span className="font-mono text-xs text-muted">{settings.background}</span>
        </div>
        {!jpegOut && (
          <Toggle
            label="Transparent padding (PNG/WebP)"
            checked={settings.transparentPadding}
            onChange={set("transparentPadding")}
          />
        )}
        <p className="text-xs text-faint">
          {jpegOut
            ? "JPG has no transparency — transparent areas are filled with this color."
            : hasPadding
              ? "Used for the padding around fitted images."
              : "Used when converting transparent images to JPG, or for padding."}
        </p>
      </Section>

      <FiltersSection />
      <TargetSizeSection />
      <WatermarkSection />
      <RenameSection />
    </div>
  );
}
