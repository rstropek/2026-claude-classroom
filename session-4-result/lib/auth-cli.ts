import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { deviceAuthorization, jwt } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/libsql/node";
import {
  authOptions,
  cimdOptions,
  deviceAuthorizationOptions,
  mcpOptions,
} from "@/lib/auth-config";

/**
 * Config target for `npm run auth:generate` only. The Better Auth CLI refuses to
 * load a module graph containing `server-only`, which rules out lib/auth.ts.
 * `--adapter drizzle` makes `generate` use a mock adapter, and the Drizzle
 * adapter is swapped for Better Auth's in-memory default because the OAuth
 * provider queries its own tables at startup, before they are in the schema.
 */
export const auth = betterAuth({
  ...authOptions(drizzle({ connection: { url: ":memory:" } })),
  database: undefined,
  // Only plugins that add tables or fields matter to `generate`, which also
  // needs no real origin for the MCP resource.
  plugins: [
    deviceAuthorization(deviceAuthorizationOptions),
    jwt(),
    mcp(mcpOptions("http://localhost:3000")),
    cimd(cimdOptions),
  ],
});
