import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { getFalKey } from "@/lib/ai-keys";
import { submitAiJob } from "@/lib/ai-runner";
import { AI_TOOLS, isAiTool } from "@/lib/ai-tools";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_IMAGE = 4 * 1024 * 1024; // stays under typical serverless body limits
const MAX_MASK = 2 * 1024 * 1024;
const limiter = createRateLimiter(30, 60_000);

const isImage = (v: FormDataEntryValue | null): v is File =>
  !!v && typeof v === "object" && "arrayBuffer" in v && /^image\/(png|jpeg|webp)$/.test(v.type);

export async function POST(req: Request) {
  const id = (await getSession())?.user?.id;
  if (!id) return NextResponse.json({ error: "Log in to use AI tools" }, { status: 401 });
  if (!limiter.check(id).ok) return NextResponse.json({ error: "Too many AI requests. Wait a minute." }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const tool = form.get("tool");
  if (!isAiTool(tool)) return NextResponse.json({ error: "Unknown tool" }, { status: 400 });
  const image = form.get("image");
  if (!isImage(image) || image.size > MAX_IMAGE) {
    return NextResponse.json({ error: "Image missing or too large (max 4 MB)" }, { status: 400 });
  }
  const mask = form.get("mask");
  if (AI_TOOLS[tool].needsMask && (!isImage(mask) || mask.size > MAX_MASK)) {
    return NextResponse.json({ error: "Paint the area to remove first" }, { status: 400 });
  }

  let key: string | null;
  try {
    key = await getFalKey(id);
  } catch {
    return NextResponse.json({ error: "Could not read your API key" }, { status: 500 });
  }
  if (!key) return NextResponse.json({ error: "Add your fal.ai API key first", code: "NO_KEY" }, { status: 400 });

  const res = await submitAiJob(key, tool, image, AI_TOOLS[tool].needsMask ? (mask as File) : undefined);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json({ requestId: res.requestId });
}
