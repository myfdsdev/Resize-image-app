import { baseName } from "./filenames";

let chain: Promise<unknown> = Promise.resolve();

/**
 * Convert an iPhone HEIC/HEIF photo to a high-quality JPEG in the browser.
 * The decoder (~3 MB) is loaded only when the first HEIC file is added, and
 * files are converted one at a time because decoding is memory heavy.
 */
export function convertHeic(file: File): Promise<File> {
  const run = async () => {
    const { heicTo } = await import("heic-to/next");
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
    return new File([blob], `${baseName(file.name)}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  };
  const result = chain.then(run, run);
  chain = result.catch(() => undefined);
  return result;
}

export function isHeicLike(file: { name: string; type: string }): boolean {
  return /^image\/hei[cf](-sequence)?$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}
