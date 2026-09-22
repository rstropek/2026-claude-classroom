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
} from "@/lib/auth-config";
import { db } from "@/lib/db";

export const auth = betterAuth({
  ...authOptions(db),
  plugins: [
    // `Authorization: Bearer <session token>` for API clients, which read the
    // token from sign-in's `set-auth-token` header. requireSignature rejects
    // the raw token as stored in the session table, same as the cookie does.
    bearer({ requireSignature: true }),
    // The `ai-tutor login` device flow; approved at app/device.
    deviceAuthorization(deviceAuthorizationOptions),
    // Signing keys and /jwks for the OAuth access tokens /api/mcp verifies.
    jwt(),
    // OAuth authorization server for /api/mcp; consent at app/consent.
    mcp(mcpOptions(process.env.BETTER_AUTH_URL)),
    // Client ID Metadata Documents, so MCP clients need no registration.
    cimd(cimdOptions),
    // nextCookies mirrors Set-Cookie into next/headers, so it must stay last.
    nextCookies(),
  ],
});
