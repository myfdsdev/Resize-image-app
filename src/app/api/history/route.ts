import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { clearHistory } from "@/lib/user-data";

/** Deletes the signed-in user's batch history. Only numbers are stored, never images. */
export async function DELETE() {
  const id = (await getSession())?.user?.id;
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await clearHistory(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not clear history" }, { status: 500 });
  }
}
