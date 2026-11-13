import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for user API keys. The encryption key is derived
 * from a server secret with HKDF, so the database alone cannot reveal keys.
 */
export interface SealedSecret {
  v: 1;
  iv: string;
  tag: string;
  data: string;
}

function deriveKey(secret: string): Buffer {
  if (!secret || secret.length < 16) throw new Error("Encryption secret is missing or too short");
  return Buffer.from(hkdfSync("sha256", secret, "pixforge", "user-api-key-v1", 32));
}

export function seal(plain: string, secret: string): SealedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function open(box: SealedSecret, secret: string): string {
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), Buffer.from(box.iv, "base64"));
  decipher.setAuthTag(Buffer.from(box.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(box.data, "base64")), decipher.final()]).toString("utf8");
}

/** Show only the end of a key, e.g. "••••••3f9a". */
export function maskKey(key: string): string {
  return "••••••" + key.slice(-4);
}
