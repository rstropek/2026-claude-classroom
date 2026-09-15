import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Same-origin, so the client needs no baseURL. oauthProviderClient sends the
// page's signed OAuth query along with sign-in and consent calls, so a login
// started by an MCP client continues its authorization instead of landing on /.
export const authClient = createAuthClient({
  plugins: [deviceAuthorizationClient(), oauthProviderClient()],
});
