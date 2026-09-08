import { createAuthClient } from "better-auth/react";

// Same-origin, so the client needs no baseURL.
export const authClient = createAuthClient();
