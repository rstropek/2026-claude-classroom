import type { CimdOptions } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { McpOptions } from "@better-auth/mcp";
import { CLI_CLIENT_ID } from "ai-tutor-api-contract";
import type { BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { deviceAuthorization } from "better-auth/plugins";
import * as schema from "@/lib/schema";

type DrizzleDb = Parameters<typeof drizzleAdapter>[0];

/**
 * Drizzle wraps a failed insert as "Failed query: …" and keeps the SQLite error
 * as `cause`, while Better Auth spots a lost unique-insert race by the thrown
 * error's own code or message. The OAuth provider seeds `oauth_resource` when
 * the instance initializes, so every process that started beside the winner
 * (next build's workers, a second server on a fresh database) was left with a
 * rejected auth context. Rethrowing the cause lets those checks see it.
 */
function sqliteAdapter(db: DrizzleDb): ReturnType<typeof drizzleAdapter> {
  const createAdapter = drizzleAdapter(db, { provider: "sqlite", schema });
  return (options) => {
    const adapter = createAdapter(options);
    return {
      ...adapter,
      async create(data) {
        try {
          return await adapter.create(data);
        } catch (error) {
          // Matched by shape: the adapter's drizzle-orm copy is not ours.
          throw error instanceof Error &&
            error.message.startsWith("Failed query:") &&
            error.cause instanceof Error
            ? error.cause
            : error;
        }
      },
    };
  };
}

/**
 * Everything about the auth instance except the plugins, which each entry point
 * spreads in as a static array — Better Auth only infers plugin helpers (such as
 * `ctx.test`) from literal arrays. Kept free of the `server-only` marker in
 * lib/db.ts so the Better Auth CLI and the Vitest suite can load it.
 */
export function authOptions(db: DrizzleDb) {
  return {
    database: sqliteAdapter(db),
    emailAndPassword: { enabled: true },
    // The jwt plugin's session-to-JWT endpoint; the MCP plugin needs jwt() only
    // for its signing keys and /jwks, and OAuth clients get tokens from /oauth2.
    disabledPaths: ["/token"],
    hooks: {
      // /device/token returns the raw session token, which
      // `bearer({ requireSignature: true })` refuses. Setting the session
      // cookie here (user hooks run before plugin hooks) makes the bearer
      // plugin answer with the signed token in `set-auth-token`, same as
      // sign-in.
      after: createAuthMiddleware(async (ctx) => {
        const newSession = ctx.context.newSession;
        if (ctx.path === "/device/token" && newSession) {
          await setSessionCookie(ctx, newSession);
        }
      }),
    },
  } satisfies BetterAuthOptions;
}

/** For `deviceAuthorization(...)` in every entry point's plugin array. */
export const deviceAuthorizationOptions = {
  verificationUri: "/device",
  validateClient: (clientId) => clientId === CLI_CLIENT_ID,
} satisfies Parameters<typeof deviceAuthorization>[0];

/** Where app/api/mcp/route.ts serves the MCP server. */
export const MCP_PATH = "/api/mcp";

/**
 * The only scope `/api/mcp` accepts, beside `offline_access`, which MCP clients
 * add on their own to get a refresh token.
 */
export const MCP_SCOPE = "todos";

/**
 * For `mcp(...)` in every entry point's plugin array. `baseURL` is the app's
 * origin (BETTER_AUTH_URL); the access tokens are audience-bound to the MCP
 * route under it, which app/api/mcp/route.ts checks as `mcpResource`.
 */
export function mcpOptions(baseURL: string | undefined) {
  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL must be set to serve the MCP endpoint");
  }
  return {
    loginPage: "/login",
    consentPage: "/consent",
    resource: new URL(MCP_PATH, baseURL).href,
    scopes: [MCP_SCOPE, "offline_access"],
  } satisfies McpOptions;
}

/**
 * For `cimd(...)`: clients such as Claude Code identify themselves by the HTTPS
 * URL of their metadata document instead of registering. The Node transport
 * pins the resolved public address and refuses redirects, so a client id
 * cannot point the server at an internal host.
 */
export const cimdOptions = {
  fetchClientMetadataResource,
  metadataProfile: "mcp-2026-07-28",
} satisfies CimdOptions;
