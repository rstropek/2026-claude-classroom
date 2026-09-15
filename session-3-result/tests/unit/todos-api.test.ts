// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  errorResponseSchema,
  listTodosResponseSchema,
  todoResponseSchema,
} from "ai-tutor-contract";
import { betterAuth } from "better-auth";
import { type TestHelpers, testUtils } from "better-auth/plugins";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { authOptions } from "@/lib/auth-config";
import * as schema from "@/lib/schema";
import { todos } from "@/lib/schema";

// The real route modules run against a throwaway file: lib/db.ts and lib/auth.ts
// read DATABASE_URL and BETTER_AUTH_SECRET on import, and `server-only` would
// otherwise resolve to its throwing build.
vi.mock("server-only", () => ({}));

const secret = "test-secret-at-least-32-characters-long";
const baseURL = "http://localhost:3000";

let dir: string;
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let helpers: TestHelpers;
let routes: typeof import("@/app/api/todos/route");
let itemRoute: typeof import("@/app/api/todos/[id]/route");

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-todos-api-"));
  const url = `file:${join(dir, "test.db")}`;
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("BETTER_AUTH_SECRET", secret);
  vi.stubEnv("BETTER_AUTH_URL", baseURL);

  testDb = drizzle({ connection: { url }, schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });

  // Only mints users and sessions; the routes verify them with lib/auth.ts.
  const testAuth = betterAuth({
    ...authOptions(testDb),
    secret,
    baseURL,
    plugins: [testUtils()],
  });
  helpers = (await testAuth.$context).test;

  routes = await import("@/app/api/todos/route");
  itemRoute = await import("@/app/api/todos/[id]/route");
});

afterAll(async () => {
  (await import("@/lib/db")).db.$client.close();
  testDb.$client.close();
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

const request = (
  path: string,
  init: { method?: string; headers?: HeadersInit; body?: unknown } = {},
) =>
  new Request(new URL(path, baseURL), {
    method: init.method,
    headers: init.headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

const itemContext = (id: string) => ({ params: Promise.resolve({ id }) });

async function newUser() {
  const user = await helpers.saveUser(helpers.createUser());
  return helpers.login({ userId: user.id });
}

async function expectUnauthorized(response: Response) {
  expect(response.status).toBe(401);
  expect(errorResponseSchema.parse(await response.json())).toEqual({
    error: "unauthorized",
  });
}

describe("without a bearer token", () => {
  test("GET /api/todos is refused", async () => {
    await expectUnauthorized(await routes.GET(request("/api/todos")));
  });

  test("POST /api/todos is refused and writes nothing", async () => {
    await expectUnauthorized(
      await routes.POST(
        request("/api/todos", { method: "POST", body: { title: "Nope" } }),
      ),
    );
    expect(await testDb.select().from(todos)).toEqual([]);
  });

  test("PATCH /api/todos/:id is refused", async () => {
    await expectUnauthorized(
      await itemRoute.PATCH(
        request("/api/todos/any", { method: "PATCH", body: { done: true } }),
        itemContext("any"),
      ),
    );
  });
});

test("the session cookie still reads the list but cannot write to it", async () => {
  const { headers } = await newUser();

  const list = await routes.GET(request("/api/todos", { headers }));
  expect(list.status).toBe(200);
  expect(listTodosResponseSchema.parse(await list.json())).toEqual({
    todos: [],
  });

  await expectUnauthorized(
    await routes.POST(
      request("/api/todos", {
        method: "POST",
        headers,
        body: { title: "Forged" },
      }),
    ),
  );
});

test("a bearer token adds, lists, completes, and filters the user's todos", async () => {
  const { token } = await newUser();
  const headers = { authorization: `Bearer ${token}` };

  const created = await routes.POST(
    request("/api/todos", {
      method: "POST",
      headers,
      body: { title: "  Buy milk  " },
    }),
  );
  expect(created.status).toBe(201);
  const { todo } = todoResponseSchema.parse(await created.json());
  expect(todo).toEqual({
    id: expect.any(String),
    title: "Buy milk",
    done: false,
  });

  // A second item, so the filter below has something to leave out.
  await routes.POST(
    request("/api/todos", {
      method: "POST",
      headers,
      body: { title: "Call Grace" },
    }),
  );

  const listed = await routes.GET(request("/api/todos", { headers }));
  expect(listTodosResponseSchema.parse(await listed.json()).todos).toEqual([
    todo,
    { id: expect.any(String), title: "Call Grace", done: false },
  ]);

  const updated = await itemRoute.PATCH(
    request(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers,
      body: { done: true },
    }),
    itemContext(todo.id),
  );
  expect(updated.status).toBe(200);
  expect(todoResponseSchema.parse(await updated.json())).toEqual({
    todo: { ...todo, done: true },
  });

  const filtered = await routes.GET(request("/api/todos?q=MILK", { headers }));
  expect(listTodosResponseSchema.parse(await filtered.json())).toEqual({
    todos: [{ ...todo, done: true }],
  });
});
