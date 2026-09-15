import {
  createTodoRequestSchema,
  listTodosQuerySchema,
} from "ai-tutor-contract";
import {
  anySession,
  apiError,
  bearerSession,
  parseBody,
  unauthorized,
} from "@/lib/api-session";
import { db } from "@/lib/db";
import { addTodoFor, listTodosFor } from "@/lib/todo-tools";

/**
 * Lists the caller's todos, optionally filtered by `?q=`. Accepts the session
 * cookie as well as a bearer token, because the sidebar reads it from the page.
 */
export async function GET(request: Request) {
  const session = await anySession(request);
  if (!session) {
    return unauthorized();
  }

  const query = listTodosQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) {
    return apiError(400, {
      error: "invalid_request",
      message: query.error.message,
    });
  }

  return Response.json({
    todos: await listTodosFor(db, session.user.id, query.data.q),
  });
}

/** Adds one todo. Bearer only: the page never writes, the tutor does. */
export async function POST(request: Request) {
  const session = await bearerSession(request);
  if (!session) {
    return unauthorized();
  }

  const body = await parseBody(request, createTodoRequestSchema);
  if ("response" in body) {
    return body.response;
  }

  return Response.json(
    { todo: await addTodoFor(db, session.user.id, body.data.title) },
    { status: 201 },
  );
}
