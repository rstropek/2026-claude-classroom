import { updateTodoRequestSchema } from "ai-tutor-contract";
import {
  apiError,
  bearerSession,
  parseBody,
  unauthorized,
} from "@/lib/api-session";
import { db } from "@/lib/db";
import { setTodoDoneFor } from "@/lib/todo-tools";

/** Marks one of the caller's todos done or open. Bearer only, like POST. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/todos/[id]">,
) {
  const session = await bearerSession(request);
  if (!session) {
    return unauthorized();
  }

  const body = await parseBody(request, updateTodoRequestSchema);
  if ("response" in body) {
    return body.response;
  }

  const { id } = await ctx.params;
  const todo = await setTodoDoneFor(db, session.user.id, id, body.data.done);

  return todo ? Response.json({ todo }) : apiError(404, { error: "not_found" });
}
