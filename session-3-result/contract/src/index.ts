import { z } from "zod";

/**
 * The wire contract of /api/todos, shared by the route handlers and the CLI in
 * cli/, plus the tool surface of both MCP servers. Kept to plain zod with no
 * server imports so either side can load it.
 *
 * Every endpoint takes `Authorization: Bearer <token>`, where the token is a
 * Better Auth session token: the `set-auth-token` response header of a sign-in
 * such as `POST /api/auth/sign-in/email`, or the `access_token` that the device
 * flow's `POST /api/auth/device/token` returns. GET also accepts the session
 * cookie, which is how the sidebar reads the list.
 */

/**
 * The `client_id` the CLI requests device codes with; the server's
 * `validateClient` accepts no other, and /device names it to the approver.
 */
export const cliClientId = "ai-tutor-cli";

/*
 * The `.describe()` texts are what both MCP servers advertise to agents as the
 * tools' parameter documentation (see `todoMcpTools` below).
 */

export const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});
export type Todo = z.infer<typeof todoSchema>;

/** `GET /api/todos?q=milk` — `q` is a case-insensitive substring of the title. */
export const listTodosQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "Only todos whose title contains this text, ignoring case; omit for all todos.",
    ),
});
export const listTodosResponseSchema = z.object({
  todos: z.array(todoSchema),
});

/** `POST /api/todos` — answers 201. */
export const createTodoRequestSchema = z.object({
  title: z.string().trim().min(1).describe('What to do, e.g. "Buy milk".'),
});

/** The `:id` of `PATCH /api/todos/:id`. */
export const todoParamsSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe("The todo's id, as returned when listing or adding todos."),
});

/** `PATCH /api/todos/:id` — `done: false` reopens; 404 when the id is not the caller's. */
export const updateTodoRequestSchema = z.object({
  done: z.boolean(),
});

/** Body of both the 201 from POST and the 200 from PATCH. */
export const todoResponseSchema = z.object({ todo: todoSchema });

/** Body of every 4xx: `unauthorized`, `invalid_request` (with `message`), or `not_found`. */
export const errorResponseSchema = z.object({
  error: z.enum(["unauthorized", "invalid_request", "not_found"]),
  message: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * What an agent sees of the todo MCP server, shared by `ai-tutor mcp --stdio`
 * (cli/src/mcp.ts) and the web app's /api/mcp so the two cannot drift: each
 * passes these straight to `McpServer` and supplies only the tool callbacks.
 */
export const todoMcpServerInfo = {
  name: "ai-tutor",
  instructions:
    "Reads and changes the logged-in user's ai-tutor to-do list, the same list the ai-tutor web app shows. Take ids from list_todos or add_todo; never guess them.",
};

/** Tool name → `registerTool` config; the output schemas are the REST bodies. */
export const todoMcpTools = {
  list_todos: {
    title: "List todos",
    description:
      "List the user's todos, open and done, oldest first, optionally filtered by a title substring.",
    inputSchema: listTodosQuerySchema,
    outputSchema: listTodosResponseSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  add_todo: {
    title: "Add todo",
    description:
      "Add a todo to the user's list and return it, including its new id.",
    inputSchema: createTodoRequestSchema,
    outputSchema: todoResponseSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  mark_todo_done: {
    title: "Mark todo done",
    description:
      "Mark one of the user's todos done and return it. Fails when no todo on the list has that id.",
    inputSchema: todoParamsSchema,
    outputSchema: todoResponseSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
};

/** The text of the error result `mark_todo_done` gives for an unknown id. */
export const todoNotFoundMessage = "No todo with that id on your list.";
