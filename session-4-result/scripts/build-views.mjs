/**
 * Builds every MCP App view under mcp-apps/<name>/index.html into ONE
 * self-contained file at mcp-apps/dist/<name>.html.
 *
 * Single file is the requirement, not a preference: the host serves a view
 * from a `ui://` resource into a sandboxed iframe with a default-deny CSP, so
 * the page never gets a second request. Anything not inlined is simply gone.
 */
import { existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const ROOT = join(import.meta.dirname, "..", "mcp-apps");
const OUT = join(ROOT, "dist");

/** @returns {string[]} every folder under mcp-apps/ that has an index.html. */
function findViews() {
  if (!existsSync(ROOT)) return [];
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "dist")
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(ROOT, name, "index.html")));
}

const views = findViews();
if (views.length === 0) {
  console.log("no MCP App views under mcp-apps/ — nothing to build");
  process.exit(0);
}

// Once, here: a view whose folder is gone would otherwise keep being served
// from a stale bundle, and the builds below write into this same directory.
rmSync(OUT, { recursive: true, force: true });

for (const view of views) {
  await build({
    // The JS API without a config file on purpose: a vite.config.* at the
    // repository root would also be picked up by Vitest, which has its own.
    configFile: false,
    root: join(ROOT, view),
    plugins: [viteSingleFile()],
    logLevel: "warn",
    build: {
      outDir: OUT,
      // One build per view rather than one build over all of them: several
      // inputs in one Rollup build emit shared chunks that the pages then
      // *import*, and an import is the second request the sandbox never makes.
      emptyOutDir: false,
      rollupOptions: { input: join(ROOT, view, "index.html") },
    },
  });
  // Vite names the entry after its source file, so every view arrives as
  // index.html; give it the view's own name.
  renameSync(join(OUT, "index.html"), join(OUT, `${view}.html`));
  // The plugin inlines the assets but Vite still writes the originals.
  rmSync(join(OUT, "assets"), { recursive: true, force: true });
  console.log(`built mcp-apps/dist/${view}.html`);
}
