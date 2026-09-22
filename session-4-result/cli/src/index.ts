import { CreateTodoRequest, type Todo } from "ai-tutor-api-contract";
import { Command } from "commander";
import { z } from "zod";
import { notLoggedIn } from "./api";
import { deviceLogin, fetchUser, revoke } from "./auth";
import {
  DEFAULT_SERVER,
  deleteToken,
  readToken,
  saveToken,
  serverUrl,
} from "./config";
import { CliError, EXIT_FAILURE } from "./errors";
import { serveMcp } from "./mcp";
import { addTodo, listTodos, markTodoDone } from "./todos";

const VERSION = "0.1.0";
const out = (line: string) => process.stdout.write(`${line}\n`);
const json = (value: unknown) => out(JSON.stringify(value, null, 2));

/** Tab-separated so a script can `cut -f1` the id. */
const row = (todo: Todo) =>
  `${todo.id}\t${todo.done ? "[x]" : "[ ]"}\t${todo.title}`;

async function requireToken(server: string) {
  const token = await readToken(server);
  if (!token) throw notLoggedIn(server);
  return token;
}

const program = new Command()
  .name("ai-tutor")
  .description(
    "Manage your ai-tutor to-do list from the command line.\n\n" +
      "Log in once with `ai-tutor login`; every other command then acts as that\n" +
      "user against the same list Bartholomew keeps in the web app.",
  )
  .version(VERSION)
  .showHelpAfterError("(run `ai-tutor --help` for usage)")
  .addHelpText(
    "after",
    `
Environment:
  AI_TUTOR_URL         Server to talk to (default: ${DEFAULT_SERVER}).
                       Logins are stored per server URL.
  AI_TUTOR_CONFIG_DIR  Directory for the login file (default:
                       $XDG_CONFIG_HOME/ai-tutor, %AppData%\\ai-tutor on
                       Windows, otherwise ~/.config/ai-tutor).

Files:
  <config dir>/hosts.json  Session token per server, readable only by you
                           (mode 600). The token is never printed.

Output:
  Results go to stdout, errors to stderr as "error: <message>".
  Pass --json to whoami, list, add or done for machine-readable output.

Exit codes:
  0  success
  1  failure (bad arguments, unknown id, server unreachable, ...)
  4  not logged in, or the saved login was rejected; run \`ai-tutor login\`

Examples:
  $ ai-tutor login
  $ ai-tutor add "Buy milk"
  $ ai-tutor list --query milk
  $ ai-tutor done 3f0c1a2e-7b1d-4c55-9a39-2f7e0d6b8c41
  $ AI_TUTOR_URL=https://tutor.example.com ai-tutor whoami --json`,
  );

program
  .command("login")
  .description(
    "Log in through the browser with a one-time code (device authorization).",
  )
  .addHelpText(
    "after",
    `
Prints a one-time code and a URL, then waits. Open the URL in a browser that is
signed in to the web app (sign in there first if needed), check that the page
shows the same code, and approve. The command exits 0 once approved, or 1 if
the code is denied or expires (after 30 minutes). It never opens a browser by
itself, so it works over SSH and from agents: relay the code and URL to the
user and keep the command running until it exits.

Replaces any login already stored for the same server.`,
  )
  .action(async () => {
    const server = serverUrl();
    const token = await deviceLogin(server, out);
    const user = await fetchUser(server, token);
    await saveToken(server, token);
    out(`Logged in to ${server} as ${user.name} <${user.email}>.`);
  });

program
  .command("whoami")
  .description("Show the user you are logged in as.")
  .option("--json", 'print {"server", "user": {"id", "name", "email"}}')
  .addHelpText(
    "after",
    "\nExits 4 if there is no stored login or the server no longer accepts it.",
  )
  .action(async (options: { json?: boolean }) => {
    const server = serverUrl();
    const user = await fetchUser(server, await requireToken(server));
    if (options.json) {
      json({ server, user });
    } else {
      out(`Logged in to ${server} as ${user.name} <${user.email}>.`);
    }
  });

