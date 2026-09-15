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
  mcpResource,
} from "@/lib/auth-config";

/**
 * Config target for `npm run auth:generate` only. The Better Auth CLI refuses to
 * load a module graph containing `server-only`, which rules out lib/auth.ts, and
 * `generate` never queries the database — hence the placeholder URL. The
 * adapter is dropped because `--adapter drizzle` needs none, and the OAuth
 * provider's startup resource seeding would fail on a Drizzle schema that does
 * not have its tables yet. List every plugin that adds tables here too.
 */
export const auth = betterAuth({
  ...authOptions(drizzle({ connection: { url: ":memory:" } })),
  database: undefined,
  plugins: [
    deviceAuthorization(deviceAuthorizationOptions),
    jwt(),
    mcp(mcpOptions(mcpResource("http://localhost:3000"))),
    cimd(cimdOptions),
  ],
});
