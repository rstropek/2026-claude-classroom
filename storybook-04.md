# Session 4 Storybook

**Classroom: Agentische Entwicklung mit Claude Code, Mastra & CopilotKit, Session 4**

## Live-Coding Script for Session 4

This is the live-coding script for session 4. Each step gives you a **Goal**, the
**Prompt** to hand Claude Code, **Teaching points** to narrate while the agent works, and
a **Verify** checklist. The steps keep counting from session 3, so today starts at step
19. Appendix A has the recipe for driving the same prompts headless with
`claude -p --model claude-opus-5` against the starter repo.

The prompts stay short and outcome-oriented. Today they point at one source of docs, the
`copilotkit` skill with its docs server, because A2UI support in CopilotKit is months
old and no model has it in its training data.

Expect a prompt to run between 4 and 12 minutes today. That is your time to explain the
concept behind the step, and the teaching points are written for it. Step 21 is the
exception, because its change is two words long and its run takes a minute.

As before, a prompt that falls short is material, not a failure. Name the mechanism
behind the shortfall, keep the one rule that the tree compiles and the suite is green at
the end of every step, and move on.

## Where we start

Session 3 ended with **ai-tutor** after step 18. The todo list behind the tutor
Bartholomew has four ways in: the chat, a REST API with bearer tokens, the `ai-tutor`
CLI with its stdio MCP server, and an MCP server over Streamable HTTP behind OAuth. One
shared contract workspace holds the zod schemas for all of them. That code, plus three
small additions that step 19 walks through, is the starter for today:

```
https://github.com/rstropek/2026-claude-classroom-4-starter
```

Fork it and work in your fork. Git is not a topic today, so there is one rule only:
commit and push at the end of every step, so each diff stays small enough to review
what the agent did.

## What we build today

Today is about generative UI, which means user interface that an agent decides on at
run time. There are three ways to do it, and they differ in who owns the layout. The
svgbob source is in `images/genui-spectrum.bob` and the render in
`images/genui-spectrum.svg`:

```
      controlled               declarative               "open-ended"

+--------------------+    +--------------------+    +--------------------+
| useRenderTool      |    | A2UI               |    | MCP Apps           |
| since step 11      +--->| steps 20 to 22     +--->| later today        |
+--------------------+    +--------------------+    +--------------------+

  The frontend owns         The agent sends a         The server ships
  one component per         tree of parts from        HTML that runs in
  tool.                     a catalog, as JSON.       a sandbox.

  ---------------------------------------------------------------------->
                     the agent gets more say over the UI
```

- A **progress card** in the chat. The tutor calls a tool, the tool counts the todos in
  the database, and the card arrives as A2UI: a component tree and a data model, both
  JSON. No React component for this card exists in the frontend.
- **Generated surfaces** in the same chat. With two flags flipped, the tutor can ask a
  second model call to design a whole surface from the catalog, for requests nobody
  planned a card for.
- A **project wizard** on its own page, without a chat. One card, one input. Each
  sentence you type is a single-turn agent run that changes the card in place.

## What we teach today

Sessions 1 to 3 were about driving the agent and building for agents. Today the agent
you build gets a say in the user interface, and the question in every step is how much
say it should get.

1. **You already generate UI.** The tool-call rows from step 11 are generative UI of
   the controlled kind. Seeing their limit is what makes the next kind worth its cost.
2. **A2UI separates structure from data.** Three operations cross the wire: create a
   surface, send its component tree, send its data model. The tree binds to the data
   by path, so a later message can change a number without touching the layout.
3. **The catalog is an allow-list.** The agent can only use components the client
   offers. No code crosses the wire, which is the difference to MCP Apps later today.
4. **Fix the schema where the data matters, generate it where variety matters.** A
   fixed tree with numbers from a tool is fast and exact. A generated surface costs a
   second model call and invents what it does not know.
5. **State lives on the client.** The wizard's agent has no memory. Whatever it needs to
   know about the card travels with each run, and that includes what the user typed
   into the card by hand.
