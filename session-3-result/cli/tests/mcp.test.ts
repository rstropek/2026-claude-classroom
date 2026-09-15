import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import type { TestHelpers } from "better-auth/plugins";
import { afterAll, beforeAll, expect, inject, test, vi } from "vitest";
import { saveCredential } from "../src/credentials";
import { bin, createConfigDir, testAuth } from "./harness";

/**
 * Talks to `ai-tutor mcp --stdio` the way an MCP host does, against the
 * `next dev` that global-setup.ts started.
 */

const baseURL = inject("baseURL");
let configDir: string;
let helpers: TestHelpers;
let closeAuth: () => void;
let client: Client;
let stdoutCopy: string;
let stderr = "";

/** A tool result's single text block, whether it carries data or an error. */
function text(result: Awaited<ReturnType<Client["callTool"]>>) {
  expect(result.content).toHaveLength(1);
  const [block] = result.content;
  return block.type === "text" ? block.text : "";
}

beforeAll(async () => {
  configDir = await createConfigDir();
  ({ helpers, close: closeAuth } = await testAuth());
  // saveCredential resolves the config dir from process.env.
  vi.stubEnv("AI_TUTOR_CONFIG_DIR", configDir);

  stdoutCopy = join(configDir, "mcp-stdout.jsonl");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      join(import.meta.dirname, "stdout-tap.mjs"),
      stdoutCopy,
      bin,
      "mcp",
      "--stdio",
    ],
    env: {
      ...(process.env as Record<string, string>),
      AI_TUTOR_URL: baseURL,
      AI_TUTOR_CONFIG_DIR: configDir,
    },
    stderr: "pipe",
  });
  transport.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  client = new Client({ name: "ai-tutor-mcp-test", version: "0.0.0" });
  await client.connect(transport);
});

afterAll(async () => {
  await client?.close();
  closeAuth?.();
  vi.unstubAllEnvs();
});

test("lists the todo tools with input schemas from the contract", async () => {
  const { tools } = await client.listTools();
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

  expect(Object.keys(byName).sort()).toEqual([
    "add_todo",
    "list_todos",
    "mark_todo_done",
  ]);
  expect(byName.list_todos.inputSchema).toMatchObject({
    type: "object",
    properties: { q: { type: "string", minLength: 1 } },
  });
  expect(byName.list_todos.inputSchema.required ?? []).toEqual([]);
  expect(byName.list_todos.annotations?.readOnlyHint).toBe(true);
  expect(byName.add_todo.inputSchema).toMatchObject({
    properties: { title: { type: "string", minLength: 1 } },
    required: ["title"],
  });
  expect(byName.mark_todo_done.inputSchema).toMatchObject({
    properties: { id: { type: "string", minLength: 1 } },
    required: ["id"],
  });
});

test("without a login every tool says to run ai-tutor login", async () => {
  for (const [name, args] of [
    ["list_todos", {}],
    ["add_todo", { title: "Buy milk" }],
    ["mark_todo_done", { id: "no-such-id" }],
  ] as const) {
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError, name).toBe(true);
    expect(text(result), name).toContain("ai-tutor login");
  }
});

test("add, list, and done once a login is stored, without a restart", async () => {
  const user = await helpers.saveUser(
    helpers.createUser({
      name: "Grace Hopper",
      email: `grace-${Date.now()}@example.com`,
    }),
  );
  const { token } = await helpers.login({ userId: user.id });
  await saveCredential(baseURL, {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });

  const milk = await client.callTool({
    name: "add_todo",
    arguments: { title: "  Buy milk " },
  });
  expect(milk.isError, text(milk)).toBeFalsy();
  const milkTodo = (milk.structuredContent as { todo: { id: string } }).todo;
  expect(milk.structuredContent).toEqual({
    todo: { id: expect.any(String), title: "Buy milk", done: false },
  });
  expect(JSON.parse(text(milk))).toEqual(milk.structuredContent);

  const debug = await client.callTool({
    name: "add_todo",
    arguments: { title: "Find the moth" },
  });
  expect(debug.isError, text(debug)).toBeFalsy();

  const filtered = await client.callTool({
    name: "list_todos",
    arguments: { q: "MOTH" },
  });
  expect(filtered.isError, text(filtered)).toBeFalsy();
  expect(filtered.structuredContent).toEqual({
    todos: [{ id: expect.any(String), title: "Find the moth", done: false }],
  });

  const done = await client.callTool({
    name: "mark_todo_done",
    arguments: { id: milkTodo.id },
  });
  expect(done.isError, text(done)).toBeFalsy();
  expect(done.structuredContent).toEqual({
    todo: { id: milkTodo.id, title: "Buy milk", done: true },
  });

  const all = await client.callTool({ name: "list_todos", arguments: {} });
  expect(all.structuredContent).toEqual({
    todos: [
      { id: milkTodo.id, title: "Buy milk", done: true },
      { id: expect.any(String), title: "Find the moth", done: false },
    ],
  });

  const unknown = await client.callTool({
    name: "mark_todo_done",
    arguments: { id: "no-such-id" },
  });
  expect(unknown.isError).toBe(true);
  expect(text(unknown)).toContain("No todo with that id");

  const empty = await client.callTool({
    name: "add_todo",
    arguments: { title: "   " },
  });
  expect(empty.isError).toBe(true);

  for (const output of [
    stderr,
    ...[milk, debug, filtered, done, all, unknown].map(text),
  ]) {
    expect(output).not.toContain(token);
  }
});

test("exits when stdin closes, having written nothing but MCP messages", async () => {
  // The SDK ends stdin and only sends SIGTERM once 2s have passed without exit.
  const closing = Date.now();
  await client.close();
  expect(Date.now() - closing).toBeLessThan(2000);

  const lines = (await readFile(stdoutCopy, "utf8")).split("\n");
  expect(lines.pop()).toBe("");
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) {
    expect(() => JSON.parse(line), line).not.toThrow();
    expect(JSON.parse(line), line).toMatchObject({ jsonrpc: "2.0" });
  }
  expect(stderr).toBe("");
});
