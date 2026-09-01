# Agentic development classroom

This repository contains the teaching material for [Agentische Entwicklung - mit Claude Code, Mastra und CopilotKit zum eigenen KI-Chat-Agenten](https://heise-academy.de/kurs/classroom-agentische-entwicklung-mit-claude-code-mastra-u-0adbea#sessions), a five-session Heise Academy classroom taught by Rainer Stropek.

The classroom follows one AI chat agent from its first Next.js project through tools, Model Context Protocol (MCP) integration, security, generative UI, and continuous integration and deployment (CI/CD). The code is the vehicle for learning how to use Claude Code as a coding agent across the editor, terminal, GitHub, and an automated delivery pipeline.

This repository currently contains the material for **Session 1: Claude Code einsetzen - Agenten-Landschaft verstehen und erstes Projekt aufsetzen**.

## Session 1

Session 1 builds `ai-tutor`, a small tutoring chat in which each student has a private conversation and a todo list managed through agent tools. The application combines Next.js, Better Auth, SQLite with Drizzle, a Mastra agent, and CopilotKit over the AG-UI protocol.

The main lesson is how to direct a coding agent. The storybook works through outcome-focused prompts, grounding in current documentation, project memory in `AGENTS.md`, reusable skills, and executable verification with Vitest and Playwright.

Start with these two files:

- [`storybook-01.md`](storybook-01.md) is the live-coding script. It contains each goal, the prompt given to Claude Code, teaching notes, and verification checks.
- [`session-01/ai-tutor/README.md`](session-01/ai-tutor/README.md) documents the finished reference application, including its architecture, environment variables, commands, and tests.

The root repository ignores `session-01/`. The reference application is a local artifact used to develop and verify the teaching script, rather than part of the published course-material history.

## Repository layout

```text
storybook-01.md        Session 1 source and single source of truth
images/                Diagram sources and rendered diagrams
_quarto.yml            PDF build configuration
_style/                Quarto filters, theme, and LaTeX styling
_output/               Rendered course material
session-01/ai-tutor/   Finished Session 1 reference application (git-ignored)
```

Future sessions will follow the same naming scheme with `storybook-02.md`, `storybook-03.md`, and so on. Quarto discovers matching storybooks automatically.

## Render the storybook

Install [Quarto](https://quarto.org/) and a TeX distribution that provides XeLaTeX. From the repository root, render all available storybooks:

```bash
quarto render
```

To render Session 1 only:

```bash
quarto render storybook-01.md
```

Quarto writes the PDF to `_output/`. Keep lesson content in the plain Markdown storybook; `_quarto.yml` and `_style/` own the PDF presentation.

## Run the reference application

The reference application requires Node.js 20.9 or newer and credentials for OpenRouter and Better Auth. Its own README has the setup steps:

```bash
cd session-01/ai-tutor
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

The app then runs at <http://localhost:3000>. The default test suites do not call a language model; `npm run test:e2e:llm` does and spends OpenRouter credit.

## Audience

The classroom is for experienced software developers, technical leads, software architects, and DevOps engineers. You should be comfortable with Visual Studio Code, Git, and a terminal. TypeScript or JavaScript experience is recommended, and React or Next.js knowledge helps.