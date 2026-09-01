# Session 1 Storybook — "Claude Code einsetzen"

**Classroom: Agentische Entwicklung mit Claude Code, Mastra & CopilotKit — Session 1 (Sept 1st)**

This is the live-coding script for the hands-on part of session 1. Each step has a
**Goal**, the **Prompt** to give Claude Code, **Teaching points** to narrate while the
agent works, and a **Verify** checklist. All prompts were validated end-to-end with
`claude -p --model claude-opus-5`; the finished reference app lives in
`session-01/ai-tutor`.

The prompts are deliberately short and natural. A frontier model doesn't need
step-by-step instructions — it needs the *outcome*, the *constraints that matter*, and
*pointers to current docs*. That's the prompting style we teach all day.

## What we build today

**ai-tutor** — a minimal AI tutoring chat, the day-1 slice of the app we grow over the
five sessions:

- **Next.js 16** (App Router, TypeScript, Tailwind v4, Biome) — the web app
- **BetterAuth** — email + password sign-up/sign-in; every chat is per-user
- **SQLite** (file path from `.env`) via **Drizzle** — app tables, auth tables, agent memory
- **Mastra** — one `tutor` agent with a **hardcoded system prompt**, memory per user
- **OpenRouter** (`z-ai/glm-5.3-flash`) — the LLM behind the agent
- **CopilotKit + AG-UI** — the chat UI, wired to the Mastra agent
- **Tool calling** — a todo list the user manages *through the agent*
- **Vitest + Playwright** — integration tests (BetterAuth test utils) and e2e

How the pieces fit (svgbob source: `images/architecture.bob`, rendered:
`images/architecture.svg`):

```
+--------------------+                        +--------------------------------+
|      Browser       |     "AG-UI / HTTP"     |          "Next.js 16"          |
|                    +----------------------->|                                |
| "login / signup"   |                        | Better Auth                    |
| CopilotChat        |                        | chat handler "(session gate)"  |
| "(CopilotKit v2)"  |                        |   CopilotKit runtime           |
| todo sidebar       |                        |     "+ AG-UI bridge"           |
+--------------------+                        | Mastra "tutor" agent           |
                                              |  "memory + todo tools"         |
                                              +------+------------------+------+
                                                     |                  |
                                                     v                  v
                                          +----------------------+  +----------------------+
                                          | SQLite               |  | OpenRouter           |
                                          | "(Drizzle + libsql)" |  | "z-ai/glm-5.3-flash" |
                                          | auth, todos,         |  +----------------------+
                                          | "mastra_*" memory    |
                                          +----------------------+
```

Not today (later sessions): CLI, YAML-defined activities, more activity modules, usage
metering, CI/CD, deployment.

## What we *teach* today (the meta-level)

The app is the vehicle. The lesson is **how to drive a coding agent**:

