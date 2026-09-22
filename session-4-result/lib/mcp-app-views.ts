import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Written by `npm run build:views` and git-ignored, so a fresh checkout that
// has not run the build yet has no such directory at all.
const viewsDir = join(process.cwd(), "mcp-apps", "dist");

/**
 * Reads one built MCP App view: the single self-contained HTML file that
 * `scripts/build-views.mjs` writes to mcp-apps/dist/<name>.html.
 *
 * `dir` is there for tests; everything else reads the project's own output.
 */
export async function readView(name: string, dir = viewsDir): Promise<string> {
  // The name reaches the filesystem, so allow only what a view folder may be
  // called — no dots and no separators, nothing that climbs out of dist.
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`Not an MCP App view name: ${name}`);
  }
  try {
    return await readFile(join(dir, `${name}.html`), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new Error(
      `MCP App view "${name}" is not built — run \`npm run build:views\``,
    );
  }
}
