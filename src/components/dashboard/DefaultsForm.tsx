"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { loadDefaults, resetDefaults, saveDefaults } from "@/lib/defaults-client";
import { detectFormatSupport } from "@/lib/format-support";
import { PRESET_BY_ID } from "@/lib/presets";
import { DEFAULT_SETTINGS, mergeSettings, useImageStore, type Settings } from "@/store/image-store";
import { useDashboard } from "./DashboardContext";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-[220px_1fr] sm:items-center">
      <div>
        <p className="text-sm">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

const select =
  "h-10 w-full max-w-xs rounded-lg border border-line-strong bg-surface px-3 text-sm outline-none focus:border-white";

export function DefaultsForm() {
  const { loggedIn } = useDashboard();
  const [form, setForm] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [webp, setWebp] = useState(true);

  useEffect(() => {
    setWebp(detectFormatSupport().webp);
    loadDefaults(loggedIn).then((d) => {
      if (d) setForm(mergeSettings(d));
      setLoading(false);
    });
  }, [loggedIn]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setState("idle");
  };

  async function onSave() {
    setState("saving");
    setError(null);
    try {
      await saveDefaults(loggedIn, form);
      if (useImageStore.getState().items.length === 0) useImageStore.getState().applyDefaults(form);
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setState("error");
    }
  }

  async function onReset() {
    await resetDefaults(loggedIn);
    setForm(DEFAULT_SETTINGS);
    useImageStore.getState().applyDefaults({});
    setState("saved");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-6 text-sm text-faint">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  const presetNames = form.presetIds.map((id) => PRESET_BY_ID[id]?.name && `${PRESET_BY_ID[id].platform} ${PRESET_BY_ID[id].name}`).filter(Boolean);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {loggedIn
          ? "Saved to your account and used on every device you log in to."
          : "Saved in this browser only. Log in to sync settings across devices."}
      </p>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface" data-testid="defaults-form">
        <Row label="Default size" hint="What the Bulk Editor starts with.">
          <select
            className={select}
            value={form.sizeMode}
            onChange={(e) => set("sizeMode", e.target.value as Settings["sizeMode"])}
            aria-label="Default size mode"
          >
            <option value="custom">Custom size</option>
            <option value="presets">Platform presets</option>
            <option value="original">Original size</option>
          </select>
        </Row>

        {form.sizeMode === "custom" && (
          <Row label="Width × height" hint="Leave one empty to keep the ratio automatically.">
            <div className="flex max-w-xs items-center gap-2">
              {(["width", "height"] as const).map((k) => (
                <input
                  key={k}
                  type="number"
                  min={1}
                  max={16384}
                  placeholder="auto"
                  aria-label={`Default ${k}`}
                  value={form[k] ?? ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    set(k, Number.isFinite(n) && n > 0 ? Math.min(n, 16384) : null);
                  }}
                  className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm outline-none focus:border-white"
                />
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" className="accent-white" checked={form.lockRatio} onChange={(e) => set("lockRatio", e.target.checked)} />
              Keep aspect ratio
            </label>
          </Row>
        )}

        {form.sizeMode === "presets" && (
          <Row label="Default presets" hint="Choose presets in the Bulk Editor, then use “Copy from Bulk Editor”.">
            <p className="text-sm text-muted">{presetNames.length ? presetNames.join(", ") : "None selected"}</p>
          </Row>
        )}

        <Row label="Output format">
          <select
            className={select}
            value={form.format}
            onChange={(e) => set("format", e.target.value as Settings["format"])}
            aria-label="Default output format"
          >
            <option value="original">Same as original</option>
            <option value="jpeg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp" disabled={!webp}>
              WebP{webp ? "" : " (not supported in this browser)"}
            </option>
          </select>
        </Row>

        <Row label="Quality" hint="For JPG and WebP.">
          <div className="flex max-w-xs items-center gap-3">
            <input
              type="range"
              min={10}
              max={100}
              value={form.quality}
              onChange={(e) => set("quality", Number(e.target.value))}
              className="flex-1"
              aria-label="Default quality"
            />
            <span className="w-10 text-right font-mono text-sm">{form.quality}%</span>
          </div>
        </Row>

        <Row label="Background color" hint="Used for JPG transparency and padding.">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.background}
              onChange={(e) => set("background", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-line-strong bg-transparent"
              aria-label="Default background color"
            />
            <span className="font-mono text-xs text-muted">{form.background}</span>
          </div>
        </Row>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onSave} disabled={state === "saving"} data-testid="save-defaults">
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : null}
          {state === "saved" ? "Saved" : "Save defaults"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setForm({ ...useImageStore.getState().settings });
            setState("idle");
          }}
        >
          Copy from Bulk Editor
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Reset to built-in
        </Button>
      </div>
    </div>
  );
}
