import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Same-origin, so the client needs no baseURL.
export const authClient = createAuthClient({
  plugins: [
    deviceAuthorizationClient(),
    // On /login and /consent reached from /oauth2/authorize, adds the signed
    // query to every POST so sign-in and consent continue the OAuth flow.
    oauthProviderClient(),
  ],
});
