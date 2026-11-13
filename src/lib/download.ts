import JSZip from "jszip";
import { dedupePaths } from "./filenames";

export interface ZipEntry {
  path: string;
  blob: Blob;
}

/**
 * Build a ZIP from processed outputs. Images are already compressed,
 * so entries are stored (no deflate) — much faster with the same size.
 */
export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  const paths = dedupePaths(entries.map((e) => e.path));
  entries.forEach((e, i) => zip.file(paths[i], e.blob, { compression: "STORE" }));
  return zip.generateAsync({ type: "blob", compression: "STORE", mimeType: "application/zip" });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before freeing memory.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function zipFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `pixforge_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}.zip`;
}
