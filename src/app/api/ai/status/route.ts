import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { getFalKey } from "@/lib/ai-keys";
import { getAiJob } from "@/lib/ai-runner";
import { isAiTool } from "@/lib/ai-tools";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = (await getSession())?.user?.id;
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const tool = params.get("tool");
  const requestId = params.get("id") ?? "";
  if (!isAiTool(tool) || !/^[A-Za-z0-9-]{1,80}$/.test(requestId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const key = await getFalKey(id).catch(() => null);
  if (!key) return NextResponse.json({ error: "Add your fal.ai API key first" }, { status: 400 });
  return NextResponse.json(await getAiJob(key, tool, requestId), { headers: { "Cache-Control": "no-store" } });
}
