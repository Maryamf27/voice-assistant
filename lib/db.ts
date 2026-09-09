import mongoose from "mongoose";

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalForMongoose = global as typeof globalThis & { mongoose?: MongooseCache };
const cache = globalForMongoose.mongoose ?? (globalForMongoose.mongoose = { conn: null, promise: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not configured.");
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(mongoUri, { bufferCommands: false });
  try { cache.conn = await cache.promise; } catch (error) { cache.promise = null; throw error; }
  return cache.conn;
}
