"use client";

import { Check, ExternalLink, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { Button, ButtonLink } from "@/components/ui/Button";

interface KeyInfo {
  hint: string;
  verified: boolean;
  updatedAt: string;
}

export function ApiKeyManager() {
  const { loggedIn } = useDashboard();
  const [info, setInfo] = useState<KeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    fetch("/api/ai/key", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { key: null }))
      .then((d) => setInfo(d.key))
      .finally(() => setLoading(false));
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line-strong bg-surface-2 p-6 sm:flex-row sm:items-center">
        <p className="text-sm text-muted">Log in to add your fal.ai key. Keys are stored encrypted in your account.</p>
        <ButtonLink href="/login?callbackUrl=/app/api-key" variant="secondary">
          Log in
        </ButtonLink>
      </div>
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save the key");
        return;
      }
      setValue("");
      setSaved(true);
      const r = await fetch("/api/ai/key", { cache: "no-store" }).then((x) => x.json());
      setInfo(r.key);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    await fetch("/api/ai/key", { method: "DELETE" }).catch(() => undefined);
    setInfo(null);
    setBusy(false);
    setConfirmDelete(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5" data-testid="key-status">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <h2 className="text-sm font-medium">fal.ai API key</h2>
        </div>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-faint">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : info ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-mono">{info.hint}</p>
              <p className="mt-0.5 text-xs text-faint">
                {info.verified ? "Verified" : "Saved (could not verify right now)"} · updated{" "}
                {new Date(info.updatedAt).toLocaleDateString()}
              </p>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Remove key?</span>
                <Button size="sm" variant="danger" onClick={onDelete} disabled={busy}>
                  Remove
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-faint">No key added yet.</p>
        )}

        <form onSubmit={onSave} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            placeholder={info ? "Paste a new key to replace" : "Paste your fal.ai key"}
            aria-label="fal.ai API key"
            className="h-10 w-full min-w-0 shrink-0 rounded-lg border border-line-strong bg-surface px-3 font-mono sm:w-auto sm:flex-1 text-sm outline-none placeholder:font-sans placeholder:text-faint focus:border-white"
          />
          <Button type="submit" disabled={busy || value.trim().length < 20}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Saved" : info ? "Replace key" : "Save key"}
          </Button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-bad" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
        <h2 className="flex items-center gap-2 text-sm font-medium text-fg">
          <ShieldCheck className="h-4 w-4" /> How your key is handled
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Encrypted (AES-256) before it is saved. It is never shown again or sent back to your browser.</li>
          <li>Used only on our server, only when you run an AI tool.</li>
          <li>AI usage is billed by fal.ai to your account. PixForge charges nothing.</li>
          <li>Only the image you choose is sent to fal.ai, and its upload expires after 1 hour.</li>
        </ul>
        <p>
          Get a key:{" "}
          <a
            href="https://fal.ai/dashboard/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-fg underline-offset-4 hover:underline"
          >
            fal.ai dashboard → Keys <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </section>

      {info && (
        <Link href="/app/ai" className="inline-flex text-sm text-fg underline-offset-4 hover:underline">
          Open AI Tools →
        </Link>
      )}
    </div>
  );
}
