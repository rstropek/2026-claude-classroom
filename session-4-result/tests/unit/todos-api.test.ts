// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ApiError,
  ListTodosResponse,
  TodoResponse,
} from "ai-tutor-api-contract";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { authOptions } from "@/lib/auth-config";

// The routes import lib/auth and lib/db, which are `server-only` and read their
// configuration from the environment, so they run for real against a throwaway
// file. A second Better Auth instance on that file carries testUtils to mint
// sessions; sharing the secret is what lets the routes' instance verify them.
vi.mock("server-only", () => ({}));

const secret = "test-secret-at-least-32-characters-long";
const baseURL = "http://localhost:3000";

let dir: string;
let db: ReturnType<typeof drizzle>;
let routes: typeof import("@/app/api/todos/route");
let itemRoute: typeof import("@/app/api/todos/[id]/route");

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-todos-api-"));
  const url = `file:${join(dir, "test.db")}`;
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("BETTER_AUTH_SECRET", secret);
  vi.stubEnv("BETTER_AUTH_URL", baseURL);

  db = drizzle({ connection: { url } });
  await migrate(db, { migrationsFolder: "./drizzle" });

  routes = await import("@/app/api/todos/route");
  itemRoute = await import("@/app/api/todos/[id]/route");
});

afterAll(async () => {
  db.$client.close();
  (globalThis as { db?: typeof db }).db?.$client.close();
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

const request = (
  path: string,
  init: { method?: string; token?: string; body?: unknown } = {},
) =>
  new Request(`${baseURL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.token && { authorization: `Bearer ${init.token}` }),
      ...(init.body !== undefined && { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("without a bearer token", () => {
  test("GET /api/todos is 401", async () => {
    const response = await routes.GET(request("/api/todos"));

    expect(response.status).toBe(401);
    expect(ApiError.parse(await response.json())).toEqual({
      error: "unauthorized",
    });
  });

  test("POST /api/todos is 401", async () => {
    const response = await routes.POST(
      request("/api/todos", { method: "POST", body: { title: "Buy milk" } }),
    );

    expect(response.status).toBe(401);
  });

  test("PATCH /api/todos/:id is 401", async () => {
    const response = await itemRoute.PATCH(
      request("/api/todos/anything", { method: "PATCH", body: { done: true } }),
      params("anything"),
    );

    expect(response.status).toBe(401);
  });
});

test("a minted token adds, lists, completes, and filters an item", async () => {
  const testAuth = betterAuth({
    ...authOptions(db),
    secret,
    baseURL,
    plugins: [testUtils()],
  });
  const helpers = (await testAuth.$context).test;
  const user = await helpers.saveUser(helpers.createUser());

  // The signed session token, i.e. what sign-in's `set-auth-token` header
  // carries; the bearer plugin is configured to refuse the unsigned one.
  const { cookies } = await helpers.login({ userId: user.id });
  const token = cookies[0].value;

  const created = await routes.POST(
    request("/api/todos", {
      method: "POST",
      token,
      body: { title: "  Buy milk  " },
    }),
  );
  expect(created.status).toBe(201);
  const { todo } = TodoResponse.parse(await created.json());
  expect(todo).toEqual({
    id: expect.any(String),
    title: "Buy milk",
    done: false,
  });

  await routes.POST(
    request("/api/todos", {
      method: "POST",
      token,
      body: { title: "Call Bob" },
    }),
  );

  const listed = await routes.GET(request("/api/todos", { token }));
  expect(listed.status).toBe(200);
  expect(ListTodosResponse.parse(await listed.json()).todos).toHaveLength(2);

  const updated = await itemRoute.PATCH(
    request(`/api/todos/${todo.id}`, {
      method: "PATCH",
      token,
      body: { done: true },
    }),
    params(todo.id),
  );
  expect(updated.status).toBe(200);
  expect(TodoResponse.parse(await updated.json()).todo.done).toBe(true);

  const filtered = await routes.GET(request("/api/todos?q=MILK", { token }));
  expect(ListTodosResponse.parse(await filtered.json())).toEqual({
    todos: [{ id: todo.id, title: "Buy milk", done: true }],
  });
});
