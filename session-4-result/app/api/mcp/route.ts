import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { auth } from "@/lib/auth";
import { MCP_SCOPE, mcpOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { createTodoMcpServer } from "@/lib/mcp-server";

const { resource } = mcpOptions(process.env.BETTER_AUTH_URL);

/**
 * One fresh server per request, for whichever user the route verified. The
 * default `legacy: "stateless"` also answers 2025-era clients, such as Claude
 * Code on its MCP SDK 1.x runtime, which a `legacy: "reject"` endpoint would
 * turn away.
 */
const mcpHandler = createMcpHandler(({ authInfo }) => {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string") {
    throw new Error("createTodoMcpServer needs a verified user id");
  }
  return createTodoMcpServer(db, userId);
});

/**
 * No token, or one that fails signature, issuer, audience, or expiry checks
 * against /api/auth/jwks, gets a 401 whose `WWW-Authenticate` points at
 * /.well-known/oauth-protected-resource/api/mcp, which starts the client's
 * OAuth flow. The user id is the token's `sub` and nothing else: the request
 * body and headers never reach the tool server's constructor.
 */
export const POST = requireMcpAuth(
  auth,
  (request, claims) =>
    mcpHandler.fetch(request, {
      authInfo: {
        token: "",
        clientId: String(claims.azp ?? claims.client_id ?? ""),
        scopes: String(claims.scope ?? "").split(" "),
        expiresAt: claims.exp,
        extra: { userId: claims.sub },
      },
    }),
  { resource, requiredScopes: [MCP_SCOPE] },
);
