import { baseName } from "./filenames";

export interface RenameOptions {
  /** Tokens: {name} original name, {n} number, {w} width, {h} height, {size} preset id, {date} YYYY-MM-DD */
  pattern: string;
  start: number;
  pad: number;
}

export const DEFAULT_RENAME: RenameOptions = { pattern: "{name}", start: 1, pad: 3 };

export const RENAME_TOKENS = [
  { token: "{name}", label: "Original name" },
  { token: "{n}", label: "Number" },
  { token: "{w}", label: "Width" },
  { token: "{h}", label: "Height" },
  { token: "{size}", label: "Preset" },
  { token: "{date}", label: "Date" },
];

export interface RenameContext {
  originalName: string;
  /** 0-based position of the image in the batch */
  index: number;
  width: number;
  height: number;
  sizeId?: string;
  date?: Date;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Build a safe file base name (no extension) from a pattern. */
export function renderName(opts: RenameOptions, ctx: RenameContext): string {
  const d = ctx.date ?? new Date();
  const num = String(Math.max(0, opts.start) + ctx.index).padStart(Math.min(8, Math.max(1, opts.pad)), "0");
  const out = (opts.pattern || "{name}")
    .replace(/\{name\}/gi, baseName(ctx.originalName))
    .replace(/\{n\}/gi, num)
    .replace(/\{w\}/gi, String(ctx.width))
    .replace(/\{h\}/gi, String(ctx.height))
    .replace(/\{size\}/gi, ctx.sizeId ?? "")
    .replace(/\{date\}/gi, `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
  // Reuse the same sanitising rules as original names; add a dummy extension so it is not stripped.
  const safe = baseName(`${out}.x`)
    .replace(/[-_ ]{2,}/g, (m) => m[0])
    .replace(/^[-_ .]+|[-_ .]+$/g, "")
    .slice(0, 120);
  return safe || "image";
}

/** True when the pattern changes nothing (so we keep the classic naming). */
export function isDefaultPattern(opts: RenameOptions): boolean {
  return (opts.pattern || "{name}").trim().toLowerCase() === "{name}";
}