program
  .command("logout")
  .description("Revoke the session on the server and delete the stored token.")
  .addHelpText(
    "after",
    "\nExits 4 if there is no stored login. The local token is deleted even if\nthe server cannot be reached.",
  )
  .action(async () => {
    const server = serverUrl();
    const token = await requireToken(server);
    const revoked = await revoke(server, token).catch(() => false);
    await deleteToken(server);
    if (!revoked) {
      process.stderr.write(
        `warning: ${server} did not confirm the sign-out; the local token was deleted anyway.\n`,
      );
    }
    out(`Logged out of ${server}.`);
  });

program
  .command("add")
  .description("Add an item to your to-do list.")
  .argument("<title>", "what to do; quote it if it contains spaces")
  .option("--json", 'print {"todo": {"id", "title", "done"}}')
  .addHelpText(
    "after",
    '\nPrints "<id>\\t[ ]\\t<title>". Leading and trailing whitespace is trimmed;\nan empty title is rejected.',
  )
  .action(async (title: string, options: { json?: boolean }) => {
    const request = CreateTodoRequest.safeParse({ title });
    if (!request.success) {
      throw new CliError("The title must not be empty.");
    }
    const { todo } = await addTodo(request.data);
    if (options.json) json({ todo });
    else out(row(todo));
  });

program
  .command("list")
  .description("List your to-do items, oldest first.")
  .option(
    "-q, --query <text>",
    "only items whose title contains <text> (case-insensitive)",
  )
  .option("--json", 'print {"todos": [{"id", "title", "done"}, ...]}')
  .addHelpText(
    "after",
    '\nPrints one "<id>\\t[ ]\\t<title>" line per item ("[x]" when done), or nothing\nwhen no item matches.',
  )
  .action(async (options: { query?: string; json?: boolean }) => {
    const { todos } = await listTodos(options.query);
    if (options.json) json({ todos });
    else for (const todo of todos) out(row(todo));
  });

program
  .command("done")
  .description("Mark one of your to-do items as done.")
  .argument("<id>", "the item's id, as printed by `list` or `add`")
  .option("--json", 'print {"todo": {"id", "title", "done"}}')
  .addHelpText(
    "after",
    '\nPrints "<id>\\t[x]\\t<title>". Marking an item that is already done succeeds.\nExits 1 with "not_found" if no item of yours has that id.',
  )
  .action(async (id: string, options: { json?: boolean }) => {
    const { todo } = await markTodoDone(id);
    if (options.json) json({ todo });
    else out(row(todo));
  });

program
  .command("mcp")
  .description(
    "Run a Model Context Protocol server that offers the to-do commands as tools.",
  )
  .requiredOption("--stdio", "serve over stdin/stdout (the only transport)")
  .addHelpText(
    "after",
    `
Meant to be launched by an MCP host such as Claude Code, not run by hand:
  $ claude mcp add ai-tutor -- npx ai-tutor mcp --stdio

Tools:
  list_todos      {"q"?: string}    -> {"todos": [{"id", "title", "done"}, ...]}
  add_todo        {"title": string} -> {"todo": {"id", "title", "done"}}
  mark_todo_done  {"id": string}    -> {"todo": {"id", "title", "done"}}

stdout carries only protocol messages; diagnostics go to stderr. The server uses
the login stored by \`ai-tutor login\` for AI_TUTOR_URL and reads it on every
call, so it starts without one: each tool call then fails with an error result
that says to run \`ai-tutor login\`, and works once that is done, without a
restart. The server runs until the host closes stdin.`,
  )
  .action(() => {
    serveMcp(VERSION);
  });

try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof CliError) {
    process.stderr.write(`error: ${error.message}\n`);
    process.exitCode = error.exitCode;
  } else if (error instanceof z.ZodError) {
    process.stderr.write(
      `error: unexpected response from the server: ${z.prettifyError(error)}\n`,
    );
    process.exitCode = EXIT_FAILURE;
  } else {
    process.stderr.write(
      `error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = EXIT_FAILURE;
  }
}
