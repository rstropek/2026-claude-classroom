// SERVER half. Read top to bottom: tool -> agent -> AG-UI bridge -> HTTP.
import { MastraAgent } from "@ag-ui/mastra";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { z } from "zod";

const conditions = ["sunny", "cloudy", "rainy", "windy"];

// 1. The tool. The model sees `description` and `inputSchema` and nothing else.
const getWeather = createTool({
  id: "getWeather", // <-- THE LINK: app/page.tsx matches on exactly this string
  description:
    "Look up the current weather for one city. Call this whenever the user asks about weather anywhere.",
  inputSchema: z.object({
    city: z.string().describe("City name, e.g. 'Linz'"),
  }),
  outputSchema: z.object({
    city: z.string(),
    temperature: z.number(),
    condition: z.string(),
  }),
  execute: async ({ city }) => {
    // Slow on purpose, so the in-flight card is visible in the browser.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // The data is fake, and derived from the city name so one city always
    // gives the same answer. No weather service is involved.
    return {
      city,
      temperature: 5 + (city.length % 20),
      condition: conditions[city.length % 4],
    };
  },
});

// 2. The agent that may call it. The plain string model id makes Mastra's model
// router read OPENROUTER_API_KEY itself, so no provider package is needed.
const agent = new Agent({
  id: "default",
  name: "Weather butler",
  instructions: `You answer questions about the weather. Always call your weather tool for
the city the user names; never invent or guess weather yourself. Once the tool
returns, reply with one short sentence.`,
  model: "openrouter/z-ai/glm-5.3-flash",
  tools: { getWeather },
});

// 3. The AG-UI bridge. It turns the agent's stream into AG-UI events
// (TOOL_CALL_START, TOOL_CALL_ARGS, TOOL_CALL_END, TOOL_CALL_RESULT) for the
// browser.
const bridged = new MastraAgent({
  agent,
  // Without this the bridge holds a server tool's START/ARGS/END back until the
  // result exists and sends all four events at once, so the "Looking up" card
  // would never paint.
  streamServerToolCalls: true,
});

// 4. CopilotKit's runtime and the HTTP handler around it. "default" is
// CopilotKit's default agent id, which is why the client passes no agentId. The
// catch-all [...all] folder is needed because one handler serves several
// sub-paths (/info, /agent/default/run, ...).
const runtime = new CopilotRuntime({ agents: { default: bridged } });
const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handler;
export const POST = handler;
