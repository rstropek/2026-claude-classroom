import type { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { mcp } from "@better-auth/mcp";
import { cliClientId } from "ai-tutor-contract";
import type { BetterAuthOptions } from "better-auth";
import type { deviceAuthorization } from "better-auth/plugins";
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
    // jwt()'s /token mints a JWT for any session; access tokens come from
    // /oauth2/token instead, as the OAuth provider docs prescribe.
    disabledPaths: ["/token"],
  } satisfies BetterAuthOptions;
}

/**
 * The CLI's login: codes are issued to the CLI's client id only, and approved
 * on app/device by a signed-in user. Shared by lib/auth.ts and lib/auth-cli.ts
 * so `auth:generate` sees the `deviceCode` table.
 */
export const deviceAuthorizationOptions = {
  verificationUri: "/device",
  validateClient: (clientId) => clientId === cliClientId,
} satisfies Parameters<typeof deviceAuthorization>[0];

/** The one scope a token needs on /api/mcp: read and change the todo list. */
export const mcpScope = "todos";

/**
 * The MCP endpoint's RFC 8707 resource identifier, which issued tokens carry as
 * `aud` and /api/mcp requires. Derived from BETTER_AUTH_URL rather than the
 * request, so a token is only ever accepted for the URL it was issued for.
 */
export function mcpResource(baseURL = process.env.BETTER_AUTH_URL) {
  if (!baseURL) {
    throw new Error(
      "BETTER_AUTH_URL must be set: /api/mcp binds its access tokens to it.",
    );
  }
  return new URL("/api/mcp", baseURL).href;
}

/**
 * The OAuth 2.1 provider behind /api/mcp. Only user-delegated grants: without
 * `client_credentials` every access token has a user as its `sub`.
 */
export const mcpOptions = (resource: string) =>
  ({
    resource,
    loginPage: "/login",
    consentPage: "/consent",
    scopes: [mcpScope, "offline_access"],
    grantTypes: ["authorization_code", "refresh_token"],
  }) satisfies Parameters<typeof mcp>[0];

/**
 * Client ID Metadata Documents instead of registration: a client's `client_id`
 * is the HTTPS URL of its metadata, which the Node transport fetches with
 * DNS pinning and no redirects.
 */
export const cimdOptions = {
  fetchClientMetadataResource,
  metadataProfile: "mcp-2026-07-28",
} satisfies Parameters<typeof cimd>[0];
