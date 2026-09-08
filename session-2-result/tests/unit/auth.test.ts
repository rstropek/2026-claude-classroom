// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { betterAuth } from "better-auth";
import { type TestHelpers, testUtils } from "better-auth/plugins";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import { afterAll, beforeAll, expect, test } from "vitest";

import { authOptions } from "@/lib/auth-config";

// The production instance in lib/auth.ts is `server-only` and bound to
// DATABASE_URL, so this builds the same options over a throwaway file and adds
// testUtils — the plugin array stays a literal so `ctx.test` keeps its types.
let dir: string;
let db: ReturnType<typeof drizzle>;
let auth: ReturnType<typeof createTestAuth>;
let helpers: TestHelpers;

const password = "correct-horse-battery";

function createTestAuth(database: ReturnType<typeof drizzle>) {
  return betterAuth({
    ...authOptions(database),
    secret: "test-secret-at-least-32-characters-long",
    baseURL: "http://localhost:3000",
    plugins: [testUtils()],
  });
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-auth-"));
  db = drizzle({ connection: { url: `file:${join(dir, "auth.db")}` } });
  await migrate(db, { migrationsFolder: "./drizzle" });

  auth = createTestAuth(db);
  helpers = (await auth.$context).test;
});

afterAll(async () => {
  db.$client.close();
  await rm(dir, { recursive: true, force: true });
});

test("sign-up creates the user", async () => {
  const result = await auth.api.signUpEmail({
    body: { name: "Ada Lovelace", email: "ada@example.com", password },
  });

  expect(result.user).toMatchObject({
    name: "Ada Lovelace",
    email: "ada@example.com",
  });
});

test("the correct password signs in and yields a usable session", async () => {
  const result = await auth.api.signInEmail({
    body: { email: "ada@example.com", password },
  });

  expect(result.user.email).toBe("ada@example.com");

  const session = await auth.api.getSession({
    headers: await helpers.getAuthHeaders({ userId: result.user.id }),
  });
  expect(session?.user.id).toBe(result.user.id);
});

test("the wrong password is rejected", async () => {
  await expect(
    auth.api.signInEmail({
      body: { email: "ada@example.com", password: "not-the-password" },
    }),
  ).rejects.toThrow();
});