6. **Put the plain code in the starter.** The wizard's page, schema, and validation are
   ordinary code and already exist. The prompt spends its minutes on the agent and on
   A2UI.

---

## Step 19: recap, housekeeping, and the UI you already generate

**Goal:** everybody has the starter running from a fork, knows what changed in the
starter since session 3, and has seen in the code that the chat already renders
agent-driven UI, along with where that approach stops.

### Fork, clone, run

```bash
gh repo fork rstropek/2026-claude-classroom-4-starter --clone
cd 2026-claude-classroom-4-starter
gh repo set-default            # pick your fork
npm install
cp .env.example .env           # then fill in OPENROUTER_API_KEY and BETTER_AUTH_SECRET
npm run db:migrate
npm run dev
```

Sign up at <http://localhost:3000/signup> and ask Bartholomew to put two things on the
list and cross one off.

### What is new in the starter

```bash
git log --oneline
```

The history shows what changed since session 3's result. Three of those changes are
worth a minute each.

One commit adds a CodeTour, which the next section uses. The next one swaps skills, and
a small follow-up points AGENTS.md at the new skill. The
four `copilotkit-*` skills from session 1 no longer exist, because CopilotKit deleted
them from its repository in September and replaced them with one skill named
`copilotkit`. Open `.claude/skills/copilotkit/SKILL.md`. It holds almost no API detail
on purpose. It tells the agent that CopilotKit's APIs move, forbids answering from
memory, and sends the agent to a docs server over MCP, which `.mcp.json` registers as
`copilotkit-docs`. Start `claude` once in the repo and approve the two project MCP
servers when it asks.

The last commit adds a page at `/projects/new` with a card, an input that does
nothing yet, and `lib/project.ts` with a schema and validation. Step 22 starts there.

### Walk the tour

Install the CodeTour extension when VS Code offers it, and start the tour "Controlled
generative UI: useRenderTool" from the CodeTour view. It runs from the demo in the
browser through the Mastra tools, the AG-UI bridge in the CopilotKit route, and the
provider in `components/chat.tsx` to the three `useRenderTool` registrations in
`components/todo-tool-calls.tsx`, and it ends at the tests.

The tour's last step names the limit. Every row in the transcript is a React component
somebody wrote for one tool, matched to the tool by a string. A new kind of card is a
frontend change and a deployment. Only tool arguments and results cross the wire, so the
user can't type into a row, and a later tool call can't change a row an earlier one
drew.

**Teaching points**

- **A knowledge skill goes stale, and its authors noticed.** The old skills carried
  API reference that was copied at some point and drifted from then on. The new one
  carries a rule and a search tool. Ask the room which of their own skills hold copied
  facts. The skill from step 16 that teaches agents the CLI already did this right: it
  says when to reach for the CLI and defers to `--help`.
- **Controlled generative UI is the right default.** `useRenderTool` is cheap, fully
  typed on the frontend side, and looks exactly like the rest of the app. Nothing today
  replaces it. The three tool-call rows stay as they are through every step.
- **The string match is the weak joint.** The `name` in `useRenderTool` has to equal
  the tool's `id` in `lib/todo-tools.ts`, and no compiler checks that. Rename a tool
  and the row disappears without an error. Keep that in mind when step 20 shows a
  catalog, which is the same kind of contract with a schema attached.

**Verify:** the app runs from a fork, `claude` lists the `copilotkit-docs` tools under
`/mcp`, the tour opens at every step without a broken anchor, and the working tree is
clean.

## Step 20: a progress card over A2UI

**Goal:** the tutor shows progress on the todo list as a card in the chat. The numbers
come from a tool, the card arrives as A2UI operations with a fixed component tree, and
a custom `ProgressBar` joins the basic catalog.

```bash
git switch -c a2ui-progress-card
```

