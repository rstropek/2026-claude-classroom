# Using the ai-tutor MCP servers with Claude Code

ai-tutor offers the to-do list as a [Model Context Protocol](https://modelcontextprotocol.io) server with three tools:

| Tool             | Input               | Result                                  |
| ---------------- | ------------------- | --------------------------------------- |
| `list_todos`     | `{ "q"?: string }`  | `{ "todos": [{ "id", "title", "done" }] }` |
| `add_todo`       | `{ "title": string }` | `{ "todo": { "id", "title", "done" } }`  |
| `mark_todo_done` | `{ "id": string }`  | `{ "todo": { "id", "title", "done" } }`  |

There are two ways to connect. Both serve the same tool names, descriptions and schemas:

- **Local, over stdio:** `ai-tutor mcp --stdio`, a process Claude Code starts on your machine. It needs this repo's CLI built and an `ai-tutor login`, and it calls the web app's REST API.
- **Remote, over HTTP:** `/api/mcp` in the web app itself. Nothing to install: Claude Code connects to the URL and you log in through the browser with OAuth. See [Remote option](#remote-option-apimcp-over-http).

## Local option: `ai-tutor mcp --stdio`

It is the same client as the `ai-tutor` commands: it talks to `AI_TUTOR_URL` (default `http://localhost:3000`) with the login `ai-tutor login` stored. `npx ai-tutor mcp --help` is the reference.

### Before you register it

1. `npm install` in this repo builds the CLI (rebuild after edits with `npm run build -w ai-tutor-cli`).
2. Start the web app (`npm run dev`), or point `AI_TUTOR_URL` at a running one.
3. Run `npx ai-tutor login` and approve the code in the browser.

Login is optional to get connected. The server starts without a login, and every tool call then returns an error telling you to run `ai-tutor login`. It reads the login on every call, so logging in (or out) takes effect without restarting the server.

### Register it for this repo

From the repo root:

```sh
claude mcp add ai-tutor -- npx ai-tutor mcp --stdio
```

This uses the default **local** scope: the entry is private to you, stored in `~/.claude.json` under this project's path, and loads only when Claude Code runs in this repo. Claude Code starts the server in the project directory, so `npx` finds the workspace's linked `ai-tutor` binary. Everything after `--` is the server command. Without the `--`, Claude Code would try to read `--stdio` as one of its own options.

For another server, pass the URL as an environment variable. Put another option between `--env` and the server name, or the name is read as a second `KEY=value` pair:

```sh
claude mcp add --env AI_TUTOR_URL=https://tutor.example.com --transport stdio ai-tutor \
  -- npx ai-tutor mcp --stdio
```

To share the entry with everyone who clones the repo, add `--scope project` instead. That writes `.mcp.json` at the repo root, which you commit:

```json
{
  "mcpServers": {
    "ai-tutor": {
      "type": "stdio",
      "command": "npx",
      "args": ["ai-tutor", "mcp", "--stdio"]
    }
  }
}
```

Claude Code asks each person to approve a project-scoped server the first time they start `claude` in the repo. Until then it shows as `⏸ Pending approval`. `claude mcp reset-project-choices` clears those choices.

### Register it for a project elsewhere on the machine

Outside this repo `npx ai-tutor` would look for a package of that name on the npm registry, which is not this CLI. So give Claude Code the absolute path to the binary instead. Run this in the other project's directory, replacing the path with where this repo lives:

```sh
cd ~/code/some-other-project
claude mcp add ai-tutor -- node /absolute/path/to/ai-tutor/cli/bin/ai-tutor.js mcp --stdio
```

That is local scope again: it loads only in `some-other-project`. For every project on the machine, register it once with `--scope user` (from any directory):

```sh
claude mcp add --scope user ai-tutor -- node /absolute/path/to/ai-tutor/cli/bin/ai-tutor.js mcp --stdio
```

Do not use `--scope project` for this. The `.mcp.json` it writes would commit a path that only exists on your machine.

The path still points into this repo, so rebuild here (`npm run build -w ai-tutor-cli`) after pulling CLI changes. The login is per user and server, not per project, so one `ai-tutor login` serves every project.

If one name is defined in more than one scope, local wins over project, and project wins over user.

### Check that it's connected

From a shell in the project:

```sh
claude mcp list          # every server, with a health status
claude mcp get ai-tutor  # scope, command, args and status of this one
```

`claude mcp get` prints an `Environment:` heading but not the values set with `--env`; those are in `~/.claude.json` (local and user scope) or `.mcp.json`. Both commands start the server and check it, so a working registration shows `✔ Connected`, even before you log in. `✘ Failed to connect` usually means the command is wrong. Run it by hand (`node /absolute/path/to/ai-tutor/cli/bin/ai-tutor.js mcp --stdio`): it should wait silently on stdin, and Ctrl-C ends it. An error there means the CLI is not built or the path is wrong. `⏸ Pending approval (run claude to approve)` is a project-scoped server nobody has approved in this checkout yet.

Inside a Claude Code session, run `/mcp` to see the server's status and its three tools, and to reconnect it. Then check it end to end by asking Claude something like "what's on my ai-tutor list?". A `list_todos` call that answers `Not logged in … Run ai-tutor login first.` means the connection works and only the login is missing. The URL in that message is the server it used, so check it when you expected to be logged in: logins are stored per server, so a mistyped or changed `AI_TUTOR_URL` reports `Not logged in` rather than an unreachable server. `Cannot reach …` means you are logged in to `AI_TUTOR_URL` but the web app is not running there.

To take it out again: `claude mcp remove ai-tutor` (add `-s user` or `-s project` for those scopes).

## Remote option: `/api/mcp` over HTTP

The web app serves the same tools over Streamable HTTP at `/api/mcp`, working on the database directly. It accepts only OAuth access tokens that the app itself issued for that URL, and the list a token reaches is the list of the user who approved it.

Claude Code needs no client ID or secret. It identifies itself with a Client ID Metadata Document, `https://claude.ai/oauth/claude-code-client-metadata`, which the app fetches when you log in. So the app needs outbound HTTPS to `claude.ai`.

### Register it

Start the web app (`npm run dev`), then from the repo root:

```sh
claude mcp add --transport http ai-tutor-http http://localhost:3000/api/mcp
```

Use a name other than `ai-tutor`. This repo's `.mcp.json` already defines `ai-tutor` as the stdio server, and a local entry with the same name would replace it.

The URL must use the origin in `BETTER_AUTH_URL`. Access tokens are bound to `<BETTER_AUTH_URL>/api/mcp`, so registering `http://127.0.0.1:3000/api/mcp` while `BETTER_AUTH_URL` is `http://localhost:3000` fails at login. For a deployed app, use its HTTPS URL. Plain HTTP is accepted only for `localhost` and loopback addresses.

To share the entry with the repo, add `--scope project`, which writes this to `.mcp.json`:

```json
{
  "mcpServers": {
    "ai-tutor-http": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

Unlike the stdio entry, this one works from any project on the machine as is, because it contains no path. For every project, register it once with `--scope user`.

### Log in

Until you log in, `claude mcp list` shows the server as `! Needs authentication`. Start the login in one of two ways:

- Inside a Claude Code session, run `/mcp`, select `ai-tutor-http`, and choose **Authenticate**.
- From a shell, run `claude mcp login ai-tutor-http`.

Claude Code opens the browser on the app:

1. If you are not signed in to ai-tutor in that browser, the **Log in** page appears. Log in with your ai-tutor email and password. There is no separate account for MCP.
2. The **Allow access?** page shows who is asking and what they get: Claude Code, identified by `https://claude.ai/oauth/claude-code-client-metadata`, returning to `http://localhost:<port>/callback`, allowed to read your list, add items and mark them done, and to keep that access without asking you to log in again.
3. Choose **Allow**. The browser returns to Claude Code, which stores the tokens. **Deny** sends the refusal back instead, and nothing gets access.

Only allow a request that you started yourself. The name "Claude Code" comes from the client's own metadata document. The **Identified by** URL is what identifies the client.

If you have no account yet, sign up at `/signup` first, then start the login again. The sign-up page does not continue the login flow.

Access tokens last one hour. Claude Code refreshes them on its own, so you log in once per server. To log out, run `claude mcp logout ai-tutor-http` or choose **Clear authentication** in `/mcp`. `claude mcp remove` also deletes the stored tokens.

In non-interactive runs (`claude -p`), Claude Code cannot open a browser. Log in from an interactive session first.

### Check that it's connected

After logging in, `claude mcp get ai-tutor-http` shows `✔ Connected`, and `/mcp` lists the three tools. Ask Claude something like "what's on my ai-tutor list?" to check it end to end. It shows the list of the account you allowed on the consent page.

If the login does not start, check the two things Claude Code reads before it opens the browser:

```sh
curl -si -X POST http://localhost:3000/api/mcp | grep -i www-authenticate
curl -s http://localhost:3000/.well-known/oauth-protected-resource/api/mcp
```

The first should print a `Bearer resource_metadata="…/.well-known/oauth-protected-resource/api/mcp"` challenge. The second should name `<BETTER_AUTH_URL>/api/mcp` as `resource`. If the resource there differs from the URL you registered, fix the URL or `BETTER_AUTH_URL`.
