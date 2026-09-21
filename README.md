# Agentic development classroom

This repository holds the teaching material for [Agentische Entwicklung - mit Claude Code, Mastra und CopilotKit zum eigenen KI-Chat-Agenten](https://heise-academy.de/kurs/classroom-agentische-entwicklung-mit-claude-code-mastra-u-0adbea#sessions), a five-session Heise Academy classroom taught by Rainer Stropek.

The classroom follows one AI chat agent, `ai-tutor`, from its first Next.js project through tools, Model Context Protocol (MCP) integration, security, generative UI, and continuous integration and deployment (CI/CD). The app gives each lesson something real to build, and what you actually learn is how to use Claude Code as a coding agent in the editor, the terminal, GitHub, and an automated delivery pipeline.

Sessions 1 to 3 are in the repository with their results. Session 4 has its storybook, its result folder follows after the live session, and so does session 5.

## Sessions

Each session has a storybook and a result folder. The storybook is the live-coding script: every step has a goal, the prompt given to Claude Code, teaching points, and a verification checklist. Step numbers keep counting across sessions. The result folder is the finished app at the end of that session, and it's the starting point for the next one.

| Session | Storybook | Steps | Result |
|---|---|---|---|
| 1 | [`storybook-01.md`](storybook-01.md) | 1 to 7 | [`session-1-result/`](session-1-result/) |
| 2 | [`storybook-02.md`](storybook-02.md) | 8 to 13 | [`session-2-result/`](session-2-result/) |
| 3 | [`storybook-03.md`](storybook-03.md) | 14 to 18 | [`session-3-result/`](session-3-result/) |
| 4 | [`storybook-04.md`](storybook-04.md) | 19 to 24 | follows |

Students don't clone this repository to follow along. Sessions 2 to 4 each start from a separate starter repository that the storybook links to: [`2026-claude-classroom-2-starter`](https://github.com/rstropek/2026-claude-classroom-2-starter), [`2026-claude-classroom-3-starter`](https://github.com/rstropek/2026-claude-classroom-3-starter), and [`2026-claude-classroom-4-starter`](https://github.com/rstropek/2026-claude-classroom-4-starter).

### Session 1: first project

Session 1 builds `ai-tutor`, a tutoring chat where each student has a private conversation. The stack is Next.js, Better Auth, SQLite with Drizzle, a Mastra agent, and CopilotKit over the AG-UI protocol. The lesson is how to direct one agent run. It covers outcome-focused prompts, grounding the agent in current documentation, project memory in `AGENTS.md`, reusable skills, and verification with Vitest and Playwright.

### Session 2: working with an agent over time

Session 2 continues in the existing repo. The tutor gets typed tools backed by a `todos` table, a read-only sidebar shows the list, and a design skill derived from heise.de restyles the app in two parallel worktrees. The teaching topics are plan mode, dependency upgrades with tests as the safety net, context hygiene, delegation to cheaper models, custom skills, and Git worktrees.

[`conversation-sample-session-2.json`](conversation-sample-session-2.json) is a recorded sample conversation from this session.

### Session 3: building for agents

Session 3 gives the app three clients that aren't browsers. First comes a REST API with Better Auth bearer tokens, then a CLI with a device login and a skill that teaches agents to use it. That same CLI runs as a local MCP server, and the app finally exposes an MCP server over Streamable HTTP, protected by OAuth. A shared `contract` workspace holds the zod schemas that the server, the CLI, and the MCP tools all import.

Session 3 also has a presentation on sandboxing:

- [`session-3-presentation/`](session-3-presentation/) holds the slides, a zipped demo kit, and the unpacked demos. [`demos/README.md`](session-3-presentation/demos/README.md) explains how to prepare and run each sandbox demo.
- [`session-3-overview.svg`](session-3-overview.svg) is the architecture diagram the storybook embeds, and `session-3-overview.txt` is its source.

### Session 4: generative UI

Session 4 gives the agent a say in the user interface. It starts with a CodeTour through the `useRenderTool` rows from session 2, which are generative UI of the controlled kind. Then comes A2UI: a progress card in the chat with a fixed component tree and a custom catalog, generated surfaces from a second model call, and a project wizard on a page without a chat, where a memory-less agent changes one card in place. The second half switches to MCP Apps, where the MCP server from session 3 ships a to-do form as one self-contained HTML file and MCPJam renders it in a sandboxed iframe. The model drafts the title, the human clicks Add, and the save goes through a tool marked app-only. The starter carries the plain code for the wizard and the form, so the prompts spend their time on the agents and on the two protocols.

## Repository layout

```text
storybook-NN.md           Live-coding script per session, the single source of truth
session-N-result/         Finished app at the end of session N
session-3-presentation/   Session 3 slides and sandbox demos
session-4-useRenderTool/  Two-file mini app: one Mastra tool, one useRenderTool card
images/                   svgbob diagram sources (.bob) and rendered SVGs
_quarto.yml               PDF build configuration
_style/                   Quarto filters, theme, and LaTeX styling
_output/                  Rendered PDFs
.claude/skills/           Project skills for authoring the material (svgbob, writing-guide)
claude-via-mitmproxy.sh   Runs one Claude Code prompt through a mitmproxy container
```

## Render the storybooks

Install [Quarto](https://quarto.org/) and a TeX distribution that provides XeLaTeX. From the repository root, render every storybook:

```bash
quarto render
```

To render one session, name its file:

```bash
quarto render storybook-03.md
```

Quarto writes the PDFs to `_output/`. The `storybook-*.md` glob in `_quarto.yml` picks up new sessions without a config change. Keep lesson content in plain Markdown in the storybook, because `_quarto.yml` and `_style/` own the PDF presentation.

`_output/` currently holds only `storybook-01.pdf`. Render again to get the PDFs for Sessions 2 and 3.

## Run a result app

Each result app needs Node.js 20.9 or newer, an OpenRouter API key, and a Better Auth secret. Pick a session folder and run:

```bash
cd session-2-result
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Fill in `.env` before `db:migrate`. The app runs at <http://localhost:3000>.

The result folders differ in a few ways:

- `session-3-result/` has no `.env.example` or `.gitignore` in the repository. Its `AGENTS.md` lists the variables `.env` needs (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OPENROUTER_API_KEY`), so create the file by hand.
- The result READMEs are still the `create-next-app` default. Read each folder's `AGENTS.md` for the real architecture and commands.

`npm test` runs the Vitest suite and `npm run test:e2e` runs Playwright. Neither calls a language model. Sessions 2 and 3 add `npm run test:e2e:llm`, which does call one and spends OpenRouter credit.

## Audience

The classroom is for experienced software developers, technical leads, software architects, and DevOps engineers. You should be comfortable with Visual Studio Code, Git, and a terminal. TypeScript or JavaScript experience is recommended, and React or Next.js knowledge helps.
