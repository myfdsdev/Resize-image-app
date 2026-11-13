/**
 * Small in-memory sliding-window rate limiter. It protects login and signup
 * from simple brute force. On serverless hosts each instance has its own
 * memory, so this is a speed bump rather than a hard guarantee.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();

  function prune(t: number) {
    if (hits.size < 5000) return;
    for (const [k, v] of hits) if (!v.length || v[v.length - 1] <= t - windowMs) hits.delete(k);
  }

  return {
    /** Records an attempt. Returns false when the key is over the limit. */
    check(key: string): { ok: boolean; retryAfterSec: number } {
      const t = now();
      prune(t);
      const list = (hits.get(key) ?? []).filter((x) => x > t - windowMs);
      if (list.length >= limit) {
        hits.set(key, list);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((list[0] + windowMs - t) / 1000)) };
      }
      list.push(t);
      hits.set(key, list);
      return { ok: true, retryAfterSec: 0 };
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
