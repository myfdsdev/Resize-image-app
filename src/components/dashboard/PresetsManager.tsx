"use client";

import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { customPresetKey } from "@/lib/custom-presets";
import { ratioLabel } from "@/lib/presets";
import { createPreset, removePreset } from "@/lib/presets-client";
import { useImageStore } from "@/store/image-store";
import { useDashboard } from "./DashboardContext";

const input =
  "h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm outline-none placeholder:text-faint focus:border-white";

export function PresetsManager() {
  const { loggedIn } = useDashboard();
  const presets = useImageStore((s) => s.customPresets);
  const setCustomPresets = useImageStore((s) => s.setCustomPresets);
  const updateSettings = useImageStore((s) => s.updateSettings);
  const router = useRouter();
  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (!name.trim()) return setError("Give the preset a name");
    if (!(w > 0 && w <= 16384 && h > 0 && h <= 16384)) return setError("Width and height must be between 1 and 16384");
    setBusy(true);
    try {
      const p = await createPreset(loggedIn, { name: name.trim(), width: w, height: h });
      setCustomPresets([...useImageStore.getState().customPresets, p]);
      setName("");
      setWidth("");
      setHeight("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preset");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await removePreset(loggedIn, id);
      setCustomPresets(useImageStore.getState().customPresets.filter((p) => p.id !== id));
    } catch {
      setError("Could not delete preset");
    }
  }

  function openInEditor(id: string) {
    const s = useImageStore.getState().settings;
    const key = customPresetKey(id);
    updateSettings({ sizeMode: "presets", presetIds: s.presetIds.includes(key) ? s.presetIds : [...s.presetIds, key] });
    router.push("/app");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        {loggedIn ? "Saved to your account." : "Saved in this browser. Log in to keep presets on every device."}
      </p>

      <form onSubmit={onAdd} className="rounded-2xl border border-line bg-surface p-5" data-testid="preset-form">
        <h2 className="text-sm font-medium">New preset</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_120px_auto] sm:items-end">
          <label className="block text-xs text-muted">
            Name
            <input className={`${input} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Shop product" />
          </label>
          <label className="block text-xs text-muted">
            Width (px)
            <input className={`${input} mt-1.5`} type="number" min={1} max={16384} value={width} onChange={(e) => setWidth(e.target.value)} placeholder="1200" />
          </label>
          <label className="block text-xs text-muted">
            Height (px)
            <input className={`${input} mt-1.5`} type="number" min={1} max={16384} value={height} onChange={(e) => setHeight(e.target.value)} placeholder="1200" />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-bad" role="alert">{error}</p>}
      </form>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-medium">My presets ({presets.length})</h2>
        </div>
        {presets.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-faint">No presets yet. Add your first one above.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="preset-list">
            {presets.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{p.name}</p>
                  <p className="font-mono text-xs text-faint">
                    {p.width}×{p.height} · {ratioLabel(p.width, p.height)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openInEditor(p.id)}>
                  Use <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(p.id)} aria-label={`Delete ${p.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
