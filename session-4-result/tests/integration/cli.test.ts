// @vitest-environment node
import { type ChildProcess, execFile, spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { ListTodosResponse, TodoResponse } from "ai-tutor-api-contract";
import { betterAuth } from "better-auth";
import { deviceAuthorization, testUtils } from "better-auth/plugins";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import { afterAll, beforeAll, expect, test } from "vitest";

import { authOptions, deviceAuthorizationOptions } from "@/lib/auth-config";

// Drives the built `ai-tutor` binary against a real `next dev` on a spare port,
// over a throwaway database and config directory. The browser half of the
// device flow is played by a second Better Auth instance on the same file:
// testUtils mints a session for it, and the shared secret is what lets the
// server verify whatever that instance signs.

const root = process.cwd();
const secret = "cli-test-secret-at-least-32-characters-long";

let dir: string;
let baseURL: string;
let server: ChildProcess;
let serverLog = "";
let db: ReturnType<typeof drizzle>;
let testAuth: ReturnType<typeof createTestAuth>;

function createTestAuth(database: ReturnType<typeof drizzle>) {
  return betterAuth({
    ...authOptions(database),
    secret,
    baseURL,
    plugins: [deviceAuthorization(deviceAuthorizationOptions), testUtils()],
  });
}

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() =>
        typeof address === "object" && address
          ? resolve(address.port)
          : reject(new Error("no port")),
      );
    });
  });
}

async function waitForServer(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) break;
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not listening yet
    }
    await sleep(500);
  }
  throw new Error(`next dev did not come up on ${url}:\n${serverLog}`);
}

const cliEnv = () => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    AI_TUTOR_URL: baseURL,
    XDG_CONFIG_HOME: join(dir, "config"),
    HOME: join(dir, "home"),
  };
  delete env.AI_TUTOR_CONFIG_DIR;
  return env;
};
const hostsFile = () => join(dir, "config", "ai-tutor", "hosts.json");

/** Everything any CLI run wrote, to prove the token never appears in it. */
let transcript = "";

