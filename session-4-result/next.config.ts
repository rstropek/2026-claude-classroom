import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` holds a lock on `<distDir>/lock` and refuses to start a second
  // server for the same dist dir, so the Playwright dev server overrides this
  // to coexist with a dev server you already have running.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
