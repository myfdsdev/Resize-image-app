import "server-only";
import bcrypt from "bcryptjs";
import type { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "./mongodb";

export interface UserDoc {
  _id: ObjectId;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image?: string | null;
  passwordHash?: string;
  createdAt?: Date;
}

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

let indexesReady: Promise<unknown> | null = null;

async function users() {
  const db = await getDb();
  const col = db.collection<UserDoc>("users");
  // Same collection the Auth.js adapter uses, so Google and email logins share accounts.
  indexesReady ??= col.createIndex({ email: 1 }, { unique: true }).catch(() => {
    indexesReady = null;
  });
  await indexesReady;
  return col;
}

export async function findUserByEmail(email: string) {
  return (await users()).findOne({ email: email.toLowerCase() });
}

export type CreateUserResult = { ok: true; id: string } | { ok: false; error: string; status: number };

export async function createUser(input: z.infer<typeof signupSchema>): Promise<CreateUserResult> {
  const col = await users();
  const existing = await col.findOne({ email: input.email });
  if (existing) return { ok: false, error: "An account with this email already exists", status: 409 };

  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const res = await col.insertOne({
      name: input.name,
      email: input.email,
      emailVerified: null,
      passwordHash,
      createdAt: new Date(),
    } as UserDoc);
    return { ok: true, id: res.insertedId.toString() };
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      return { ok: false, error: "An account with this email already exists", status: 409 };
    }
    throw e;
  }
}

/** Returns the user only if the password matches. Constant-ish time for unknown emails. */
export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) {
    await bcrypt.compare(password, "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.Qn6tF2iV7Y8yC6z4n8m9x1pQe5bK");
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}
