import "server-only";
import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as { _pixforgeMongo?: Promise<MongoClient> };

export function isDatabaseConfigured(): boolean {
  return !!process.env.MONGODB_URI;
}

/**
 * Lazily connect so the app (and all free tools) still run when MongoDB
 * is not configured. Only login/account features need the database.
 */
export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error("MONGODB_URI is not set. Add it to .env.local to enable login."));
  }
  if (!globalForMongo._pixforgeMongo) {
    const client = new MongoClient(uri, { appName: "pixforge" });
    globalForMongo._pixforgeMongo = client.connect().catch((err) => {
      globalForMongo._pixforgeMongo = undefined; // allow retry on next request
      throw err;
    });
  }
  return globalForMongo._pixforgeMongo;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB || "pixforge");
}
