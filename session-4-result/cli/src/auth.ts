import { setTimeout as sleep } from "node:timers/promises";
import { CLI_CLIENT_ID } from "ai-tutor-api-contract";
import { z } from "zod";
import { notLoggedIn, send } from "./api";
import { CliError } from "./errors";

// Better Auth's own wire shapes (RFC 8628 plus its session endpoint), not part
// of the app's contract, so they are declared here with only the fields used.

const DeviceCodeResponse = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  verification_uri_complete: z.string().optional(),
  expires_in: z.number(),
  interval: z.number(),
});

const DeviceTokenError = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

export const SessionUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
export type SessionUser = z.infer<typeof SessionUser>;

const SessionResponse = z.object({ user: SessionUser }).nullable();

/** Better Auth's default codes are 8 characters; show them as ABCD-EFGH. */
const formatUserCode = (code: string) =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

/**
 * Runs the device authorization flow: prints the code and the approval URL,
 * then polls until the user approves in a browser, and returns the signed
 * session token. Never opens a browser itself.
 */
export async function deviceLogin(
  server: string,
  print: (line: string) => void,
): Promise<string> {
  const codeResponse = await send(server, "/api/auth/device/code", {
    method: "POST",
    body: { client_id: CLI_CLIENT_ID },
  });
  if (!codeResponse.ok) {
    throw new CliError(
      `${server} refused to start a device login (HTTP ${codeResponse.status}).`,
    );
  }
  const code = DeviceCodeResponse.parse(await codeResponse.json());

  print(`Your one-time code: ${formatUserCode(code.user_code)}`);
  print(
    `Open ${code.verification_uri_complete ?? code.verification_uri} in a browser where you are signed in, check that the code matches, and approve.`,
  );
  print(
    `Waiting for approval (the code expires in ${Math.round(code.expires_in / 60)} minutes)...`,
  );

  let interval = code.interval;
  const deadline = Date.now() + code.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const response = await send(server, "/api/auth/device/token", {
      method: "POST",
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: code.device_code,
        client_id: CLI_CLIENT_ID,
      },
    });

    if (response.ok) {
      // The body's access_token is the raw session token, which the server's
      // bearer plugin refuses; the signed one comes back in this header.
      const token = response.headers.get("set-auth-token");
      if (!token) {
        throw new CliError(
          `${server} approved the login but returned no set-auth-token header.`,
        );
      }
      return token;
    }

    const error = DeviceTokenError.safeParse(
      await response.json().catch(() => undefined),
    );
    switch (error.success ? error.data.error : undefined) {
      case "authorization_pending":
        break;
      case "slow_down":
        interval += 5;
        break;
      case "access_denied":
        throw new CliError("The login was denied in the browser.");
      case "expired_token":
        throw new CliError("The code expired. Run `ai-tutor login` again.");
      default:
        throw new CliError(
          `Device login failed: ${error.success ? (error.data.error_description ?? error.data.error) : `HTTP ${response.status}`}`,
        );
    }
  }
  throw new CliError("The code expired. Run `ai-tutor login` again.");
}

/** The user behind `token`, or a not-logged-in error if the server says none. */
export async function fetchUser(
  server: string,
  token: string,
): Promise<SessionUser> {
  const response = await send(server, "/api/auth/get-session", { token });
  if (!response.ok) {
    throw new CliError(`${server} returned HTTP ${response.status}.`);
  }
  const session = SessionResponse.parse(await response.json());
  if (!session) {
    throw notLoggedIn(server);
  }
  return session.user;
}

/** Revokes the session server-side; resolves false if the server refused. */
export async function revoke(server: string, token: string) {
  const response = await send(server, "/api/auth/sign-out", {
    method: "POST",
    token,
    body: {},
  });
  return response.ok;
}
