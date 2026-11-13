"use client";

import type { AiToolId } from "./ai-tools";
import { decodeImage } from "./image-processing/pipeline";

const MAX_UPLOAD = 3.8 * 1024 * 1024;

/** Downscale (and re-encode) an image so it is safe and cheap to send to the AI. */
export async function prepareForAi(
  file: Blob,
  maxSide: number,
  mime: "image/png" | "image/jpeg",
): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await decodeImage(file);
  try {
    let scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error("Could not prepare image"))), mime, 0.92),
      );
      if (blob.size <= MAX_UPLOAD) return { blob, width: w, height: h };
      scale *= 0.8;
    }
    throw new Error("Image is too large to send to the AI");
  } finally {
    bmp.close();
  }
}

export type AiPhase = "uploading" | "queued" | "running";

/** Submit a job and poll until it finishes. Returns the result URL. */
export async function runAiJob(
  tool: AiToolId,
  image: Blob,
  mask: Blob | undefined,
  onPhase: (p: AiPhase) => void,
  signal?: AbortSignal,
): Promise<{ url: string; width?: number; height?: number }> {
  onPhase("uploading");
  const form = new FormData();
  form.set("tool", tool);
  form.set("image", image, image.type === "image/png" ? "image.png" : "image.jpg");
  if (mask) form.set("mask", mask, "mask.png");
  const res = await fetch("/api/ai/submit", { method: "POST", body: form, signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Could not start the AI job"), { code: data.code });

  const started = Date.now();
  let delay = 1200;
  while (Date.now() - started < 5 * 60_000) {
    if (signal?.aborted) throw new Error("Cancelled");
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(4000, delay * 1.3);
    const s = await fetch(`/api/ai/status?tool=${tool}&id=${encodeURIComponent(data.requestId)}`, { signal, cache: "no-store" });
    const st = await s.json().catch(() => ({ status: "error", error: "Bad response" }));
    if (st.status === "queued") onPhase("queued");
    else if (st.status === "running") onPhase("running");
    else if (st.status === "done") return { url: st.url, width: st.width, height: st.height };
    else throw new Error(st.error || "The AI request failed");
  }
  throw new Error("The AI took too long. Please try again.");
}

/** Download the result. Falls back to our server if the CDN blocks the browser (CORS). */
export async function fetchAiResult(url: string): Promise<Blob> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) return await r.blob();
  } catch {
    /* try the proxy */
  }
  const r = await fetch(`/api/ai/fetch?url=${encodeURIComponent(url)}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Could not download the AI result");
  return r.blob();
}

/** Stroke painted by the user, in fractions of the image size. */
export interface MaskStroke {
  size: number;
  points: [number, number][];
}

/** Render strokes as a black/white mask (white = area to erase). */
export async function renderMask(strokes: MaskStroke[], width: number, height: number): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  drawStrokes(ctx, strokes, width, height, "#ffffff");
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("mask failed"))), "image/png"));
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: MaskStroke[],
  width: number,
  height: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    const lw = Math.max(1, s.size * width);
    ctx.lineWidth = lw;
    if (s.points.length === 1) {
      const [x, y] = s.points[0];
      ctx.beginPath();
      ctx.arc(x * width, y * height, lw / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * width, y * height) : ctx.moveTo(x * width, y * height)));
    ctx.stroke();
  }
}
