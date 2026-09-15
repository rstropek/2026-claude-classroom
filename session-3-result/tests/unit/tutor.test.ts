// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

// The `server-only` package resolves to its throwing build outside Next.js;
// nothing here needs what it guards.
vi.mock("server-only", () => ({}));

// Importing lib/tutor opens a libSQL store, so point it at a throwaway file
// rather than data/app.db. No model call happens on import.
let dir: string;

const importTutor = async () => (await import("@/lib/tutor")).mastra;
const cachedStore = () =>
  (globalThis as { tutorStorage?: unknown }).tutorStorage;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-tutor-"));
  vi.stubEnv("DATABASE_URL", `file:${join(dir, "test.db")}`);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

test("a dev hot reload rebuilds the agent but keeps the connection", async () => {
  vi.stubEnv("NODE_ENV", "development");

  vi.resetModules();
  const first = await importTutor();
  const store = cachedStore();

  // What `next dev` does on every save.
  vi.resetModules();
  const second = await importTutor();

  expect(second).not.toBe(first);
  expect(cachedStore()).toBe(store);
  expect(store).toBeDefined();
});

test("production keeps the one instance", async () => {
  vi.stubEnv("NODE_ENV", "production");

  vi.resetModules();
  const first = await importTutor();
  vi.resetModules();
  const second = await importTutor();

  expect(second).toBe(first);
});
