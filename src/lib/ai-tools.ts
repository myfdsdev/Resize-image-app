/** AI tools that run on fal.ai with the user's own key (shared by client and server). */
export type AiToolId = "remove-bg" | "erase" | "upscale";

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

/** Input object for the fal endpoint. */
export function buildAiInput(tool: AiToolId, imageUrl: string, maskUrl?: string): Record<string, unknown> {
  switch (tool) {
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
