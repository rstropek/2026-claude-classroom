# Session 4 Storybook

**Classroom: Agentische Entwicklung mit Claude Code, Mastra & CopilotKit, Session 4**

## Live-Coding Script for Session 4

This is the live-coding script for session 4. Each step gives you a **Goal**, the
**Prompt** to hand Claude Code, **Teaching points** to narrate while the agent works, and
a **Verify** checklist. The steps keep counting from session 3, so today starts at step
19. Appendix A has the recipe for driving the same prompts headless with
`claude -p --model claude-opus-5` against the starter repo.

The prompts stay short and outcome-oriented. Both halves of today rest on knowledge the
model does not have: the prompts for A2UI send the agent to the `copilotkit` skill and
its docs server, and the prompts for MCP Apps send it to the `add-app-to-server` skill
that ships with the extension. CopilotKit's A2UI support is months old, and the MCP Apps
extension reached 2.0 recently enough that answering from memory produces code against
an older API.

Expect a prompt to run between 4 and 12 minutes today. That is your time to explain the
concept behind the step, and the teaching points are written for it. Step 21 is the
exception, because its change is two words long and its run takes a minute. Step 23 has
no prompt at all, because it is a client to connect and a tour to walk.

As before, a prompt that falls short is material, not a failure. Name the mechanism
behind the shortfall, keep the one rule that the tree compiles and the suite is green at
the end of every step, and move on.

## Where we start

Session 3 ended with **ai-tutor** after step 18. The todo list behind the tutor
Bartholomew has four ways in: the chat, a REST API with bearer tokens, the `ai-tutor`
CLI with its stdio MCP server, and an MCP server over Streamable HTTP behind OAuth. One
shared contract workspace holds the zod schemas for all of them. That code, plus four
additions that step 19 walks through, is the starter for today:

```
https://github.com/rstropek/2026-claude-classroom-4-starter
```

Fork it and work in your fork. Git is not a topic today, so there is one rule only:
commit and push at the end of every step, so each diff stays small enough to review
what the agent did.

The fourth addition is groundwork for the MCP Apps half: a build that packs a view
folder into a single HTML file, and a plain to-do form written in that shape with no MCP
code in it. Both sit unused until step 23.

## What we build today

Today is about generative UI, which means user interface that an agent decides on at
run time. There are three ways to do it, and they differ in who owns the layout. The
svgbob source is in `images/genui-spectrum.bob` and the render in
`images/genui-spectrum.svg`:

```
      controlled               declarative               "open-ended"

+--------------------+    +--------------------+    +--------------------+
| useRenderTool      |    | A2UI               |    | MCP Apps           |
| since step 11      +--->| steps 20 to 22     +--->| steps 23 to 24     |
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
- A **to-do form** inside MCPJam's chat, which is a host nobody in the room owns. The
  ai-tutor MCP server ships the form as one HTML file, the model fills the title in
  before you see it, and the Add button saves through a tool that only the form may
  call.

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
   offers. No code crosses the wire, which is the difference to MCP Apps in steps 23
   and 24.
4. **Fix the schema where the data matters, generate it where variety matters.** A
   fixed tree with numbers from a tool is fast and exact. A generated surface costs a
   second model call and invents what it does not know.
5. **State lives on the client.** The wizard's agent has no memory. Whatever it needs to
   know about the card travels with each run, and that includes what the user typed
   into the card by hand.
6. **Put the plain code in the starter.** The wizard's page, schema, and validation are
   ordinary code and already exist. The prompt spends its minutes on the agent and on
   A2UI.
7. **An MCP App flips who ships the markup.** Your server sends the HTML and the script,
   and a host you have never seen runs it in a sandboxed iframe. You get every pixel
   and lose every guarantee about the surroundings.
8. **The model drafts, the human commits.** The model fills a form and stops there.
   Saving happens when somebody clicks a button in that form, and the click goes to a
   tool the model is not offered.
9. **A visibility flag is a hint, and the OAuth token is the boundary.** Marking a tool
   app-only asks the host to keep it away from the model. What actually keeps one
   student out of another student's list is the token on the request and the per-user
   query behind it.

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

The history shows what changed since session 3's result. Four of those changes are
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

Another commit adds a page at `/projects/new` with a card, an input that does
nothing yet, and `lib/project.ts` with a schema and validation. Step 22 starts there.

The commits after that build the MCP App groundwork. `scripts/build-views.mjs` bundles
every folder under `mcp-apps/` into one self-contained HTML file, `lib/mcp-app-views.ts`
reads a built file back by name, and `mcp-apps/todo-form/` is a plain form with a title
input, an Add button, and a status line. A second CodeTour explains that build, and
`.claude/skills/add-app-to-server/SKILL.md` arrives with it, which is the skill the MCP
Apps extension ships for serving a view from an MCP server. Step 23 opens all of it, so
leave it closed for now.

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

## Halfway: what A2UI bought you

Close the A2UI part with the diagram from the start of the day and place each step on
it. The tool-call rows are controlled, and the frontend owns every pixel.

The progress card and the wizard are declarative with a fixed schema: the server owns
the tree, a tool owns the data, and the client owns the parts. The generated comparison
is declarative with a generated schema, and it was the only one where you waited a
minute and could not predict the result.

Then open AGENTS.md and read the A2UI section with the room. It did not exist this
morning, and the wizard prompts ran in half the time of the card prompt mostly because
that section did.

The wizard solved one problem, structured input next to a conversation, inside an app
you own. The second half of today solves the same problem inside a host you don't own,
where no catalog of yours exists. That is what MCP Apps are for.

---

## Step 23: a host you don't own

**Goal:** MCPJam talks to the ai-tutor MCP server over the OAuth flow from step 18, and
everybody has seen the build that packs a folder of HTML, CSS, and TypeScript into the
single file an MCP App host will load.

### What an MCP App is

A2UI sends a client a component tree and lets the client draw it from parts you shipped
inside the client. An MCP App sends a web page instead, and the tool result carries no
markup at all. The tool declares `_meta.ui.resourceUri`, which points at a `ui://`
resource on your own MCP server. The host reads that resource with `resources/read`,
gets back one HTML file with the MIME type `text/html;profile=mcp-app`, and loads it
into a sandboxed iframe under a default-deny content security policy. The iframe never
gets a second request, so a stylesheet the build left un-inlined is a stylesheet nobody
loads.

