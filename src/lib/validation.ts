export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export const ACCEPTED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

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
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return null;
}

/** Validate a single file by type and size. Some OSes send an empty type, so fall back to extension. */
export function validateFile(file: { name: string; type: string; size: number }, maxMb = MAX_FILE_SIZE_MB): ValidationResult {
  let mime = file.type || mimeFromName(file.name) || "";
  // Some systems report HEIC as octet-stream; trust the extension then.
  if (/\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]/i.test(mime)) mime = "image/heic";
  if (mime === "image/gif") return { ok: false, reason: "GIF files are not supported yet" };
  if (!(ACCEPTED_MIME as readonly string[]).includes(mime)) {
    return { ok: false, reason: "Only JPG, PNG, WebP and HEIC images are supported" };
  }
  if (file.size === 0) return { ok: false, reason: "File is empty" };
  if (file.size > maxMb * 1024 * 1024) return { ok: false, reason: `File is larger than ${maxMb} MB` };
  return { ok: true, mime };
}
