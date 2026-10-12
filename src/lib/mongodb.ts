import mongoose from "mongoose";
import { env } from "./env";
import { SlotSeat } from "@/models/SlotSeat";
import { OnceLock } from "@/models/OnceLock";

/**
 * Serverless-safe connection reuse.
 * On Vercel each warm function instance keeps one cached connection
 * instead of opening a new one for every request.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongo = globalThis as unknown as { __bmdMongo?: Cache };
const cache: Cache = globalForMongo.__bmdMongo ?? { conn: null, promise: null };
globalForMongo.__bmdMongo = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose
      .connect(env.mongodbUri(), {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
      })
      .then(async (m) => {
        // Uniqueness guarantees (slot seats, idempotency keys, phone numbers, references)
        // depend on indexes, so make sure every registered model's indexes exist.
        await Promise.all([SlotSeat.init(), OnceLock.init(), ...Object.values(m.models).map((model) => model.init())]);
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
  }
  cache.conn = null;
  cache.promise = null;
}
