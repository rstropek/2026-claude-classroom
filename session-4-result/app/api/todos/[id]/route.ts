import { type TodoResponse, UpdateTodoRequest } from "ai-tutor-api-contract";
import {
  apiError,
  bearerSession,
  readJson,
  unauthorized,
} from "@/lib/api-route";
import { db } from "@/lib/db";
import { setTodoDoneFor } from "@/lib/todo-tools";

/** Marks one of the caller's items done (or reopens it); bearer token only. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/todos/[id]">,
) {
  const session = await bearerSession(request);
  if (!session) {
    return unauthorized();
  }

  const parsed = await readJson(request, UpdateTodoRequest);
  if ("response" in parsed) {
    return parsed.response;
  }

  const { id } = await ctx.params;
  const todo = await setTodoDoneFor(db, session.user.id, id, parsed.data.done);
  if (!todo) {
    return apiError(404, { error: "not_found" });
  }

  const body: TodoResponse = { todo };
  return Response.json(body);
}
