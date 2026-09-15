import { execFile, spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { listTodosResponseSchema } from "ai-tutor-contract";
import type { TestHelpers } from "better-auth/plugins";
import { afterAll, beforeAll, expect, inject, test } from "vitest";
import { bin, createConfigDir, testAuth } from "./harness";

/**
 * Drives the built `ai-tutor` binary against the `next dev` that
 * global-setup.ts started, with a config directory of its own.
 */

const baseURL = inject("baseURL");
let configDir: string;
let helpers: TestHelpers;
let closeAuth: () => void;

const cliEnv = () => ({
  ...process.env,
  AI_TUTOR_URL: baseURL,
  AI_TUTOR_CONFIG_DIR: configDir,
});

/** Runs one command to completion; never throws, so a test can assert the exit code. */
async function cli(...args: string[]) {
  try {
    const { stdout, stderr } = await promisify(execFile)(bin, args, {
      env: cliEnv(),
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failed = error as { code: number; stdout: string; stderr: string };
    return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr };
  }
}

beforeAll(async () => {
  configDir = await createConfigDir();
  ({ helpers, close: closeAuth } = await testAuth());
});

afterAll(() => {
  closeAuth?.();
});

test("login, whoami, add, list, done, logout, and whoami again", async () => {
  // login: the CLI prints the URL and code, then polls until approval.
  const login = spawn(bin, ["login"], { env: cliEnv() });
  let loginOut = "";
  let loginErr = "";
  login.stderr.on("data", (chunk) => {
    loginErr += chunk;
  });
  const loginExit = new Promise<number | null>((done) =>
    login.once("exit", done),
  );
  const userCode = await new Promise<string>((found, reject) => {
    login.stdout.on("data", (chunk) => {
      loginOut += chunk;
      const match = /^\s+([A-Z0-9]{4}-[A-Z0-9]{4})$/m.exec(loginOut);
      if (match) {
        found(match[1]);
      }
    });
    login.once("exit", () => reject(new Error(`login exited:\n${loginErr}`)));
  });
  expect(loginOut).toContain(`${baseURL}/device`);

  // Approve as a browser would: verify (which claims the code) and approve.
  const user = await helpers.saveUser(
    helpers.createUser({
      name: "Ada Lovelace",
      email: `ada-${Date.now()}@example.com`,
    }),
  );
  const browser = await helpers.getAuthHeaders({ userId: user.id });
  const verified = await fetch(
    `${baseURL}/api/auth/device?${new URLSearchParams({ user_code: userCode })}`,
    { headers: browser },
  );
  expect(await verified.json()).toMatchObject({
    status: "pending",
    client_id: "ai-tutor-cli",
  });
  browser.set("content-type", "application/json");
  browser.set("origin", baseURL);
  const approved = await fetch(`${baseURL}/api/auth/device/approve`, {
    method: "POST",
    headers: browser,
    body: JSON.stringify({ userCode }),
  });
  expect(approved.status).toBe(200);

  expect(await loginExit, loginErr).toBe(0);
  expect(loginOut).toContain(`as Ada Lovelace <${user.email}>`);

  // The token sits in an owner-only file under the redirected config dir.
  const hostsFile = join(configDir, "hosts.json");
  expect((await stat(hostsFile)).mode & 0o777).toBe(0o600);
  const { token } = JSON.parse(await readFile(hostsFile, "utf8"))[baseURL];
  expect(token).toEqual(expect.any(String));
  const outputs = [loginOut, loginErr];

  const whoami = await cli("whoami");
  outputs.push(whoami.stdout, whoami.stderr);
  expect(whoami.code, whoami.stderr).toBe(0);
  expect(whoami.stdout).toContain(user.email);

  const milk = await cli("add", "Buy milk");
  const grace = await cli("add", "Call", "Grace");
  outputs.push(milk.stdout, milk.stderr, grace.stdout, grace.stderr);
  expect(milk.code, milk.stderr).toBe(0);
  expect(grace.code, grace.stderr).toBe(0);
  const [milkId] = milk.stdout.trim().split("\t");
  expect(milk.stdout).toBe(`${milkId}\t[ ]\tBuy milk\n`);
  expect(grace.stdout).toMatch(/\t\[ \]\tCall Grace\n$/);

  const filtered = await cli("list", "--query", "GRACE");
  outputs.push(filtered.stdout, filtered.stderr);
  expect(filtered.code, filtered.stderr).toBe(0);
  expect(filtered.stdout).toBe(grace.stdout);

  const done = await cli("done", milkId);
  outputs.push(done.stdout, done.stderr);
  expect(done.code, done.stderr).toBe(0);
  expect(done.stdout).toBe(`${milkId}\t[x]\tBuy milk\n`);

  const listed = await cli("list", "--json");
  outputs.push(listed.stdout, listed.stderr);
  expect(listed.code, listed.stderr).toBe(0);
  expect(listTodosResponseSchema.parse(JSON.parse(listed.stdout))).toEqual({
    todos: [
      { id: milkId, title: "Buy milk", done: true },
      { id: expect.any(String), title: "Call Grace", done: false },
    ],
  });

  const unknown = await cli("done", "no-such-id");
  outputs.push(unknown.stdout, unknown.stderr);
  expect(unknown.code).toBe(1);
  expect(unknown.stdout).toBe("");
  expect(unknown.stderr).toContain("No todo with that id");

  const logout = await cli("logout");
  outputs.push(logout.stdout, logout.stderr);
  expect(logout.code, logout.stderr).toBe(0);
  expect(logout.stderr).toBe("");
  await expect(stat(hostsFile)).rejects.toThrow();

  // logout ended the session on the server, not just on disk.
  const revoked = await fetch(`${baseURL}/api/todos`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(revoked.status).toBe(401);

  const again = await cli("whoami");
  outputs.push(again.stdout, again.stderr);
  expect(again.code).toBe(4);
  expect(again.stderr).toContain("Not logged in");

  for (const output of outputs) {
    expect(output).not.toContain(token);
  }
});