> **Prompt 20.1**
>
> Give the tutor a way to show progress on the to-do list as a card in the chat,
> rendered with A2UI instead of a React component written for this one tool. A new tool
> computes the total, the share done, and the share open from the database through
> lib/todo-tools.ts, so the model never produces those numbers, and the tool returns
> the A2UI operations for the card itself, with no second model call. Author the card's
> component tree once, next to the tool, and bind the numbers through the A2UI data
> model instead of writing them into the tree. The basic catalog has no progress bar,
> so add a custom catalog that offers a ProgressBar next to the basic components,
> styled by the ai-tutor-design skill. The useRenderTool rows stay as they are. The
> runtime must not inject a tool that generates UI, because that comes in a later step.
> Tests: a unit test on a temporary database that the operations are well-formed A2UI
> v0.9 and the numbers match the rows, and a component test for ProgressBar. A2UI in
> CopilotKit is newer than your training data: use the copilotkit skill and its docs
> server before you write code, and read the installed packages under node_modules
> where the docs stop. Suite green, biome clean, AGENTS.md current.

This run takes about 12 minutes, and the first four of them produce no code. Expect the
agent to spend them in the docs server and then in `node_modules`, because the facts it
needs are spread over four packages.

### See the card, then see the wire

Put three items on the list, cross one off, and ask:

```text
Show my progress.
```

A card appears in the transcript with a bar at 33 percent, the figures "1 done" and
"2 open" next to it, and the total below. Open the CopilotKit Inspector, find the
result of the new tool, and read the JSON with the room. It holds one key,
`a2ui_operations`, with three entries:

- `createSurface` names a surface id and the catalog the client has to have.
- `updateComponents` is the tree: a flat list of components with ids, where a parent
  names its children by id and the root has the id `root`. Look for the
  `ProgressBar` entry. Its `value` is `{ "path": "/donePercent" }`, a pointer and
  no number.
- `updateDataModel` carries the numbers the pointers resolve to.

Now add an item and ask for the progress again. A second card appears under the first,
and the first keeps its old numbers.

**Teaching points**

- **Nobody wrote a React component for this card.** `components/` gained a
  `ProgressBar` and a catalog file, and that is all. The heading, the layout, and the
  two figures are basic catalog parts that the tree arranges. Ask what it takes to add
  a second card, say for the oldest open item: a tool and a tree on the server, and no
  frontend change as long as the catalog has the parts.
- **The numbers never pass through the model.** The tool counts rows in SQL and puts
  the result into the data model. The model decides when to call the tool, and the
  tool's description tells it not to repeat the figures in prose. Compare that with
  asking the model to "summarize my progress", where every number is a guess from the
  conversation.
- **The catalog is a contract with a schema.** Each catalog entry is a zod schema for
  the props plus a React renderer. A tree that names an unknown component, or a
  catalog id the client doesn't have, fails with an error instead of rendering
  something. The agent can only ask for parts that you put on the shelf.
- **Expect a fight about zod.** The app runs zod 4, and the A2UI renderer decides which
  props are bindable by inspecting zod 3 types. Expect the agent to find that out
  through a type error, try `zod/v3`, and end up installing zod 3 under an alias for
  the catalog file alone. A prop declared as plain `z.string()` that the tree binds
  to a path is the classic failure: the raw `{ path }` object reaches the renderer,
  and React throws error #31 about an object as a child, with nothing that points at
  the schema.
- **Expect version pins.** `@copilotkit/a2ui-renderer` and `@a2ui/web_core` are already
  in `node_modules` as dependencies of CopilotKit. Importing them from app code means
  declaring them, and a caret range installs a second, newer copy next to the one
  CopilotKit uses. Two copies of a package that keeps a registry means two registries.
  Expect the agent to pin exact versions, and check `npm ls @a2ui/web_core` if it
  didn't.
