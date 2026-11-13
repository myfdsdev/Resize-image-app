/** AI tools that run on fal.ai with the user's own key (shared by client and server). */
import { z } from "zod";

export type AiToolId = "remove-bg" | "erase" | "upscale" | "expand" | "edit";

export interface AiTool {
  id: AiToolId;
  name: string;
  description: string;
  endpoint: string;
  needsMask: boolean;
  /** Longest side sent to the AI (keeps uploads small and cost predictable). */
  maxSide: number;
  /** Rough cost shown to the user; billed by fal.ai to their key. */
  costHint: string;
  /** Output format we ask the browser to send. */
  sendAs: "image/png" | "image/jpeg";
}

export const AI_TOOLS: Record<AiToolId, AiTool> = {
  "remove-bg": {
    id: "remove-bg",
    name: "Remove background",
    description: "Cut out the subject and get a transparent PNG.",
    endpoint: "fal-ai/bria/background/remove",
    needsMask: false,
    maxSide: 2048,
    costHint: "about $0.018 per image",
    sendAs: "image/jpeg",
  },
  erase: {
    id: "erase",
    name: "Magic eraser",
    description: "Paint over objects, text or blemishes to remove them.",
    endpoint: "fal-ai/bria/eraser",
    needsMask: true,
    maxSide: 2048,
    costHint: "billed per image by fal.ai",
    sendAs: "image/jpeg",
  },
  expand: {
    id: "expand",
    name: "Background extend",
    description: "Fit any size without cropping — AI paints the missing background.",
    endpoint: "fal-ai/bria/expand",
    needsMask: false,
    maxSide: 1536,
    costHint: "about $0.04 per image",
    sendAs: "image/jpeg",
  },
  edit: {
    id: "edit",
    name: "Edit with a prompt",
    description: "Describe a change, like “make the background white”.",
    endpoint: "fal-ai/flux-pro/kontext",
    needsMask: false,
    maxSide: 1536,
    costHint: "about $0.04 per image",
    sendAs: "image/jpeg",
  },
  upscale: {
    id: "upscale",
    name: "AI upscale 2×",
    description: "Make small or blurry images twice as large and sharper.",
    endpoint: "fal-ai/clarity-upscaler",
    needsMask: false,
    maxSide: 1024,
    costHint: "about $0.03 per output megapixel (≈ $0.12 for 2048 px)",
    sendAs: "image/jpeg",
  },
};

export const AI_TOOL_IDS = Object.keys(AI_TOOLS) as AiToolId[];

export function isAiTool(id: unknown): id is AiToolId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(AI_TOOLS, id);
}

export const EXPAND_RATIOS = ["1:1", "4:5", "3:4", "2:3", "9:16", "16:9", "3:2", "4:3", "5:4"] as const;
export type ExpandRatio = (typeof EXPAND_RATIOS)[number];

/** Extra options per tool, validated on the server. */
export const aiParamsSchema = z
  .object({
    ratio: z.enum(EXPAND_RATIOS).optional(),
    prompt: z.string().trim().max(500).optional(),
    imageWidth: z.number().int().min(16).max(4096).optional(),
    imageHeight: z.number().int().min(16).max(4096).optional(),
  })
  .strict();
export type AiParams = z.infer<typeof aiParamsSchema>;

/** Returns an error message when the params do not fit the tool. */
export function checkAiParams(tool: AiToolId, p: AiParams): string | null {
  if (tool === "expand") {
    if (!p.ratio) return "Choose a size to extend to";
    if (!p.imageWidth || !p.imageHeight) return "Missing image size";
    const c = expandCanvas(p.imageWidth, p.imageHeight, p.ratio);
    if (c.canvas[0] === p.imageWidth && c.canvas[1] === p.imageHeight) return "The image already has this shape";
  }
  if (tool === "edit" && (!p.prompt || p.prompt.length < 3)) return "Describe the change you want";
  return null;
}

/**
 * Canvas for "extend": keep the whole image, grow one side to reach the ratio,
 * and center the original. Never crops.
 */
export function expandCanvas(w: number, h: number, ratio: ExpandRatio) {
  const [rw, rh] = ratio.split(":").map(Number);
  const r = rw / rh;
  let W = w;
  let H = h;
  if (w / h < r) W = Math.round(h * r);
  else H = Math.round(w / r);
  return { canvas: [W, H] as [number, number], location: [Math.round((W - w) / 2), Math.round((H - h) / 2)] as [number, number] };
}

/** Input object for the fal endpoint. */
export function buildAiInput(tool: AiToolId, imageUrl: string, maskUrl?: string, params: AiParams = {}): Record<string, unknown> {
  switch (tool) {
    case "expand": {
      const w = params.imageWidth!;
      const h = params.imageHeight!;
      const { canvas, location } = expandCanvas(w, h, params.ratio!);
      return {
        image_url: imageUrl,
        canvas_size: canvas,
        original_image_size: [w, h],
        original_image_location: location,
        ...(params.prompt ? { prompt: params.prompt } : {}),
      };
    }
    case "edit":
      return { image_url: imageUrl, prompt: params.prompt, output_format: "jpeg", num_images: 1 };
    case "remove-bg":
      return { image_url: imageUrl };
    case "erase":
      return { image_url: imageUrl, mask_url: maskUrl, mask_type: "manual" };
    case "upscale":
      return { image_url: imageUrl, upscale_factor: 2 };
  }
}

/** Loose check: fal keys are long tokens without spaces (usually "id:secret"). */
export function looksLikeFalKey(key: string): boolean {
  return /^[A-Za-z0-9_\-:.]{20,256}$/.test(key);
}

/** Turn provider errors into messages people can act on. */
export function friendlyAiError(status: number | undefined, message?: string): string {
  if (status === 401 || status === 403) return "Your fal.ai key was rejected. Check the key on the API Key page.";
  if (status === 402) return "Your fal.ai account has no balance left. Add credits on fal.ai and try again.";
  if (status === 422) return "The AI could not use this image. Try a different image or size.";
  if (status === 429) return "fal.ai is rate limiting your key. Wait a moment and try again.";
  if (message && /balance|credit|billing/i.test(message)) {
    return "Your fal.ai account has no balance left. Add credits on fal.ai and try again.";
  }
  return "The AI request failed. Please try again.";
}

/** Only fal's own media hosts may be proxied by /api/ai/fetch. */
export function isFalMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && (u.hostname === "fal.media" || u.hostname.endsWith(".fal.media"));
  } catch {
    return false;
  }
}
