import { type AuthInfo, McpServer } from "@modelcontextprotocol/server";
import {
  todoMcpServerInfo,
  todoMcpTools,
  todoNotFoundMessage,
} from "ai-tutor-contract";
import {
  addTodoFor,
  listTodosFor,
  setTodoDoneFor,
  type TodoDb,
} from "@/lib/todo-tools";
import { version } from "@/package.json";

/** The same result shape as `ai-tutor mcp --stdio`: JSON text plus structured content. */
const result = <T extends object>(value: T) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  structuredContent: { ...value },
});

/**
 * The key under which app/api/mcp/route.ts puts the verified token's `sub` into
 * the SDK's `AuthInfo`. The SDK never fills `authInfo` from the request itself,
 * so this is the only way a user id reaches the tools.
 */
export const userIdFrom = (authInfo: AuthInfo | undefined) => {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error("The MCP handler was called without a verified user id.");
  }
  return userId;
};

/**
 * `ai-tutor mcp --stdio`'s tools over the database, for one user. Names,
 * descriptions, and schemas come from the contract; only the callbacks differ,
 * calling lib/todo-tools.ts where the CLI calls /api/todos.
 */
export function createTodoMcpServer(db: TodoDb, userId: string) {
  const mcp = new McpServer(
    { name: todoMcpServerInfo.name, version },
    { instructions: todoMcpServerInfo.instructions },
  );

  mcp.registerTool("list_todos", todoMcpTools.list_todos, async ({ q }) =>
    result({ todos: await listTodosFor(db, userId, q) }),
  );

  mcp.registerTool("add_todo", todoMcpTools.add_todo, async ({ title }) =>
    result({ todo: await addTodoFor(db, userId, title) }),
  );

  mcp.registerTool(
    "mark_todo_done",
    todoMcpTools.mark_todo_done,
    async ({ id }) => {
      const todo = await setTodoDoneFor(db, userId, id, true);
      return todo
        ? result({ todo })
        : {
            content: [{ type: "text" as const, text: todoNotFoundMessage }],
            isError: true,
          };
    },
  );

  return mcp;
}