- **The design skill reaches into the catalog.** The basic `Card` and `Text` hardcode
  rounded corners, a shadow, and gray text, which `ai-tutor-design` forbids. Expect the
  agent to override those two entries in the custom catalog and to write the rule into
  the design skill. If the card in your run has round corners, the agent skipped the
  skill, and that is worth a follow-up prompt.
- **A second request paints a second card, and the mechanism is worth naming.** The
  middleware turns each tool result into its own activity message, and the chat gives
  each message its own renderer with its own surface store. A later message has no way
  to address an earlier surface, even with the same surface id. Updating a card in
  place needs one surface store that outlives the messages. Step 22 builds that.
- **The agent may hand you a security question.** The route switches the generate tool
  off, but the Mastra bridge also accepts the switch from the browser's
  `forwardedProps`. Expect the agent to notice and to ask whether to close it. Read the
  question out. Step 17 showed that a todo title is input to the model, and a flag the
  browser sends is input to the server in the same way. Leave it open today, because
  step 21 turns the tool on anyway.
- **One console warning is noise.** In development, CopilotKit logs that no renderer
  is registered for the new tool. That is true and harmless, since the A2UI middleware
  paints the card and no `useRenderTool` is involved.

**Verify:** `npm test` and `npm run lint` are green, the card shows the right figures
for your list, the Inspector shows the three operations, and a second request adds a
second card. Commit and push.

## Step 21: let the agent design the surface

**Goal:** the tutor can answer a request nobody planned a card for with a generated
surface. A second model call designs the component tree from the catalog. The change is
two flags, and the run that makes it takes a minute.

```bash
git switch -c a2ui-dynamic-schema
```

> **Prompt 21.1**
>
> Turn on CopilotKit's injected A2UI generate tool for the tutor with the smallest diff
> that works: the flags, the comments next to them, the test assertion that pins them,
> and the A2UI section of AGENTS.md. No new files and no other behavior. Run npm test
> and npm run lint, and skip next build and the e2e suites.

### Read the diff

```bash
git diff
```

Expect two flags. In the CopilotKit route, `injectA2UITool: false` becomes `true`, which
makes the runtime inject a tool named `generate_a2ui` into the tutor. On the `CopilotKit`
provider in `components/chat.tsx`, `includeSchema: false` becomes `true`, which makes the
provider send the catalog's schemas with every run. That is where the generating
sub-agent learns what parts exist, so one flag without the other does nothing useful.

You can make the same change by hand in 20 seconds. `grep -rn
"injectA2UITool\|includeSchema" app components` finds both lines. The rest of the diff
is why the prompt is the better way: the comments above both lines, the assertion in
`tests/unit/copilotkit-route.test.ts`, and the sentences in AGENTS.md that described
the old values.

### Ask for something nobody built

Start a fresh chat with a new account, then ask:

```text
Draw me a comparison of "fixed schema" and "dynamic schema" generative UI as two cards
side by side, each with a title, three short bullet points, and a progress bar showing
how predictable it is.
```

The answer takes between one and three minutes, most of it behind a "Thought for"
line. Two cards appear side by side, in the app's own look, each with your `ProgressBar`
at the bottom. Then ask `Show my progress.` in the same chat. The fixed card is back
within seconds, with exact numbers.

**Teaching points**

- **Same catalog, new author.** In step 20 you wrote the tree. Now a sub-agent writes
  it, with the catalog's schemas and a set of composition rules in its prompt. It runs
  on the tutor's own model, because the bridge takes the model from the Mastra agent it
  wraps. Your `ProgressBar` shows up in a layout nobody coded, which is the catalog
  working as designed.
- **Count the cost while you wait.** Every generated surface is a second model call
  with a prompt of several thousand tokens, mostly catalog schema. On a small model
  that is a tenth of a cent and a minute or two. A surface that fails validation is
  retried up to three times. The fixed card costs one tool call and no tokens for
  layout.
- **The sub-agent knows the conversation, and nothing a tool returned.** Ask it to
  "show my open todos as a row of cards" and it has no todos to show. Expect invented
  items, or cards that print their binding names because no data model arrived, and
  expect the malformed result to stay in the thread and break the run after it. If you
  want to show this, do it last and continue with a fresh account.
