"use client";

import {
  Brush,
  Download,
  Eraser,
  Expand,
  ImagePlus,
  KeyRound,
  Loader2,
  LogIn,
  MessageSquareText,
  Plus,
  Repeat,
  Sparkles,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BeforeAfter } from "@/components/preview/BeforeAfter";
import { Button, ButtonLink } from "@/components/ui/Button";
import { addFilesToWorkspace } from "@/components/upload/DropZone";
import { fetchAiResult, prepareForAi, renderMask, runAiJob, type AiPhase, type MaskStroke } from "@/lib/ai-client";
import { AI_TOOLS, AI_TOOL_IDS, EXPAND_RATIOS, type AiParams, type AiToolId, type ExpandRatio } from "@/lib/ai-tools";
import { triggerDownload } from "@/lib/download";
import { baseName, formatBytes } from "@/lib/filenames";
import { useImageStore } from "@/store/image-store";

const CONSENT_KEY = "pixforge.ai.consent.v1";
const TOOL_ICON: Record<AiToolId, typeof Wand2> = {
  "remove-bg": Wand2,
  erase: Eraser,
  expand: Expand,
  edit: MessageSquareText,
  upscale: Sparkles,
};
const SUFFIX: Record<AiToolId, string> = { "remove-bg": "nobg", erase: "erased", expand: "extended", edit: "edited", upscale: "2x" };
const PROMPT_EXAMPLES = [
  "Make the background pure white",
  "Remove the text from the image",
  "Change the season to winter",
  "Turn this into a watercolor painting",
];

interface Source {
  id: string;
  name: string;
  file: Blob;
  url: string;
}

interface Result {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  tool: AiToolId;
}

