"use client";

import { defaultsSchema, LOCAL_DEFAULTS_KEY, type BatchStats, type SavedDefaults } from "./settings-schema";

function readLocal(): SavedDefaults | null {
  try {
    const raw = localStorage.getItem(LOCAL_DEFAULTS_KEY);
    if (!raw) return null;
    const parsed = defaultsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Account defaults when signed in, otherwise this browser's defaults. */
export async function loadDefaults(loggedIn: boolean): Promise<SavedDefaults | null> {
  if (loggedIn) {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const parsed = defaultsSchema.safeParse(data.defaults ?? {});
        if (parsed.success && data.defaults) return parsed.data;
        return null;
      }
    } catch {
      /* fall back to local */
    }
  }
  return readLocal();
}

export async function saveDefaults(loggedIn: boolean, defaults: SavedDefaults): Promise<void> {
  const clean = defaultsSchema.parse(defaults);
  if (loggedIn) {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaults: clean }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save");
    return;
  }
  try {
    localStorage.setItem(LOCAL_DEFAULTS_KEY, JSON.stringify(clean));
  } catch {
    throw new Error("This browser blocked saving settings");
  }
}

export async function resetDefaults(loggedIn: boolean): Promise<void> {
  if (loggedIn) await fetch("/api/settings", { method: "DELETE" });
  try {
    localStorage.removeItem(LOCAL_DEFAULTS_KEY);
  } catch {
    /* ignore */
  }
}

export function reportBatch(stats: BatchStats) {
  // Fire and forget: stats are a nice-to-have and must never block downloads.
  fetch("/api/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stats),
    keepalive: true,
  }).catch(() => undefined);
}
