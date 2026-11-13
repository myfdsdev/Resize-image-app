export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_EXT = [".jpg", ".jpeg", ".png", ".webp"];

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export const MAX_FILES = num(process.env.NEXT_PUBLIC_MAX_FILES, 100);
export const MAX_FILE_SIZE_MB = num(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB, 25);

export type ValidationResult = { ok: true; mime: string } | { ok: false; reason: string };

function mimeFromName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

/** Validate a single file by type and size. Some OSes send an empty type, so fall back to extension. */
export function validateFile(file: { name: string; type: string; size: number }, maxMb = MAX_FILE_SIZE_MB): ValidationResult {
  const mime = file.type || mimeFromName(file.name) || "";
  if (mime === "image/gif") return { ok: false, reason: "GIF files are not supported yet" };
  if (mime === "image/heic" || mime === "image/heif" || /\.(heic|heif)$/i.test(file.name)) {
    return { ok: false, reason: "HEIC (iPhone) support is coming soon" };
  }
  if (!(ACCEPTED_MIME as readonly string[]).includes(mime)) {
    return { ok: false, reason: "Only JPG, PNG and WebP images are supported" };
  }
  if (file.size === 0) return { ok: false, reason: "File is empty" };
  if (file.size > maxMb * 1024 * 1024) return { ok: false, reason: `File is larger than ${maxMb} MB` };
  return { ok: true, mime };
}
