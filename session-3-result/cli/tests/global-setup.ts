import { type ChildProcess, execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import type { TestProject } from "vitest/node";

/**
 * Builds the CLI and starts one `next dev` of the web app on a spare port, with
 * its own database file, for every test file in this project: a second
 * `next dev` could not share the `.next-cli-test` dist dir. Nothing here
 * touches data/app.db, a running dev server, or ~/.config.
 */

export const root = resolve(import.meta.dirname, "../..");
export const secret = "cli-test-secret-at-least-32-characters";

function freePort() {
  return new Promise<number>((resolvePort, reject) => {
    const probe = createServer().listen(0, "localhost", () => {
      const address = probe.address();
      probe.close(() =>
        typeof address === "object" && address
          ? resolvePort(address.port)
          : reject(new Error("no port")),
      );
    });
  });
}

/** Polls until the route answers 2xx; `next dev` compiles it on that first hit. */
async function waitForServer(
  server: ChildProcess,
  log: () => string,
  url: string,
  deadline: number,
) {
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`next dev exited early:\n${log()}`);
    }
    const ok = await fetch(url)
      .then((response) => response.ok)
      .catch(() => false);
    if (ok) {
      return;
    }
    await new Promise((wait) => setTimeout(wait, 500));
  }
  throw new Error(`next dev did not answer ${url} in time:\n${log()}`);
}

export default async function setup(project: TestProject) {
  const dir = await mkdtemp(join(tmpdir(), "ai-tutor-cli-"));
  const databaseUrl = `file:${join(dir, "app.db")}`;
  const baseURL = `http://localhost:${await freePort()}`;

  const db = drizzle({ connection: { url: databaseUrl } });
  await migrate(db, { migrationsFolder: join(root, "drizzle") });
  db.$client.close();

  // Test what `npm install` builds, but from the current source.
  await promisify(execFile)("npm", ["run", "build", "-w", "ai-tutor-cli"], {
    cwd: root,
  });

  let serverLog = "";
  const server = spawn(
    join(root, "node_modules/.bin/next"),
    ["dev", "--port", new URL(baseURL).port],
    {
      cwd: root,
      // Its own process group, so teardown also stops next dev's workers.
      detached: true,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: secret,
        BETTER_AUTH_URL: baseURL,
        // Own dist dir, so a `npm run dev` or Playwright server can keep running.
        NEXT_DIST_DIR: ".next-cli-test",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  );
  server.stdout?.on("data", (chunk) => {
    serverLog += chunk;
  });
  server.stderr?.on("data", (chunk) => {
    serverLog += chunk;
  });

  const teardown = async () => {
    if (server.pid && server.exitCode === null) {
      const exited = new Promise((done) => server.once("exit", done));
      process.kill(-server.pid, "SIGTERM");
      await exited;
    }
    await rm(dir, { recursive: true, force: true });
  };

  try {
    await waitForServer(
      server,
      () => serverLog,
      `${baseURL}/api/auth/ok`,
      Date.now() + 150_000,
    );
    // Compile the todo routes before any test's clock starts.
    await fetch(`${baseURL}/api/todos`);
  } catch (error) {
    await teardown();
    throw error;
  }

  project.provide("tempDir", dir);
  project.provide("databaseUrl", databaseUrl);
  project.provide("baseURL", baseURL);
  return teardown;
}
