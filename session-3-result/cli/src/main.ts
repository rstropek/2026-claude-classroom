import type { Todo } from "ai-tutor-contract";
import { Command, CommanderError } from "commander";
import { version } from "../package.json";
import { deleteCredential, loadCredential } from "./credentials";
import { describe, login } from "./login";
import { serveMcpStdio } from "./mcp";
import {
  addTodo,
  authClient,
  CliError,
  DEFAULT_SERVER,
  EXIT,
  listTodos,
  notLoggedIn,
  serverUrl,
  sessionUser,
  setTodoDone,
} from "./server";

const print = (line: string) => process.stdout.write(`${line}\n`);
const printJson = (value: unknown) => print(JSON.stringify(value, null, 2));

/** One todo per line: id, a tab, [x] or [ ], a tab, the title. */
const todoLine = (todo: Todo) =>
  `${todo.id}\t${todo.done ? "[x]" : "[ ]"}\t${todo.title}`;

async function requireToken(server: string) {
  const credential = await loadCredential(server);
  if (!credential) {
    throw notLoggedIn(server);
  }
  return credential.token;
}

const program = new Command()
  .name("ai-tutor")
  .version(version)
  .description(
    "Manage your ai-tutor to-do list from the command line: log in once, then add, list, and complete todos.",
  )
  .showHelpAfterError("(run `ai-tutor --help` for usage)")
  // Throw instead of exiting, so the catch below can map usage errors to 2.
  .exitOverride()
  .addHelpText(
    "after",
    `
Getting started:
  1. ai-tutor login          prints a URL and a code, then waits
  2. Open the URL in a browser where you are signed in to the web app, enter
     the code, and approve. login returns as soon as the code is approved.
  3. ai-tutor add "Buy milk" && ai-tutor list

  login needs a person with a browser. An agent should run it, show the URL and
  code to its user, and wait for the command to exit; every other command runs
  unattended once a login is stored.

  An MCP client can run \`ai-tutor mcp --stdio\` instead and call list, add,
  and done as tools; see \`ai-tutor mcp --help\`.

Output:
  add, list, and done print one todo per line as <id>, a tab, [x] (done) or
  [ ] (open), a tab, and the title. Pass --json for the API's JSON instead:
  {"todos":[...]} from list, {"todo":{...}} from add and done, where a todo
  is {"id": string, "title": string, "done": boolean}.

Environment:
  AI_TUTOR_URL         server to talk to (default: ${DEFAULT_SERVER})
  AI_TUTOR_CONFIG_DIR  where credentials live (default: $XDG_CONFIG_HOME/ai-tutor,
                       else ~/.config/ai-tutor; %AppData%\\ai-tutor on Windows)

Files:
  <config dir>/hosts.json  one session token per server URL, readable only by
                           you (mode 600). Tokens are never printed.

Exit codes:
  0  success
  1  the request failed (server unreachable, unknown todo id, ...)
  2  usage error (unknown command or option, missing or empty argument)
  4  not logged in, session expired, or login denied or expired: run login

Examples:
  $ ai-tutor login
  $ ai-tutor whoami
  $ ai-tutor add "Call Grace"
  $ ai-tutor list --query grace
  $ ai-tutor done 3f9c2a4e-8d1b-4c55-9a0e-2b7f6d1c8e90
  $ AI_TUTOR_URL=https://tutor.example.com ai-tutor list --json
`,
  );

program
  .command("login")
  .description(
    "Log in with a device code: prints a URL and a one-time code, then waits until you approve the code in the browser (up to 30 minutes). Replaces any login already stored for this server.",
  )
  .addHelpText(
    "after",
    `
The browser is not opened for you. Open the printed URL on any device where you
are signed in to the web app, check that the code matches, and approve it.`,
  )
  .action(async () => {
    await login(serverUrl());
  });

