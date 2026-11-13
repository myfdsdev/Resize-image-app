import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { batchStatsSchema } from "@/lib/settings-schema";
import { recordBatch } from "@/lib/user-data";

/** Records numbers about a finished batch (never the images themselves). */
export async function POST(req: Request) {
  const session = await getSession();
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = batchStatsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid stats" }, { status: 400 });
  try {
    await recordBatch(id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("stats POST failed", e);
    return NextResponse.json({ error: "Could not save stats" }, { status: 500 });
  }
}