- **That failure is the design rule for today.** Fix the schema where the data has to
  be right, and let a tool fill the data model. Generate the schema where the content
  comes from the model anyway and a wrong layout costs nothing.
- **A two-word change still has three places that remember the old value.** A comment,
  a test, and AGENTS.md all said `false`. Leave one of them stale and the next agent
  run reads a description of a system that no longer exists. The prompt names all
  three for that reason, and a hand edit has to cover them too.

**Verify:** `npm test` and `npm run lint` are green, the comparison renders with two
progress bars, and the fixed progress card still works in the same chat. Commit and
push.

## Step 22: a project wizard without a chat

**Goal:** A2UI on a page that has no chat. One project card, one input. Each sentence is
a single-turn run of an agent without memory, the card's state travels with every run,
and later runs change the card in place.

Imagine the todo app grows into a project management tool. A project has a title, a
description, a start date, a planned end date, an effort in person-days, and a
criticality. Nothing gets persisted today, because the page exists to show A2UI.

### What the starter already has

Open <http://localhost:3000/projects/new> from the "New project" link in the header. A
plain card shows an empty project, and the input under it answers "Not connected to an
agent yet." Then open the two files behind it with the room.

`lib/project.ts` holds the zod schema, a patch schema whose `.describe()` texts are
written for a model, `applyProjectPatch`, which merges a patch and refuses single fields
with a message, and `describeChanges` for the status line. `components/project-wizard.tsx`
is 76 lines of React with a comment that marks where this step plugs in. None of this
needs an agent to write it on stage, so it is in the starter.

```bash
git switch -c a2ui-wizard
```

> **Prompt 22.1**
>
> The project wizard at /projects/new is a scaffold: lib/project.ts holds the schema and
> applyProjectPatch, and components/project-wizard.tsx shows a plain summary above a
> dead input. Connect it to an agent. Add a Mastra agent without memory whose only tool
> takes a project patch, applies it with applyProjectPatch, and returns the A2UI
> operations for a project card with a fixed component tree, with no second model call,
> the way the progress card does it. The page renders that surface itself, in place of
> the plain summary and outside any chat: no CopilotChat and no transcript. Each submit
> is one single-turn run, and the agent gets today's date, so "starts next Monday, three
> weeks, two people full-time" becomes dates and 30 person-days. The wizard agent gets
> its own model, openrouter/google/gemini-3.1-flash-lite, because the tutor's reasoning
> model works the dates out in its reasoning and then leaves them out of the tool call.
> The agent's instructions say that the tool call is the whole answer, name the fields
> to derive, and carry one worked example. The card's fields are editable inputs from
> the basic catalog, bound to the data model. For now every run starts from an empty
> project and repaints the card. The status line says what the run set. The wizard
> agent gets no generate tool, and the chat page stays as it is. One unit test for the
> tool. Read the A2UI section of AGENTS.md first, then use the copilotkit skill and its
> docs server. The a2ui-pdf-analyst showcase in the CopilotKit repo renders a surface
> outside a chat. Run npm test and npm run lint, and skip next build and the e2e
> suites. AGENTS.md current.

This run takes about seven minutes. When it is done, type:

```text
Website relaunch for ACME: starts next Monday, three weeks, two people full-time, high
criticality.
```

About five seconds later the card holds a title, two dates, 30 person-days, and high
criticality. Change the title by hand in the card. Then type `Set criticality to low.`
The card comes back with low criticality and nothing else. The title you typed is
gone, and so are the dates. The agent has no memory, the page sent it nothing but the
new sentence, and the tool started from an empty project, exactly as the prompt said.

