import { auth } from "@/lib/auth";

/**
 * RFC 9728 metadata for /api/mcp. The mcp() plugin serves it from auth.handler
 * for any request path, but the auth catch-all only receives /api/auth/*, so
 * this forwards both the root document and the `/api/mcp` path-inserted one
 * that the 401 challenge names.
 */
export const GET = auth.handler;
