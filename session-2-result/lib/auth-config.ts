import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { BetterAuthOptions } from "better-auth";
import * as schema from "@/lib/schema";

type DrizzleDb = Parameters<typeof drizzleAdapter>[0];

/**
 * Everything about the auth instance except the plugins, which each entry point
 * spreads in as a static array — Better Auth only infers plugin helpers (such as
 * `ctx.test`) from literal arrays. Kept free of the `server-only` marker in
 * lib/db.ts so the Better Auth CLI and the Vitest suite can load it.
 */
export function authOptions(db: DrizzleDb) {
  return {
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    emailAndPassword: { enabled: true },
  } satisfies BetterAuthOptions;
}
