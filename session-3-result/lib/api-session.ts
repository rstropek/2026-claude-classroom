import "server-only";
import type { ErrorResponse } from "ai-tutor-contract";
import type { z } from "zod";
import { auth } from "@/lib/auth";

/**
 * The session behind a bearer token and nothing else: only the Authorization
 * header reaches Better Auth, so a browser's ambient cookie cannot authorize a
 * write through a cross-site request.
 */
export function bearerSession(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return Promise.resolve(null);
  }

  return auth.api.getSession({ headers: new Headers({ authorization }) });
}

/** The session behind either a bearer token or the session cookie. */
export function anySession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export const apiError = (status: number, body: ErrorResponse) =>
  Response.json(body, { status });

export const unauthorized = () => apiError(401, { error: "unauthorized" });

/**
 * Parses a JSON body with a contract schema, answering 400 for malformed JSON
 * and for a body the schema rejects.
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  const json = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      response: apiError(400, {
        error: "invalid_request",
        message:
          json === undefined ? "Body must be JSON." : parsed.error.message,
      }),
    };
  }

  return { data: parsed.data };
}
