import {
  type CreateTodoRequest,
  ListTodosResponse,
  TodoResponse,
  type UpdateTodoRequest,
} from "ai-tutor-api-contract";
import { callTodos, notLoggedIn } from "./api";
import { readToken, serverUrl } from "./config";

// The todo operations shared by the commands and the MCP tools. Each call
// resolves the server and reads the stored login afresh, so a long-running
// MCP server picks up a login or logout made while it runs.

async function session() {
  const server = serverUrl();
  const token = await readToken(server);
  if (!token) throw notLoggedIn(server);
  return { server, token };
}

export async function listTodos(query?: string) {
  const { server, token } = await session();
  const search = query ? `?${new URLSearchParams({ q: query })}` : "";
  return callTodos(server, `/api/todos${search}`, ListTodosResponse, { token });
}

export async function addTodo(request: CreateTodoRequest) {
  const { server, token } = await session();
  return callTodos(server, "/api/todos", TodoResponse, {
    method: "POST",
    token,
    body: request,
  });
}

export async function markTodoDone(id: string) {
  const { server, token } = await session();
  const body: UpdateTodoRequest = { done: true };
  return callTodos(
    server,
    `/api/todos/${encodeURIComponent(id)}`,
    TodoResponse,
    { method: "PATCH", token, body },
  );
}
