import { cliClientId } from "ai-tutor-contract";
import { saveCredential } from "./credentials";
import { authClient, CliError, EXIT, sessionUser, unreachable } from "./server";

const sleep = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/** Default codes are 8 characters; a dash in the middle makes them easier to copy. */
const formatUserCode = (code: string) =>
  /^[A-Z0-9]{8}$/.test(code) ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

/**
 * RFC 8628 as Better Auth serves it: request a code, show it, poll
 * /device/token at the server's interval until a signed-in user approves the
 * code on /device, then keep the session token that comes back.
 */
export async function login(server: string) {
  const client = authClient(server);
  const { data: grant, error } = await client.device
    .code({ client_id: cliClientId })
    .catch((cause: unknown) => {
      throw unreachable(server, cause);
    });
  if (error || !grant) {
    throw new CliError(
      `${server} would not start a device login: ${error?.error_description ?? error?.statusText ?? "no response"}.`,
    );
  }

  const minutes = Math.round(grant.expires_in / 60);
  process.stdout.write(
    [
      `To log in, open ${grant.verification_uri} in a browser where you are signed in, and enter this code:`,
      "",
      `    ${formatUserCode(grant.user_code)}`,
      "",
      `Waiting for approval (the code expires in ${minutes} minute${minutes === 1 ? "" : "s"})...`,
      "",
    ].join("\n"),
  );

  const deadline = Date.now() + grant.expires_in * 1000;
  let interval = grant.interval;
  while (Date.now() < deadline) {
    await sleep(interval);
    const { data, error } = await client.device
      .token({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: grant.device_code,
        client_id: cliClientId,
      })
      .catch((cause: unknown) => {
        throw unreachable(server, cause);
      });

    if (data?.access_token) {
      const user = await sessionUser(server, data.access_token);
      if (!user) {
        throw new CliError(
          `${server} issued a session it does not recognise. Try \`ai-tutor login\` again.`,
        );
      }
      await saveCredential(server, {
        token: data.access_token,
        user: { id: user.id, name: user.name, email: user.email },
      });
      process.stdout.write(`Logged in to ${server} as ${describe(user)}.\n`);
      return;
    }

    switch (error?.error) {
      case "authorization_pending":
        break;
      case "slow_down":
        interval += 5;
        break;
      case "access_denied":
        throw new CliError("The login was denied in the browser.", EXIT.auth);
      case "expired_token":
        throw expired();
      default:
        throw new CliError(
          `${server} ended the device login: ${error?.error_description ?? error?.statusText ?? "no token in the response"}.`,
          EXIT.auth,
        );
    }
  }

  throw expired();
}

const expired = () =>
  new CliError(
    "The code expired before it was approved. Run `ai-tutor login` again.",
    EXIT.auth,
  );

export const describe = (user: { name: string; email: string }) =>
  `${user.name} <${user.email}>`;
