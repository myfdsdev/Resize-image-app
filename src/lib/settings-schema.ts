import { z } from "zod";

/** Saved default settings. Shared by the API (validation) and the client (localStorage). */
export const defaultsSchema = z
  .object({
    sizeMode: z.enum(["presets", "custom", "original"]),
    width: z.number().int().min(1).max(16384).nullable(),
    height: z.number().int().min(1).max(16384).nullable(),
    lockRatio: z.boolean(),
    customFit: z.enum(["contain", "cover", "stretch"]),
    presetIds: z.array(z.string().max(64)).max(60),
    presetFit: z.enum(["cover", "contain"]),
    allowUpscale: z.boolean(),
    format: z.enum(["original", "jpeg", "png", "webp"]),
    quality: z.number().int().min(10).max(100),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    transparentPadding: z.boolean(),
    targetKB: z.number().int().min(5).max(50_000).nullable(),
    watermark: z
      .object({
        enabled: z.boolean(),
        type: z.enum(["text", "image"]),
        text: z.string().max(80),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        opacity: z.number().int().min(5).max(100),
        size: z.number().int().min(3).max(80),
        position: z.enum(["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"]),
        margin: z.number().min(0).max(20),
        tile: z.boolean(),
      })
      .partial(),
    rename: z
      .object({
        pattern: z.string().max(80),
        start: z.number().int().min(0).max(1_000_000),
        pad: z.number().int().min(1).max(8),
      })
      .partial(),
  })
  .partial();

export type SavedDefaults = z.infer<typeof defaultsSchema>;

export const batchStatsSchema = z.object({
  images: z.number().int().min(0).max(10_000),
  outputs: z.number().int().min(0).max(100_000),
  failed: z.number().int().min(0).max(10_000),
  inBytes: z.number().min(0).max(1e12),
  outBytes: z.number().min(0).max(1e12),
  sizes: z.array(z.string().max(80)).max(60),
  format: z.string().max(16),
});

export type BatchStats = z.infer<typeof batchStatsSchema>;

export const LOCAL_DEFAULTS_KEY = "pixforge.defaults.v1";
