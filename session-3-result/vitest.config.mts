import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        // Native replacement for vite-tsconfig-paths; resolves the `@/*` alias.
        resolve: { tsconfigPaths: true },
        test: {
          name: "web",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["tests/unit/**/*.test.{ts,tsx}"],
        },
      },
      // Its own vitest.config.mts: an end-to-end run against a live server.
      "cli",
    ],
  },
});
