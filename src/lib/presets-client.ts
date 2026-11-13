"use client";

import { customPresetSchema, LOCAL_PRESETS_KEY, MAX_CUSTOM_PRESETS, type CustomPreset } from "./custom-presets";

function readLocal(): CustomPreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_PRESETS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((p) => customPresetSchema.safeParse(p).success) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: CustomPreset[]) {
  try {
    localStorage.setItem(LOCAL_PRESETS_KEY, JSON.stringify(list));
  } catch {
    throw new Error("This browser blocked saving presets");
  }
}

/** Account presets when signed in, otherwise this browser's presets. */
export async function loadPresets(loggedIn: boolean): Promise<CustomPreset[]> {
  if (loggedIn) {
    try {
      const res = await fetch("/api/presets", { cache: "no-store" });
      if (res.ok) return (await res.json()).presets ?? [];
    } catch {
      /* fall back to local */
    }
  }
  return readLocal();
}

export async function createPreset(
  loggedIn: boolean,
  input: { name: string; width: number; height: number },
): Promise<CustomPreset> {
  if (loggedIn) {
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not save preset");
    return data.preset;
  }
  const list = readLocal();
  if (list.length >= MAX_CUSTOM_PRESETS) throw new Error(`You can save up to ${MAX_CUSTOM_PRESETS} presets`);
  const preset = { id: `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...input };
  writeLocal([...list, preset]);
  return preset;
}

export async function removePreset(loggedIn: boolean, id: string): Promise<void> {
  if (loggedIn) {
    const res = await fetch(`/api/presets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Could not delete preset");
    return;
  }
  writeLocal(readLocal().filter((p) => p.id !== id));
}
