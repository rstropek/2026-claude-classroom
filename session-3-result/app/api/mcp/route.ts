import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { auth } from "@/lib/auth";
import { mcpResource, mcpScope } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { createTodoMcpServer, userIdFrom } from "@/lib/todo-mcp";

/**
 * Stateless Streamable HTTP: a fresh server per request, built for the user the
 * request's token names. The default `legacy: "stateless"` also answers
 * 2025-era clients (Claude Code on its v1 MCP runtime, for one), which the
 * tools need nothing session-bound to serve; GET and DELETE get its 405.
 */
const mcpHandler = createMcpHandler(({ authInfo }) =>
  createTodoMcpServer(db, userIdFrom(authInfo)),
);

/**
 * The token is a JWT from this app's /api/auth/oauth2/token, verified against
 * its JWKS for issuer, expiry, `aud` = this endpoint, and the `todos` scope.
 * Without one the answer is a 401 whose WWW-Authenticate points at
 * /.well-known/oauth-protected-resource/api/mcp, which starts the client's
 * OAuth flow. `sub` is always a user, because the provider issues no
 * client_credentials tokens, and it is the only user id the tools ever see.
 */
const handler = requireMcpAuth(
  auth,
  (request, claims) => {
    if (!claims.sub) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return mcpHandler.fetch(request, {
      authInfo: {
        // The tools never call anything with it, so it stays out of the SDK.
        token: "",
        clientId: String(claims.azp ?? claims.client_id ?? ""),
        scopes: String(claims.scope ?? "").split(" "),
        expiresAt: claims.exp,
        extra: { userId: claims.sub },
      },
    });
  },
  { resource: mcpResource(), requiredScopes: [mcpScope] },
);

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
