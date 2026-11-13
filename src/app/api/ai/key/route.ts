import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { deleteFalKey, getFalKeyInfo, saveFalKey, verifyFalKey } from "@/lib/ai-keys";
import { looksLikeFalKey } from "@/lib/ai-tools";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter(10, 10 * 60_000);

async function userId() {
  return (await getSession())?.user?.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ key: await getFalKeyInfo(id) });
  } catch {
    return NextResponse.json({ error: "Could not load key" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!limiter.check(id).ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!looksLikeFalKey(key)) {
    return NextResponse.json({ error: "That doesn't look like a fal.ai API key" }, { status: 400 });
  }
  const check = await verifyFalKey(key);
  if (check === "invalid") {
    return NextResponse.json({ error: "fal.ai rejected this key. Please check it and try again." }, { status: 400 });
  }
  try {
    await saveFalKey(id, key, check === "valid");
    return NextResponse.json({ ok: true, verified: check === "valid" });
  } catch (e) {
    console.error("save key failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not save the key" }, { status: 500 });
  }
}

export async function DELETE() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await deleteFalKey(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete the key" }, { status: 500 });
  }
}