> **Prompt 22.2**
>
> Make the wizard's turns build on each other. The agent has no memory, so the state has
> to travel: the page sends the card's current data model, manual edits included, with
> every run, and the tool applies the patch to that state instead of an empty project.
> The first run creates the surface. Every later run sends only data model updates to
> the same surface id, so the card changes in place and is not repainted. A validation
> error from applyProjectPatch shows inside the card next to its field, and the status
> line shows describeChanges. Tests: the tool creates on the first call and only
> updates on a later one, and a rejected field comes back as an error. Run npm test and
> npm run lint, and skip next build and the e2e suites. AGENTS.md current.

This run takes about five minutes. Repeat the demo with a fresh page load:

```text
Website relaunch for ACME: starts next Monday, three weeks, two people full-time, high
criticality.
```

Change the title by hand to `ACME relaunch 2026`, then continue:

```text
Push the end date by one week and set criticality to low.
The project ends on 2026-01-05.
Set the effort to 45 person-days.
```

The hand-typed title survives every run. The end date moves by seven days, which the
model can only compute because it saw the current end date. The date in January comes
back as an error under the end date field, and the old value stays. Open the network
tab for one of the later runs and find the tool result: it holds one `updateDataModel`
for the same surface id, with no `createSurface` and no component tree.

**Teaching points**

- **A2UI is a UI protocol, and the chat was only one host for it.** The page mounts
  the A2UI provider and renderer from `@copilotkit/a2ui-renderer` itself, runs the
  agent through `useAgent` without any chat component, and feeds the operations from
  the run into the provider. Expect about 150 lines for the page component. Some runs
  take the operations from the A2UI activity message that the middleware produces,
  others read them straight from the tool result and leave the middleware off the
  wizard's route. Both work.
- **One surface store that outlives the runs is what step 20 lacked.** The provider
  sits on the page, so the surface created by the first run is still there when the
  fourth run's `updateDataModel` arrives. The surface id now points into one store,
  so the update lands on the DOM elements the first run created. In the chat, every
  message had its own store, and a repeated id meant nothing.
- **A second `createSurface` for a live id is an error.** That is why the tool has two
  branches and why the page has to tell it which one applies. Expect the tool to decide
  by whether the run carried a card.
- **State lives on the client, so the client sends it.** The A2UI data model is the
  only place that knows what the user typed into the card. Expect the page to read it
  off the surface before each run and send it as run context, which the Mastra bridge
  hands to both the instructions and the tool. The model needs it for "one week later",
  and the tool needs it to patch the right project.
- **Single-turn keeps the cost flat.** Each run is a fresh thread with one message plus
  the card, so the tenth instruction costs what the first one did. A chat transcript
  grows with every turn, and step 10 was about what that does to a context window.
- **One agent per job means one model choice per job.** The prompt names a model for
  the wizard because the tutor's model fails at this job in a specific way.
  `glm-5.3-flash` is a reasoning model. Given the ACME sentence, its reasoning reads
  "start 2026-09-21, three weeks, end Friday 2026-10-09, effort 2 x 15 = 30", and the
  tool call that follows holds `{"criticality":"high"}`, the one value the sentence
  stated outright. Nothing consumes the reasoning, because the run ends at the tool
  call, so the derived values never reach the card. Sometimes the same model splits
  the answer into five partial tool calls instead, and asking OpenRouter to disable
  parallel tool calls doesn't stop it. `gemini-3.1-flash-lite` has no separate reasoning
  channel, so the tool call is where the work lands. It answers in about a second
  at the API where the reasoning model takes 3 to 14, and both cost a fraction of a
  cent per turn. If you have ten minutes, switch the wizard to the tutor's model in
  `lib/` and show the broken card.
- **The instructions still do their part.** Open the wizard agent's instructions and
  find the three things the prompt asked for: the tool call is the whole answer, the
  fields to derive are named, and one filled-in call is shown. An agent whose only
  output is a tool call needs to be told that its prose goes nowhere.
- **Validation is the tool's job.** The model proposes a patch, and `applyProjectPatch`
  decides per field. The error travels as data into the card, next to the field it
  belongs to. No sentence in the instructions asks the model to check that the end is
  after the start.
