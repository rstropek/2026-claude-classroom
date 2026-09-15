import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/libsql/node";
import { inject } from "vitest";
import { authOptions } from "@/lib/auth-config";
import * as schema from "@/lib/schema";
import { root, secret } from "./global-setup";

declare module "vitest" {
  export interface ProvidedContext {
    /** Scratch directory that global-setup.ts deletes afterwards. */
    tempDir: string;
    /** The test server's migrated SQLite file. */
    databaseUrl: string;
    /** The `next dev` that global-setup.ts started. */
    baseURL: string;
  }
}

export const bin = join(root, "node_modules/.bin/ai-tutor");

/** A config dir of the test file's own, so its stored login is not shared. */
export const createConfigDir = () =>
  mkdtemp(join(inject("tempDir"), "config-"));

/**
 * Better Auth's test helpers on the test server's database; the server accepts
 * the sessions they mint because both sides sign with the same secret.
 */
export async function testAuth() {
  const baseURL = inject("baseURL");
  const db = drizzle({ connection: { url: inject("databaseUrl") }, schema });
  const { test: helpers } = await betterAuth({
    ...authOptions(db),
    secret,
    baseURL,
    plugins: [testUtils()],
  }).$context;
  return { helpers, close: () => db.$client.close() };
}