1. **Prompting** — outcome + constraints + acceptance criteria, not micromanagement.
2. **Grounding in current docs** — training data is stale for fast-moving libraries,
   but the fix is *not* pasting docs or babysitting the model. Give it **sources it can
   pull from itself** and it manages its own knowledge. That's the core message of the
   day: *with llms.txt, node_modules docs, skills, and context7, you don't micro-manage
   a modern LLM — you point it at the truth and review the result.* Three mechanisms,
   three trade-offs:
   - **`llms.txt`** — vendor-curated, agent-readable doc indexes (BetterAuth, Drizzle)
   - **docs in `node_modules`** — Next.js 16 ships its docs *inside the package*, exact
     for the installed version
   - **skills** — installable playbooks from [skills.sh](https://skills.sh), and not
     only for tech: we install tech skills (`find-docs`, `mastra`, CopilotKit's),
     a process skill (`grilling`), a meta-skill (`skill-creator`), and a design skill
     (`frontend-design`) — expertise, workflow, and taste as packages
3. **`AGENTS.md`/`CLAUDE.md` as agent-maintained memory** — short, current, updated by
   the agent itself as part of every change, never a dumping ground.
4. **Verification belongs in the prompt** — the agent proves its work with tests/build;
   we still review the diff like a PR.

---

## Step 0 — Prerequisites (before the session)

- Node.js **24+**, Claude Code installed (`claude --version`)
- An **OpenRouter API key** (we use the cheap `z-ai/glm-5.3-flash`)
- A terminal + editor; nothing else — SQLite is a local file, no cloud accounts.

## Step 1 — Scaffold (human at the terminal, no agent)

**Goal:** a fresh Next.js app with TypeScript, Tailwind, Biome — plus our `.env`.

```bash
npx create-next-app@latest ai-tutor \
  --ts --tailwind --biome --app --no-src-dir --turbopack --import-alias "@/*"
cd ai-tutor
git add -A && git commit -m "scaffold"

cat > .env <<'EOF'
# SQLite database file (Drizzle, BetterAuth, and Mastra memory all use it)
DATABASE_URL=file:./data/app.db
# OpenRouter — the LLM behind the Mastra agent
OPENROUTER_API_KEY=sk-or-v1-...
# BetterAuth (secret: openssl rand -base64 32)
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
EOF
```

**Teaching points**

- **Don't use an agent for deterministic work.** Scaffolding is a solved, scripted
  problem — the generator is faster, cheaper, exactly reproducible. Agents are for work
  that needs judgment.
- `create-next-app` now offers **Biome** instead of ESLint — one fast tool for
  lint + format.
- Look what the scaffold created: **`AGENTS.md`** (with `CLAUDE.md` as a one-line
  `@AGENTS.md` include — one memory file, readable by any agent). It already contains
  Next's `nextjs-agent-rules` block: *"This is NOT the Next.js you know"* — pointing
  agents at `node_modules/next/dist/docs/`. The framework ships current docs in the
  package precisely because models keep writing outdated Next.js code from training
  data. `ls node_modules/next/dist/docs/` to show it. (The block is re-added by
  `next dev` if deleted.)
- `.env` is git-ignored by the scaffold; secrets never reach the repo — and later never
  the browser: they're read only in server-side modules.
- From now on: **one commit per step** — clean diffs to review what the agent did.

**Verify:** `npm run dev` shows the welcome page; `AGENTS.md` exists.

## Step 2 — Project memory: a short AGENTS.md that maintains itself

**Goal:** turn AGENTS.md into concise, *self-maintaining* project memory.

Start `claude`. Optionally show `/init` (it analyzes the repo and writes the memory
file) — then, either way:

> **Prompt 2.1**
>
> Make AGENTS.md a concise memory for future agent sessions — a map, not a manual. One
> line on what this app is, the commands, and per area a pointer to the key files plus
> only what an agent would get wrong *even after reading those files*: hard-won
> gotchas, cross-file invariants, never-do rules. Anything discoverable by reading the
> file a bullet points to doesn't belong here. One sentence per bullet. Keep the
> nextjs-agent-rules block. End with a maintenance rule addressed to you, the agent:
> update this file in the same change set whenever a change invalidates a line or
> teaches a costly lesson; prefer deleting over adding, pointers over prose; one
> sentence per bullet, current state only, no history.

**Teaching points**

- The memory file is **prepended to every session** — it costs context tokens every
  time. Short and dense beats complete: if `ls` or `package.json` answers it, it
  doesn't belong here.
- **A map, not a manual.** The inclusion test for every bullet: would an agent still
  get this wrong *after* reading the files the bullet points to? Yes → keep it (version
  pins, fail-closed rules, lessons that cost a debugging session). No → the pointer
  alone suffices. Narrated implementation is the first thing to go stale.
- **Constrain shape, not count.** An earlier version of this prompt said "keep it under
  60 lines" — the agent met the cap by packing four sentences into each bullet. Metrics
  get gamed; "one sentence per bullet" can't be, and it keeps working as the file
  accretes over later steps. (Great 60-second aside on specification writing.)
- The maintenance rule is the trick: from now on **we never edit this file by hand** —
  the agent keeps it current as a side effect of normal work. Watch for AGENTS.md in
  the diffs of every later step.
- `/init` vs. writing it yourself: `/init` is a fine starting point on an *existing*
  codebase; on a fresh scaffold there's little to analyze — saying what you want is
  quicker. Either way, the trimming instinct is the skill.

**Verify:** AGENTS.md reads as pointers + one-sentence gotchas, has the maintenance
rule + nextjs-agent-rules block. Commit.

## Step 3 — Install skills

**Goal:** current expertise for the fast-moving parts of the stack.

```bash
# Tech skills — current knowledge for fast-moving libraries
npx skills add upstash/context7 --skill find-docs --agent claude-code -y
npx skills add mastra-ai/skills --skill mastra --agent claude-code -y
npx skills add CopilotKit/CopilotKit --agent claude-code -y \
  --skill copilotkit-setup --skill copilotkit-agui \
  --skill copilotkit-develop --skill copilotkit-debug

# Process skill — how we work, not what we build
npx skills add mattpocock/skills --skill grilling --agent claude-code -y

# Meta-skill + design skill
npx skills add anthropics/skills --skill skill-creator --skill frontend-design \
  --agent claude-code -y
```

(`npx skills add <owner/repo> -l` lists what a repository offers before installing.)

**Teaching points**

- **Skills = installable expertise**: a Markdown playbook plus a when-to-use trigger,
  loaded on demand — it costs no context until it fires. [skills.sh](https://skills.sh)
  is the registry; `npx skills find <query>` searches it; `skills-lock.json` pins what
  you installed, like a package manager.
- Skills come in **different kinds** — walk through the four we just installed:
  - **Tech skills** teach the agent *current technology*. `find-docs` (by Context7) is
    the universal fallback — look up current docs for any library via the `ctx7` CLI
    instead of trusting training data. `mastra` and the CopilotKit skills come from the
    vendors themselves: framework authors now ship the playbook for wiring their own
    product.
  - **Process skills** encode *how development runs* — requirements, reviews, workflow.
    `grilling` (Matt Pocock) turns the agent into a relentless interviewer that
    stress-tests a plan or design *before* code gets written. Live beat: say "grill me
    about the tutor app plan" and let it ask one round of questions — sixty seconds
    makes the point that prompting is bidirectional.
  - **Meta-skills** are skills about skills: `skill-creator` (Anthropic) teaches the
    agent to *author* well-formed skills — the path from "we explained this convention
    three times" to "it's a skill now". Finding skills is itself covered by
    `npx skills find` (and a `find-skills` skill exists too).
  - **Design skills** carry *taste*: `frontend-design` (Anthropic) pushes UI work away
    from templated defaults toward intentional typography and aesthetic direction. It
    fires automatically when later steps touch UI.
- Commit skills + lock file: every teammate's agent gets the same expertise — including
  the process and taste, not just the tech.

**Verify:** skills listed under `.claude/skills/` (or `.agents/skills/`);
`skills-lock.json` present. A fresh `claude` session lists them in `/context`.

## Step 4 — Test harness: Vitest + Playwright

**Goal:** testing infrastructure *before* features — every later step must prove itself.

> **Prompt 4.1**
>
> Set up our test harness: Vitest for unit/integration tests (`npm test`) and Playwright
> for e2e (`npm run test:e2e`, Chromium only, starting its own dev server on a spare
> port). This Next.js version may differ from what you know — check its testing guides
> in node_modules/next/dist/docs first. Add one real smoke test for each, make
> everything pass including `npx biome check .`, and update AGENTS.md per its rule.

**Teaching points**

- Anatomy of a good prompt: *outcome* (harness + scripts), *constraints* (Chromium,
  own server, spare port), *docs pointer* (node_modules), *verification*, *memory*.
  Five lines. The "how" — configs, plugins, ports — is the agent's job.
- This is the rhythm of the day: prompt → agent works a few minutes → we review the
  diff like a PR. Narrate the tool calls as they scroll by (file reads, doc lookups,
  test runs) — *that* is what makes it an agent, not a chatbot.
- Check the AGENTS.md diff: test commands appeared, nothing bloated. The rule works.
- Findings from the validation run, likely to recur live: the agent noticed the bundled
  Vitest guide was *itself* slightly stale (deprecated plugin) and followed the runtime
  warning instead — docs ground the model, they don't replace judgment. And it excluded
  `.claude/skills/**` from Biome (vendored files, reformatting would be lost on
  reinstall) — a decision it *reported* rather than buried. Reading the agent's summary
  is part of the review.

**Verify:** `npm test` + `npm run test:e2e` green; diff review; commit.

## Step 5 — Database: Drizzle + SQLite from `.env`

**Goal:** persistence foundation — Drizzle on a local SQLite file, path from `.env`.

> **Prompt 5.1**
>
> Add persistence: Drizzle ORM on SQLite via @libsql/client, using DATABASE_URL from
> .env (already set to `file:./data/app.db`; keep `data/` git-ignored). One server-only
> module `lib/db.ts` exports the drizzle instance — nothing else opens the database.
> Set up drizzle-kit migrations (`npm run db:generate` / `db:migrate`) and a first table
> `todos` (id, userId, title, done, createdAt) — auth and agent tools will build on this
> later. Add a Vitest test that migrates a temporary database file and does a real
> insert/select. Drizzle's API has changed a lot — read https://orm.drizzle.team/llms.txt
> and follow the relevant links before coding. Update AGENTS.md per its rule.

**Teaching points**

- **`llms.txt`** ([llmstxt.org](https://llmstxt.org)): vendors publish an agent-readable
  index at a stable URL; the agent fetches it and follows the right sub-pages. One URL
  in the prompt beats twenty lines of pasted docs — and it's always current. Watch it
  happen in the tool stream.
- **One seam for the database** (`lib/db.ts`): demanded now, pays off in steps 6–8 when
  auth and agent memory join the same file — exactly one place interprets `DATABASE_URL`.
- Tests on a temp file, dev on `data/app.db` — SQLite gives isolation for free. That's
  why it's the classroom database.
- Why libsql and not better-sqlite3? Same `file:` URL works for Drizzle *and* Mastra's
  storage later — one driver everywhere.

**Verify:** `npm test` green; `npm run db:migrate` creates `data/app.db`; `git status`
clean of `data/`; commit.

## Step 6 — Authentication: BetterAuth (email + password)

**Goal:** sign-up / sign-in / sign-out; the app behind a login; tested with BetterAuth's
official test utils.

> **Prompt 6.1**
>
> Add authentication with Better Auth: email + password only. Use its Drizzle adapter on
> our lib/db.ts, generate the auth schema with their CLI, and apply it through our
> normal migration flow (secret and URL are already in .env). Build /signup and /login
> pages with Tailwind — factor shared form styling into components/ui/ rather than
> duplicating class strings — and gate the app: / requires a session (checked
> server-side) and shows the user's name plus sign-out. Tests: Vitest integration tests
> using Better Auth's official test-utils plugin on a temporary database (sign-up works,
> correct password signs in, wrong password rejected) plus one Playwright e2e of the
> real flow. Better Auth is newer than your training data — start at
> https://better-auth.com/llms.txt and follow its Next.js, Drizzle adapter,
> email-password, and test-utils pages. Update AGENTS.md per its rule.

**Teaching points**

- Still outcomes, not steps — the library-specific "how" (adapter config, CLI schema
  generation, cookie handling) is delegated to **the vendor's llms.txt**. Without that
  pointer you'd get a plausible 2025-vintage BetterAuth API that no longer exists.
- **Auth schema is generated, not hand-written** — and still flows through our one
  migration path. Generators inside an agent workflow are fine; the agent runs them.
- The `components/ui/` requirement plants the **Tailwind discipline** for the whole
  course: shared primitives, no copy-pasted class recipes. Cheaper to demand now than
  refactor later.
- **Server-side session check** — first security beat of the course: client checks are
  UX; the server check is the gate. This drumbeat continues in steps 7 and 8.
- The **test-utils plugin** (`testUtils` from `better-auth/plugins`, in a test-only auth
  instance) gives real auth flows in Vitest without HTTP or a browser — fast tests for
  logic, one Playwright test for the real wiring.

**Verify:** e2e green; manual: sign up, delete cookies, gate redirects to /login. Diff
review: session check lives server-side. Commit.

## Step 7 — The agent: Mastra + OpenRouter + CopilotKit/AG-UI

**Goal:** the heart of the app — signed-in users chat with a Mastra tutor agent
(hardcoded system prompt, per-user memory in our SQLite file) through CopilotKit.

> **Prompt 7.1**
>
> Now the heart of the app: chat with an AI tutor. Use your mastra and copilotkit
> skills — don't wire this from memory. One Mastra agent `tutor` with a hardcoded
> system prompt you write (a patient, british butler maintaining a todo list
> for the user; rejects any request not related to the todo list), model `z-ai/glm-5.3-flash` 
> via OpenRouter (OPENROUTER_API_KEY in .env, server-only), and Mastra memory persisted in 
> our SQLite file so conversations survive restarts. Serve the agent to CopilotKit via 
> the AG-UI integration and make / the chat page (keep the header with sign-out; style with
> Tailwind, reuse components/ui/). The chat route must reject unauthenticated requests,
> and memory must be scoped by the Better Auth user id — one thread per user for now;
> user A must never see user B's conversation. Add a Vitest test for the auth gate,
> keep everything green (tests, build, biome), and update AGENTS.md — the agent, the
> chat route, and the memory scoping are things a future session must know.

**Teaching points**

- **Skills carry the integration knowledge.** Mastra + AG-UI + CopilotKit is a
  three-package handshake that changes fast; the vendors' skills encode today's correct
  wiring. "Don't wire this from memory" makes grounding an explicit instruction — for
  fast-moving stacks, say it.
- **The system prompt is product, not config.** Today it's hardcoded — deliberately.
  In a later session it becomes data (per-activity YAML, like the big prototype).
  Shipping the simple verified version first *is* agentic development.
- **Memory scoping = authorization.** Resource id from the *server-side session*, never
  from the client payload. This is where multi-tenant chat privacy actually lives.
- Secrets stay server-side: the browser talks to our route; only the server talks to
  OpenRouter.
- Live demo: chat ("explain Big-O like I'm 12"), restart the dev server, reload — the
  conversation survives (memory in SQLite). Second browser/incognito user: separate,
  empty chat.
- Findings from the validation run: Opus used Mastra's model router — the string
  `openrouter/z-ai/glm-5.3-flash` selects provider + model and reads the key from the
  env. It pinned `@ag-ui/client`/`@ag-ui/core` to 0.0.57 and `@ag-ui/mastra` to 1.1.1
  because CopilotKit 1.69.x pins them exactly (two copies = type errors). And it
  discovered on its own that CopilotKit's runner keeps a process-global thread cache
  keyed by thread id alone — so it added a guard rejecting any request naming a thread
  other than the caller's. Discuss that: the *model* found a multi-tenancy hole the
  prompt only hinted at ("user A must never see user B's conversation") — a good
  outcome-oriented prompt buys you this.

**Verify:** manual round-trip; restart persistence; two-user isolation; `npm run build`
green. Commit.

## Step 8 — Tool calling: the agent manages your todos

**Goal:** the "aha" of agentic apps — the LLM *acts*: it reads and writes the `todos`
table through typed tools, visible immediately in the UI.

> **Prompt 8.1**
>
> Give the tutor tools to manage the signed-in student's todo list, backed by our todos
> table: listTodos, addTodo, setTodoDone. The user id comes from the server-side session
> through the agent's runtime context — never from the model or the client. Extend the
> system prompt so the tutor offers to capture action items and mark them done. Add a
> slim todos sidebar next to the chat (read-only — the agent is the write path) that
> refreshes when the agent changes something. Tests: Vitest for the tool executors on a
> temporary database (especially per-user isolation), plus one Playwright e2e that is
> NOT part of the default suite (`npm run test:e2e:llm`, it costs LLM calls): sign up,
> ask the agent to add "buy milk", assert it appears in the sidebar. Use the mastra
> skill for the current tools API. Update AGENTS.md per its rule.

**Teaching points**

- **Tools are the LLM⇄system contract.** The Zod schema + description is the API doc
  the model reads — writing them well *is* prompt engineering.
- **Identity injection**: session → runtime context → tool executor. The model never
  sees or chooses the user id. Same drumbeat as steps 6/7: the model is untrusted
  input; authorization lives in our code.
- **LLM tests are quarantined**: non-deterministic, slow, cost money → own tag + npm
  script, out of the default suite. (In the big prototype this grows into a whole
  `@live-llm` taxonomy.)
- Live demo: "I need to read chapter 3 and do exercise 5 for tomorrow" → tutor offers
  to capture todos → sidebar updates → "finished the reading" → checkmark flips.
- Findings from the validation run: the tools declare `requestContextSchema` so a tool
  invoked without a user id *errors* instead of defaulting — fail closed. The LLM e2e
  passed on the second try: Enter doesn't submit CopilotKit's composer, the spec has to
  click the send button. Quarantine landed as a separate Playwright config
  (`playwright.llm.config.ts`) rather than a grep tag — structure beats convention.

**Verify:** live demo; unit tests prove per-user isolation; default e2e suite stays
LLM-free. Commit.

## Step 9 — Quality pass & wrap-up

**Goal:** leave the repo the way every session should end: clean, tested, documented.

> **Prompt 9.1**
>
> Quality pass over the whole repo. Fan out subagents in parallel, on the cheapest
> model that's up to each job: a Sonnet agent sweeps for duplicated Tailwind styling
> and consolidates it into components/ui, a second Sonnet agent writes a concise
> README (what the app is, stack, setup incl. env vars, scripts, short architecture
> overview — current state only), and an Opus agent reviews the auth, chat, and tool
> code with fresh eyes for security problems (session checks, user scoping, secrets)
> and reports findings without editing. Then integrate: fix anything the review found,
> run `npx biome check --write .`, make the full suite green (tests, e2e, build), and
> check AGENTS.md against its own rule — current, concise, nothing stale.

**Teaching points**

- **Subagents**: Claude Code can spawn parallel agents, each with its own fresh
  context. Two reasons to use them, both on display here: *parallelism* for disjoint
  chores (styling sweep, README), and *fresh eyes* for review — the reviewer subagent
  hasn't seen the implementation history, so it reads the code like an outside auditor
  instead of trusting its own memory of writing it. Note the constraint "reports
  findings without editing": parallel agents get disjoint write areas; reviewers are
  read-only.
- **Model tiering** — the third reason for subagents: *cost*. The coordinator session
  (Fable in the live demo) is the expensive part — it holds the whole history and does
  the judgment calls. Each subagent picks its own model, so match the tier to the
  task: well-specified mechanical chores (styling sweep, README) run fine on Sonnet;
  the security review is judgment work — you're paying for what you *didn't* think to
  ask — so it stays on Opus. Rule of thumb: if you could write the task as a
  checklist, tier down; never tier down the reviewer. In the validation run it was
  precisely the reviewer that found the real holes.
- Mechanical sweeps across a repo are what agents are *best* at — exactly the chores
  humans postpone.
- In the validation run the fresh-eyes reviewer earned its keep: five findings, two of
  them real medium-severity holes (a route-guard gap exposing every user's thread list,
  and an unguarded clear-all endpoint), each verified against library source before
  fixing, plus an unthrottled login path. The implementing agent had *tested* its
  guard — the reviewer attacked its shape. That difference is the demo.
- README vs AGENTS.md: README is for humans arriving at the repo; AGENTS.md is
  operating instructions for agents. Both "current state only".

**Verify:** full suite green; README reads well; commit.

---

## Step 10 — A project design skill: from brand to product

**Goal:** the skill taxonomy from step 3 working as a *system* — the meta-skill and
the design skill combine to mint a skill of our own, and then two sentences restyle
the whole app.

> **Prompt 10.1**
>
> Study heise.de — colors, typography, the overall design language. Then use the
> skill-creator and frontend-design skills to distill a project-specific design skill
> for this app. One thing the skill must make clear: unlike heise.de, this app is not
> a news page but a chat bot with data-heavy pages, and the design has to reflect
> that — say what carries over from the brand and what doesn't. Just create the
> skill, don't restyle anything yet.

> **Prompt 10.2**
>
> Apply the ai-tutor-design skill to the existing UI. Make the full suite green
> afterwards and keep AGENTS.md current.

**Teaching points**

- **Skills compose.** `skill-creator` (meta) supplies the form, `frontend-design`
  (design) supplies the taste, and the agent's own research supplies the project
  truth. The output is a *new* skill — `.claude/skills/ai-tutor-design/` — that
  didn't come from a registry: your design system, as installable expertise.
- **The agent measured, it didn't vibe.** In the validation run it pulled heise.de's
  actual stylesheets: brand tokens (`#0056A4` ink blue, `#E8EDF0` page grey), Source
  Sans and no second family, *eight* `border-radius` declarations in 152 KB of CSS,
  desktop shadows `none`. The evidence lands in `references/heise-reference.md`, so
  every claim in the skill can be checked instead of re-derived — same discipline as
  llms.txt, pointed at a brand instead of an API.
- **Translation, not copy** — the constraint in the prompt does real work. The
  skill's core is two tables: what carries over (palette, square corners,
  blue-means-actionable, hairlines over shadows) and what dies here (teaser grids,
  hero images, kickers — "if you find yourself building a card grid, you are
  designing the wrong app"). Best find: heise's signature vertical marker bar becomes
  the tutor's turn marker in the stream — replacing chat bubbles entirely.
- **Prompt 10.2 is two sentences.** The skill carries all the detail, and its
  `description` tells the agent when to fire — every future "add a settings page"
  gets the design system for free. That's the day's message in miniature: invest in
  reusable context once, then stop micro-managing.
- Close the loop: `git log --oneline` — a dozen small, reviewed, tested steps. That's
  agentic development: not one giant prompt, but a conversation of scoped, verified
  moves.

**Verify:** skill exists with its `references/`; app restyled and visibly *not*
default-Tailwind; full suite green; one commit per prompt.

---

## Appendix A — Running this storybook headless

Every prompt was validated non-interactively, one step per invocation, fresh context
each time:

```bash
cd session-01/ai-tutor
claude --model claude-opus-5 --dangerously-skip-permissions -p "<prompt>"
```

In the live session, use the interactive TUI — the audience should see tool calls,
doc fetches, diffs, and test runs scroll by. That stream *is* the content.

The Sonnet/Opus tier hints in prompt 9.1 were added after validation: the validated
run used default-model subagents under an Opus coordinator. The hints change what the
subagents cost, not what the prompt asks for.

Gotcha: `create-next-app` only runs `git init` when the new folder is *not* already
inside a git repository. In a nested folder (like this classroom repo), `git init -b
main` inside `ai-tutor` yourself before the scaffold commit.

## Appendix B — Live-demo insurance

- One commit per step ⇒ `git reset --hard` and retry, or fast-forward from the
  reference repo (`session-01/ai-tutor`).
- Most fragile step: 7 (three-package handshake). If versions drift on workshop day,
  pin the reference repo's `package.json` versions in the prompt. Validated combo:
  `@copilotkit/react-core`+`runtime` 1.69.3, `@ag-ui/mastra` 1.1.1, `@ag-ui/client`/
  `@ag-ui/core` pinned 0.0.57, `@mastra/core` 1.63.x + `@mastra/memory` + `@mastra/libsql`,
  `drizzle-orm` 1.0.0-rc.4, `better-auth` (see reference repo), Next 16.3.3.
- The LLM e2e flaking live is *content*, not failure — it's why we quarantined it.