- **Expect the basic inputs to need restyling.** The basic catalog's text fields, date
  inputs, and choice picker come with their own look. Expect the agent to square them
  to the design skill, either by overriding catalog entries or with scoped CSS, and
  expect it to store effort as a string and criticality as a one-item list, because
  those are the types the basic inputs bind to.
**Verify:** `npm test` and `npm run lint` are green. On a fresh page load, the first
sentence fills the card, a hand edit survives the next sentence, an impossible end date
shows its error inside the card, and a later run's tool result holds only a data model
update. Commit and push.

## Wrap-up

Close the A2UI part with the diagram from the start of the day and place each step on
it. The tool-call rows are controlled: the frontend owns every pixel. The progress card
and the wizard are declarative with a fixed schema: the server owns the tree, a tool
owns the data, and the client owns the parts. The generated comparison is declarative
with a generated schema, and it was the only one where you waited a minute and could
not predict the result.

Then open AGENTS.md and read the A2UI section with the room. It did not exist this
morning, and the wizard prompts ran in half the time of the card prompt mostly because
that section did.

The wizard solved one problem, structured input next to a conversation, inside an app
you own. The second half of today solves the same problem inside a host you don't own,
where no catalog of yours exists. That is what MCP Apps are for.

---

## Appendix A: running this storybook headless

To rehearse the day without the terminal UI, run every prompt non-interactively against
a fresh fork of the starter, one step per invocation, with a fresh context each time:

```bash
gh repo fork rstropek/2026-claude-classroom-4-starter --clone
cd 2026-claude-classroom-4-starter && npm install && cp .env.example .env
claude --model claude-opus-5 --dangerously-skip-permissions -p "<prompt>"
```

A headless run loads the project MCP servers from `.mcp.json` without asking, so the
`copilotkit-docs` tools are available in `-p` mode with no extra setting. An
interactive `claude` asks for approval once.

No agent run today calls the tutor's model, because the prompts skip the e2e suites and
the agents avoid spending your OpenRouter credit. The live checks in each step's
**Verify** are yours to do, and they cost fractions of a cent.

In the live session, use the interactive TUI instead. Tool calls, doc searches, diffs,
and test runs scrolling past are what the audience learns from.

## Appendix B: live-demo insurance

- **Keep result branches at hand.** One branch per step from your own dry run lets you
  show what the step produces when a live run falls short, and lets you move on,
  since every later step builds on the one before.
- **The docs server is a dependency.** Step 20 leans on `https://mcp.copilotkit.ai/mcp`.
  If it is down, the agent falls back to reading `node_modules`, which works and costs
  a few more minutes. The docs site serves any page as Markdown when you append `.md`
  to its URL, and you can name that in the prompt.
- **Pin what worked.** The prompts ran against CopilotKit 1.71.1 with
  `@ag-ui/a2ui-middleware` 0.0.10, `@ag-ui/a2ui-toolkit` 0.0.4, `@a2ui/web_core` 0.10.4,
  `@ag-ui/mastra` 1.1.3, and A2UI v0.9. A2UI and its CopilotKit integration change
  monthly. The starter's lockfile holds these versions, so don't run `npm update`
  before the session.
- **Step 21 depends on a small model drawing valid UI.** The comparison prompt works
  reliably, and it still takes up to three minutes. Start it, then talk. If a surface
  fails to paint or the run after it breaks, sign up a fresh account, since a malformed
  result stays in the thread.
- **Relative dates depend on the day.** "Next Monday" resolves against the server's
  date in UTC. Rehearse the wizard sentences on the day of the session, or use absolute
  dates.
- **A stale `.next` directory after installs.** Step 20 installs packages while a dev
  server may be running. If Turbopack then fails to replace a symlink under
  `.next/dev/node_modules`, stop the server and delete that directory, as AGENTS.md
  says.
