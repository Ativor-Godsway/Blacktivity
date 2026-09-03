import mongoose, { type Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Serverless-safe connection cache. Vercel lambdas are reused between
 * invocations; without this every hot invocation opens a new Atlas
 * connection and the cluster runs out of them.
 */
type Cache = { conn: Mongoose | null; promise: Promise<Mongoose> | null };

const globalWithMongoose = globalThis as typeof globalThis & {
  _mongoose?: Cache;
};

const cached: Cache = globalWithMongoose._mongoose ?? { conn: null, promise: null };
globalWithMongoose._mongoose = cached;

export async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
      })
      .catch((err) => {
        // Let the next request retry instead of caching a rejected promise.
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
