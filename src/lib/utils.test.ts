import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildZip, zipFileName } from "./download";
import { baseName, dedupePaths, formatBytes, outputFileName } from "./filenames";
import { PRESETS, ratioLabel } from "./presets";
import { validateFile } from "./validation";

describe("validateFile", () => {
  const f = (name: string, type: string, size = 1000) => ({ name, type, size });

  it("accepts JPG, PNG and WebP", () => {
    expect(validateFile(f("a.jpg", "image/jpeg")).ok).toBe(true);
    expect(validateFile(f("a.png", "image/png")).ok).toBe(true);
    expect(validateFile(f("a.webp", "image/webp")).ok).toBe(true);
  });

  it("uses the extension when the browser gives no type", () => {
    expect(validateFile(f("photo.JPEG", ""))).toEqual({ ok: true, mime: "image/jpeg" });
  });

  it("accepts HEIC by type or extension", () => {
    expect(validateFile(f("IMG_1.HEIC", ""))).toEqual({ ok: true, mime: "image/heic" });
    expect(validateFile(f("a.heif", "application/octet-stream"))).toEqual({ ok: true, mime: "image/heic" });
    expect(validateFile(f("a", "image/heic"))).toEqual({ ok: true, mime: "image/heic" });
  });

  it("rejects GIF, other files, empty and too-large files", () => {
    expect(validateFile(f("a.gif", "image/gif")).ok).toBe(false);
    expect(validateFile(f("a.pdf", "application/pdf")).ok).toBe(false);
    expect(validateFile(f("a.jpg", "image/jpeg", 0)).ok).toBe(false);
    expect(validateFile(f("a.jpg", "image/jpeg", 30 * 1024 * 1024), 25).ok).toBe(false);
  });
});

describe("file names", () => {
  it("strips extension and unsafe characters", () => {
    expect(baseName("my photo.final.JPG")).toBe("my photo.final");
    expect(baseName('a/b:c*?"<>|.png')).toBe("a-b-c-");
    expect(baseName(".png")).toBe("image");
  });

  it("builds output names with optional preset suffix", () => {
    expect(outputFileName("IMG_1.jpeg", "webp")).toBe("IMG_1.webp");
    expect(outputFileName("IMG_1.jpeg", "jpg", "instagram-story")).toBe("IMG_1_instagram-story.jpg");
  });

  it("dedupes paths case-insensitively", () => {
    expect(dedupePaths(["a.jpg", "A.jpg", "a.jpg", "b.png", "dir/a.jpg"])).toEqual([
      "a.jpg",
      "A-1.jpg",
      "a-2.jpg",
      "b.png",
      "dir/a.jpg",
    ]);
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});

describe("ZIP export", () => {
  it("contains every file with unique, correct names and intact bytes", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
    const zipBlob = await buildZip([
      { path: "photo.jpg", blob: new Blob([bytes], { type: "image/jpeg" }) },
      { path: "photo.jpg", blob: new Blob([bytes], { type: "image/jpeg" }) },
      { path: "instagram-story/photo.jpg", blob: new Blob([bytes], { type: "image/jpeg" }) },
    ]);
    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
    expect(names).toEqual(["instagram-story/photo.jpg", "photo-1.jpg", "photo.jpg"]);
    const roundTrip = await zip.file("photo.jpg")!.async("uint8array");
    expect(Array.from(roundTrip)).toEqual(Array.from(bytes));
  });

  it("names the ZIP with a timestamp", () => {
    expect(zipFileName(new Date(2026, 10, 13, 9, 5))).toBe("pixforge_2026-11-13_0905.zip");
  });
});

describe("presets", () => {
  it("have unique ids and valid sizes", () => {
    const ids = new Set(PRESETS.map((x) => x.id));
    expect(ids.size).toBe(PRESETS.length);
    PRESETS.forEach((x) => {
      expect(x.width).toBeGreaterThan(0);
      expect(x.height).toBeGreaterThan(0);
    });
  });
  it("shows simple ratios", () => {
    expect(ratioLabel(1080, 1920)).toBe("9:16");
    expect(ratioLabel(1080, 1350)).toBe("4:5");
  });
});