Inside the iframe the view talks to the host over `postMessage`, which the `App` class
from `@modelcontextprotocol/ext-apps` wraps as JSON-RPC. The host delivers the model's
tool arguments to the view as an event, the view calls back into your server with
`callServerTool`, and it reports to the model with `updateModelContext`. The host also
hands over its theme and its style variables, which is how a view inside a dark host
stops being a white rectangle.

The svgbob source for the whole round trip is in `images/mcp-app-flow.bob` and the
render in `images/mcp-app-flow.svg`:

```
+--------------------------------------+    +----------------------------------+
| Host "(MCPJam, Claude, VS Code ...)" |    | "ai-tutor MCP server (OAuth)"    |
|                                      |    |                                  |
|  +--------------------------------+  | 1  |                                  |
|  |             Model              +--+--->| "open_todo_form  ->"             |
|  +---------+------------+---------+  |    |   "ui://ai-tutor/todo-form.html" |
|            |            ^            | 2  |                                  |
|          3 |          5 |            |<---+ resource                         |
|            v            |            |    |   "ui://ai-tutor/todo-form.html" |
|  +---------+------------+---------+  | 4  |                                  |
|  |      "Sandboxed iframe:"       +--+--->| "submit_todo_form (app-only)"    |
|  |        "todo-form view"        |  |    |                                  |
|  +--------------------------------+  |    |                                  |
|                                      |    |                                  |
+--------------------------------------+    +----------------------------------+

+------------------------------------------------------------------------------+
| "1  tools/call open_todo_form"                                               |
| "2  resources/read -> the single HTML file, loaded into the iframe"          |
| "3  host -> view: the tool input (drafted title) over postMessage"           |
| "4  Add clicked: view -> host (postMessage) -> tools/call submit_todo_form"  |
| "5  view -> model: updateModelContext"                                       |
+------------------------------------------------------------------------------+
```

Claude, ChatGPT, VS Code, Goose, Cursor, and MCPJam render MCP Apps today. The hosted
ones need a public HTTPS URL for your server, so a tunnel belongs in the setup. The
local ones reach `localhost` directly. This step uses MCPJam, which runs on your own
machine and shows every payload that crosses. Its chat also needs no API key.

### Connect MCPJam

Leave `npm run dev` running and start the inspector in a second terminal:

```bash
npx @mcpjam/inspector@latest
```

It opens your default browser at <http://127.0.0.1:6274>. Then:

