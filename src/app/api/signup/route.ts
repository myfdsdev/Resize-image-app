import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/mongodb";
import { createUser, signupSchema } from "@/lib/users";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Sign up is not available yet (database not configured)." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const res = await createUser(parsed.data);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("signup failed", e);
    return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 });
  }
}
