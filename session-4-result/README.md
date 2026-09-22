# ai-tutor

An AI tutoring web app on Next.js 16 App Router, React 19 and Tailwind v4: a Mastra agent
(Bartholomew, a butler who keeps your to-do list and declines everything else) served to a
CopilotKit chat over AG-UI, behind Better Auth email/password sign-in, over a Drizzle/SQLite
persistence layer, with a Vitest and Playwright test harness. The root package is also an npm
workspace root for `cli/` and `packages/api-contract/`.

This repository is the starter code for session 4 of the classroom at
https://github.com/rstropek/2026-claude-classroom, where `storybook-04.md` is the script for
the session.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `OPENROUTER_API_KEY` with your own OpenRouter key and `BETTER_AUTH_SECRET` with the
output of `openssl rand -base64 32`. Then create the database and start the app:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000 and sign up. The SQLite file under `data/` is disposable, and
`db:migrate` recreates it.

`mcp-apps/` holds the views for MCP Apps, one folder per view; `npm run dev` and
`npm run build` bundle each one into a single self-contained HTML file through
`npm run build:views` before they start.

## Tests

```bash
npm test          # Vitest, single run
npm run test:e2e  # Playwright, Chromium, on its own dev server
```

`npm run test:e2e:llm` runs the one spec that talks to the model, so it spends OpenRouter
credit. It is excluded from `npm run test:e2e`.

## Code tour

The repository carries two VS Code CodeTours: one walks the path from an agent tool call to
the component it draws in the chat transcript, the other the build that turns a folder under
`mcp-apps/` into the single HTML file an MCP host can serve.

1. Install the CodeTour extension (`vsls-contrib.codetour`); VS Code offers it on open.
2. Open this directory as the workspace root, not a parent folder, or the tours' paths will
   not resolve.
3. In the CodeTour view of the explorer sidebar, start "Controlled generative UI:
   useRenderTool" or "MCP App views: one HTML file per view".

## Architecture

`AGENTS.md` is the entry point: a map of the repository plus the traps that no single source
file shows. The decisions behind each file are commented in the file itself. Read the map
before changing anything.