function startCli(args: string[]) {
  const child = spawn(
    process.execPath,
    [join(root, "cli/bin/ai-tutor.js"), ...args],
    { env: cliEnv(), stdio: ["ignore", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const done = new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolve) =>
    child.on("close", (code) => {
      transcript += stdout + stderr;
      resolve({ code, stdout, stderr });
    }),
  );
  return {
    stdout: () => stdout,
    exited: () => child.exitCode !== null && `${stdout}${stderr}`,
    done,
  };
}

const cli = (...args: string[]) => startCli(args).done;

/** Runs `ai-tutor login`, approving the code as `userId` the way a browser would. */
async function loginAs(userId: string) {
  const helpers = (await testAuth.$context).test;
  const login = startCli(["login"]);
  let userCode: string | undefined;
  while (!userCode) {
    userCode = /one-time code: (\S+)/.exec(login.stdout())?.[1];
    const exited = login.exited();
    if (exited !== false) throw new Error(`login exited early:\n${exited}`);
    if (!userCode) await sleep(100);
  }
  expect(login.stdout()).toContain(
    `${baseURL}/device?user_code=${userCode.replace("-", "")}`,
  );
  const headers = await helpers.getAuthHeaders({ userId });
  // Verifying claims the code for this session; only then may it approve.
  await testAuth.api.deviceVerify({ query: { user_code: userCode }, headers });
  await testAuth.api.deviceApprove({ body: { userCode }, headers });
  return login.done;
}

beforeAll(async () => {
  await promisify(execFile)("npm", ["run", "build", "-w", "ai-tutor-cli"], {
    cwd: root,
  });

  dir = await mkdtemp(join(tmpdir(), "ai-tutor-cli-"));
  const url = `file:${join(dir, "app.db")}`;
  db = drizzle({ connection: { url } });
  await migrate(db, { migrationsFolder: "./drizzle" });

  baseURL = `http://localhost:${await freePort()}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // Vitest's NODE_ENV=test would make `next dev` warn about a non-standard value.
    NODE_ENV: "development",
    DATABASE_URL: url,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: baseURL,
    // Its own dist dir, so it can run beside `npm run dev` and Playwright's.
    NEXT_DIST_DIR: ".next-cli-test",
  };
  server = spawn(
    join(root, "node_modules/.bin/next"),
    ["dev", "--port", new URL(baseURL).port],
    {
      cwd: root,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (chunk) => {
    serverLog += chunk;
  });
  server.stderr?.on("data", (chunk) => {
    serverLog += chunk;
  });
  await waitForServer(`${baseURL}/api/auth/ok`, 120_000);

  testAuth = createTestAuth(db);
}, 180_000);

afterAll(async () => {
  if (server?.pid && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    // Detached, so the whole group goes, including next dev's worker.
    process.kill(-server.pid, "SIGTERM");
    await exited;
  }
  db?.$client.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});

test("login, whoami, add, list, done, logout, whoami again", async () => {
  const helpers = (await testAuth.$context).test;
  const user = await helpers.saveUser(
    helpers.createUser({ name: "Ada Lovelace", email: "ada@example.com" }),
  );

  const loggedIn = await loginAs(user.id);
  expect(loggedIn.stderr).toBe("");
  expect(loggedIn.code).toBe(0);
  expect(loggedIn.stdout).toContain("Logged in");
  expect(loggedIn.stdout).toContain("ada@example.com");

  // The token file is owner-only, inside the redirected config directory.
  expect((await stat(hostsFile())).mode & 0o777).toBe(0o600);
  expect((await stat(join(dir, "config", "ai-tutor"))).mode & 0o777).toBe(
    0o700,
  );
  const token = JSON.parse(await readFile(hostsFile(), "utf8"))[baseURL]
    .token as string;
  expect(token).toContain(".");

  const whoami = await cli("whoami", "--json");
  expect(whoami.code).toBe(0);
  expect(JSON.parse(whoami.stdout)).toEqual({
    server: baseURL,
    user: { id: user.id, name: "Ada Lovelace", email: "ada@example.com" },
  });

  const added = await cli("add", "Buy milk", "--json");
  expect(added.code).toBe(0);
  const { todo } = TodoResponse.parse(JSON.parse(added.stdout));
  expect(todo).toMatchObject({ title: "Buy milk", done: false });

  const other = await cli("add", "Call Bob");
  expect(other.code).toBe(0);
  expect(other.stdout).toMatch(/\t\[ \]\tCall Bob\n$/);

  const filtered = await cli("list", "--query", "MILK", "--json");
  expect(filtered.code).toBe(0);
  expect(ListTodosResponse.parse(JSON.parse(filtered.stdout))).toEqual({
    todos: [todo],
  });

  const done = await cli("done", todo.id);
  expect(done.code).toBe(0);
  expect(done.stdout).toBe(`${todo.id}\t[x]\tBuy milk\n`);

  const listed = await cli("list");
  expect(listed.code).toBe(0);
  expect(listed.stdout.trimEnd().split("\n")).toEqual([
    `${todo.id}\t[x]\tBuy milk`,
    expect.stringMatching(/\t\[ \]\tCall Bob$/),
  ]);

  const missing = await cli("done", "no-such-id");
  expect(missing.code).toBe(1);
  expect(missing.stderr).toContain("not_found");

  const logout = await cli("logout");
  expect(logout.code).toBe(0);
  expect(logout.stderr).toBe("");
  await expect(access(hostsFile())).rejects.toThrow();

  // Revoked on the server too, not just forgotten locally.
  const session = await fetch(`${baseURL}/api/auth/get-session`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(await session.json()).toBeNull();

  const again = await cli("whoami");
  expect(again.code).toBe(4);
  expect(again.stderr).toContain("Not logged in");

  expect(transcript).not.toContain(token.split(".")[0]);
}, 120_000);

test("mcp --stdio: tools without a login, then add, list, done", async () => {
  const helpers = (await testAuth.$context).test;
  const user = await helpers.saveUser(
    helpers.createUser({ name: "Grace Hopper", email: "grace@example.com" }),
  );
  // Starts from no stored login, whatever the other test left behind.
  await rm(hostsFile(), { force: true });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, "cli/bin/ai-tutor.js"), "mcp", "--stdio"],
    env: cliEnv() as Record<string, string>,
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  // The SDK's reader silently skips lines that are not JSON, so tap the
  // child's stdout too; listening right after spawn misses no chunk.
  let stdout = "";
  const start = transport.start.bind(transport);
  transport.start = async () => {
    await start();
    const child = (transport as unknown as { _process?: ChildProcess })
      ._process;
    if (!child?.stdout) throw new Error("no child stdout to tap");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
  };
  const client = new Client({ name: "cli-test", version: "0.0.0" });

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "add_todo",
      "list_todos",
      "mark_todo_done",
    ]);
    const schemas = Object.fromEntries(
      tools.map((tool) => [tool.name, tool.inputSchema]),
    );
    expect(schemas.list_todos.required ?? []).toEqual([]);
    expect(schemas.add_todo.required).toEqual(["title"]);
    expect(schemas.mark_todo_done.required).toEqual(["id"]);

    const call = (name: string, args: Record<string, unknown> = {}) =>
      client.callTool({ name, arguments: args });
    const text = (result: Awaited<ReturnType<typeof call>>) =>
      (result.content as { type: string; text?: string }[])
        .map((block) => block.text ?? "")
        .join("");

    // Started without a login; every tool says how to get one.
    for (const [name, args] of [
      ["list_todos", {}],
      ["add_todo", { title: "Nope" }],
      ["mark_todo_done", { id: "nope" }],
    ] as const) {
      const denied = await call(name, args);
      expect(denied.isError).toBe(true);
      expect(text(denied)).toContain("ai-tutor login");
    }

    // Logging in while the server runs takes effect without a restart.
    expect((await loginAs(user.id)).code).toBe(0);

    const added = await call("add_todo", { title: "  Write the compiler  " });
    expect(added.isError).toBeFalsy();
    const { todo } = TodoResponse.parse(added.structuredContent);
    expect(todo).toMatchObject({ title: "Write the compiler", done: false });
    expect(TodoResponse.parse(JSON.parse(text(added)))).toEqual({ todo });

    await call("add_todo", { title: "Find the moth" });

    const filtered = await call("list_todos", { q: "COMPILER" });
    expect(ListTodosResponse.parse(filtered.structuredContent)).toEqual({
      todos: [todo],
    });

    const done = await call("mark_todo_done", { id: todo.id });
    expect(TodoResponse.parse(done.structuredContent)).toEqual({
      todo: { ...todo, done: true },
    });

    const listed = await call("list_todos");
    expect(
      ListTodosResponse.parse(listed.structuredContent).todos.map(
        ({ title, done }) => ({ title, done }),
      ),
    ).toEqual([
      { title: "Write the compiler", done: true },
      { title: "Find the moth", done: false },
    ]);

    // The same list the plain commands see.
    const cliList = await cli("list", "--json");
    expect(ListTodosResponse.parse(JSON.parse(cliList.stdout))).toEqual(
      listed.structuredContent,
    );

    const missing = await call("mark_todo_done", { id: "no-such-id" });
    expect(missing.isError).toBe(true);
    expect(text(missing)).toContain("not_found");

    const empty = await call("add_todo", { title: "   " });
    expect(empty.isError).toBe(true);
  } finally {
    await client.close();
  }

  // Nothing but protocol on stdout, nothing at all on stderr.
  const lines = stdout.split("\n").filter(Boolean);
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) {
    expect(() => JSON.parse(line), line).not.toThrow();
    expect(JSON.parse(line)).toMatchObject({ jsonrpc: "2.0" });
  }
  expect(stderr).toBe("");
  const token = JSON.parse(await readFile(hostsFile(), "utf8"))[baseURL]
    .token as string;
  expect(transcript + stderr).not.toContain(token.split(".")[0]);
}, 120_000);
