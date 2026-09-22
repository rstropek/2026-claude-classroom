import { z } from "zod";

/**
 * The wire contract of /api/todos, shared by the route handlers in the web app
 * and the `ai-tutor` CLI. Deliberately free of `server-only`, the db, and
 * Better Auth, so the CLI can import it without dragging in the server. Both
 * MCP servers advertise these schemas as tool inputs (see `mcpTools`), so
 * `.describe()` text is what a model reads about a field.
 *
 * - `GET    /api/todos?q=milk` → `ListTodosResponse`
 * - `POST   /api/todos`        `CreateTodoRequest` → 201 `TodoResponse`
 * - `PATCH  /api/todos/:id`    `UpdateTodoRequest` → `TodoResponse`
 *
 * Every endpoint takes `Authorization: Bearer <token>`, where the token is the
 * `set-auth-token` response header of `POST /api/auth/sign-in/email` or of
 * `POST /api/auth/device/token`. Failures are `ApiError` with status 400, 401
 * or 404.
 */

/** The only `client_id` the server's device authorization flow accepts. */
export const CLI_CLIENT_ID = "ai-tutor-cli";

export const Todo = z.object({
  id: z.string().describe("The item's id."),
  title: z.string(),
  done: z.boolean(),
});
export type Todo = z.infer<typeof Todo>;

export const ListTodosQuery = z.object({
  q: z
    .string()
    .trim()
    .optional()
    .describe(
      "Case-insensitive substring of the title; blank means no filter.",
    ),
});
export type ListTodosQuery = z.infer<typeof ListTodosQuery>;

export const ListTodosResponse = z.object({ todos: z.array(Todo) });
export type ListTodosResponse = z.infer<typeof ListTodosResponse>;

export const CreateTodoRequest = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .describe("What to do; surrounding whitespace is trimmed."),
});
export type CreateTodoRequest = z.infer<typeof CreateTodoRequest>;

export const UpdateTodoRequest = z.object({ done: z.boolean() });
export type UpdateTodoRequest = z.infer<typeof UpdateTodoRequest>;

export const TodoResponse = z.object({ todo: Todo });
export type TodoResponse = z.infer<typeof TodoResponse>;

export const ApiError = z.object({
  error: z.enum(["unauthorized", "invalid_request", "not_found"]),
  message: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiError>;

/**
 * The MCP tools both `ai-tutor mcp --stdio` (cli/src/mcp.ts) and the app's
 * `/api/mcp` register, keyed by tool name: pass `mcpTools.list_todos` as the
 * `registerTool` config. Each server supplies only the handlers, so names,
 * descriptions, and schemas cannot drift apart. Plain data, so this package
 * still needs no MCP SDK.
 */
export const mcpTools = {
  list_todos: {
    title: "List to-dos",
    description:
      "List the user's ai-tutor to-do items, oldest first, done or not. Pass `q` to keep only items whose title contains it (case-insensitive).",
    inputSchema: ListTodosQuery,
    outputSchema: ListTodosResponse,
    annotations: { readOnlyHint: true },
  },
  add_todo: {
    title: "Add a to-do",
    description:
      "Add an item to the user's ai-tutor to-do list and return it with its id.",
    inputSchema: CreateTodoRequest,
    outputSchema: TodoResponse,
    annotations: { readOnlyHint: false, idempotentHint: false },
  },
  mark_todo_done: {
    title: "Mark a to-do done",
    description:
      "Mark one of the user's to-do items as done by its id (from list_todos or add_todo). Marking an item that is already done succeeds.",
    inputSchema: Todo.pick({ id: true }),
    outputSchema: TodoResponse,
    annotations: { readOnlyHint: false, idempotentHint: true },
  },
};

/** A tool result in both renderings: text for hosts that only read `content`, plus the typed value. */
export const mcpToolResult = <T extends Record<string, unknown>>(value: T) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  structuredContent: value,
});
