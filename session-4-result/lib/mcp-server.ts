import { McpServer } from "@modelcontextprotocol/server";
import { mcpToolResult, mcpTools } from "ai-tutor-api-contract";
import {
  addTodoFor,
  listTodosFor,
  setTodoDoneFor,
  type TodoDb,
} from "@/lib/todo-tools";

/**
 * The `ai-tutor mcp --stdio` tools served from inside the app: same names,
 * descriptions, and schemas (from the contract), but straight onto the todos
 * table instead of through /api/todos. `userId` is fixed when the server is
 * built, and app/api/mcp/route.ts builds one per request from the verified
 * access token, so no tool argument can name another user's list.
 */
export function createTodoMcpServer(db: TodoDb, userId: string) {
  const server = new McpServer({ name: "ai-tutor", version: "0.1.0" });

  server.registerTool("list_todos", mcpTools.list_todos, async ({ q }) =>
    mcpToolResult({ todos: await listTodosFor(db, userId, q) }),
  );

  server.registerTool("add_todo", mcpTools.add_todo, async ({ title }) =>
    mcpToolResult({ todo: await addTodoFor(db, userId, title) }),
  );

  server.registerTool(
    "mark_todo_done",
    mcpTools.mark_todo_done,
    async ({ id }) => {
      const todo = await setTodoDoneFor(db, userId, id, true);
      // Thrown errors become `isError` results; another user's id reads as
      // unknown, same as PATCH /api/todos/:id answering 404.
      if (!todo) throw new Error(`not_found: no to-do with id ${id}`);
      return mcpToolResult({ todo });
    },
  );

  return server;
}
