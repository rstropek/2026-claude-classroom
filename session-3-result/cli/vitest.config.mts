import { defineConfig } from "vitest/config";

export default defineConfig({
  // The tests borrow the web app's auth config, which imports through `@/*`.
  resolve: { tsconfigPaths: true },
  test: {
    name: "cli",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Builds the CLI and starts the one `next dev` that every test file shares.
    globalSetup: ["tests/global-setup.ts"],
    // Starting `next dev` and compiling the auth and todo routes on first hit.
    hookTimeout: 180_000,
    // login waits out at least one polling interval (5s).
    testTimeout: 60_000,
  },
});
