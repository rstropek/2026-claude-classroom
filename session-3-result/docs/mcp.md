# The ai-tutor MCP server in Claude Code

ai-tutor is a [Model Context Protocol](https://modelcontextprotocol.io) server
that lets an agent work on your to-do list through three tools:

| Tool             | Does                                      | Input                  |
| ---------------- | ----------------------------------------- | ---------------------- |
| `list_todos`     | lists your todos, oldest first            | `q` (optional filter)  |
| `add_todo`       | adds a todo and returns it with its id    | `title`                |
| `mark_todo_done` | marks a todo done and returns it          | `id`                   |

You can connect it in two ways. Both have the same tools, with the same names,
descriptions, and input schemas:

- **Remote, over HTTP** ([below](#remote-the-web-apps-apimcp)): Claude Code
  connects to `/api/mcp` on the running web app and signs you in with OAuth in
  the browser. There is nothing to build or install, and no `ai-tutor login`.
- **Local, over stdio** (the rest of this page): `ai-tutor mcp --stdio`
  runs as a subprocess on your machine and uses the login that `ai-tutor
  login` stored.

## Remote: the web app's /api/mcp

`/api/mcp` is a Streamable HTTP endpoint in the web app. It works directly on
the todos table and is protected by OAuth 2.1. The web app is its own
authorization server (Better Auth), so there is no third-party identity
provider involved.

### Register it

Start the web app (`npm run dev`), then from the project directory:

```bash
claude mcp add --transport http ai-tutor http://localhost:3000/api/mcp
```

The same `--scope project` and `--scope user` options as below apply. A URL
needs no path fixing, so a user-scoped or `.mcp.json` entry works unchanged
on every machine that can reach the server. For a deployed app, use its HTTPS
URL, e.g. `https://tutor.example.com/api/mcp`.

If you also keep the stdio server registered, give the two different names,
e.g. `ai-tutor` and `ai-tutor-remote`.

### Log in

No client ID, secret, or callback port is needed. Claude Code identifies itself
with a Client ID Metadata Document, a public JSON file at a claude.ai URL
that the web app looks up. So nobody has to register Claude Code with the app
first. Run either of these:

- in a terminal: `claude mcp login ai-tutor`
- in a session: `/mcp`, select `ai-tutor`, then **Authenticate**

Claude Code opens the browser on the web app, and the rest happens there:

1. **Log in** with your ai-tutor email and password, unless you already are.
   **Sign up** also works.
2. **Consent.** The page names the application, e.g. *Claude Code (from
   claude.ai)*, and the account it will act as, and lists what it may do:
   read your to-do list, add to it, and mark items done, and stay connected
   without asking again. Choose **Allow**. **Deny** cancels the login in
   Claude Code.
3. The browser returns to Claude Code, which stores the tokens, and the server
   shows as connected. Once you have allowed it, later logins skip the
   consent page.

Tokens last an hour and Claude Code refreshes them on its own, so you
normally log in once. `claude mcp logout ai-tutor` (or **Clear
authentication** in `/mcp`) removes the tokens from Claude Code.

Every call acts as the account you logged in with: the server takes the user
from the verified access token and from nothing else in the request. A token
is only accepted by the `/api/mcp` it was issued for.

### What the server needs

- `BETTER_AUTH_URL` must be the URL clients reach, because tokens are bound to
  `<BETTER_AUTH_URL>/api/mcp`. Register `http://localhost:3000/api/mcp` for the
  default `.env`, not `127.0.0.1`.
- The web app needs outbound HTTPS to fetch Claude Code's metadata document from
  claude.ai the first time Claude Code logs in, and again when it is refreshed.
- Plain HTTP only works on `localhost`. Anywhere else, the app has to be
  served over HTTPS.

### Check it

`claude mcp list` shows `! Needs authentication` until you log in, then
`✔ Connected`. The `claude -p` check under
[Check that it is connected](#check-that-it-is-connected) works the same for
the remote server, but `claude -p` cannot run the browser login itself. Log in
interactively first.

To see the unauthenticated side by hand:

```bash
curl -i -X POST http://localhost:3000/api/mcp -H 'content-type: application/json' -d '{}'
curl http://localhost:3000/.well-known/oauth-protected-resource/api/mcp
```

The first command answers `401` with a `WWW-Authenticate` header pointing at
the second. That header is how Claude Code finds out where to log in.

## Local: ai-tutor mcp --stdio

`ai-tutor mcp --stdio` is the same CLI as `ai-tutor list`/`add`/`done`, calls
the same `/api/todos`, and uses the login that `ai-tutor login` stored. Claude
Code starts it as a subprocess and talks to it over stdin/stdout. You never
run it by hand.

### Before you register it

1. `npm install` in this repo, which also builds the CLI (after pulling
   changes, `npm run build -w ai-tutor-cli`).
2. Start the web app: `npm run dev`.
3. Log in once from a terminal: `npx ai-tutor login`, then approve the code in
   the browser.

The server also starts without a login. In that case every tool call returns an
error telling you to run `ai-tutor login`. Once you have, the next tool call
works without restarting the server or Claude Code.

The login is stored per server URL in `~/.config/ai-tutor/hosts.json`, not in
the repo. So one login serves every project on the machine, provided Claude
Code starts the server with the same `AI_TUTOR_URL`, `AI_TUTOR_CONFIG_DIR`,
and `XDG_CONFIG_HOME` as your terminal had when you logged in. To use a server
other than `http://localhost:3000`, pass it at registration and run `login`
with the same `AI_TUTOR_URL`:

```bash
claude mcp add ai-tutor -e AI_TUTOR_URL=https://tutor.example.com -- node cli/bin/ai-tutor.js mcp --stdio
```

Put `-e` after the server name. `-e` takes any number of `KEY=value` pairs, so
`claude mcp add -e AI_TUTOR_URL=… ai-tutor -- …` reads `ai-tutor` as one more
pair and fails with `Invalid environment variable format: ai-tutor`.

The commands below run the CLI with `node` and a path to `cli/bin/ai-tutor.js`
rather than with `npx ai-tutor`. That starts faster, and it can never download
an unrelated package named `ai-tutor` from the registry when the local bin is
missing.

### Register it for this repo

From the repo root:

```bash
claude mcp add ai-tutor -- node cli/bin/ai-tutor.js mcp --stdio
```

Everything after `--` is the server's command line. This uses the default
`local` scope: the entry is private to you and lives in `~/.claude.json` under
this project's path. Claude Code starts local- and project-scoped servers in
the project directory, which is why the relative path works.

To share the registration with everyone who clones the repo, add
`--scope project` instead. That writes `.mcp.json` in the repo root, for you to
commit:

```bash
claude mcp add --scope project ai-tutor -- node cli/bin/ai-tutor.js mcp --stdio
```

Each person is asked to approve a project-scoped server the first time they
start `claude` in the repo. Until then it is listed as pending approval.

### Register it for a project elsewhere on the machine

Outside this repo, the relative path no longer resolves, so point at the CLI
with an absolute path. Run this in the other project's directory, replacing
`/path/to/ai-tutor` with where this repo is checked out:

```bash
cd ~/code/some-other-project
claude mcp add ai-tutor -- node /path/to/ai-tutor/cli/bin/ai-tutor.js mcp --stdio
```

That registers it for that project only (local scope). Two variants:

- **Every project you open:** add `--scope user`. The entry goes into
  `~/.claude.json` for all your projects. User-scoped servers start in
  `~/.claude`, so the path must be absolute there too.
- **A shared `.mcp.json` in that project:** your absolute path would be
  wrong on anyone else's machine, so use environment-variable expansion and
  have each person set `AI_TUTOR_HOME` to their checkout:

  ```json
  {
    "mcpServers": {
      "ai-tutor": {
        "type": "stdio",
        "command": "node",
        "args": ["${AI_TUTOR_HOME}/cli/bin/ai-tutor.js", "mcp", "--stdio"]
      }
    }
  }
  ```

  `claude mcp add --scope project ai-tutor -- node '${AI_TUTOR_HOME}/cli/bin/ai-tutor.js' mcp --stdio`
  writes the same file. The single quotes keep your shell from expanding the
  variable first.

The web app still has to be running, wherever the project is.

### Check that it is connected

From the project directory:

```bash
claude mcp list          # every server with a health check
claude mcp get ai-tutor  # scope, command, and status of this one
```

Both start the server to check it. You want `✔ Connected`. The other statuses:

- **`⏸ Pending approval`:** a `.mcp.json` server nobody has approved yet. Run
  `claude` in that directory and approve it.
- **`✘ Failed to connect`:** Claude Code could not start the server or finish
  the handshake. Usually the path to `cli/bin/ai-tutor.js` is wrong (check the
  `Args` line of `claude mcp get ai-tutor`) or the CLI is not built. Run the
  same command in a terminal: a working server prints nothing and waits for
  input (Ctrl+C to quit), while a broken one prints its error.

Inside a session, `/mcp` shows the server, its status, and its three tools,
and lets you reconnect it. To check the whole path, including the login and
the web app, ask Claude something like "what's on my ai-tutor list?". It
should call `list_todos` (shown as `mcp__ai-tutor__list_todos`). If the answer
says you are not logged in, run `! npx ai-tutor login` in the session and ask
again. If it says the server can't be reached, start `npm run dev`.

Note that `Connected` only means the MCP server started. It does not check the
login or the web app, which are only used when a tool is called.

To run that end-to-end check without an interactive session, e.g. in a script,
run this from the project directory:

```bash
claude -p "What's on my ai-tutor to-do list, and which items are still open?" \
  --tools "" \
  --allowedTools "mcp__ai-tutor__list_todos,mcp__ai-tutor__add_todo,mcp__ai-tutor__mark_todo_done" \
  --permission-mode dontAsk < /dev/null
```

`--tools ""` turns off the built-in tools (Bash, file reads, and so on), so the
answer can only come from the MCP server. `--allowedTools` pre-approves the
three todo tools, and `dontAsk` denies any other tool instead of prompting.
`< /dev/null` stops `claude -p` from waiting three seconds for piped input.
`claude -p` loads `.mcp.json` servers without asking for approval. Add
`--output-format stream-json --verbose` to see each tool call and its result.

To unregister, run `claude mcp remove ai-tutor`, adding `-s project` or
`-s user` if you registered it in that scope.