1. Click **Connect** in the sidebar, then **Add Server**.
2. Name the server `ai-tutor`.
3. Set Connection Type to **HTTP** and the URL to `http://localhost:3000/api/mcp`.
4. Leave Authentication on **Auto**.
5. Click **Add Server**. A dialog asks `Authorize "ai-tutor"?`, so click **Continue**.
6. The same tab goes to the app's `/login`. Sign in, then click **Allow** on `/consent`.
7. You are back in MCPJam and the server card reads `ai-tutor v0.1.0` and `Connected`.

Narrate the last three clicks while they happen. No popup opens: your own login page
takes over MCPJam's tab, and MCPJam waits for the redirect. That is the OAuth server
from step 18 serving a client nobody in this room configured. MCPJam never registered
with your app either. It uses a client ID metadata document (CIMD), so its `client_id`
is the URL `https://www.mcpjam.com/.well-known/oauth/client-metadata.json`, and Better
Auth fetches that document to learn the client's name and its redirect URI
`http://127.0.0.1:6274/oauth/callback`. Dynamic client registration never runs, which is
what the CIMD support from step 18 buys you.

Say out loud who is who while the consent screen is up. MCPJam is the host, the MCP
server is yours, and the person clicking Allow is deciding whether MCPJam gets to read
their to-dos.

Now open the **Tools** tab and run `list_todos` with no arguments. The JSON that comes
back is the list of the account you just signed in as. That is the MCP server from
session 3, unchanged, answering a client you never wrote a line of code for.

Open the browser console while you are there and you find one blocked CORS request to
`/api/mcp`. It looks like the thing you have to fix, and it isn't. MCPJam's page probes
the URL from the browser, but the MCP traffic itself goes over MCPJam's Node backend,
where no browser policy applies. The app needs no CORS headers, and adding them would
change nothing you can see.

### Walk the tour

Start the tour "MCP App views: one HTML file per view" from the CodeTour view. Its 10
steps run from a built file in the browser through `scripts/build-views.mjs` and the
view folder to `lib/mcp-app-views.ts` and the tests. Most of the weight sits on the
build, so these are the beats to hit.

- **One file, because the host loads one.** `vite-plugin-singlefile` inlines the script
  and the stylesheet into `index.html`, and the output is `mcp-apps/dist/todo-form.html`.
  The folder it came from stays an ordinary Vite project you can open on its own.
- **Vite runs as a library, not from a config file.** `scripts/build-views.mjs` calls
  Vite's JavaScript API and passes `configFile: false`. A `vite.config.ts` at the
  repository root would be picked up by Vitest as well, and Vitest already has
  `vitest.config.mts`. Handing the config over in code keeps the two apart.
- **One Vite build per view folder, which looks wasteful.** Several entry points in one
  Rollup build get shared chunks, and a page that imports a chunk makes a second
  request. The sandbox refuses that request and the view comes up blank. A build with
  one entry point has nothing to share.
- **`predev` and `prebuild` run the build, and after that nobody does.** `next dev` does
  not watch `mcp-apps/`, so run `npm run build:views` by hand after editing a view.
  Write that on the whiteboard, because it bites somebody in step 24.
- **The tokens are copied, not imported.** `mcp-apps/todo-form/style.css` repeats the
  color tokens from `app/globals.css`. The iframe is a separate document on
  a separate origin, so no stylesheet from the page around it reaches inside, and
  neither do that page's fonts or its custom properties.
- **The seam is a comment.** `mcp-apps/todo-form/view.ts` is plain DOM code that reads
  the input and appends to a list, with a status line under it. Where the MCP client
  belongs, a comment says "Step 24 plugs in here".

Everything the tour shows about the form arrived in one commit that contains no MCP code
whatsoever:

```bash
git show --stat ":/Add plain to-do form view"
```

Three files, all under `mcp-apps/todo-form/`. Ask the room why the starter carries the
form and not the wiring. Building a title field and a list is frontend work a Vite
project has done a thousand times, and the minutes of step 24 are better spent on the
protocol.

For anyone who wants to redo this from an empty folder after class, the MCP Apps sample
at <https://github.com/rstropek/2025-mcp-webinar/tree/main/McpApps> walks the same
ground step by step outside this app.

**Verify:** MCPJam shows `ai-tutor` as connected, `list_todos` returns your own list
from the Tools tab, `npm run build:views` writes `mcp-apps/dist/todo-form.html`, and the
tour opens at every step without a broken anchor.

## Step 24: a to-do form inside someone else's chat

**Goal:** the model drafts a to-do, a form that your MCP server shipped shows it inside
MCPJam's chat, and the human clicks Add. The save runs through a tool the model is never
offered, and the model still learns what was saved without calling anything.

