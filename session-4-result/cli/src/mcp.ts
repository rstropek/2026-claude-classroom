import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { mcpToolResult, mcpTools } from "ai-tutor-api-contract";
import { addTodo, listTodos, markTodoDone } from "./todos";

/**
 * Serves the todo commands as MCP tools over stdio. Nothing but protocol may
 * reach stdout. The login is checked per call rather than at startup, so the
 * server starts without one and a failing call (a thrown `CliError`) comes
 * back as an `isError` result that tells the user to run `ai-tutor login`.
 * The tool definitions are shared with the app's /api/mcp through the contract.
 */
export function serveMcp(version: string) {
  return serveStdio(() => {
    const server = new McpServer({ name: "ai-tutor", version });

    server.registerTool("list_todos", mcpTools.list_todos, async ({ q }) =>
      mcpToolResult(await listTodos(q)),
    );

    server.registerTool("add_todo", mcpTools.add_todo, async (request) =>
      mcpToolResult(await addTodo(request)),
    );

    server.registerTool(
      "mark_todo_done",
      mcpTools.mark_todo_done,
      async ({ id }) => mcpToolResult(await markTodoDone(id)),
    );

    return server;
  });
}
