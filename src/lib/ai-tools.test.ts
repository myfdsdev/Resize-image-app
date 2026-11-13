import { describe, expect, it } from "vitest";
import { AI_TOOLS, buildAiInput, friendlyAiError, isAiTool, isFalMediaUrl, looksLikeFalKey } from "./ai-tools";

describe("AI tools", () => {
  it("builds the right input for each fal endpoint", () => {
    expect(buildAiInput("remove-bg", "https://x/i.jpg")).toEqual({ image_url: "https://x/i.jpg" });
    expect(buildAiInput("erase", "https://x/i.jpg", "https://x/m.png")).toEqual({
      image_url: "https://x/i.jpg",
      mask_url: "https://x/m.png",
      mask_type: "manual",
    });
    expect(buildAiInput("upscale", "https://x/i.jpg")).toEqual({ image_url: "https://x/i.jpg", upscale_factor: 2 });
  });

  it("uses verified fal endpoints", () => {
    expect(AI_TOOLS["remove-bg"].endpoint).toBe("fal-ai/bria/background/remove");
    expect(AI_TOOLS.erase.endpoint).toBe("fal-ai/bria/eraser");
    expect(AI_TOOLS.upscale.endpoint).toBe("fal-ai/clarity-upscaler");
  });

  it("validates tool ids and key format", () => {
    expect(isAiTool("erase")).toBe(true);
    expect(isAiTool("__proto__")).toBe(false);
    expect(looksLikeFalKey("1234abcd-12ab-34cd-56ef-1234567890ab:abcdef0123456789abcdef0123456789")).toBe(true);
    expect(looksLikeFalKey("short")).toBe(false);
    expect(looksLikeFalKey("has spaces in it which is not a key")).toBe(false);
  });

  it("explains provider errors", () => {
    expect(friendlyAiError(401)).toMatch(/rejected/);
    expect(friendlyAiError(402)).toMatch(/balance/);
    expect(friendlyAiError(500, "User is locked. Reason: Exhausted balance")).toMatch(/balance/);
    expect(friendlyAiError(500)).toMatch(/failed/);
  });

  it("only allows fal media URLs through the proxy", () => {
    expect(isFalMediaUrl("https://v3.fal.media/files/a.png")).toBe(true);
    expect(isFalMediaUrl("https://fal.media/files/a.png")).toBe(true);
    expect(isFalMediaUrl("http://v3.fal.media/files/a.png")).toBe(false);
    expect(isFalMediaUrl("https://evil.com/fal.media")).toBe(false);
    expect(isFalMediaUrl("https://fal.media.evil.com/a.png")).toBe(false);
    expect(isFalMediaUrl("not a url")).toBe(false);
  });
});