```bash
git switch -c mcp-app-todo-form
```

> **Prompt 24.1**
>
> Give the MCP server its first MCP App: a to-do form that renders inside the host's
> chat. A new tool open_todo_form takes an optional title, so the model can draft the
> to-do, and links to a ui:// resource that serves the built todo-form view through
> readView. Register both with the helpers from @modelcontextprotocol/ext-apps/server.
> The tool stays out of mcpTools in the contract, because the CLI's stdio server
> registers everything in there and cannot render a form. In mcp-apps/todo-form/view.ts,
> plug in at the seam comment: connect the ext-apps App, with the handlers set before
> connect, put the title from the tool input into the field, and apply the host's theme
> and style variables, also when they change later. The Add button stays unconnected for
> now, and its status line says so. Test: an MCP client talking to createMcpServer sees
> the ui resource link on the tool and reads the resource with the MCP App MIME type.
> MCP Apps are newer than your training data: read the MCP App views section of
> AGENTS.md, use the add-app-to-server skill, and read the installed packages under
> node_modules where the skill stops. Run npm test and npm run lint, and skip next build
> and the e2e suites. AGENTS.md current.

This run takes about eight minutes, which is room enough for every point below.

**Teaching points**

- **Expect both registrations to go through the extension's helpers.** `registerAppTool`
  and `registerAppResource` from `@modelcontextprotocol/ext-apps/server` sit on top of
  `@modelcontextprotocol/server` 2.x, which ext-apps 2.0.0 is the first version to
  support. The tool ends up with `_meta.ui.resourceUri` set to
  `ui://ai-tutor/todo-form.html`, and that string is the whole link between them.
- **Expect the MIME type to show up twice.** `registerAppResource` defaults
  `text/html;profile=mcp-app` on the `resources/list` entry only, so the read result
  has to set it again. The profile is how a host tells an MCP App view from any other
  HTML resource, and the prompt's test pins it on the read.
- **Expect the new tool to stay out of `mcpTools`.** The contract's `mcpTools` list is
  what the CLI's stdio MCP server registers, and a terminal has no iframe to put a form
  in. One shared list of tool ids is convenient right up to the point where two servers
  disagree about what they can do.
- **Expect the handlers to be registered before `connect()`.** The host sends the tool
  input the moment the postMessage handshake ends, so a listener added afterwards misses
  the drafted title and the field comes up empty.
- **Expect the app's tokens to turn into fallbacks.** The agent rewrites
  `style.css` so each token reads `var(--color-..., <the app's value>)`. A host that
  sends style variables wins, and a silent host leaves the form in the ai-tutor ramp.
- **Expect a real MCP client in the test.** A fake that returns canned JSON proves
  nothing about a protocol. Expect a `Client` wired to the server over
  `InMemoryTransport.createLinkedPair()`, asserting the resource link on the tool and
  the MIME type on the read.
- **Expect the tool description to do routing work.** `add_todo` already exists and
  saves straight away, so the description of `open_todo_form` has to tell the model when
  a form is the better answer. That sentence is the only thing standing between your
  demo and a to-do that gets saved before anyone sees it.

### See the form the model drafted

Open the **Playground** tab in MCPJam and pick its chat. The built-in model is Claude
Haiku 4.5 and costs you no API key. Type:

```text
I have to prepare the MCP Apps demo. Let me check the to-do before you save it.
```

About four seconds later the form appears in the transcript with "Prepare the MCP Apps
demo" already in the title field. Read the sentence back with the room, because its
second half is what steered the model. It called `open_todo_form` with a title it wrote
itself, and not `add_todo`, because the user asked to look before saving.

Click **Add**. The status line says the form is not connected yet, which is what the
prompt asked for.

Each widget has its own tabs. Inline, PiP, and Fullscreen change how it sits in the
transcript, and **Data** shows the tool input, the tool result, and the model-context
payload as JSON. Open **Data** and find
the title the model invented in the tool input. Then click the moon icon in the
Playground toolbar: the host flips theme and the form follows, because the view applies
the host's style variables.

