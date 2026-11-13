/**
 * Find the highest quality whose encoded size fits the target, using a
 * binary search (≈7 encodes). Returns null when even the lowest quality is
 * too large. `encode` is injected so this is testable without a canvas.
 */
export async function searchQuality(
  encode: (q: number) => Promise<Blob>,
  targetBytes: number,
  maxQuality: number,
  minQuality = 0.05,
  steps = 7,
): Promise<{ blob: Blob; quality: number } | null> {
  const first = await encode(maxQuality);
  if (first.size <= targetBytes) return { blob: first, quality: maxQuality };

  let lo = minQuality;
  let hi = maxQuality;
  let best: { blob: Blob; quality: number } | null = null;

  const floor = await encode(minQuality);
  if (floor.size > targetBytes) return null;
  best = { blob: floor, quality: minQuality };

  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    const b = await encode(mid);
    if (b.size <= targetBytes) {
      best = { blob: b, quality: mid };
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 0.01) break;
  }
  return best;
}
