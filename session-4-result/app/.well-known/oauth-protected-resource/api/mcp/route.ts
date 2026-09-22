import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// RFC 9728 metadata for /api/mcp, where its 401 challenge points. The MCP
// plugin answers this path itself; it only lies outside /api/auth.
export const { GET } = toNextJsHandler(auth);
