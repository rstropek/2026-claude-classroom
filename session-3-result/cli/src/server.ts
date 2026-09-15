import {
  createTodoRequestSchema,
  errorResponseSchema,
  listTodosQuerySchema,
  listTodosResponseSchema,
  todoNotFoundMessage,
  todoParamsSchema,
  todoResponseSchema,
  updateTodoRequestSchema,
} from "ai-tutor-contract";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import type { z } from "zod";

export const DEFAULT_SERVER = "http://localhost:3000";

/** Exit codes, as documented in the root help. */
export const EXIT = { failure: 1, usage: 2, auth: 4 } as const;

/** An expected failure: printed as its message alone, never with a stack. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: number = EXIT.failure,
  ) {
    super(message);
  }
}

/** `AI_TUTOR_URL` without a trailing slash, which is also the credentials key. */
export function serverUrl(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.AI_TUTOR_URL || DEFAULT_SERVER;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CliError(
      `AI_TUTOR_URL is not a URL: ${raw}. Use e.g. ${DEFAULT_SERVER}.`,
      EXIT.usage,
    );
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

export const notLoggedIn = (server: string) =>
  new CliError(
    `Not logged in to ${server}. Run \`ai-tutor login\` first.`,
    EXIT.auth,
  );

export const unreachable = (server: string, error: unknown) =>
  new CliError(
    `Could not reach ${server} (${error instanceof Error ? (error.cause ?? error).toString() : String(error)}). Is the server running, and is AI_TUTOR_URL right?`,
  );

/** Better Auth's own client, so the device-flow and session shapes come from it. */
export function authClient(server: string) {
  return createAuthClient({
    baseURL: `${server}/api/auth`,
    plugins: [deviceAuthorizationClient()],
  });
}

/** The user behind a token, or null when the server no longer accepts it. */
export async function sessionUser(server: string, token: string) {
  const { data, error } = await authClient(server)
    .getSession({
      fetchOptions: { headers: { authorization: `Bearer ${token}` } },
    })
    .catch((cause: unknown) => {
      throw unreachable(server, cause);
    });
  if (error) {
    throw new CliError(
      `${server} answered the session check with ${error.status} ${error.statusText}.`,
    );
  }
  return data?.user ?? null;
}

/**
 * One call to /api/todos: requests go out as the contract's schemas parse them,
 * responses are parsed by the contract before anyone reads them.
 */
async function callApi<T extends z.ZodType>(
  server: string,
  token: string,
  request: { method: string; path: string; body?: unknown },
  responseSchema: T,
): Promise<z.infer<T>> {
  let response: Response;
  try {
    response = await fetch(`${server}/api/todos${request.path}`, {
      method: request.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(request.body === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      body:
        request.body === undefined ? undefined : JSON.stringify(request.body),
    });
  } catch (error) {
    throw unreachable(server, error);
  }

  const json: unknown = await response.json().catch(() => undefined);
  if (response.ok) {
    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) {
      throw new CliError(
        `${server} sent a response this CLI does not understand: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  const failure = errorResponseSchema.safeParse(json);
  const code = failure.success ? failure.data.error : undefined;
  if (response.status === 401 || code === "unauthorized") {
    throw new CliError(
      `${server} no longer accepts the stored session. Run \`ai-tutor login\` again.`,
      EXIT.auth,
    );
  }
  if (code === "not_found") {
    throw new CliError(todoNotFoundMessage);
  }
  const detail = failure.success ? failure.data.message : undefined;
  throw new CliError(
    `${server} refused the request (${response.status}${code ? ` ${code}` : ""})${detail ? `: ${detail}` : "."}`,
  );
}

/** Validates input with a contract schema, reporting a rejection as a usage error. */
function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
  what: string,
) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new CliError(`Invalid ${what}: ${parsed.error.message}`, EXIT.usage);
  }
  return parsed.data as z.infer<T>;
}

export function listTodos(server: string, token: string, query?: string) {
  const { q } = parseInput(listTodosQuerySchema, { q: query }, "--query");
  const search = q === undefined ? "" : `?${new URLSearchParams({ q })}`;
  return callApi(
    server,
    token,
    { method: "GET", path: search },
    listTodosResponseSchema,
  );
}

export function addTodo(server: string, token: string, title: string) {
  return callApi(
    server,
    token,
    {
      method: "POST",
      path: "",
      body: parseInput(createTodoRequestSchema, { title }, "title"),
    },
    todoResponseSchema,
  );
}

export function setTodoDone(
  server: string,
  token: string,
  id: string,
  done: boolean,
) {
  const params = parseInput(todoParamsSchema, { id }, "id");
  return callApi(
    server,
    token,
    {
      method: "PATCH",
      path: `/${encodeURIComponent(params.id)}`,
      body: parseInput(updateTodoRequestSchema, { done }, "done flag"),
    },
    todoResponseSchema,
  );
}
