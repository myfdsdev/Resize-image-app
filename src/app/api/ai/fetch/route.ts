import { getSession } from "@/auth";
import { isFalMediaUrl } from "@/lib/ai-tools";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Fallback download for AI results when the browser cannot read fal's CDN
 * directly (CORS). Only fal media URLs are allowed, so this is not an open proxy.
 */
export async function GET(req: Request) {
  const id = (await getSession())?.user?.id;
  if (!id) return new Response("Not signed in", { status: 401 });
  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!isFalMediaUrl(url)) return new Response("URL not allowed", { status: 400 });

  const upstream = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "error" }).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new Response("Could not fetch result", { status: 502 });
  const type = upstream.headers.get("content-type") || "";
  if (!type.startsWith("image/")) return new Response("Not an image", { status: 502 });
  const len = Number(upstream.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return new Response("Result too large", { status: 413 });

  return new Response(upstream.body, {
    headers: { "Content-Type": type, "Cache-Control": "private, no-store" },
  });
}