> **Prompt 24.2**
>
> Make the to-do form save. The model drafts and the human commits, so saving goes
> through a new tool submit_todo_form that only the MCP App may call: its visibility is
> app, and it stays out of mcpTools like open_todo_form. It validates with
> CreateTodoRequest from the contract, saves through lib/todo-tools.ts for the user of
> the OAuth token, and returns the new to-do together with the user's open to-dos,
> because the form shows them. In the view, Add calls the tool through the App, shows
> the saved to-do and the refreshed open list, shows a rejected title as an error in the
> form, and tells the model what was saved with updateModelContext, so the next turn
> knows without a second tool call. open_todo_form also returns the open to-dos, so the
> form shows them right away. Tests: tools/list marks submit_todo_form as app-only, it
> saves for the calling user only, and it rejects an empty title. Run npm test and npm
> run lint, and skip next build and the e2e suites. AGENTS.md current.

This run takes about five minutes. Leave the MCPJam tab open while it runs.

**Teaching points**

- **Expect `_meta.ui` to carry two keys now.** `submit_todo_form` gets
  `{ resourceUri, visibility: ["app"] }`, and its input schema is the contract's
  `CreateTodoRequest`, so the form and the REST API from session 3 validate a new to-do
  through the same zod object.
- **Expect one new query next to the old ones.** The form shows the open list, so
  `lib/todo-tools.ts` gains `listOpenTodosFor`, and the tool returns the saved to-do
  together with that list in one result. A second round trip to fetch the list would
  cost another postMessage hop for data the server already had in hand.
- **Expect a rejected title to arrive as a result rather than an exception.** A schema
  failure comes back as a tool result with `isError` set, so the view reads the text off
  the result and prints `Not saved: ...` in the form. Code that only catches throws
  shows the user nothing.
- **Expect Add to be disabled twice over.** Once for an empty title, and again while a
  save is in flight, because `callServerTool` is a round trip and an impatient user
  clicks again.
- **Expect a test with two users in it.** The prompt asks whether the save is scoped to
  the caller, and the only honest way to answer that is two users on one migrated temp
  database, each saving a to-do and then listing.

### Save, then ask the model what happened

Reload the Playground, type the same sentence again, and click **Add** when the form
comes up. If the Tools tab does not list `submit_todo_form` yet, reconnect the server
first, and if the form still claims it is not connected, `npm run build:views` has not
run since the agent changed the view.

The status line says `Added "Prepare the MCP Apps demo"` in about a third of a second,
and the open list under the form grows by one. Switch to <http://localhost:3000> and
look at the ai-tutor sidebar, where the same to-do sits under the account you consented
with.

Back in the chat, ask this:

```text
What did I just add, and how many open to-dos do I have now?
```

The answer comes with no tool call at all, because `updateModelContext` put the saved
to-do and the open list into the model's context when you clicked Add. If the Playground
shows more than one client pane, the chips left of the model picker in the composer turn
them on and off. Keeping two panes makes the point sharper: the pane whose form you
clicked answers from context, and the pane you left alone calls `list_todos` to find
out.

Now open the **Tools** tab once more. `submit_todo_form` is listed, marked
`visibility: ["app"]`, and MCPJam lets you run it by hand anyway. Do that, and a to-do
is saved. The flag asks the host to keep the tool away from the model, and the host
decides whether to honor it. MCPJam's own switch is called "Respect tool visibility" and
is on by default. It lives under **Connect**, the **Client** tab, the client card, then
**Agent**, in the group "Agent tooling".

Show both states. With the switch on, ask the model "Which tools do you have from
ai-tutor? List only their names." and `submit_todo_form` is missing from the answer.
Turn the switch off, click **Save client** at the top right, and start a new chat. The
same question now lists all five tools, and "Call submit_todo_form with title Sneaky."
saves a to-do. A flipped switch that you did not save is discarded without a word, and
the model then does what it did in the on state: denied the form's tool, it reaches for
`add_todo` and saves "Sneaky" anyway. That accident is worth keeping in the demo,
because it shows that visibility hides one tool and leaves the data path open. Switch
it back on and save again. The tool list at the left of the Playground shows all five
tools with their visibility in both states, so take the model's answer as the proof.
What actually keeps one student's list away from another is the OAuth token on the
request and the per-user queries in `lib/todo-tools.ts`.

A view has two ways to talk into the conversation, and the form uses the quiet one.
`updateModelContext` hands the host a block of text that reaches the model with the
user's next message. `sendMessage` posts into the chat as if the user had typed it,
which starts a turn right away and would be the wrong choice for a save the user is
already looking at.

**Verify:** `npm test` and `npm run lint` are green. In MCPJam, the drafted title arrives
in the form, Add saves in well under a second, the to-do shows up in the ai-tutor
sidebar at <http://localhost:3000>, an empty title leaves Add disabled, and a title the
schema refuses comes back as `Not saved: ...` inside the form. Commit and push.

