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
