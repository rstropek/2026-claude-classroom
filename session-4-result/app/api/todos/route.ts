import {
  CreateTodoRequest,
  ListTodosQuery,
  type ListTodosResponse,
  type TodoResponse,
} from "ai-tutor-api-contract";
import {
  apiError,
  bearerSession,
  readJson,
  unauthorized,
} from "@/lib/api-route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addTodoFor, listTodosFor } from "@/lib/todo-tools";

/**
 * Lists the caller's items, optionally filtered by `?q=`. Accepts the session
 * cookie as well as a bearer token, because the sidebar refetches through here;
 * the writes below take the bearer token only.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const query = ListTodosQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) {
    return apiError(400, { error: "invalid_request" });
  }

  const body: ListTodosResponse = {
    todos: await listTodosFor(db, session.user.id, query.data.q),
  };
  return Response.json(body);
}

export async function POST(request: Request) {
  const session = await bearerSession(request);
  if (!session) {
    return unauthorized();
  }

  const parsed = await readJson(request, CreateTodoRequest);
  if ("response" in parsed) {
    return parsed.response;
  }

  const body: TodoResponse = {
    todo: await addTodoFor(db, session.user.id, parsed.data.title),
  };
  return Response.json(body, { status: 201 });
}