---

## Wrap-up

Three kinds of generative UI ran in the same app today, and the diagram from the morning
sorts them by how much the agent gets to decide. The table sorts them by who does the
work.

+-----------------+----------------+------------------+------------------+-----------------+
|                 | Who writes the | What crosses the | Who renders it   | Where it fits   |
|                 | UI             | wire             |                  |                 |
+=================+================+==================+==================+=================+
| useRenderTool   | Your frontend, | Tool arguments   | Your React       | Your own app,   |
|                 | ahead of time  | and results      | component        | one row per     |
|                 |                |                  |                  | tool            |
+-----------------+----------------+------------------+------------------+-----------------+
| A2UI            | Your server,   | A component tree | The client, from | Your own app,   |
|                 | or a second    | and a data       | the catalog you  | with no deploy  |
|                 | model call     | model, as JSON   | ship             | per card        |
+-----------------+----------------+------------------+------------------+-----------------+
| MCP App         | Your server    | One HTML file    | A sandboxed      | Any MCP host,   |
|                 |                | behind a ui://   | iframe in a host | where no code   |
|                 |                | resource         | you don't own    | of yours runs   |
+-----------------+----------------+------------------+------------------+-----------------+

Pick by where the UI has to appear first. Inside an app you ship, `useRenderTool` stays
the cheapest answer, and A2UI earns its keep the moment a new card would otherwise mean
a frontend release. An MCP App is the only one of the three that works when the user
sits in Claude or ChatGPT instead of your app, and you pay for that reach with a
sandbox, a CSP, and a host whose theme you have to ask for.

Open AGENTS.md and read the MCP App sections with the room. Neither the view build nor
the tool wiring is obvious from the code alone, and the two sections are what the next
agent run reads before it touches `mcp-apps/`.

Session 5 takes the app that four sessions built and gets it into production: CI/CD,
with the agent working inside the pipeline instead of beside it.

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

The MCP Apps prompts need nothing else. The `add-app-to-server` skill is a file in the
repository, so a headless run picks it up the same way an interactive one does. What a
headless run cannot do is click: MCPJam, the drafted title, and the Add button in steps
23 and 24 are manual checks, and the tests the prompts write are what stands in for them
in `-p` mode.

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
  `@ag-ui/mastra` 1.1.3, and A2UI v0.9. The MCP Apps half ran on
  `@modelcontextprotocol/ext-apps` 2.0.0 against `@modelcontextprotocol/server` 2.0.0,
  and the view build on vite 8.3.0 with `vite-plugin-singlefile` 2.3.3. A2UI and the MCP
  Apps extension both change monthly. The starter's lockfile holds these versions, so
  don't run `npm update` before the session.
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
- **Start MCPJam once before class.** `npx @mcpjam/inspector@latest` downloads on first
  use, and a download in front of the room costs a slow minute. Steps 23 and 24 are
  written against 3.8.1, so pin it with `npx @mcpjam/inspector@3.8.1` when a newer
  release moves the buttons.
- **The free chat has a quota.** MCPJam's Playground gives you Claude Haiku 4.5 without
  an API key, counted per network per day. Once it runs out the chat fails with
  "Unable to authenticate with MCPJam servers", so no model is left to open the form.
  Sign in to MCPJam or add your own model key before the session, and rehearse
  somewhere other than the classroom network.
- **Click Add in the pane you are talking about.** The Playground shows several client
  panes side by side, each with its own copy of the widget, and the chips left of the
  model picker turn them on and off. Model context lands in the pane whose form you
  clicked, so go down to one pane unless you are making that point on purpose.
- **When the model reaches for `add_todo`, say the sentence again.** Which tool wins is
  decided by a tool description, and a small model sometimes takes the shortcut and
  saves without the form. Asking to check the to-do before saving brings the form back.
- **A stale `mcp-apps/dist` shows yesterday's form.** `next dev` does not rebuild views.
  After editing anything under `mcp-apps/`, run `npm run build:views` and reload the
  widget. A form that ignores your change is this, every time.
- **MCPJam's console noise is not yours.** It reports its own `script-src eval` CSP
  notice on every load. With the Claude client preset, the host fonts from
  `assets.claude.ai` are blocked by the font CSP and fall back to the system stack. The
  preset named "MCPJam" sends a dark palette while reporting a light theme, which puts a
  dark form into a light chat. The Claude, ChatGPT, and Cursor presets look right.
