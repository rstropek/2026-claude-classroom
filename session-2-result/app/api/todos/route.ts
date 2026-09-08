import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTodosFor } from "@/lib/todo-tools";

/**
 * The sidebar's read path, and read-only on purpose: the agent owns every
 * write, so there is no POST or PATCH here. Same query the `listTodos` tool
 * runs, on the same session-derived user id.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return Response.json({ todos: await listTodosFor(db, session.user.id) });
}
