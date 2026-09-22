---
name: ai-tutor-cli
description: How to read and change the user's ai-tutor to-do list from a shell with the `ai-tutor` CLI (login, whoami, list, add, done, logout, mcp). Use this whenever the user asks you to add something to their list, show open or finished to-dos, search the list, tick an item off, or check which account they are logged in as — even if they just say "my list" or "remind me to…" without naming the CLI. Also use it when testing or debugging the CLI against a running server.
---

# ai-tutor CLI

`ai-tutor` is the command-line way into the same to-do list that Bartholomew, the web app's butler, keeps. Reach for it when the user wants their list changed or read while you are working in a terminal; there is no need to open the web chat or poke the REST API with curl.

`ai-tutor --help` (and `ai-tutor <command> --help`) is the source of truth for flags, output formats, environment variables and exit codes. This skill only tells you when to use it; if anything here disagrees with the help text, trust the help text.

Run it as `npx ai-tutor …` from the repo root (plain `ai-tutor` works if it is on the PATH). It talks to `AI_TUTOR_URL`, default `http://localhost:3000`, so that server has to be running.

## Login first

Every command except `login` needs a stored login. Start with `ai-tutor whoami`; exit code 4 from any command means there is no login or it was rejected.

Do not try to work around this — the login is the user's consent for you to act on their list, so only they can give it. When it is missing, run `ai-tutor login` in the background (it blocks until approved), then tell the user something like:

> You're not logged in to ai-tutor. Open **<URL>** in a browser where you're signed in to the app, check that it shows the code **<CODE>**, and approve. I'll continue once that's done.

Relay the exact URL and code the command printed, keep it running until it exits (0 = approved, 1 = denied or expired after 30 minutes), then retry the original command. If the server is unreachable (exit 1), say so instead of asking for a login.

## Commands

Use `--json` when you need to parse the result (ids especially); plain output is fine for showing the user.

```sh
ai-tutor whoami                       # who am I logged in as?
ai-tutor list --query dentist         # items whose title contains "dentist"
ai-tutor add "Call the dentist"       # prints "<id>\t[ ]\t<title>"
ai-tutor done 3f0c1a2e-7b1d-4c55-9a39-2f7e0d6b8c41   # id comes from list/add
ai-tutor logout                       # revoke the session and delete the token
ai-tutor login                        # device-code login, see above
```

`list` shows everything, done or not, oldest first; to show what's open, filter out the `[x]` rows (or `"done": true` in JSON) yourself. `done` needs an id, so look it up with `list --query` rather than guessing, and ask the user if more than one item matches.

If the session already has `list_todos`, `add_todo` and `mark_todo_done` tools from an `ai-tutor` MCP server, use those instead; they take the same login, and an error saying to run `ai-tutor login` means the login steps above still apply. `ai-tutor mcp --stdio` is that server and is only for an MCP host to launch — never run it yourself; `docs/mcp.md` covers registering it with Claude Code.
