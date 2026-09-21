# useRenderTool hello world

A chat where one tool call turns into a React card, built from two files and
nothing else. Step 19 of `storybook-04.md` tours the same mechanism inside the
session 4 starter, where sign-in and a database stand around it and the agent
remembers the conversation.

## Run

```bash
npm install
cp .env.example .env     # then fill in OPENROUTER_API_KEY
npm run dev
```

Open <http://localhost:3000> and ask "What's the weather in Linz?". A small card
reading "Looking up Linz…" shows up first. About 1.5 seconds later it turns into
the weather card with the temperature and the condition, and one sentence of
prose follows underneath it.

## The two files

The server half is `app/api/copilotkit/[...all]/route.ts`. Read it top to
bottom: a Mastra tool with the id `getWeather` and the agent that may call it,
then the AG-UI bridge around that agent, which CopilotKit's handler serves over
HTTP. The tool sleeps 1.5 seconds and then makes its numbers up from the city
name, so the card has time to appear and one city always gives the same answer.

The bridge needs `streamServerToolCalls: true` for that first card. By default
it holds the start of a server tool call back until the result exists and sends
everything at once, so a renderer only ever sees `complete`.

The client half is `app/page.tsx`. `<CopilotKit runtimeUrl="/api/copilotkit">`
connects to that route and `<CopilotChat />` draws the transcript, while
`useRenderTool({ name: "getWeather", ... })` decides what a `getWeather` call
looks like. Registering a renderer is a hook call, so it sits in its own
component inside the provider and returns `null`.

## What happens on one question

1. The browser POSTs the whole message list to
   `/api/copilotkit/agent/default/run`.
2. The AG-UI bridge hands those messages to the Mastra agent.
3. The model answers with a tool call, which is a name plus JSON arguments. It
   never sees React.
4. The bridge streams `TOOL_CALL_START` and `TOOL_CALL_ARGS`. CopilotKit looks
   for a renderer registered under that name and calls `render` with the status
   `inProgress`.
5. Mastra runs the tool's `execute` and gets an object back.
6. The bridge streams `TOOL_CALL_RESULT` with the JSON text of that object, and
   CopilotKit calls `render` again with the status `complete`.
7. The model reads the result and writes the closing sentence.

The CopilotKit Inspector is where you watch those events go by. It is on by
default in a development build on localhost.

## Try this

Change `name` in `app/page.tsx` to `"getWeatherX"` and ask again. The card is
gone and the answer still arrives. Nothing anywhere reports an error, because no
compiler checks that string against the tool's id. Change it back.

Ask for a second city in the same chat. That works even though the agent has no
memory, because the browser sends the whole transcript every turn. Reload the
page and you start over with an empty one.

## What the full starter adds

| In this sample | In the starter | What it adds |
| --- | --- | --- |
| the tool, inline in `route.ts` | `lib/todo-tools.ts` | three tools that read and write a real database, each taking the `userId` from Mastra's `RequestContext` |
| the agent, inline in `route.ts` | `lib/tutor.ts` | the butler's instructions, a `Memory` on a `LibSQLStore`, and a `Mastra` instance that holds the agent under the id `tutor` |
| `new MastraAgent(...)` in `route.ts` | `app/api/copilotkit/[...all]/route.ts` | a session gate in front, and the bridge built per request with `MastraAgent.getLocalAgent`, so the verified user id can be the `resourceId` |
| `<CopilotKit>` in `app/page.tsx` | `components/chat.tsx` | `credentials` for the session cookie, plus the `agentId` and `threadId` that make a reload rejoin the same thread |
| one `useRenderTool` | `components/todo-tool-calls.tsx` | one registration per tool |
| `JSON.parse(result)` | `lib/tool-result.ts` | a second parse for a result that arrives double-encoded, which this sample does not need |
