import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { customPresetInput, MAX_CUSTOM_PRESETS } from "@/lib/custom-presets";
import { addPreset, deletePreset, listPresets } from "@/lib/user-data";

async function userId() {
  return (await getSession())?.user?.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ presets: await listPresets(id) });
  } catch {
    return NextResponse.json({ error: "Could not load presets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = customPresetInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid preset" }, { status: 400 });
  }
  try {
    const res = await addPreset(id, parsed.data, MAX_CUSTOM_PRESETS);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ preset: res.preset }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save preset" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const presetId = new URL(req.url).searchParams.get("id");
  if (!presetId || presetId.length > 64) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await deletePreset(id, presetId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete preset" }, { status: 500 });
  }
}
