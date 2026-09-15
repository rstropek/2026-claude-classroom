import "server-only";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { bearer, deviceAuthorization, jwt } from "better-auth/plugins";
import {
  authOptions,
  cimdOptions,
  deviceAuthorizationOptions,
  mcpOptions,
  mcpResource,
} from "@/lib/auth-config";
import { db } from "@/lib/db";

export const auth = betterAuth({
  ...authOptions(db),
  plugins: [
    // Turns `Authorization: Bearer <session token>` into the session cookie
    // before any auth call, and hands sign-ins a `set-auth-token` header.
    bearer(),
    // /device/code, /device/token (a session token), and the approval endpoints.
    deviceAuthorization(deviceAuthorizationOptions),
    // The signing keys and /jwks that /api/mcp verifies access tokens against.
    jwt(),
    // /oauth2/*, the discovery documents, and the /consent redirect.
    mcp(mcpOptions(mcpResource())),
    // Lets an MCP client use its metadata URL as client_id without registering.
    cimd(cimdOptions),
    // nextCookies mirrors Set-Cookie into next/headers, so it must stay last.
    nextCookies(),
  ],
});
