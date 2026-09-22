import "server-only";
import type { ApiError } from "ai-tutor-api-contract";
import { z } from "zod";
import { auth } from "@/lib/auth";

export const apiError = (status: number, body: ApiError) =>
  Response.json(body, { status });

export const unauthorized = () => apiError(401, { error: "unauthorized" });

/**
 * The session behind `Authorization: Bearer`, and only that: the request's
 * cookies are dropped, so a browser holding a session cookie cannot write
 * through the API — the tutor stays the only browser-driven write path, and
 * cross-site requests have nothing ambient to ride on.
 */
export async function bearerSession(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }
  return auth.api.getSession({ headers: new Headers({ authorization }) });
}

/** Parses a JSON body against `schema`, or returns the 400 to send instead. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  const body = await request.json().catch(() => undefined);
  const result = schema.safeParse(body);
  return result.success
    ? { data: result.data }
    : {
        response: apiError(400, {
          error: "invalid_request",
          message: z.prettifyError(result.error),
        }),
      };
}
