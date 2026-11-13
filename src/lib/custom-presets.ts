import { z } from "zod";

export const customPresetInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  width: z.number().int().min(1).max(16384),
  height: z.number().int().min(1).max(16384),
});

export const customPresetSchema = customPresetInput.extend({ id: z.string().min(1).max(64) });

export type CustomPreset = z.infer<typeof customPresetSchema>;

export const CUSTOM_PREFIX = "custom:";
export const LOCAL_PRESETS_KEY = "pixforge.presets.v1";
export const MAX_CUSTOM_PRESETS = 50;

export const customPresetKey = (id: string) => `${CUSTOM_PREFIX}${id}`;