export function AiStudio() {
  const { loggedIn } = useDashboard();
  const items = useImageStore((s) => s.items);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [tool, setTool] = useState<AiToolId>("remove-bg");
  const [source, setSource] = useState<Source | null>(null);
  const [strokes, setStrokes] = useState<MaskStroke[]>([]);
  const [brush, setBrush] = useState(0.05);
  const [ratio, setRatio] = useState<ExpandRatio>("1:1");
  const [prompt, setPrompt] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<AiPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [added, setAdded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ownUrls = useRef<string[]>([]);

  useEffect(() => {
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/ai/key", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { key: null }))
      .then((d) => setHasKey(!!d.key))
      .catch(() => setHasKey(false));
  }, [loggedIn]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      ownUrls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  const ready = useMemo(() => items.filter((i) => !i.converting && !i.thumbFailed && i.previewUrl), [items]);

  const pick = (s: Source) => {
    setSource(s);
    setStrokes([]);
    setResult(null);
    setError(null);
    setAdded(false);
  };

  const ownUrl = (blob: Blob) => {
    const u = URL.createObjectURL(blob);
    ownUrls.current.push(u);
    return u;
  };

  const meta = AI_TOOLS[tool];
  const running = phase !== null;
  const paramsReady =
    (!meta.needsMask || strokes.length > 0) && (tool !== "edit" || prompt.trim().length >= 3);
  const canRun = !!source && consent && !running && paramsReady;

  async function run() {
    if (!source) return;
    setError(null);
    setResult(null);
    setAdded(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const prepared = await prepareForAi(source.file, meta.maxSide, meta.sendAs);
      const mask = meta.needsMask ? await renderMask(strokes, prepared.width, prepared.height) : undefined;
      const params: AiParams =
        tool === "expand"
          ? { ratio, imageWidth: prepared.width, imageHeight: prepared.height, ...(prompt.trim() ? { prompt: prompt.trim() } : {}) }
          : tool === "edit"
            ? { prompt: prompt.trim() }
            : {};
      const out = await runAiJob(tool, prepared.blob, mask, setPhase, ctrl.signal, params);
      const blob = await fetchAiResult(out.url);
      const bmp = await createImageBitmap(blob);
      const res = { blob, url: ownUrl(blob), width: bmp.width, height: bmp.height, tool };
      bmp.close();
      setResult(res);
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "NO_KEY") setHasKey(false);
      if (err.name !== "AbortError" && err.message !== "Cancelled") setError(err.message || "Something went wrong");
    } finally {
      setPhase(null);
      abortRef.current = null;
    }
  }

  const resultName = () => {
    const ext = result?.blob.type === "image/png" ? "png" : result?.blob.type === "image/webp" ? "webp" : "jpg";
    return `${baseName(source?.name ?? "image")}_${SUFFIX[result?.tool ?? tool]}.${ext}`;
  };

  // ---------- Gates ----------
  if (!loggedIn) {
    return (
      <Shell>
        <Gate
          icon={LogIn}
          text="Log in to use AI tools with your own fal.ai key."
          action={<ButtonLink href="/login?callbackUrl=/app/ai">Log in</ButtonLink>}
        />
      </Shell>
    );
  }
  if (hasKey === null) {
    return (
      <Shell>
        <p className="flex items-center gap-2 text-sm text-faint">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      </Shell>
    );
  }
  if (!hasKey) {
    return (
      <Shell>
        <Gate
          icon={KeyRound}
          text="Add your fal.ai API key to unlock AI tools. You pay fal.ai directly for what you use."
          action={<ButtonLink href="/app/api-key">Add API key</ButtonLink>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Tool picker */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="AI tool">
        {AI_TOOL_IDS.map((id) => {
          const t = AI_TOOLS[id];
          const Icon = TOOL_ICON[id];
          const on = tool === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={running}
              onClick={() => {
                if (id !== tool && (id === "edit" || tool === "edit")) setPrompt("");
                setTool(id);
                setResult(null);
                setError(null);
              }}
              className={`rounded-2xl border p-4 text-left transition-colors disabled:opacity-50 ${
                on ? "border-white bg-surface-3" : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <Icon className="h-5 w-5" />
              <p className="mt-3 text-sm font-medium">{t.name}</p>
              <p className="mt-1 text-xs text-muted">{t.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Canvas */}
        <div className="min-w-0 space-y-3">
          {!source ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line-strong bg-surface p-6 text-center">
              <ImagePlus className="h-6 w-6 text-muted" />
              <p className="mt-3 text-sm">Choose an image from your workspace below, or upload one.</p>
              <Button className="mt-4" onClick={() => fileRef.current?.click()}>
                Upload image
              </Button>
            </div>
          ) : result ? (
            <BeforeAfter
              key={result.url}
              before={source.url}
              after={result.url}
              ratio={result.width / result.height}
              beforeLabel="Before"
              afterLabel={`After · ${result.width}×${result.height}`}
            />
          ) : (
            <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl border border-line bg-checker">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source.url} alt={source.name} className="block max-h-[60vh] max-w-full select-none" draggable={false} />
              {meta.needsMask && <MaskLayer strokes={strokes} onChange={setStrokes} brush={brush} disabled={running} />}
              {running && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-sm">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {phase === "uploading" ? "Uploading…" : phase === "queued" ? "Waiting in queue…" : "AI is working…"}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-bad" role="alert">
              {error}
            </p>
          )}

          {result && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => triggerDownload(result.blob, resultName())}>
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={added}
                onClick={() => {
                  const file = new File([result.blob], resultName(), { type: result.blob.type || "image/png" });
                  addFilesToWorkspace([file]);
                  setAdded(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> {added ? "Added to Bulk Editor" : "Add to Bulk Editor"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => pick({ id: `result-${Date.now()}`, name: resultName(), file: result.blob, url: result.url })}
              >
                <Repeat className="h-3.5 w-3.5" /> Use result as input
              </Button>
              <span className="text-xs text-faint">{formatBytes(result.blob.size)}</span>
            </div>
          )}

          {/* Source picker */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted">Workspace images</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-faint hover:text-fg">
                + Upload
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.heic,.heif"
              className="hidden"
              data-testid="ai-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const rejected = addFilesToWorkspace([f]);
                if (rejected.length) setError(`${rejected[0].name}: ${rejected[0].reason}`);
                else if (!/hei[cf]/i.test(f.type + f.name)) pick({ id: `up-${Date.now()}`, name: f.name, file: f, url: ownUrl(f) });
              }}
            />
            {ready.length === 0 ? (
              <p className="text-xs text-faint">No images yet.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {ready.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    disabled={running}
                    onClick={() => pick({ id: it.id, name: it.name, file: it.file, url: it.previewUrl })}
                    aria-label={`Use ${it.name}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-checker ${
                      source?.id === it.id ? "border-white" : "border-line hover:border-line-strong"
                    }`}
                  >
                    {it.thumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.thumbUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <aside className="space-y-4">
          {meta.needsMask && source && !result && (
            <section className="space-y-3 rounded-2xl border border-line bg-surface-2 p-4">
              <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-faint">
                <Brush className="h-3.5 w-3.5" /> Brush
              </h3>
              <input
                type="range"
                min={1}
                max={20}
                value={Math.round(brush * 100)}
                onChange={(e) => setBrush(Number(e.target.value) / 100)}
                aria-label="Brush size"
                className="w-full"
              />
              <p className="text-xs text-muted">Paint over everything you want removed.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={!strokes.length} onClick={() => setStrokes((s) => s.slice(0, -1))}>
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </Button>
                <Button size="sm" variant="ghost" disabled={!strokes.length} onClick={() => setStrokes([])}>
                  Clear
                </Button>
              </div>
            </section>
          )}

          {tool === "expand" && (
            <section className="space-y-3 rounded-2xl border border-line bg-surface-2 p-4" data-testid="expand-options">
              <h3 className="text-xs font-medium uppercase tracking-wider text-faint">Extend to</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {EXPAND_RATIOS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRatio(r)}
                    aria-pressed={ratio === r}
                    className={`h-8 rounded-md text-xs font-medium ${
                      ratio === r ? "bg-white text-black" : "border border-line-strong text-muted hover:text-fg"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={prompt}
                maxLength={200}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Optional: describe the new background"
                aria-label="Background description"
                className="h-9 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm outline-none placeholder:text-faint focus:border-white"
              />
              <p className="text-xs text-faint">The whole image is kept; only the empty area is filled in.</p>
            </section>
          )}

          {tool === "edit" && (
            <section className="space-y-3 rounded-2xl border border-line bg-surface-2 p-4" data-testid="edit-options">
              <h3 className="text-xs font-medium uppercase tracking-wider text-faint">What should change?</h3>
              <textarea
                value={prompt}
                maxLength={500}
                rows={4}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Make the background pure white"
                aria-label="Edit prompt"
                className="w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-white"
              />
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="rounded-md border border-line-strong px-2 py-1 text-left text-[11px] text-muted hover:text-fg"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3 rounded-2xl border border-line bg-surface-2 p-4">
            <p className="text-sm font-medium">{meta.name}</p>
            <p className="text-xs text-muted">Cost on your fal.ai account: {meta.costHint}.</p>
            <label className="flex items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                className="mt-0.5 accent-white"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  try {
                    localStorage.setItem(CONSENT_KEY, e.target.checked ? "1" : "0");
                  } catch {
                    /* ignore */
                  }
                }}
                data-testid="ai-consent"
              />
              I understand this image will be sent to fal.ai and billed to my key.
            </label>
            {running ? (
              <Button variant="secondary" className="w-full" onClick={() => abortRef.current?.abort()}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            ) : (
              <Button className="w-full" disabled={!canRun} onClick={run} data-testid="ai-run">
                <Wand2 className="h-4 w-4" /> {result ? "Run again" : "Run"}
              </Button>
            )}
            {!source && <p className="text-xs text-faint">Choose an image first.</p>}
            {source && meta.needsMask && strokes.length === 0 && !result && (
              <p className="text-xs text-faint">Paint the area to remove.</p>
            )}
            {source && tool === "edit" && prompt.trim().length < 3 && (
              <p className="text-xs text-faint">Describe the change first.</p>
            )}
            {result && (
              <button type="button" onClick={() => setResult(null)} className="text-xs text-faint hover:text-fg">
                Back to editing
              </button>
            )}
          </section>

          <Link href="/app/api-key" className="block text-xs text-faint hover:text-fg">
            Manage API key →
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function MaskLayer(props: { strokes: MaskStroke[]; onChange: (s: MaskStroke[]) => void; brush: number; disabled: boolean }) {
  // Lazy import keeps the painter out of the initial bundle for other tools.
  const [Painter, setPainter] = useState<null | typeof import("./MaskPainter").MaskPainter>(null);
  useEffect(() => {
    import("./MaskPainter").then((m) => setPainter(() => m.MaskPainter));
  }, []);
  if (!Painter) return null;
  return (
    <div className={props.disabled ? "pointer-events-none" : ""}>
      <Painter strokes={props.strokes} onChange={props.onChange} brush={props.brush} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="AI Tools"
        description="Remove backgrounds, erase objects, extend, edit with words and upscale — powered by your own fal.ai key."
      />
      {children}
    </div>
  );
}

function Gate({ icon: Icon, text, action }: { icon: typeof KeyRound; text: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line-strong bg-surface-2 p-6 sm:flex-row sm:items-center">
      <p className="flex items-center gap-3 text-sm text-muted">
        <Icon className="h-5 w-5 shrink-0 text-fg" /> {text}
      </p>
      {action}
    </div>
  );
}
