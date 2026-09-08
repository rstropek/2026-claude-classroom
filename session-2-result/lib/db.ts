import "server-only";
import { drizzle } from "drizzle-orm/libsql/node";
import * as schema from "@/lib/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set — see .env");
}

// `next dev` re-evaluates modules on every hot reload; without the cache each
// reload would leak another libSQL connection.
const globalForDb = globalThis as typeof globalThis & {
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

globalForDb.db ??= drizzle({ connection: { url }, schema });

export const db = globalForDb.db;
