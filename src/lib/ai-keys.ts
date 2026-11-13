import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { maskKey, open, seal, type SealedSecret } from "./secret-box";

interface KeyDoc {
  userId: ObjectId;
  provider: "fal";
  sealed: SealedSecret;
  hint: string;
  verified: boolean;
  updatedAt: Date;
}

function encryptionSecret(): string {
  const s = process.env.KEY_ENCRYPTION_SECRET || process.env.AUTH_SECRET || "";
  if (s.length < 16) throw new Error("KEY_ENCRYPTION_SECRET (or AUTH_SECRET) must be set to store API keys");
  return s;
}

async function col() {
  const c = (await getDb()).collection<KeyDoc>("api_keys");
  await c.createIndex({ userId: 1, provider: 1 }, { unique: true }).catch(() => undefined);
  return c;
}

const toId = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export async function saveFalKey(userId: string, key: string, verified: boolean) {
  const id = toId(userId);
  if (!id) throw new Error("Invalid user");
  const sealed = seal(key, encryptionSecret());
  await (await col()).updateOne(
    { userId: id, provider: "fal" },
    { $set: { sealed, hint: maskKey(key), verified, updatedAt: new Date() } },
    { upsert: true },
  );
}

export async function getFalKeyInfo(userId: string) {
  const id = toId(userId);
  if (!id) return null;
  const doc = await (await col()).findOne({ userId: id, provider: "fal" }, { projection: { sealed: 0 } });
  return doc ? { hint: doc.hint, verified: doc.verified, updatedAt: doc.updatedAt.toISOString() } : null;
}

/** Decrypts the key for a single server-side request. Never send this to the browser. */
export async function getFalKey(userId: string): Promise<string | null> {
  const id = toId(userId);
  if (!id) return null;
  const doc = await (await col()).findOne({ userId: id, provider: "fal" });
  if (!doc) return null;
  return open(doc.sealed, encryptionSecret());
}

export async function deleteFalKey(userId: string) {
  const id = toId(userId);
  if (!id) return;
  await (await col()).deleteOne({ userId: id, provider: "fal" });
}

/**
 * Checks a key without spending credits: asking the queue for a request that
 * does not exist returns 401/403 for a bad key and 404 for a good one.
 */
export async function verifyFalKey(key: string): Promise<"valid" | "invalid" | "unknown"> {
  if (aiMockEnabled()) return "valid";
  try {
    const res = await fetch(
      "https://queue.fal.run/fal-ai/bria/background/remove/requests/00000000-0000-0000-0000-000000000000/status",
      { headers: { Authorization: `Key ${key}` }, signal: AbortSignal.timeout(8000), cache: "no-store" },
    );
    if (res.status === 401 || res.status === 403) return "invalid";
    if (res.status === 404 || res.ok || res.status === 400 || res.status === 422) return "valid";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Fake AI for local development and tests only. Never active in production. */
export function aiMockEnabled(): boolean {
  return process.env.PIXFORGE_AI_MOCK === "1" && process.env.NODE_ENV !== "production";
}
