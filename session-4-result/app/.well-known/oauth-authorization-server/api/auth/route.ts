import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// RFC 8414 metadata for the issuer http(s)://<host>/api/auth, which clients
// fetch from the path-inserted location outside /api/auth.
export const { GET } = toNextJsHandler(auth);
