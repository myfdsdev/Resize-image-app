import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { defaultsSchema } from "@/lib/settings-schema";
import { clearUserDefaults, getUserDefaults, saveUserDefaults } from "@/lib/user-data";

async function userId() {
  const s = await getSession();
  return s?.user?.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ defaults: await getUserDefaults(id) });
  } catch (e) {
    console.error("settings GET failed", e);
    return NextResponse.json({ error: "Could not load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = defaultsSchema.safeParse(body?.defaults);
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  try {
    await saveUserDefaults(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("settings PUT failed", e);
    return NextResponse.json({ error: "Could not save settings" }, { status: 500 });
  }
}

export async function DELETE() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await clearUserDefaults(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not reset settings" }, { status: 500 });
  }
}
