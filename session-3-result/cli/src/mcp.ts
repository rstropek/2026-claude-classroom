import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { todoMcpServerInfo, todoMcpTools } from "ai-tutor-contract";
import { version } from "../package.json";
import { loadCredential } from "./credentials";
import {
  addTodo,
  CliError,
  EXIT,
  listTodos,
  notLoggedIn,
  serverUrl,
  setTodoDone,
} from "./server";

/**
 * Resolves the server and its stored token on every call rather than at
 * startup, so the MCP server starts without a login and picks up a login or
 * logout made in a terminal while it keeps running.
 */
async function withLogin<T extends object>(
  call: (server: string, token: string) => Promise<T>,
) {
  try {
    const server = serverUrl();
    const credential = await loadCredential(server);
    if (!credential) {
      throw notLoggedIn(server);
    }
    const result = await call(server, credential.token);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
      structuredContent: { ...result },
    };
  } catch (error) {
    // The SDK would turn a throw into the same isError result, but only with
    // the bare message; spell out that the server need not be restarted.
    const message = error instanceof Error ? error.message : String(error);
    const hint =
      error instanceof CliError && error.exitCode === EXIT.auth
        ? " Ask the user to run it in a terminal; this MCP server uses the new login without a restart."
        : "";
    return {
      content: [{ type: "text" as const, text: `${message}${hint}` }],
      isError: true,
    };
  }
}

function createServer() {
  const mcp = new McpServer(
    { name: todoMcpServerInfo.name, version },
    { instructions: todoMcpServerInfo.instructions },
  );

  mcp.registerTool("list_todos", todoMcpTools.list_todos, ({ q }) =>
    withLogin((server, token) => listTodos(server, token, q)),
  );

  mcp.registerTool("add_todo", todoMcpTools.add_todo, ({ title }) =>
    withLogin((server, token) => addTodo(server, token, title)),
  );

  mcp.registerTool("mark_todo_done", todoMcpTools.mark_todo_done, ({ id }) =>
    withLogin((server, token) => setTodoDone(server, token, id, true)),
  );

  return mcp;
}

/**
 * Serves MCP on stdin/stdout until the client closes stdin. stdout carries
 * protocol messages only; diagnostics go to stderr.
 */
export async function serveMcpStdio() {
  const ended = new Promise<void>((resolve) => {
    process.stdin.once("end", resolve);
    process.stdin.once("close", resolve);
  });
  const handle = serveStdio(createServer, {
    onerror: (error) =>
      process.stderr.write(`ai-tutor mcp: ${error.message}\n`),
  });
  await ended;
  await handle.close();
}
