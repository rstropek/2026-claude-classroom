// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RequestContext } from "@mastra/core/request-context";
import type { ValidationError } from "@mastra/core/tools";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";

import * as schema from "@/lib/schema";
import { todos, user } from "@/lib/schema";
import { createTodoTools, tutorRequestContext } from "@/lib/todo-tools";

// The executors take their db, so this runs the real statements against a
// throwaway file instead of data/app.db.
let dir: string;
let db: ReturnType<typeof drizzle<typeof schema>>;
let tools: ReturnType<typeof createTodoTools>;

const ada = tutorRequestContext("user-ada");
const grace = tutorRequestContext("user-grace");

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-todo-tools-"));
  db = drizzle({ connection: { url: `file:${join(dir, "test.db")}` }, schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  tools = createTodoTools(db);

  // todos.userId is a FK onto the Better Auth user table.
  await db.insert(user).values([
    { id: "user-ada", name: "Ada", email: "ada@example.com" },
    { id: "user-grace", name: "Grace", email: "grace@example.com" },
  ]);
});

afterAll(async () => {
  db.$client.close();
  await rm(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(todos);
});

/**
 * `createTool` types `execute` as optional, unions the requestContext
 * validation error into its result, and expects the rest of the execution
 * context the runtime fills in. One cast here keeps every assertion below
 * plain, and still runs the real executor.
 */
const run = <I, O>(
  tool: {
    // biome-ignore lint/suspicious/noConfusingVoidType: mirrors createTool's own execute signature
    execute?: (input: I, context: never) => Promise<O | ValidationError | void>;
  },
  input: I,
  requestContext: RequestContext,
) => tool.execute?.(input, { requestContext } as never) as Promise<O>;

const titles = (result: { todos: { title: string }[] }) =>
  result.todos.map((todo) => todo.title).sort();

test("addTodo writes the item against the context's user", async () => {
  const { todo } = await run(tools.addTodo, { title: "  Buy milk  " }, ada);

  expect(todo).toEqual({
    id: expect.any(String),
    title: "Buy milk",
    done: false,
  });

  const rows = await db.select().from(todos);
  expect(rows.map((row) => row.userId)).toEqual(["user-ada"]);
});

test("listTodos returns only the context's own items", async () => {
  await run(tools.addTodo, { title: "Ada one" }, ada);
  await run(tools.addTodo, { title: "Ada two" }, ada);
  await run(tools.addTodo, { title: "Grace one" }, grace);

  expect(titles(await run(tools.listTodos, {}, ada))).toEqual([
    "Ada one",
    "Ada two",
  ]);
  expect(titles(await run(tools.listTodos, {}, grace))).toEqual(["Grace one"]);
});

test("setTodoDone completes an item and can reopen it", async () => {
  const { todo } = await run(tools.addTodo, { title: "Buy milk" }, ada);

  await expect(
    run(tools.setTodoDone, { id: todo.id, done: true }, ada),
  ).resolves.toEqual({ todo: { id: todo.id, title: "Buy milk", done: true } });

  await expect(
    run(tools.setTodoDone, { id: todo.id, done: false }, ada),
  ).resolves.toEqual({ todo: { id: todo.id, title: "Buy milk", done: false } });
});

test("setTodoDone cannot reach another student's item", async () => {
  const { todo } = await run(tools.addTodo, { title: "Ada's errand" }, ada);

  // Grace has the id — the tools still treat it as no such item.
  await expect(
    run(tools.setTodoDone, { id: todo.id, done: true }, grace),
  ).resolves.toEqual({ todo: null });

  const [row] = await db.select().from(todos);
  expect(row.done).toBe(false);
});

test("the user id comes from the context, never from the tool's input", async () => {
  // What a prompt-injected model would try: name someone else in the arguments.
  await run(
    tools.addTodo,
    { title: "Planted", userId: "user-grace", id: "forged" } as {
      title: string;
    },
    ada,
  );

  const rows = await db.select().from(todos);
  expect(rows).toHaveLength(1);
  expect(rows[0].userId).toBe("user-ada");
  expect(rows[0].id).not.toBe("forged");
});

test("an execution without a user id is refused rather than run", async () => {
  const result: unknown = await run(
    tools.setTodoDone,
    { id: "anything", done: true },
    new RequestContext(),
  );

  expect(result).toMatchObject({ error: true });
  expect(await db.select().from(todos)).toEqual([]);
});
