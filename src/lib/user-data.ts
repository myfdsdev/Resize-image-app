import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { BatchStats, SavedDefaults } from "./settings-schema";

interface SettingsDoc {
  userId: ObjectId;
  defaults: SavedDefaults;
  updatedAt: Date;
}

interface BatchDoc extends BatchStats {
  _id?: ObjectId;
  userId: ObjectId;
  createdAt: Date;
}

const toId = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

let indexes: Promise<unknown> | null = null;
async function cols() {
  const db = await getDb();
  const settings = db.collection<SettingsDoc>("user_settings");
  const batches = db.collection<BatchDoc>("batches");
  indexes ??= Promise.all([
    settings.createIndex({ userId: 1 }, { unique: true }),
    batches.createIndex({ userId: 1, createdAt: -1 }),
  ]).catch(() => {
    indexes = null;
  });
  await indexes;
  return { settings, batches };
}

export async function getUserDefaults(userId: string): Promise<SavedDefaults | null> {
  const id = toId(userId);
  if (!id) return null;
  const { settings } = await cols();
  const doc = await settings.findOne({ userId: id });
  return doc?.defaults ?? null;
}

export async function saveUserDefaults(userId: string, defaults: SavedDefaults) {
  const id = toId(userId);
  if (!id) throw new Error("Invalid user");
  const { settings } = await cols();
  await settings.updateOne({ userId: id }, { $set: { defaults, updatedAt: new Date() } }, { upsert: true });
}

export async function clearUserDefaults(userId: string) {
  const id = toId(userId);
  if (!id) return;
  const { settings } = await cols();
  await settings.deleteOne({ userId: id });
}

export async function recordBatch(userId: string, stats: BatchStats) {
  const id = toId(userId);
  if (!id) throw new Error("Invalid user");
  const { batches } = await cols();
  await batches.insertOne({ ...stats, userId: id, createdAt: new Date() });
}

export interface Overview {
  totals: { batches: number; images: number; outputs: number; inBytes: number; outBytes: number };
  recent: (BatchStats & { id: string; createdAt: string })[];
}

export async function getOverview(userId: string): Promise<Overview> {
  const id = toId(userId);
  const empty: Overview = { totals: { batches: 0, images: 0, outputs: 0, inBytes: 0, outBytes: 0 }, recent: [] };
  if (!id) return empty;
  const { batches } = await cols();
  const [agg] = await batches
    .aggregate<Overview["totals"]>([
      { $match: { userId: id } },
      {
        $group: {
          _id: null,
          batches: { $sum: 1 },
          images: { $sum: "$images" },
          outputs: { $sum: "$outputs" },
          inBytes: { $sum: "$inBytes" },
          outBytes: { $sum: "$outBytes" },
        },
      },
      { $project: { _id: 0 } },
    ])
    .toArray();
  const recent = await batches.find({ userId: id }).sort({ createdAt: -1 }).limit(8).toArray();
  return {
    totals: agg ?? empty.totals,
    recent: recent.map((b) => ({
      id: b._id!.toString(),
      createdAt: b.createdAt.toISOString(),
      images: b.images,
      outputs: b.outputs,
      failed: b.failed,
      inBytes: b.inBytes,
      outBytes: b.outBytes,
      sizes: b.sizes,
      format: b.format,
    })),
  };
}
