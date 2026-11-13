import { decodeImage } from "./image-processing/pipeline";

const THUMB_SIZE = 360;
const CONCURRENCY = 2;

interface Thumb {
  url: string;
  width: number;
  height: number;
}

let active = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= CONCURRENCY) await new Promise<void>((r) => queue.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

/**
 * Small JPEG/PNG preview for the grid. Full-size 12MP previews in a grid of
 * 100 images would use gigabytes of memory and render slowly.
 */
export function makeThumbnail(file: Blob, keepAlpha: boolean): Promise<Thumb> {
  return withSlot(async () => {
    const bitmap = await decodeImage(file);
    try {
      const scale = Math.min(1, THUMB_SIZE / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, w, h);
      const type = keepAlpha ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("thumbnail failed"))), type, 0.8),
      );
      return { url: URL.createObjectURL(blob), width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  });
}
