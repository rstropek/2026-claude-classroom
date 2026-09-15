import { auth } from "@/lib/auth";

/**
 * RFC 8414 metadata for the issuer `/api/auth`, at the path-inserted location
 * `/.well-known/oauth-authorization-server/api/auth` that MCP clients derive
 * from it. The `{issuer}/.well-known/...` form already reaches the auth
 * catch-all; this one lives outside it.
 */
export const GET = auth.handler;
