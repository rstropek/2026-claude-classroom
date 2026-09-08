import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";

export const auth = betterAuth({
  ...authOptions(db),
  // nextCookies mirrors Set-Cookie into next/headers, so it must stay last.
  plugins: [nextCookies()],
});
