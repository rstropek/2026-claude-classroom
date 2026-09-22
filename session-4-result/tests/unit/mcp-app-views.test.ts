// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import { readView } from "@/lib/mcp-app-views";

// The `server-only` package resolves to its throwing build outside Next.js;
// nothing here needs what it guards.
vi.mock("server-only", () => ({}));

// `readView` takes its directory, so this reads a throwaway file instead of
// the git-ignored build output, which a clean checkout does not have.
let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-mcp-app-views-"));
  await writeFile(join(dir, "todo-form.html"), "<!doctype html><p>form</p>");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

test("reads a built view", async () => {
  await expect(readView("todo-form", dir)).resolves.toContain("<p>form</p>");
});

test("an unbuilt view names the command that builds it", async () => {
  await expect(readView("missing", dir)).rejects.toThrow("npm run build:views");
});

test("a name that is not a view folder never reaches the filesystem", async () => {
  await expect(readView("../../lib/auth", dir)).rejects.toThrow(
    "Not an MCP App view name",
  );
});