program
  .command("whoami")
  .description(
    "Print the name and email of the logged-in user, checked against the server. Exits 4 when not logged in or the session is no longer valid.",
  )
  .option("--json", 'print {"server", "user": {"id", "name", "email"}}')
  .action(async (options: { json?: boolean }) => {
    const server = serverUrl();
    const user = await sessionUser(server, await requireToken(server));
    if (!user) {
      throw new CliError(
        `The session stored for ${server} is no longer valid. Run \`ai-tutor login\` again.`,
        EXIT.auth,
      );
    }
    if (options.json) {
      printJson({
        server,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } else {
      print(`Logged in to ${server} as ${describe(user)}.`);
    }
  });

program
  .command("logout")
  .description(
    "End the session on the server and delete the stored token for this server. Succeeds when already logged out.",
  )
  .action(async () => {
    const server = serverUrl();
    const credential = await loadCredential(server);
    if (!credential) {
      print(`Not logged in to ${server}; nothing to do.`);
      return;
    }

    // Revoke first, but never keep a token around because the server is down.
    const revoked = await authClient(server)
      .signOut({
        fetchOptions: {
          headers: { authorization: `Bearer ${credential.token}` },
        },
      })
      .then(({ error }) => !error)
      .catch(() => false);
    await deleteCredential(server);

    print(`Logged out of ${server}.`);
    if (!revoked) {
      process.stderr.write(
        "Warning: the server could not be told, so the session stays valid there until it expires.\n",
      );
    }
  });

program
  .command("add")
  .description("Add a todo to your list and print it, including its new id.")
  .argument(
    "<title...>",
    'what to do; quote it ("Buy milk") or pass the words as separate arguments',
  )
  .option("--json", 'print {"todo": {...}}')
  .action(async (words: string[], options: { json?: boolean }) => {
    const server = serverUrl();
    const result = await addTodo(
      server,
      await requireToken(server),
      words.join(" "),
    );
    options.json ? printJson(result) : print(todoLine(result.todo));
  });

program
  .command("list")
  .description(
    "List your todos, open and done, oldest first. Prints nothing when there are none.",
  )
  .option(
    "-q, --query <text>",
    "only todos whose title contains <text>, ignoring case",
  )
  .option("--json", 'print {"todos": [...]}')
  .action(async (options: { query?: string; json?: boolean }) => {
    const server = serverUrl();
    const result = await listTodos(
      server,
      await requireToken(server),
      options.query,
    );
    if (options.json) {
      printJson(result);
    } else {
      for (const todo of result.todos) {
        print(todoLine(todo));
      }
    }
  });

program
  .command("done")
  .description(
    "Mark a todo done and print it. Take the id from the first column of `ai-tutor list`. Exits 1 when no todo on your list has that id.",
  )
  .argument("<id>", "the todo's id")
  .option("--json", 'print {"todo": {...}}')
  .action(async (id: string, options: { json?: boolean }) => {
    const server = serverUrl();
    const result = await setTodoDone(
      server,
      await requireToken(server),
      id,
      true,
    );
    options.json ? printJson(result) : print(todoLine(result.todo));
  });

program
  .command("mcp")
  .description(
    "Run a Model Context Protocol server that offers list, add, and done to an agent as the tools list_todos, add_todo, and mark_todo_done. Starts without a login; each tool call then fails with a message to run `ai-tutor login`.",
  )
  .requiredOption(
    "--stdio",
    "serve over stdin/stdout (the only transport); runs until stdin closes",
  )
  .addHelpText(
    "after",
    `
stdout carries MCP messages only, and diagnostics go to stderr, so start it from
an MCP client rather than by hand. Each tool call reads the stored login for
AI_TUTOR_URL at that moment, so logging in or out takes effect without a
restart. Tool errors (not logged in, unknown id, server unreachable) come back
as tool results with isError set, not as exit codes.

Example (Claude Code, run in the repo root; docs/mcp.md covers the rest):
  $ claude mcp add ai-tutor -- node cli/bin/ai-tutor.js mcp --stdio`,
  )
  .action(async () => {
    await serveMcpStdio();
  });

try {
  await program.parseAsync();
} catch (error) {
  // Commander has already printed its message (or the help and version).
  if (error instanceof CommanderError) {
    process.exit(error.exitCode === 0 ? 0 : EXIT.usage);
  }
  if (error instanceof CliError) {
    process.stderr.write(`ai-tutor: ${error.message}\n`);
    process.exit(error.exitCode);
  }
  process.stderr.write(
    `ai-tutor: unexpected error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(EXIT.failure);
}
