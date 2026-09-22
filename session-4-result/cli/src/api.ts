import { ApiError } from "ai-tutor-api-contract";
import { z } from "zod";
import { CliError, EXIT_AUTH } from "./errors";

export const notLoggedIn = (server: string) =>
  new CliError(
    `Not logged in to ${server}. Run \`ai-tutor login\` first.`,
    EXIT_AUTH,
  );

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  token?: string;
  body?: unknown;
};

/** `fetch` with a JSON body, a bearer token, and an error a person can read. */
export async function send(
  server: string,
  path: string,
  { method = "GET", token, body }: RequestOptions = {},
) {
  try {
    return await fetch(`${server}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(token && { authorization: `Bearer ${token}` }),
        ...(body !== undefined && { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code;
    throw new CliError(
      `Cannot reach ${server}${cause ? ` (${cause})` : ""}. Is the server running, and is AI_TUTOR_URL right?`,
    );
  }
}

/** Calls a /api/todos endpoint and parses the success body against `schema`. */
export async function callTodos<T extends z.ZodType>(
  server: string,
  path: string,
  schema: T,
  options: RequestOptions & { token: string },
): Promise<z.infer<T>> {
  const response = await send(server, path, options);
  const json: unknown = await response.json().catch(() => undefined);

  if (response.ok) {
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new CliError(
        `Unexpected response from ${path}: ${z.prettifyError(parsed.error)}`,
      );
    }
    return parsed.data;
  }

  if (response.status === 401) {
    throw new CliError(
      `The saved login for ${server} was rejected. Run \`ai-tutor login\` again.`,
      EXIT_AUTH,
    );
  }
  const error = ApiError.safeParse(json);
  throw new CliError(
    error.success
      ? `${error.data.error}${error.data.message ? `: ${error.data.message}` : ""}`
      : `${path} failed with HTTP ${response.status}`,
  );
}
