/** Strip extension and unsafe characters, keep the name readable. */
export function baseName(name: string): string {
  const noExt = name.replace(/\.[^./\\]+$/, "");
  const cleaned = noExt
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  return cleaned || "image";
}

export function outputFileName(original: string, ext: string, suffix?: string): string {
  const b = baseName(original);
  return suffix ? `${b}_${suffix}.${ext}` : `${b}.${ext}`;
}

/**
 * Make every path unique ("photo.jpg", "photo-1.jpg", ...). Comparison is
 * case-insensitive because Windows/macOS file systems are.
 */
export function dedupePaths(paths: string[]): string[] {
  const used = new Set<string>();
  return paths.map((path) => {
    const m = path.match(/^(.*?)(\.[^./]+)?$/)!;
    const stem = m[1];
    const ext = m[2] ?? "";
    let candidate = path;
    let i = 1;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${stem}-${i}${ext}`;
      i++;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}
