import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/mongodb";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { createUser, signupSchema } from "@/lib/users";

// 5 signups per IP per 15 minutes
const limiter = createRateLimiter(5, 15 * 60_000);

export async function POST(req: Request) {
  const rl = limiter.check(clientIp(req.headers));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
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
