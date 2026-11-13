"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section, Segmented } from "@/components/editor/SettingsPanel";
import { Button } from "@/components/ui/Button";
import { DropZone, type Rejection } from "@/components/upload/DropZone";
import { triggerDownload } from "@/lib/download";
import { formatBytes } from "@/lib/filenames";
import { loadEditedImage } from "@/lib/item-bitmap";
import { pdfPageLayout, type PdfMargin, type PdfOptions, type PdfOrientation, type PdfPageSize } from "@/lib/pdf-layout";
import { useImageStore } from "@/store/image-store";

const QUALITY = {
  high: { maxSide: 3000, q: 0.9, label: "High" },
  medium: { maxSide: 2000, q: 0.82, label: "Medium" },
  small: { maxSide: 1400, q: 0.72, label: "Small file" },
} as const;
type QualityId = keyof typeof QUALITY;

export function PdfStudio() {
  const items = useImageStore((s) => s.items);
  const ready = useMemo(() => items.filter((i) => !i.converting && !i.thumbFailed), [items]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<PdfPageSize>("a4");
  const [orientation, setOrientation] = useState<PdfOrientation>("auto");
  const [margin, setMargin] = useState<PdfMargin>("small");
  const [quality, setQuality] = useState<QualityId>("medium");
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<{ size: number; pages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejections, setRejections] = useState<Rejection[]>([]);

  const selected = ready.filter((r) => !excluded.has(r.id));

  async function makePdf() {
    setError(null);
    setDone(null);
    const opts: PdfOptions = { pageSize, orientation, margin };
    const { maxSide, q } = QUALITY[quality];
    try {
      setProgress("Loading PDF tools…");
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      doc.setTitle("Images");
      doc.setProducer("PixForge");
      doc.setCreator("PixForge");
      for (let i = 0; i < selected.length; i++) {
        setProgress(`Adding image ${i + 1} of ${selected.length}…`);
        const it = selected[i];
        const img = await loadEditedImage(it.file, it.edits, maxSide);
        // JPEG keeps the PDF small; white behind any transparency.
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img.src, 0, 0);
        const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", q));
        const jpg = await doc.embedJpg(await blob.arrayBuffer());
        const l = pdfPageLayout(img.width, img.height, opts);
        const page = doc.addPage([l.pageW, l.pageH]);
        // PDF origin is bottom-left.
        page.drawImage(jpg, { x: l.x, y: l.pageH - l.y - l.h, width: l.w, height: l.h });
      }
      setProgress("Saving PDF…");
      const bytes = await doc.save();
      const file = new Blob([bytes as BlobPart], { type: "application/pdf" });
      triggerDownload(file, `pixforge_${selected.length}-images.pdf`);
      setDone({ size: file.size, pages: selected.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the PDF");
    } finally {
      setProgress(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader title="Images to PDF" description="Turn photos into one PDF — right in your browser." />
        {rejections.length > 0 && <p className="text-sm text-bad">{rejections.map((r) => `${r.name}: ${r.reason}`).join(" · ")}</p>}
        <DropZone onRejected={setRejections} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:py-6">
      <PageHeader title="Images to PDF" description="One image per page, in the order shown. Nothing is uploaded." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {selected.length} of {ready.length} images selected
            </span>
            <div className="flex gap-2">
              <button type="button" className="text-xs text-faint hover:text-fg" onClick={() => setExcluded(new Set())}>
                Select all
              </button>
              <button type="button" className="text-xs text-faint hover:text-fg" onClick={() => setExcluded(new Set(ready.map((r) => r.id)))}>
                Select none
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6" data-testid="pdf-pages">
            {ready.map((it) => {
              const on = !excluded.has(it.id);
              const page = selected.findIndex((s) => s.id === it.id) + 1;
              return (
                <button
                  key={it.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setExcluded((ex) => {
                      const n = new Set(ex);
                      if (n.has(it.id)) n.delete(it.id);
                      else n.add(it.id);
                      return n;
                    })
                  }
                  className={`group relative overflow-hidden rounded-lg border bg-white p-1.5 shadow ${on ? "border-white" : "border-line opacity-40"}`}
                  style={{ aspectRatio: "1 / 1.414" }}
                >
                  {it.thumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumbUrl} alt={it.name} className="h-full w-full object-contain" />
                  )}
                  {on && (
                    <span className="absolute bottom-1 right-1 rounded bg-black px-1.5 text-[10px] font-medium text-white">p.{page}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <Section title="Page">
            <Segmented
              name="Page size"
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: "a4", label: "A4" },
                { value: "letter", label: "Letter" },
                { value: "fit", label: "Fit image" },
              ]}
            />
            {pageSize !== "fit" && (
              <Segmented
                name="Orientation"
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
              />
            )}
            <Segmented
              name="Margin"
              value={margin}
              onChange={setMargin}
              options={[
                { value: "none", label: "No margin" },
                { value: "small", label: "Small" },
                { value: "normal", label: "Normal" },
              ]}
            />
          </Section>
          <Section title="Quality">
            <Segmented
              name="PDF quality"
              value={quality}
              onChange={setQuality}
              options={(Object.keys(QUALITY) as QualityId[]).map((k) => ({ value: k, label: QUALITY[k].label }))}
            />
          </Section>
          <Section title="Create">
            <Button className="w-full" disabled={!!progress || selected.length === 0} onClick={makePdf} data-testid="pdf-create">
              {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {progress ?? `Create PDF (${selected.length} page${selected.length === 1 ? "" : "s"})`}
            </Button>
            {done && (
              <p className="text-xs text-ok" data-testid="pdf-done">
                PDF ready · {done.pages} pages · {formatBytes(done.size)}
              </p>
            )}
            {error && <p className="text-xs text-bad">{error}</p>}
          </Section>
        </aside>
      </div>
    </div>
  );
}
