import { describe, expect, it } from "vitest";
import { AI_TOOLS, buildAiInput, checkAiParams, expandCanvas, friendlyAiError, isAiTool, isFalMediaUrl, looksLikeFalKey } from "./ai-tools";

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

describe("background extend", () => {
  it("grows the short side and centers the original (never crops)", () => {
    expect(expandCanvas(1600, 1000, "1:1")).toEqual({ canvas: [1600, 1600], location: [0, 300] });
    expect(expandCanvas(1000, 1000, "16:9")).toEqual({ canvas: [1778, 1000], location: [389, 0] });
    expect(expandCanvas(1080, 1080, "9:16")).toEqual({ canvas: [1080, 1920], location: [0, 420] });
  });

  it("builds the fal input with size and placement", () => {
    expect(buildAiInput("expand", "u", undefined, { ratio: "1:1", imageWidth: 1600, imageHeight: 1000 })).toEqual({
      image_url: "u",
      canvas_size: [1600, 1600],
      original_image_size: [1600, 1000],
      original_image_location: [0, 300],
    });
  });

  it("checks params", () => {
    expect(checkAiParams("expand", {})).toMatch(/Choose/);
    expect(checkAiParams("expand", { ratio: "1:1", imageWidth: 500, imageHeight: 500 })).toMatch(/already/);
    expect(checkAiParams("expand", { ratio: "16:9", imageWidth: 500, imageHeight: 500 })).toBeNull();
    expect(checkAiParams("edit", { prompt: "hi" })).toMatch(/Describe/);
    expect(checkAiParams("edit", { prompt: "make the sky purple" })).toBeNull();
    expect(checkAiParams("remove-bg", {})).toBeNull();
  });

  it("prompt edit sends the prompt", () => {
    expect(buildAiInput("edit", "u", undefined, { prompt: "white background" })).toMatchObject({
      image_url: "u",
      prompt: "white background",
    });
    expect(AI_TOOLS.edit.endpoint).toBe("fal-ai/flux-pro/kontext");
    expect(AI_TOOLS.expand.endpoint).toBe("fal-ai/bria/expand");
  });
});
